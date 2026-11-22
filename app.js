'use strict';
/* ============ Hilfsfunktionen ============ */
const $ = s => document.querySelector(s);
function ic(name, cls) {
  const d = (window.FA || {})[name]; if (!d) return document.createTextNode('');
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', `0 0 ${d[0]} ${d[1]}`); s.setAttribute('class', 'fa' + (cls ? ' ' + cls : ''));
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', d[2]); s.appendChild(p); return s;
}
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  if (props) for (const k in props) {
    const v = props[k]; if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'value') el.value = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) { if (c == null || c === false) continue; el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c); }
  return el;
}
function svgEl(markup) { const t = document.createElement('template'); t.innerHTML = markup.trim(); return t.content.firstChild; }
const norm = s => (s || '').toLowerCase().trim().replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ');
const slug = s => norm(s).replace(/ /g, '-').slice(0, 80) || 'x';
const cap = s => { s = (s || '').trim(); return s ? s[0].toUpperCase() + s.slice(1) : s; };
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const dayOnly = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const monday = d => { const x = dayOnly(d); const wd = (x.getDay() + 6) % 7; return addDays(x, -wd); };
const WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const WDL = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const MON = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const MEALS = ['', 'Frühstück', 'Mittag', 'Abend', 'Snack'];
let toastT; function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600); }
function longDate(ds) { const d = parseYmd(ds); return `${WDL[d.getDay()]}, ${d.getDate()}. ${MON[d.getMonth()]}`; }

/* ============ Kopfbilder ============ */
const ART = {
  cal: `<svg viewBox="0 0 64 64"><defs><linearGradient id="ga" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2F6BFF"/><stop offset="1" stop-color="#FF5FA2"/></linearGradient></defs><path d="M32 2C50 1 63 14 62 32 61 50 50 63 31 62 13 61 1 49 2 31 3 14 15 3 32 2Z" fill="url(#ga)"/><path d="M40 10l-8 24M47 13l-11 22" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><g fill="none" stroke-linecap="round" stroke-width="3"><path d="M19 36c1-7 6-10 10-7s-1 7-3 5 3-7 9-6 8 6 6 9" stroke="#FFD66B"/><path d="M26 36c3-5 9-6 13-3s3 4 6 3" stroke="#FFC23D"/></g><circle cx="27" cy="30" r="2.4" fill="#E8473E"/><circle cx="38" cy="31" r="2" fill="#E8473E"/><path d="M13 36h38c0 9-8 16-19 16S13 45 13 36z" fill="#fff"/><path d="M18 40c1 5 6 8 12 9" stroke="#FFD1E3" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg>`,
  list: `<svg viewBox="0 0 64 64"><defs><linearGradient id="gb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5B8CFF"/><stop offset="1" stop-color="#FF8DBA"/></linearGradient></defs><path d="M30 2C48 0 63 13 62 31 62 49 49 63 31 62 14 62 1 50 2 32 2 15 13 4 30 2Z" fill="url(#gb)"/><path d="M28 21c-1-5 2-9 6-10" stroke="#3FA34D" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M33 13c4-3 8-2 9 0-3 3-7 3-9 0z" fill="#5DBB63"/><path d="M22 26c-2-6 1-11 5-12l3 12z" fill="#FF9F43"/><path d="M38 26c0-5 3-9 7-9 3 2 3 6 1 9z" fill="#E8473E"/><path d="M15 26h34l-3 22c-1 3-3 5-6 5H24c-3 0-5-2-6-5z" fill="#fff"/><path d="M23 33v12M32 33v12M41 33v12" stroke="#DDE6FF" stroke-width="2.6" stroke-linecap="round"/></svg>`,
  rec: `<svg viewBox="0 0 64 64"><defs><linearGradient id="gc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2F6BFF"/><stop offset="1" stop-color="#FF8DBA"/></linearGradient></defs><path d="M33 2C51 3 63 15 62 33 61 51 48 63 30 62 12 61 1 48 2 30 3 13 16 1 33 2Z" fill="url(#gc)"/><path d="M12 20c7-3 14-3 20 2v26c-6-5-13-5-20-2z" fill="#fff"/><path d="M52 20c-7-3-14-3-20 2v26c6-5 13-5 20-2z" fill="#F4F7FF"/><path d="M17 27c3-1 7-1 10 1M17 33c3-1 7-1 10 1M17 39c3-1 7-1 10 1" stroke="#C9D6FF" stroke-width="2" stroke-linecap="round"/><path d="M37 27c3-1 7-1 10 1M37 33c3-1 7-1 10 1" stroke="#FFC2DA" stroke-width="2" stroke-linecap="round"/><circle cx="44" cy="41" r="4" fill="#FFC23D"/></svg>`
};
const TITLES = { list: 'Einkaufsliste', cal: 'Essenswoche', rec: 'Rezepte' };

/* ============ Lebensmittel-Basis ============ */
const BASE = []; const CATS = Object.keys(window.FOOD_BASE).concat(['Sonstiges']);
for (const c in window.FOOD_BASE) for (const n of window.FOOD_BASE[c].split(',')) { const nm = n.trim(); if (nm) BASE.push({ name: nm, cat: c, key: norm(nm) }); }
const baseByKey = new Map(); for (const b of BASE) if (!baseByKey.has(b.key)) baseByKey.set(b.key, b);
function catOf(name) {
  const k = norm(name); if (baseByKey.has(k)) return baseByKey.get(k).cat;
  const kn = known.get(slug(name)); if (kn && kn.category) return kn.category;
  let best = null; for (const b of BASE) { if (k.includes(b.key) || b.key.includes(k)) { if (!best || b.key.length > best.key.length) best = b; } }
  return best ? best.cat : 'Sonstiges';
}

/* ============ Zustand ============ */
let db = null, sample = null, dict = null, userCap = null, canWrite = true;
let items = [], plan = [], recipes = [], known = new Map();
let tab = 'cal', view = 'week', anchor = dayOnly(new Date()), monthAnchor = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let loaded = { items: false, plan: false, recipes: false };
try { const s = localStorage.getItem('ep_view'); if (s === 'month' || s === 'week') view = s; } catch (e) { }

const chains = {};
function queue(path, fn) {
  const p = (chains[path] || Promise.resolve()).then(fn).catch(e => { console.error(e); showErr(e); });
  chains[path] = p; return p;
}
function showErr(e) {
  const c = e && e.code;
  if (c === 'invalid_argument' && !canWrite) toast('Du hast nur Leserechte');
  else if (c === 'quota_exceeded') toast('Speicher voll, bitte erledigte Einträge löschen');
  else toast('Speichern fehlgeschlagen' + (c ? ' (' + c + ')' : ''));
}

