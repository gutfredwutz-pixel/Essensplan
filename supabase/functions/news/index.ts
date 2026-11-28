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

// Börse: Kurse von Yahoo, alles in Euro. pct = Veränderung zum Vortag in %, abs = in Punkten bzw. Euro.
type Quote = { key: string; name: string; unit: string; value: number; chg: number; abs: number; trend?: number[]; note?: string; why?: string };
const WATCH: { key: string; sym: string; name: string; unit: string; usd?: boolean; note?: string }[] = [
  { key: 'dax', sym: '^GDAXI', name: 'DAX', unit: 'Punkte' },
  { key: 'acwi', sym: 'SPYI.DE', name: 'MSCI ACWI IMI', unit: '€', note: 'Kurs des SPDR-ETFs auf den MSCI ACWI IMI an der Börse Xetra' },
  { key: 'btc', sym: 'BTC-EUR', name: 'Bitcoin', unit: '€' },
  { key: 'tsla', sym: 'TL0.DE', name: 'Tesla', unit: '€', note: 'Kurs an der Börse Xetra' },
  { key: 'spacex', sym: 'SPCX', name: 'SpaceX', unit: '€', usd: true, note: 'Gehandelt an der Nasdaq in Dollar, hier in Euro umgerechnet' },
];
// Große deutsche Werte für „Größte Bewegungen“ (DAX-Mitglieder, Stand 2025)
const DAX: Record<string, string> = { 'ADS.DE': 'Adidas', 'AIR.DE': 'Airbus', 'ALV.DE': 'Allianz', 'BAS.DE': 'BASF', 'BAYN.DE': 'Bayer', 'BEI.DE': 'Beiersdorf', 'BMW.DE': 'BMW', 'BNR.DE': 'Brenntag', 'CBK.DE': 'Commerzbank', 'CON.DE': 'Continental', 'DTG.DE': 'Daimler Truck', 'DBK.DE': 'Deutsche Bank', 'DB1.DE': 'Deutsche Börse', 'DHL.DE': 'DHL Group', 'DTE.DE': 'Deutsche Telekom', 'EOAN.DE': 'Eon', 'FRE.DE': 'Fresenius', 'HNR1.DE': 'Hannover Rück', 'HEI.DE': 'Heidelberg Materials', 'HEN3.DE': 'Henkel', 'IFX.DE': 'Infineon', 'MBG.DE': 'Mercedes-Benz', 'MRK.DE': 'Merck', 'MTX.DE': 'MTU Aero Engines', 'MUV2.DE': 'Munich Re', 'P911.DE': 'Porsche', 'PAH3.DE': 'Porsche Holding', 'QIA.DE': 'Qiagen', 'RHM.DE': 'Rheinmetall', 'RWE.DE': 'RWE', 'SAP.DE': 'SAP', 'SRT3.DE': 'Sartorius', 'SIE.DE': 'Siemens', 'ENR.DE': 'Siemens Energy', 'SHL.DE': 'Siemens Healthineers', 'SY1.DE': 'Symrise', 'VNA.DE': 'Vonovia', 'VOW3.DE': 'Volkswagen', 'ZAL.DE': 'Zalando', 'G1A.DE': 'GEA' };
const yq = (s: string) => encodeURIComponent(s);
async function markets(): Promise<{ list: Quote[]; movers: Quote[] }> {
  let usd = 0; // Dollar je Euro
  try { const j = JSON.parse(await get(`https://query1.finance.yahoo.com/v8/finance/chart/EURUSD%3DX?range=1d&interval=1d`, 6000)); usd = j.chart.result[0].meta.regularMarketPrice; } catch { /* ohne Umrechnung */ }
  const list = (await Promise.all(WATCH.map(async (w): Promise<Quote | null> => {
    try {
      const j = JSON.parse(await get(`https://query1.finance.yahoo.com/v8/finance/chart/${yq(w.sym)}?range=1mo&interval=1d`, 6000));
      const r = j.chart.result[0], m = r.meta, k = w.usd ? (usd ? 1 / usd : 0) : 1;
      if (!k || !m.regularMarketPrice) return null;
      const closes = (r.indicators?.quote?.[0]?.close || []).filter((c: number | null) => c != null);
      let pct = m.regularMarketChangePercent;
      if (pct == null) { const prev = closes.length > 1 ? closes[closes.length - 2] : m.chartPreviousClose; pct = (m.regularMarketPrice - prev) / prev * 100; }
      const v = m.regularMarketPrice * k;
      return { key: w.key, name: w.name, unit: w.unit, value: v, chg: pct, abs: v - v / (1 + pct / 100), trend: closes.map((c: number) => +(c * k).toFixed(2)), note: w.note };
    } catch { return null; }
  }))).filter(Boolean) as Quote[];
  const syms = Object.keys(DAX), movers: Quote[] = [];
  for (let a = 0; a < syms.length; a += 20) {
    try {
      const j = JSON.parse(await get(`https://query1.finance.yahoo.com/v7/finance/spark?symbols=${syms.slice(a, a + 20).map(yq).join(',')}&range=1d&interval=1d`, 8000));
      for (const r of j.spark?.result || []) {
        const m = r.response?.[0]?.meta; if (!m || m.regularMarketChangePercent == null) continue;
        const pct = m.regularMarketChangePercent, v = m.regularMarketPrice;
        movers.push({ key: r.symbol, name: DAX[r.symbol] || r.symbol, unit: '€', value: v, chg: pct, abs: v - v / (1 + pct / 100) });
      }
    } catch { /* ohne Bewegungen */ }
  }
  movers.sort((x, y) => Math.abs(y.chg) - Math.abs(x.chg));
  return { list, movers: movers.filter((m) => Math.abs(m.chg) >= 1.5).slice(0, 5) };
}

