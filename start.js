'use strict';
/* Neue Bereiche: Start, Statistik, To-dos (mit Zielen und Wiederholung), Schlaf, News.
   Daten in den Sammlungen todos, goals, sleep (je Person über das Feld who). */

const today = () => ymd(new Date());
const mine = arr => arr.filter(x => x.who === me());
const hm = m => `${Math.floor(m / 60)} h ${pad(Math.round(m % 60))} min`;
const toMin = t => { if (!t) return null; const [a, b] = t.split(':').map(Number); return isNaN(a) ? null : a * 60 + (b || 0); };
const de = (n, d = 0) => Number(n).toLocaleString('de-DE', { maximumFractionDigits: d, minimumFractionDigits: 0 });

function secHead(title, meta) { return h('div', { class: 'sh' }, h('span', { class: 'st', text: title }), meta ? h('span', { text: meta }) : null); }
function lines(...rows) { return h('div', { class: 'ln' }, ...rows); }
function lrow(props, ...kids) { return h('div', Object.assign({ class: 'lr' }, props), ...kids); }
function greeting() { const hr = new Date().getHours(); return hr < 11 ? 'Guten Morgen' : hr < 18 ? 'Hallo' : 'Guten Abend'; }
function startTitle() { return me() ? `Hallo, ${me()}` : 'Hallo'; }

/* ---------- Schlaf ---------- */
function sleepOf(date) { return sleeps.find(x => x.who === me() && x.date === date); }
function sleepMinutes(s) { const b = toMin(s && s.bed), w = toMin(s && s.wake); return b == null || w == null ? null : (w - b + 1440) % 1440; }
function sleepBlock() {
  const s = sleepOf(today()), m = sleepMinutes(s);
  const head = secHead('Schlaf', m != null ? hm(m) : null);
  if (m == null) return [head, lines(lrow({ class: 'lr tap', onclick: () => openSleep() }, h('span', { class: 'add', text: 'Letzte Nacht eintragen' })))];
  // Zeitstrahl von 21 bis 10 Uhr
  const pos = t => { let v = toMin(t) - 21 * 60; if (v < 0) v += 1440; return Math.max(0, Math.min(100, v / (13 * 60) * 100)); };
  const l = pos(s.bed), r = pos(s.wake);
  return [head, h('div', { class: 'ln pad tap sleep', onclick: () => openSleep() },
    h('div', { class: 'tl' }, h('i', { style: `left:${l}%;right:${100 - r}%` })),
    h('div', { class: 'ax' }, h('span', { style: `left:${l}%`, text: s.bed }), h('span', { style: `left:${r}%`, text: s.wake })))];
}
function dayPicker(d, onChange) {
  const di = h('input', { class: 'inp', type: 'date', value: d, max: today(), onchange: e => onChange(e.target.value || today()) });
  return di;
}
function openSleep(d0) {
  let d = d0 || today();
  const draw = () => {
    const s = sleepOf(d) || {};
    const save = () => { if (bi.value && wi.value) db.collection('sleep').doc(`${slug(me())}_${d}`).set({ who: me(), date: d, bed: bi.value, wake: wi.value }); };
    const bi = h('input', { class: 'inp', type: 'time', value: s.bed || '23:30', onchange: save });
    const wi = h('input', { class: 'inp', type: 'time', value: s.wake || '07:00', onchange: save });
    openSheet('Schlaf', [h('div', { class: 'form' },
      h('label', { class: 'fl' }, h('span', { text: 'Nacht auf' }), dayPicker(d, v => { d = v; draw(); })),
      h('label', { class: 'fl' }, h('span', { text: 'Eingeschlafen' }), bi),
      h('label', { class: 'fl' }, h('span', { text: 'Aufgewacht' }), wi),
      h('button', { class: 'btn p done', onclick: () => { save(); closeSheet(); render(); } }, 'Fertig'))]);
  };
  draw();
}