/* ============ Start ============ */
let sb = null, household = null, people = [];
const LS = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }, del(k) { try { localStorage.removeItem(k); } catch (e) { } } };
function parseInvite(str) {
  const m = (str || '').match(/invite=([A-Za-z0-9_\-]+)/); if (!m) return null;
  try { const o = JSON.parse(decodeURIComponent(escape(atob(m[1].replace(/-/g, '+').replace(/_/g, '/'))))); return o && o.u && o.k ? o : null; } catch (e) { return null; }
}
function makeInvite() { const o = { u: CFG.url, k: CFG.key, c: household.code }; return location.origin + location.pathname + '#invite=' + btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
(() => { const inv = parseInvite(location.hash); if (inv) { LS.set('ep_cfg', JSON.stringify({ url: inv.u, key: inv.k })); if (inv.c && !LS.get('ep_household')) LS.set('ep_pending', inv.c); history.replaceState(null, '', location.pathname); } })();
let CFG = (window.EP_CONFIG && window.EP_CONFIG.url) ? window.EP_CONFIG : (() => { try { return JSON.parse(LS.get('ep_cfg') || 'null'); } catch (e) { return null; } })();
const PRESET = [{ name: 'Jakob', color: '#2F6BFF' }, { name: 'Frieda', color: '#F06AA0' }];
const EXTRA_COLORS = ['#22A06B', '#F59E0B', '#8B5CF6', '#0EA5E9'];
function me() { return LS.get('ep_me') || ''; }
function colorOf(name) {
  if (!name) return '#C3CAD8';
  const p = people.find(x => x.name === name) || PRESET.find(x => x.name === name);
  return p ? p.color : '#C3CAD8';
}
function dot(name) { return name ? h('span', { class: 'pdot', style: `background:${colorOf(name)}`, title: name }) : null; }

async function init() {
  renderTabs(); render();
  if (!window.supabase) { setStatus('Nicht geladen'); return; }
  if (!CFG || !CFG.url) return showSetup();
  sb = window.supabase.createClient(CFG.url, CFG.key, { auth: { persistSession: true, autoRefreshToken: true } });
  try {
    let { data: { session } } = await sb.auth.getSession();
    if (!session) { const r = await sb.auth.signInAnonymously(); if (r.error) throw r.error; }
  } catch (e) { console.error(e); setStatus('Anmeldung fehlgeschlagen'); return; }
  const hh = LS.get('ep_household');
  if (!hh) { const pend = LS.get('ep_pending'); if (pend) { const r = await sb.rpc('join_household', { p_code: pend }); LS.del('ep_pending'); if (!r.error) { household = r.data; LS.set('ep_household', JSON.stringify(household)); startData(); if (!me()) showWho(); return; } } return showWelcome(); }
  household = JSON.parse(hh);
  // Mitgliedschaft prüfen (z. B. nach gelöschtem Browserspeicher)
  const chk = await sb.rpc('join_household', { p_code: household.code });
  if (chk.error) { if (/not_found/.test(chk.error.message)) { LS.del('ep_household'); return showWelcome(); } }
  startData();
  if (!me()) showWho();
}
function startData() {
  db = makeDb(sb, household.id);
  const timer = setTimeout(() => { if (!loaded.items || !loaded.plan || !loaded.recipes) setStatus('Keine Verbindung'); }, 10000);
  const done = () => { if (loaded.items && loaded.plan && loaded.recipes) { clearTimeout(timer); setStatus(''); } };
  const sub = (name, set) => db.collection(name).onSnapshot(snap => { set(snap.docs.map(x => ({ id: x.id, ...x.data() }))); loaded[name] = true; done(); render(); }, e => { lastErr = (e && (e.message || e.code)) || ''; setStatus('Fehler beim Laden'); console.error(e); });
  sub('items', v => items = v); sub('plan', v => plan = v); sub('recipes', v => recipes = v);
  db.collection('known').onSnapshot(snap => { known = new Map(snap.docs.map(x => [x.id, x.data()])); });
  db.collection('people').onSnapshot(snap => { people = snap.docs.map(x => x.data()); render(); renderHead(); });
}
let lastErr = '';
function setStatus(t) { const el = $('#status'); el.textContent = t; el.onclick = lastErr ? () => toast(lastErr) : null; }

/* Datenzugriff über Supabase, gleiche Form wie vorher */
function makeDb(sb, hh) {
  const cache = {}, subs = {};
  const emit = coll => { const m = cache[coll]; if (!m) return; const docs = [...m.entries()].map(([id, d]) => ({ id, exists: true, data: () => d })); (subs[coll] || []).forEach(s => s.next({ docs, size: docs.length, empty: !docs.length, metadata: { fromCache: false } })); };
  async function load(coll) {
    const { data, error } = await sb.from('docs').select('id,data').eq('household', hh).eq('coll', coll);
    if (error) { (subs[coll] || []).forEach(s => s.err && s.err(error)); return; }
    cache[coll] = new Map(data.map(r => [r.id, r.data])); emit(coll);
  }
  sb.channel('docs-' + hh).on('postgres_changes', { event: '*', schema: 'public', table: 'docs', filter: 'household=eq.' + hh }, pl => {
    const row = pl.eventType === 'DELETE' ? pl.old : pl.new; if (!row || !row.coll || !cache[row.coll]) return;
    if (pl.eventType === 'DELETE') cache[row.coll].delete(row.id); else cache[row.coll].set(row.id, row.data);
    emit(row.coll);
  }).subscribe();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') Object.keys(subs).forEach(load); });
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  function doc(coll, id) {
    id = id || newId();
    const put = async d => {
      (cache[coll] || (cache[coll] = new Map())).set(id, d); emit(coll);
      const { error } = await sb.from('docs').upsert({ household: hh, coll, id, data: d, updated_at: new Date().toISOString() });
      if (error) throw error;
    };
    return {
      id,
      async get() { const { data, error } = await sb.from('docs').select('data').eq('household', hh).eq('coll', coll).eq('id', id).maybeSingle(); if (error) throw error; return { id, exists: !!data, data: () => data ? data.data : undefined }; },
      set: d => put(JSON.parse(JSON.stringify(d))),
      async update(part) { const cur = (cache[coll] && cache[coll].get(id)) || (await this.get()).data() || {}; return put({ ...cur, ...JSON.parse(JSON.stringify(part)) }); },
      async delete() { if (cache[coll]) { cache[coll].delete(id); emit(coll); } const { error } = await sb.from('docs').delete().eq('household', hh).eq('coll', coll).eq('id', id); if (error) throw error; }
    };
  }
  function collection(coll) {
    const c = {
      doc: id => doc(coll, id), limit: () => c,
      onSnapshot(next, err) { (subs[coll] || (subs[coll] = [])).push({ next, err }); if (cache[coll]) setTimeout(() => emit(coll), 0); else load(coll); return () => { subs[coll] = subs[coll].filter(s => s.next !== next); }; }
    };
    return c;
  }
  return { collection };
}

/* Einrichtung: Einladungslink oder Zugangsdaten */
function showSetup() {
  const link = h('textarea', { class: 'inp', placeholder: 'Einladungslink einfügen', style: 'min-height:70px' });
  const url = h('input', { class: 'inp', placeholder: 'Supabase Project URL', autocomplete: 'off', autocapitalize: 'off' });
  const key = h('input', { class: 'inp', placeholder: 'Supabase anon / publishable Key', autocomplete: 'off', autocapitalize: 'off' });
  const msg = h('div', { class: 'muted', style: 'text-align:center;min-height:20px;margin-top:8px' });
  const save = h('button', { class: 'btn p', onclick: () => {
    const inv = parseInvite(link.value);
    if (inv) { LS.set('ep_cfg', JSON.stringify({ url: inv.u, key: inv.k })); if (inv.c) LS.set('ep_pending', inv.c); location.reload(); return; }
    const u = url.value.trim(), k = key.value.trim();
    if (/^https:\/\/.+\.supabase\.co\/?$/.test(u) && k.length > 20) { LS.set('ep_cfg', JSON.stringify({ url: u.replace(/\/$/, ''), key: k })); location.reload(); return; }
    msg.textContent = 'Link oder Zugangsdaten passen nicht';
  } }, 'Weiter');
  fullSheet([h('div', { class: 'welcome' }, svgEl(ART.cal), h('h2', { text: 'Willkommen' }), link,
    h('div', { class: 'or', text: 'oder beim ersten Einrichten' }), url, key, h('div', { class: 'actions' }, save), msg)]);
  $('#ov').dataset.locked = '1';
}

/* Willkommen / Haushalt */
function fullSheet(content) { openSheet('', content); $('#sheet').querySelector('.shead').classList.add('hidden'); }
function showWelcome() {
  const code = h('input', { class: 'inp', placeholder: 'Haushalts-Code', autocapitalize: 'characters', autocomplete: 'off', style: 'text-align:center;letter-spacing:.15em;font-weight:700' });
  const msg = h('div', { class: 'muted', style: 'text-align:center;min-height:20px;margin-top:8px' });
  const join = h('button', { class: 'btn p', onclick: async () => {
    if (!code.value.trim()) return code.focus();
    join.disabled = true; const r = await sb.rpc('join_household', { p_code: code.value }); join.disabled = false;
    if (r.error) { msg.textContent = /not_found/.test(r.error.message) ? 'Diesen Code gibt es nicht' : 'Hat nicht geklappt'; return; }
    household = r.data; LS.set('ep_household', JSON.stringify(household)); closeSheet(); startData(); showWho();
  } }, 'Beitreten');
  const create = h('button', { class: 'btn r', onclick: async () => {
    create.disabled = true; const r = await sb.rpc('create_household'); create.disabled = false;
    if (r.error) { msg.textContent = 'Hat nicht geklappt'; return; }
    household = r.data; LS.set('ep_household', JSON.stringify(household)); closeSheet(); startData(); showWho();
  } }, 'Neuen Haushalt anlegen');
  fullSheet([h('div', { class: 'welcome' }, svgEl(ART.cal), h('h2', { text: 'Willkommen' }),
    h('div', { class: 'muted', text: 'Gib euren Haushalts-Code ein' }), code, h('div', { class: 'actions' }, join), msg,
    h('div', { class: 'or', text: 'oder' }), h('div', { class: 'actions', style: 'margin-top:0' }, create))]);
  $('#ov').dataset.locked = '1';
}
function showWho() {
  const list = h('div', { class: 'who' });
  const all = [...PRESET]; people.forEach(p => { if (!all.find(x => x.name === p.name)) all.push(p); });
  const pick = async (name, color) => {
    LS.set('ep_me', name);
    const id = slug(name);
    if (!people.find(p => p.name === name)) queue('people/' + id, () => db.collection('people').doc(id).set({ name, color }));
    delete $('#ov').dataset.locked; closeSheet(); renderHead(); render();
  };
  all.forEach(p => list.append(h('button', { class: 'whob', onclick: () => pick(p.name, p.color) }, h('span', { class: 'av', style: `background:${p.color}`, text: p.name[0] }), h('span', { text: p.name }))));
  const other = h('input', { class: 'inp', placeholder: 'Anderer Name' });
  other.addEventListener('keydown', e => { if (e.key === 'Enter' && other.value.trim()) pick(cap(other.value), EXTRA_COLORS[people.length % EXTRA_COLORS.length]); });
  fullSheet([h('div', { class: 'welcome' }, h('h2', { text: 'Wer bist du?' }), list, other)]);
  $('#ov').dataset.locked = '1';
}
function openProfile() {
  if (!household) return;
  const m = me();
  const copy = h('button', { class: 'btn s', onclick: () => { navigator.clipboard && navigator.clipboard.writeText(household.code).then(() => toast('Code kopiert'), () => { }); } }, 'Kopieren');
  openSheet('Haushalt', [
    h('label', { class: 'lbl', text: 'Einladen' }),
    h('div', { class: 'row' }, h('div', { class: 'codebox', text: household.code }), copy),
    h('div', { class: 'actions', style: 'margin-top:8px' }, h('button', { class: 'btn r', onclick: () => { const l = makeInvite(); (navigator.clipboard ? navigator.clipboard.writeText(l) : Promise.reject()).then(() => toast('Einladungslink kopiert'), () => toast('Kopieren nicht möglich')); } }, 'Einladungslink kopieren')),
    h('label', { class: 'lbl', text: 'Du bist' }),
    h('div', { class: 'row' }, h('span', { class: 'av', style: `background:${colorOf(m)}`, text: (m || '?')[0] }), h('span', { style: 'font-weight:600;flex:1', text: m || 'unbekannt' }), h('button', { class: 'btn g', onclick: () => { closeSheet(); showWho(); } }, 'Wechseln')),
    h('div', { class: 'actions' }, confirmBtn('Haushalt verlassen', 'Wirklich?', () => { LS.del('ep_household'); location.reload(); }, 'btn g'))]);
}

/* ============ Kopf & Tabs ============ */
function renderHead() {
  const a = $('#art'); a.replaceChildren(svgEl(ART[tab])); $('#title').textContent = TITLES[tab];
  const w = $('#who'); const m = me(); w.classList.toggle('hidden', !household); w.style.background = colorOf(m); w.textContent = (m || '?')[0];
  document.body.dataset.tab = tab;
}
function renderTabs() {
  const t = $('#tabs'); t.replaceChildren();
  const go = id => () => { tab = id; renderTabs(); render(); window.scrollTo(0, 0); };
  t.append(
    h('button', { class: 'side' + (tab === 'list' ? ' on' : ''), onclick: go('list') }, ic('cart-shopping'), h('span', { text: 'Einkaufsliste' })),
    h('button', { class: 'mid' + (tab === 'cal' ? ' on' : ''), onclick: go('cal') }, h('span', { class: 'bub' }, ic('calendar-days')), h('span', { text: 'Essenswoche' })),
    h('button', { class: 'side' + (tab === 'rec' ? ' on' : ''), onclick: go('rec') }, ic('book-open'), h('span', { text: 'Rezepte' })));
  renderHead();
}
function render() {
  const m = $('#main'); const scroll = window.scrollY;
  m.replaceChildren(tab === 'cal' ? renderCal() : tab === 'list' ? renderList() : renderRec());
  window.scrollTo(0, scroll);
}

/* ============ Essenswoche ============ */
function planOn(ds) {
  const order = { 'Frühstück': 0, 'Mittag': 1, 'Abend': 2, 'Snack': 3, '': 4 };
  return plan.filter(p => p.date === ds).sort((a, b) => (order[a.meal || ''] - order[b.meal || '']) || ((a.created || 0) - (b.created || 0)));
}
function renderCal() {
  const wrap = h('div');
  const isWeek = view === 'week';
  const e6 = addDays(anchor, 6);
  const title = isWeek ? (anchor.getMonth() === e6.getMonth() ? `${anchor.getDate()}. bis ${e6.getDate()}. ${MON[e6.getMonth()]}` : `${anchor.getDate()}. ${MON[anchor.getMonth()].slice(0, 3)}. bis ${e6.getDate()}. ${MON[e6.getMonth()].slice(0, 3)}.`) : `${MON[monthAnchor.getMonth()]} ${monthAnchor.getFullYear()}`;
  const shift = dir => { if (isWeek) anchor = addDays(anchor, 7 * dir); else monthAnchor = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + dir, 1); render(); };
  wrap.append(h('div', { class: 'calbar' },
    h('button', { class: 'ib', 'aria-label': 'Zurück', onclick: () => shift(-1) }, ic('chevron-left')),
    h('div', { class: 'ttl', text: title }),
    h('button', { class: 'ib', 'aria-label': 'Weiter', onclick: () => shift(1) }, ic('chevron-right'))));
  const isToday = isWeek ? ymd(anchor) === ymd(new Date()) : (monthAnchor.getMonth() === new Date().getMonth() && monthAnchor.getFullYear() === new Date().getFullYear());
  wrap.append(h('div', { class: 'row', style: 'justify-content:space-between;margin-bottom:14px' },
    h('div', { class: 'seg' },
      h('button', { class: isWeek ? 'on' : '', onclick: () => setView('week') }, 'Woche'),
      h('button', { class: !isWeek ? 'on' : '', onclick: () => setView('month') }, 'Monat')),
    isToday ? null : h('button', { class: 'btn s', style: 'padding:8px 16px', onclick: () => { anchor = dayOnly(new Date()); monthAnchor = new Date(new Date().getFullYear(), new Date().getMonth(), 1); render(); } }, 'Heute')));
  const body = isWeek ? renderWeek() : renderMonth();
  addGestures(body, shift);
  wrap.append(body);
  if (!db) wrap.append(offlineNote());
  return wrap;
}
function setView(v) {
  if (v === view) return;
  if (v === 'month') monthAnchor = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  else { const t = new Date(); anchor = (t.getMonth() === monthAnchor.getMonth() && t.getFullYear() === monthAnchor.getFullYear()) ? dayOnly(t) : new Date(monthAnchor); }
  view = v; try { localStorage.setItem('ep_view', v); } catch (e) { } render();
}
function renderWeek() {
  const w = h('div', { class: 'week' }); const today = ymd(new Date());
  for (let i = 0; i < 7; i++) {
    const d = addDays(anchor, i), ds = ymd(d), list = planOn(ds);
    const dishes = h('div', { class: 'dishes' });
    if (list.length) list.forEach(p => dishes.append(h('div', { class: 'chip' + (p.recipeId ? '' : ' free'), onclick: e => { e.stopPropagation(); openPlan(p); } }, dot(p.by), h('span', { class: 't', text: p.title || 'Ohne Namen' }), p.meal ? h('span', { class: 'm', text: p.meal }) : null)));
    else dishes.append(h('div', { class: 'empty', text: 'nichts geplant' }));
    w.append(h('div', { class: 'day' + (ds === today ? ' today' : ''), onclick: () => openDay(ds) },
      h('div', { class: 'dlabel' }, h('div', { class: 'wd', text: WD[(d.getDay() + 6) % 7] }), h('div', { class: 'dn', text: d.getDate() })),
      dishes,
      h('button', { class: 'ib sm p', 'aria-label': 'Gericht hinzufügen', onclick: e => { e.stopPropagation(); openDay(ds, true); } }, ic('plus'))));
  }
  return w;
}
function renderMonth() {
  const g = h('div', { class: 'month' }); WD.forEach(x => g.append(h('div', { class: 'mh', text: x })));
  const start = monday(monthAnchor); const today = ymd(new Date());
  const last = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 0);
  const end = addDays(monday(last), 6);
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const ds = ymd(d), list = planOn(ds), dd = d;
    const cell = h('div', { class: 'mc' + (d.getMonth() !== monthAnchor.getMonth() ? ' out' : '') + (ds === today ? ' today' : '') + (list.length ? ' has' : ''), onclick: () => { anchor = dayOnly(dd); view = 'week'; try { localStorage.setItem('ep_view', 'week'); } catch (e) { } render(); } }, h('div', { class: 'n', text: d.getDate() }));
    list.slice(0, 2).forEach(x => cell.append(h('div', { class: 'd', text: x.title || '…' })));
    if (list.length > 2) cell.append(h('div', { class: 'more', text: '+' + (list.length - 2) }));
    g.append(cell);
  }
  return g;
}
function addGestures(el, shift) {
  let sx = 0, sy = 0, t0 = 0, pinch0 = 0, pinchDone = false, multi = false;
  const dist = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  el.addEventListener('touchstart', e => {
    if (e.touches.length === 2) { multi = true; pinch0 = dist(e.touches); pinchDone = false; }
    else if (e.touches.length === 1) { multi = false; sx = e.touches[0].clientX; sy = e.touches[0].clientY; t0 = Date.now(); }
  }, { passive: true });
  el.addEventListener('touchmove', e => {
    if (e.touches.length === 2 && pinch0 && !pinchDone) {
      const r = dist(e.touches) / pinch0;
      if (r < 0.75 && view === 'week') { pinchDone = true; setView('month'); }
      else if (r > 1.3 && view === 'month') { pinchDone = true; setView('week'); }
    }
  }, { passive: true });
  el.addEventListener('touchend', e => {
    if (multi) { if (!e.touches.length) multi = false; return; }
    const t = e.changedTouches[0]; const dx = t.clientX - sx, dy = t.clientY - sy;
    if (Date.now() - t0 < 600 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) shift(dx < 0 ? 1 : -1);
  }, { passive: true });
  el.addEventListener('wheel', e => { if (!e.ctrlKey) return; e.preventDefault(); if (e.deltaY > 8 && view === 'week') setView('month'); else if (e.deltaY < -8 && view === 'month') setView('week'); }, { passive: false });
}
function offlineNote() { return document.createTextNode(''); }

