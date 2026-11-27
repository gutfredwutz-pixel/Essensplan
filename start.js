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
PAGES.news = function () {
  return h('div', { class: 'pg' }, h('div', { class: 'ln pad' }, h('p', { class: 'soon', text: 'Hier stehen bald Nachrichten aus Quellen, die du aussuchst, kurz zusammengefasst.' })));
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
const DETAIL = new Set([1, 2, 3, 23]);
function nutRowsList(rs, ctx) { return rs.map(r => { const tap = ctx && DETAIL.has(r.i); return lrow(tap ? { class: 'lr tap', onclick: () => openNutDetail(r.i, ctx) } : {}, h('span', { class: 'tx', text: r.nm }), h('span', { class: 'n', text: `${r.pct} %` }), h('span', { class: 'mb ' + r.st }, h('i', { style: `width:${Math.min(100, r.pct)}%` })), tap ? h('span', { class: 'chev', text: '›' }) : null); }); }
function openNutList(title, rs, note, ctx) { if (ctx) ctx.back = () => openNutList(title, rs, note, ctx); openSheet(title, [note ? h('div', { class: 'sheetnote', text: note }) : null, h('div', { class: 'ln' }, ...nutRowsList(rs, ctx))]); }

/* ---- Details zu Fett, Omega-3, Kohlenhydraten und Eiweiß (Werte im Schnitt pro eingetragenem Tag) ---- */
const AA = [[40, 'Histidin', 15], [41, 'Isoleucin', 30], [42, 'Leucin', 59], [43, 'Lysin', 45], [44, 'Methionin und Cystein', 22], [45, 'Phenylalanin und Tyrosin', 38], [46, 'Threonin', 23], [47, 'Tryptophan', 6], [48, 'Valin', 39]]; // mg je g Eiweiß, WHO/FAO/UNU 2007 (Erwachsene)
const g1 = x => (x >= 10 ? fmtInt(x) : String(Math.round(x * 10) / 10).replace('.', ','));
function topSrc(d, i, n = 3) { const m = d.src[i] || {}; const tot = Object.values(m).reduce((a, b) => a + b, 0); return Object.entries(m).filter(([, x]) => x >= tot * 0.05).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k.replace(/ \(Supplement\)$/, '')).join(', '); }
function nutLine(name, val, pct, st, sub) {
  return lrow({ class: sub ? 'lr col' : 'lr' }, sub ? h('div', { class: 'top' }, h('span', { class: 'tx', text: name }), h('span', { class: 'n', text: val }), pct != null ? h('span', { class: 'mb ' + st }, h('i', { style: `width:${Math.min(100, pct)}%` })) : null) : null,
    sub ? h('div', { class: 'sub', text: sub }) : h('span', { class: 'tx', text: name }), sub ? null : h('span', { class: 'n', text: val }), !sub && pct != null ? h('span', { class: 'mb ' + st }, h('i', { style: `width:${Math.min(100, pct)}%` })) : null);
}
function openNutDetail(i, ctx) {
  const d = ctx.d, n = Math.max(1, d.n), avg = k => (d.total[k] || 0) / n, kcal = Math.max(1, avg(0)), pe = k => avg(k) * (k === 1 || k === 3 || k === 5 || k === 31 || k === 4 ? 4 : 9) / kcal * 100;
  const days = n === 1 ? 'an diesem Tag' : `im Schnitt pro Tag (${n} eingetragene Tage)`;
  const out = [];
  if (i === 2) {
    const sfa = avg(6), mufa = avg(24), pufa = avg(25), n6 = avg(26), n3 = avg(23), ratio = n3 > 0 ? n6 / n3 : null;
    out.push(h('p', { class: 'slinfo', text: `Fett ${days}: ${g1(avg(2))} g, das sind ${fmtInt(pe(2))} % deiner Kalorien. Empfohlen sind etwa 30 %. Wichtiger als die Menge ist, welche Fette es sind.` }));
    out.push(secHead('Fettarten'), h('div', { class: 'ln' },
      nutLine('Gesättigt', `${g1(sfa)} g / ${fmtInt(pe(6))} %`, pe(6) / 10 * 100, lvl(pe(6) / 10 * 100, true), `Höchstens 10 % der Kalorien (DGE). Vor allem in Butter, Käse, Wurst, Kokosfett. Bei dir vor allem aus: ${topSrc(d, 6) || '-'}`),
      nutLine('Einfach ungesättigt', `${g1(mufa)} g / ${fmtInt(pe(24))} %`, pe(24) / 10 * 100, lvl(pe(24) / 10 * 100), `Gut, gern der größte Teil des Fetts, etwa 10 % der Kalorien oder mehr. Olivenöl, Rapsöl, Nüsse, Avocado. Bei dir vor allem aus: ${topSrc(d, 24) || '-'}`),
      nutLine('Mehrfach ungesättigt', `${g1(pufa)} g / ${fmtInt(pe(25))} %`, pe(25) / 7 * 100, pe(25) > 10 ? 'y' : lvl(pe(25) / 7 * 100), `7 bis 10 % der Kalorien (DGE). Darunter Omega-6 und Omega-3. Bei dir vor allem aus: ${topSrc(d, 25) || '-'}`)));
    out.push(secHead('Omega-6 und Omega-3'), h('div', { class: 'ln' },
      nutLine('Omega-6', `${g1(n6)} g / ${g1(n6 * 9 / kcal * 100)} %`, n6 * 9 / kcal * 100 / 2.5 * 100, lvl(n6 * 9 / kcal * 100 / 2.5 * 100), 'Richtwert 2,5 % der Kalorien (DGE). Steckt in Sonnenblumenöl, Distelöl, Nüssen, Fleisch.'),
      lrow({ class: 'lr tap', onclick: () => { const b = ctx.back; ctx.back = () => openNutDetail(2, Object.assign(ctx, { back: b })); openNutDetail(23, ctx); } }, h('span', { class: 'tx', text: 'Omega-3' }), h('span', { class: 'n', text: `${g1(n3)} g` }), h('span', { class: 'chev', text: '›' })),
      nutLine('Verhältnis', ratio == null ? '-' : `${g1(ratio)} zu 1`, ratio == null ? null : Math.min(100, 5 / ratio * 100), ratio == null ? 'r' : ratio <= 5 ? 'g' : ratio <= 8 ? 'y' : ratio <= 12 ? 'o' : 'r', 'Gut sind höchstens 5 zu 1 (DGE). Typisch in Deutschland sind etwa 7 bis 10 zu 1. Besser wird es mit Rapsöl statt Sonnenblumenöl, Walnüssen, Leinöl und Fisch.')));
  } else if (i === 23) {
    const n3 = avg(23), ala = avg(27), epa = avg(28) * 1000, dha = avg(29) * 1000, dpa = avg(30) * 1000, ed = epa + dha, alaRef = kcal * 0.005 / 9;
    out.push(h('p', { class: 'slinfo', text: `Omega-3 ist nicht gleich Omega-3. ALA kommt aus Pflanzen (Leinöl, Rapsöl, Walnüsse, Chia). EPA und DHA kommen fast nur aus fettem Seefisch und Algenöl und sind die Formen, die Herz und Gehirn direkt nutzen. Der Körper macht aus ALA nur wenig EPA und noch weniger DHA, meist unter 10 %. Deshalb zählen EPA und DHA extra.` }));
    out.push(secHead('Deine Werte', days), h('div', { class: 'ln' },
      nutLine('ALA (pflanzlich)', `${g1(ala)} g`, ala / alaRef * 100, lvl(ala / alaRef * 100), `Richtwert 0,5 % der Kalorien, für dich etwa ${g1(alaRef)} g (DGE). Bei dir vor allem aus: ${topSrc(d, 27) || '-'}`),
      nutLine('EPA und DHA', `${fmtInt(ed)} mg`, ed / 250 * 100, lvl(ed / 250 * 100), `Empfohlen etwa 250 mg am Tag (EFSA), das schafft man mit 1 bis 2 Portionen fettem Fisch pro Woche (Lachs, Hering, Makrele). Davon EPA ${fmtInt(epa)} mg, DHA ${fmtInt(dha)} mg${dpa > 5 ? `, dazu DPA ${fmtInt(dpa)} mg` : ''}. Bei dir aus: ${topSrc(d, 28) || topSrc(d, 29) || 'nichts'}`),
      nutLine('Omega-3 gesamt', `${g1(n3)} g`, null, null, n3 > 0 ? `Davon ${fmtInt(ala / n3 * 100)} % ALA und ${fmtInt((ed + dpa) / 1000 / n3 * 100)} % aus Fisch oder Algen.` : '')));
    out.push(h('div', { class: 'sheetnote', text: 'Ein Tag ohne Fisch ist kein Problem: Der Körper speichert EPA und DHA. Aussagekräftig ist der Schnitt über eine Woche oder länger.' }));
  } else if (i === 3) {
    const carb = avg(3), sug = avg(5), lac = avg(39), st = avg(31), fib = avg(4);
    // Qualität je Lebensmittel: mindestens 1 g Ballaststoff je 10 g Kohlenhydrate gilt als hochwertig
    const q = { good: [0, []], mid: [0, []], low: [0, []], milk: [0, []] };
    for (const [lab, c0] of Object.entries(d.src[3] || {})) {
      const c = c0 / n, f = ((d.src[4] || {})[lab] || 0) / n, l = ((d.src[39] || {})[lab] || 0) / n; if (c < 0.5) continue;
      const k = l / c > 0.5 ? 'milk' : f * 10 >= c ? 'good' : f * 20 >= c ? 'mid' : 'low';
      q[k][0] += c; q[k][1].push([lab, c]);
    }
    const names = k => q[k][1].sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]).join(', ');
    const tot = Math.max(1, q.good[0] + q.mid[0] + q.low[0] + q.milk[0]);
    out.push(h('p', { class: 'slinfo', text: `Kohlenhydrate ${days}: ${g1(carb)} g. Hochwertig sind Kohlenhydrate mit vielen Ballaststoffen: Vollkorn, Haferflocken, Hülsenfrüchte, Kartoffeln mit Schale, Obst und Gemüse. Faustregel: mindestens 1 g Ballaststoffe auf 10 g Kohlenhydrate. Weißmehl, Süßes und Säfte liegen deutlich darunter.` }));
    out.push(secHead('Wie hochwertig'), h('div', { class: 'ln' },
      nutLine('Hochwertig', `${fmtInt(q.good[0])} g / ${fmtInt(q.good[0] / tot * 100)} %`, q.good[0] / tot * 100, 'g', names('good') ? `Aus: ${names('good')}` : 'Noch nichts davon'),
      nutLine('Mittel', `${fmtInt(q.mid[0])} g / ${fmtInt(q.mid[0] / tot * 100)} %`, q.mid[0] / tot * 100, 'y', names('mid') ? `Aus: ${names('mid')}` : '-'),
      nutLine('Eher nicht so gut', `${fmtInt(q.low[0])} g / ${fmtInt(q.low[0] / tot * 100)} %`, q.low[0] / tot * 100, 'r', names('low') ? `Aus: ${names('low')}` : '-'),
      q.milk[0] > 0 ? nutLine('Aus Milchprodukten', `${fmtInt(q.milk[0])} g`, null, null, `Milchzucker, neutral. Aus: ${names('milk')}`) : null));
    out.push(secHead('Woraus sie bestehen'), h('div', { class: 'ln' },
      nutLine('Stärke', `${g1(st)} g`, null, null, 'Langsame Energie aus Brot, Nudeln, Reis, Kartoffeln.'),
      nutLine('Zucker', `${g1(sug)} g / ${fmtInt(pe(5))} %`, pe(5) / 10 * 100, lvl(pe(5) / 10 * 100, true), `Davon ${g1(lac)} g Milchzucker. Zugesetzter Zucker sollte unter 10 % der Kalorien bleiben (DGE, WHO). Hier ist aller Zucker gezählt, auch der aus Obst und Milch, der weniger problematisch ist.`),
      nutLine('Ballaststoffe', `${g1(fib)} g`, fib / 30 * 100, lvl(fib / 30 * 100), 'Mindestens 30 g am Tag (DGE).')));
  } else if (i === 1) {
    const prot = avg(1), ref = (ctx.refs[1] || [0])[0];
    let pp = 0; const aa = AA.map(() => 0);
    for (const [lab, p0] of Object.entries(d.src[1] || {})) { const sum = AA.reduce((a, [k]) => a + ((d.src[k] || {})[lab] || 0), 0); if (sum <= 0) continue; pp += p0; AA.forEach(([k], j) => aa[j] += (d.src[k] || {})[lab] || 0); }
    const sc = AA.map(([, nm, r], j) => ({ nm, pct: pp > 0 ? aa[j] * 1000 / pp / r * 100 : 0 })), min = sc.reduce((a, b) => b.pct < a.pct ? b : a, sc[0]);
    const cov = d.total[1] > 0 ? pp / d.total[1] * 100 : 0, score = Math.min(100, Math.round(min.pct));
    out.push(h('p', { class: 'slinfo', text: `Eiweiß ${days}: ${g1(prot)} g von ${fmtInt(ref)} g. Für die Qualität zählt, ob alle 9 Eiweißbausteine, die der Körper nicht selbst bilden kann, im richtigen Verhältnis dabei sind. Das misst der Aminosäure-Score der WHO. Die biologische Wertigkeit ist ein älteres Maß nach demselben Prinzip.` }));
    if (pp > 0) {
      out.push(secHead('Eiweißqualität', `${score} %`), h('div', { class: 'ln' },
        nutLine(score >= 100 ? 'Alle Bausteine ausreichend' : `Am knappsten: ${min.nm}`, `${score} %`, score, lvl(score), score >= 100 ? 'Dein Eiweiß enthält alle unentbehrlichen Bausteine in genug Menge. Gute Kombinationen wie Getreide mit Hülsenfrüchten oder Milchprodukte gleichen sich gegenseitig aus.' : (min.nm === 'Lysin' ? 'Lysin ist in Getreide knapp. Hülsenfrüchte, Milchprodukte, Eier, Fisch oder Fleisch gleichen das aus.' : min.nm === 'Methionin und Cystein' ? 'In Hülsenfrüchten knapp. Getreide, Nüsse, Eier oder Milchprodukte gleichen das aus.' : 'Mehr Abwechslung bei den Eiweißquellen gleicht das aus.'))),
        secHead('Die Bausteine'), h('div', { class: 'ln' }, ...sc.map(x => nutLine(x.nm, `${fmtInt(x.pct)} %`, x.pct, lvl(x.pct)))),
        h('div', { class: 'sheetnote', text: `100 % heißt: so viel, wie die WHO je Gramm Eiweiß empfiehlt. Messwerte zu den Bausteinen gibt es für ${fmtInt(cov)} % deines Eiweißes.` }));
    } else out.push(h('div', { class: 'sheetnote', text: 'Für deine Lebensmittel gibt es noch keine Messwerte zu den Eiweißbausteinen.' }));
    out.push(secHead('Woher'), h('div', { class: 'ln' }, nutLine('Die größten Quellen', '', null, null, topSrc(d, 1, 5) || '-')));
  }
  out.push(h('div', { class: 'sheetnote', text: 'Nährwerte: Bundeslebensmittelschlüssel 4.0, Max Rubner-Institut (CC BY 4.0). Referenzwerte: DGE, EFSA, WHO.' }));
  openSheet({ 2: 'Fett', 23: 'Omega-3', 3: 'Kohlenhydrate', 1: 'Eiweiß' }[i], out);
  if (ctx.back) sheetBack = ctx.back;
}
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
  const ctx = { d, refs };
  out.push(h('div', { class: 'ln menu' }, ...groups.map(([title, rs, note]) => lrow({ class: 'lr tap', onclick: () => openNutList(title, rs, note, ctx) },
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
PAGES.stat = function () { if (!BLSNAME) loadBls().then(() => { if (tab === 'stat') render(); }).catch(() => { }); const days = statDays(); if (statRange === 'day') return h('div', { class: 'pg' }, dayNav(), ...nutStats(days), ...sleepBars(days), ...trainBars(days), ...goalStats(days)); return h('div', { class: 'pg' }, ...sleepBars(days), ...trainBars(days), ...goalStats(days), ...nutStats(days)); };
