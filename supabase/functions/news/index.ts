// Supabase Edge Function "news": holt Nachrichten aus RSS-Feeds, sucht die wichtigsten Themen aus
// und lässt sie von Claude verständlich aufbereiten (Fachbegriffe erklärt, Zahlen eingeordnet).
// Wo eine Quelle nur einen Anriss liefert (Bezahlschranke), werden frei lesbare Artikel zum selben Thema genutzt.
// Der API-Schlüssel liegt nur hier als Secret ANTHROPIC_API_KEY, nie in der App.
const KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const MODEL = 'claude-haiku-5-5';
const UA = 'Mozilla/5.0 (compatible; NewsDigest/1.0)';
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, 'content-type': 'application/json' } });

type Bereich = 'ki' | 'wirtschaft' | 'deutschland' | 'welt' | 'arbeit';
const BEREICHE: [Bereich, string][] = [['ki', 'KI'], ['wirtschaft', 'Wirtschaft'], ['deutschland', 'Deutschland'], ['welt', 'Welt'], ['arbeit', 'Arbeit und Weiterbildung']];

// Quellen. pay = Bezahlschranke üblich (per RSS oft nur Anriss). hint = wofür die Quelle meist steht.
type Feed = { name: string; url: string; pay?: boolean; hint: string; kind?: 'ts' };
const FEEDS: Feed[] = [
  { name: 'Tagesschau', url: 'https://www.tagesschau.de/api2u/news?ressort=inland', hint: 'deutschland', kind: 'ts' },
  { name: 'Tagesschau', url: 'https://www.tagesschau.de/api2u/news?ressort=ausland', hint: 'welt', kind: 'ts' },
  { name: 'Tagesschau', url: 'https://www.tagesschau.de/api2u/news?ressort=wirtschaft', hint: 'wirtschaft', kind: 'ts' },
  { name: 'Tagesschau', url: 'https://www.tagesschau.de/api2u/news?ressort=wissen', hint: 'ki', kind: 'ts' },
  { name: 'Handelsblatt', url: 'https://www.handelsblatt.com/contentexport/feed/top-themen', pay: true, hint: 'wirtschaft' },
  { name: 'Handelsblatt', url: 'https://www.handelsblatt.com/contentexport/feed/finanzen', pay: true, hint: 'wirtschaft' },
  { name: 'Handelsblatt', url: 'https://www.handelsblatt.com/contentexport/feed/technologie', pay: true, hint: 'ki' },
  { name: 'FAZ', url: 'https://www.faz.net/rss/aktuell/', pay: true, hint: 'deutschland' },
  { name: 'FAZ', url: 'https://www.faz.net/rss/aktuell/wirtschaft/', pay: true, hint: 'wirtschaft' },
  { name: 'FAZ', url: 'https://www.faz.net/rss/aktuell/politik/', pay: true, hint: 'welt' },
  { name: 'Heise', url: 'https://www.heise.de/rss/heise-top-atom.xml', hint: 'ki' },
  { name: 'Heise', url: 'https://www.heise.de/rss/heise-atom.xml', hint: 'ki' },
  { name: 'The Decoder', url: 'https://the-decoder.de/feed/', hint: 'ki' },
  { name: 'Golem', url: 'https://rss.golem.de/rss.php?feed=RSS2.0', hint: 'ki' },
  { name: 'Deutschlandfunk', url: 'https://www.deutschlandfunk.de/nachrichten-100.rss', hint: 'deutschland' },
  { name: 'ZDFheute', url: 'https://www.zdf.de/rss/zdf/nachrichten', hint: 'deutschland' },
  { name: 'n-tv', url: 'https://www.n-tv.de/wirtschaft/rss', hint: 'wirtschaft' },
  { name: 'n-tv', url: 'https://www.n-tv.de/politik/rss', hint: 'welt' },
  { name: 'Spiegel', url: 'https://www.spiegel.de/wirtschaft/index.rss', pay: true, hint: 'wirtschaft' },
  { name: 'Zeit', url: 'https://newsfeeds.zeit.de/arbeit/index', pay: true, hint: 'arbeit' },
  { name: 'Zeit', url: 'https://newsfeeds.zeit.de/wirtschaft/index', pay: true, hint: 'wirtschaft' },
];