/* ============ Vorschläge ============ */
function rankMatch(kk, k) { if (kk === k) return 100; if (kk.startsWith(k)) return 60; if (kk.split(' ').some(w => w.startsWith(k))) return 40; if (k.length >= 3 && kk.includes(k)) return 15; return 0; }
function foodSuggestions(q) {
  const k = norm(q); if (!k) return [];
  const pool = new Map();
  for (const b of BASE) if (!pool.has(b.key)) pool.set(b.key, { name: b.name, cat: b.cat, count: 0 });
  for (const [, v] of known) { if (!v || !v.name) continue; const kk = norm(v.name); const e = pool.get(kk); if (e) e.count = v.count || 0; else pool.set(kk, { name: v.name, cat: v.category || 'Sonstiges', count: v.count || 0 }); }
  const res = [];
  for (const [kk, v] of pool) { const sc = rankMatch(kk, k); if (sc) res.push({ ...v, sc: sc + Math.min(v.count, 30) * 1.5 - kk.length * 0.05 }); }
  return res.sort((a, b) => b.sc - a.sc).slice(0, 7);
}
function recipeSuggestions(q) {
  const k = norm(q); const res = [];
  for (const r of recipes) { const kk = norm(r.title); const sc = k ? rankMatch(kk, k) : 1; if (sc) res.push({ name: r.title, recipe: r, sc }); }
  return res.sort((a, b) => b.sc - a.sc || a.name.localeCompare(b.name, 'de')).slice(0, 7);
}
let suggBox = null;
function attachSuggest(input, onPick, opts = {}) {
  if (!suggBox) { suggBox = h('div', { class: 'sugg' }); document.body.append(suggBox); }
  const source = opts.source || (raw => foodSuggestions((opts.parse ? opts.parse(raw) : { name: raw }).name));
  let hl = -1, cur = [];
  const hide = () => { suggBox.style.display = 'none'; suggBox._owner = null; };
  const show = () => {
    cur = source(input.value);
    if (!cur.length || document.activeElement !== input) return hide();
    suggBox.replaceChildren(...cur.map((s, i) => h('button', { class: i === hl ? 'hl' : '', type: 'button', onmousedown: e => e.preventDefault(), onclick: () => pick(s) }, h('span', { text: s.name }))));
    const r = input.getBoundingClientRect();
    suggBox.style.left = (r.left + window.scrollX) + 'px'; suggBox.style.top = (r.bottom + window.scrollY + 6) + 'px'; suggBox.style.width = Math.max(r.width, 220) + 'px';
    suggBox.style.display = 'block'; suggBox._owner = input;
  };
  const pick = s => { onPick(s); hl = -1; hide(); };
  input.addEventListener('input', () => { hl = -1; show(); });
  input.addEventListener('focus', show);
  input.addEventListener('blur', () => setTimeout(() => { if (suggBox._owner === input) hide(); }, 120));
  input.addEventListener('keydown', e => {
    if (suggBox.style.display !== 'block') return;
    if (e.key === 'ArrowDown') { hl = Math.min(hl + 1, cur.length - 1); show(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { hl = Math.max(hl - 1, -1); show(); e.preventDefault(); }
    else if (e.key === 'Enter' && hl >= 0) { e.preventDefault(); e.stopImmediatePropagation(); pick(cur[hl]); }
    else if (e.key === 'Escape') hide();
  });
  return { hide };
}
window.addEventListener('scroll', () => { if (suggBox && suggBox._owner && !$('#ov').classList.contains('on')) suggBox.style.display = 'none'; }, { passive: true });

/* ============ Einkaufsliste ============ */
const QTY_RE = /^\s*((?:\d+(?:[.,]\d+)?|ein(?:e|en)?|zwei|drei|vier|fünf|½|1\/2)\s*(?:g|kg|ml|l|stk\.?|stück|pck\.?|packung(?:en)?|pkg|dose(?:n)?|bund|becher|glas|gläser|flasche(?:n)?|el|tl|prise|scheibe(?:n)?|netz)?)\s+(.+)$/i;
function parseEntry(raw) { const m = (raw || '').match(QTY_RE); return m ? { qty: m[1].trim(), name: cap(m[2]) } : { qty: '', name: cap(raw) }; }
function learn(name, category) {
  if (!db || !name) return; const id = slug(name); const cur = known.get(id);
  const body = { name: cap(name), category: category || (cur && cur.category) || catOf(name), count: ((cur && cur.count) || 0) + 1, last: Date.now() };
  known.set(id, body);
  return queue('known/' + id, () => db.collection('known').doc(id).set(body));
}
function addItem(raw, catHint) {
  const p = parseEntry(raw); if (!p.name) return;
  if (!db) return toast('Nicht verbunden');
  const k = norm(p.name);
  const open = items.find(i => !i.checked && norm(i.name) === k);
  if (open) {
    if (p.qty) { const qty = open.qty ? open.qty + ' + ' + p.qty : p.qty; queue('items/' + open.id, () => db.collection('items').doc(open.id).update({ qty })); }
    else toast(p.name + ' steht schon auf der Liste');
  } else {
    const done = items.find(i => i.checked && norm(i.name) === k);
    const category = catHint || catOf(p.name);
    if (done) queue('items/' + done.id, () => db.collection('items').doc(done.id).update({ checked: false, qty: p.qty, notes: [], fromDish: false, by: me(), created: Date.now() }));
    else { const ref = db.collection('items').doc(); queue('items/' + ref.id, () => ref.set({ name: p.name, qty: p.qty, notes: [], checked: false, category, fromDish: false, by: me(), created: Date.now() })); }
  }
  learn(p.name, catHint);
}
function renderList() {
  const wrap = h('div');
  const inp = h('input', { class: 'field', placeholder: 'Karotten, 500 g Hack …', enterkeyhint: 'done', autocomplete: 'off' });
  const submit = () => { const v = inp.value.trim(); if (!v) return; const p = parseEntry(v); const top = foodSuggestions(p.name)[0]; if (top && norm(top.name) !== norm(p.name) && norm(top.name).startsWith(norm(p.name))) addItem((p.qty ? p.qty + ' ' : '') + top.name, top.cat); else addItem(v); inp.value = ''; inp.focus(); };
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
  attachSuggest(inp, s => { const p = parseEntry(inp.value); addItem((p.qty ? p.qty + ' ' : '') + s.name, s.cat); inp.value = ''; inp.focus(); }, { parse: parseEntry });
  wrap.append(h('div', { class: 'addbar' }, inp, h('button', { class: 'ib p big', 'aria-label': 'Hinzufügen', onclick: submit }, ic('plus'))));
  if (!canWrite) wrap.append(h('div', { class: 'note', text: 'Nur Leserechte' }));
  const open = items.filter(i => !i.checked), done = items.filter(i => i.checked);
  if (db && loaded.items && !items.length) wrap.append(h('div', { class: 'emptybig', text: 'Noch nichts auf der Liste' }));
  for (const c of CATS) {
    const list = open.filter(i => (CATS.includes(i.category) ? i.category : 'Sonstiges') === c).sort((a, b) => a.name.localeCompare(b.name, 'de'));
    if (!list.length) continue;
    wrap.append(h('div', { class: 'group' }, h('div', { class: 'cat', text: c }), ...list.map(itemRow)));
  }
  if (done.length) {
    wrap.append(h('div', { class: 'group done' },
      h('div', { class: 'row', style: 'justify-content:space-between' }, h('div', { class: 'cat', text: `Im Wagen (${done.length})` }),
        confirmBtn('Leeren', 'Sicher?', () => done.forEach(i => queue('items/' + i.id, () => db.collection('items').doc(i.id).delete())), 'btn g sm')),
      ...done.sort((a, b) => (b.checkedAt || 0) - (a.checkedAt || 0)).map(itemRow)));
  }
  if (!db) wrap.append(offlineNote());
  return wrap;
}
function itemRow(i) {
  const toggle = () => queue('items/' + i.id, () => db.collection('items').doc(i.id).update({ checked: !i.checked, checkedAt: Date.now() }));
  const subs = (i.notes || []).map(n => h('span', null, h('span', { class: 'for', text: '+ ' + (n.amount ? n.amount + ' ' : '') + 'für ' }), n.dish || 'Gericht'));
  return h('div', { class: 'item' + (i.checked ? ' done' : '') },
    h('button', { class: 'cb', 'aria-label': i.checked ? 'Zurück auf die Liste' : 'Abhaken', onclick: toggle }, ic('check')),
    h('div', { class: 'body', onclick: toggle }, h('div', null, dot(i.by), h('span', { class: 'nm', text: i.name }), i.qty ? h('span', { class: 'qty', text: '  ' + i.qty }) : null), subs.length ? h('div', { class: 'sub' }, subs) : null),
    h('button', { class: 'ib sm ghost', 'aria-label': 'Löschen', onclick: () => queue('items/' + i.id, () => db.collection('items').doc(i.id).delete()) }, ic('xmark')));
}
function confirmBtn(label, confirmLabel, fn, cls) {
  let armed = false, t; const b = h('button', { class: cls || 'btn danger', text: label });
  b.addEventListener('click', () => { if (!armed) { armed = true; b.textContent = confirmLabel; t = setTimeout(() => { armed = false; b.textContent = label; }, 3000); return; } clearTimeout(t); fn(); });
  return b;
}

/* ============ Rezepte ============ */
let recQuery = '';
function renderRec() {
  const wrap = h('div');
  const inp = h('input', { class: 'field', placeholder: 'Rezept oder Zutat suchen', value: recQuery, autocomplete: 'off' });
  const listEl = h('div', { class: 'reclist' });
  const draw = () => {
    const q = norm(inp.value); recQuery = inp.value;
    const list = recipes.filter(r => !q || norm(r.title).includes(q) || (r.ingredients || []).some(g => norm(g.name).includes(q))).sort((a, b) => a.title.localeCompare(b.title, 'de'));
    listEl.replaceChildren(...list.map((r, i) => h('div', { class: 'rcard c' + (i % 3), onclick: () => openRecipe(r) },
      h('div', { style: 'flex:1;min-width:0' }, h('div', { class: 't' }, dot(r.by), r.title), h('div', { class: 's', text: `${(r.ingredients || []).length} Zutaten` })),
      h('button', { class: 'ib sm', 'aria-label': 'Einplanen', onclick: e => { e.stopPropagation(); openSchedule(r); } }, ic('calendar-plus')))));
    if (!list.length) listEl.append(h('div', { class: 'emptybig', text: recipes.length ? 'Nichts gefunden' : 'Noch keine Rezepte' }));
  };
  inp.addEventListener('input', draw);
  wrap.append(h('div', { class: 'addbar' }, inp, h('button', { class: 'ib p big', 'aria-label': 'Neues Rezept', onclick: () => openRecipe({ title: '', ingredients: [], steps: [] }) }, ic('plus'))), listEl);
  draw();
  if (!db) wrap.append(offlineNote());
  return wrap;
}
function mealSelect(v) { return h('select', { class: 'inp' }, MEALS.map(m => { const o = h('option', { value: m, text: m || 'keine' }); if (m === v) o.selected = true; return o; })); }
function openSchedule(r) {
  const date = h('input', { class: 'inp', type: 'date', value: ymd(new Date()) });
  const meal = mealSelect('');
  openSheet(r.title + ' einplanen', [h('label', { class: 'lbl', text: 'Datum' }), date, h('label', { class: 'lbl', text: 'Mahlzeit' }), meal,
  h('div', { class: 'actions' }, h('button', { class: 'btn p', onclick: async () => { if (!date.value) return; closeSheet(); await addPlan({ date: date.value, meal: meal.value, title: r.title, recipeId: r.id }); anchor = parseYmd(date.value); tab = 'cal'; view = 'week'; renderTabs(); render(); } }, 'Einplanen'))]);
}

/* ============ Sheet ============ */
function openSheet(title, content) {
  const s = $('#sheet'); s.replaceChildren(h('div', { class: 'shead' }, h('h2', { text: title }), h('button', { class: 'ib', 'aria-label': 'Schließen', onclick: closeSheet }, ic('xmark'))), ...content);
  $('#ov').classList.add('on'); s.scrollTop = 0; document.body.style.overflow = 'hidden';
}
function closeSheet() { $('#ov').classList.remove('on'); document.body.style.overflow = ''; if (suggBox) suggBox.style.display = 'none'; }
$('#ov').addEventListener('click', e => { if (e.target.id === 'ov' && !$('#ov').dataset.locked) closeSheet(); });
$('#sheet').addEventListener('scroll', () => { if (suggBox) suggBox.style.display = 'none'; }, { passive: true });

/* ============ Tag öffnen ============ */
function openDay(ds, focus) {
  const list = planOn(ds);
  const planned = h('div', { class: 'planned' });
  if (list.length) list.forEach(p => planned.append(h('div', { class: 'chip' + (p.recipeId ? '' : ' free'), onclick: () => openPlan(p) }, dot(p.by), h('span', { class: 't', text: p.title }), p.meal ? h('span', { class: 'm', text: p.meal }) : null)));
  else planned.append(h('div', { class: 'empty', text: 'nichts geplant' }));
  const inp = h('input', { class: 'inp', placeholder: 'Rezept wählen oder Gericht eintippen', autocomplete: 'off', enterkeyhint: 'done' });
  const meal = mealSelect('');
  const add = async (title, recipe) => {
    title = cap(title); if (!title) return;
    const r = recipe || recipes.find(x => norm(x.title) === norm(title));
    closeSheet();
    await addPlan({ date: ds, meal: meal.value, title: r ? r.title : title, recipeId: r ? r.id : null });
  };
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); add(inp.value); } });
  attachSuggest(inp, s => add(s.name, s.recipe), { source: recipeSuggestions });
  openSheet(longDate(ds), [planned,
    h('label', { class: 'lbl', text: 'Hinzufügen' }), inp,
    h('div', { class: 'row', style: 'margin-top:8px' }, h('div', { style: 'flex:1' }, meal), h('button', { class: 'btn p', onclick: () => add(inp.value) }, 'Eintragen')),
    h('div', { class: 'actions' }, h('button', { class: 'btn r', onclick: () => openRecipe({ title: cap(inp.value), ingredients: [], steps: [] }, { planDate: ds, meal: meal.value }) }, 'Neues Rezept erstellen'))]);
  if (focus) setTimeout(() => inp.focus(), 250);
}

