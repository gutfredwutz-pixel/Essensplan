'use strict';
/* ============ Hilfsfunktionen ============ */
// Länge der Nährwert-Listen (Reihenfolge siehe nutrition.js / dev/bls_build.py). Alte gespeicherte Listen haben 24 Werte und werden mit fullV ergänzt.
const NV = 49;
const VKEY = v => v.slice(0, 24).map(x => Math.round((+x || 0) * 1000)).join(',');
let FULLV = null, BLSNAME = null;
function fullIdx() {
  if (FULLV) return FULLV; FULLV = new Map();
  for (const v of Object.values(window.NUTRI || {})) FULLV.set(VKEY(v), v);
  for (const f of window.DIARY_FOODS || []) FULLV.set(VKEY(f[4]), f[4]);
  for (const g of window.VARIANTS || []) for (const o of g.o) FULLV.set(VKEY(o[1]), o[1]);
  return FULLV;
}
function fullV(v, src) {
  if (!v || v.length >= NV) return v;
  const w = fullIdx().get(VKEY(v)) || (BLSNAME && src && BLSNAME.get(src));
  return w && w.length >= NV ? v.slice(0, 24).concat(w.slice(24)) : v;
}
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
  set: `<svg viewBox="0 0 64 64"><defs><linearGradient id="gs" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3E6BFF"/><stop offset="1" stop-color="#FF8DBA"/></linearGradient></defs><path d="M32 2C50 2 62 15 62 33 61 50 49 62 31 62 13 61 2 49 2 31 3 14 15 2 32 2Z" fill="url(#gs)"/><circle cx="24" cy="24" r="6" fill="#fff"/><rect x="34" y="21" width="16" height="6" rx="3" fill="#fff" opacity=".8"/><circle cx="40" cy="40" r="6" fill="#fff"/><rect x="14" y="37" width="16" height="6" rx="3" fill="#fff" opacity=".8"/></svg>`,
  nutri: `<svg viewBox="0 0 64 64"><defs><linearGradient id="gn" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3E6BFF"/><stop offset="1" stop-color="#FF8DBA"/></linearGradient></defs><path d="M31 2C49 1 63 15 62 33 61 50 48 63 30 62 13 61 1 48 2 30 3 14 15 3 31 2Z" fill="url(#gn)"/><rect x="25" y="13" width="14" height="6" rx="2.5" fill="#fff"/><path d="M24 21h16c0 3 9 8 9 19 0 9-7 14-17 14S15 49 15 40c0-11 9-16 9-19z" fill="#fff"/><path d="M17.5 39c5-3 10-3 14 0s9 3 14 0c0 8-6 12-13.5 12S17.5 47 17.5 39z" fill="#9FE3C4"/></svg>`,
  cal: `<svg viewBox="0 0 64 64"><defs><linearGradient id="ga" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2F6BFF"/><stop offset="1" stop-color="#FF5FA2"/></linearGradient></defs><path d="M32 2C50 1 63 14 62 32 61 50 50 63 31 62 13 61 1 49 2 31 3 14 15 3 32 2Z" fill="url(#ga)"/><path d="M40 10l-8 24M47 13l-11 22" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><g fill="none" stroke-linecap="round" stroke-width="3"><path d="M19 36c1-7 6-10 10-7s-1 7-3 5 3-7 9-6 8 6 6 9" stroke="#FFD66B"/><path d="M26 36c3-5 9-6 13-3s3 4 6 3" stroke="#FFC23D"/></g><circle cx="27" cy="30" r="2.4" fill="#E8473E"/><circle cx="38" cy="31" r="2" fill="#E8473E"/><path d="M13 36h38c0 9-8 16-19 16S13 45 13 36z" fill="#fff"/><path d="M18 40c1 5 6 8 12 9" stroke="#FFD1E3" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg>`,
  list: `<svg viewBox="0 0 64 64"><defs><linearGradient id="gb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5B8CFF"/><stop offset="1" stop-color="#FF8DBA"/></linearGradient></defs><path d="M30 2C48 0 63 13 62 31 62 49 49 63 31 62 14 62 1 50 2 32 2 15 13 4 30 2Z" fill="url(#gb)"/><path d="M28 21c-1-5 2-9 6-10" stroke="#3FA34D" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M33 13c4-3 8-2 9 0-3 3-7 3-9 0z" fill="#5DBB63"/><path d="M22 26c-2-6 1-11 5-12l3 12z" fill="#FF9F43"/><path d="M38 26c0-5 3-9 7-9 3 2 3 6 1 9z" fill="#E8473E"/><path d="M15 26h34l-3 22c-1 3-3 5-6 5H24c-3 0-5-2-6-5z" fill="#fff"/><path d="M23 33v12M32 33v12M41 33v12" stroke="#DDE6FF" stroke-width="2.6" stroke-linecap="round"/></svg>`,
  rec: `<svg viewBox="0 0 64 64"><defs><linearGradient id="gc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2F6BFF"/><stop offset="1" stop-color="#FF8DBA"/></linearGradient></defs><path d="M33 2C51 3 63 15 62 33 61 51 48 63 30 62 12 61 1 48 2 30 3 13 16 1 33 2Z" fill="url(#gc)"/><path d="M12 20c7-3 14-3 20 2v26c-6-5-13-5-20-2z" fill="#fff"/><path d="M52 20c-7-3-14-3-20 2v26c6-5 13-5 20-2z" fill="#F4F7FF"/><path d="M17 27c3-1 7-1 10 1M17 33c3-1 7-1 10 1M17 39c3-1 7-1 10 1" stroke="#C9D6FF" stroke-width="2" stroke-linecap="round"/><path d="M37 27c3-1 7-1 10 1M37 33c3-1 7-1 10 1" stroke="#FFC2DA" stroke-width="2" stroke-linecap="round"/><circle cx="44" cy="41" r="4" fill="#FFC23D"/></svg>`
};
const TITLES = { start: '', stat: 'Statistik', nutri: 'Nährstoffe', list: 'Einkaufsliste', cal: 'Essen', rec: 'Essen', todo: 'To-dos', news: 'News', set: 'Einstellungen' };
window.FA = window.FA || {};
window.FA['jar'] = [512, 512, 'M176 32h160c13 0 24 11 24 24v24c0 9-5 17-13 21 66 28 109 88 109 159 0 107-74 220-200 220S56 367 56 260c0-71 43-131 109-159-8-4-13-12-13-21V56c0-13 11-24 24-24zm-48 248c0 78 52 168 128 168s128-90 128-168c0-6 0-12-1-18-33 18-75 18-110 2-38-17-80-16-144 2z'];

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
let items = [], plan = [], recipes = [], known = new Map(), profiles = {}, diary = {};
let todos = [], goals = [], sleeps = [], trainings = [], pushes = null; const PAGES = {}; // Seiten aus start.js
let tab = 'start', view = 'week', anchor = (() => { const t = dayOnly(new Date()); try { return localStorage.getItem('ep_weekstart') === 'mo' ? new Date(t.getFullYear(), t.getMonth(), t.getDate() - ((t.getDay() + 6) % 7)) : t; } catch (e) { return t; } })(), monthAnchor = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
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
function dot(name) { return name && name !== me() ? h('span', { class: 'pdot', style: `background:${colorOf(name)}`, title: name }) : null; }

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
  sub('todos', v => todos = v); sub('goals', v => goals = v); sub('sleep', v => sleeps = v); sub('training', v => trainings = v); sub('pantry', v => pantry = v); sub('foods', v => myFoods = v);
  db.collection('push').onSnapshot(snap => { const first = pushes === null; pushes = snap.docs.map(x => ({ id: x.id, ...x.data() })); if (first) pushSync(); });
  db.collection('known').onSnapshot(snap => { known = new Map(snap.docs.map(x => [x.id, x.data()])); });
  db.collection('settings').onSnapshot(snap => { const d = snap.docs.find(x => x.id === 'household'); hhSet = d ? d.data() : {}; if (tab === 'set') render(); });
  db.collection('profiles').onSnapshot(snap => { profiles = Object.fromEntries(snap.docs.map(x => [x.id, x.data()])); });
  db.collection('diary').onSnapshot(snap => { diary = Object.fromEntries(snap.docs.map(x => [x.id, x.data()])); });
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
function isDark() { return true; } // neues Design: vorerst nur dunkel
function barColor(off) { const m = document.querySelector('meta[name=theme-color]'); if (!m) return; const d = isDark(), dim = !off && $('#ov') && $('#ov').classList.contains('on'); const col = d ? (dim ? '#000000' : '#000000') : (dim ? '#C4CFE4' : '#E8F0FF'); m.content = col; document.documentElement.style.backgroundColor = col; }
function applyTheme() { const d = isDark(); document.documentElement.classList.toggle('dark', d); barColor(); }
// Hintergrund festhalten, solange ein Blatt offen ist
let lockY = null;
function lockBody(on) {
  const b = document.body;
  if (on && lockY == null) { lockY = window.scrollY; Object.assign(b.style, { position: 'fixed', top: -lockY + 'px', left: '0', right: '0', overflow: 'hidden' }); }
  else if (!on && lockY != null) { Object.assign(b.style, { position: '', top: '', left: '', right: '', overflow: '' }); window.scrollTo(0, lockY); lockY = null; }
}
try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme); } catch (e) { }
function weekAnchor() { const t = dayOnly(new Date()); return LS.get('ep_weekstart') === 'mo' ? addDays(t, -((t.getDay() + 6) % 7)) : t; }
applyTheme();
function openSettings() { openTop('set'); }
function aiCard() {
  const st = h('span', { class: 'aist', text: aiState === true ? 'Verbunden' : aiState === false ? 'Aus' : 'Noch nicht geprüft' });
  const test = h('button', { class: 'btn s sm', onclick: async () => { st.textContent = 'Prüfe …'; const was = aiState; if (aiState === false && LS.get('ep_ai') !== 'off') aiState = null; const d = await aiCall('ping', {}); st.textContent = !d ? 'Nicht erreichbar' : (d.claude === false ? 'Claude-Schlüssel fehlt' : 'Verbunden') + (d.speech ? ', Sprache in der Cloud' : d.speech === false ? ', Sprache auf dem iPhone' : ''); if (!d && was !== false) aiState = null; } }, 'Prüfen');
  const sw = h('div', { class: 'seg wide' }, ...[['an', 'An'], ['off', 'Aus']].map(([k, t]) => h('button', { class: (LS.get('ep_ai') === 'off') === (k === 'off') ? 'on' : '', onclick: () => { LS.set('ep_ai', k); aiState = k === 'off' ? false : null; refreshSet(); } }, t)));
  return h('div', { class: 'setcard b' }, h('div', { class: 'settitle', text: 'KI' }), h('div', { class: 'muted setnote', text: 'Liest Rezepte aus Videos, Fotos und Sprache und versteht, was du ins Tagebuch sprichst. Ohne KI arbeitet die App mit festen Regeln.' }), sw, h('div', { class: 'row', style: 'justify-content:space-between;margin-top:12px' }, st, test));
}
function renderSettings() {
  const seg = (key, opts, def, after) => { const cur = LS.get(key) || def; return h('div', { class: 'seg wide' }, ...opts.map(([v, t]) => h('button', { class: cur === v ? 'on' : '', onclick: () => { LS.set(key, v); after && after(v); refreshSet(); } }, t))); };
  const card = (cls, title, ...kids) => h('div', { class: 'setcard ' + cls }, h('div', { class: 'settitle', text: title }), ...kids);
  const note = t => h('div', { class: 'muted setnote', text: t });
  const who = me() || personNames()[0];
  // Nie auf die Liste
  const never = hhSet.never || [];
  const saveNever = list => db && db.collection('settings').doc('household').set({ ...hhSet, never: list }).catch(showErr);
  const nin = h('input', { class: 'inp', placeholder: 'z. B. Zucker', autocomplete: 'off', enterkeyhint: 'done' });
  const addNever = () => { const v = cap(nin.value.trim()); if (!v || never.some(x => norm(x) === norm(v))) { nin.value = ''; return; } hhSet = { ...hhSet, never: [...never, v] }; saveNever(hhSet.never); refreshSet(); };
  nin.addEventListener('keydown', e => { if (e.key === 'Enter') addNever(); });
  // Spracherkennung
  const asrBtn = h('button', { class: 'btn s', style: 'width:100%' }, LS.get('ep_asr') ? 'Ist auf diesem Handy geladen' : 'Jetzt laden (einmalig ca. 80 MB)');
  const asrProg = h('div', { class: 'muted setnote hidden' });
  asrBtn.addEventListener('click', async () => {
    asrBtn.disabled = true; asrProg.classList.remove('hidden');
    try { await getAsr((m, fr) => { asrProg.textContent = fr != null ? `Lädt … ${Math.round(fr * 100)} %` : m; }); LS.set('ep_asr', '1'); asrProg.textContent = 'Fertig, Diktieren geht jetzt auch ohne Internet.'; asrBtn.textContent = 'Ist auf diesem Handy geladen'; }
    catch (e) { asrProg.textContent = 'Laden hat nicht geklappt, bitte später im WLAN nochmal versuchen.'; asrBtn.disabled = false; }
  });
  const nv = never.length + 4, ws = LS.get('ep_weekstart') === 'mo' ? 'Am Montag' : 'Mit heute', sp = { ask: 'Nachfragen', all: 'Immer', none: 'Nie' }[LS.get('ep_spices') || 'ask'];
  const ENTRIES = [
    ['Meine Angaben', profiles[who] ? '' : 'Fehlt noch', () => [note(profiles[who] ? 'Körper, Alltag, Sport, Ziel und Supplemente' : 'Noch nichts eingetragen'), h('button', { class: 'btn grad', style: 'width:100%', onclick: () => openProfileEdit(who, () => openTop('set')) }, profiles[who] ? 'Bearbeiten' : 'Angaben machen')]],
    ['Haushalt', '', null, () => { setSub = null; topSheet = null; openProfile(); }],
    ['Woche beginnt', ws, () => [seg('ep_weekstart', [['today', 'Mit heute'], ['mo', 'Am Montag']], 'today', () => { anchor = weekAnchor(); }), note('Gilt für die Essenswoche und die Nährstoffe.')]],
    ['Gewürze aus Rezepten', sp, () => [seg('ep_spices', [['ask', 'Nachfragen'], ['all', 'Immer'], ['none', 'Nie']], 'ask'), note('Ob Gewürze beim Einplanen eines Rezepts auf die Einkaufsliste kommen.')]],
    ['Nie auf die Liste', `${nv} Sachen`, () => SUBNEVER()],
    ['Mitteilungen', pushDoc() ? 'An' : '', () => pushPage(note, seg)],
    ['Meine Lebensmittel', myFoods.length ? `${myFoods.length}` : '', () => myFoodsPage(note)],
    ['KI', '', () => [aiCard()]],
    ['Spracherkennung', LS.get('ep_asr') ? 'Geladen' : '', () => [note('Fürs Diktieren und für Videos. Am besten einmal im WLAN laden, danach geht es auch offline.'), asrBtn, asrProg]]];
  const OLD_CARDS = () => [
    card('b', 'Meine Angaben', note(profiles[who] ? 'Körper, Alltag, Sport, Ziel und Supplemente' : 'Noch nichts eingetragen'),
      h('button', { class: 'btn grad', style: 'width:100%', onclick: () => openProfileEdit(who, () => openTop('set')) }, profiles[who] ? 'Bearbeiten' : 'Angaben machen')),
    card('b', 'Haushalt', note('Mitglieder, Code und Einladungslink für neue Leute.'), h('button', { class: 'btn s', style: 'width:100%', onclick: () => { topSheet = null; openProfile(); } }, 'Haushalt öffnen')),
    card('a', 'Woche beginnt', seg('ep_weekstart', [['today', 'Mit heute'], ['mo', 'Am Montag']], 'today', () => { anchor = weekAnchor(); }), note('Gilt für die Essenswoche und die Nährstoffe.')),
    card('b', 'Gewürze aus Rezepten', seg('ep_spices', [['ask', 'Nachfragen'], ['all', 'Immer'], ['none', 'Nie']], 'ask'), note('Ob Gewürze beim Einplanen eines Rezepts auf die Einkaufsliste kommen.')),
    card('a', 'Nie auf die Liste', note('Salz, Pfeffer, Öl und Wasser kommen nie aus Rezepten auf die Liste. Hier könnt ihr weitere Sachen ergänzen, die ihr immer daheim habt.'),
      never.length ? h('div', { class: 'tagbox', style: 'justify-content:center;margin-bottom:10px' }, ...never.map(x => h('button', { class: 'pill addp', onclick: () => { hhSet = { ...hhSet, never: never.filter(y => y !== x) }; saveNever(hhSet.never); refreshSet(); } }, x + '  ×'))) : null,
      h('div', { class: 'row', style: 'gap:8px' }, nin, h('button', { class: 'ib p', 'aria-label': 'Hinzufügen', onclick: addNever }, ic('plus')))),
    aiCard(),
    card('b', 'Spracherkennung', note('Fürs Diktieren und für Videos. Am besten einmal im WLAN laden, danach geht es auch offline.'), asrBtn, asrProg),
    ];
  const SUBNEVER = () => { const c = OLD_CARDS()[4]; c.querySelector('.settitle')?.remove(); return [c]; };
  const cur = setSub && ENTRIES.find(e => e[0] === setSub);
  if (cur && cur[2]) return h('div', { class: 'setpage setsub' }, ...cur[2]());
  return h('div', { class: 'setpage' },
    h('div', { class: 'ln setmenu' }, ...ENTRIES.map(([t, v, f, act]) => h('div', { class: 'lr tap', onclick: act || (() => { setSub = t; openTop('set'); }) }, h('span', { class: 'tx', text: t }), v ? h('span', { class: 'n', text: v }) : null, h('span', { class: 'chev', text: '›' })))),
    h('div', { class: 'setfoot' }, h('div', { class: 'greytxt', text: 'Nährwerte: Bundeslebensmittelschlüssel (BLS) 4.0, Max Rubner-Institut. Markenprodukte: Open Food Facts. Alle Werte sind Schätzungen und ersetzen keine Ernährungsberatung.' })));
}
function openProfile() {
  if (!household) return;
  const m = me(), col = colorOf(m);
  const copyText = (t, msg) => (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast(msg), () => toast('Kopieren nicht möglich'));
  const members = (people.length ? people : PRESET).map(p => h('div', { class: 'mem' }, h('span', { class: 'av', style: `background:${p.color}`, text: p.name[0] }), h('span', { text: p.name })));
  openSheet('', [
    h('div', { class: 'prof' },
      h('div', { class: 'profblob', style: `--pc:${col}` }, h('span', { text: (m || '?')[0] })),
      h('div', { class: 'profname', text: m || 'Unbekannt' }),
      h('button', { class: 'btn g sm', onclick: () => { closeSheet(); showWho(); } }, 'Person wechseln')),
    h('div', { class: 'setcard b' },
      h('div', { class: 'settitle', text: 'Haushalt' }),
      h('div', { class: 'members' }, members),
      h('div', { class: 'codebox big', text: household.code }),
      h('div', { class: 'twobtn' },
        h('button', { class: 'btn s', onclick: () => copyText(household.code, 'Code kopiert') }, 'Code kopieren'),
        h('button', { class: 'btn r', onclick: () => copyText(makeInvite(), 'Einladungslink kopiert') }, 'Einladungslink'))),
    h('div', { class: 'setfoot' },
      confirmBtn('Haushalt verlassen', 'Wirklich verlassen?', () => { LS.del('ep_household'); location.reload(); }, 'btn g sm'))]);
}

/* ============ Kategorien: Supermarkt-Reihenfolge und Farben ============ */
const CAT_ORDER = ['Obst & Gemüse', 'Brot & Backwaren', 'Milch & Eier', 'Fleisch & Fisch', 'Vegetarisch & Vegan', 'Nudeln, Reis & Getreide', 'Backen & Süßes', 'Snacks', 'Konserven & Saucen', 'Gewürze & Öle', 'Getränke', 'Tiefkühl', 'Drogerie & Haushalt', 'Sonstiges'];
const CAT_STYLE = {
  'Obst & Gemüse': ['#E6F4E8', '#2F8A4A'], 'Brot & Backwaren': ['#FBF1DC', '#A87A1E'], 'Milch & Eier': ['#E5EFFC', '#3D74C4'],
  'Fleisch & Fisch': ['#FCE5E5', '#C84646'], 'Vegetarisch & Vegan': ['#F2E8DE', '#8C5E3C'], 'Nudeln, Reis & Getreide': ['#FFF4D6', '#B58A0C'],
  'Backen & Süßes': ['#FDECF3', '#C2557F'], 'Snacks': ['#FFEFDB', '#C27A1A'], 'Konserven & Saucen': ['#FBE8E0', '#B9583A'],
  'Gewürze & Öle': ['#FFEBD6', '#D9771F'], 'Getränke': ['#ECE8FB', '#6E58C9'], 'Tiefkühl': ['#E1F3F7', '#24869C'],
  'Drogerie & Haushalt': ['#EEF0F4', '#677086'], 'Sonstiges': ['#EEF0F4', '#677086']
};
CATS.splice(0, CATS.length, ...CAT_ORDER);
function catStyle(c) { return CAT_STYLE[c] || CAT_STYLE['Sonstiges']; }

/* ============ Salz, Pfeffer, Öl und Gewürze ============ */
const NEVER = new Set(['salz', 'meersalz', 'pfeffer', 'schwarzer pfeffer', 'salz und pfeffer', 'salz pfeffer', 'olivenol', 'natives olivenol', 'rapsol', 'sonnenblumenol', 'bratol', 'ol', 'speiseol', 'pflanzenol', 'wasser', 'leitungswasser']);
let hhSet = {};
function isNever(name) { const k = norm(name); return NEVER.has(k) || NEVER.has(canon(name)) || (hhSet.never || []).some(x => norm(x) === k || canon(x) === canon(name)); }
function isSpice(name) { return !isNever(name) && catOf(canonName(name)) === 'Gewürze & Öle'; }

