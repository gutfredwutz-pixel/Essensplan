'use strict';
/* Neue Bereiche: Start, To-dos (mit täglichen Zielen), Schlaf, News.
   Daten in den Sammlungen todos, goals, sleep (je Person über das Feld who). */

const today = () => ymd(new Date());
const mine = arr => arr.filter(x => x.who === me());
const hm = m => `${Math.floor(m / 60)} h ${pad(m % 60)} min`;
const toMin = t => { if (!t) return null; const [a, b] = t.split(':').map(Number); return isNaN(a) ? null : a * 60 + (b || 0); };

function secHead(title, meta) { return h('div', { class: 'sh' }, h('span', { class: 'st', text: title }), meta ? h('span', { text: meta }) : null); }
function lines(...rows) { return h('div', { class: 'ln' }, ...rows); }
function lrow(props, ...kids) { return h('div', Object.assign({ class: 'lr' }, props), ...kids); }

/* ---------- Schlaf ---------- */
function sleepOf(date) { return sleeps.find(x => x.who === me() && x.date === date); }
function sleepMinutes(s) {
  const b = toMin(s && s.bed), w = toMin(s && s.wake); if (b == null || w == null) return null;
  return (w - b + 1440) % 1440;
}
function sleepBlock() {
  const s = sleepOf(today()), m = sleepMinutes(s);
  const head = secHead('Schlaf', m != null ? hm(m) : null);
  if (m == null) return [head, lines(lrow({ class: 'lr tap', onclick: openSleep }, h('span', { class: 'add', text: 'Letzte Nacht eintragen' })))];
  // Zeitstrahl von 21 bis 10 Uhr
  const pos = t => { let v = toMin(t) - 21 * 60; if (v < 0) v += 1440; return Math.max(0, Math.min(100, v / (13 * 60) * 100)); };
  const l = pos(s.bed), r = pos(s.wake);
  return [head, h('div', { class: 'ln tap', onclick: openSleep },
    h('div', { class: 'tl' }, h('i', { style: `left:${l}%;right:${100 - r}%` })),
    h('div', { class: 'ax' }, h('span', { style: `left:${l}%`, text: s.bed }), h('span', { style: `left:${r}%`, text: s.wake })))];
}
function openSleep() {
  const d = today(), s = sleepOf(d) || {};
  const save = () => {
    const bed = bi.value, wake = wi.value; if (!bed || !wake) return;
    db.collection('sleep').doc(`${slug(me())}_${d}`).set({ who: me(), date: d, bed, wake });
  };
  const bi = h('input', { class: 'inp', type: 'time', value: s.bed || '23:30', onchange: save });
  const wi = h('input', { class: 'inp', type: 'time', value: s.wake || '07:00', onchange: save });
  openSheet('Letzte Nacht', [h('div', { class: 'form' },
    h('label', { class: 'fl' }, h('span', { text: 'Eingeschlafen' }), bi),
    h('label', { class: 'fl' }, h('span', { text: 'Aufgewacht' }), wi))]);
  save();
}

/* ---------- To-dos ---------- */
function todayTodos() {
  const t = today();
  return mine(todos).filter(x => (x.date || t) <= t && (!x.done || x.doneOn === t))
    .sort((a, b) => (a.done - b.done) || ((a.time || '99') < (b.time || '99') ? -1 : (a.time || '99') > (b.time || '99') ? 1 : 0) || (a.created || 0) - (b.created || 0));
}
function laterTodos() { const t = today(); return mine(todos).filter(x => !x.done && x.date > t).sort((a, b) => a.date < b.date ? -1 : 1); }
function toggleTodo(x) { db.collection('todos').doc(x.id).update({ done: !x.done, doneOn: x.done ? '' : today() }); }
function todoRow(x, withDate) {
  const d = withDate && x.date ? parseYmd(x.date) : null;
  const meta = [d ? (x.date === ymd(addDays(new Date(), 1)) ? 'Morgen' : `${WD[(d.getDay() + 6) % 7]}, ${d.getDate()}. ${MON[d.getMonth()].slice(0, 3)}`) : '', x.time || ''].filter(Boolean).join(', ');
  return lrow({ class: 'lr' + (x.done ? ' done' : '') },
    h('button', { class: 'ckb' + (x.done ? ' x' : ''), 'aria-label': 'Erledigt', onclick: () => toggleTodo(x) }),
    h('span', { class: 'tx tap', text: x.text, onclick: () => openTodo(x) }),
    meta ? h('span', { class: 'n', text: meta }) : null);
}
function addRow(ph, onAdd) {
  const inp = h('input', { placeholder: ph, enterkeyhint: 'done' });
  inp.addEventListener('keydown', e => { if (e.key === 'Enter' && inp.value.trim()) { onAdd(cap(inp.value.trim())); inp.value = ''; } });
  inp.addEventListener('blur', () => { if (inp.value.trim()) { onAdd(cap(inp.value.trim())); inp.value = ''; } });
  return lrow({}, h('span', { class: 'ckb ghost' }), inp);
}
function addTodo(text, date) { db.collection('todos').doc().set({ who: me(), text, date: date || today(), time: '', done: false, doneOn: '', created: Date.now() }); }
function openTodo(x) {
  const up = o => db.collection('todos').doc(x.id).update(o);
  const ti = h('input', { class: 'inp', value: x.text, onchange: e => e.target.value.trim() && up({ text: e.target.value.trim() }) });
  const di = h('input', { class: 'inp', type: 'date', value: x.date || today(), onchange: e => up({ date: e.target.value || today() }) });
  const hi = h('input', { class: 'inp', type: 'time', value: x.time || '', onchange: e => up({ time: e.target.value }) });
  openSheet('To-do', [h('div', { class: 'form' }, ti,
    h('label', { class: 'fl' }, h('span', { text: 'Tag' }), di),
    h('label', { class: 'fl' }, h('span', { text: 'Uhrzeit' }), hi),
    h('button', { class: 'btn danger', style: 'width:100%', onclick: () => { db.collection('todos').doc(x.id).delete(); closeSheet(); } }, 'Löschen'))]);
}