/* ============ Plan-Eintrag ============ */
async function addPlan(p) {
  if (!db) return toast('Nicht verbunden');
  const ref = db.collection('plan').doc();
  const body = { date: p.date, meal: p.meal || '', title: p.title, recipeId: p.recipeId || null, listed: false, by: me(), created: Date.now() };
  await queue('plan/' + ref.id, () => ref.set(body));
  const r = body.recipeId && recipes.find(x => x.id === body.recipeId);
  if (r && (r.ingredients || []).length) await listForPlan(ref.id, r);
  else toast(body.title + ' eingetragen');
}
async function listForPlan(planId, r) {
  toast('Gleiche mit Einkaufsliste ab …');
  const ok = await mergeIngredients(planId, r.title, (r.ingredients || []).filter(g => (g.name || '').trim()));
  if (ok) { await queue('plan/' + planId, () => db.collection('plan').doc(planId).update({ listed: true })); toast(`Zutaten für ${r.title} auf der Einkaufsliste`); }
}
function openPlan(p) {
  const r = p.recipeId && recipes.find(x => x.id === p.recipeId);
  const date = h('input', { class: 'inp', type: 'date', value: p.date || '' });
  const meal = mealSelect(p.meal || '');
  const content = [h('div', { class: 'row' }, h('div', { style: 'flex:1.3' }, h('label', { class: 'lbl', text: 'Datum' }), date), h('div', { style: 'flex:1' }, h('label', { class: 'lbl', text: 'Mahlzeit' }), meal))];
  if (r) {
    if ((r.ingredients || []).length) content.push(h('label', { class: 'lbl', text: 'Zutaten' + (r.servings ? ` für ${r.servings} Portionen` : '') }), h('div', { class: 'ingview' }, r.ingredients.map(g => h('div', null, h('span', { text: g.name }), h('span', { class: 'a', text: g.amount || '' })))));
    if ((r.steps || []).length) content.push(h('label', { class: 'lbl', text: 'Zubereitung' }), h('div', { class: 'stepview' }, r.steps.map((s, i) => h('div', null, h('span', { class: 'k', text: i + 1 }), h('span', { text: s })))));
    if (r.source) content.push(h('label', { class: 'lbl', text: 'Link' }), h('a', { class: 'link', href: r.source, target: '_blank', rel: 'noopener', text: r.source }));
  }
  const save = h('button', { class: 'btn p', onclick: async () => { const upd = {}; if (date.value && date.value !== p.date) upd.date = date.value; if (meal.value !== (p.meal || '')) upd.meal = meal.value; closeSheet(); if (Object.keys(upd).length) { await queue('plan/' + p.id, () => db.collection('plan').doc(p.id).update(upd)); if (upd.date) anchor = parseYmd(upd.date); render(); } } }, 'Speichern');
  content.push(h('div', { class: 'actions' }, save,
    r ? h('button', { class: 'btn s', onclick: () => openRecipe(r) }, 'Rezept bearbeiten') : h('button', { class: 'btn r', onclick: () => openRecipe({ title: p.title, ingredients: [], steps: [] }, { linkPlan: p }) }, 'Rezept anlegen')));
  if (r && !p.listed && (r.ingredients || []).length) content.push(h('div', { class: 'actions', style: 'margin-top:8px' }, h('button', { class: 'btn s', onclick: async () => { closeSheet(); await listForPlan(p.id, r); } }, 'Zutaten auf die Einkaufsliste')));
  content.push(h('div', { class: 'actions', style: 'margin-top:8px' }, confirmBtn('Aus der Woche entfernen', 'Wirklich entfernen?', async () => { closeSheet(); await removePlan(p); })));
  openSheet(p.title, content);
}
async function removePlan(p) {
  if (!db) return;
  await queue('plan/' + p.id, () => db.collection('plan').doc(p.id).delete());
  for (const i of items) {
    if (i.checked) continue; const notes = i.notes || [];
    if (!notes.some(n => n.dishId === p.id)) continue;
    const rest = notes.filter(n => n.dishId !== p.id);
    const ref = db.collection('items').doc(i.id);
    if (!rest.length && i.fromDish && !i.qty) queue('items/' + i.id, () => ref.delete());
    else queue('items/' + i.id, () => ref.update({ notes: rest }));
  }
}