/* ============ Mengen und Nährwerte ============ */
const NUT_KEYS = ['kcal', 'prot', 'fett', 'kh', 'fib', 'zucker', 'sfa', 'salz', 'vitA', 'vitD', 'vitE', 'b1', 'b2', 'b6', 'fol', 'b12', 'vitC', 'kalium', 'calcium', 'magnesium', 'eisen', 'zink', 'jod', 'omega3'];
const PIECE = { zwiebeln: 100, 'rote zwiebeln': 100, schalotten: 30, karotten: 80, kartoffeln: 120, 'festkochende kartoffeln': 120, 'mehligkochende kartoffeln': 120, susskartoffeln: 250, tomaten: 100, cherrytomaten: 15, paprika: 160, 'paprika rot': 160, 'paprika gelb': 160, 'paprika grun': 160, spitzpaprika: 120, zucchini: 250, aubergine: 300, gurke: 400, knoblauch: 4, eier: 60, apfel: 150, bananen: 120, birnen: 160, orangen: 180, zitronen: 100, limetten: 60, avocado: 170, brokkoli: 450, blumenkohl: 800, lauch: 200, porree: 200, fruhlingszwiebeln: 20, champignons: 20, mozzarella: 125, burrata: 125, chili: 10, peperoni: 10, ingwer: 20, kohlrabi: 300, fenchel: 250, hokkaido: 1000, kurbis: 1000, mango: 300, ananas: 900, brotchen: 60, wraps: 60, tortillas: 60, baguette: 250, 'rote bete': 150, staudensellerie: 40, knollensellerie: 500, pastinaken: 150, maiskolben: 250, hahnchenbrust: 150, hahnchenschenkel: 250, schnitzel: 150, bratwurst: 100, wurstchen: 50 };
const PACK = { mozzarella: 125, burrata: 125, sahne: 200, schlagsahne: 200, kochsahne: 200, 'creme fraiche': 150, schmand: 200, 'saure sahne': 200, feta: 200, nudeln: 500, spaghetti: 500, lasagneplatten: 250, blatterteig: 275, hefe: 42, 'frische hefe': 42, trockenhefe: 7, backpulver: 15, vanillezucker: 8, speckwurfel: 125, butter: 250, frischkase: 200, tofu: 200, quark: 250, magerquark: 250, mascarpone: 250, ricotta: 250, parmesan: 100, 'geriebener kase': 200, reibekase: 200, gnocchi: 500, tortellini: 250, spinat: 450, 'tk-spinat': 450, 'tk-erbsen': 450, erbsen: 450 };
const CAN = { 'gehackte tomaten': 400, pizzatomaten: 400, 'geschalte tomaten': 400, kokosmilch: 400, kidneybohnen: 240, 'weisse bohnen': 240, 'schwarze bohnen': 240, kichererbsen: 240, 'kichererbsen dose': 240, 'mais dose': 140, mais: 140, 'thunfisch dose': 150, thunfisch: 150 };
const NUMW2 = { ein: 1, eine: 1, einen: 1, zwei: 2, drei: 3, vier: 4, 'fünf': 5, funf: 5, sechs: 6, halbe: 0.5, halber: 0.5, '½': 0.5, '¼': 0.25, '¾': 0.75 };
function parseAmount(a) {
  let s = (a || '').trim().toLowerCase().replace(',', '.'); if (!s) return null;
  let num = null, m;
  if ((m = s.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+)/))) { num = +m[1] / +m[2]; s = s.slice(m[0].length); }
  else if ((m = s.match(/^(\d+(?:\.\d+)?)(?:\s*-\s*(\d+(?:\.\d+)?))?/))) { num = m[2] ? (+m[1] + +m[2]) / 2 : +m[1]; s = s.slice(m[0].length); }
  else if ((m = s.match(/^(\S+)/)) && NUMW2[m[1]] != null) { num = NUMW2[m[1]]; s = s.slice(m[0].length); }
  if (num == null) return null;
  return { num, unit: s.trim().replace(/\.$/, '') };
}
function gramsOf(name, amount) {
  const p = parseAmount(amount); if (!p) return null;
  const k = canon(name), u = p.unit;
  const f = (x) => x * p.num;
  if (/^(g|gr|gramm)$/.test(u)) return f(1);
  if (/^(kg|kilo)/.test(u)) return f(1000);
  if (/^(ml|milliliter)$/.test(u)) return f(1);
  if (/^cl$/.test(u)) return f(10);
  if (/^dl$/.test(u)) return f(100);
  if (/^(l|liter)$/.test(u)) return f(1000);
  if (/^(el|essl)/.test(u)) return f(12);
  if (/^(tl|teel)/.test(u)) return f(4);
  if (/^prise/.test(u)) return f(0.5);
  if (/^(zehe|zehen)/.test(u)) return f(4);
  if (/^(dose|dosen)/.test(u)) return f(CAN[k] || 400);
  if (/^(packung|packungen|pck|pkg|päckchen|beutel)/.test(u)) return f(PACK[k] || 250);
  if (/^(becher)/.test(u)) return f(PACK[k] || 200);
  if (/^(glas|gläser)/.test(u)) return f(300);
  if (/^(bund)/.test(u)) return f(k === 'fruhlingszwiebeln' || k === 'radieschen' ? 150 : 30);
  if (/^(scheibe|scheiben)/.test(u)) return f(25);
  if (/^(handvoll)/.test(u)) return f(30);
  if (/^(tasse|tassen)/.test(u)) return f(150);
  if (/^(stück|stuck|stk|kopf|knolle|knollen|stange|stangen|zweig|zweige|blatt|blätter)?$/.test(u)) return PIECE[k] ? f(PIECE[k]) : null;
  return null;
}
let VAR = null;
function variantOf(name) { if (!VAR) VAR = (window.VARIANTS || []).map(v => ({ ...v, rx: new RegExp(v.re) })); const k = norm(name || ''); if (!k || /vegan|veggie|vegetar|soja|tofu/.test(k)) return null; return VAR.find(v => v.rx.test(k)) || null; }
function varVec(name, label) { const v = variantOf(name); if (!v || !label) return null; const o = v.o.find(x => x[0] === label); return o || null; }
function varRow(name, cur, onPick) {
  const v = variantOf(name); if (!v) return null;
  return h('div', { class: 'varrow' }, h('span', { class: 'varl', text: v.t }), ...v.o.map(([l]) => h('button', { class: 'varb' + (cur === l ? ' on' : ''), onclick: () => onPick(l) }, l)));
}
function nutOf(g) {
  if (g.product && g.product.v) return g.product.v;
  if (g.variant) { const o = varVec(g.name, g.variant); if (o) return o[1]; }
  const v = window.NUTRI && (window.NUTRI[canon(g.name)] || window.NUTRI[norm(g.name)] || window.NUTRI[norm(canonName(g.name))]);
  return v || null;
}
function recipeNutrition(r) {
  const tot = new Array(NV).fill(0); const unknown = []; const parts = [];
  for (const g of (r.ingredients || [])) {
    if (!g.name) continue;
    const v = fullV(nutOf(g), g.product && g.product.name), gr = gramsOf(g.name, g.amount);
    if (v && gr != null) { for (let i = 0; i < NV; i++) tot[i] += (v[i] || 0) * gr / 100; parts.push({ name: g.name, v, gr }); }
    else if (!isNever(g.name) && !(isSpice(g.name) && v)) unknown.push(g.name);
    else if (isNever(g.name) && /öl|ol$/.test(norm(g.name)) && gr != null && v) { for (let i = 0; i < NV; i++) tot[i] += (v[i] || 0) * gr / 100; }
  }
  const serv = Math.max(1, parseFloat(r.servings) || 2);
  return { tot, per: tot.map(x => x / serv), serv, unknown, parts, ok: parts.length > 0 };
}
const fmtInt = n => Math.round(n).toLocaleString('de-DE');
function kcalText(r, mode) {
  const n = recipeNutrition(r); if (!n.ok) return '';
  const pre = n.unknown.length ? 'ca. ' : '';
  if (mode === 'total') return `${pre}${fmtInt(n.tot[0])} kcal`;
  if (mode === 'per') return `${pre}${fmtInt(n.per[0])} kcal pro Person`;
  return `${pre}${fmtInt(n.tot[0])} kcal / ${fmtInt(n.per[0])} pro Person`;
}
const DEFAULT_AMT = { nudeln: '250 g', spaghetti: '250 g', penne: '250 g', fusilli: '250 g', farfalle: '250 g', tagliatelle: '250 g', rigatoni: '250 g', linguine: '250 g', reis: '150 g', basmatireis: '150 g', jasminreis: '150 g', risottoreis: '200 g', kartoffeln: '600 g', susskartoffeln: '500 g', zwiebeln: '1', 'rote zwiebeln': '1', knoblauch: '2 Zehen', karotten: '2', hackfleisch: '400 g', 'gemischtes hack': '400 g', rinderhack: '400 g', hahnchenbrust: '300 g', hahnchenbrustfilet: '300 g', sahne: '200 ml', kochsahne: '200 ml', schlagsahne: '200 ml', milch: '200 ml', butter: '20 g', 'geriebener kase': '100 g', reibekase: '100 g', parmesan: '40 g', mozzarella: '1 Packung', 'gehackte tomaten': '1 Dose', 'passierte tomaten': '500 g', tomatenmark: '2 EL', eier: '2', mehl: '100 g', zucker: '1 EL', tomaten: '3', paprika: '1', zucchini: '1', champignons: '250 g', spinat: '200 g', brokkoli: '1', lauch: '1', kokosmilch: '1 Dose', gemusebruhe: '500 ml', lasagneplatten: '250 g', feta: '200 g', zitronen: '1', limetten: '1', petersilie: '1 Bund', basilikum: '1 Bund', schmand: '1 Becher', 'creme fraiche': '1 Becher', 'saure sahne': '1 Becher', kidneybohnen: '1 Dose', kichererbsen: '1 Dose', 'rote linsen': '150 g', linsen: '150 g', gnocchi: '500 g', tortellini: '250 g', lachs: '250 g', lachsfilet: '250 g', tofu: '200 g', speckwurfel: '100 g', honig: '1 EL', sojasauce: '2 EL', ingwer: '1 Stück', chili: '1', fruhlingszwiebeln: '3', erbsen: '150 g', mais: '1 Dose' };
function suggestAmt(name) { const k = canon(name); if (DEFAULT_AMT[k]) return DEFAULT_AMT[k]; if (isSpice(name)) return '1 TL'; return ''; }

/* ============ Hilfen für Rezepte ============ */
const PLANT_MILK = /hafer|soja|mandel|kokos|reis|vegan|pflanz/;
function autoTags(r) {
  const ings = (r.ingredients || []).filter(g => g.name);
  if (!ings.length) return [];
  const cats = ings.map(g => ({ c: catOf(canonName(g.name)), n: norm(g.name) }));
  const tags = [];
  const meat = cats.some(x => x.c === 'Fleisch & Fisch') || cats.some(x => /speck|schinken|hack(?!.*vegan)|wurst|salami|bacon|gelatine|sardell|fond/.test(x.n) && !/vegan|veggie|vegetar/.test(x.n));
  if (!meat) {
    tags.push('Vegetarisch');
    const animal = cats.some(x => (x.c === 'Milch & Eier' && !PLANT_MILK.test(x.n)) || /honig|butter|ei$|eier|parmesan|kase|sahne|joghurt|quark/.test(x.n) && !PLANT_MILK.test(x.n));
    if (!animal) tags.push('Vegan');
  }
  const keys = ings.map(g => canon(g.name) + ' ' + norm(g.name));
  const has = re => keys.some(k => re.test(k));
  const FISH = /lachs|thunfisch|garnele|kabeljau|seelachs|forelle|zander|dorade|wolfsbarsch|hering|makrele|sardine|sardelle|tintenfisch|calamari|muschel|fischstabchen|scholle|seehecht|rotbarsch|matjes|surimi/;
  const meatCat = cats.some((x, i) => x.c === 'Fleisch & Fisch' && !FISH.test(keys[i]));
  if (meatCat || has(/speck|schinken|bacon|salami|chorizo|wurst|hackfleisch|rinderhack|gemischtes hack/) && !has(/vegan|veggie|vegetar/)) tags.push('Fleischgerichte');
  if (has(FISH)) tags.push('Fisch');
  const PASTA = /nudel|spaghetti|penne|fusilli|farfalle|tagliatelle|pappardelle|fettuccine|rigatoni|linguine|maccheroni|orecchiette|conchiglie|orzo|lasagne|cannelloni|tortellini|ravioli/;
  if (has(PASTA)) tags.push('Pasta');
  if (has(PASTA) && !has(/sojasauce|reisnudel|glasnudel|mie|udon|soba|ramen/) || has(/parmesan|mozzarella|burrata|pesto|ricotta|mascarpone|pancetta|guanciale|risottoreis|polenta|pecorino|grana padano/)) tags.push('Italienisch');
  if (has(/sojasauce|currypaste|kokosmilch|reisnudel|glasnudel|mie nudel|udon|soba|ramen|pak choi|sesamol|fischsauce|hoisin|austernsauce|teriyaki|sriracha|jasminreis|sushireis|edamame|zitronengras|reispapier/)) tags.push('Asiatisch');
  const n = recipeNutrition(r);
  if (n.ok && !n.unknown.length && n.tot[0] > 0 && (n.tot[1] * 4) / n.tot[0] >= 0.25) tags.push('Proteinreich');
  return tags;
}
const USER_TAGS = ['Italienisch', 'Asiatisch', 'Schnell'];
function lastCooked(r) { const today = ymd(new Date()); let last = ''; for (const p of plan) if (p.recipeId === r.id && p.date <= today && p.date > last) last = p.date; return last; }
function grey(text) { return h('div', { class: 'greytxt', text }); }

/* ============ Kopf & Tabs ============ */
function renderHead() {
  const a = $('#art'); a.replaceChildren(); if (ART[tab]) a.append(svgEl(ART[tab])); $('#title').textContent = tab === 'start' && window.startTitle ? startTitle() : TITLES[tab] || ''; renderFoodSeg(); const kk = $('#kicker'); if (kk) { const n = statRange === 'day' ? 1 : statRange === 'week' ? 7 : statRange === 'month' ? 30 : 365; kk.textContent = tab === 'stat' ? (n === 1 ? longDate(ymd(addDays(new Date(), -statDay))) : n === 365 ? 'Letzte 12 Monate' : `Letzte ${n} Tage`) : longDate(ymd(new Date())); }
  const w = $('#who'); const m = me(); w.classList.toggle('hidden', !household); w.style.background = colorOf(m); w.textContent = (m || '?')[0];
  const gr = $('#gear'); if (gr && !gr.firstChild) gr.append(ic('gear')); if (gr) gr.classList.toggle('hidden', !household || tab !== 'start');
  const ct = $('#cart'); if (ct) { if (!ct.firstChild) ct.append(svgEl('<svg class="ti" viewBox="0 0 24 24"><path d="M3 4h2.2l2.3 10.5a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 8H6.3"/><circle cx="9.5" cy="19" r="1.3"/><circle cx="16.5" cy="19" r="1.3"/></svg>')); ct.classList.toggle('hidden', !FOOD.includes(tab)); ct.classList.toggle('on', tab === 'list'); }
  document.body.dataset.tab = tab;
}
function renderTabs() {
  const t = $('#tabs');
  if (!t._built) {
    t._built = true; t.replaceChildren();
    const go = id => () => goTab(id, TABS().indexOf(tab) < 0 ? (tab === 'nutri' ? -1 : 1) : TABS().indexOf(id) - TABS().indexOf(tab));
    t.append(h('span', { class: 'tind' }), ...TAB_DEF.map(([id, label, path]) => h('button', { 'data-t': id, 'aria-label': label, onclick: () => goTab(id === 'food' ? foodSub : id, TABS().indexOf(id === 'food' ? foodSub : id) - TABS().indexOf(tab)) }, svgEl(`<svg class="ti" viewBox="0 0 24 24"><path d="${path}"/></svg>`), h('span', { text: label }))));
  }
  if (FOOD.includes(tab)) foodSub = tab;
  t.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.t === (FOOD.includes(tab) ? 'food' : tab === 'nutri' ? 'stat' : tab)));
  tabInd(TABS().indexOf(tab), 0, true);
  renderHead();
}
// Gleitender Kreis in der Tab-Leiste; folgt beim Wischen dem Finger
function tabInd(i, prog, anim) {
  const t = $('#tabs'), ind = t && t.querySelector('.tind'); if (!ind) return;
  const bs = [...t.querySelectorAll('button')]; if (i < 0 || !bs[i]) { ind.style.opacity = '0'; return; }
  const cx = k => bs[k].offsetLeft + bs[k].offsetWidth / 2;
  const j = Math.max(0, Math.min(bs.length - 1, i + Math.sign(prog))), p = Math.min(1, Math.abs(prog));
  const x = cx(i) + (cx(j) - cx(i)) * p;
  ind.style.transition = anim ? 'transform .34s cubic-bezier(.3,.8,.3,1.1), opacity .2s' : 'none';
  ind.style.opacity = '1'; ind.style.transform = `translate3d(${Math.round(x - 26)}px,-50%,0)`;
  bs.forEach((b, k) => b.classList.toggle('near', k === (p > 0.5 ? j : i)));
}
let listUI = null, recUI = null;
const FOOD = ['list', 'cal', 'rec', 'pan']; let foodSub = 'cal', statRange = 'week', statDay = 0;
const TABS = () => ['start', 'stat', foodSub, 'todo', 'news'];
const TAB_DEF = [
  ['start', 'Start', 'M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z'],
  ['stat', 'Statistik', 'M5 20V13M10 20V8M15 20v-6M20 20V5'],
  ['food', 'Essen', 'M7 4v7m-2-7v4a2 2 0 0 0 4 0V4M7 11v9M16.5 4c-1.8 0-3 2.2-3 5 0 2 1.2 3 3 3v8'],
  ['todo', 'To-dos', 'm4.5 7 1.8 1.8L9.5 5.5M4.5 15.5l1.8 1.8 3.2-3.3M13 7.5h7M13 16h7'],
  ['news', 'News', 'M5 5h11v14H6a1 1 0 0 1-1-1zM16 9h3v9a1 1 0 0 1-2 0M8 9h5M8 12.5h5M8 16h3']];