type Item = { id: number; src: string; pay: boolean; hint: string; title: string; teaser: string; link: string; img: string; date: number; details?: string };

/* ---------- kleine Helfer ---------- */
const ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', shy: '', auml: 'ä', ouml: 'ö', uuml: 'ü', Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü', szlig: 'ß', euro: '€', ndash: '–', mdash: '—', hellip: '…', bdquo: '„', ldquo: '“', rdquo: '”', lsquo: '‚', rsquo: '’', laquo: '«', raquo: '»' };
function decode(s: string) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : (ENT[e] ?? m));
}
const cdata = (s: string) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
const strip = (s: string) => decode(cdata(s).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, ' ')).replace(/[ \t ]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
const tag = (s: string, t: string) => { const m = s.match(new RegExp(`<${t}(?:\\s[^>]*)?>([\\s\\S]*?)</${t}>`, 'i')); return m ? m[1] : ''; };
const attr = (s: string, re: RegExp) => { const m = s.match(re); return m ? decode(m[1]) : ''; };

async function get(url: string, ms = 8000): Promise<Response> {
  return await fetch(url, { headers: { 'user-agent': UA, 'accept-language': 'de-DE,de;q=0.9' }, signal: AbortSignal.timeout(ms), redirect: 'follow' });
}
async function pool<T, R>(xs: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(xs.length); let i = 0;
  await Promise.all([...Array(Math.min(n, xs.length))].map(async () => { while (i < xs.length) { const k = i++; out[k] = await fn(xs[k]); } }));
  return out;
}

/* ---------- Feeds lesen ---------- */
function parseXml(xml: string, f: Feed): Omit<Item, 'id'>[] {
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  return blocks.slice(0, 30).map((b) => {
    const title = strip(tag(b, 'title'));
    let link = strip(tag(b, 'link')) || attr(b, /<link[^>]*rel="alternate"[^>]*href="([^"]+)"/i) || attr(b, /<link[^>]*href="([^"]+)"/i) || strip(tag(b, 'guid'));
    link = link.trim();
    const rawDesc = tag(b, 'description') || tag(b, 'summary') || tag(b, 'content') || tag(b, 'content:encoded');
    const img = attr(b, /<media:content[^>]*url="([^"]+)"/i) || attr(b, /<media:thumbnail[^>]*url="([^"]+)"/i) || attr(b, /<enclosure[^>]*url="([^"]+\.(?:jpe?g|png|webp)[^"]*)"/i) || attr(b, /<enclosure[^>]*type="image[^"]*"[^>]*url="([^"]+)"/i) || attr(cdata(rawDesc), /<img[^>]*src="([^"]+)"/i);
    const ds = strip(tag(b, 'pubDate') || tag(b, 'updated') || tag(b, 'published') || tag(b, 'dc:date'));
    return { src: f.name, pay: !!f.pay, hint: f.hint, title, teaser: strip(rawDesc).slice(0, 400), link, img, date: Date.parse(ds) || Date.now() };
  }).filter((x) => x.title && x.link.startsWith('http'));
}
type TsNews = { title?: string; topline?: string; firstSentence?: string; date?: string; shareURL?: string; detailsweb?: string; details?: string; teaserImage?: { imageVariants?: Record<string, string> }; type?: string };
function parseTs(j: { news?: TsNews[] }, f: Feed): Omit<Item, 'id'>[] {
  return (j.news || []).filter((n) => n.type !== 'video' && n.title && (n.shareURL || n.detailsweb)).slice(0, 25).map((n) => {
    const v = n.teaserImage?.imageVariants || {};
    return { src: f.name, pay: false, hint: f.hint, title: (n.topline ? n.topline + ': ' : '') + n.title, teaser: n.firstSentence || '', link: (n.shareURL || n.detailsweb)!, img: v['16x9-960'] || v['16x9-640'] || Object.values(v)[0] || '', date: Date.parse(n.date || '') || Date.now(), details: n.details };
  });
}
async function readFeed(f: Feed) {
  try {
    const r = await get(f.url);
    if (!r.ok) return { f, items: [], err: 'HTTP ' + r.status };
    const items = f.kind === 'ts' ? parseTs(await r.json(), f) : parseXml(await r.text(), f);
    return { f, items, err: items.length ? '' : 'leer' };
  } catch (e) { return { f, items: [], err: String((e as Error).message || e).slice(0, 80) }; }
}

/* ---------- Artikeltext holen ---------- */
type Text = { text: string; pay: boolean; img: string };
function ldObjects(html: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const walk = (o: unknown) => { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') { out.push(o as Record<string, unknown>); const g = (o as Record<string, unknown>)['@graph']; if (g) walk(g); } };
      walk(JSON.parse(m[1].trim()));
    } catch { /* kaputtes JSON-LD ignorieren */ }
  }
  return out;
}
async function fullText(it: Item): Promise<Text> {
  try {
    if (it.details) {
      const r = await get(it.details); const j = await r.json();
      const parts = (j.content || []).filter((c: { type: string }) => c.type === 'text' || c.type === 'headline').map((c: { value: string; type: string }) => (c.type === 'headline' ? '\n' : '') + strip(c.value));
      return { text: parts.join('\n').trim(), pay: false, img: it.img };
    }
    const r = await get(it.link); if (!r.ok) return { text: '', pay: it.pay, img: it.img };
    const html = (await r.text()).slice(0, 1_500_000);
    let body = '', pay: boolean | null = null, img = '';
    for (const o of ldObjects(html)) {
      if (typeof o.articleBody === 'string' && o.articleBody.length > body.length) body = o.articleBody;
      const acc = o.isAccessibleForFree; if (acc === false || acc === 'False' || acc === 'false') pay = true; else if ((acc === true || acc === 'True' || acc === 'true') && pay === null) pay = false;
      if (!img && o.image) { const im = o.image as unknown; img = typeof im === 'string' ? im : Array.isArray(im) ? (typeof im[0] === 'string' ? im[0] : (im[0] as { url?: string })?.url || '') : (im as { url?: string }).url || ''; }
    }
    if (!body) {
      const art = tag(html, 'article') || html;
      body = [...art.matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/gi)].map((m) => strip(m[1])).filter((p) => p.length > 60).join('\n');
    }
    body = strip(body);
    img = img || it.img || attr(html, /<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i);
    const isPay = pay === true || (it.pay && body.length < 1500);
    return { text: body, pay: isPay, img };
  } catch { return { text: '', pay: it.pay, img: it.img }; }
}

