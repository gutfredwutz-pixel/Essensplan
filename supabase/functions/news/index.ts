// Supabase Edge Function "news": holt Nachrichten per RSS, lässt Claude die wichtigsten auswählen
// und verständlich aufbereiten, speichert das Ergebnis über news_save in der Datenbank.
// Aufruf nur von der Datenbank (news_tick) mit Einmal-Token. Secret: ANTHROPIC_API_KEY.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const MODEL = 'claude-haiku-5-5';
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; Essensplan-News/1.0)' };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });

type Feed = { src: string; url?: string; api?: string; pay?: boolean };
const FEEDS: Feed[] = [
  { src: 'Tagesschau', api: 'inland' }, { src: 'Tagesschau', api: 'ausland' }, { src: 'Tagesschau', api: 'wirtschaft' },
  { src: 'Tagesschau', url: 'https://www.tagesschau.de/wissen/technologie/index~rss2.xml' },
  { src: 'The Decoder', url: 'https://the-decoder.de/feed/' },
  { src: 'heise', url: 'https://www.heise.de/rss/heise-top-atom.xml' },
  { src: 't3n', url: 'https://t3n.de/rss.xml' },
  { src: 'Handelsblatt', url: 'https://www.handelsblatt.com/contentexport/feed/schlagzeilen', pay: true },
  { src: 'Handelsblatt', url: 'https://www.handelsblatt.com/contentexport/feed/finanzen', pay: true },
  { src: 'FAZ', url: 'https://www.faz.net/rss/aktuell/wirtschaft/', pay: true },
  { src: 'FAZ', url: 'https://www.faz.net/rss/aktuell/politik/', pay: true },
  { src: 'Spiegel', url: 'https://www.spiegel.de/wirtschaft/index.rss' },
  { src: 'Spiegel', url: 'https://www.spiegel.de/politik/deutschland/index.rss' },
  { src: 'Spiegel', url: 'https://www.spiegel.de/ausland/index.rss' },
  { src: 'Spiegel', url: 'https://www.spiegel.de/karriere/index.rss' },
  { src: 'Zeit', url: 'https://newsfeed.zeit.de/politik/index' },
  { src: 'Zeit', url: 'https://newsfeed.zeit.de/arbeit/index' },
  { src: 'Deutschlandfunk', url: 'https://www.deutschlandfunk.de/nachrichten-100.rss' },
];
const SECTIONS: [string, string, number][] = [['ki', 'KI', 4], ['wirtschaft', 'Wirtschaft', 5], ['deutschland', 'Deutschland', 4], ['welt', 'Welt', 4], ['arbeit', 'Weiterbildung und Arbeitsmarkt', 3]];

type Item = { id: string; src: string; url: string; title: string; teaser: string; date: number; img: string; pay: boolean; text?: string };

const ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', shy: '', ndash: '–', mdash: '—', bdquo: '„', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', sbquo: '‚', hellip: '…', auml: 'ä', ouml: 'ö', uuml: 'ü', Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü', szlig: 'ß', euro: '€', eacute: 'é' };
const dec = (s: string) => s.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) => e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENT[e] ?? m);
const strip = (s: string) => dec(s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<(script|style)[\s\S]*?<\/\1>/gi, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const tag = (x: string, t: string) => { const m = x.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`, 'i')); return m ? m[1] : ''; };
const attr = (x: string, re: RegExp) => { const m = x.match(re); return m ? dec(m[1]) : ''; };

async function get(url: string, ms = 9000) {
  const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(ms), redirect: 'follow' });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return await r.text();
}

async function readFeed(f: Feed): Promise<Item[]> {
  if (f.api) {
    const j = JSON.parse(await get(`https://www.tagesschau.de/api2u/news?ressort=${f.api}`));
    return (j.news || []).filter((n: Record<string, unknown>) => n.type === 'story' && n.shareURL).map((n: any) => ({
      id: '', src: f.src, url: n.shareURL, title: String(n.title || ''), teaser: String(n.firstSentence || ''), date: Date.parse(n.date) || 0, pay: false,
      img: n.teaserImage?.imageVariants?.['16x9-960'] || n.teaserImage?.imageVariants?.['16x9-640'] || '',
      text: (n.content || []).filter((c: any) => c.type === 'text' || c.type === 'headline').map((c: any) => strip(String(c.value || ''))).filter(Boolean).join('\n\n'),
    }));
  }
  const x = await get(f.url!);
  const blocks = x.match(/<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  return blocks.map((b) => {
    const link = strip(tag(b, 'link')) || attr(b, /<link[^>]*rel="alternate"[^>]*href="([^"]+)"/i) || attr(b, /<link[^>]*href="([^"]+)"/i);
    const desc = tag(b, 'description') || tag(b, 'summary') || tag(b, 'content');
    const img = attr(b, /<media:content[^>]*url="([^"]+)"/i) || attr(b, /<media:thumbnail[^>]*url="([^"]+)"/i) || attr(b, /<enclosure[^>]*url="([^"]+\.(?:jpe?g|png|webp)[^"]*)"/i) || attr(desc.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"'), /<img[^>]*src="([^"]+)"/i);
    const title = strip(tag(b, 'title'));
    return { id: '', src: f.src, url: link.trim(), title, teaser: strip(desc.replace(/&lt;/g, '<').replace(/&gt;/g, '>')).slice(0, 1500), date: Date.parse(strip(tag(b, 'pubDate') || tag(b, 'updated') || tag(b, 'published') || tag(b, 'dc:date'))) || 0, img, pay: !!f.pay || /heise\+|Z\+|S\+|\(Plus\)/.test(title) };
  }).filter((i) => i.url && i.title);
}

// Frei lesbare Artikel: Text aus den Absätzen der Seite, Bild aus og:image. Bezahlartikel nur Anriss.
async function fullText(it: Item) {
  if (it.text && it.text.length > 400) return;
  if (!it.pay && it.teaser.length > 450) it.text = it.teaser; // z. B. Deutschlandfunk: ganze Meldung im Feed
  if (it.pay) return;
  try {
    const x = await get(it.url, 8000);
    if (!it.img) it.img = attr(x, /<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i) || attr(x, /<meta[^>]*content="([^"]+)"[^>]*property="og:image"/i);
    const body = tag(x, 'article') || x;
    const ps = (body.match(/<p[\s>][\s\S]*?<\/p>/gi) || []).map(strip).filter((p) => p.length > 60 && !/cookie|newsletter|abonn|anzeige|©|javascript/i.test(p));
    const t = ps.join('\n\n').slice(0, 6000);
    if (t.length > 300) it.text = t;
  } catch { /* nur Anriss */ }
}

async function markets() {
  const list: [string, string][] = [['DAX', '%5EGDAXI'], ['S&P 500', '%5EGSPC'], ['Euro in Dollar', 'EURUSD%3DX'], ['Bitcoin', 'BTC-EUR']];
  const out = await Promise.all(list.map(async ([name, s]) => {
    try {
      const j = JSON.parse(await get(`https://query1.finance.yahoo.com/v8/finance/chart/${s}?range=5d&interval=1d`, 6000));
      const m = j.chart.result[0].meta, v = m.regularMarketPrice, p = m.chartPreviousClose ?? m.previousClose;
      const closes = (j.chart.result[0].indicators?.quote?.[0]?.close || []).filter((c: number | null) => c != null);
      const prev = closes.length > 1 ? closes[closes.length - 2] : p;
      return v && prev ? { name, value: v, chg: (v - prev) / prev * 100 } : null;
    } catch { return null; }
  }));
  return out.filter(Boolean) as { name: string; value: number; chg: number }[];
}

async function claude(system: string, tool: Record<string, unknown>, text: string, maxTokens = 16000) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, tools: [tool], tool_choice: { type: 'tool', name: tool.name }, messages: [{ role: 'user', content: text }] }),
    signal: AbortSignal.timeout(110000),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || 'KI-Fehler');
  const out = (j.content || []).find((c: { type: string }) => c.type === 'tool_use');
  if (!out) throw new Error(`KI ohne Ergebnis (${j.stop_reason})`);
  return out.input;
}