// Unterteilung im Bereich Essen: Liste / Woche / Rezepte
function renderFoodSeg() {
  let f = $('#fseg'); if (!f) { f = h('div', { id: 'fseg', class: 'useg' }); $('header').append(f); }
  f.classList.toggle('hidden', (!FOOD.includes(tab) && tab !== 'stat') || tab === 'list');
  if (tab === 'stat') { f.replaceChildren(...[['week', 'Woche'], ['month', 'Monat'], ['year', 'Jahr']].map(([k, l]) => h('button', { class: k === statRange ? 'on' : '', onclick: () => { statRange = k; statDay = 0; renderHead(); render(); } }, l))); return; }
  if (!FOOD.includes(tab)) return;
  f.replaceChildren(...[['cal', 'Woche'], ['rec', 'Rezepte'], ['pan', 'Vorrat']].map(([id, l]) => h('button', { class: id === tab ? 'on' : '', onclick: () => { if (id !== tab) switchNow(id); } }, l)));
}
let topSheet = null, setSub = null;
function openTop(id) {
  topSheet = id;
  if (id === 'set') { const sc = $('#ov').classList.contains('on') ? $('#sheet').scrollTop : 0; openSheet(setSub || 'Einstellungen', [renderSettings()]); $('#sheet').scrollTop = sc; if (setSub) sheetBack = () => { setSub = null; openTop('set'); }; }
  else { resetNutriState(); nutriWho = null; nutriFn = null; nutriHome(); }
}
function refreshSet() { if (topSheet === 'set' && $('#ov').classList.contains('on')) openTop('set'); else render(); }
/* Seitenwechsel: Kopfleiste und Inhalt bilden zusammen eine Bühne (#stage), die als Ganzes gleitet */
const pageCache = {}; let nutriTarget = null;
function peekLayer() { let l = document.getElementById('peeklayer'); if (!l) { l = h('div', { id: 'peeklayer' }); document.body.appendChild(l); } return l; }
const stage = () => $('#stage');
function moveBg(x, tr) { return; const b = document.querySelector('.blobs'); if (!b) return; b.style.transition = tr || 'none'; b.style.transform = x == null ? '' : `translate3d(${x}px,0,0)`; }
function stageClone(id, node) {
  const st = stage(); const r = st.getBoundingClientRect();
  const c = st.cloneNode(true); c.removeAttribute('id'); c.classList.add('stageclone');
  c.querySelectorAll('[id]').forEach(x => { x.dataset.cid = x.id; x.removeAttribute('id'); });
  // Die Kopie soll genau wie das Original aussehen; alte CSS-Regeln greifen bei ihr sonst anders (Größe, Rahmen, Abstand oben)
  const SAME = ['font-size', 'line-height', 'font-weight', 'letter-spacing', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'box-shadow', 'background-image', 'background-color', 'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width', 'border-radius', 'color'];
  st.querySelectorAll('[id]').forEach(o => {
    const k = c.querySelector(`[data-cid="${o.id}"]`); if (!k) return; const a = getComputedStyle(o);
    const props = o.tagName === 'BUTTON' ? SAME.concat(['width', 'height']) : SAME;
    props.forEach(p => k.style.setProperty(p, a.getPropertyValue(p), 'important'));
  });
  if (id) {
    const t = c.querySelector('[data-cid=title]'); if (t) t.textContent = TITLES[id];
    const art = c.querySelector('[data-cid=art]'); if (art) art.replaceChildren(svgEl(ART[id]));
    const mm = c.querySelector('[data-cid=main]'); if (mm && node) mm.replaceChildren(node);
  }
  if (!id) { // nur das Sichtbare mitnehmen, damit das Wischen auch auf vollen Seiten flüssig bleibt
    const H = window.innerHeight + 60, orig = [...st.querySelectorAll('#main > * > *, #main > *')], cl = [...c.querySelectorAll('[data-cid=main] > * > *, [data-cid=main] > *')];
    orig.forEach((o, i) => { const b = o.getBoundingClientRect(); if ((b.top > H || b.bottom < -60) && cl[i]) cl[i].style.visibility = 'hidden'; });
    orig.forEach((o, i) => { const b = o.getBoundingClientRect(); if (b.top > H && cl[i] && cl[i].parentNode) cl[i].remove(); });
  }
  Object.assign(c.style, { position: 'fixed', left: '0', top: (id ? 0 : r.top) + 'px', width: r.width + 'px', margin: '0', pointerEvents: 'none', willChange: 'transform', transition: 'none' });
  // Der Kopf steht beim Scrollen fest; in der Kopie an dieselbe Stelle setzen
  c.querySelectorAll('header').forEach(hd => { hd.style.setProperty('position', 'relative', 'important'); if (!id && r.top < 0) { hd.style.setProperty('top', -r.top + 'px', 'important'); hd.style.setProperty('z-index', '6', 'important'); hd.style.setProperty('background', '#000', 'important'); } });
  peekLayer().appendChild(c); return c;
}
// erst raus, dann die neue Seite von der anderen Seite rein
function slideSwap(id, dir, fromX, outDur) {
  const st = stage(), W = window.innerWidth; const E = 'cubic-bezier(.22,.8,.24,1)';
  const swap = () => { if (tab === 'nutri' && window.resetNutriState) resetNutriState(); tab = id; listUI = null; recUI = null; nutriFn = null; renderTabs(); render(); window.scrollTo(0, 0); };
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { swap(); st.style.transform = ''; return Promise.resolve(); }
  const od = outDur || 0.15, id2 = 0.26;
  document.documentElement.style.setProperty('--tdur', (od + id2) + 's');
  document.body.dataset.tab = id;
  document.body.classList.add('moving');
  return new Promise(res => {
    st.style.transition = 'none'; st.style.transform = `translate3d(${fromX || 0}px,0,0)`; void st.offsetWidth;
    st.style.transition = `transform ${od}s cubic-bezier(.4,0,.8,.6)`; st.style.transform = `translate3d(${-dir * W}px,0,0)`; moveBg(-dir * W, `transform ${od}s cubic-bezier(.4,0,.8,.6)`);
    setTimeout(() => {
      st.style.transition = 'none'; swap(); st.style.transform = `translate3d(${dir * W}px,0,0)`; moveBg(dir * W); void st.offsetWidth;
      st.style.transition = `transform ${id2}s ${E}`; st.style.transform = 'translate3d(0,0,0)'; moveBg(0, `transform ${id2}s ${E}`);
      setTimeout(() => { st.style.transition = ''; st.style.transform = ''; moveBg(null); document.body.classList.remove('moving'); res(); }, id2 * 1000 + 20);
    }, od * 1000);
  });
}
// Umschalter angetippt: Seite direkt tauschen, ohne dass der ganze Bildschirm wegschiebt
function switchNow(id) { if (id === tab) return; if (tab === 'nutri' && window.resetNutriState) resetNutriState(); tab = id; document.body.dataset.tab = id; listUI = null; recUI = null; nutriFn = null; renderTabs(); render(); window.scrollTo(0, 0); }
function goTab(id, dir) { if (id === tab) return; cachePage(); slideSwap(id, dir > 0 ? 1 : -1, 0, 0.13); }
function cachePage() { const m = $('#main'); if (m && m.firstChild) { const d = h('div'); d.append(...[...m.childNodes].map(n => n.cloneNode(true))); pageCache[tab] = d; } }
function peekNode(id) {
  try {
    if (id === 'nutri') {
      if (pageCache.nutri) return pageCache.nutri.cloneNode(true);
      const d = h('div'); const f = nutriFn, w = nutriWho; nutriTarget = d; try { nutriHome(); } finally { nutriTarget = null; nutriFn = f; nutriWho = w; } return d;
    }
    const sl = listUI, sr = recUI; let n = null;
    if (PAGES[id]) n = PAGES[id](); else if (id === 'cal') n = renderCal(); else if (id === 'set') n = renderSettings(); else if (id === 'list') n = renderList(); else if (id === 'rec') n = renderRec();
    listUI = sl; recUI = sr; return n || (pageCache[id] && pageCache[id].cloneNode(true));
  } catch (err) { console.warn(err); return pageCache[id] ? pageCache[id].cloneNode(true) : null; }
}
(() => {
  let sx = 0, sy = 0, mode = 0, dx = 0, raf = 0, peeks = {}, vx = 0, lt = 0, lxp = 0, busy = false;
  const EASE = 'cubic-bezier(.22,.8,.24,1)';
  const clearPeeks = () => { Object.values(peeks).forEach(p => p && p.remove()); peeks = {}; };
  const resetStage = () => { document.body.classList.remove('moving'); const st = stage(); st.style.transition = ''; st.style.transform = ''; st.style.visibility = ''; moveBg(null); };
  const mkPeek = id => { if (!id) return null; const node = peekNode(id); return node ? stageClone(id, node) : null; };
  const place = x => {
    const W = window.innerWidth;
    if (peeks.cur) { if (mode === 1) moveBg(x); peeks.cur.style.transform = `translate3d(${x}px,0,0)`; } else stage().style.transform = `translate3d(${x}px,0,0)`;
    if (peeks.r) peeks.r.style.transform = `translate3d(${W + x}px,0,0)`;
    if (peeks.l) peeks.l.style.transform = `translate3d(${-W + x}px,0,0)`;
  };
  document.addEventListener('touchstart', e => {
    mode = 0; if (busy || TABS().indexOf(tab) < 0 || $('#ov').classList.contains('on') || document.querySelector('.cook') || e.touches.length > 1) { mode = -1; return; }
    const t = e.target; if (t.closest('.swipe,input,textarea,select,[data-no-tab-swipe],.tabs,.month')) { mode = -1; return; }
    if (Object.keys(peeks).length) { clearPeeks(); resetStage(); }
    sx = e.touches[0].clientX; sy = e.touches[0].clientY; dx = 0; vx = 0; lt = performance.now(); lxp = sx;
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (mode === -1) return; const cx = e.touches[0].clientX; dx = cx - sx; const dy = e.touches[0].clientY - sy;
    if (mode === 0) {
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        mode = 1; document.body.classList.add('swiping', 'moving'); sx += dx > 0 ? 8 : -8; dx = cx - sx; stage().style.transition = 'none';
        peeks.cur = stageClone(null); peeks.cur.style.transform = 'translate3d(0,0,0)'; stage().style.visibility = 'hidden';
      } else if (Math.abs(dy) > 10) { mode = -1; return; } else return;
    }
    if (e.cancelable) e.preventDefault();
    const now = performance.now(); if (now > lt) { vx = 0.7 * vx + 0.3 * ((cx - lxp) / (now - lt)); lt = now; lxp = cx; }
    const idx = TABS().indexOf(tab); const edge = (dx > 0 && idx === 0) || (dx < 0 && idx === TABS().length - 1);
    const x = edge ? Math.sign(dx) * Math.pow(Math.abs(dx), 0.75) : dx;
    cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { place(x); tabInd(idx, edge ? 0 : -x / (window.innerWidth * 0.55), false); });
  }, { passive: false });
  const endSwipe = () => {
    document.body.classList.remove('swiping');
    if (mode !== 1) return; mode = 0; cancelAnimationFrame(raf);
    const st = stage(), W = window.innerWidth; const idx = TABS().indexOf(tab);
    const dir = (Math.abs(vx) > 0.2 ? -Math.sign(vx) : -Math.sign(dx)) || 1;
    const id = TABS()[idx + dir];
    const go = id && (Math.abs(dx) > W * 0.12 || (Math.abs(vx) > 0.2 && Math.sign(vx) === -dir));
    const cur = peeks.cur;
    if (go && cur) {
      busy = true; cachePage(); document.body.dataset.tab = id;
      const rest = W - Math.abs(dx); const od = Math.max(0.09, Math.min(0.15, rest / Math.max(Math.abs(vx) * 1000, 2600))), id2 = 0.26;
      document.documentElement.style.setProperty('--tdur', (od + id2) + 's');
      cur.style.transition = `transform ${od}s cubic-bezier(.3,.3,.6,1)`; cur.style.transform = `translate3d(${-dir * W}px,0,0)`; moveBg(-dir * W, `transform ${od}s cubic-bezier(.3,.3,.6,1)`);
      setTimeout(() => {
        st.style.transition = 'none';
        if (tab === 'nutri' && window.resetNutriState) resetNutriState(); tab = id; listUI = null; recUI = null; nutriFn = null;
        const pre = pageCache[id]; let late = false;
        if (pre) { $('#main').replaceChildren(...[...pre.childNodes].map(n => n.cloneNode(true))); renderHead(); late = true; } else render();
        renderTabs(); window.scrollTo(0, 0);
        st.style.transform = `translate3d(${dir * W}px,0,0)`; moveBg(dir * W); st.style.visibility = ''; clearPeeks(); void st.offsetWidth;
        st.style.transition = `transform ${id2}s ${EASE}`; st.style.transform = 'translate3d(0,0,0)'; moveBg(0, `transform ${id2}s ${EASE}`);
        setTimeout(() => { resetStage(); if (late) { listUI = null; recUI = null; render(); } busy = false; }, id2 * 1000 + 20);
      }, od * 1000);
    } else {
      const tr = 'transform .3s cubic-bezier(.2,.9,.3,1.08)';
      Object.values(peeks).forEach(p => p && (p.style.transition = tr)); moveBg(0, tr);
      place(0); tabInd(idx, 0, true);
      setTimeout(() => { clearPeeks(); resetStage(); }, 320);
    }
  };
  document.addEventListener('touchend', endSwipe, { passive: true });
  document.addEventListener('touchcancel', () => { if (mode === 1) { dx = 0; vx = 0; } endSwipe(); }, { passive: true });
  const hardReset = () => { if (busy) return; mode = 0; document.body.classList.remove('swiping'); clearPeeks(); resetStage(); };
  document.addEventListener('visibilitychange', hardReset);
  window.addEventListener('pageshow', hardReset);
})();
function render() {
  const m = $('#main'); const scroll = window.scrollY;
  if (tab === 'list' && listUI && m.contains(listUI.wrap)) { drawListBody(); return; }
  if (tab === 'rec' && recUI && m.contains(recUI.wrap)) { recUI.draw(); return; }
  if (tab === 'nutri') { (nutriFn || nutriHome)(); window.scrollTo(0, scroll); return; }
  if (tab === 'set') { m.replaceChildren(renderSettings()); window.scrollTo(0, scroll); return; }
  if (PAGES[tab]) { m.replaceChildren(PAGES[tab]()); window.scrollTo(0, scroll); return; }
  if (tab !== 'cal' && tab !== 'list' && tab !== 'rec') return;
  m.replaceChildren(tab === 'cal' ? renderCal() : tab === 'list' ? renderList() : renderRec());
  window.scrollTo(0, scroll);
}

/* ============ Essenswoche ============ */
function planOn(ds) {
  const order = { 'Frühstück': 0, 'Mittag': 1, 'Abend': 2, 'Snack': 3, '': 4 };
  return plan.filter(p => p.date === ds).sort((a, b) => (order[a.meal || ''] - order[b.meal || '']) || ((a.created || 0) - (b.created || 0)));
}
function recipeOf(p) { return p && p.recipeId ? recipes.find(x => x.id === p.recipeId) : null; }
function renderCal() {
  const wrap = h('div', { class: 'calwrap' });
  const isWeek = view === 'week';
  const e6 = addDays(anchor, 6);
  const title = isWeek ? (anchor.getMonth() === e6.getMonth() ? `${anchor.getDate()}. bis ${e6.getDate()}. ${MON[e6.getMonth()]}` : `${anchor.getDate()}. ${MON[anchor.getMonth()].slice(0, 3)}. bis ${e6.getDate()}. ${MON[e6.getMonth()].slice(0, 3)}.`) : `${MON[monthAnchor.getMonth()]} ${monthAnchor.getFullYear()}`;
  const shift = dir => { if (isWeek) anchor = addDays(anchor, 7 * dir); else monthAnchor = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + dir, 1); render(); };
  // Heute Gegessenes direkt hier eintragen
  if (typeof openDiary === 'function' && typeof lrow === 'function') {
    const who = me(), t = ymd(new Date()); const logged = !!diary[who + '_' + t]; const kc = logged && profiles[who] ? Math.round(dayIntake(who, t).tot[0]) : 0;
    wrap.append(h('div', { class: 'ln calate' }, lrow({ class: 'lr tap', onclick: () => openDiary(who, t, render) }, h('span', { class: 'tx', text: 'Heute gegessen' }), h('span', { class: 'n', text: logged ? `${fmtInt(kc)} kcal` : 'Eintragen' }), h('span', { class: 'chev', text: '›' })),
      lrow({ class: 'lr tap', onclick: () => openDayNut(0) }, h('span', { class: 'tx', text: 'Nährwerte' }), h('span', { class: 'chev', text: '›' }))));
  }
  wrap.append(h('div', { class: 'calbar' },
    h('button', { class: 'ib', 'aria-label': 'Zurück', onclick: () => shift(-1) }, ic('chevron-left')),
    h('div', { class: 'ttl', text: title }),
    h('button', { class: 'ib', 'aria-label': 'Weiter', onclick: () => shift(1) }, ic('chevron-right'))));
  const isToday = isWeek ? ymd(anchor) === ymd(weekAnchor()) : (monthAnchor.getMonth() === new Date().getMonth() && monthAnchor.getFullYear() === new Date().getFullYear());
  wrap.append(h('div', { class: 'row', style: 'justify-content:space-between;margin-bottom:14px;gap:8px' },
    h('div', { class: 'seg wide' },
      h('button', { class: isWeek ? 'on' : '', onclick: () => setView('week') }, 'Woche'),
      h('button', { class: !isWeek ? 'on' : '', onclick: () => setView('month') }, 'Monat')),
    h('div', { class: 'row', style: 'gap:6px' },
      isToday ? null : h('button', { class: 'btn s todayb', onclick: () => { anchor = weekAnchor(); monthAnchor = new Date(new Date().getFullYear(), new Date().getMonth(), 1); render(); } }, 'Heute'),
      null)));
  const body = isWeek ? renderWeek() : renderMonth();
  addGestures(body, shift);
  const bar0 = wrap.querySelector('.calbar'); let bx = 0;
  bar0.addEventListener('touchstart', e => { bx = e.touches[0].clientX; e.stopPropagation(); }, { passive: true });
  bar0.addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - bx; if (Math.abs(dx) > 50) shift(dx < 0 ? 1 : -1); e.stopPropagation(); }, { passive: true });
  bar0.dataset.noTabSwipe = '1';
  wrap.append(body);
  if (isWeek) {
    const prev = plan.filter(p => p.date >= ymd(addDays(anchor, -7)) && p.date < ymd(anchor));
    if (prev.length) wrap.append(h('div', { class: 'actions', style: 'margin-top:14px' }, h('button', { class: 'btn g', onclick: () => repeatWeek(prev) }, 'Vorwoche übernehmen')));
  }
  return wrap;
}
function setView(v) {
  if (v === view) return;
  if (v === 'month') monthAnchor = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  else { const t = new Date(); anchor = (t.getMonth() === monthAnchor.getMonth() && t.getFullYear() === monthAnchor.getFullYear()) ? dayOnly(t) : new Date(monthAnchor); }
  view = v; LS.set('ep_view', v); render();
}
function renderWeek() {
  const w = h('div', { class: 'week' }); const today = ymd(new Date());
  for (let i = 0; i < 7; i++) {
    const d = addDays(anchor, i), ds = ymd(d), list = planOn(ds);
    const dishes = h('div', { class: 'dishes' });
    if (list.length) list.forEach(p => dishes.append(h('div', { class: 'chip' + (p.recipeId ? '' : ' free'), onclick: e => { e.stopPropagation(); openPlan(p); } }, dot(p.by), h('span', { class: 't', text: p.title || 'Ohne Namen' }), p.prep ? h('span', { class: 'm prep', text: 'Mealprep' }) : p.meal ? h('span', { class: 'm', text: p.meal }) : null)));
    else dishes.append(h('div', { class: 'empty', text: 'nichts geplant' }));
    w.append(h('div', { class: 'day wd' + ((d.getDay() + 6) % 7) + (ds === today ? ' today' : ''), onclick: () => openDay(ds) },
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
    const cell = h('div', { class: 'mc mday wd' + ((d.getDay() + 6) % 7) + (d.getMonth() !== monthAnchor.getMonth() ? ' out' : '') + (ds === today ? ' today' : '') + (list.length ? ' has' : ''), onclick: () => { anchor = dayOnly(dd); view = 'week'; LS.set('ep_view', 'week'); render(); } }, h('div', { class: 'n', text: d.getDate() }));
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
  el.addEventListener('touchend', e => { if (multi && !e.touches.length) multi = false; }, { passive: true });
  el.addEventListener('wheel', e => { if (!e.ctrlKey) return; e.preventDefault(); if (e.deltaY > 8 && view === 'week') setView('month'); else if (e.deltaY < -8 && view === 'month') setView('week'); }, { passive: false });
}
function repeatWeek(prev) {
  const n = prev.length;
  openSheet('Vorwoche übernehmen', [
    h('div', { class: 'muted', style: 'margin:0 6px', text: `${n} ${n === 1 ? 'Gericht' : 'Gerichte'} aus der Vorwoche werden auf dieselben Wochentage übertragen.` }),
    h('div', { class: 'planned', style: 'margin-top:12px' }, prev.sort((a, b) => a.date.localeCompare(b.date)).map(p => h('div', { class: 'chip' + (p.recipeId ? '' : ' free') }, h('span', { class: 't', text: p.title }), h('span', { class: 'm', text: WD[(parseYmd(p.date).getDay() + 6) % 7] })))),
    h('div', { class: 'actions' }, h('button', { class: 'btn p', onclick: async () => {
      closeSheet();
      const made = [];
      for (const p of prev) {
        const ref = db.collection('plan').doc();
        const body = { date: ymd(addDays(parseYmd(p.date), 7)), meal: p.meal || '', title: p.title, recipeId: p.recipeId || null, listed: false, by: me(), created: Date.now() };
        await queue('plan/' + ref.id, () => ref.set(body));
        const r = recipeOf(body); if (r) made.push({ planId: ref.id, r });
      }
      if (made.length) await listForPlans(made); else toast('Übernommen');
    } }, 'Übernehmen'))]);
}

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
  const box = h('div', { class: 'schips hidden' });
  const source = opts.source || (raw => foodSuggestions((opts.parse ? opts.parse(raw) : { name: raw }).name));
  let hl = -1, cur = [], blurT;
  const hide = () => { box.classList.add('hidden'); box.replaceChildren(); };
  const show = () => {
    cur = source(input.value).slice(0, opts.max || 6);
    if (!cur.length || document.activeElement !== input) return hide();
    box.replaceChildren(...cur.map((s, i) => h('button', { class: 'schip' + (i === hl ? ' hl' : ''), type: 'button', onmousedown: e => e.preventDefault(), onpointerdown: () => clearTimeout(blurT), onclick: () => pick(s) }, s.name)));
    box.classList.remove('hidden');
  };
  const pick = s => { onPick(s); hl = -1; hide(); };
  input.addEventListener('input', () => { hl = -1; show(); });
  input.addEventListener('focus', () => { clearTimeout(blurT); show(); });
  input.addEventListener('blur', () => { blurT = setTimeout(hide, 350); });
  input.addEventListener('keydown', e => {
    if (box.classList.contains('hidden')) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight' && e.altKey) { hl = Math.min(hl + 1, cur.length - 1); show(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { hl = Math.max(hl - 1, -1); show(); e.preventDefault(); }
    else if (e.key === 'Enter' && hl >= 0) { e.preventDefault(); e.stopImmediatePropagation(); pick(cur[hl]); }
    else if (e.key === 'Escape') hide();
  });
  return { box, hide, refresh: show };
}

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
  const open = items.find(i => !i.checked && (norm(i.name) === k || canon(i.name) === canon(p.name)));
  if (open) {
    const upd = { fromDish: false };
    if (p.qty) upd.qty = open.qty ? open.qty + ' + ' + p.qty : p.qty;
    queue('items/' + open.id, () => db.collection('items').doc(open.id).update(upd));
    if (!p.qty) toast(open.name + ' steht schon auf der Liste');
  } else {
    const done = items.find(i => i.checked && norm(i.name) === k);
    const category = catHint || catOf(p.name);
    if (done) queue('items/' + done.id, () => db.collection('items').doc(done.id).update({ checked: false, qty: p.qty, notes: [], fromDish: false, by: me(), created: Date.now() }));
    else { const ref = db.collection('items').doc(); queue('items/' + ref.id, () => ref.set({ name: p.name, qty: p.qty, notes: [], checked: false, category, fromDish: false, by: me(), created: Date.now() })); }
  }
  learn(p.name, catHint);
}
function renderList() {
  const wrap = h('div', { class: 'sl' });
  const inp = h('input', { class: 'slin', placeholder: 'Hinzufügen', enterkeyhint: 'done', autocomplete: 'off' });
  const submit = () => {
    const v = inp.value.trim(); if (!v) { inp.focus(); return; }
    const p = parseEntry(v); const top = foodSuggestions(p.name)[0];
    if (top && norm(top.name) !== norm(p.name) && norm(top.name).startsWith(norm(p.name))) addItem((p.qty ? p.qty + ' ' : '') + top.name, top.cat); else addItem(v);
    inp.value = ''; inp.focus();
  };
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
  const sg = attachSuggest(inp, s => { const p = parseEntry(inp.value); addItem((p.qty ? p.qty + ' ' : '') + s.name, s.cat); inp.value = ''; inp.focus(); }, { parse: parseEntry });
  // Eingesprochen: „Milch, Eier und Brot“ wird zu drei Einträgen
  const mic = slMic(t => t.split(/\s*(?:,|;|\bund\b)\s*/i).map(x => x.trim().replace(/[.!?]$/, '')).filter(Boolean).forEach(x => addItem(x)));
  const body = h('div', { class: 'slbody' });
  wrap.append(h('div', { class: 'sladd' }, inp, mic), sg.box, body);
  listUI = { wrap, inp, body };
  drawListBody();
  return wrap;
}
function slMic(onText) {
  let rec = null, chunks = [];
  const b = h('button', { class: 'slmic', type: 'button', 'aria-label': 'Einsprechen' }, ic('microphone'));
  b.addEventListener('click', async () => {
    if (rec) { rec.stop(); return; }
    if (!navigator.mediaDevices || !window.MediaRecorder) return toast('Aufnahme wird hier nicht unterstützt');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks = []; rec = new MediaRecorder(stream);
      rec.ondataavailable = e => e.data.size && chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop()); rec = null; b.classList.remove('rec'); b.replaceChildren(ic('spinner', 'spin'));
        try { const t = await window.transcribeVideo(new Blob(chunks, { type: chunks[0] ? chunks[0].type : 'audio/mp4' }), () => {}); if (t && t.trim()) onText(t.trim()); else toast('Nicht verstanden'); } catch (e) { toast('Nicht verstanden'); }
        b.replaceChildren(ic('microphone'));
      };
      rec.start(); b.classList.add('rec'); b.replaceChildren(ic('stop'));
    } catch (e) { toast('Kein Zugriff aufs Mikrofon'); }
  });
  return b;
}
let openSwipe = null;
const openIdeas = new Set();
function drawListBody() {
  const body = listUI.body; const frag = [];
  if (!canWrite) frag.push(h('div', { class: 'slempty', text: 'Nur Leserechte' }));
  const open = items.filter(i => !i.checked), done = items.filter(i => i.checked);
  if (db && loaded.items && !open.length) frag.push(h('div', { class: 'slempty', text: done.length ? 'Alles im Wagen' : 'Noch nichts auf der Liste' }));
  // Nach Bereichen im Supermarkt, in jedem Bereich nach Name
  const by = new Map();
  for (const it of open) { const c = CATS.includes(it.category) ? it.category : 'Sonstiges'; if (!by.has(c)) by.set(c, []); by.get(c).push(it); }
  const groups = CATS.filter(c => by.has(c)).map(c => h('div', { class: 'slgrp' }, h('div', { class: 'sllbl', text: c }), ...by.get(c).sort((a, b) => a.name.localeCompare(b.name, 'de')).map(itemRow)));
  if (groups.length) frag.push(h('div', { class: 'slopen' }, ...groups));
  frag.push(...ideasBlock());
  if (done.length) {
    frag.push(h('div', { class: 'sh' }, h('span', { class: 'st', text: 'Im Wagen' }),
      h('span', { class: 'slbtns' }, h('button', { class: 'slclear', onclick: () => cartToPantry() }, 'In den Vorrat'),
        confirmBtn('Leeren', 'Wirklich leeren?', () => done.forEach(i => queue('items/' + i.id, () => db.collection('items').doc(i.id).delete())), 'slclear'))));
    frag.push(h('div', { class: 'sldone' }, ...done.sort((a, b) => (b.checkedAt || 0) - (a.checkedAt || 0)).map(itemRow)));
  }
  body.replaceChildren(...frag);
}
/* ---- Was deiner Woche fehlt: Ideen direkt in der Liste ---- */
const onListOpen = n => items.some(it => !it.checked && canon(it.name) === canon(n));
const fmtAmt = (x, u) => (x >= 10 ? fmtInt(x) : String(Math.round(x * 10) / 10).replace('.', ',')) + ' ' + u;
function slAddBtn(n) {
  const has = onListOpen(n);
  const b = h('button', { class: 'sladdb' + (has ? ' on' : ''), 'aria-label': n + ' auf die Liste' }, ic(has ? 'check' : 'plus'));
  b.onclick = e => { e.stopPropagation(); if (b.classList.contains('on')) return; b.classList.add('on'); b.replaceChildren(ic('check')); addItem(n); };
  return b;
}
function slWhy(rows, d) {
  return h('div', { class: 'slwhy' }, ...rows.slice(0, 3).flatMap((r, k) => [k ? h('span', { text: ', ' }) : null,
    h('button', { class: 'slnut', onclick: e => { e.stopPropagation(); openNutInfo(r.i); } }, r.name)]).filter(Boolean));
}
function ideasBlock() {
  if (typeof GOOD_SRC === 'undefined' || !db) return [];
  const d = listNutrition(); const best = d.best.slice(0, 4); if (!best.length) return [];
  const shown = new Set(best.map(b => canon(b.n)));
  const rows = best.map(b => {
    // andere Lebensmittel, die dieselben Lücken schließen
    const alt = new Map();
    const every = new Set(EVERYDAY.map(canon));
    b.rows.forEach(r => (GOOD_SRC[r.i] || []).forEach(([n]) => { if (!every.has(canon(n)) || !dietOk(n) || shown.has(canon(n)) || onListOpen(n) || (typeof inPantry === 'function' && inPantry(n))) return; const a = alt.get(n) || { n, rows: [] }; a.rows.push(r); alt.set(n, a); }));
    const alts = [...alt.values()].sort((x, y) => y.rows.length - x.rows.length).slice(0, 4);
    const isOpen = openIdeas.has(b.n);
    const box = h('div', { class: 'slalts' + (isOpen ? '' : ' hidden') }, ...alts.map(a => h('div', { class: 'slidea alt' }, h('div', { class: 'slname' }, h('span', { class: 'slt', text: a.n }), slWhy(a.rows, d)), slAddBtn(a.n))));
    const name = h('div', { class: 'slname' }, h('span', { class: 'slt' }, b.n, alts.length ? h('span', { class: 'slchev' + (isOpen ? ' open' : ''), text: '›' }) : null), slWhy(b.rows, d));
    if (alts.length) name.onclick = () => { const o = box.classList.toggle('hidden') === false; if (o) openIdeas.add(b.n); else openIdeas.delete(b.n); const c = name.querySelector('.slchev'); if (c) c.classList.toggle('open', o); };
    return h('div', null, h('div', { class: 'slidea' }, name, slAddBtn(b.n)), box);
  });
  return [secHead('Fehlt deiner Woche', `${fmtInt(d.cov)} % gedeckt`), h('div', { class: 'slideas' }, ...rows)];
}
function openNutInfo(i) {
  const d = listNutrition(); const r = d.rows.find(x => x.i === i); if (!r) return;
  const unit = (REF[i] || [0, '', 'g'])[2];
  const foods = (GOOD_SRC[i] || []).map(([n]) => { const v = nutOf({ name: n }); return { n, x: v ? v[i] || 0 : null }; }).sort((p, q) => (q.x ?? -1) - (p.x ?? -1));
  const st = window.lvl ? lvl(r.pct, false) : 'r';
  const extra = i === 9 ? 'Vitamin D bildet der Körper vor allem über Sonnenlicht, über das Essen kommt nur ein kleiner Teil.' : i === 22 ? 'Jodsalz ist hier nicht mitgerechnet, darüber kommt im Alltag ein großer Teil.' : '';
  openSheet(r.name, [
    INFO[i] ? h('p', { class: 'slinfo', text: INFO[i] }) : null,
    secHead('Deine Woche', `${fmtInt(r.pct)} %`),
    h('div', { class: 'ln' },
      lrow({}, h('span', { class: 'tx', text: 'Schon gegessen' }), h('span', { class: 'n', text: `${fmtInt(r.ate)} %` }), h('span', { class: 'mb ' + st }, h('i', { style: `width:${Math.min(100, r.ate)}%` }))),
      lrow({}, h('span', { class: 'tx', text: 'Dazu von der Liste' }), h('span', { class: 'n', text: `${fmtInt(r.fromList)} %` }), h('span', { class: 'mb ' + st }, h('i', { style: `width:${Math.min(100, r.fromList)}%` })))),
    foods.length ? secHead('Viel davon in') : null,
    foods.length ? h('div', { class: 'ln' }, ...foods.map(f => lrow({ class: 'lr slfood' }, h('span', { class: 'tx', text: f.n }), f.x != null ? h('span', { class: 'n', text: fmtAmt(f.x, unit) + ' in 100 g' }) : null, slAddBtn(f.n)))) : null,
    h('div', { class: 'sheetnote', text: [extra, (d.hasProfile ? 'Bezogen auf deine Angaben' : 'Ohne deine Angaben mit Durchschnittswerten gerechnet') + '. Die Liste zählt anteilig für jede Person im Haushalt.'].filter(Boolean).join(' ') })]);
}
/* ---- Nährstoff-Rechnung für die Liste ---- */
function listNutrition() {
  // Liste: geteilter Einkauf, pro Person ein Anteil
  const lst = new Array(NV).fill(0); let counted = 0;
  for (const it of items) {
    const v = nutOf({ name: it.name, variant: it.variant }); if (!v) continue;
    let g = gramsOf(it.name, it.qty || ''); if (g == null) g = PIECE[canon(it.name)] || 250;
    for (let i = 0; i < NV; i++) lst[i] += (v[i] || 0) * g / 100; counted++;
  }
  const persons = Math.max(1, people.length || 1);
  const who = me(), pf = profiles[who];
  const nd = pf && window.needsOf ? needsOf(pf) : avgNeeds();
  // Was die eingeloggte Person diese Woche bisher gegessen hat (bis heute)
  const ws = weekStartOf(new Date()), today0 = dayOnly(new Date());
  const days = []; for (let d = ws; d <= today0; d = addDays(d, 1)) days.push(ymd(d));
  const eaten = window.rangeData ? rangeData(who, days).total : new Array(NV).fill(0);
  const keys = [4, 23, 9, 15, 14, 16, 8, 10, 11, 12, 13, 20, 22, 18, 19, 21, 17, 1];
  const refOf = i => (nd.R[i] || REF[i]);
  const rows = keys.filter(i => refOf(i)).map(i => { const need = refOf(i)[0] * 7; const ate = Math.min(100, eaten[i] / need * 100); const fromList = Math.min(100 - ate, lst[i] / persons / need * 100); return { i, name: refOf(i)[1], ate, fromList, pct: ate + fromList }; });
  const cov = rows.reduce((s, r) => s + r.pct, 0) / rows.length;
  const low = rows.filter(r => r.pct < 60).sort((x, y) => x.pct - y.pct);
  const onList = n => items.some(it => canon(it.name) === canon(n));
  const score = new Map();
  const every = new Set(EVERYDAY.map(canon)), jodOk = (pf || {}).jodsalz !== 'ja';
  low.filter(r => !NO_FOOD_TIP.has(r.i)).forEach(r => (GOOD_SRC[r.i] || []).forEach(([n], j) => { if (!(every.has(canon(n)) || (n === 'Jodsalz' && jodOk)) || !dietOk(n) || onList(n) || (typeof inPantry === 'function' && inPantry(n))) return; const s = score.get(n) || { n, w: 0, for: [], rows: [] }; s.w += (6 - Math.min(5, j)) * (1 + (60 - r.pct) / 60); s.for.push(r.name); s.rows.push(r); score.set(n, s); }));
  const best = [...score.values()].sort((x, y) => y.w - x.w).slice(0, 8);
  return { cov, rows, low, best, counted, who, nDays: days.length, hasProfile: !!pf };
}
function emptyArt(text) {
  return h('div', { class: 'emptyart' }, svgEl(`<svg viewBox="0 0 120 90"><ellipse cx="60" cy="40" rx="46" ry="8" fill="var(--blue-l)"/><path d="M14 40h92c0 24-20 40-46 40S14 64 14 40z" fill="var(--card2)" stroke="var(--line)" stroke-width="2"/><path d="M30 52c4 10 14 17 28 19" stroke="var(--rosa)" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="92" cy="18" r="5" fill="var(--rosa)"/><circle cx="24" cy="14" r="3" fill="var(--blue-l)"/></svg>`), h('div', { text }));
}
function itemRow(i) {
  const toggle = () => queue('items/' + i.id, () => db.collection('items').doc(i.id).update({ checked: !i.checked, checkedAt: Date.now() }));
  const del = () => queue('items/' + i.id, () => db.collection('items').doc(i.id).delete());
  // Im Wagen: Antippen holt es zurück auf die Liste
  if (i.checked) return h('button', { class: 'slrow done', onclick: toggle }, h('span', { class: 'slck x' }), h('span', { class: 'slname' }, h('span', { class: 'slt', text: i.name })), i.qty ? h('span', { class: 'slq', text: i.qty }) : null);
  const subs = (i.notes || []).map((n, idx) => h('span', { class: 'slsub note-line', title: 'Antippen zum Entfernen', onclick: e => {
    e.stopPropagation();
    const notes = (i.notes || []).filter((_, j) => j !== idx);
    queue('items/' + i.id, () => db.collection('items').doc(i.id).update({ notes, fromDish: notes.length ? i.fromDish : false }));
    toast('Hinweis entfernt');
  } }, 'für ' + (n.dish || 'Gericht') + (n.amount && !i.qty ? ': ' + n.amount : '')));
  const row = h('div', { class: 'slrow' },
    h('button', { class: 'slck cb', 'aria-label': 'Abhaken', onclick: e => { e.stopPropagation(); intoCart(); } }),
    h('div', { class: 'slname' }, h('span', { class: 'slt', text: i.name }), ...subs),
    i.qty ? h('span', { class: 'slq', text: i.qty }) : null);
  const acts = h('div', { class: 'swacts' },
    h('button', { class: 'sw amt', onclick: () => { closeSwipe(); editQty(i); } }, 'Menge'),
    h('button', { class: 'sw del', onclick: () => { closeSwipe(); del(); } }, 'Löschen'));
  const wrap = h('div', { class: 'swipe' }, acts, row);
  // In den Wagen: Haken füllt sich, Zeile klappt weich zu, dann erst speichern
  let going = false;
  function intoCart() {
    if (going) return; going = true; row.classList.add('ticked');
    const hgt = wrap.offsetHeight; wrap.style.height = hgt + 'px'; wrap.style.overflow = 'hidden';
    setTimeout(() => { wrap.style.transition = 'height .24s cubic-bezier(.4,0,.2,1), opacity .2s'; wrap.style.height = '0px'; wrap.style.opacity = '0'; }, 170);
    setTimeout(toggle, 420);
  }
  makeSwipe(wrap, row, intoCart, del);
  return wrap;
}
function closeSwipe() { if (openSwipe) { const w = openSwipe; openSwipe = null; w._set(0, true); } }
function makeSwipe(wrap, row, onTap, onDelete) {
  const OPEN = 176;
  let sx = 0, sy = 0, dx = 0, base = 0, mode = 0, t0 = 0; // mode: 0 offen, 1 waagerecht, -1 senkrecht
  const set = (x, anim) => {
    dx = Math.max(0, x);
    row.style.transition = anim ? 'margin-right .22s ease' : 'none';
    row.style.marginRight = dx ? dx + 'px' : '';
    wrap.classList.toggle('swiping', dx > 0);
    wrap.classList.toggle('far', dx > wrap.offsetWidth * 0.6);
  };
  wrap._set = set;
  const start = (x, y, target) => { if (target.closest('.cb,.note-line')) return false; sx = x; sy = y; t0 = Date.now(); mode = 0; base = dx; return true; };
  const move = (x, y, ev) => {
    const mx = sx - x, my = y - sy;
    if (mode === 0) { if (Math.abs(mx) > 5 && Math.abs(mx) > Math.abs(my)) { mode = 1; if (openSwipe && openSwipe !== wrap) closeSwipe(); } else if (Math.abs(my) > 8) mode = -1; }
    if (mode !== 1) return;
    if (ev && ev.cancelable) ev.preventDefault();
    let v = base + mx; if (v > OPEN) v = OPEN + (v - OPEN) * 0.5;
    set(v, false);
  };
  const end = () => {
    if (mode === -1) return;
    if (mode === 0) { if (dx > 0) { closeSwipe(); set(0, true); } else onTap(); return; }
    const w = wrap.offsetWidth, flick = Date.now() - t0 < 300;
    const closing = base > 0 && dx < base - 20; // war offen und wurde zurückgewischt
    if (dx > w * 0.6) { set(w, true); wrap.classList.add('gone'); setTimeout(onDelete, 220); }
    else if (!closing && (dx > 30 || (flick && dx > 12))) { set(OPEN, true); openSwipe = wrap; }
    else { set(0, true); if (openSwipe === wrap) openSwipe = null; }
  };
  row.addEventListener('touchstart', e => { const t = e.touches[0]; if (!start(t.clientX, t.clientY, e.target)) mode = -1; }, { passive: true });
  row.addEventListener('touchmove', e => { const t = e.touches[0]; move(t.clientX, t.clientY, e); }, { passive: false });
  row.addEventListener('touchend', e => { if (e.target.closest('.cb,.note-line')) return; e.preventDefault(); end(); });
  // Maus/Trackpad am Mac
  let mdown = false;
  row.addEventListener('mousedown', e => { mdown = start(e.clientX, e.clientY, e.target); });
  window.addEventListener('mousemove', e => { if (mdown) move(e.clientX, e.clientY); });
  window.addEventListener('mouseup', () => { if (mdown) { mdown = false; end(); } });
}
document.addEventListener('touchstart', e => { if (openSwipe && !openSwipe.contains(e.target)) closeSwipe(); }, { passive: true });
document.addEventListener('mousedown', e => { if (openSwipe && !openSwipe.contains(e.target)) closeSwipe(); });
function editQty(i) {
  const q = h('input', { class: 'inp', value: i.qty || '', placeholder: 'z. B. 2 oder 500 g', enterkeyhint: 'done' });
  const save = () => { closeSheet(); queue('items/' + i.id, () => db.collection('items').doc(i.id).update({ qty: q.value.trim(), fromDish: false })); };
  q.addEventListener('keydown', e => { if (e.key === 'Enter') save(); });
  openSheet(i.name, [h('label', { class: 'lbl', text: 'Menge' }), q, h('div', { class: 'actions' }, h('button', { class: 'btn p', onclick: save }, 'Speichern'))]);
  setTimeout(() => q.focus(), 250);
}
function confirmBtn(label, confirmLabel, fn, cls) {
  let armed = false, t; const b = h('button', { class: cls || 'btn danger', text: label });
  b.addEventListener('click', () => { if (!armed) { armed = true; b.textContent = confirmLabel; t = setTimeout(() => { armed = false; b.textContent = label; }, 3000); return; } clearTimeout(t); fn(); });
  return b;
}