// Kurze Erklärung zu jedem Kurs: warum gestiegen oder gefallen, aus den Meldungen des Tages
const MK_SYS = `Du erklärst Jakob, einem BWL-Studenten, in einfachen Worten, warum sich Börsenkurse heute bewegt haben. Nutze nur, was in den mitgeschickten Meldungen und Marktberichten steht, und allgemeines Wissen, wie Börse funktioniert. Erfinde keine Gründe: Wenn die Meldungen nichts dazu sagen, schreib ehrlich, dass es keinen klaren Anlass in den Nachrichten gibt, und was typischerweise dahinterstecken kann (z. B. allgemeine Marktstimmung, Gewinnmitnahmen). why: Beginne direkt mit dem Grund für die Bewegung, erkläre nicht, was der DAX, Bitcoin oder die Firma ist (das weiß Jakob). 2 bis 4 kurze Sätze auf Deutsch, ohne Fachjargon (Fachbegriffe kurz erklären), Prozent mit Komma. Ordne auch ein, ob die Bewegung groß oder klein ist (beim DAX ist 1 % an einem Tag schon deutlich, bei Bitcoin sind 3 % normal, bei Einzelaktien sind 2 bis 3 % normal). Keine Spiegelstriche, keine Rauten, keine Emojis.`;
const MK_TOOL = {
  name: 'erklaerungen', description: 'Erklärung je Kurs',
  input_schema: { type: 'object', properties: { items: { type: 'array', items: { type: 'object', properties: { key: { type: 'string' }, why: { type: 'string' } }, required: ['key', 'why'] } } }, required: ['items'] },
};
async function explainMarkets(qs: Quote[], all: Item[]) {
  if (!qs.length) return;
  const rep = all.filter((i) => /marktbericht|börse|dax|aktie|kurs|bitcoin|tesla|spacex|musk|msci|wall street/i.test(i.title + ' ' + i.url));
  const reports = rep.filter((i) => i.text).slice(0, 3).map((i) => `### ${i.src}: ${i.title}\n${i.text!.slice(0, 3500)}`).join('\n\n');
  const heads = rep.slice(0, 60).map((i) => `${i.src}: ${i.title} | ${i.teaser.slice(0, 200)}`).join('\n');
  const fmt = (q: Quote) => `${q.key} | ${q.name} | ${q.value.toFixed(2)} ${q.unit} | ${q.chg >= 0 ? '+' : ''}${q.chg.toFixed(2)} % zum Vortag${q.trend && q.trend.length > 5 ? ` | vor einem Monat ${q.trend[0]}` : ''}`;
  try {
    const out = await claude(MK_SYS, MK_TOOL, `Kurse (key | Name | Kurs | Veränderung):\n${qs.map(fmt).join('\n')}\n\nMarktberichte:\n${reports || 'keine'}\n\nWeitere Meldungen:\n${heads || 'keine'}`, 4000);
    const by = new Map(flat(out?.items, 'items').filter((x) => x && x.key).map((x) => [x.key, x.why]));
    for (const q of qs) q.why = by.get(q.key) || '';
  } catch (e) { console.warn('Börse erklären', e); }
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

const SEC_DESC: Record<string, string> = {
  ki: 'Künstliche Intelligenz: neue Modelle, große Firmen (auch xAI von Elon Musk), Regeln, Folgen für Arbeit und Alltag. Keine Produkttests, keine Gerüchte, keine Kleinigkeiten.',
  wirtschaft: 'Wirtschaft: Konjunktur, Zinsen, Börse, auffällige Kursbewegungen, Firmen, die stark wachsen oder in Schwierigkeiten sind, große Übernahmen, Branchen in Deutschland und der Welt. Themen rund um Elon Musk (Tesla, SpaceX, xAI, X) interessieren Jakob besonders: nimm sie, wenn es etwas Nennenswertes gibt.',
  deutschland: 'Politik in Deutschland: Bundesregierung, Bundestag, Parteien, Gesetze, Bundesländer.',
  welt: 'Welt: internationale Politik, Kriege und Konflikte, EU, USA, China, große Ereignisse weltweit.',
  arbeit: 'Weiterbildung und Arbeitsmarkt: Arbeitslosenzahlen, Tarife und Gehälter, Fachkräfte, Berufseinstieg, Studium, Weiterbildung, Wandel der Arbeit.',
};
const PICK_SYS = `Du stellst für Jakob, einen BWL-Studenten in München, die Nachrichten des Tages zusammen, Bereich für Bereich. Wähle aus der Liste die wichtigsten Meldungen für den genannten Bereich.
Regeln: Relevanz und Tragweite zuerst. Keine Boulevard-, Sport- oder Unfallmeldungen ohne politische Bedeutung, keine Liveblogs, keine Meinungsartikel, keine Ratgeber-, Gesundheits-, Psychologie- oder Lifestyle-Texte, keine Podcasts, keine Tagesvorschauen (z. B. „Was Anleger heute beachten sollten“). Jede Geschichte nur einmal: berichten mehrere Quellen darüber, nimm als Haupteintrag am liebsten Tagesschau, Spiegel oder Zeit (dort gibt es den ganzen Text), sonst heise, The Decoder, t3n oder Deutschlandfunk, und nenne die anderen Meldungen zur selben Geschichte unter also. Meldungen mit (Abo) sind hinter einer Bezahlschranke: nur, wenn es die Geschichte nirgends frei gibt. Geschichten, die schon in anderen Bereichen gewählt wurden, nicht noch einmal nehmen, auch nicht aus einer anderen Quelle. Gib bis zu 3 Meldungen mehr an als verlangt (als Reserve), Wichtigstes zuerst.`;
const PICK_TOOL = {
  name: 'auswahl', description: 'Ausgewählte Meldungen für den Bereich, Wichtigstes zuerst',
  input_schema: { type: 'object', properties: { picks: { type: 'array', items: { type: 'object', properties: {
    id: { type: 'string' }, also: { type: 'array', items: { type: 'string' } },
  }, required: ['id'] } } }, required: ['picks'] },
};
const SUM_SYS = `Du bereitest Nachrichten für Jakob auf, einen BWL-Studenten, der sie in der Bahn auf dem Handy liest. Schreibe auf Deutsch, sachlich, klar und ohne Fachjargon, so dass auch jemand ohne Vorwissen alles versteht.
Für jede Meldung:
- title: kurze, sachliche Überschrift, höchstens 70 Zeichen, keine Clickbait-Fragen.
- teaser: ein Satz, worum es geht, höchstens 150 Zeichen.
- body: 2 bis 4 kurze Absätze (je 2 bis 3 Sätze): was passiert ist, warum, wer betroffen ist, wie es weitergeht. Nur Fakten aus dem Text, nichts erfinden.
- context: Einordnung in 1 bis 3 Sätzen. Zahlen greifbar machen: Punkte auch in Prozent, große Beträge vergleichen (z. B. mit dem Bundeshaushalt oder dem Umsatz der Firma), sagen, ob das viel oder wenig ist und warum es wichtig ist. Wenn es nichts einzuordnen gibt, leer lassen.
- terms: bis zu 3 Fachbegriffe aus der Meldung, die nicht jeder kennt, je mit einer Erklärung in einem Satz. Keine Allerweltswörter.
Wenn nur ein kurzer Anriss vorliegt (Bezahlschranke), schreibe nur, was im Anriss steht, und mach body kürzer. Erwähne nie, dass nur ein Anriss oder wenig Text vorlag, und schreibe keine Sätze darüber, was nicht im Text steht. Keine Spiegelstriche, keine Rauten, keine Emojis, keine Mittelpunkte als Trenner.`;
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
  const mkt = await markets(), mk = mkt.list;
  const mkDone = explainMarkets([...mkt.list, ...mkt.movers], all);
  const list = all.map((i) => `${i.id} | ${i.src}${i.pay ? ' (Abo)' : ''} | ${i.date ? ago(i.date) : ''} | ${i.title} | ${i.teaser.slice(0, 160)}`).join('\n');
  const byId = new Map(all.map((i) => [i.id, i]));
  const used = new Set<string>(), picks: { id: string; sec: string; also?: string[] }[] = [];
  for (const [sec, title, n] of SECTIONS) { // nacheinander, damit keine Geschichte in zwei Bereichen landet
    const taken = picks.map((p) => byId.get(p.id)!.title).join('\n');
    const ask = () => claude(PICK_SYS, PICK_TOOL, `Bereich: ${title}. ${SEC_DESC[sec]}\nAnzahl: ${n}\n${taken ? `\nSchon in anderen Bereichen gewählt:\n${taken}\n` : ''}\nMeldungen (id | Quelle | Alter | Titel | Anriss):\n${list}`, 3000).catch(() => null);
    let pk = await ask();
    if (flat(pk?.picks, 'picks').length < Math.min(2, n)) pk = await ask(); // einmal neu fragen, wenn fast nichts kam
    let k = 0, paid = 0;
    for (const p of flat(pk?.picks, 'picks') as { id: string; also?: string[] }[]) {
      const it = p && byId.get(p.id);
      if (!it || used.has(it.url) || k >= n || (it.pay && paid)) continue; // höchstens eine Bezahl-Meldung je Bereich
      used.add(it.url); for (const a of p.also || []) { const x = byId.get(a); if (x) used.add(x.url); }
      picks.push({ id: p.id, sec, also: p.also }); k++; if (it.pay) paid = 1;
    }
  }
  if (!picks.length) throw new Error(`Auswahl leer (${all.length} Meldungen)`);
  const chosen = picks.map((p) => byId.get(p.id)!);
  await Promise.all(chosen.filter((i) => !prev[i.url]).map(fullText));
  // neu zusammenfassen nur, was noch nicht im letzten Stand war
  const todo = chosen.filter((i) => !prev[i.url]);
  const sums = new Map<string, any>();
  const chunks: Item[][] = []; for (let k = 0; k < todo.length; k += 5) chunks.push(todo.slice(k, k + 5));
  const mkTxt = mk.length ? 'Börse heute (nur nutzen, wenn es zur Meldung passt): ' + mk.map((m) => `${m.name} ${m.value.toFixed(2)} ${m.unit === '€' ? 'Euro' : m.unit} (${m.chg >= 0 ? '+' : ''}${m.chg.toFixed(2)} % zum Vortag)`).join(', ') + '\n\n' : '';
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
  await mkDone;
  return { at: new Date().toISOString(), markets: mk, movers: mkt.movers, sections };
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