const PICK_SYS = `Du stellst für Jakob, einen BWL-Studenten in München, die Nachrichten des Tages zusammen. Wähle aus der Liste die wichtigsten Meldungen für diese Bereiche:
- ki: Künstliche Intelligenz (neue Modelle, große Firmen, Regeln, Folgen für Arbeit und Alltag). Keine Produkttests, keine Gerüchte, keine Kleinigkeiten.
- wirtschaft: Konjunktur, Zinsen, Börse, auffällige Kursbewegungen, Firmen, die stark wachsen oder in Schwierigkeiten sind, große Übernahmen.
- deutschland: Politik in Deutschland.
- welt: internationale Politik und große Ereignisse weltweit.
- arbeit: Arbeitsmarkt, Berufseinstieg, Gehälter, Weiterbildung, Studium.
Regeln: Relevanz und Tragweite zuerst, keine Boulevard-, Sport- oder Unfallmeldungen ohne politische Bedeutung, keine Liveblogs, keine Meinungsartikel, keine Ratgeber-, Gesundheits-, Psychologie- oder Lifestyle-Texte, keine Podcasts, keine Tagesvorschauen (z. B. „Was Anleger heute beachten sollten“). Jede Meldung nur in einem Bereich. EU-Themen gehören zu welt, außer es geht vor allem um deutsche Politik. Jede Geschichte nur einmal, auch nicht in zwei Bereichen: berichten mehrere Quellen darüber, nimm die Meldung einer frei lesbaren Quelle (Tagesschau, Spiegel, Zeit, heise, The Decoder, t3n, Deutschlandfunk) als Haupteintrag und nenne die anderen unter also. Meldungen mit (Abo) sind hinter einer Bezahlschranke: nimm sie nur als Haupteintrag, wenn es die Geschichte nirgends frei gibt, und höchstens eine pro Bereich. Gib je Bereich bis zu 3 Meldungen mehr als die angegebene Anzahl an (als Reserve), Reihenfolge im Bereich: Wichtigstes zuerst.`;
const PICK_TOOL = {
  name: 'auswahl', description: 'Ausgewählte Meldungen',
  input_schema: { type: 'object', properties: { picks: { type: 'array', items: { type: 'object', properties: {
    id: { type: 'string' }, sec: { type: 'string', enum: SECTIONS.map((s) => s[0]) }, also: { type: 'array', items: { type: 'string' } },
  }, required: ['id', 'sec'] } } }, required: ['picks'] },
};
const SUM_SYS = `Du bereitest Nachrichten für Jakob auf, einen BWL-Studenten, der sie in der Bahn auf dem Handy liest. Schreibe auf Deutsch, sachlich, klar und ohne Fachjargon, so dass auch jemand ohne Vorwissen alles versteht.
Für jede Meldung:
- title: kurze, sachliche Überschrift, höchstens 70 Zeichen, keine Clickbait-Fragen.
- teaser: ein Satz, worum es geht, höchstens 150 Zeichen.
- body: 2 bis 4 kurze Absätze (je 2 bis 3 Sätze): was passiert ist, warum, wer betroffen ist, wie es weitergeht. Nur Fakten aus dem Text, nichts erfinden.
- context: Einordnung in 1 bis 3 Sätzen. Zahlen greifbar machen: Punkte auch in Prozent, große Beträge vergleichen (z. B. mit dem Bundeshaushalt oder dem Umsatz der Firma), sagen, ob das viel oder wenig ist und warum es wichtig ist. Wenn es nichts einzuordnen gibt, leer lassen.
- terms: bis zu 3 Fachbegriffe aus der Meldung, die nicht jeder kennt, je mit einer Erklärung in einem Satz. Keine Allerweltswörter.
Wenn nur ein kurzer Anriss vorliegt (Bezahlschranke), schreibe nur, was im Anriss steht, und mach body kürzer. Keine Spiegelstriche, keine Rauten, keine Emojis, keine Mittelpunkte als Trenner.`;
const SUM_TOOL = {
  name: 'meldungen', description: 'Aufbereitete Meldungen',
  input_schema: { type: 'object', properties: { items: { type: 'array', items: { type: 'object', properties: {
    id: { type: 'string' }, title: { type: 'string' }, teaser: { type: 'string' },
    body: { type: 'array', items: { type: 'string' } }, context: { type: 'string' },
    terms: { type: 'array', items: { type: 'object', properties: { term: { type: 'string' }, text: { type: 'string' } }, required: ['term', 'text'] } },
  }, required: ['id', 'title', 'teaser', 'body'] } } }, required: ['items'] },
};