/* ============ Rezepte ============ */
let recQuery = '', recFilter = '';
const TILE_STYLE = { 'Favoriten': 'linear-gradient(135deg,#F0609C,#FFA9CB)', 'Lange nicht gekocht': 'linear-gradient(135deg,#6E7CF0,#A9B4FF)', 'Proteinreich': 'linear-gradient(135deg,#E07B1F,#FFBE7D)', 'Fleischgerichte': 'linear-gradient(135deg,#C84646,#F09A8E)', 'Fisch': 'linear-gradient(135deg,#24869C,#8FD3E0)', 'Vegetarisch': 'linear-gradient(135deg,#2F8A4A,#93D3A3)', 'Vegan': 'linear-gradient(135deg,#8C5E3C,#D3B08F)', 'Pasta': 'linear-gradient(135deg,#C99A12,#F6D774)', 'Italienisch': 'linear-gradient(135deg,#3B9B5A,#E06A5E)', 'Asiatisch': 'linear-gradient(135deg,#D0453F,#F4B04F)', 'Meal Prep': 'linear-gradient(135deg,#0F9F8F,#7ADCC8)' };
function tagsOf(r) { if (r.mealprep) return ['Meal Prep']; const off = r.off || []; return [...new Set([...autoTags(r).filter(t => !off.includes(t)), ...(r.tags || [])])]; }
function renderRec() {
  const wrap = h('div');
  const inp = h('input', { class: 'field', placeholder: 'Rezept suchen', value: recQuery, autocomplete: 'off' });
  const tiles = h('div', { class: 'tiles' });
  const listEl = h('div', { class: 'reclist' });
  const head = h('div', { class: 'rechead hidden' });
  const draw = () => {
    const q = norm(inp.value); recQuery = inp.value;
    // Kacheln
    const allTags = new Set(); recipes.forEach(r => tagsOf(r).forEach(t => allTags.add(t)));
    const tileNames = ['Favoriten', 'Proteinreich', 'Vegetarisch', 'Fleischgerichte', 'Italienisch', 'Asiatisch', 'Schnell', 'Lange nicht gekocht'].concat(recipes.some(r => r.mealprep) ? ['Meal Prep'] : []);
    const lim21 = ymd(addDays(new Date(), -21)), today0 = ymd(new Date());
    const countOf = t => t === 'Favoriten' ? recipes.filter(r => r.fav).length : t === 'Lange nicht gekocht' ? recipes.filter(r => (lastCooked(r) || '0') <= lim21 && !plan.some(p => p.recipeId === r.id && p.date > today0)).length : recipes.filter(r => tagsOf(r).includes(t)).length;
    tiles.replaceChildren(...tileNames.map((t, i) => h('button', { type: 'button', class: 'tile v' + i + (recFilter === t ? ' on' : ''), style: `background:${TILE_STYLE[t] || ['linear-gradient(135deg,#5B8CFF,#A9C1FF)', 'linear-gradient(135deg,#C95683,#F3A6C3)', 'linear-gradient(135deg,#24869C,#8FD3E0)'][i % 3]}`, onclick: () => { recFilter = recFilter === t ? '' : t; draw(); window.scrollTo({ top: 0, behavior: 'smooth' }); } }, h('span', { text: t }), h('span', { class: 'tcount', text: String(countOf(t)) }))));
    head.replaceChildren(...(recFilter ? [h('b', { text: recFilter }), h('button', { class: 'btn s sm', onclick: () => { recFilter = ''; draw(); } }, 'Alle Rezepte')] : [h('b', { text: 'Alle Rezepte' })]));
    head.classList.toggle('hidden', !recipes.length);
    tiles.classList.toggle('hidden', !tileNames.length);
    let list = recipes.filter(r => !q || norm(r.title).includes(q));
    const today = ymd(new Date());
    if (recFilter === 'Favoriten') list = list.filter(r => r.fav);
    else if (recFilter === 'Lange nicht gekocht') { const lim = ymd(addDays(new Date(), -21)); list = list.filter(r => (lastCooked(r) || '0') <= lim && !plan.some(p => p.recipeId === r.id && p.date > today)).sort((a, b) => (lastCooked(a) || '0').localeCompare(lastCooked(b) || '0')); }
    else if (recFilter) list = list.filter(r => tagsOf(r).includes(recFilter));
    const freq = r => plan.filter(p => p.recipeId === r.id).length;
    if (recFilter !== 'Lange nicht gekocht') list.sort((a, b) => freq(b) - freq(a) || (b.fav ? 1 : 0) - (a.fav ? 1 : 0) || a.title.localeCompare(b.title, 'de'));
    listEl.replaceChildren(...list.map((r, i) => recCard(r, i)));
    if (!list.length) listEl.append(recFilter ? emptyArt('Noch keine Rezepte in dieser Kategorie') : recipes.length ? grey('Nichts gefunden') : emptyArt('Noch keine Rezepte'));
  };
  inp.addEventListener('input', draw);
  wrap.append(h('div', { class: 'rectop' }, h('div', { class: 'addbar' }, inp, h('button', { class: 'ib p big', 'aria-label': 'Neu', onclick: openRecPlus }, ic('plus'))), tiles), head, listEl);
  recUI = { wrap, draw };
  draw();
  return wrap;
}
function openRecPlus() {
  openSheet('Neu', [h('div', { class: 'choice2' },
    h('button', { class: 'choice', onclick: () => { closeSheet(); openRecipe({ title: '', ingredients: [], steps: [], servings: '2' }); } }, h('span', { class: 'ci' }, ic('book-open')), h('b', { text: 'Neues Rezept' }), h('span', { text: 'Eintippen, einsprechen oder aus Video und Fotos' })),
    h('button', { class: 'choice mp', onclick: () => openMealprep() }, h('span', { class: 'ci' }, ic('calendar-days')), h('b', { text: 'Meal Prep' }), h('span', { text: 'Einmal kochen und auf mehrere Tage verteilen' })))]);
}
function openMealprep(pre) {
  const st = pre || { rid: null, nDays: 3, startOff: 0, persons: 1, meal: 'Mittag', pick: false, q: '', cat: '' };
  const re = () => { const sc = $('#sheet').scrollTop; openMealprep(st); $('#sheet').scrollTop = sc; };
  const r = st.rid && recipes.find(x => x.id === st.rid);
  // Was kochst du?
  const newMp = () => { closeSheet(); openRecipe({ title: '', ingredients: [], steps: [], servings: '6', mealprep: true }, { afterSave: saved => { st.rid = saved.id; st.pick = false; openMealprep(st); } }); };
  let what;
  if (st.pick) {
    const q = h('input', { class: 'field', placeholder: 'Rezept suchen', value: st.q, autocomplete: 'off' });
    const cats = ['Meal Prep', 'Favoriten', 'Proteinreich', 'Vegetarisch', 'Fleischgerichte', 'Italienisch', 'Asiatisch', 'Schnell'].filter(c => c === 'Favoriten' ? recipes.some(x => x.fav) : recipes.some(x => tagsOf(x).includes(c)));
    const listEl = h('div', { class: 'mplist' });
    const drawL = () => {
      const nq = norm(st.q);
      const l = recipes.filter(x => (x.ingredients || []).length && (!nq || norm(x.title).includes(nq)) && (!st.cat || (st.cat === 'Favoriten' ? x.fav : tagsOf(x).includes(st.cat)))).sort((x, y) => x.title.localeCompare(y.title, 'de'));
      listEl.replaceChildren(...l.map(x => h('button', { class: 'mprow' + (x.id === st.rid ? ' on' : ''), onclick: () => { st.rid = x.id; st.pick = false; re(); } }, h('span', { class: 'mpi', text: (x.title || '?')[0] }), h('span', { class: 'mpt', text: x.title }), h('span', { class: 'mps', text: kcalText(x, 'per') || '' }))));
      if (!l.length) listEl.append(grey('Nichts gefunden'));
    };
    q.addEventListener('input', () => { st.q = q.value; drawL(); });
    drawL();
    what = h('div', { class: 'fsec' }, h('div', { class: 'fsh' }, h('h3', { text: 'Aus deinen Rezepten' }), h('button', { class: 'btn s sm', onclick: () => { st.pick = false; re(); } }, 'Zurück')),
      h('div', { class: 'micwrap' }, q, micFor(q)),
      cats.length ? h('div', { class: 'mpcats' }, ...cats.map(c => h('button', { class: 'mpcat' + (st.cat === c ? ' on' : ''), style: st.cat === c ? `background:${TILE_STYLE[c] || 'var(--grad)'}` : '', onclick: () => { st.cat = st.cat === c ? '' : c; re(); } }, c))) : null,
      listEl);
  } else if (r) {
    what = h('div', { class: 'fsec' }, h('h3', { text: 'Was kochst du?' }),
      h('div', { class: 'mpsel' }, h('span', { class: 'mpi big', text: (r.title || '?')[0] }), h('div', { class: 'mpst' }, h('b', { text: r.title }), h('span', { text: `ergibt ${String(Math.round((parseFloat(r.servings) || 2) * 10) / 10).replace('.', ',')} Portionen` })), h('button', { class: 'btn s sm', onclick: () => { st.pick = true; re(); } }, 'Ändern')));
  } else {
    what = h('div', { class: 'fsec' }, h('h3', { text: 'Was kochst du?' }),
      h('div', { class: 'mpopts' },
        h('button', { class: 'mpopt a', onclick: newMp }, h('span', { class: 'ci' }, ic('plus')), h('b', { text: 'Neues Meal Prep' }), h('span', { text: 'eintippen oder einsprechen' })),
        h('button', { class: 'mpopt b', onclick: () => { st.pick = true; re(); } }, h('span', { class: 'ci' }, ic('book-open')), h('b', { text: 'Aus Rezepten' }), h('span', { text: 'mit Suche und Kategorien' }))));
  }
  const serv = r ? Math.max(1, parseFloat(r.servings) || 2) : 0;
  const nD = st.nDays, per = r ? serv / (nD * st.persons) : 0;
  const fmtP = x => (Math.round(x * 10) / 10).toString().replace('.', ',');
  const step = (val, set, lo, hi, label) => h('div', { class: 'mpstep' }, h('button', { class: 'ib', 'aria-label': 'Weniger', onclick: () => { set(Math.max(lo, val - 1)); re(); } }, '−'), h('div', { class: 'mpv' }, h('b', { text: String(val) }), h('span', { text: label })), h('button', { class: 'ib', 'aria-label': 'Mehr', onclick: () => { set(Math.min(hi, val + 1)); re(); } }, '+'));
  const startSeg = h('div', { class: 'seg wide' }, ...['Heute', 'Morgen', 'Übermorgen'].map((t, i) => h('button', { class: st.startOff === i ? 'on' : '', onclick: () => { st.startOff = i; re(); } }, t)));
  const meal = mealSelect(st.meal); meal.addEventListener('change', () => { st.meal = meal.value; });
  const save = h('button', { class: 'btn grad', onclick: async () => {
    if (!r) return toast('Wähle zuerst, was du kochst');
    if (!db) return toast('Nicht verbunden');
    save.disabled = true;
    const prep = 'mp' + Date.now().toString(36); const ids = []; const start = addDays(dayOnly(new Date()), st.startOff);
    try {
      for (let i = 0; i < nD; i++) {
        const k = ymd(addDays(start, i)); const ref = db.collection('plan').doc(); ids.push(ref.id);
        await queue('plan/' + ref.id, () => ref.set({ date: k, meal: st.meal, title: r.title, recipeId: r.id, listed: false, by: me(), created: Date.now(), prep, portion: per }));
      }
      closeSheet();
      await listForPlans([{ planId: ids[0], r }]);
    } catch (e) { showErr(e); save.disabled = false; }
  } }, 'Einplanen');
  const parts = [what];
  if (!st.pick) parts.push(
    h('div', { class: 'fsec' }, h('h3', { text: 'Wie lange?' }), step(st.nDays, v => st.nDays = v, 1, 14, st.nDays === 1 ? 'Tag' : 'Tage'), h('div', { style: 'height:14px' }), startSeg),
    h('div', { class: 'fsec' }, h('h3', { text: 'Für wen?' }), step(st.persons, v => st.persons = v, 1, 8, st.persons === 1 ? 'Person' : 'Personen'), h('div', { style: 'height:14px' }), meal),
    r ? h('div', { class: 'mpres' }, h('b', { text: fmtP(per) + (per === 1 ? ' Portion' : ' Portionen') }), h('span', { text: 'pro Person und Tag' })) : null,
    h('div', { class: 'actions' }, save));
  openSheet('Meal Prep', parts.filter(Boolean));
}
// Mikrofon für ein einzelnes Feld
function micFor(inp) {
  let rec = null, chunks = [];
  const b = h('button', { class: 'micb', type: 'button', 'aria-label': 'Einsprechen' }, ic('microphone'));
  b.addEventListener('click', async () => {
    if (rec) { rec.stop(); return; }
    if (!navigator.mediaDevices || !window.MediaRecorder) return toast('Aufnahme wird hier nicht unterstützt');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks = []; rec = new MediaRecorder(stream);
      rec.ondataavailable = e => e.data.size && chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop()); rec = null; b.classList.remove('rec'); b.replaceChildren(ic('spinner', 'spin'));
        try { const t = await window.transcribeVideo(new Blob(chunks, { type: chunks[0] ? chunks[0].type : 'audio/mp4' }), () => {}); if (t) { inp.value = t.trim().replace(/[.!?]$/, ''); inp.dispatchEvent(new Event('input')); } } catch (e) { toast('Nicht verstanden'); }
        b.replaceChildren(ic('microphone'));
      };
      rec.start(); b.classList.add('rec'); b.replaceChildren(ic('stop'));
    } catch (e) { toast('Kein Zugriff aufs Mikrofon'); }
  });
  return b;
}
function recCard(r, i) {
  const kc = kcalText(r, 'per');
  const thumb = r.thumb ? h('img', { class: 'thumb', src: r.thumb, alt: '' }) : h('div', { class: 'thumb ph c' + (i % 3), text: (r.title || '?')[0] });
  return h('div', { class: 'rcard', onclick: () => openRecipeView(r) },
    thumb,
    h('div', { style: 'flex:1;min-width:0' }, h('div', { class: 't' }, dot(r.by), r.title), h('div', { class: 's', text: [`${(r.ingredients || []).length} Zutaten`, kc].filter(Boolean).join(' / ') })),
    h('button', { class: 'ib sm ghost heart' + (r.fav ? ' on' : ''), 'aria-label': 'Favorit', onclick: e => { e.stopPropagation(); toggleFav(r); } }, ic('heart')));
}
function toggleFav(r) { queue('recipes/' + r.id, () => db.collection('recipes').doc(r.id).update({ fav: !r.fav })); }
function mealSelect(v) {
  const box = h('div', { class: 'seg wide mealseg' }); box.value = v || '';
  const sync = () => box.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.textContent === box.value));
  box.append(...MEALS.filter(Boolean).map(m => h('button', { type: 'button', onclick: () => { box.value = box.value === m ? '' : m; sync(); box.dispatchEvent(new Event('change')); } }, m)));
  sync(); return box;
}
function openSchedule(r) {
  const date = h('input', { class: 'inp', type: 'date', value: ymd(new Date()) });
  const meal = mealSelect('');
  openSheet(r.title + ' einplanen', [h('label', { class: 'lbl', text: 'Datum' }), date, h('label', { class: 'lbl', text: 'Mahlzeit' }), meal,
  h('div', { class: 'actions' }, h('button', { class: 'btn p', onclick: async () => { if (!date.value) return; closeSheet(); await addPlan({ date: date.value, meal: meal.value, title: r.title, recipeId: r.id }); anchor = parseYmd(date.value); tab = 'cal'; view = 'week'; listUI = recUI = null; renderTabs(); render(); } }, 'Einplanen'))]);
}

