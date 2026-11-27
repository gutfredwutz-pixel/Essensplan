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

function mkValue(m) {
  if (m.name === 'Euro in Dollar') return `${de(m.value, 4)} $`;
  if (m.name === 'Bitcoin') return `${de(m.value, 0)} €`;
  return `${de(m.value, 0)} Punkte`;
}
function marketBlock(mk) {
  if (!mk || !mk.length) return [];
  return [secHead('Börse', 'zum Vortag'), h('div', { class: 'ln mk' }, ...mk.map(m => lrow({},
    h('span', { class: 'tx', text: m.name }), h('span', { class: 'n', text: mkValue(m) }),
    h('span', { class: 'chg ' + (m.chg >= 0 ? 'up' : 'dn'), text: `${m.chg >= 0 ? '+' : '−'}${Math.abs(m.chg).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %` }))))];
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
    ...marketBlock(d.markets),
    ...d.sections.flatMap(s => [secHead(s.title), h('div', { class: 'ln nl' }, ...s.items.map(it => newsRow(it, s)))]),
    h('p', { class: 'nfoot', text: `Stand ${newsStand(d.at)}${newsWait ? ', wird gerade aktualisiert' : ''}. Ausgewählt und kurz zusammengefasst von der KI, aus Tagesschau, Spiegel, Zeit, Deutschlandfunk, heise, t3n, The Decoder, Handelsblatt und FAZ.` }));
};