/* ============ Rezept bearbeiten ============ */
function openRecipe(rec, ctx = {}) {
  const st = { ...rec, ingredients: (rec.ingredients || []).map(g => ({ ...g })), steps: [...(rec.steps || [])] };
  const title = h('input', { class: 'inp', placeholder: 'z. B. Lasagne', value: st.title || '' });
  const servings = h('input', { class: 'inp', style: 'width:64px;padding:8px 10px;text-align:center', placeholder: '2', value: st.servings || '', inputmode: 'numeric' });
  const source = h('input', { class: 'inp', placeholder: 'optional', value: st.source || '' });
  const ingBox = h('div'); const stepBox = h('div', { class: 'steps' });
  const drawIng = () => {
    ingBox.replaceChildren(...st.ingredients.map((g, idx) => {
      const n = h('input', { class: 'inp n', placeholder: 'Zutat', value: g.name || '', autocomplete: 'off' });
      const a = h('input', { class: 'inp a', placeholder: 'Menge', value: g.amount || '' });
      n.addEventListener('input', () => { g.name = n.value; });
      a.addEventListener('input', () => { g.amount = a.value; });
      attachSuggest(n, s => { g.name = s.name; n.value = s.name; a.focus(); });
      return h('div', { class: 'ing' }, n, a, h('button', { class: 'ib sm ghost', 'aria-label': 'Entfernen', onclick: () => { st.ingredients.splice(idx, 1); drawIng(); } }, ic('xmark')));
    }), h('button', { class: 'btn s', style: 'margin-top:4px', onclick: () => { st.ingredients.push({ name: '', amount: '' }); drawIng(); const l = ingBox.querySelectorAll('.ing .n'); l[l.length - 1] && l[l.length - 1].focus(); } }, 'Zutat hinzufügen'));
  };
  const drawSteps = () => {
    stepBox.replaceChildren(...st.steps.map((s, idx) => {
      const t = h('textarea', { class: 'inp', style: 'min-height:54px', value: s });
      t.addEventListener('input', () => { st.steps[idx] = t.value; });
      return h('div', { class: 'st' }, h('span', { class: 'k', text: idx + 1 }), t, h('button', { class: 'ib sm ghost', 'aria-label': 'Entfernen', onclick: () => { st.steps.splice(idx, 1); drawSteps(); } }, ic('xmark')));
    }), h('button', { class: 'btn s', style: 'margin-top:4px', onclick: () => { st.steps.push(''); drawSteps(); } }, 'Schritt hinzufügen'));
  };
  drawIng(); drawSteps();
  const importer = buildImporter(res => {
    if (res.title && !title.value.trim()) title.value = res.title;
    if (res.servings && !servings.value.trim()) servings.value = String(res.servings);
    const have = new Set(st.ingredients.map(g => norm(g.name)));
    for (const g of (res.ingredients || [])) { if (g && g.name && !have.has(norm(g.name))) { st.ingredients.push({ name: cap(g.name), amount: g.amount || '' }); have.add(norm(g.name)); } }
    st.ingredients = st.ingredients.filter(g => (g.name || '').trim());
    if (res.steps && res.steps.length) { st.steps = st.steps.filter(s => s.trim()); st.steps.push(...res.steps.map(String)); }
    drawIng(); drawSteps(); toast('Rezept übernommen, bitte prüfen');
  });
  const saveBtn = h('button', { class: 'btn p' }, ctx.planDate ? 'Speichern und eintragen' : 'Speichern');
  saveBtn.addEventListener('click', async () => {
    const t = title.value.trim(); if (!t) { title.focus(); return toast('Bitte einen Namen eingeben'); }
    if (!db) return toast('Nicht verbunden');
    saveBtn.disabled = true;
    try {
      const ref = st.id ? db.collection('recipes').doc(st.id) : db.collection('recipes').doc();
      const body = { title: cap(t), servings: servings.value.trim(), source: source.value.trim(), ingredients: st.ingredients.filter(g => (g.name || '').trim()).map(g => ({ name: cap(g.name), amount: g.amount || '' })), steps: st.steps.filter(s => s.trim()), updated: Date.now(), created: st.created || Date.now(), by: st.by || me() };
      await queue('recipes/' + ref.id, () => ref.set(body));
      body.ingredients.forEach(g => learn(g.name));
      const saved = { id: ref.id, ...body };
      if (!recipes.find(x => x.id === ref.id)) recipes.push(saved); else recipes = recipes.map(x => x.id === ref.id ? saved : x);
      // Titel in geplanten Einträgen aktuell halten
      for (const p of plan) if (p.recipeId === ref.id && p.title !== body.title) queue('plan/' + p.id, () => db.collection('plan').doc(p.id).update({ title: body.title }));
      closeSheet();
      if (ctx.planDate) { await addPlan({ date: ctx.planDate, meal: ctx.meal || '', title: body.title, recipeId: ref.id }); anchor = parseYmd(ctx.planDate); tab = 'cal'; renderTabs(); render(); }
      else if (ctx.linkPlan) { await queue('plan/' + ctx.linkPlan.id, () => db.collection('plan').doc(ctx.linkPlan.id).update({ recipeId: ref.id, title: body.title })); if (body.ingredients.length) await listForPlan(ctx.linkPlan.id, saved); }
      else toast('Gespeichert');
    } finally { saveBtn.disabled = false; }
  });
  const content = [
    h('label', { class: 'lbl', text: 'Name' }), title,
    importer,
    h('div', { class: 'row lbl', style: 'gap:8px' }, 'Zutaten für', servings, 'Portionen'),
    ingBox,
    h('label', { class: 'lbl', text: 'Zubereitung' }), stepBox,
    h('label', { class: 'lbl', text: 'Link' }), source,
    h('div', { class: 'actions' }, saveBtn),
  ];
  if (st.id) content.push(h('div', { class: 'actions', style: 'margin-top:8px' },
    h('button', { class: 'btn s', onclick: () => openSchedule(st) }, 'Einplanen'),
    confirmBtn('Rezept löschen', 'Wirklich löschen?', async () => { closeSheet(); await queue('recipes/' + st.id, () => db.collection('recipes').doc(st.id).delete()); toast('Gelöscht'); })));
  openSheet(st.id ? 'Rezept bearbeiten' : 'Neues Rezept', content);
  if (!st.id && !st.title) setTimeout(() => title.focus(), 250);
}