/* ============ Rezept ansehen ============ */
function ingredientView(r) {
  const ings = (r.ingredients || []).filter(g => g.name);
  if (!ings.length) return grey('Keine Zutaten hinterlegt');
  return h('div', { class: 'ingview2' }, ings.map(g => { const [, c] = catStyle(catOf(g.name)); const row = h('div', { class: 'ing2' }, h('span', { class: 'idot' }), h('span', { class: 'in', text: g.name }), g.amount ? h('span', { class: 'ia', text: g.amount.replace(/(\d)([a-zA-Z])/, '$1 $2') }) : null); row.style.setProperty('--ic', c); return row; }));
}
function stepsView(r) {
  const st = (r.steps || []).filter(s => s.trim());
  if (!st.length) return grey('Keine Anleitung vorhanden');
  return h('div', { class: 'stepview' }, st.map((s, i) => h('div', null, h('span', { class: 'k', text: i + 1 }), h('span', { text: s }))));
}
function nutritionLine(r) {
  const n = recipeNutrition(r); if (!n.ok) return null;
  const pre = n.unknown.length ? 'ca. ' : '';
  const b = (v, u, l, k) => h('div', { class: 'mb ' + k }, h('div', { class: 'mbc' }, h('b', { text: fmtInt(v) }), h('span', { text: u })), h('div', { class: 'mbl', text: l }));
  return h('div', { class: 'nutri2' },
    h('div', { class: 'mbs' }, b(n.per[0], 'kcal', 'Energie', 'k'), b(n.per[1], 'g', 'Eiweiß', 'p'), b(n.per[3], 'g', 'Kohlenh.', 'c'), b(n.per[2], 'g', 'Fett', 'f')),
    h('div', { class: 'n2foot', text: `pro Person / ${pre}${fmtInt(n.tot[0])} kcal für alle ${r.servings || 2} Portionen` }),
    n.unknown.length ? grey('Ohne Werte: ' + n.unknown.join(', ')) : null);
}
async function photoOf(r) {
  if (!r.hasPhoto || !db) return null;
  try { const s = await db.collection('photos').doc(r.id).get(); return s.exists ? s.data().data : null; } catch (e) { return null; }
}
function openRecipeView(r) {
  const hasPic = !!(r.hasPhoto || r.thumb);
  const banner = hasPic ? h('div', { class: 'phero' }, h('div', { class: 'phimg', style: r.thumb ? `background-image:url(${r.thumb})` : '' }), h('div', { class: 'phblur' }), h('div', { class: 'phtitle' }, h('h2', { text: r.title }))) : null;
  if (hasPic) photoOf(r).then(src => { if (src && banner.isConnected) banner.querySelector('.phimg').style.backgroundImage = `url(${src})`; });
  const tags = tagsOf(r);
  openSheet(r.title, [
    banner,
    h('div', { class: 'rhero2' },
      h('div', { class: 'rtagrow' },
        h('div', { class: 'rtags' }, h('span', { class: 'rchip', text: `für ${r.servings || 2} ${(+r.servings || 2) === 1 ? 'Person' : 'Personen'}` }),
          ...tags.map(t => h('span', { class: 'rchip', text: t }))),
        h('button', { class: 'rheart' + (r.fav ? ' on' : ''), 'aria-label': 'Favorit', onclick: e => { toggleFav(r); e.currentTarget.classList.toggle('on'); } }, ic('heart'))),
      nutritionLine(r)),
    h('div', { class: 'fsec' }, h('h3', { text: 'Zutaten' }), ingredientView(r)),
    h('div', { class: 'fsec' }, h('h3', { text: 'Zubereitung' }), stepsView(r)),
    r.source ? h('label', { class: 'lbl', text: 'Link' }) : null, r.source ? h('a', { class: 'link', href: r.source, target: '_blank', rel: 'noopener', text: r.source }) : null,
    h('div', { class: 'actions' },
      (r.steps || []).length ? h('button', { class: 'btn r', onclick: () => cookMode(r) }, 'Kochen') : null,
      h('button', { class: 'btn s', onclick: () => openSchedule(r) }, 'Einplanen'),
      h('button', { class: 'btn p', onclick: () => openRecipe(r) }, 'Bearbeiten'))]);
  $('#sheet').classList.toggle('haspic', hasPic);
}

/* ============ Sheet ============ */
let sheetStack = []; let sheetBack = null;
function openSheet(title, content) {
  sheetBack = null;
  const s = $('#sheet'); const ov = $('#ov'); const was = ov.classList.contains('on'); s.classList.remove('haspic', 'fixh');
  s.replaceChildren(h('div', { class: 'grab' }), h('div', { class: 'shead' }, h('h2', { text: title }), h('button', { class: 'ib xclose', 'aria-label': 'Schließen', onclick: closeSheet }, ic('xmark'))), ...content.filter(Boolean));
  s.style.transition = ''; s.style.transform = ''; ov.style.removeProperty('--ovo'); ov.classList.remove('out');
  s.classList.toggle('full', !!topSheet); ov.classList.add('on'); s.scrollTop = 0; lockBody(true); barColor();
  if (!was) { s.classList.remove('rise'); void s.offsetWidth; s.classList.add('rise'); }
}
function closeSheet() { sheetBack = null; setSub = null; $('#ov').classList.remove('on'); lockBody(false); barColor(); topSheet = null; $('#sheet').classList.remove('full'); }
function dismissSheet() {
  const s = $('#sheet'), ov = $('#ov'); if (ov.dataset.locked) return;
  ov.dataset.locked = '1'; barColor(true);
  s.style.transition = 'transform .26s cubic-bezier(.3,.7,.4,1)'; s.style.transform = 'translate3d(0,105%,0)'; ov.style.removeProperty('--ovo'); ov.classList.add('out');
  setTimeout(() => { delete ov.dataset.locked; ov.classList.remove('out'); s.style.transition = ''; s.style.transform = ''; const b = s.querySelector('.xclose'); if (b) b.click(); else closeSheet(); }, 270);
}
$('#ov').addEventListener('click', e => { if (e.target.id === 'ov') dismissSheet(); });
$('#ov').addEventListener('touchmove', e => { if (!e.target.closest('#sheet')) e.preventDefault(); }, { passive: false });
(() => {
  const s = $('#sheet'); let y0 = 0, x0 = 0, dy = 0, dx = 0, on = false, t0 = 0, raf = 0, top0 = false;
  const pg = () => s.querySelector('.npage');
  s.addEventListener('touchstart', e => { on = false; if ($('#ov').dataset.locked || e.touches.length > 1) return; const fromGrab = e.target.closest('.grab,.shead'); top0 = s.scrollTop <= 0 || !!fromGrab; if (!top0 && !sheetBack) return; y0 = e.touches[0].clientY; x0 = e.touches[0].clientX; dy = 0; dx = 0; t0 = Date.now(); on = 'maybe'; }, { passive: true });
  s.addEventListener('touchmove', e => {
    if (!on) return; dy = e.touches[0].clientY - y0; dx = e.touches[0].clientX - x0;
    if (on === 'maybe') {
      if (sheetBack && dx > 10 && dx > Math.abs(dy) * 1.3 && !e.target.closest('.dnswipe')) on = 'h';
      else if (top0 && dy > 6 && dy > Math.abs(dx)) on = true;
      else if (Math.abs(dy) > 6 || dx < -6) { on = false; return; } else return;
    }
    e.preventDefault();
    if (on === 'h') { const p = pg(); cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { if (p) { p.style.transition = 'none'; p.style.transform = `translate3d(${Math.max(0, dx)}px,0,0)`; p.style.opacity = String(Math.max(0.3, 1 - dx / 400)); } }); return; }
    s.style.transition = 'none';
    cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { const d = Math.max(0, dy); s.style.transform = `translate3d(0,${d}px,0)`; if (!sheetBack) $('#ov').style.setProperty('--ovo', Math.max(0, 1 - d / 600).toFixed(3)); });
  }, { passive: false });
  const settle = () => { s.style.transition = 'transform .3s cubic-bezier(.2,.9,.3,1.15)'; s.style.transform = ''; $('#ov').style.removeProperty('--ovo'); };
  s.addEventListener('touchend', () => {
    const mode = on; on = false; cancelAnimationFrame(raf);
    if (mode === 'h') { const p = pg(); const v = dx / Math.max(1, Date.now() - t0); if (dx > 70 || (v > 0.4 && dx > 30)) { const b = sheetBack; b(); } else if (p) { p.style.transition = 'transform .25s, opacity .25s'; p.style.transform = ''; p.style.opacity = ''; } return; }
    if (mode !== true) return;
    const v = dy / Math.max(1, Date.now() - t0);
    if (dy > 120 || (v > 0.5 && dy > 40)) { if (sheetBack) { settle(); sheetBack(); } else dismissSheet(); }
    else settle();
  }, { passive: true });
})();

/* ============ Tag öffnen ============ */
function openDay(ds, focus) {
  const list = planOn(ds);
  const planned = h('div', { class: 'planned' });
  if (list.length) list.forEach(p => { const r = recipeOf(p); const kc = r ? kcalText(r, 'total') : ''; planned.append(h('div', { class: 'chip' + (p.recipeId ? '' : ' free'), onclick: () => openPlan(p) }, dot(p.by), h('span', { class: 't', text: p.title }), p.prep ? h('span', { class: 'm prep', text: 'Mealprep' }) : p.meal ? h('span', { class: 'm', text: p.meal }) : null, kc ? h('span', { class: 'kc', text: kc }) : null)); });
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
  const sg = attachSuggest(inp, s => add(s.name, s.recipe), { source: recipeSuggestions });
  openSheet(longDate(ds), [
    list.length ? h('div', { class: 'fsec' }, h('h3', { text: 'Geplant' }), planned) : null,
    h('div', { class: 'fsec' }, h('h3', { text: list.length ? 'Noch etwas dazu' : 'Was gibt es?' }), inp, sg.box,
      h('div', { class: 'muted', style: 'margin:14px 4px 8px;font-size:13px', text: 'Mahlzeit, wenn du magst' }), meal,
      h('button', { class: 'btn grad', style: 'width:100%;margin-top:16px', onclick: () => add(inp.value) }, 'Eintragen')),
    h('button', { class: 'btn s', style: 'width:100%', onclick: () => openRecipe({ title: cap(inp.value), ingredients: [], steps: [], servings: '2' }, { planDate: ds, meal: meal.value }) }, 'Neues Rezept erstellen')]);
  if (focus) setTimeout(() => inp.focus(), 250);
}

/* ============ Plan-Eintrag ============ */
async function addPlan(p) {
  if (!db) return toast('Nicht verbunden');
  const ref = db.collection('plan').doc();
  const body = { date: p.date, meal: p.meal || '', title: p.title, recipeId: p.recipeId || null, listed: false, by: me(), created: Date.now() };
  await queue('plan/' + ref.id, () => ref.set(body));
  const r = recipeOf(body);
  if (r && (r.ingredients || []).length) await listForPlans([{ planId: ref.id, r }]);
  else toast(body.title + ' eingetragen');
}
// Zutaten mehrerer eingeplanter Rezepte auf die Liste; Gewürze vorher abfragen
async function listForPlans(entries) {
  const spices = [];
  for (const { planId, r } of entries) for (const g of (r.ingredients || [])) if (g.name && isSpice(g.name)) spices.push({ planId, r, g });
  const spMode = LS.get('ep_spices') || 'ask';
  if (spMode !== 'ask') spices.splice(0, spices.length, ...(spMode === 'all' ? spices : []));
  const preChosen = spMode === 'all' ? new Set(spices.map(s => s.planId + '|' + norm(s.g.name))) : null;
  const run = async (chosen) => {
    if (preChosen) chosen = preChosen;
    toast('Gleiche mit Einkaufsliste ab …');
    for (const { planId, r } of entries) {
      const ings = (r.ingredients || []).filter(g => g.name && !isNever(g.name) && (!isSpice(g.name) || chosen.has(planId + '|' + norm(g.name))));
      const ok = await mergeIngredients(planId, r.title, ings);
      if (ok) await queue('plan/' + planId, () => db.collection('plan').doc(planId).update({ listed: true }));
    }
    toast(entries.length === 1 ? `Zutaten für ${entries[0].r.title} auf der Einkaufsliste` : 'Zutaten auf der Einkaufsliste');
  };
  if (!spices.length) return run(new Set());
  return new Promise(resolve => {
    const chosen = new Set();
    const rows = spices.map(s => {
      const key = s.planId + '|' + norm(s.g.name);
      const b = h('button', { class: 'check', onclick: () => { b.classList.toggle('on'); b.classList.contains('on') ? chosen.add(key) : chosen.delete(key); } }, h('span', { class: 'box' }, ic('check')), h('span', { text: s.g.name + (s.g.amount ? ' (' + s.g.amount + ')' : '') }), entries.length > 1 ? h('span', { class: 'muted', text: '  ' + s.r.title }) : null);
      return b;
    });
    const finish = async set => { delete $('#ov').dataset.locked; closeSheet(); await run(set); resolve(); };
    openSheet('Gewürze', [h('div', { class: 'muted', style: 'margin:0 6px 10px', text: 'Welche davon braucht ihr? Der Rest kommt nicht auf die Liste.' }), h('div', { class: 'checks' }, rows),
      h('div', { class: 'actions' }, h('button', { class: 'btn g', onclick: () => finish(new Set()) }, 'Keins davon'), h('button', { class: 'btn p', onclick: () => finish(chosen) }, 'Übernehmen'))]);
    $('#sheet .shead .ib').classList.add('hidden');
    $('#ov').dataset.locked = '1';
  });
}
function openPlan(p) {
  const r = recipeOf(p);
  const date = h('input', { class: 'inp', type: 'date', value: p.date || '' });
  const meal = mealSelect(p.meal || '');
  const content = [h('div', { class: 'fsec' }, h('h3', { text: 'Wann?' }), date, h('div', { style: 'height:10px' }), meal)];
  if (r) {
    content.push(nutritionLine(r));
    content.push(h('label', { class: 'lbl', text: 'Zutaten für ' + (r.servings || 2) + ' ' + ((+r.servings || 2) === 1 ? 'Person' : 'Personen') }), ingredientView(r));
    content.push(h('label', { class: 'lbl', text: 'Zubereitung' }), stepsView(r));
    if (r.source) content.push(h('label', { class: 'lbl', text: 'Link' }), h('a', { class: 'link', href: r.source, target: '_blank', rel: 'noopener', text: r.source }));
  } else {
    content.push(h('label', { class: 'lbl', text: 'Zutaten' }), grey('Kein Rezept hinterlegt'), h('label', { class: 'lbl', text: 'Zubereitung' }), grey('Keine Anleitung vorhanden'));
  }
  const save = h('button', { class: 'btn p', onclick: async () => { const upd = {}; if (date.value && date.value !== p.date) upd.date = date.value; if (meal.value !== (p.meal || '')) upd.meal = meal.value; closeSheet(); if (Object.keys(upd).length) { await queue('plan/' + p.id, () => db.collection('plan').doc(p.id).update(upd)); if (upd.date) anchor = parseYmd(upd.date); render(); } } }, 'Speichern');
  content.push(h('div', { class: 'actions' },
    r && (r.steps || []).length ? h('button', { class: 'btn r', onclick: () => cookMode(r) }, 'Kochen') : null,
    r ? h('button', { class: 'btn s', onclick: () => openRecipe(r) }, 'Bearbeiten') : h('button', { class: 'btn r', onclick: () => openRecipe({ title: p.title, ingredients: [], steps: [], servings: '2' }, { linkPlan: p }) }, 'Rezept anlegen'),
    save));
  if (r && !p.listed && (r.ingredients || []).length) content.push(h('div', { class: 'actions', style: 'margin-top:8px' }, h('button', { class: 'btn s', onclick: async () => { closeSheet(); await listForPlans([{ planId: p.id, r }]); } }, 'Zutaten auf die Einkaufsliste')));
  content.push(h('div', { class: 'actions', style: 'margin-top:8px' }, confirmBtn('Aus der Woche entfernen', 'Wirklich entfernen?', async () => { closeSheet(); await removePlan(p); })));
  openSheet(p.title, content);
}
async function removePlan(p) {
  if (!db) return;
  await queue('plan/' + p.id, () => db.collection('plan').doc(p.id).delete());
  const sib = p.prep ? plan.find(x => x.prep === p.prep && x.id !== p.id) : null;
  if (sib) {
    for (const i of items) { const notes = i.notes || []; if (!notes.some(n => n.dishId === p.id)) continue; queue('items/' + i.id, () => db.collection('items').doc(i.id).update({ notes: notes.map(n => n.dishId === p.id ? { ...n, dishId: sib.id } : n) })); }
    return toast(`${p.title} an diesem Tag entfernt`);
  }
  let removed = 0;
  for (const i of items) {
    if (i.checked) continue; const notes = i.notes || [];
    if (!notes.some(n => n.dishId === p.id)) continue;
    const rest = notes.filter(n => n.dishId !== p.id);
    const ref = db.collection('items').doc(i.id);
    if (!rest.length && i.fromDish && !i.qty) { queue('items/' + i.id, () => ref.delete()); removed++; }
    else queue('items/' + i.id, () => ref.update({ notes: rest }));
  }
  toast(removed ? `${p.title} entfernt, ${removed} Zutat${removed > 1 ? 'en' : ''} von der Liste genommen` : `${p.title} entfernt`);
}