// Die KI verschachtelt Listen manchmal ({picks:[{picks:[...]}]}) oder liefert sie als Text: glatt ziehen
const flat = (a: any, key: string): any[] => {
  if (typeof a === 'string') { try { return flat(JSON.parse(a), key); } catch { return []; } }
  return Array.isArray(a) ? a.flatMap((x) => x && x[key] !== undefined && !x.id ? flat(x[key], key) : [x]) : [];
};
const ago = (d: number) => { const h = (Date.now() - d) / 36e5; return h < 1 ? 'vor weniger als 1 Std.' : `vor ${Math.round(h)} Std.`; };

async function build(prev: Record<string, any>) {
  const res = await Promise.allSettled(FEEDS.map(readFeed));
  const seen = new Set<string>(); let all: Item[] = [];
  res.forEach((r) => { if (r.status === 'fulfilled') for (const it of r.value) { const k = it.url.split('?')[0]; if (!seen.has(k)) { seen.add(k); all.push(it); } } });
  const now = Date.now();
  all = all.filter((i) => !i.date || now - i.date < 30 * 36e5).sort((a, b) => b.date - a.date).slice(0, 260);
  all.forEach((it, k) => it.id = 'm' + k);
  if (!all.length) throw new Error('Keine Quellen erreichbar');
  const [mk] = await Promise.all([markets()]);
  const list = all.map((i) => `${i.id} | ${i.src}${i.pay ? ' (Abo)' : ''} | ${i.date ? ago(i.date) : ''} | ${i.title} | ${i.teaser.slice(0, 160)}`).join('\n');
  const want = SECTIONS.map(([k, , n]) => `${k}: ${n}`).join(', ');
  const ask = () => claude(PICK_SYS, PICK_TOOL, `Anzahl je Bereich: ${want}\n\nMeldungen (id | Quelle | Alter | Titel | Anriss):\n${list}`, 6000);
  let pk = await ask();
  if (flat(pk?.picks, 'picks').length < 5) pk = await ask(); // einmal neu fragen, wenn fast nichts kam
  const byId = new Map(all.map((i) => [i.id, i]));
  const used = new Set<string>(), count: Record<string, number> = {}, paid: Record<string, number> = {};
  const picks = (flat(pk?.picks, 'picks') as { id: string; sec: string; also?: string[] }[]).filter((p) => {
    const it = byId.get(p.id), max = (SECTIONS.find((s) => s[0] === p.sec) || [])[2] as number;
    if (!it || !max || used.has(it.url) || (count[p.sec] || 0) >= max) return false;
    if (it.pay && paid[p.sec]) return false; // höchstens eine Bezahl-Meldung je Bereich
    used.add(it.url); count[p.sec] = (count[p.sec] || 0) + 1; if (it.pay) paid[p.sec] = 1; return true;
  });
  if (!picks.length) throw new Error(`Auswahl leer (${all.length} Meldungen): ${JSON.stringify(pk).slice(0, 300)}`);
  const chosen = picks.map((p) => byId.get(p.id)!);
  await Promise.all(chosen.filter((i) => !prev[i.url]).map(fullText));
  // neu zusammenfassen nur, was noch nicht im letzten Stand war
  const todo = chosen.filter((i) => !prev[i.url]);
  const sums = new Map<string, any>();
  const chunks: Item[][] = []; for (let k = 0; k < todo.length; k += 5) chunks.push(todo.slice(k, k + 5));
  const unit: Record<string, string> = { 'DAX': 'Punkte', 'S&P 500': 'Punkte', 'Euro in Dollar': 'Dollar je Euro', 'Bitcoin': 'Euro' };
  const mkTxt = mk.length ? 'Börse heute (nur nutzen, wenn es zur Meldung passt): ' + mk.map((m) => `${m.name} ${m.value.toFixed(2)} ${unit[m.name] || ''} (${m.chg >= 0 ? '+' : ''}${m.chg.toFixed(2)} % zum Vortag)`).join(', ') + '\n\n' : '';
  await Promise.all(chunks.map(async (ch) => {
    const txt = ch.map((i) => `### id ${i.id}\nQuelle: ${i.src}${i.pay || !i.text ? ' (nur Anriss frei)' : ''}\nTitel: ${i.title}\nAnriss: ${i.text ? i.teaser.slice(0, 300) : i.teaser}\n${i.text ? 'Text:\n' + i.text.slice(0, 5000) : ''}`).join('\n\n');
    try { const out = await claude(SUM_SYS, SUM_TOOL, mkTxt + txt); for (const s of flat(out?.items, 'items')) if (s && s.id) sums.set(s.id, s); } catch (e) { console.warn('Zusammenfassen', e); }
  }));
  const sections = SECTIONS.map(([k, title]) => ({ id: k, title, items: picks.filter((p) => p.sec === k).map((p) => {
    const it = byId.get(p.id)!, s = sums.get(p.id), old = prev[it.url];
    const base = old || (s ? { title: s.title, teaser: s.teaser, body: s.body || [], context: s.context || '', terms: s.terms || [] } : { title: it.title, teaser: it.teaser.slice(0, 180), body: [], context: '', terms: [] });
    return { ...base, url: it.url, src: it.src, date: it.date, img: it.img || (old && old.img) || '', pay: it.pay, short: !it.text,
      also: (p.also || []).map((a) => byId.get(a)).filter(Boolean).filter((a) => a!.src !== it.src).map((a) => ({ src: a!.src, url: a!.url })) };
  }) })).filter((s) => s.items.length);
  if (!sections.length) throw new Error('Keine Bereiche');
  return { at: new Date().toISOString(), markets: mk, sections };
}

async function rpc(url: string, anon: string, fn: string, args: Record<string, unknown>) {
  const r = await fetch(`${url}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: anon, authorization: `Bearer ${anon}`, 'content-type': 'application/json' }, body: JSON.stringify(args) });
  if (!r.ok) throw new Error(`${fn}: ${r.status} ${await r.text()}`);
  return await r.json();
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    if (body.task !== 'news_build') return json({ ok: false, error: 'Unbekannte Aufgabe' }, 400);
    const { token, url, anon } = body;
    if (!KEY) return json({ ok: false, error: 'Kein API-Schlüssel' }, 500);
    if (!(await rpc(url, anon, 'news_check', { p_token: token }))) return json({ ok: false, error: 'bad_token' }, 403);
    const prev: Record<string, any> = {};
    for (const s of body.prev?.sections || []) for (const i of s.items || []) if (i.body?.length) prev[i.url] = i;
    const job = build(prev).then((data) => rpc(url, anon, 'news_save', { p_token: token, p_data: data }))
      .catch((e) => rpc(url, anon, 'news_save', { p_token: token, p_data: null, p_error: String(e?.message || e) }).catch(() => {}));
    EdgeRuntime.waitUntil(job);
    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: String((e as Error).message || e) }, 400);
  }
});