/* ---------- Ziele ---------- */
function weekDays() { const m = monday(new Date()); return [...Array(7)].map((_, i) => ymd(addDays(m, i))); }
function toggleGoal(g) { const t = today(), days = Object.assign({}, g.days); if (days[t]) delete days[t]; else days[t] = true; db.collection('goals').doc(g.id).update({ days }); }
function goalRow(g) {
  const on = !!(g.days || {})[today()];
  return lrow({},
    h('button', { class: 'ckb' + (on ? ' x' : ''), 'aria-label': 'Heute geschafft', onclick: () => toggleGoal(g) }),
    h('span', { class: 'tx tap', text: g.title, onclick: () => openGoal(g) }),
    h('span', { class: 'wk' }, ...weekDays().map(d => h('i', { class: (g.days || {})[d] ? 'y' : '' }))));
}
function openGoal(g) {
  const ti = h('input', { class: 'inp', value: g.title, onchange: e => e.target.value.trim() && db.collection('goals').doc(g.id).update({ title: e.target.value.trim() }) });
  openSheet('Ziel', [h('div', { class: 'form' }, ti,
    h('button', { class: 'btn danger', style: 'width:100%', onclick: () => { db.collection('goals').doc(g.id).delete(); closeSheet(); } }, 'Löschen'))]);
}

/* ---------- Seiten ---------- */
function greeting() { const hr = new Date().getHours(); return hr < 11 ? 'Guten Morgen' : hr < 18 ? 'Hallo' : 'Guten Abend'; }
PAGES.start = function () {
  const t = today(), td = todayTodos(), gl = mine(goals);
  const open = td.filter(x => !x.done).length + gl.filter(g => !(g.days || {})[t]).length, all = td.length + gl.length;
  const meals = planOn(t), shop = items.filter(i => !i.checked).length;
  return h('div', { class: 'pg' },
    h('div', { class: 'dt', text: longDate(t) }),
    h('h2', { class: 'hello', text: me() ? `${greeting()}, ${me()}` : greeting() }),
    ...sleepBlock(),
    secHead('Heute', all ? `${all - open} von ${all}` : null),
    lines(...td.filter(x => !x.done).map(x => todoRow(x)), ...gl.filter(g => !(g.days || {})[t]).map(goalRow), addRow('Neues To-do', s => addTodo(s))),
    secHead('Essen'),
    lines(...meals.map(p => lrow({ class: 'lr tap', onclick: () => goTab('cal', 1) }, h('span', { text: (p.meal ? p.meal + ': ' : '') + (p.title || (recipeOf(p) || {}).title || '') }))),
      lrow({ class: 'lr tap', onclick: () => openDiary(me(), t, render) }, h('span', { text: 'Gegessen eintragen' })),
      lrow({ class: 'lr tap', onclick: () => goTab('list', 1) }, h('span', { text: 'Einkaufsliste' }), h('span', { class: 'n', text: shop ? String(shop) : 'leer' }))));
};
PAGES.todo = function () {
  const td = todayTodos(), gl = mine(goals), later = laterTodos(), t = today();
  return h('div', { class: 'pg' },
    secHead('Heute', td.length ? `${td.filter(x => x.done).length} von ${td.length}` : null),
    lines(...td.map(x => todoRow(x)), addRow('Neues To-do', s => addTodo(s))),
    secHead('Ziele jeden Tag', gl.length ? 'diese Woche' : null),
    lines(...gl.map(goalRow), addRow('Neues Ziel, z. B. 10 Seiten lesen', s => db.collection('goals').doc().set({ who: me(), title: s, days: {}, created: Date.now() }))),
    secHead('Später', later.length ? String(later.length) : null),
    lines(...later.map(x => todoRow(x, true)), addRow('Für später', s => addTodo(s, ymd(addDays(new Date(), 1))))));
};
PAGES.news = function () {
  return h('div', { class: 'pg' }, h('p', { class: 'soon', text: 'Hier stehen bald Nachrichten aus Quellen, die du aussuchst, kurz zusammengefasst.' }));
};