/* ============ Rezept bearbeiten ============ */
function openRecipe(rec, ctx = {}) {
  const st = { ...rec, ingredients: (rec.ingredients || []).map(g => ({ ...g })), steps: [...(rec.steps || [])], tags: [...(rec.tags || [])] };
  const title = h('input', { class: 'inp', placeholder: st.mealprep ? 'z. B. Chili für die Woche' : 'z. B. Lasagne', value: st.title || '' });
  const source = h('input', { class: 'inp', placeholder: 'optional', value: st.source || '' });
  let servings = parseInt(st.servings) || 2;
  const servEl = h('span', { class: 'servn', text: servings });
  const stepper = h('div', { class: 'stepper' },
    h('button', { class: 'ib sm', 'aria-label': 'Weniger', onclick: () => { servings = Math.max(1, servings - 1); servEl.textContent = servings; } }, '−'), servEl,
    h('button', { class: 'ib sm', 'aria-label': 'Mehr', onclick: () => { servings = Math.min(50, servings + 1); servEl.textContent = servings; } }, '+'),
    h('span', { class: 'muted', text: 'Personen' }));
  const ingBox = h('div'); const stepBox = h('div', { class: 'steps' });
  const fillBtn = h('button', { class: 'btn r sm hidden', onclick: () => { st.ingredients.forEach(g => { if (!g.amount && suggestAmt(g.name)) g.amount = suggestAmt(g.name); }); drawIng(); } }, 'Vorschläge übernehmen');
  const drawIng = () => {
    let missing = 0;
    ingBox.replaceChildren(...st.ingredients.map((g, idx) => {
      const n = h('input', { class: 'inp n', placeholder: 'Zutat', value: g.name || '', autocomplete: 'off' });
      const sug = suggestAmt(g.name);
      const a = h('input', { class: 'inp a' + (!g.amount && g.name ? ' need' : ''), placeholder: g.name ? (sug ? 'z. B. ' + sug : 'Wie viel?') : 'Menge', value: g.amount || '' });
      if (!g.amount && g.name) missing++;
      n.addEventListener('input', () => { g.name = n.value; delete g.product; delete g.variant; });
      n.addEventListener('change', () => { if (variantOf(g.name)) drawIng(); });
      a.addEventListener('input', () => { g.amount = a.value; a.classList.toggle('need', !a.value && !!g.name); });
      const sg = attachSuggest(n, s => { g.name = s.name; n.value = s.name; delete g.product; drawIng(); }, { max: 5 });
      const prod = g.product ? h('div', { class: 'prodline' }, h('span', { text: (g.product.brand ? g.product.brand + ' ' : '') + g.product.name }), h('button', { class: 'nx', 'aria-label': 'Produkt entfernen', onclick: () => { delete g.product; drawIng(); } }, ic('xmark'))) : null;
      return h('div', { class: 'ingwrap' },
        h('div', { class: 'ing' }, n, a,
          h('button', { class: 'ib sm ghost', 'aria-label': 'Nährwerte zuordnen', title: 'Nährwerte zuordnen', onclick: () => pickProduct(g, drawIng) }, ic('magnifying-glass-plus')),
          h('button', { class: 'ib sm ghost', 'aria-label': 'Entfernen', onclick: () => { st.ingredients.splice(idx, 1); drawIng(); } }, ic('xmark'))), sg.box, prod, g.product ? null : varRow(g.name, g.variant, l => { g.variant = l; drawIng(); }));
    }), h('button', { class: 'btn s', style: 'margin-top:4px', onclick: () => { st.ingredients.push({ name: '', amount: '' }); drawIng(); const l = ingBox.querySelectorAll('.ing .n'); l[l.length - 1] && l[l.length - 1].focus(); } }, 'Zutat hinzufügen'));
    fillBtn.classList.toggle('hidden', !st.ingredients.some(g => g.name && !g.amount && suggestAmt(g.name)));
    needNote.classList.toggle('hidden', !missing);
    needNote.textContent = missing === 1 ? 'Bei 1 Zutat fehlt die Menge.' : `Bei ${missing} Zutaten fehlt die Menge.`;
    try { drawTags(); } catch (e) {}
  };
  const needNote = h('div', { class: 'neednote hidden' });
  const drawSteps = () => {
    stepBox.replaceChildren(...st.steps.map((s, idx) => {
      const t = h('textarea', { class: 'inp', style: 'min-height:54px', value: s });
      t.addEventListener('input', () => { st.steps[idx] = t.value; });
      return h('div', { class: 'st' }, h('span', { class: 'k', text: idx + 1 }), t, h('button', { class: 'ib sm ghost', 'aria-label': 'Entfernen', onclick: () => { st.steps.splice(idx, 1); drawSteps(); } }, ic('xmark')));
    }), h('button', { class: 'btn s', style: 'margin-top:4px', onclick: () => { st.steps.push(''); drawSteps(); } }, 'Schritt hinzufügen'));
  };
  const tagBox = h('div', { class: 'tagbox' });
  st.off = [...(rec.off || [])];
  const ALL_TAGS = ['Vegetarisch', 'Vegan', 'Fleischgerichte', 'Fisch', 'Pasta', 'Italienisch', 'Asiatisch', 'Proteinreich', 'Schnell'];
  const drawTags = () => {
    if (st.mealprep) return tagBox.replaceChildren(h('span', { class: 'tagb on', text: 'Meal Prep' }), h('div', { class: 'muted tagnote', text: 'Mealprep-Rezepte stehen nur unter Meal Prep.' }));
    const auto = autoTags({ ingredients: st.ingredients });
    const isOn = t => auto.includes(t) ? !st.off.includes(t) : st.tags.includes(t);
    tagBox.replaceChildren(...[...new Set([...ALL_TAGS, ...st.tags])].map(t => h('button', { class: 'tagb' + (isOn(t) ? ' on' : '') + (auto.includes(t) ? ' auto' : ''), onclick: () => {
      if (auto.includes(t)) { st.off.includes(t) ? st.off.splice(st.off.indexOf(t), 1) : st.off.push(t); }
      else { st.tags.includes(t) ? st.tags.splice(st.tags.indexOf(t), 1) : st.tags.push(t); }
      drawTags(); } }, t)),
      h('div', { class: 'muted tagnote', text: auto.length ? 'Erkennt die App aus den Zutaten. Antippen ändert es.' : 'Wird aus den Zutaten erkannt, sobald welche drinstehen.' }));
  };
  // Foto
  let photoData = null, thumbData = st.thumb || null, photoRemoved = false;
  const photoPrev = h('div', { class: 'photoprev' });
  const photoInp = h('input', { type: 'file', accept: 'image/*', class: 'hidden' });
  const drawPhoto = () => photoPrev.replaceChildren(thumbData ? h('img', { src: thumbData, alt: '' }) : h('div', { class: 'ph', text: 'Kein Foto' }), h('div', { class: 'row', style: 'gap:6px' }, h('button', { class: 'btn s sm', onclick: () => photoInp.click() }, thumbData ? 'Ändern' : 'Foto hinzufügen'), thumbData ? h('button', { class: 'btn g sm', onclick: () => { thumbData = null; photoData = null; photoRemoved = true; drawPhoto(); } }, 'Entfernen') : null));
  photoInp.addEventListener('change', async () => { const f = photoInp.files[0]; if (!f) return; photoData = await imgToData(f, 1000, 0.72); thumbData = await imgToData(f, 160, 0.7); photoRemoved = false; drawPhoto(); });
  drawIng(); drawSteps(); drawTags(); drawPhoto();
  const importer = buildImporter(res => {
    if (res.title && !title.value.trim()) title.value = res.title;
    const have = new Set(st.ingredients.map(g => canon(g.name)));
    for (const g of (res.ingredients || [])) { if (g && g.name && !isNever(g.name) && !have.has(canon(g.name))) { st.ingredients.push({ name: cap(g.name), amount: g.amount || '' }); have.add(canon(g.name)); } }
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
      const body = { title: cap(t), servings: String(servings), source: source.value.trim(), ingredients: st.ingredients.filter(g => (g.name || '').trim()).map(g => { const o = { name: cap(g.name), amount: (g.amount || '').trim() }; if (g.product) o.product = g.product; return o; }), steps: st.steps.filter(s => s.trim()), tags: st.mealprep ? [] : st.tags, off: st.mealprep ? [] : st.off, mealprep: !!st.mealprep, fav: !!st.fav, thumb: thumbData || null, hasPhoto: !!(thumbData && (photoData || st.hasPhoto)) && !photoRemoved, updated: Date.now(), created: st.created || Date.now(), by: st.by || me() };
      await queue('recipes/' + ref.id, () => ref.set(body));
      if (photoData) queue('photos/' + ref.id, () => db.collection('photos').doc(ref.id).set({ data: photoData }));
      else if (photoRemoved && st.hasPhoto) queue('photos/' + ref.id, () => db.collection('photos').doc(ref.id).delete());
      body.ingredients.forEach(g => learn(g.name));
      const saved = { id: ref.id, ...body };
      if (!recipes.find(x => x.id === ref.id)) recipes.push(saved); else recipes = recipes.map(x => x.id === ref.id ? saved : x);
      for (const p of plan) if (p.recipeId === ref.id && p.title !== body.title) queue('plan/' + p.id, () => db.collection('plan').doc(p.id).update({ title: body.title }));
      closeSheet();
      if (ctx.planDate) { await addPlan({ date: ctx.planDate, meal: ctx.meal || '', title: body.title, recipeId: ref.id }); anchor = parseYmd(ctx.planDate); tab = 'cal'; listUI = recUI = null; renderTabs(); render(); }
      else if (ctx.linkPlan) { await queue('plan/' + ctx.linkPlan.id, () => db.collection('plan').doc(ctx.linkPlan.id).update({ recipeId: ref.id, title: body.title })); if (body.ingredients.length) await listForPlans([{ planId: ctx.linkPlan.id, r: saved }]); }
      else if (ctx.afterSave) { render(); ctx.afterSave(saved); }
      else { toast('Gespeichert'); render(); }
    } finally { saveBtn.disabled = false; }
  });
  const content = [
    h('label', { class: 'lbl', text: 'Name' }), title,
    importer,
    h('div', { class: 'row', style: 'justify-content:space-between' }, h('label', { class: 'lbl', text: 'Zutaten' }), fillBtn),
    needNote,
    ingBox,
    h('label', { class: 'lbl', text: 'Zubereitung' }), stepBox,
    h('label', { class: 'lbl', text: 'Kategorie' }), tagBox,
    h('label', { class: 'lbl', text: 'Foto' }), photoPrev, photoInp,
    h('label', { class: 'lbl', text: 'Link' }), source,
    h('label', { class: 'lbl', text: 'Das Rezept ist für' }), stepper,
    h('div', { class: 'actions' }, saveBtn),
  ];
  if (st.id) content.push(h('div', { class: 'actions', style: 'margin-top:8px' },
    confirmBtn('Rezept löschen', 'Wirklich löschen?', async () => { closeSheet(); await queue('recipes/' + st.id, () => db.collection('recipes').doc(st.id).delete()); if (st.hasPhoto) queue('photos/' + st.id, () => db.collection('photos').doc(st.id).delete()); toast('Gelöscht'); })));
  openSheet(st.id ? 'Rezept bearbeiten' : 'Neues Rezept', content);
  if (!st.id && !st.title) setTimeout(() => title.focus(), 250);
}
async function imgToData(file, max, q) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', q);
  } finally { URL.revokeObjectURL(url); }
}

/* ============ Nährwerte zuordnen: BLS oder Markenprodukt ============ */
let blsAll = null;
async function loadBls() { if (blsAll) return blsAll; const r = await fetch('bls.json'); blsAll = await r.json(); BLSNAME = new Map(blsAll.map(([n, v]) => [n, v])); const m = fullIdx(); for (const [, v] of blsAll) { const k = VKEY(v); if (!m.has(k)) m.set(k, v); } return blsAll; }
function pickProduct(g, done) {
  const q = h('input', { class: 'inp', value: g.name || '', placeholder: 'Lebensmittel oder Produkt', autocomplete: 'off' });
  const res = h('div', { class: 'pick' });
  const offBtn = h('button', { class: 'btn r' }, 'Markenprodukte suchen');
  const choose = (product) => { g.product = product; closeSheet(); reopen(); };
  let reopen = () => { };
  const searchBls = async () => {
    res.replaceChildren(grey('Suche …'));
    const all = await loadBls(); const words = norm(q.value).split(' ').filter(Boolean);
    const mine = myFoods.filter(p => p.v && words.length && words.every(w => norm(`${p.name} ${p.brand || ''} ${p.alias || ''}`).includes(w))).map(p => [p.brand ? `${p.name} (${p.brand})` : p.name, p.v, true]);
    // Eigene Ergänzungen (z. B. Whey-Protein), die nicht im BLS stehen, zuerst
    const extra = (window.DIARY_FOODS || []).filter(([, n]) => !all.some(([bn]) => bn === n)).filter(([al, n]) => { const k = norm(al.replace(/\|/g, ' ') + ' ' + n); return words.length && words.every(w => k.includes(w)); }).map(([, n, , , v]) => [n, v]);
    const hits = mine.concat(extra).concat(all.filter(([n]) => { const k = norm(n); return words.every(w => k.includes(w)); }).sort((a, b) => (/\broh\b/.test(b[0]) - /\broh\b/.test(a[0])) || a[0].length - b[0].length)).slice(0, 25);
    res.replaceChildren(...hits.map(([n, v, my]) => h('button', { onclick: () => choose({ src: my ? 'Eigenes Produkt' : 'BLS', name: n, v }) }, h('span', { text: n }), h('span', { class: 'muted', text: `  ${fmtInt(v[0])} kcal` }))));
    if (!hits.length) res.replaceChildren(grey('Nichts im BLS gefunden, probier die Markensuche'));
  };
  offBtn.addEventListener('click', async () => {
    res.replaceChildren(grey('Suche bei Open Food Facts …'));
    try {
      const u = 'https://world.openfoodfacts.org/cgi/search.pl?search_simple=1&json=1&page_size=25&lc=de&cc=de&fields=product_name,product_name_de,brands,nutriments,code&search_terms=' + encodeURIComponent(q.value);
      const j = await (await fetch(u)).json();
      const hits = (j.products || []).filter(p => p.nutriments && p.nutriments['energy-kcal_100g'] != null);
      res.replaceChildren(...hits.map(p => {
        const n = p.nutriments; const name = p.product_name_de || p.product_name || 'Produkt';
        const v = new Array(NV).fill(0); v[0] = +n['energy-kcal_100g'] || 0; v[1] = +n.proteins_100g || 0; v[2] = +n.fat_100g || 0; v[3] = +n.carbohydrates_100g || 0; v[4] = +n.fiber_100g || 0; v[5] = +n.sugars_100g || 0; v[6] = +n['saturated-fat_100g'] || 0; v[7] = +n.salt_100g || 0;
        return h('button', { onclick: () => choose({ src: 'OFF', name, brand: (p.brands || '').split(',')[0], code: p.code, v, partial: true }) }, h('span', { text: ((p.brands || '').split(',')[0] ? (p.brands || '').split(',')[0] + ' ' : '') + name }), h('span', { class: 'muted', text: `  ${fmtInt(v[0])} kcal` }));
      }));
      if (!hits.length) res.replaceChildren(grey('Kein Produkt gefunden'));
    } catch (e) { res.replaceChildren(grey('Open Food Facts gerade nicht erreichbar')); }
  });
  // Das Rezept-Sheet merken, um danach dorthin zurückzukehren
  const saved = [...$('#sheet').childNodes]; const savedScroll = $('#sheet').scrollTop, savedCls = $('#sheet').className;
  reopen = () => { $('#sheet').className = savedCls; $('#sheet').replaceChildren(...saved); $('#ov').classList.add('on'); lockBody(true); barColor(); $('#sheet').scrollTop = savedScroll; done(); };
  q.addEventListener('keydown', e => { if (e.key === 'Enter') searchBls(); });
  openSheet('Nährwerte für ' + (g.name || 'Zutat'), [q, h('div', { class: 'row', style: 'margin-top:8px;gap:8px' }, h('button', { class: 'btn s', onclick: searchBls }, 'Im BLS suchen'), offBtn),
    h('div', { class: 'row', style: 'margin-top:8px;gap:8px' }, h('button', { class: 'btn s', onclick: () => scanFlow(f => choose({ src: f.src, name: f.name, v: f.v })) }, 'Strichcode scannen'), h('button', { class: 'btn s', onclick: () => photoFlow(f => choose({ src: f.src, name: f.name, v: f.v })) }, 'Nährwerte fotografieren')),
    h('div', { class: 'muted', style: 'margin:8px 6px 0', text: 'BLS: geprüfte Durchschnittswerte. Markenprodukte: Herstellerangaben von Open Food Facts.' }), res,
    h('div', { class: 'actions' }, h('button', { class: 'btn g', onclick: () => { closeSheet(); reopen(); } }, 'Zurück'))]);
  $('#sheet .shead .ib').onclick = () => { closeSheet(); reopen(); };
  searchBls();
}

/* ============ Kochmodus mit Timer ============ */
let wakeLock = null, audioCtx = null;
function beep() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    for (let i = 0; i < 3; i++) { const o = audioCtx.createOscillator(), gn = audioCtx.createGain(); o.frequency.value = 880; gn.gain.value = 0.2; o.connect(gn); gn.connect(audioCtx.destination); const t = audioCtx.currentTime + i * 0.45; o.start(t); o.stop(t + 0.25); }
  } catch (e) { }
  if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
}
function findTimers(text) {
  const out = []; const re = /(\d+(?:[.,]\d+)?)(?:\s*(?:-|bis)\s*(\d+(?:[.,]\d+)?))?\s*(Sekunden|Sek\.?|Minuten|Minute|Min\.?|Stunden|Stunde|Std\.?)/gi; let m;
  while ((m = re.exec(text))) { const n = parseFloat(m[1].replace(',', '.')); const u = m[3].toLowerCase(); const mult = u.startsWith('sek') ? 1 : u.startsWith('st') ? 3600 : 60; out.push({ label: m[0], secs: Math.round(n * mult) }); }
  return out;
}
const timers = [];
function cookMode(r) {
  closeSheet();
  const steps = (r.steps || []).filter(s => s.trim()); let i = 0;
  const ov = h('div', { class: 'cook' });
  const stepEl = h('div', { class: 'cstep' }), numEl = h('div', { class: 'cnum' }), tbtns = h('div', { class: 'ctimers' }), running = h('div', { class: 'crun' });
  const ingEl = h('div', { class: 'cings hidden' }, ingredientView(r));
  const draw = () => {
    numEl.textContent = `Schritt ${i + 1} von ${steps.length}`; stepEl.textContent = steps[i];
    tbtns.replaceChildren(...findTimers(steps[i]).map(t => h('button', { class: 'btn r', onclick: () => startTimer(t.secs, steps[i].slice(0, 40)) }, `Timer ${fmtTime(t.secs)}`)));
    prev.disabled = i === 0; next.textContent = i === steps.length - 1 ? 'Fertig' : 'Weiter';
  };
  const prev = h('button', { class: 'btn s', onclick: () => { if (i > 0) { i--; draw(); } } }, 'Zurück');
  const next = h('button', { class: 'btn p', onclick: () => { if (i < steps.length - 1) { i++; draw(); } else close(); } }, 'Weiter');
  const close = () => { ov.remove(); clearInterval(tick); if (wakeLock) { wakeLock.release().catch(() => { }); wakeLock = null; } };
  const drawRun = () => running.replaceChildren(...timers.filter(t => !t.done).map(t => { const left = Math.max(0, Math.round((t.end - Date.now()) / 1000)); return h('div', { class: 'tm' + (left === 0 ? ' ring' : '') }, h('span', { text: t.label }), h('b', { text: fmtTime(left) }), h('button', { class: 'nx', 'aria-label': 'Timer stoppen', onclick: () => { t.done = true; drawRun(); } }, ic('xmark'))); }));
  const tick = setInterval(() => { for (const t of timers) if (!t.done && !t.rang && Date.now() >= t.end) { t.rang = true; beep(); toast('Timer fertig: ' + t.label); } drawRun(); }, 500);
  function startTimer(secs, label) { try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); audioCtx.resume(); } catch (e) { } timers.push({ end: Date.now() + secs * 1000, label, done: false }); drawRun(); }
  ov.append(h('div', { class: 'chead' }, h('div', { class: 'ctitle', text: r.title }), h('button', { class: 'btn g sm', onclick: () => ingEl.classList.toggle('hidden') }, 'Zutaten'), h('button', { class: 'ib', 'aria-label': 'Schließen', onclick: close }, ic('xmark'))),
    ingEl, h('div', { class: 'cbody' }, numEl, stepEl, tbtns), running, h('div', { class: 'cnav' }, prev, next));
  document.body.append(ov); draw();
  if (navigator.wakeLock) navigator.wakeLock.request('screen').then(l => wakeLock = l).catch(() => { });
}
function fmtTime(s) { const m = Math.floor(s / 60), x = s % 60; return s >= 3600 ? `${Math.floor(s / 3600)}:${pad(m % 60)}:${pad(x)}` : `${m}:${pad(x)}`; }