/* ---------- To-dos ---------- */
const REPEAT = [['', 'Nie'], ['daily', 'Täglich'], ['workdays', 'Werktags'], ['weekly', 'Wöchentlich'], ['monthly', 'Monatlich']];
const REMIND = [['off', 'Nicht'], ['0', 'Zur Uhrzeit'], ['5', '5 Min. vorher'], ['15', '15 Min. vorher'], ['30', '30 Min. vorher'], ['60', '1 Std. vorher']];
const repLabel = r => (REPEAT.find(x => x[0] === r) || ['', ''])[1];
function dueOn(x, ds) { // gilt dieses wiederkehrende To-do an diesem Tag?
  const start = x.date || ds; if (!x.repeat || ds < start) return false;
  const d = parseYmd(ds), s = parseYmd(start);
  if (x.repeat === 'daily') return true;
  if (x.repeat === 'workdays') return d.getDay() > 0 && d.getDay() < 6;
  if (x.repeat === 'weekly') return d.getDay() === s.getDay();
  if (x.repeat === 'monthly') return d.getDate() === s.getDate();
  return false;
}
const isDone = (x, ds) => x.repeat ? !!(x.doneDays || {})[ds] : !!x.done;
function todayTodos() {
  const t = today(), tm = x => x.time || '99';
  return mine(todos).filter(x => x.repeat ? dueOn(x, t) : (x.date || t) <= t && (!x.done || x.doneOn === t))
    .sort((a, b) => (isDone(a, t) - isDone(b, t)) || (tm(a) < tm(b) ? -1 : tm(a) > tm(b) ? 1 : 0) || (a.created || 0) - (b.created || 0));
}
function laterTodos() { const t = today(); return mine(todos).filter(x => !x.repeat && !x.done && x.date > t).sort((a, b) => a.date < b.date ? -1 : 1); }
function repeatTodos() { return mine(todos).filter(x => x.repeat); }
function toggleTodo(x) {
  const t = today();
  if (x.repeat) { const dd = Object.assign({}, x.doneDays); if (dd[t]) delete dd[t]; else dd[t] = true; db.collection('todos').doc(x.id).update({ doneDays: dd }); }
  else db.collection('todos').doc(x.id).update({ done: !x.done, doneOn: x.done ? '' : t });
}
function todoRow(x, mode) {
  const t = today(), done = mode === 'rep' ? false : isDone(x, t);
  let meta = '';
  if (mode === 'later' && x.date) { const d = parseYmd(x.date); meta = x.date === ymd(addDays(new Date(), 1)) ? 'Morgen' : `${WD[(d.getDay() + 6) % 7]}, ${d.getDate()}. ${MON[d.getMonth()].slice(0, 3)}`; }
  if (mode === 'rep') meta = repLabel(x.repeat);
  meta = [meta, x.time || ''].filter(Boolean).join(', ');
  return lrow({ class: 'lr' + (done ? ' done' : '') },
    mode === 'rep' ? h('span', { class: 'rp' }, svgEl('<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.7M20 4v4.7h-4.7M20 12a8 8 0 0 1-13.7 5.6L4 15.3M4 20v-4.7h4.7"/></svg>'))
      : h('button', { class: 'ckb' + (done ? ' x' : ''), 'aria-label': 'Erledigt', onclick: () => toggleTodo(x) }),
    h('span', { class: 'tx tap', text: x.text, onclick: () => openTodo(x) }),
    meta ? h('span', { class: 'n', text: meta }) : null);
}
function addRow(ph, onAdd) {
  const inp = h('input', { placeholder: ph, enterkeyhint: 'done' });
  const go = () => { if (inp.value.trim()) { onAdd(cap(inp.value.trim())); inp.value = ''; } };
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  inp.addEventListener('blur', go);
  return lrow({ class: 'lr addr' }, h('span', { class: 'plus', text: '+' }), inp);
}
function addTodo(text, date) { db.collection('todos').doc().set({ who: me(), text, date: date || today(), time: '', repeat: '', done: false, doneOn: '', doneDays: {}, created: Date.now() }); }
function openTodo(x) {
  const up = o => { Object.assign(x, o); db.collection('todos').doc(x.id).update(o); };
  const ti = h('input', { class: 'inp', value: x.text, onchange: e => e.target.value.trim() && up({ text: e.target.value.trim() }) });
  const di = h('input', { class: 'inp', type: 'date', value: x.date || today(), onchange: e => up({ date: e.target.value || today() }) });
  const rem = h('div', { class: 'chips' }), remL = h('div', { class: 'fl' }, h('span', { text: 'Erinnern' }));
  const drawRem = () => { const cur = x.remind === undefined || x.remind === '' ? '15' : String(x.remind); remL.style.display = rem.style.display = x.time ? '' : 'none'; rem.replaceChildren(...REMIND.map(([k, l]) => h('button', { class: 'cp' + (cur === k ? ' on' : ''), onclick: () => { up({ remind: k === 'off' ? 'off' : +k }); drawRem(); } }, l))); };
  const hi = h('input', { class: 'inp', type: 'time', value: x.time || '', onchange: e => { up({ time: e.target.value }); drawRem(); } });
  drawRem();
  const rep = h('div', { class: 'chips' });
  const drawRep = () => rep.replaceChildren(...REPEAT.map(([k, l]) => h('button', { class: 'cp' + ((x.repeat || '') === k ? ' on' : ''), onclick: () => { up({ repeat: k }); drawRep(); } }, l)));
  drawRep();
  openSheet('To-do', [h('div', { class: 'form' }, ti,
    h('label', { class: 'fl' }, h('span', { text: 'Ab' }), di),
    h('label', { class: 'fl' }, h('span', { text: 'Uhrzeit' }), hi), remL, rem,
    h('div', { class: 'fl' }, h('span', { text: 'Wiederholen' })), rep,
    h('button', { class: 'btn danger', style: 'width:100%;margin-top:8px', onclick: () => { db.collection('todos').doc(x.id).delete(); closeSheet(); } }, 'Löschen'))]);
}