/* ============ Abgleich mit der Einkaufsliste (ohne KI) ============ */
const SYN = {
  'hack': 'hackfleisch', 'hackfleisch gemischt': 'gemischtes hack', 'rinderhackfleisch': 'rinderhack', 'mohren': 'karotten', 'mohre': 'karotten', 'karotte': 'karotten', 'mohrruben': 'karotten', 'zwiebel': 'zwiebeln',
  'tomate': 'tomaten', 'kartoffel': 'kartoffeln', 'ei': 'eier', 'knoblauchzehe': 'knoblauch', 'knoblauchzehen': 'knoblauch', 'knofi': 'knoblauch', 'paprikaschote': 'paprika', 'paprikaschoten': 'paprika',
  'nudel': 'nudeln', 'pasta': 'nudeln', 'zucchino': 'zucchini', 'champignon': 'champignons', 'pilz': 'pilze', 'gurken': 'gurke', 'salatgurke': 'gurke', 'lauchzwiebeln': 'fruhlingszwiebeln', 'lauchzwiebel': 'fruhlingszwiebeln',
  'fruhlingszwiebel': 'fruhlingszwiebeln', 'zitrone': 'zitronen', 'limette': 'limetten', 'apfel': 'apfel', 'banane': 'bananen', 'dosentomaten': 'gehackte tomaten', 'tomaten aus der dose': 'gehackte tomaten', 'stuckige tomaten': 'gehackte tomaten',
  'passata': 'passierte tomaten', 'kase': 'geriebener kase', 'reibekase': 'geriebener kase', 'sahne': 'sahne', 'schlagobers': 'sahne', 'creme fraiche': 'creme fraiche', 'olivenol': 'olivenol', 'ol': 'olivenol',
  'bruhe': 'gemusebruhe', 'gemusebruhe': 'gemusebruhe', 'mehl': 'mehl', 'zucker': 'zucker', 'butter': 'butter', 'speckwurfel': 'speckwurfel', 'hahnchen': 'hahnchenbrust', 'huhnchen': 'hahnchenbrust', 'hahnchenfilet': 'hahnchenbrust',
  'lasagne platten': 'lasagneplatten', 'lasagnenudeln': 'lasagneplatten', 'spaghetti nudeln': 'spaghetti', 'basilikumblatter': 'basilikum', 'petersilie glatt': 'glatte petersilie'
};
function canon(name) {
  let k = norm(name).replace(/^(frische?n?|gehackte?|getrocknete?|geriebene?n?|kleine?|grosse?|rote?|weisse?)\s+(?=\S)/, m => /gehackt|getrocknet|gerieben|rote|weisse/.test(m) ? m : '');
  k = k.trim();
  if (SYN[k]) return SYN[k];
  if (baseByKey.has(k)) return k;
  for (const v of [k.replace(/n$/, ''), k.replace(/en$/, ''), k.replace(/e$/, ''), k.replace(/s$/, ''), k + 'n', k + 'en', k + 'e', k + 's']) { if (SYN[v]) return SYN[v]; if (baseByKey.has(v)) return v; }
  return k;
}
function canonName(name) { const c = canon(name); const b = baseByKey.get(c); return b ? b.name : cap(name); }
async function mergeIngredients(dishId, dishTitle, ings) {
  const open = items.filter(i => !i.checked);
  const created = new Map();
  try {
    for (const g of ings) {
      const c = canon(g.name); if (!c || c === 'wasser' || c === 'leitungswasser') continue;
      const note = { dishId, dish: dishTitle, amount: (g.amount || '').toString() };
      const target = open.find(i => canon(i.name) === c);
      if (target) {
        const ref = db.collection('items').doc(target.id);
        queue('items/' + target.id, async () => { const cur = items.find(x => x.id === target.id) || target; const notes = (cur.notes || []).filter(n => !(n.dishId === dishId && n.amount === note.amount)); notes.push(note); await ref.update({ notes }); });
      } else {
        const id = created.get(c);
        if (id) { queue('items/' + id, async () => { const cur = items.find(x => x.id === id) || {}; await db.collection('items').doc(id).update({ notes: [...(cur.notes || []), note] }); }); }
        else {
          const name = canonName(g.name); const ref = db.collection('items').doc(); created.set(c, ref.id);
          queue('items/' + ref.id, () => ref.set({ name, qty: '', notes: [note], checked: false, category: catOf(name), fromDish: true, by: me(), created: Date.now() }));
        }
      }
    }
    await Promise.all(Object.values(chains));
    return true;
  } catch (e) { console.error(e); return false; }
}