/* ============ Nährstoff-Bericht ============ */
// Richtwerte pro Tag für Erwachsene, gerundet nach den Referenzwerten der DGE
const REF = { 4: [30, 'Ballaststoffe', 'g'], 8: [775, 'Vitamin A', 'µg'], 9: [20, 'Vitamin D', 'µg'], 10: [12, 'Vitamin E', 'mg'], 11: [1.1, 'Vitamin B1', 'mg'], 12: [1.2, 'Vitamin B2', 'mg'], 13: [1.5, 'Vitamin B6', 'mg'], 14: [300, 'Folat', 'µg'], 15: [4, 'Vitamin B12', 'µg'], 16: [100, 'Vitamin C', 'mg'], 17: [4000, 'Kalium', 'mg'], 18: [1000, 'Calcium', 'mg'], 19: [325, 'Magnesium', 'mg'], 20: [13, 'Eisen', 'mg'], 21: [9, 'Zink', 'mg'], 22: [150, 'Jod', 'µg'], 23: [1.2, 'Omega-3-Fette', 'g'], 1: [57, 'Eiweiß', 'g'], 32: [70, 'Vitamin K', 'µg'], 33: [15, 'Niacin (B3)', 'mg'], 34: [5, 'Pantothensäure (B5)', 'mg'], 35: [40, 'Biotin (B7)', 'µg'], 36: [550, 'Phosphor', 'mg'], 37: [1.5, 'Kupfer', 'mg'], 38: [3, 'Mangan', 'mg'] };
const LIMITS = { 7: [6, 'Salz', 'g'], 5: [50, 'Zucker', 'g'], 6: [22, 'Gesättigte Fette', 'g'] };
const HERBS = /petersilie|basilikum|koriander|schnittlauch|dill|minze|rosmarin|thymian|salbei|oregano|estragon|kerbel|liebstockel|barlauch|kresse|lorbeer|majoran/;
const INFO = {
  32: 'Wird für die Blutgerinnung und für stabile Knochen gebraucht. Steckt vor allem in grünem Blattgemüse und Kohl.',
  33: 'Hilft, aus der Nahrung Energie zu gewinnen, und ist wichtig für Haut und Nerven. Der Körper kann es zum Teil aus dem Eiweißbaustein Tryptophan selbst bilden, das ist hier mitgerechnet.',
  34: 'Wird im Energiestoffwechsel und zum Aufbau von Fetten und Hormonen gebraucht. Kommt in fast allen Lebensmitteln vor, ein Mangel ist sehr selten.',
  35: 'Wichtig für Haut, Haare und Nägel und für den Energiestoffwechsel. Viel davon in Nüssen, Eiern, Haferflocken und Hülsenfrüchten. Für manche Lebensmittel fehlen Messwerte, deshalb wird hier eher zu wenig gezählt.',
  36: 'Baustoff für Knochen und Zähne und nötig für die Energie in jeder Zelle. Steckt in Käse, Milch, Fleisch, Fisch, Nüssen und Vollkorn, ein Mangel ist sehr selten.',
  37: 'Wird für die Blutbildung, das Immunsystem und das Bindegewebe gebraucht. Gute Quellen sind Nüsse, Kerne, Hülsenfrüchte und Vollkorn.',
  38: 'Hilft bei Knochenaufbau und Stoffwechsel. Viel davon in Haferflocken, Nüssen, Vollkorn und Reis.',
  0: 'Energie für alles, was der Körper tut. Dauerhaft deutlich weniger als der Bedarf heißt abnehmen, deutlich mehr heißt zunehmen.',
  2: 'Liefert viel Energie, wird für fettlösliche Vitamine (A, D, E, K) gebraucht und ist Baustoff für Zellen und Hormone. Am besten vor allem aus Pflanzenölen, Nüssen und Fisch.',
  3: 'Die wichtigste schnelle Energiequelle, besonders für Gehirn und Muskeln beim Sport. Am besten aus Vollkorn, Kartoffeln, Hülsenfrüchten und Obst.',
  1: 'Baustoff für Muskeln, Haut, Haare und Abwehrkräfte. Eiweiß sättigt lange und ist wichtig, wenn du Muskeln aufbauen oder halten willst.',
  4: 'Halten die Verdauung in Schwung, machen satt und füttern die guten Darmbakterien. Sie dämpfen außerdem Blutzuckerspitzen nach dem Essen.',
  8: 'Wichtig fürs Sehen, vor allem in der Dämmerung, und für gesunde Haut, Schleimhäute und das Immunsystem.',
  9: 'Hält Knochen und Zähne stabil, weil es hilft, Calcium aufzunehmen, und unterstützt Muskeln und Immunsystem. Der Körper bildet es vor allem selbst, wenn Sonne auf die Haut fällt.',
  10: 'Schützt die Zellen vor Schäden durch freie Radikale.',
  11: 'Hilft dem Körper, aus Kohlenhydraten Energie zu gewinnen, und wird für Nerven gebraucht.',
  12: 'Wichtig für den Energiestoffwechsel sowie für Haut und Augen.',
  13: 'Wird für den Eiweißstoffwechsel, die Nerven und die Blutbildung gebraucht.',
  14: 'Wichtig für Zellteilung und Blutbildung. Besonders bedeutsam rund um eine Schwangerschaft.',
  15: 'Wichtig für Blutbildung und Nerven. Kommt fast nur in tierischen Lebensmitteln vor, bei veganer Ernährung wird es meist ergänzt.',
  16: 'Stärkt das Immunsystem, wird für Bindegewebe gebraucht und hilft, Eisen aus Pflanzen besser aufzunehmen.',
  17: 'Wichtig für Herz, Muskeln und Nerven und hilft, den Blutdruck im Gleichgewicht zu halten.',
  18: 'Baustoff für Knochen und Zähne, außerdem nötig für Muskeln und Nerven.',
  19: 'Wichtig für Muskeln und Nerven und den Energiestoffwechsel. Ein Mangel zeigt sich manchmal als Muskelkrämpfe.',
  20: 'Transportiert Sauerstoff im Blut. Fehlt Eisen, ist man schneller müde. Frauen brauchen mehr als Männer.',
  21: 'Unterstützt Immunsystem, Wundheilung, Haut und Haare.',
  22: 'Nötig für die Schilddrüsenhormone, die den Stoffwechsel steuern. Kommt vor allem über Jodsalz und Seefisch.',
  23: 'Gut für Herz und Gehirn. Steckt vor allem in fettem Seefisch, Leinöl, Rapsöl und Walnüssen.',
  7: 'Zu viel Salz kann den Blutdruck erhöhen. Ein großer Teil steckt in Brot, Käse, Wurst und Fertigsoßen.',
  5: 'Freier Zucker liefert Energie ohne Nährstoffe. Weniger ist besser für Zähne, Gewicht und Blutzucker.',
  6: 'Stecken vor allem in Butter, Sahne, Käse und Wurst. Zu viel davon kann die Blutfettwerte verschlechtern.'
};
let repMode = 'week';
function reportData(start) {
  const days = [...Array(7)].map((_, i) => ymd(addDays(start, i)));
  const meals = plan.filter(p => days.includes(p.date)).map(p => ({ p, r: recipeOf(p) })).filter(m => m.r && recipeNutrition(m.r).ok);
  const total = new Array(NV).fill(0); const src = {}; const unknown = new Set();
  for (const { r, p } of meals) {
    const n = recipeNutrition(r); n.unknown.forEach(x => unknown.add(x)); const pf = p.portion || 1;
    for (let i = 0; i < NV; i++) total[i] += n.per[i] * pf;
    for (const part of n.parts) for (let i = 0; i < NV; i++) { const v = (part.v[i] || 0) * part.gr / 100 / n.serv * pf; if (v > 0) { (src[i] = src[i] || {}); src[i][part.name] = (src[i][part.name] || 0) + v; } }
  }
  const nDays = new Set(meals.map(m => m.p.date)).size;
  return { meals, total, src, unknown, nDays };
}
function scaleFor(mode, d, ref) {
  if (mode === 'week') return { val: d.total, need: ref * 7 };
  if (mode === 'day') return { val: d.total.map(x => x / 7), need: ref };
  return { val: d.total.map(x => x / Math.max(1, d.meals.length)), need: ref / 3 };
}
const NUT_GROUPS = [['Grundbausteine', [0, 1, 3, 2, 4, 23]], ['Vitamine', [9, 15, 14, 16, 8, 10, 32, 11, 12, 33, 34, 13, 35]], ['Mineralstoffe', [20, 22, 18, 19, 21, 17, 36, 37, 38]], ['Lieber nicht zu viel', [7, 5, 6]]];
const MACRO = new Set([0, 2, 3]), LIMIT_KEYS = new Set([7, 5, 6]);
function nutState(i, pct) {
  if (MACRO.has(+i)) return pct < 80 ? 'low' : pct <= 115 ? 'good' : 'high';
  if (LIMIT_KEYS.has(+i)) return pct <= 100 ? 'good' : 'high';
  const s = pct >= 100 ? 'good' : pct >= 60 ? 'ok' : 'low';
  return +i === 9 && s === 'low' ? 'sun' : s;
}
function allRefs(nd) { return { ...nd.M, ...nd.R, ...nd.L }; }
function nutRows(nd, val, scale) {
  const refs = allRefs(nd); const rows = [];
  for (const [, keys] of NUT_GROUPS) for (const i of keys) { const [ref, name, unit] = refs[i]; const need = ref * scale; const pct = (val[i] || 0) / need * 100; rows.push({ i, name, unit, ref, val, need, pct, state: nutState(i, pct), limit: LIMIT_KEYS.has(i) }); }
  return rows;
}
function nutSections(rows, top1, open) {
  let jn = 0; const out = [h('div', { class: 'legend' }, ...[['low', 'Eher wenig'], ['ok', 'Ganz ordentlich'], ['good', 'Gut'], ['high', 'Zu viel']].map(([c, t]) => h('span', { class: 'lg ' + c }, h('i'), t)))];
  for (const [title, keys] of NUT_GROUPS) {
    const list = keys.map(i => rows.find(r => r.i === i)).filter(Boolean);
    out.push(h('div', { class: 'jarsec' }, h('h3', { text: title }), h('div', { class: 'jars' }, list.map(r => { const b = jar(r.name, r.pct, r.state, top1(r.i), () => open(r), r.limit ? 'vom Maximum' : MACRO.has(r.i) ? 'vom Bedarf' : 'gedeckt'); b.style.animationDelay = (jn++ * 30) + 'ms'; return b; }))));
  }
  return out;
}
const fmtN = (v, u) => {
  if (u === 'g' && v > 0 && v < 0.1) return fmtN(v * 1000, 'mg');
  if (u === 'mg' && v > 0 && v < 0.1) return fmtN(v * 1000, 'µg');
  return (v < 1 ? (Math.round(v * 100) / 100) : v < 10 ? (Math.round(v * 10) / 10) : Math.round(v)).toLocaleString('de-DE') + ' ' + u;
};
const WAVE = '<svg viewBox="0 0 120 12" preserveAspectRatio="none"><path d="M0 6 Q15 0 30 6 T60 6 T90 6 T120 6 V12 H0Z"/></svg>';
function fill(lvl, bubbles) {
  const f = h('span', { class: 'jfill', style: `--lvl:${lvl}%` });
  const w1 = h('span', { class: 'wave' }); w1.innerHTML = WAVE; const w2 = h('span', { class: 'wave b' }); w2.innerHTML = WAVE; f.append(w1, w2);
  if (bubbles && lvl > 12) for (let k = 0; k < 5; k++) f.append(h('i', { class: 'bubl', style: `left:${12 + k * 17}%;animation-delay:${k * 0.7}s;--s:${4 + (k % 3) * 2}px` }));
  return f;
}
function countUp(el, to, fmt) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = fmt(to); return el; }
  const t0 = performance.now(), D = 700; el.textContent = fmt(0);
  const step = t => { const p = Math.min(1, (t - t0) / D); el.textContent = fmt(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step); return el;
}
let ringN = 0;
function ring(pct, state, size) {
  const id = 'rg' + (ringN++), r = 40, C = 2 * Math.PI * r, p = Math.max(0, Math.min(100, pct || 0));
  const col = { low: ['#FFB0CF', '#E9488B'], ok: ['#9DB8FF', '#5B6BFF'], good: ['#7FE3B6', '#159A63'], high: ['#FFC98F', '#E8761E'], sun: ['#FFE07A', '#F0A21E'] }[state] || ['#9DB8FF', '#5B6BFF'];
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 100 100'); s.setAttribute('class', 'ringsvg'); if (size) s.style.width = s.style.height = size + 'px';
  s.innerHTML = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${col[0]}"/><stop offset="1" stop-color="${col[1]}"/></linearGradient></defs><circle cx="50" cy="50" r="${r}" fill="none" stroke="url(#${id})" stroke-opacity=".16" stroke-width="10"/>${p < 0.5 ? '' : `<circle class="ringarc" cx="50" cy="50" r="${r}" fill="none" stroke="url(#${id})" stroke-width="10" stroke-linecap="round" stroke-dasharray="${(C * p / 100).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 50 50)"/>`}`;
  return s;
}
function jar(name, pct, state, sub, onclick, cov) {
  return h('button', { class: 'jar ring ' + state, onclick },
    h('span', { class: 'rwrap' }, ring(pct, state), h('span', { class: 'jpct', text: fmtInt(pct || 0) + ' %' })),
    h('span', { class: 'jname', text: name }),
    sub ? h('span', { class: 'jsub', text: sub }) : null);
}
function openReport(start) {
  nutriWho = '';
  const d = reportData(start);
  if (!d.meals.length) return nutriOut('Nährstoffe', [whoSeg('', start), weekNav(start, s => openReport(s)), emptyArt('Noch keine Rezepte mit Mengen eingeplant'), grey('Sobald in dieser Woche Rezepte mit Mengen eingeplant sind, siehst du hier, was eure Gerichte an Nährstoffen liefern.')]);
  const meName = me(), pfMe = profiles[meName]; const nd = pfMe ? needsOf(pfMe) : avgNeeds();
  const modeSeg = h('div', { class: 'seg wide' }, ...[['week', 'Woche'], ['day', 'Pro Tag'], ['meal', 'Pro Gericht']].map(([k, t]) => h('button', { class: repMode === k ? 'on' : '', onclick: () => { repMode = k; openReport(start); $('#sheet').scrollTop = 0; } }, t)));
  const whom = pfMe ? `deinem persönlichen Bedarf (${meName})` : 'dem Bedarf einer Durchschnittsperson';
  const explain = { week: `Alles, was in dieser Woche eingeplant ist, für eine Portion pro Gericht, verglichen mit ${whom} für 7 Tage.`, day: `Die Summe der Woche durch 7 Tage geteilt, verglichen mit ${whom} für einen Tag.`, meal: `Durchschnitt pro Gericht, verglichen mit einem Drittel von ${whom}, weil ein Hauptgericht etwa eine von drei Mahlzeiten ist.` }[repMode];
  const sc = scaleFor(repMode, d, 1);
  const rows = nutRows(nd, sc.val, sc.need);
  const top1 = i => { const t = Object.entries(d.src[i] || {}).sort((a, b) => b[1] - a[1])[0]; return t ? t[0] : ''; };
  const kcal = sc.val[0];
  const content = [whoSeg('', start), weekNav(start, s => openReport(s)),
    h('div', { class: 'rephero', style: 'margin-top:8px' },
      countUp(h('div', { class: 'rhnum' }), kcal, fmtInt),
      h('div', { class: 'rhlbl', text: repMode === 'week' ? 'kcal pro Person in dieser Woche' : repMode === 'day' ? 'kcal pro Person und Tag' : 'kcal pro Person und Gericht' }),
      h('div', { class: 'rhmeta', text: `${d.meals.length} ${d.meals.length === 1 ? 'Gericht' : 'Gerichte'} an ${d.nDays} ${d.nDays === 1 ? 'Tag' : 'Tagen'} eingeplant` })),
    modeSeg,
    h('div', { class: 'greytxt', style: 'text-align:center;margin:10px 4px 4px', text: explain }),
    ...nutSections(rows, top1, r => openNutrient(r, d, start))];
  if (!pfMe) content.push(h('div', { class: 'actions' }, h('button', { class: 'btn s', onclick: () => openProfileEdit(meName || personNames()[0], () => openReport(start)) }, 'Eigene Angaben machen')));
  content.push(grey('Frühstück und Snacks zählen hier nicht mit. Dafür gibt es oben euer persönliches Tagebuch. Richtwerte der DGE, gerundet.'));
  if (d.unknown.size) content.push(grey('Ohne Werte oder Menge: ' + [...d.unknown].join(', ')));
  nutriOut('Nährstoffe', content, () => openReport(start));
}
let nutriFn = null, nutriWho = null;
function nutriHome() { openPersonReport(me() || personNames()[0], anchor); }
function nutriOut(title, content, fn) {
  if (tab !== 'nutri' && !nutriTarget) { topSheet = 'nutri'; nutriFn = fn || null; return openSheet(title, [h('div', { class: 'npage' }, ...content.filter(Boolean))]); }
  if (!nutriTarget && $('#ov').classList.contains('on')) closeSheet();
  nutriFn = fn || null;
  (nutriTarget || $('#main')).replaceChildren(h('div', { class: 'npage' }, title && title !== 'Nährstoffe' ? h('h2', { class: 'ntitle', text: title }) : null, ...content.filter(Boolean)));
}
function weekNav(start, go) {
  const e = addDays(start, 6);
  return h('div', { class: 'pnav' }, h('button', { class: 'ib', 'aria-label': 'Woche davor', onclick: () => { anchor = addDays(anchor, -7); go(anchor); } }, ic('chevron-left')),
    h('div', { text: `${start.getDate()}. ${MON[start.getMonth()].slice(0, 3)}. bis ${e.getDate()}. ${MON[e.getMonth()].slice(0, 3)}.` }),
    h('button', { class: 'ib', 'aria-label': 'Woche danach', onclick: () => { anchor = addDays(anchor, 7); go(anchor); } }, ic('chevron-right')));
}
function openNutrient(r, d, start, opt) {
  const scaleDiv = opt ? opt.div : repMode === 'week' ? 1 : repMode === 'day' ? 7 : Math.max(1, d.meals.length);
  const srcs = Object.entries(d.src[r.i] || {}).filter(([, v]) => v / scaleDiv >= r.need * 0.005).sort((a, b) => b[1] - a[1]);
  const maxSrc = srcs.length ? srcs[0][1] : 1;
  const tiny = Object.keys(d.src[r.i] || {}).length - srcs.length;
  const st = r.state;
  const sug = suggestFoods(r.i), have = items.filter(it => !it.checked).filter(it => { const v = window.NUTRI && window.NUTRI[canon(it.name)]; return v && v[r.i] / r.ref > 0.15; }).map(it => it.name).slice(0, 5);
  const needTxt = opt ? opt.needTxt : repMode === 'week' ? 'Bedarf für 7 Tage' : repMode === 'day' ? 'Bedarf pro Tag' : 'Ziel pro Gericht';
  const content = [
    h('div', { class: 'nuthero ' + r.state },
      h('div', { class: 'nhring' }, ring(r.pct, r.state, 120), h('span', { class: 'nhpct', text: fmtInt(r.pct) + ' %' })),
      h('div', { class: 'nhtxt' },
        h('div', null, h('b', { text: fmtN(r.val[r.i] ?? r.val, r.unit) }), ` ${opt ? opt.perLabel : repMode === 'week' ? 'diese Woche' : repMode === 'day' ? 'pro Tag' : 'pro Gericht'}`),
        
        h('div', { class: 'muted', text: `${r.limit ? 'Höchstens' : 'Bedarf'}: ${fmtN(r.ref, r.unit)} pro Tag / ${fmtN(r.ref * 7, r.unit)} pro Woche` }))),
    h('div', { class: 'infocard why' }, h('h3', { text: r.limit ? 'Warum darauf achten?' : 'Wofür wichtig?' }), h('p', { text: INFO[r.i] || '' })),
  ];
  if (srcs.length) content.push(h('div', { class: 'infocard' }, h('h3', { text: opt ? 'Woher es bei dir kommt' : 'Woher es bei euch kommt' }),
    h('div', { class: 'srclist' }, srcs.map(([name, v], k) => h('div', { class: 'src' }, h('span', { class: 'sname', text: name }), h('span', { class: 'sbar' }, h('i', { style: `width:${Math.max(3, Math.round(v / maxSrc * 100))}%;animation-delay:${120 + k * 70}ms` })), h('span', { class: 'sval', text: fmtN(v / scaleDiv, r.unit) }))))));
  else content.push(h('div', { class: 'infocard' }, h('h3', { text: 'Woher es bei euch kommt' }), grey('Aus euren eingeplanten Gerichten kommt davon praktisch nichts.')));
  if (srcs.length && tiny > 0) content[content.length - 1].append(h('div', { class: 'muted', style: 'margin-top:8px;font-size:13px', text: `Dazu Spuren aus ${tiny} ${tiny === 1 ? 'weiterer Zutat' : 'weiteren Zutaten'}` }));
  const good = GOOD_SRC[r.i] || sug.map(x => [x, '']);
  if (!r.limit && good.length) {
    const onList = n => items.some(it => !it.checked && canon(it.name) === canon(n));
    const pills = good.map(([n, why]) => { const b = h('button', { class: 'gsrc' + (onList(n) ? ' on' : '') }, h('span', { class: 'gn', text: n }), why ? h('span', { class: 'gw', text: why }) : null, h('span', { class: 'gp' }, ic(onList(n) ? 'check' : 'plus')));
      b.onclick = () => { if (b.classList.contains('on')) return toast(n + ' steht schon auf der Liste'); addItem(n); b.classList.add('on'); b.querySelector('.gp').replaceChildren(ic('check')); toast(n + ' steht jetzt auf der Liste'); }; return b; });
    content.push(h('div', { class: 'infocard' }, h('h3', { text: 'Gute Quellen' }), h('div', { class: 'muted', style: 'margin:-4px 0 12px;font-size:13px', text: 'Antippen setzt es auf die Einkaufsliste.' }), h('div', { class: 'gsrcs' }, pills)));
  }
  if (!r.limit && have.length) content.push(h('div', { class: 'infocard' }, h('h3', { text: 'Schon auf eurer Liste' }), h('div', { class: 'tagbox' }, have.map(x => h('span', { class: 'pill t', text: x })))));
  if (r.i === 9) content.push(grey('Vitamin D bildet der Körper vor allem über Sonnenlicht, über das Essen kommt nur ein kleiner Teil.'));
  if (r.i === 22) content.push(grey('Jodsalz ist hier nicht mitgerechnet, darüber kommt im Alltag ein großer Teil.'));
  const sh = $('#sheet'), keep = sh.scrollTop;
  const backFn = () => { sheetBack = null; opt ? opt.back() : openReport(start); requestAnimationFrame(() => { sh.scrollTop = keep; const p = sh.querySelector('.npage'); if (p) { p.style.opacity = '0'; p.style.transform = 'translate3d(-24px,0,0)'; requestAnimationFrame(() => { p.style.transition = 'transform .22s ease-out, opacity .22s'; p.style.opacity = ''; p.style.transform = ''; }); } }); };
  content.unshift(h('button', { class: 'backlink', onclick: backFn }, ic('chevron-left'), h('span', { text: 'Übersicht' })));
  nutriOut(r.name, [h('div', { class: 'nutpage ' + st }, ...content.filter(Boolean))], () => openNutrient(r, d, start, opt));
  sheetBack = backFn;
  window.scrollTo(0, 0);
}
const GOOD_SRC = {
  32: [['Grünkohl', 'sehr viel'], ['Brokkoli', ''], ['Rosenkohl', ''], ['Spinat', ''], ['Rucola', ''], ['Rapsöl', '']],
  33: [['Hähnchenbrust', ''], ['Erdnüsse', ''], ['Thunfisch', ''], ['Makrele', ''], ['Naturreis', ''], ['Linsen', '']],
  34: [['Hähnchenbrust', ''], ['Erdnüsse', ''], ['Naturreis', ''], ['Eier', ''], ['Haferflocken', ''], ['Avocado', '']],
  35: [['Mandeln', ''], ['Haselnüsse', ''], ['Sonnenblumenkerne', ''], ['Walnüsse', ''], ['Eier', ''], ['Linsen', '']],
  36: [['Emmentaler', ''], ['Sonnenblumenkerne', ''], ['Haferflocken', ''], ['Linsen', ''], ['Lachs', ''], ['Milch', '']],
  37: [['Cashews', ''], ['Sonnenblumenkerne', ''], ['Sesam', ''], ['Haselnüsse', ''], ['Linsen', ''], ['Haferflocken', '']],
  38: [['Haferflocken', ''], ['Haselnüsse', ''], ['Kürbiskerne', ''], ['Naturreis', ''], ['Vollkornbrot', ''], ['Pinienkerne', '']],
  1: [['Magerquark', '12 g in 100 g'], ['Skyr', '11 g in 100 g'], ['Linsen', 'mit viel Ballaststoff'], ['Hähnchenbrust', 'mager'], ['Eier', 'vielseitig'], ['Tofu', 'pflanzlich'], ['Hüttenkäse', 'leicht']],
  2: [['Olivenöl', 'gute Fette'], ['Walnüsse', 'mit Omega-3'], ['Avocado', 'ungesättigt'], ['Leinsamen', 'mit Omega-3'], ['Lachs', 'mit Omega-3']],
  3: [['Haferflocken', 'sättigt lange'], ['Vollkornbrot', 'mit Ballaststoff'], ['Kartoffeln', 'mit Kalium'], ['Naturreis', 'Vollkorn'], ['Vollkornnudeln', 'Vollkorn'], ['Bananen', 'schnelle Energie']],
  4: [['Haferflocken', ''], ['Leinsamen', ''], ['Linsen', ''], ['Kichererbsen', ''], ['Vollkornbrot', ''], ['Himbeeren', ''], ['Brokkoli', '']],
  8: [['Karotten', 'als Betacarotin'], ['Süßkartoffeln', ''], ['Spinat', ''], ['Grünkohl', ''], ['Kürbis', ''], ['Paprika rot', '']],
  9: [['Lachs', 'beste Quelle'], ['Hering', ''], ['Makrele', ''], ['Eier', 'im Eigelb'], ['Champignons', '']],
  10: [['Rapsöl', 'beste Quelle'], ['Mandeln', ''], ['Haselnüsse', ''], ['Sonnenblumenkerne', ''], ['Avocado', '']],
  11: [['Haferflocken', ''], ['Erbsen', ''], ['Sonnenblumenkerne', ''], ['Vollkornbrot', ''], ['Linsen', ''], ['Schweinefilet', 'mager']],
  12: [['Milch', ''], ['Joghurt', ''], ['Champignons', ''], ['Mandeln', ''], ['Eier', ''], ['Brokkoli', '']],
  13: [['Kichererbsen', ''], ['Lachs', ''], ['Hähnchenbrust', ''], ['Bananen', ''], ['Walnüsse', ''], ['Kartoffeln', '']],
  14: [['Spinat', ''], ['Feldsalat', ''], ['Brokkoli', ''], ['Kichererbsen', ''], ['Linsen', ''], ['Rosenkohl', '']],
  15: [['Lachs', ''], ['Eier', ''], ['Rinderhack', ''], ['Joghurt', ''], ['Emmentaler', ''], ['Hering', '']],
  16: [['Paprika rot', 'mehr als Orangen'], ['Brokkoli', ''], ['Kiwis', ''], ['Orangen', ''], ['Erdbeeren', ''], ['Rosenkohl', '']],
  17: [['Kartoffeln', ''], ['Bananen', ''], ['Spinat', ''], ['Weiße Bohnen', ''], ['Avocado', ''], ['Aprikosen getrocknet', '']],
  18: [['Milch', ''], ['Joghurt', ''], ['Emmentaler', 'sehr viel'], ['Grünkohl', ''], ['Brokkoli', ''], ['Sesam', '']],
  19: [['Haferflocken', ''], ['Kürbiskerne', 'sehr viel'], ['Mandeln', ''], ['Vollkornbrot', ''], ['Spinat', ''], ['Bananen', '']],
  20: [['Linsen', 'mit Vitamin C essen'], ['Haferflocken', ''], ['Rinderhack', 'gut aufnehmbar'], ['Kürbiskerne', ''], ['Hirse', ''], ['Spinat', '']],
  21: [['Rinderhack', ''], ['Haferflocken', ''], ['Kürbiskerne', ''], ['Linsen', ''], ['Emmentaler', ''], ['Cashews', '']],
  22: [['Jodsalz', 'am einfachsten'], ['Milch', ''], ['Joghurt', ''], ['Eier', ''], ['Seelachs', 'Seefisch'], ['Kabeljau', '']],
  23: [['Lachs', 'EPA und DHA'], ['Hering', ''], ['Makrele', ''], ['Leinöl', 'pflanzlich'], ['Walnüsse', ''], ['Leinsamen', '']],
};
/* Vorschläge nur aus Alltags-Lebensmitteln (normaler Supermarkt), dazu was ihr ohnehin oft esst oder kauft.
   Keine Exoten wie Muscheln oder Sardellen, nur weil sie pro 100 g viel von etwas haben. */
const EVERYDAY = ['Haferflocken', 'Vollkornbrot', 'Naturreis', 'Vollkornnudeln', 'Kartoffeln', 'Süßkartoffeln', 'Linsen', 'Kichererbsen', 'Kidneybohnen', 'Erbsen', 'Tofu', 'Quinoa',
  'Magerquark', 'Skyr', 'Joghurt', 'Milch', 'Hüttenkäse', 'Emmentaler', 'Gouda', 'Mozzarella', 'Eier', 'Hähnchenbrust', 'Putenbrust', 'Rinderhack', 'Lachs', 'Thunfisch', 'Seelachs',
  'Brokkoli', 'Spinat', 'Paprika rot', 'Karotten', 'Tomaten', 'Zucchini', 'Champignons', 'Feldsalat', 'Rucola', 'Grünkohl', 'Rosenkohl', 'Blumenkohl', 'Erbsen', 'Edamame',
  'Bananen', 'Äpfel', 'Orangen', 'Kiwis', 'Himbeeren', 'Heidelbeeren', 'Mandeln', 'Walnüsse', 'Haselnüsse', 'Kürbiskerne', 'Sonnenblumenkerne', 'Leinsamen', 'Erdnüsse', 'Avocado', 'Rapsöl'];
// Für diese Nährstoffe ist ein Lebensmittel nicht die richtige Antwort (Sonne, Jodsalz, Supplement)
const NO_FOOD_TIP = new Set([9]);
function dietOk(name) {
  const pf = profiles[me()] || {}, cat = catOf(canonName(name));
  if (isNever(name)) return false;
  if ((pf.diet === 'vegetarisch' || pf.diet === 'vegan') && cat === 'Fleisch & Fisch') return false;
  if (pf.diet === 'vegan' && (cat === 'Milch & Eier' || /honig|quark|skyr|joghurt|kase|milch|eier/.test(canon(name)))) return false;
  return true;
}
// übliche Portion in Gramm
function portionOf(name) {
  const c = canon(name), cat = catOf(canonName(name));
  if (/ol$/.test(c)) return 10;
  if (/nuss|nusse|kerne|samen|mandel|cashew/.test(c)) return 30;
  if (/milch$/.test(c)) return 250;
  if (cat === 'Milch & Eier' && /kase|emmentaler|gouda|feta|parmesan/.test(c) && !/hutten/.test(c)) return 40;
  if (c === 'haferflocken') return 60;
  if (cat === 'Nudeln, Reis & Getreide') return 75;
  if (PIECE[c]) return Math.min(200, Math.max(PIECE[c], 80));
  return 150;
}
function suggestFoods(i) {
  if (i === 22 && (profiles[me()] || {}).jodsalz !== 'ja') return ['Jodsalz', ...suggestFoods2(i).slice(0, 4)];
  return suggestFoods2(i);
}
function suggestFoods2(i) {
  const ref = (REF[i] || [1])[0];
  const out = [];
  for (const n of [...new Set(EVERYDAY)]) {
    if (!dietOk(n)) continue;
    const v = nutOf({ name: n }); if (!v || !v[i]) continue;
    const share = v[i] * portionOf(n) / 100 / ref;
    out.push({ n, s: share - v[0] * portionOf(n) / 100 / 4000 });
  }
  return out.sort((a, b) => b.s - a.s).filter(x => x.s > 0.05).slice(0, 6).map(x => x.n);
}
function bar(pct) { return h('div', { class: 'rbar' }, h('i', { style: `width:${Math.min(100, pct)}%` })); }
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
      const c = canon(g.name); if (!c || isNever(g.name)) continue;
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
      if (isNever(name)) continue;
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
  const txt = h('textarea', { class: 'inp', placeholder: 'Einsprechen, eintippen oder einfügen' });
  const fileInp = h('input', { type: 'file', accept: 'video/*,image/*', multiple: true, class: 'hidden' });
  const filesEl = h('div', { class: 'files' });
  const prog = h('div', { class: 'prog hidden' }); const bar = h('div', { class: 'bar hidden' }, h('i'));
  let files = [];
  fileInp.addEventListener('change', () => { files = [...fileInp.files]; filesEl.replaceChildren(...files.map(f => h('span', { text: f.name.slice(0, 32) }))); });
  const setProg = (t, frac) => { prog.classList.remove('hidden'); prog.replaceChildren(ic('spinner', 'spin'), h('span', { text: t })); if (frac != null) { bar.classList.remove('hidden'); bar.firstChild.style.width = Math.round(frac * 100) + '%'; } else bar.classList.add('hidden'); };
  const endProg = (t, isErr) => { bar.classList.add('hidden'); if (!t) { prog.classList.add('hidden'); return; } prog.classList.remove('hidden'); prog.replaceChildren(h('span', { text: t, style: isErr ? 'color:#A33' : '' })); };

  // Einsprechen: Aufnahme, dann Whisper
  let rec = null, chunks = [];
  const mic = h('button', { class: 'micb', type: 'button', 'aria-label': 'Einsprechen' }, ic('microphone'));
  mic.addEventListener('click', async () => {
    if (rec) { rec.stop(); return; }
    if (!navigator.mediaDevices || !window.MediaRecorder) return endProg('Aufnahme wird hier nicht unterstützt', true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks = []; rec = new MediaRecorder(stream);
      rec.ondataavailable = e => e.data.size && chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop()); rec = null; mic.classList.remove('rec'); mic.replaceChildren(ic('microphone'));
        const blob = new Blob(chunks, { type: chunks[0] ? chunks[0].type : 'audio/mp4' });
        try { const t = await window.transcribeVideo(blob, setProg); if (t) txt.value = (txt.value ? txt.value.trim() + '\n' : '') + t; endProg(t ? '' : 'Nichts verstanden', !t); } catch (e) { console.error(e); endProg('Konnte die Aufnahme nicht auswerten', true); }
      };
      rec.start(); mic.classList.add('rec'); mic.replaceChildren(ic('stop')); endProg('Aufnahme läuft, zum Beenden nochmal tippen');
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
        // für eingeblendete Untertitel: etwa alle 1,5 Sekunden ein Bild, höchstens 40
        try { const dur = await videoDuration(v); images.push(...await videoFrames(v, Math.max(6, Math.min(40, Math.round((dur || 30) / 1.5))))); } catch (e) { console.warn(e); }
      }
      // Zuerst die KI: liest Text, Ton und Bilder zusammen
      let res = null;
      if (aiState !== false) {
        setProg('KI liest das Rezept …');
        const frames = []; for (const im of images.slice(0, 48)) { try { frames.push(await toJpeg64(im, images.length > 12 ? 640 : 768)); } catch (e) { } }
        const d = await aiCall('recipe', { text, frames });
        if (d && (d.ingredients || []).length) res = { title: d.title || '', servings: d.servings ? String(d.servings) : '', ingredients: d.ingredients.map(g => ({ name: cap(g.name || ''), amount: g.amount || '' })).filter(g => g.name), steps: (d.steps || []).filter(Boolean), ai: true };
      }
      if (!res) {
        if (images.length) { const ocr = await ocrImages(images.length > 8 ? images.filter((_, k) => k % Math.ceil(images.length / 8) === 0) : images, setProg); if (ocr) text += '\n' + ocr; }
        res = recipeFromText(text);
      }
      if (text.trim() && text.trim() !== txt.value.trim()) txt.value = text.trim();
      if (!res.ingredients.length && !res.steps.length && !res.title) { endProg('Keine Zutaten erkannt', true); return; }
      onResult(res);
      endProg(`${res.ingredients.length} Zutaten erkannt${res.ai ? ' (mit KI)' : ''}, bitte prüfen`);
    } catch (e) { console.error(e); endProg('Hat nicht geklappt, bitte nochmal versuchen', true); }
    finally { go.disabled = false; }
  });
  return h('div', { class: 'imp' },
    h('h3', { text: 'Rezept automatisch erfassen' }),
    h('div', { class: 'micwrap' }, txt, mic),
    h('div', { class: 'row', style: 'flex-wrap:wrap;margin-top:10px' },
      h('button', { class: 'btn s', type: 'button', onclick: () => fileInp.click() }, ic('image'), ' Video oder Fotos'), go), fileInp, filesEl, prog, bar);
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
/* ---- Mitteilungen: Erinnerungen und Anstupser (Web Push über die Supabase-Funktion "push") ---- */
const pushOk = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && window.isSecureContext;
const pushHome = () => !/iPhone|iPad|iPod/.test(navigator.userAgent) || matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const b64u = b => btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
const pushDoc = () => (pushes || []).find(x => x.id === LS.get('ep_push')) || null;
let pushPub = null, pushErr = '';
async function pushKey() { // Schlüssel zum Signieren: beim ersten Mal hier erzeugt, danach behält die Datenbank ihren
  if (pushPub) return pushPub;
  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']);
  const priv = await crypto.subtle.exportKey('jwk', kp.privateKey), pub = b64u(new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey)));
  const { data, error } = await sb.rpc('push_setup', { p_url: CFG.url, p_anon: CFG.key, p_site: location.origin, p_pub: pub, p_priv: priv });
  if (error || !data) throw error || new Error('setup');
  return (pushPub = data);
}
async function pushSave(s, extra) {
  let id = LS.get('ep_push'); if (!id) { id = 'd' + Math.random().toString(36).slice(2, 12); LS.set('ep_push', id); }
  const old = pushDoc() || {};
  await db.collection('push').doc(id).set({ who: me(), sub: s.toJSON(), tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Berlin', nudge: old.nudge !== false, updated: Date.now(), ...extra });
}
async function pushOn() {
  if (await Notification.requestPermission() !== 'granted') throw new Error('denied');
  const pub = await pushKey(), reg = await navigator.serviceWorker.ready;
  let s = await reg.pushManager.getSubscription();
  if (s && s.options && s.options.applicationServerKey && b64u(new Uint8Array(s.options.applicationServerKey)) !== pub) { await s.unsubscribe(); s = null; }
  if (!s) s = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: unb64u(pub) });
  await pushSave(s);
}
async function pushOff() {
  try { const reg = await navigator.serviceWorker.ready, s = await reg.pushManager.getSubscription(); if (s) await s.unsubscribe(); } catch (e) { }
  const id = LS.get('ep_push'); if (id) await db.collection('push').doc(id).delete().catch(() => { });
  LS.del('ep_push');
}
async function pushSync() { // beim Start: Gerät und Person aktuell halten
  if (!pushOk() || !LS.get('ep_push')) return;
  try {
    const reg = await navigator.serviceWorker.ready, s = await reg.pushManager.getSubscription(), d = pushDoc();
    if (!s || Notification.permission !== 'granted') { if (d) await pushOff(); return; }
    if (!d || d.who !== me() || (d.sub && d.sub.endpoint) !== s.endpoint) await pushSave(s);
  } catch (e) { console.warn(e); }
}
function pushPage(note, seg) {
  if (!pushOk() || !pushHome()) return [note('Geht nur, wenn die App vom Home-Bildschirm geöffnet wird (ab iOS 16.4).')];
  if (Notification.permission === 'denied') return [note('Mitteilungen sind für die App ausgeschaltet. Wieder an in den iPhone-Einstellungen unter Mitteilungen, dann Essensplan.')];
  if (!pushPub && !pushErr) pushKey().catch(e => { pushErr = (e && e.message) || 'setup'; console.warn(e); if (setSub === 'Mitteilungen') refreshSet(); });
  if (pushErr && !pushPub) return [note('Noch nicht eingerichtet. Dafür einmal in Supabase die Mitteilungen einrichten (Anleitung von Claude).')];
  const d = pushDoc(), st = h('div', { class: 'muted setnote', style: 'display:none' }), say = t => { st.textContent = t; st.style.display = t ? '' : 'none'; };
  const act = async (f, busy) => { say(busy); try { await f(); say(''); } catch (e) { say(e && e.message === 'denied' ? 'Nicht erlaubt. Wieder an in den iPhone-Einstellungen unter Mitteilungen.' : 'Hat nicht geklappt, bitte nochmal versuchen.'); console.warn(e); return; } refreshSet(); };
  const two = (on, onOn, onOff) => h('div', { class: 'seg wide' }, h('button', { class: on ? 'on' : '', onclick: () => !on && onOn() }, 'An'), h('button', { class: on ? '' : 'on', onclick: () => on && onOff() }, 'Aus'));
  const lab = (t, top) => h('div', { class: 'fl', style: `margin:${top}px 0 14px` }, h('span', { text: t }));
  const out = [lab('Auf diesem iPhone', 4), two(!!d, () => act(pushOn, 'Schalte ein …'), () => act(pushOff, 'Schalte aus …')),
    note(d ? 'Nur für ' + (d.who || me()) + '. Wann eine Erinnerung kommt, stellst du im To-do bei der Uhrzeit ein.' : 'Erinnerungen für To-dos mit Uhrzeit und kleine Anstupser, wenn gerade Zeit ist.'), st];
  if (d) out.push(
    lab('Anstupser', 36),
    two(d.nudge !== false, () => db.collection('push').doc(d.id).update({ nudge: true }).then(refreshSet), () => db.collection('push').doc(d.id).update({ nudge: false }).then(refreshSet)),
    note('Höchstens zweimal am Tag, mittags und abends, wenn gerade kein To-do mit Uhrzeit ansteht: was bei Zielen und To-dos ohne Uhrzeit heute noch offen ist.'),
    h('button', { class: 'btn s', style: 'width:100%;margin-top:20px', onclick: async e => { e.target.disabled = true; const r = await sb.rpc('push_test', { p_id: d.id }); e.target.textContent = r.error ? 'Hat nicht geklappt' : 'Kommt gleich'; } }, 'Probe schicken'));
  return out;
}
/* ---- KI über die Supabase-Funktion "ai" ---- */
let aiState = LS.get('ep_ai') === 'off' ? false : null;
async function aiCall(task, payload) {
  if (!sb || aiState === false) return null;
  try {
    const { data, error } = await sb.functions.invoke('ai', { body: { task, ...payload } });
    if (error) { const st = error.context && error.context.status; if (st === 404) aiState = false; throw error; }
    if (!data || !data.ok) throw new Error((data && data.error) || 'KI');
    aiState = true; return data.data;
  } catch (e) { console.warn('KI nicht verfügbar', e); return null; }
}
async function toJpeg64(src, max = 768) {
  const bmp = await createImageBitmap(src);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.8).split(',')[1];
}
function videoDuration(file) {
  return new Promise(res => { const v = document.createElement('video'); v.preload = 'metadata'; v.muted = true; const u = URL.createObjectURL(file); v.onloadedmetadata = () => { res(isFinite(v.duration) ? v.duration : 0); URL.revokeObjectURL(u); }; v.onerror = () => res(0); v.src = u; });
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
// Spracherkennung: zuerst ElevenLabs Scribe über einen Einmal-Schlüssel der Supabase-Funktion, sonst Whisper auf dem Gerät
let cloudStt = null;
async function cloudTranscribe(file, onProg, lang) {
  if (cloudStt === false || aiState === false) return null;
  const tk = await aiCall('stt_token', {}); if (!tk || !tk.token) { cloudStt = false; return null; }
  if (onProg) onProg('Erkenne Sprache …');
  const fd = new FormData();
  fd.append('file', file, file.name || ('aufnahme.' + ((file.type || '').includes('webm') ? 'webm' : 'm4a')));
  fd.append('model_id', 'scribe_v3'); if (lang) fd.append('language_code', lang); fd.append('tag_audio_events', 'false');
  const r = await fetch('https://api.elevenlabs.io/v1/speech-to-text?token=' + encodeURIComponent(tk.token), { method: 'POST', body: fd });
  if (!r.ok) { console.warn('Scribe', r.status, await r.text().catch(() => '')); return null; }
  const j = await r.json(); cloudStt = true; return (j.text || '').trim();
}
window.transcribeVideo = async (file, onProg) => {
  try { const isVid = (file.type || '').startsWith('video'); const t = await cloudTranscribe(file, onProg, isVid ? null : 'de'); if (t != null) return t; } catch (e) { console.warn('Cloud-Spracherkennung', e); }
  return transcribeLocal(file, onProg);
};
async function transcribeLocal(file, onProg) {
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

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => { });
  navigator.serviceWorker.addEventListener('message', e => { const u = e.data && e.data.type === 'open' && new URL(e.data.url).searchParams.get('tab'); if (u && PAGES[u]) { if (topSheet || $('#ov').classList.contains('on')) closeSheet(); goTab(u, 1); } });
}
{ const qt = new URLSearchParams(location.search).get('tab'); if (qt) { if (PAGES[qt]) tab = qt; history.replaceState(null, '', location.pathname); } }
// erst starten, wenn alle Skripte (start.js, news.js usw.) geladen sind, sonst blitzt kurz die Rezeptseite auf
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