/* ---------- Ziele ---------- */
function weekDays() { const m = monday(new Date()); return [...Array(7)].map((_, i) => ymd(addDays(m, i))); }
function toggleGoal(g) { const t = today(), days = Object.assign({}, g.days); if (days[t]) delete days[t]; else days[t] = true; db.collection('goals').doc(g.id).update({ days }); }
function goalRow(g) {
  const on = !!(g.days || {})[today()];
  return lrow({ class: 'lr goal' },
    h('button', { class: 'ckb' + (on ? ' x' : ''), 'aria-label': 'Heute geschafft', onclick: () => toggleGoal(g) }),
    h('span', { class: 'tx tap', text: g.title, onclick: () => openGoal(g) }),
    h('span', { class: 'wk' }, ...weekDays().map(d => h('i', { class: (g.days || {})[d] ? 'y' : '' }))));
}
function openGoal(g) {
  const ti = h('input', { class: 'inp', value: g.title, onchange: e => e.target.value.trim() && db.collection('goals').doc(g.id).update({ title: e.target.value.trim() }) });
  openSheet('Ziel', [h('div', { class: 'form' }, ti,
    h('button', { class: 'btn danger', style: 'width:100%', onclick: () => { db.collection('goals').doc(g.id).delete(); closeSheet(); } }, 'Löschen'))]);
}


/* ---------- Vorschlag: was heute noch passt ---------- */
function mealTip() {
  const name = me(), pf = profiles[name]; if (!pf) return [];
  const t = today(), d = dayIntake(name, t); if (!d.logged) return [];
  const refs = allRefs(needsOf(pf)), kcal = Math.round(refs[0][0] - d.tot[0]), prot = Math.round(refs[1][0] - d.tot[1]);
  if (kcal < 150) return [secHead('Vorschlag'), h('div', { class: 'ln pad tip' }, h('div', { class: 'tipt', text: 'Kalorien sind für heute gedeckt.' }))];
  // welcher Nährstoff fehlt heute am meisten (ohne Makros und ohne „nicht zu viel“)
  let worst = null; for (const [, keys] of NUT_GROUPS) for (const i of keys) { if (MACRO.has(i) || LIMIT_KEYS.has(i) || i === 1 || !refs[i]) continue; const p = d.tot[i] / refs[i][0]; if (!worst || p < worst.p) worst = { i, p, nm: refs[i][1] }; }
  const foods = [...new Set([...(prot > 15 ? suggestFoods(1).slice(0, 2) : []), ...(worst ? suggestFoods(worst.i).slice(0, 3) : [])])].slice(0, 4);
  return [secHead('Vorschlag'), h('div', { class: 'ln pad tip' },
    h('div', { class: 'tipt' }, `Heute noch offen: ${de(kcal)} kcal` + (prot > 5 ? ` und ${de(prot)} g Eiweiß` : '')),
    worst ? h('div', { class: 'tips', text: `Am wenigsten bisher: ${worst.nm}` }) : null,
    foods.length ? h('div', { class: 'foods', text: 'Passt gut: ' + foods.join(', ') }) : null)];
}


