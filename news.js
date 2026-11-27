'use strict';
/* News: Meldungen kommen fertig aufbereitet aus der Datenbank (news_get, siehe supabase-news.sql).
   Die Supabase-Funktion "news" holt sie morgens, mittags und abends per RSS und lässt sie von der KI zusammenfassen. */

let newsData = (() => { try { return JSON.parse(LS.get('ep_news') || 'null'); } catch (e) { return null; } })();
let newsBusy = false, newsAsked = 0, newsWait = false, newsFail = false, newsPoll = 0;

async function loadNews(force) {
  if (!sb || newsBusy) return;
  if (!force && Date.now() - newsAsked < 3 * 60e3) return;
  newsBusy = true; newsAsked = Date.now();
  try {
    const { data, error } = await sb.rpc('news_get', { p_url: CFG.url, p_anon: CFG.key });
    if (error) throw error;
    newsFail = false; newsWait = !!(data && data.loading);
    if (data && data.sections && (!newsData || data.at !== newsData.at)) { newsData = data; LS.set('ep_news', JSON.stringify(data)); }
    // beim allerersten Mal etwa eine Minute warten, dann noch einmal nachsehen
    if (newsWait && newsPoll < 4) { newsPoll++; setTimeout(() => { if (tab === 'news') loadNews(true); }, 45e3); } else newsPoll = 0;
  } catch (e) { console.warn('News', e); newsFail = true; }
  newsBusy = false;
  if (tab === 'news' && !$('#ov').classList.contains('on')) render();
}

function newsAgo(t) {
  if (!t) return '';
  const m = Math.round((Date.now() - t) / 60e3);
  if (m < 60) return m < 2 ? 'gerade eben' : `vor ${m} Min.`;
  const hh = Math.round(m / 60); if (hh < 24) return `vor ${hh} Std.`;
  const d = new Date(t); return `${d.getDate()}. ${MON[d.getMonth()].slice(0, 3)}`;
}
function newsStand(iso) {
  const d = new Date(iso); if (isNaN(d)) return '';
  const t = `${pad(d.getHours())}:${pad(d.getMinutes())} Uhr`;
  return ymd(d) === ymd(new Date()) ? `heute ${t}` : ymd(d) === ymd(addDays(new Date(), -1)) ? `gestern ${t}` : `${d.getDate()}. ${MON[d.getMonth()]} ${t}`;
}
const newsMeta = it => [it.src, newsAgo(it.date)].filter(Boolean).join(' / ');
function newsImg(src, cls) { return src ? h('img', { class: cls, src, alt: '', loading: 'lazy', decoding: 'async', referrerpolicy: 'no-referrer', onerror: e => e.target.remove() }) : null; }