/* Gleitender Marker in allen Umschaltern */
const segMem = new Map();
function glideSeg(seg, anim) {
  const bs = [...seg.querySelectorAll(':scope > button')]; if (!bs.length) return;
  let ind = seg.querySelector(':scope > .segi'); if (!ind) { ind = document.createElement('span'); ind.className = 'segi'; seg.prepend(ind); }
  const on = bs.find(b => b.classList.contains('on')); const key = bs.map(b => b.textContent).join('|');
  if (!on || !on.offsetWidth) { if (!on) ind.style.opacity = '0'; else requestAnimationFrame(() => glideSeg(seg, anim)); return; }
  const to = [Math.round(on.offsetLeft), Math.round(on.offsetWidth)];
  const from = segMem.get(key);
  const moved = from && (from[0] !== to[0] || from[1] !== to[1]);
  const fresh = !ind._placed;
  if (fresh) {
    // neu aufgebaut (z. B. nach Wischen): sofort an der richtigen Stelle, ohne Einblenden
    ind.style.transition = 'none';
    const p = moved && anim !== false ? from : to;
    ind.style.width = p[1] + 'px'; ind.style.transform = `translateX(${p[0]}px)`; ind.style.opacity = '1'; void ind.offsetWidth;
    ind._placed = true;
    if (!(moved && anim !== false)) { segMem.set(key, to); return; }
  }
  ind.style.transition = 'transform .32s cubic-bezier(.3,.8,.3,1.08), width .32s cubic-bezier(.3,.8,.3,1.08)';
  ind.style.opacity = '1'; ind.style.width = to[1] + 'px'; ind.style.transform = `translateX(${to[0]}px)`;
  segMem.set(key, to);
}
(() => {
  const pend = new Set(); let raf = 0;
  const flush = () => { raf = 0; pend.forEach(s => s.isConnected && glideSeg(s)); pend.clear(); };
  new MutationObserver(ms => {
    for (const m of ms) {
      if (m.type === 'attributes') { const t = m.target; if (t.tagName === 'BUTTON' && t.parentElement && t.parentElement.classList.contains('seg')) pend.add(t.parentElement); continue; }
      m.addedNodes.forEach(n => { if (n.nodeType !== 1) return; if (n.classList.contains('seg')) pend.add(n); n.querySelectorAll && n.querySelectorAll('.seg').forEach(s => pend.add(s)); });
    }
    if (pend.size) flush();
  }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
})();