/* ---------- Eintragen: Schlaf, Training, Gegessen ---------- */
const TRAIN = [['kraft', 'Kraft'], ['ausdauer', 'Ausdauer'], ['sonst', 'Sonstiges']];
function trainOf(date) { return trainings.filter(x => x.who === me() && x.date === date); }
function trainMin(date) { return trainOf(date).reduce((a, x) => a + (x.min || 0), 0); }
function inputBlock() {
  const t = today(), sm = sleepMinutes(sleepOf(t)), tr = trainOf(t), pf = profiles[me()];
  const kc = pf ? Math.round(dayIntake(me(), t).tot[0]) : 0, logged = !!diary[me() + '_' + t];
  const trTxt = tr.length ? tr.map(x => `${x.min} min ${(TRAIN.find(k => k[0] === x.kind) || ['', ''])[1]}`).join(', ') : '';
  const row = (label, val, fn) => lrow({ class: 'lr tap', onclick: fn }, h('span', { class: 'tx', text: label }), h('span', { class: 'n', text: val || 'Eintragen' }), h('span', { class: 'chev', text: '›' }));
  return [secHead('Eintragen'), h('div', { class: 'ln' },
    row('Training', trTxt, () => openTraining()),
    row('Gegessen', logged ? `${de(kc)} kcal` : '', () => openDiary(me(), t, render)))];
}
function openTraining(d0) {
  let d = d0 || today(), kind = 'kraft';
  const draw = () => {
    const id = `${slug(me())}_${d}_${Date.now()}`;
    const mi = h('input', { class: 'inp', type: 'number', inputmode: 'numeric', placeholder: 'Minuten', value: '' });
    const kinds = h('div', { class: 'chips' });
    const save = () => { const m = parseInt(mi.value, 10); if (m > 0) db.collection('training').doc(id).set({ who: me(), date: d, kind, min: m }); };
    const drawK = () => kinds.replaceChildren(...TRAIN.map(([k, l]) => h('button', { class: 'cp' + (k === kind ? ' on' : ''), onclick: () => { kind = k; drawK(); save(); } }, l)));
    mi.addEventListener('input', save); drawK();
    const list = trainOf(d);
    openSheet('Training', [h('div', { class: 'form' },
      h('label', { class: 'fl' }, h('span', { text: 'Tag' }), dayPicker(d, v => { d = v; draw(); })),
      kinds, h('label', { class: 'fl' }, h('span', { text: 'Dauer' }), mi),
      ...list.map(x => h('div', { class: 'fl' }, h('span', { class: 'muted', text: `${x.min} min ${(TRAIN.find(k => k[0] === x.kind) || ['', ''])[1]}` }), h('button', { class: 'btn g sm', onclick: () => { db.collection('training').doc(x.id).delete(); draw(); } }, 'Löschen'))),
      h('button', { class: 'btn p done', onclick: () => { save(); closeSheet(); render(); } }, 'Fertig'))]);
  };
  draw();
}

function trainBars(days) {
  let groups;
  if (statRange === 'year') { const by = {}; days.forEach(d => { const k = d.slice(0, 7); (by[k] = by[k] || []).push(d); }); groups = Object.keys(by).sort().slice(-12).map(k => ({ lbl: MON[+k.slice(5) - 1][0], days: by[k] })); }
  else groups = days.map((d, i) => ({ lbl: statRange === 'week' ? WD[(parseYmd(d).getDay() + 6) % 7] : (i % 5 === 4 ? String(parseYmd(d).getDate()) : ''), days: [d] }));
  const vals = groups.map(g => g.days.reduce((a, d) => a + trainMin(d), 0)), total = vals.reduce((a, b) => a + b, 0);
  const n = days.reduce((a, d) => a + trainOf(d).length, 0), max = Math.max(60, ...vals);
  return [secHead('Training', total ? `${n} mal, ${hm(total)}` : null),
    h('div', { class: 'ln tap train', onclick: () => openTraining() }, total ? h('div', { class: 'bars' + (statRange === 'month' ? ' thin' : '') }, ...groups.map((g, k) => h('div', {}, h('b', { style: `height:${vals[k] ? Math.max(4, vals[k] / max * 96) : 0}px` }), h('span', { text: g.lbl }))))
      : h('div', { class: 'add', text: 'Noch kein Training eingetragen' }))];
}