/* ============ Rezept aus Text erkennen (ohne KI) ============ */
const NUMW = { 'ein': 1, 'eine': 1, 'einen': 1, 'einem': 1, 'zwei': 2, 'drei': 3, 'vier': 4, 'funf': 5, 'sechs': 6, 'sieben': 7, 'acht': 8, 'neun': 9, 'zehn': 10, 'zwolf': 12, 'halbe': 0.5, 'halben': 0.5, 'einhundert': 100, 'hundert': 100, 'zweihundert': 200, 'dreihundert': 300, 'vierhundert': 400, 'funfhundert': 500, 'sechshundert': 600, 'achthundert': 800 };
const UNITS = { 'g': 'g', 'gr': 'g', 'gramm': 'g', 'kg': 'kg', 'kilo': 'kg', 'kilogramm': 'kg', 'ml': 'ml', 'milliliter': 'ml', 'l': 'l', 'liter': 'l', 'el': 'EL', 'essloffel': 'EL', 'tl': 'TL', 'teeloffel': 'TL', 'dose': 'Dose', 'dosen': 'Dosen', 'packung': 'Packung', 'packungen': 'Packungen', 'pck': 'Packung', 'prise': 'Prise', 'stuck': 'Stück', 'stk': 'Stück', 'bund': 'Bund', 'zehe': 'Zehe', 'zehen': 'Zehen', 'becher': 'Becher', 'glas': 'Glas', 'tasse': 'Tasse', 'tassen': 'Tassen', 'scheiben': 'Scheiben', 'scheibe': 'Scheibe', 'handvoll': 'Handvoll', 'cl': 'cl', 'dl': 'dl' };
const VERBS = /\b(anbraten|braten|brat|kochen|koch|schneiden|schneid|hacken|wurfeln|geben|gebt|gib|hinzufugen|dazu|backen|mischen|verruhren|ruhren|wurzen|kocheln|schichten|servieren|garen|erhitzen|abgiessen|vermengen|purieren|ofen|anrichten|reiben|schmelzen|aufkochen|ziehen lassen|abschmecken|zugeben|einruhren|verteilen|bestreuen|marinieren|ablöschen|abloschen|waschen|schalen)\b/;
function recipeFromText(text) {
  const raw = (text || '').replace(/\r/g, '');
  const tokens = []; // [{w, n}] normalisierte Wörter
  raw.replace(/[0-9]+(?:[.,][0-9]+)?|[A-Za-zÄÖÜäöüß'-]+/g, m => { tokens.push({ o: m, n: norm(m) }); return m; });
  // Kandidaten: Basis-Lebensmittel + gelernte Begriffe, längste zuerst
  const cands = new Map();
  for (const b of BASE) cands.set(b.key, b.name);
  for (const [, v] of known) if (v && v.name) cands.set(norm(v.name), v.name);
  for (const s in SYN) if (!cands.has(s)) cands.set(s, (baseByKey.get(SYN[s]) || { name: cap(s) }).name);
  const keys = [...cands.keys()].filter(k => k.length >= 3).sort((a, b) => b.split(' ').length - a.split(' ').length || b.length - a.length);
  const used = new Array(tokens.length).fill(false); const found = new Map();
  const words = tokens.map(t => t.n);
  for (const k of keys) {
    const kw = k.split(' '); const L = kw.length;
    for (let i = 0; i + L <= words.length; i++) {
      let ok = true; for (let j = 0; j < L; j++) { const w = words[i + j]; if (used[i + j] || !(w === kw[j] || (j === L - 1 && (w === kw[j] + 'n' || w === kw[j] + 'en' || w === kw[j] + 'e' || w + 'n' === kw[j] || w + 'en' === kw[j])))) { ok = false; break; } }
      if (!ok) continue;
      for (let j = 0; j < L; j++) used[i + j] = true;
      // Menge davor suchen
      let amount = '', unit = '';
      for (let b = i - 1; b >= Math.max(0, i - 4); b--) {
        const w = words[b];
        if (!unit && UNITS[w]) { unit = UNITS[w]; continue; }
        if (/^[0-9]/.test(tokens[b].o)) { amount = tokens[b].o.replace(',', '.'); break; }
        if (NUMW[w] != null) { amount = String(NUMW[w]); break; }
        if (['von', 'etwas', 'frische', 'frischen', 'gehackte', 'geriebenen', 'geriebener', 'kleine', 'grosse', 'rote', 'gelbe', 'und', 'mit', 'oder'].includes(w)) continue;
        break;
      }
      const name = canonName(cands.get(k));
      const c = canon(name);
      if (!found.has(c)) found.set(c, { name, amount: [amount, unit].filter(Boolean).join(' ') });
      else if (!found.get(c).amount && (amount || unit)) found.get(c).amount = [amount, unit].filter(Boolean).join(' ');
    }
  }
  // Titel
  let title = '';
  const m = raw.match(/(?:heute (?:machen|kochen|gibt es|gibts|backen) (?:wir|ich)?\s*(?:eine?n?|eine)?\s*)([A-Za-zÄÖÜäöüß -]{3,40}?)(?:[.,!:]|\s+(?:und|mit|die|das|der|ihr|dafür|dafur)\b)/i);
  if (m) title = cap(m[1].trim());
  else { const first = raw.split('\n').map(s => s.trim()).find(s => s && s.split(/\s+/).length <= 5 && !/[0-9]/.test(s)); if (first) title = cap(first.replace(/[.:!]+$/, '')); }
  // Schritte
  const sentences = raw.replace(/\n+/g, '. ').split(/(?<=[.!?])\s+|\s+(?=dann\s)/i).map(s => s.trim().replace(/^[-•*\d.)\s]+/, '')).filter(s => s.length > 8);
  const steps = sentences.filter(s => VERBS.test(norm(s))).slice(0, 12).map(s => cap(s.replace(/[.!]+$/, '')));
  return { title, ingredients: [...found.values()], steps };
}

/* ============ Import: Text, Einsprechen, Video, Fotos ============ */
function buildImporter(onResult) {
  const txt = h('textarea', { class: 'inp', placeholder: 'Text, Videobeschreibung oder Untertitel' });
  const fileInp = h('input', { type: 'file', accept: 'video/*,image/*', multiple: true, class: 'hidden' });
  const filesEl = h('div', { class: 'files' });
  const prog = h('div', { class: 'prog hidden' }); const bar = h('div', { class: 'bar hidden' }, h('i'));
  let files = [];
  fileInp.addEventListener('change', () => { files = [...fileInp.files]; filesEl.replaceChildren(...files.map(f => h('span', { text: f.name.slice(0, 32) }))); });
  const setProg = (t, frac) => { prog.classList.remove('hidden'); prog.replaceChildren(ic('spinner', 'spin'), h('span', { text: t })); if (frac != null) { bar.classList.remove('hidden'); bar.firstChild.style.width = Math.round(frac * 100) + '%'; } else bar.classList.add('hidden'); };
  const endProg = (t, isErr) => { bar.classList.add('hidden'); if (!t) { prog.classList.add('hidden'); return; } prog.classList.remove('hidden'); prog.replaceChildren(h('span', { text: t, style: isErr ? 'color:#A33' : '' })); };

  // Einsprechen: Aufnahme, dann Whisper
  let rec = null, chunks = [];
  const mic = h('button', { class: 'btn r', type: 'button' }, 'Einsprechen');
  mic.addEventListener('click', async () => {
    if (rec) { rec.stop(); return; }
    if (!navigator.mediaDevices || !window.MediaRecorder) return endProg('Aufnahme wird hier nicht unterstützt', true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks = []; rec = new MediaRecorder(stream);
      rec.ondataavailable = e => e.data.size && chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop()); rec = null; mic.textContent = 'Einsprechen';
        const blob = new Blob(chunks, { type: chunks[0] ? chunks[0].type : 'audio/mp4' });
        try { const t = await window.transcribeVideo(blob, setProg); if (t) txt.value = (txt.value ? txt.value.trim() + '\n' : '') + t; endProg(t ? '' : 'Nichts verstanden', !t); } catch (e) { console.error(e); endProg('Konnte die Aufnahme nicht auswerten', true); }
      };
      rec.start(); mic.textContent = 'Stopp'; endProg('Aufnahme läuft …');
    } catch (e) { endProg('Kein Zugriff aufs Mikrofon', true); }
  });

  const go = h('button', { class: 'btn p', type: 'button' }, 'Auslesen');
  go.addEventListener('click', async () => {
    if (!txt.value.trim() && !files.length) return endProg('Text, Video oder Foto fehlt', true);
    go.disabled = true;
    try {
      let text = txt.value.trim();
      const videos = files.filter(f => f.type.startsWith('video')), photos = files.filter(f => f.type.startsWith('image'));
      const images = [...photos];
      for (const v of videos) {
        try { const t = await window.transcribeVideo(v, setProg); if (t) text += '\n' + t; } catch (e) { console.warn(e); }
        setProg('Nehme Standbilder aus dem Video …');
        try { images.push(...await videoFrames(v, 6)); } catch (e) { console.warn(e); }
      }
      if (images.length) {
        const ocr = await ocrImages(images, setProg);
        if (ocr) text += '\n' + ocr;
      }
      if (text.trim() && text.trim() !== txt.value.trim()) txt.value = text.trim();
      const res = recipeFromText(text);
      if (!res.ingredients.length && !res.steps.length && !res.title) { endProg('Keine Zutaten erkannt', true); return; }
      onResult(res);
      endProg(`${res.ingredients.length} Zutaten erkannt, bitte prüfen`);
    } catch (e) { console.error(e); endProg('Hat nicht geklappt, bitte nochmal versuchen', true); }
    finally { go.disabled = false; }
  });
  return h('div', { class: 'imp' },
    h('h3', { text: 'Rezept automatisch erfassen' }),
    txt,
    h('div', { class: 'row', style: 'flex-wrap:wrap;margin-top:8px' },
      h('button', { class: 'btn s', type: 'button', onclick: () => fileInp.click() }, 'Video oder Fotos'), mic, go), fileInp, filesEl, prog, bar);
}