/* ---------- Statistik ---------- */
let statRange = 'week';
function statDays() { const n = statRange === 'week' ? 7 : statRange === 'month' ? 30 : 365; return [...Array(n)].map((_, i) => ymd(addDays(new Date(), i - n + 1))); }
function sleepBars(days) {
  let groups;
  if (statRange === 'year') {
    const by = {}; days.forEach(d => { const k = d.slice(0, 7); (by[k] = by[k] || []).push(d); });
    groups = Object.keys(by).sort().slice(-12).map(k => ({ lbl: MON[+k.slice(5) - 1][0], days: by[k] }));
  } else groups = days.map((d, i) => ({ lbl: statRange === 'week' ? WD[(parseYmd(d).getDay() + 6) % 7] : (i % 5 === 4 ? String(parseYmd(d).getDate()) : ''), days: [d] }));
  const avgOf = ds => { const v = ds.map(d => sleepMinutes(sleepOf(d))).filter(x => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const vals = groups.map(g => avgOf(g.days)), all = vals.filter(x => x != null);
  const avg = all.length ? Math.round(avgOf(days)) : null;
  const max = Math.max(600, ...all);
  return [secHead('Schlaf', avg != null ? `im Schnitt ${hm(avg)}` : null),
    h('div', { class: 'ln tap', onclick: openSleep },
      all.length ? h('div', { class: 'bars' + (statRange === 'month' ? ' thin' : '') }, ...groups.map((g, k) => h('div', {}, h('b', { style: `height:${vals[k] != null ? Math.max(4, (vals[k] - 240) / (max - 240) * 84) : 0}px` }), h('span', { text: g.lbl }))))
        : h('div', { class: 'lr' }, h('span', { class: 'add', text: 'Noch kein Schlaf eingetragen' })))];
}
function goalStats(days) {
  const gl = mine(goals); if (!gl.length) return [];
  let hit = 0, tot = 0;
  const rows = gl.map(g => {
    const from = g.created ? ymd(new Date(g.created)) : days[0]; const ds = days.filter(d => d >= from);
    const n = ds.filter(d => (g.days || {})[d]).length; hit += n; tot += ds.length;
    return lrow({}, h('span', { class: 'tx', text: g.title }), h('span', { class: 'n', text: `${n} von ${ds.length}` }));
  });
  return [secHead('Ziele', tot ? `${Math.round(hit / tot * 100)} % geschafft` : null), lines(...rows)];
}
function nutStats(days) {
  const name = me(), pf = profiles[name];
  if (!pf) return [secHead('Nährstoffe'), lines(lrow({ class: 'lr tap', onclick: () => openProfileEdit(name, render) }, h('span', { class: 'add', text: 'Angaben machen, damit dein Bedarf berechnet wird' })))];
  const d = rangeData(name, days), refs = allRefs(needsOf(pf));
  const out = [secHead('Nährstoffe', d.n ? (d.n === 1 ? 'an 1 Tag erfasst' : `Schnitt aus ${d.n} Tagen`) : null)];
  if (!d.n) { out.push(lines(lrow({ class: 'lr tap', onclick: () => openDiary(name, today(), render) }, h('span', { class: 'add', text: 'Noch nichts gegessen eingetragen' })))); return out; }
  for (const [title, keys] of NUT_GROUPS) {
    out.push(h('div', { class: 'sub', text: title }));
    out.push(lines(...keys.filter(i => refs[i]).map(i => {
      const [ref, nm] = refs[i], pct = Math.round(d.total[i] / d.n / ref * 100), st = nutState(i, pct);
      return lrow({}, h('span', { class: 'tx', text: nm }), h('span', { class: 'n', text: `${pct} %` }),
        h('span', { class: 'mb ' + (st === 'sun' ? 'low' : st) }, h('i', { style: `width:${Math.min(100, pct)}%` })));
    })));
  }
  out.push(lines(lrow({ class: 'lr tap', onclick: () => { cachePage(); tab = 'nutri'; renderTabs(); render(); window.scrollTo(0, 0); } }, h('span', { text: 'Einzelne Tage ansehen' }), h('span', { class: 'n', text: '›' }))));
  return out;
}
PAGES.stat = function () {
  const days = statDays();
  return h('div', { class: 'pg' },
    h('div', { class: 'useg' }, ...[['week', 'Woche'], ['month', 'Monat'], ['year', 'Jahr']].map(([k, l]) => h('button', { class: k === statRange ? 'on' : '', onclick: () => { statRange = k; render(); } }, l))),
    ...sleepBars(days), ...goalStats(days), ...nutStats(days));
};