/* ---------- Start, To-dos, News ---------- */
PAGES.start = function () {
  const t = today(), td = todayTodos(), gl = mine(goals);
  const openT = td.filter(x => !isDone(x, t)), openG = gl.filter(g => !(g.days || {})[t]);
  const all = td.length + gl.length, open = openT.length + openG.length;
  const meals = planOn(t), shop = items.filter(i => !i.checked).length;
  return h('div', { class: 'pg' },
    ...sleepBlock(),
    ...inputBlock(),
    secHead('Heute', all ? `${all - open} von ${all}` : null),
    h('div', { class: 'ln todo' }, ...openT.map(x => todoRow(x)), ...openG.map(goalRow), addRow('Neues To-do', s => addTodo(s))),
    ...foodTips(),
    ...suppTip(),
    secHead('Essen'),
    h('div', { class: 'ln food' }, ...meals.map(p => lrow({ class: 'lr tap', onclick: () => goTab('cal', 1) }, h('span', { class: 'tx', text: p.title || (recipeOf(p) || {}).title || '' }), p.meal ? h('span', { class: 'n', text: p.meal }) : null)),
      lrow({ class: 'lr tap', onclick: () => goTab('list', 1) }, h('span', { class: 'tx', text: 'Einkaufsliste' }), h('span', { class: 'n', text: shop ? String(shop) : 'leer' }))));
};
function openAdd(kind) {
  const ti = h('input', { class: 'inp', placeholder: kind === 'goal' ? 'z. B. 10 Seiten lesen' : 'Was steht an?' });
  const di = h('input', { class: 'inp', type: 'date', value: ymd(addDays(new Date(), 1)) });
  const ok = () => { const v = cap(ti.value.trim()); if (!v) return closeSheet();
    if (kind === 'goal') db.collection('goals').doc().set({ who: me(), title: v, days: {}, created: Date.now() }); else addTodo(v, di.value || ymd(addDays(new Date(), 1)));
    closeSheet(); };
  ti.addEventListener('keydown', e => { if (e.key === 'Enter') ok(); });
  openSheet(kind === 'goal' ? 'Neues Ziel' : 'Für später', [h('div', { class: 'form' }, ti, kind === 'goal' ? null : h('label', { class: 'fl' }, h('span', { text: 'Tag' }), di), h('button', { class: 'btn p done', onclick: ok }, 'Fertig'))]);
  setTimeout(() => ti.focus(), 300);
}
PAGES.todo = function () {
  const td = todayTodos(), gl = mine(goals), later = laterTodos(), rep = repeatTodos(), t = today();
  return h('div', { class: 'pg' },
    secHead('Heute', td.length ? `${td.filter(x => isDone(x, t)).length} von ${td.length}` : null),
    h('div', { class: 'ln todo' }, ...td.map(x => todoRow(x)), addRow('Neues To-do', s => addTodo(s))),
    gl.length ? secHead('Ziele jeden Tag', 'diese Woche') : null,
    gl.length ? h('div', { class: 'ln goals' }, ...gl.map(goalRow)) : null,
    later.length ? secHead('Später', String(later.length)) : null,
    later.length ? h('div', { class: 'ln todo' }, ...later.map(x => todoRow(x, 'later'))) : null,
    rep.length ? secHead('Wiederkehrend', String(rep.length)) : null,
    rep.length ? h('div', { class: 'ln todo' }, ...rep.map(x => todoRow(x, 'rep'))) : null,
    h('div', { class: 'links' }, h('button', { onclick: () => openAdd('goal') }, 'Neues Ziel'), h('button', { onclick: () => openAdd('later') }, 'Für später')));
};