/* Börse: Prozent antippen wechselt zwischen % und Punkten/Euro (für alle Zeilen, gemerkt), Zeile antippen zeigt Verlauf und Erklärung */
let mkAbs = LS.get('ep_mkabs') === '1';
const fmt1 = (n, d) => Number(n).toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
const mkDec = m => m.unit === 'Punkte' || m.value >= 1000 ? 0 : 2;
function mkValue(m) { return m.unit === 'Punkte' ? `${fmt1(m.value, 0)} Punkte` : `${fmt1(m.value, mkDec(m))} €`; }
function mkPct(m) { return `${m.chg >= 0 ? '+' : '−'}${fmt1(Math.abs(m.chg), 1)} %`; }
function mkAbsTxt(m) { const a = Math.abs(m.abs == null ? 0 : m.abs), sg = m.chg >= 0 ? '+' : '−'; return m.unit === 'Punkte' ? `${sg}${fmt1(a, 0)} Pkt.` : `${sg}${fmt1(a, a >= 100 ? 0 : 2)} €`; }
function mkRow(m) {
  const chg = h('button', { class: 'chg ' + (m.chg >= 0 ? 'up' : 'dn'), text: mkAbs ? mkAbsTxt(m) : mkPct(m), onclick: e => {
    e.stopPropagation(); mkAbs = !mkAbs; LS.set('ep_mkabs', mkAbs ? '1' : '0');
    document.querySelectorAll('.ln.mk .chg').forEach(b => { const q = b._m; b.textContent = mkAbs ? mkAbsTxt(q) : mkPct(q); });
  } });
  chg._m = m;
  return lrow({ class: 'lr tap', onclick: () => openMarket(m) }, h('span', { class: 'tx', text: m.name }), h('span', { class: 'n', text: mkValue(m) }), chg);
}
function marketBlock(mk, movers) {
  const out = [];
  if (mk && mk.length) out.push(secHead('Börse', 'zum Vortag'), h('div', { class: 'ln mk' }, ...mk.map(mkRow)));
  if (movers && movers.length) out.push(secHead('Größte Bewegungen im DAX'), h('div', { class: 'ln mk' }, ...movers.map(mkRow)));
  return out;
}
function sparkSvg(vals, up) {
  if (!vals || vals.length < 3) return null;
  const W = 320, H = 110, lo = Math.min(...vals), hi = Math.max(...vals), r = hi - lo || 1;
  const pts = vals.map((v, i) => `${(i / (vals.length - 1) * W).toFixed(1)},${(H - 6 - (v - lo) / r * (H - 12)).toFixed(1)}`).join(' ');
  return svgEl(`<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="${up ? '#30D158' : '#FF6961'}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/></svg>`);
}
function openMarket(m) {
  const t = m.trend || [], mon = t.length > 5 ? (t[t.length - 1] - t[0]) / t[0] * 100 : null;
  openSheet(m.name, [h('div', { class: 'art mkart' },
    h('div', { class: 'mkbig' }, h('b', { text: mkValue(m) }), h('span', { class: 'chg ' + (m.chg >= 0 ? 'up' : 'dn'), text: `${mkPct(m)} / ${mkAbsTxt(m)}` })),
    h('div', { class: 'ntm', text: 'Veränderung zum Vortag' }),
    t.length > 5 ? h('div', { class: 'asub', text: 'Letzter Monat' }) : null,
    t.length > 5 ? sparkSvg(t, t[t.length - 1] >= t[0]) : null,
    mon != null ? h('div', { class: 'ntm', text: `${mon >= 0 ? '+' : '−'}${fmt1(Math.abs(mon), 1)} % in etwa einem Monat` }) : null,
    m.why ? h('div', { class: 'asub', text: 'Warum?' }) : null,
    m.why ? h('p', { text: m.why }) : null,
    m.note ? h('p', { class: 'apay', text: m.note + '.' }) : null)]);
}
function newsRow(it, s) {
  return h('div', { class: 'lr nr tap', onclick: () => openArticle(it, s) },
    h('div', { class: 'ntt' },
      h('div', { class: 'nth', text: it.title }),
      it.teaser ? h('div', { class: 'ntx', text: it.teaser }) : null,
      h('div', { class: 'ntm', text: newsMeta(it) })),
    newsImg(it.img, 'nimg'));
}
function openArticle(it, s) {
  const terms = it.terms || [], body = it.body && it.body.length ? it.body : [it.teaser].filter(Boolean);
  openSheet(s.title, [h('div', { class: 'art' },
    newsImg(it.img, 'aimg'),
    h('h3', { class: 'ah', text: it.title }),
    h('div', { class: 'ntm', text: newsMeta(it) }),
    ...body.map(p => h('p', { text: p })),
    it.context ? h('div', { class: 'asub', text: 'Einordnung' }) : null,
    it.context ? h('p', { text: it.context }) : null,
    terms.length ? h('div', { class: 'asub', text: 'Begriffe' }) : null,
    ...terms.map(t => h('p', { class: 'term' }, h('b', { text: t.term }), document.createTextNode(' ' + t.text))),
    it.pay ? h('p', { class: 'apay', text: `Bei ${it.src} ist der ganze Artikel nur mit Abo lesbar. Die Zusammenfassung beruht auf dem frei sichtbaren Anfang.` }) : null,
    h('div', { class: 'alinks' },
      h('a', { href: it.url, target: '_blank', rel: 'noopener', text: `Ganzer Artikel bei ${it.src}` }),
      ...(it.also || []).map(a => h('a', { href: a.url, target: '_blank', rel: 'noopener', text: `Auch bei ${a.src}` }))))]);
}

PAGES.news = function () {
  loadNews();
  const d = newsData;
  if (!d || !d.sections || !d.sections.length) {
    const msg = !sb ? 'Ohne Verbindung zur Datenbank gibt es keine Nachrichten.'
      : newsFail ? 'Die Nachrichten konnten gerade nicht geladen werden. Versuch es gleich noch einmal.'
      : 'Die Nachrichten werden gerade zusammengestellt. Beim ersten Mal dauert das etwa eine Minute.';
    return h('div', { class: 'pg' }, h('div', { class: 'ln pad' }, h('p', { class: 'soon', text: msg })));
  }
  return h('div', { class: 'pg news' },
    ...marketBlock(d.markets, d.movers),
    ...d.sections.flatMap(s => [secHead(s.title), h('div', { class: 'ln nl' }, ...s.items.map(it => newsRow(it, s)))]),
    h('p', { class: 'nfoot', text: `Stand ${newsStand(d.at)}${newsWait ? ', wird gerade aktualisiert' : ''}. Ausgewählt und kurz zusammengefasst von der KI, aus Tagesschau, Spiegel, Zeit, Deutschlandfunk, heise, t3n, The Decoder, Handelsblatt und FAZ.` }));
};