/* Texterkennung auf Bildern */
let ocrWorker = null;
async function ocrImages(images, onProg) {
  if (!window.Tesseract) return '';
  onProg && onProg('Lese Text aus den Bildern …', 0);
  if (!ocrWorker) {
    const base = new URL('.', location.href).href;
    ocrWorker = await Tesseract.createWorker('deu', 1, { workerPath: base + 'lib/tesseract/worker.min.js', corePath: base + 'lib/tesseract/', langPath: base + 'lang', gzip: true });
  }
  const out = []; const seen = new Set();
  for (let i = 0; i < images.length; i++) {
    onProg && onProg('Lese Text aus den Bildern …', i / images.length);
    try {
      const { data } = await ocrWorker.recognize(images[i]);
      for (const line of (data.text || '').split('\n')) { const l = line.trim(); const k = norm(l); if (l.length > 2 && !seen.has(k)) { seen.add(k); out.push(l); } }
    } catch (e) { console.warn(e); }
  }
  return out.join('\n');
}
async function videoFrames(file, n) {
  const url = URL.createObjectURL(file);
  const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'auto'; v.src = url;
  try {
    await new Promise((res, rej) => { v.onloadeddata = res; v.onerror = () => rej(new Error('Video nicht lesbar')); setTimeout(res, 8000); v.load(); });
    const dur = isFinite(v.duration) ? v.duration : 30; const out = [];
    const c = document.createElement('canvas');
    for (let k = 0; k < n; k++) {
      const t = Math.min(dur - 0.1, dur * (k + 0.5) / n);
      await new Promise(res => { const done = () => { v.removeEventListener('seeked', done); res(); }; v.addEventListener('seeked', done); v.currentTime = t; setTimeout(done, 4000); });
      const w = v.videoWidth, hh = v.videoHeight; if (!w) continue;
      const s = Math.min(1, 1280 / Math.max(w, hh)); c.width = Math.round(w * s); c.height = Math.round(hh * s);
      c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
      const b = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.85)); if (b) out.push(b);
    }
    return out;
  } finally { URL.revokeObjectURL(url); }
}

/* ============ Spracherkennung (Whisper im Browser) ============ */
let asrPromise = null;
async function getAsr(onProg) {
  if (asrPromise) return asrPromise;
  asrPromise = (async () => {
    const T = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2/dist/transformers.min.js');
    const env = T.env;
    env.allowRemoteModels = false; env.allowLocalModels = true;
    env.localModelPath = 'models/';
    env.useWasmCache = false;
    env.backends.onnx.wasm.wasmPaths = { mjs: new URL('ort/ort-wasm-simd-threaded.mjs', location.href).href, wasm: new URL('ort/ort-wasm-simd-threaded.wasm', location.href).href };
    env.backends.onnx.wasm.numThreads = 1;
    const SPLIT = { 'encoder_model_quantized.onnx': 2, 'decoder_model_merged_quantized.onnx': 3 };
    const baseFetch = env.fetch || fetch;
    env.fetch = async (url, init) => {
      const u = String(url).split('?')[0]; const f = Object.keys(SPLIT).find(k => u.endsWith('/' + k));
      if (!f) return baseFetch(url, init);
      const parts = [];
      for (let i = 0; i < SPLIT[f]; i++) { const r = await baseFetch(u + '.p' + i + '.bin'); if (!r.ok) return r; parts.push(await r.blob()); }
      const blob = new Blob(parts); return new Response(blob, { status: 200, headers: { 'content-length': String(blob.size), 'content-type': 'application/octet-stream' } });
    };
    const files = {};
    const mk = cache => { env.useBrowserCache = cache; return T.pipeline('automatic-speech-recognition', 'Xenova/whisper-base', { dtype: 'q8', device: 'wasm', progress_callback: p => { if (p.status === 'progress' && p.total) { files[p.file] = [p.loaded, p.total]; let a = 0, b = 0; for (const k in files) { a += files[k][0]; b += files[k][1]; } onProg && onProg('Lade Spracherkennung, einmalig ca. 80 MB …', a / b); } } }); };
    try { return await mk(true); } catch (e) { console.warn('mit Cache fehlgeschlagen, ohne Cache', e); return await mk(false); }
  })();
  asrPromise.catch(() => { asrPromise = null; });
  return asrPromise;
}
async function decodeAudio16k(file) {
  const buf = await file.arrayBuffer();
  const AC = window.AudioContext || window.webkitAudioContext; const ac = new AC();
  let audio;
  try { audio = await new Promise((res, rej) => { const p = ac.decodeAudioData(buf, res, rej); if (p && p.then) p.then(res, rej); }); } finally { try { ac.close(); } catch (e) { } }
  const len = Math.min(audio.duration, 600);
  const off = new OfflineAudioContext(1, Math.ceil(len * 16000), 16000);
  const src = off.createBufferSource(); src.buffer = audio; src.connect(off.destination); src.start(0, 0, len);
  const r = await off.startRendering(); return r.getChannelData(0);
}
window.transcribeVideo = async (file, onProg) => {
  onProg && onProg('Lese Tonspur …');
  const pcm = await decodeAudio16k(file);
  let peak = 0; for (let i = 0; i < pcm.length; i += 160) peak = Math.max(peak, Math.abs(pcm[i]));
  if (peak < 0.01) return '';
  const asr = await getAsr(onProg);
  const secs = pcm.length / 16000;
  onProg && onProg('Schreibe Gesprochenes mit …');
  const opt = { language: 'german', task: 'transcribe', chunk_length_s: 30, stride_length_s: 5, no_repeat_ngram_size: 3, repetition_penalty: 1.15, max_new_tokens: 220 };
  let text = ((await asr(pcm, opt)) || {}).text || '';
  if (text.trim().split(/\s+/).length < secs / 4) {
    const padded = new Float32Array(pcm.length + 8000); padded.set(pcm, 8000);
    const t2 = ((await asr(padded, opt)) || {}).text || '';
    if (t2.trim().length > text.trim().length) text = t2;
  }
  return text.trim();
};

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { });
init();