/* ---------- Statistik ---------- */
const openGroups = new Set();
function statDays() { if (statRange === 'day') return [ymd(addDays(new Date(), -statDay))]; const n = statRange === 'day' ? 1 : statRange === 'week' ? 7 : statRange === 'month' ? 30 : 365; return [...Array(n)].map((_, i) => ymd(addDays(new Date(), i - n + 1))); }
function sleepBars(days) {
  let groups;
  if (statRange === 'year') {
    const by = {}; days.forEach(d => { const k = d.slice(0, 7); (by[k] = by[k] || []).push(d); });
    groups = Object.keys(by).sort().slice(-12).map(k => ({ lbl: MON[+k.slice(5) - 1][0], days: by[k] }));
  } else groups = days.map((d, i) => ({ lbl: statRange === 'week' ? WD[(parseYmd(d).getDay() + 6) % 7] : (i % 5 === 4 ? String(parseYmd(d).getDate()) : ''), days: [d] }));
  const avgOf = ds => { const v = ds.map(d => sleepMinutes(sleepOf(d))).filter(x => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const vals = groups.map(g => avgOf(g.days)), all = vals.filter(x => x != null);
  const avg = all.length ? Math.round(avgOf(days)) : null, max = Math.max(600, ...all), y = m => Math.max(4, m / max * 96);
  return [secHead('Schlaf', avg != null ? (days.length === 1 ? hm(avg) : `im Schnitt ${hm(avg)}`) : null),
    h('div', { class: 'ln pad tap sleep', onclick: () => openSleep() },
      all.length ? h('div', { class: 'bars' + (statRange === 'month' ? ' thin' : '') },
        h('div', { class: 'eight', style: `bottom:${22 + y(480)}px` }, h('span', { text: '8 h' })),
        ...groups.map((g, k) => h('div', {}, h('b', { class: vals[k] != null && vals[k] >= 480 ? 'ok' : '', style: `height:${vals[k] != null ? y(vals[k]) : 0}px` }), h('span', { text: g.lbl }))))
        : h('div', { class: 'add', text: 'Noch kein Schlaf eingetragen' }))];
}
function goalStats(days) {
  const gl = mine(goals); if (!gl.length) return [];
  let hit = 0, tot = 0;
  const rows = gl.map(g => {
    const from = g.created ? ymd(new Date(g.created)) : days[0]; const ds = days.filter(d => d >= from);
    const n = ds.filter(d => (g.days || {})[d]).length; hit += n; tot += ds.length;
    const strip = statRange === 'year' ? null : h('div', { class: 'gstrip' + (statRange === 'month' ? ' m' : '') }, ...days.map(d => h('i', { class: d < from ? 'pre' : (g.days || {})[d] ? 'y' : '' })));
    return h('div', { class: 'lr gr' }, h('div', { class: 'gtop' }, h('span', { class: 'tx', text: g.title }), h('span', { class: 'n', text: `${n} von ${ds.length}` })), strip);
  });
  return [secHead('Ziele', tot ? `${Math.round(hit / tot * 100)} % geschafft` : null), h('div', { class: 'ln goals' }, ...rows)];
}
// Ampel: ab 80 % grün, ab 60 % gelb, ab 40 % orange, darunter rot; bei „nicht zu viel“ umgekehrt
function lvl(pct, limit) { if (limit) return pct <= 100 ? 'g' : pct <= 125 ? 'y' : pct <= 150 ? 'o' : 'r'; return pct >= 80 ? 'g' : pct >= 60 ? 'y' : pct >= 40 ? 'o' : 'r'; }
function groupPct(rs) { const lim = rs.every(r => LIMIT_KEYS.has(r.i)); if (lim) return Math.max(...rs.map(r => r.pct)); return Math.round(rs.reduce((a, r) => a + Math.min(100, r.pct), 0) / rs.length); }
function nutRowsList(rs) { return rs.map(r => lrow({}, h('span', { class: 'tx', text: r.nm }), h('span', { class: 'n', text: `${r.pct} %` }), h('span', { class: 'mb ' + r.st }, h('i', { style: `width:${Math.min(100, r.pct)}%` })))); }
function openNutList(title, rs, note) { openSheet(title, [note ? h('div', { class: 'sheetnote', text: note }) : null, h('div', { class: 'ln' }, ...nutRowsList(rs))]); }
function nutStats(days) {
  const name = me(), pf = profiles[name];
  if (!pf) return [secHead('Nährstoffe'), lines(lrow({ class: 'lr tap', onclick: () => openProfileEdit(name, render) }, h('span', { class: 'add', text: 'Angaben machen, damit dein Bedarf berechnet wird' })))];
  const d = rangeData(name, days), refs = allRefs(needsOf(pf));
  if (!d.n) return [secHead('Kalorien'), lines(lrow({ class: 'lr tap', onclick: () => openDiary(name, days[days.length - 1], render) }, h('span', { class: 'add', text: 'Noch nichts gegessen eingetragen' })))];
  const rows = {};
  for (const [, keys] of NUT_GROUPS) for (const i of keys) if (refs[i]) {
    const [ref, nm, unit] = refs[i], v = d.total[i] / d.n, pct = Math.round(v / ref * 100), st0 = nutState(i, pct);
    rows[i] = { i, nm, unit, v, ref, pct, st: lvl(pct, LIMIT_KEYS.has(i)) };
  }
  const k = rows[0], out = [];
  out.push(secHead('Kalorien', days.length === 1 ? 'antippen zum Ändern' : d.n === 1 ? 'an 1 Tag eingetragen' : `Schnitt aus ${d.n} eingetragenen Tagen`));
  out.push(h('div', { class: 'ln pad kcal' + (days.length === 1 ? ' tap' : ''), onclick: days.length === 1 ? () => openDiary(name, days[0], render) : null }, h('div', { class: 'big' }, h('b', { text: `${de(k.v)} kcal` }), h('span', { text: `von ${de(k.ref)} am Tag` })), h('span', { class: 'mb wide ' + k.st }, h('i', { style: `width:${Math.min(100, k.pct)}%` }))));
  const lack = Object.values(rows).filter(r => !MACRO.has(r.i) && !LIMIT_KEYS.has(r.i) && r.i !== 1).sort((a, b) => a.pct - b.pct).slice(0, 5);
  const groups = [['Fehlt am meisten', lack, 'Die Nährstoffe, von denen du im Schnitt am wenigsten hattest.'], ['Makros', [1, 3, 2].map(i => rows[i]).filter(Boolean)]];
  for (const [title, keys] of NUT_GROUPS) { const rs = keys.map(i => rows[i]).filter(r => r && !MACRO.has(r.i) && r.i !== 1); if (rs.length) groups.push([title, rs]); }
  out.push(secHead('Nährstoffe'));
  out.push(h('div', { class: 'ln menu' }, ...groups.map(([title, rs, note]) => lrow({ class: 'lr tap', onclick: () => openNutList(title, rs, note) },
    h('span', { class: 'tx', text: title }),
    title === 'Fehlt am meisten' ? h('span', { class: 'n', text: rs[0] ? rs[0].nm : '' }) : (() => { const gp = groupPct(rs), lim = rs.every(r => LIMIT_KEYS.has(r.i)); return h('span', { class: 'gsum ' + lvl(gp, lim) }, h('i'), lim ? (gp <= 100 ? 'im Rahmen' : `${gp} %`) : `${gp} %`); })(),
    h('span', { class: 'chev', text: '›' }))),
    (() => { const c = suppCheck(name), n = suppCount(c); return lrow({ class: 'lr tap', onclick: () => openSuppCheck() }, h('span', { class: 'tx', text: 'Supplemente' }), h('span', { class: 'n', text: n ? (n === 1 ? '1 Hinweis' : `${n} Hinweise`) : 'passt' }), h('span', { class: 'chev', text: '›' })); })(),
    lrow({ class: 'lr tap', onclick: () => { cachePage(); tab = 'nutri'; renderTabs(); render(); window.scrollTo(0, 0); } }, h('span', { class: 'tx', text: 'Einzelne Tage' }), h('span', { class: 'chev', text: '›' }))));
  return out;
}
function dayNav() {
  const go = n => { statDay = Math.max(0, statDay - n); renderHead(); render(); };
  const ds = ymd(addDays(new Date(), -statDay));
  return h('div', { class: 'pnav statnav' }, h('button', { class: 'ib', 'aria-label': 'Tag davor', onclick: () => go(-1) }, ic('chevron-left')), h('div', { text: statDay === 0 ? 'Heute' : statDay === 1 ? 'Gestern' : longDate(ds) }), h('button', { class: 'ib' + (statDay === 0 ? ' off' : ''), 'aria-label': 'Tag danach', onclick: () => go(1) }, ic('chevron-right')));
}
PAGES.stat = function () { const days = statDays(); if (statRange === 'day') return h('div', { class: 'pg' }, dayNav(), ...nutStats(days), ...sleepBars(days), ...trainBars(days), ...goalStats(days)); return h('div', { class: 'pg' }, ...sleepBars(days), ...trainBars(days), ...goalStats(days), ...nutStats(days)); };