// Suche bei der Tagesschau (frei lesbar), nur Treffer der letzten drei Tage
async function searchFree(q: string): Promise<Omit<Item, 'id'> | null> {
  try {
    const r = await get(`https://www.tagesschau.de/api2u/search/?searchText=${encodeURIComponent(q)}&pageSize=5&resultPage=0`, 6000);
    if (!r.ok) return null;
    const j = await r.json();
    const list = parseTs({ news: j.searchResults || j.news || [] }, { name: 'Tagesschau', url: '', hint: '', kind: 'ts' });
    return list.find((x) => x.details && Date.now() - x.date < 3 * 86400e3) || null;
  } catch { return null; }
}

/* ---------- Börsendaten (ohne Schlüssel; fällt still weg, wenn nicht erreichbar) ---------- */
const INDEX = [['^GDAXI', 'DAX', 'Punkte'], ['^GSPC', 'S&P 500', 'Punkte'], ['^IXIC', 'Nasdaq', 'Punkte'], ['EURUSD=X', 'Euro in Dollar', '$'], ['GC=F', 'Gold', '$ je Unze'], ['BTC-EUR', 'Bitcoin', '€']];
const WATCH = [['NVDA', 'Nvidia'], ['MSFT', 'Microsoft'], ['AAPL', 'Apple'], ['GOOGL', 'Alphabet (Google)'], ['AMZN', 'Amazon'], ['META', 'Meta'], ['TSLA', 'Tesla'], ['SAP.DE', 'SAP'], ['SIE.DE', 'Siemens'], ['RHM.DE', 'Rheinmetall'], ['ALV.DE', 'Allianz'], ['DTE.DE', 'Telekom'], ['MBG.DE', 'Mercedes-Benz'], ['VOW3.DE', 'Volkswagen'], ['IFX.DE', 'Infineon'], ['AIR.DE', 'Airbus'], ['ASML.AS', 'ASML'], ['DBK.DE', 'Deutsche Bank']];
type Quote = { sym: string; name: string; unit?: string; price: number; prev: number; chg: number };
async function quote(sym: string, name: string, unit?: string): Promise<Quote | null> {
  try {
    const r = await get(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=5d&interval=1d`, 6000);
    if (!r.ok) return null;
    const res = (await r.json())?.chart?.result?.[0];
    const closes: number[] = (res?.indicators?.quote?.[0]?.close || []).filter((x: number | null) => x != null);
    const price = res?.meta?.regularMarketPrice ?? closes[closes.length - 1];
    const prev = closes.length >= 2 ? closes[closes.length - 2] : res?.meta?.chartPreviousClose;
    if (!price || !prev) return null;
    return { sym, name, unit, price, prev, chg: (price / prev - 1) * 100 };
  } catch { return null; }
}

/* ---------- Claude ---------- */
let usage = { in: 0, out: 0, calls: 0 };
async function claude(system: string, user: string, schema: Record<string, unknown>, maxTokens = 8000, effort = 'low'): Promise<Record<string, unknown> | null> {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', signal: AbortSignal.timeout(90000),
    headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, output_config: { effort, format: { type: 'json_schema', schema } }, messages: [{ role: 'user', content: user }] }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || 'KI-Fehler ' + r.status);
  usage.calls++; usage.in += j.usage?.input_tokens || 0; usage.out += j.usage?.output_tokens || 0;
  if (j.stop_reason === 'refusal' || j.stop_reason === 'max_tokens') return null;
  const t = (j.content || []).find((c: { type: string }) => c.type === 'text');
  try { return t ? JSON.parse(t.text) : null; } catch { return null; }
}
const S = (props: Record<string, unknown>) => ({ type: 'object', additionalProperties: false, properties: props, required: Object.keys(props) });
const STR = { type: 'string' };

const PICK_SYSTEM = `Du stellst für einen Leser in Deutschland (BWL-Student, interessiert an KI, Wirtschaft und Politik) die wichtigsten Nachrichten des Tages zusammen.
Du bekommst eine Liste von Meldungen aus mehreren Quellen, je Zeile: Nummer | Quelle | [Bezahl] falls Bezahlschranke üblich | Titel | Anriss.
Bilde Themen: Meldungen verschiedener Quellen über dasselbe Ereignis gehören in ein Thema (alle passenden Nummern angeben). Ein Thema mit Bezahl-Quelle soll möglichst auch frei lesbare Meldungen zum selben Ereignis enthalten.
Bereiche:
- ki: Künstliche Intelligenz, große Tech-Firmen, Chips, Digitales mit Bezug zu KI.
- wirtschaft: Konjunktur, Unternehmen, Börse, auffällige Kursbewegungen, Firmen, die gerade stark wachsen, Zinsen, Inflation.
- deutschland: Politik in Deutschland.
- welt: internationale Politik und Konflikte.
- arbeit: Arbeitsmarkt, Jobs, Gehälter, Ausbildung, Studium, Weiterbildung.
Wähle je Bereich die 3 bis 5 wichtigsten Themen (arbeit: 2 bis 3, falls vorhanden). Wichtig heißt: betrifft viele Menschen, hat Folgen, ist neu. Keine Sportergebnisse, keine Promi-Meldungen, keine Kriminalfälle ohne politische Bedeutung, keine Liveblogs, keine Werbung oder Kaufberatung. Ein Thema nur in einem Bereich. Gib je Thema Suchwörter an, mit denen man weitere Artikel dazu findet.`;
const PICK_SCHEMA = S({ themen: { type: 'array', items: S({ bereich: { type: 'string', enum: BEREICHE.map((b) => b[0]) }, ids: { type: 'array', items: { type: 'integer' } }, wichtig: { type: 'integer', description: '1 bis 5' }, suche: { type: 'string', description: '2 bis 4 Suchwörter, um frei lesbare Artikel zum Thema zu finden, z. B. "Nvidia Quartalszahlen"' } }) } });

const WRITE_SYSTEM = `Du schreibst für eine persönliche Nachrichten-App. Der Leser ist BWL-Student, liest unterwegs in der Bahn und ist nicht in jedem Thema Fachmann. Er will verstehen, was passiert ist, warum es wichtig ist und wie man Zahlen einordnet.
Regeln:
- Nur Fakten aus den mitgelieferten Quellen. Nichts erfinden, nichts dazudichten. Wenn Quellen sich widersprechen, sag das.
- Wenn nur ein Anriss vorliegt (Bezahlschranke), schreib nur, was dort steht, kürzer, und sag offen, dass Details hinter der Bezahlschranke stehen.
- Einfache, klare Sprache, kurze Sätze, sachlich, ohne Wertung. Fachbegriffe beim ersten Vorkommen in wenigen Worten erklären.
- Zahlen einordnen: Punkte in Prozent umrechnen, mit üblichen Größen vergleichen (z. B. "an einem normalen Börsentag bewegt sich der DAX um weniger als 1 %"), sagen, ob das viel oder wenig ist und warum. Nur Einordnungen, die sich aus den Quellen oder aus allgemein bekanntem Grundwissen sicher ergeben.
- Deutsch, Dezimalkomma, keine Rauten, keine Großbuchstaben-Wörter zur Betonung, kein Mittelpunkt als Trenner, keine Emojis.
Felder:
- titel: sachliche Überschrift, höchstens 70 Zeichen, kein Doppelpunkt-Stil wie "Thema: Aussage", wenn es auch anders geht.
- kurz: ein bis zwei Sätze, das Wichtigste.
- absaetze: drei bis fünf Absätze mit je zwei bis vier Sätzen: was passiert ist, Hintergrund, was es bedeutet, wie es weitergeht. Bei reinem Anriss ein bis zwei Absätze.
- zahlen: die wichtigsten Zahlen aus dem Artikel mit Einordnung (0 bis 3 Einträge).
- begriffe: Fachbegriffe, die ein Nicht-Fachmann nachschlagen würde, mit kurzer Erklärung (0 bis 4 Einträge).
- warum: ein Satz, warum das für den Leser relevant ist (z. B. für Geldanlage, Jobs, Studium, Alltag). Leer lassen, wenn nichts Sinnvolles passt.`;
const WRITE_SCHEMA = S({ titel: STR, kurz: STR, absaetze: { type: 'array', items: STR }, zahlen: { type: 'array', items: S({ zahl: STR, einordnung: STR }) }, begriffe: { type: 'array', items: S({ begriff: STR, erklaerung: STR }) }, warum: STR });

const MARKET_SYSTEM = `Du erklärst einem Leser ohne Börsenerfahrung (BWL-Student) in wenigen Sätzen, was heute an den Märkten los war. Du bekommst die Tagesveränderungen wichtiger Indizes und Aktien sowie Schlagzeilen.
Regeln: Nur aus den gelieferten Daten und Schlagzeilen ableiten, Ursachen nur nennen, wenn eine Schlagzeile sie hergibt, sonst vorsichtig formulieren. Prozent und Punkte einordnen (normaler Tag beim DAX: unter 1 % Bewegung; 2 % sind viel; Einzelaktien schwanken stärker, 5 % an einem Tag sind auffällig). Bei auffälligen Aktien kurz sagen, was die Firma macht. Deutsch, Dezimalkomma, sachlich, kurze Sätze, keine Anlageempfehlung.
Felder: kurz (ein Satz), absaetze (zwei bis drei kurze Absätze), begriffe (0 bis 3 Fachbegriffe mit Erklärung).`;
const MARKET_SCHEMA = S({ kurz: STR, absaetze: { type: 'array', items: STR }, begriffe: { type: 'array', items: S({ begriff: STR, erklaerung: STR }) } });

const hash = (s: string) => { let h = 5381; for (const c of s) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0; return h.toString(36); };
const fmt = (n: number, d = 2) => n.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });

/* ---------- Ablauf ---------- */
async function build(dry: boolean) {
  const t0 = Date.now(); usage = { in: 0, out: 0, calls: 0 };
  const [feeds, idx, watch] = await Promise.all([
    Promise.all(FEEDS.map(readFeed)),
    Promise.all(INDEX.map(([s, n, u]) => quote(s, n, u))),
    Promise.all(WATCH.map(([s, n]) => quote(s, n))),
  ]);
  const status = feeds.map((r) => ({ quelle: r.f.name, url: r.f.url, n: r.items.length, fehler: r.err || undefined }));
  const seen = new Set<string>(); const items: Item[] = [];
  const cutoff = Date.now() - 40 * 3600e3;
  for (const r of feeds) for (const it of r.items) {
    const k = it.link.split('?')[0]; if (seen.has(k) || it.date < cutoff) continue; seen.add(k);
    if (/liveblog|live-blog|\+\+|newsblog|ticker/i.test(it.title)) continue;
    items.push({ ...it, id: items.length });
  }
  const markets = idx.filter(Boolean) as Quote[];
  const movers = (watch.filter(Boolean) as Quote[]).filter((q) => Math.abs(q.chg) >= 3).sort((a, b) => Math.abs(b.chg) - Math.abs(a.chg)).slice(0, 5);
  if (dry || !KEY) return { at: new Date().toISOString(), dry: true, items: items.slice(0, 80), markets, movers, status, ms: Date.now() - t0 };
  if (!items.length) throw new Error('Keine Quelle erreichbar');

  // 1. Themen auswählen
  const list = items.map((i) => `${i.id} | ${i.src} | ${i.pay ? '[Bezahl] | ' : ''}${i.title.slice(0, 160)} | ${i.teaser.replace(/\s+/g, ' ').slice(0, 180)}`).join('\n');
  const picked = await claude(PICK_SYSTEM, `Heute ist ${new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Berlin' })}.\n\nMeldungen:\n${list}`, PICK_SCHEMA, 12000, 'medium');
  const used = new Set<number>();
  const themen = ((picked?.themen as { bereich: Bereich; ids: number[]; wichtig: number; suche: string }[]) || [])
    .map((t) => ({ ...t, ids: t.ids.filter((x) => items[x] && !used.has(x)) })).filter((t) => { if (!t.ids.length) return false; t.ids.forEach((x) => used.add(x)); return true; })
    .slice(0, 24);

  // 2. Nur Bezahl-Quellen? Dann frei lesbaren Artikel bei der Tagesschau suchen
  await pool(themen.filter((t) => t.suche && t.ids.every((x) => items[x].pay)), 6, async (t) => {
    const hit = await searchFree(t.suche);
    if (hit && !seen.has(hit.link.split('?')[0])) { seen.add(hit.link.split('?')[0]); const it = { ...hit, id: items.length, hint: t.bereich }; items.push(it); t.ids.push(it.id); }
  });

  // 3. Texte holen: frei lesbare Quellen zuerst, höchstens drei je Thema
  const plan = themen.map((t) => ({ t, src: t.ids.map((x) => items[x]).sort((a, b) => Number(a.pay) - Number(b.pay) || Number(!!b.details) - Number(!!a.details)).slice(0, 3) }));
  const texts = new Map<number, Text>();
  await pool(plan.flatMap((p) => p.src), 10, async (it) => { texts.set(it.id, await fullText(it)); });

  // 4. Aufbereiten
  const written = await pool(plan, 8, async ({ t, src }) => {
    if (Date.now() - t0 > 115000) return null;
    const docs = src.map((it, k) => {
      const tx = texts.get(it.id); const body = tx && tx.text.length > 300 ? tx.text.slice(0, 7000) : '';
      return `Quelle ${k + 1}: ${it.src}${tx?.pay || (!body && it.pay) ? ' (Bezahlschranke, nur Anriss)' : ''}\nTitel: ${it.title}\nAnriss: ${it.teaser}\n${body ? 'Text:\n' + body : ''}`;
    }).join('\n\n---\n\n');
    try {
      const w = await claude(WRITE_SYSTEM, docs, WRITE_SCHEMA);
      if (!w) return null;
      const img = src.map((it) => texts.get(it.id)?.img || it.img).find((x) => x && x.startsWith('https://')) || '';
      return {
        id: hash(src[0].link), bereich: t.bereich, wichtig: t.wichtig || 3, ...w, bild: img,
        zeit: Math.max(...src.map((s) => s.date)),
        quellen: t.ids.map((x) => items[x]).map((it) => ({ name: it.src, titel: it.title, url: it.link, bezahl: texts.has(it.id) ? texts.get(it.id)!.pay : it.pay })),
        anriss: src.every((it) => { const tx = texts.get(it.id); return !tx || tx.pay || tx.text.length < 300; }),
      };
    } catch { return null; }
  });

  // 5. Märkte erklären
  let markt = null;
  if (markets.length) {
    const lines = [...markets, ...movers].map((q) => `${q.name}: ${fmt(q.price, q.price > 1000 ? 0 : 2)} ${q.unit || ''} (Vortag ${fmt(q.prev, q.prev > 1000 ? 0 : 2)}, ${q.chg >= 0 ? '+' : ''}${fmt(q.chg, 1)} %)`).join('\n');
    const heads = items.filter((i) => i.hint === 'wirtschaft').slice(0, 30).map((i) => '- ' + i.title).join('\n');
    try { const m = await claude(MARKET_SYSTEM, `Kurse:\n${lines}\n\nSchlagzeilen Wirtschaft:\n${heads}`, MARKET_SCHEMA); if (m) markt = m; } catch { /* ohne Erklärung weiter */ }
  }

  const out = written.filter(Boolean) as { bereich: Bereich; wichtig: number }[];
  return {
    at: new Date().toISOString(),
    bereiche: BEREICHE.map(([key, titel]) => ({ key, titel, artikel: out.filter((a) => a.bereich === key).sort((a, b) => b.wichtig - a.wichtig) })).filter((b) => b.artikel.length),
    maerkte: { kurse: markets.map((q) => ({ name: q.name, wert: q.price, einheit: q.unit, prozent: q.chg })), auffaellig: movers.map((q) => ({ name: q.name, wert: q.price, prozent: q.chg })), text: markt },
    status, usage, ms: Date.now() - t0,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    if (body.task === 'ping') return json({ ok: true, data: { claude: !!KEY } });
    return json({ ok: true, data: await build(!!body.dry) });
  } catch (e) {
    return json({ ok: false, error: String((e as Error).message || e) }, 500);
  }
});
