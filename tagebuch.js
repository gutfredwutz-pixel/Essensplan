/* ============ Persönlich: Profile, Tagebuch, Verlauf ============ */
function personNames() { return (people.length ? people : PRESET).map(p => p.name); }

/* ---- Bedarf aus den Angaben schätzen (DGE-Referenzwerte, gerundet) ---- */
const PAL_OPTS = [
  [1.4, 'Viel Sitzen', 'Bürojob oder Studium, im Alltag wenig zu Fuß'],
  [1.55, 'Etwas Bewegung', 'Meist sitzend, dazu Wege zu Fuß oder mit dem Rad'],
  [1.7, 'Viel auf den Beinen', 'Zum Beispiel im Verkauf, in der Pflege oder Gastro'],
  [1.9, 'Körperlich hart', 'Zum Beispiel auf dem Bau oder in der Landwirtschaft']];
const SPORT_I = { 1: ['Locker', 0.03], 2: ['Mittel', 0.05], 3: ['Intensiv', 0.07] };
const STEPS_EXP = { 1.4: 4000, 1.55: 6000, 1.7: 9000, 1.9: 12000 };
function needsOf(pf) {
  const f = pf.sex === 'w', a = +pf.age || 30, w = +pf.weight || (f ? 62 : 75), hg = +pf.height || (f ? 167 : 180), bf = +pf.bodyFat || 0;
  const bmr = bf > 3 && bf < 60 ? 370 + 21.6 * w * (1 - bf / 100) : 10 * w + 6.25 * hg - 5 * a + (f ? -161 : 5);
  const basePal = +pf.pal || 1.55;
  const stepAdj = +pf.steps ? Math.max(-0.2, Math.min(0.3, (+pf.steps - (STEPS_EXP[basePal] || 6000)) * 0.0000225)) : 0;
  const sportAdj = (+pf.sportH || 0) * SPORT_I[pf.sportI || 2][1];
  const pal = basePal + stepAdj + sportAdj;
  const tdee = bmr * pal;
  const rate = +pf.rate || (pf.goal === 'zu' ? 0.25 : 0.5);
  const goalAdj = pf.goal === 'ab' ? -rate * 7700 / 7 : pf.goal === 'zu' ? rate * 7700 / 7 : 0;
  const extra = f && pf.special === 'schwanger' ? 250 : f && pf.special === 'stillend' ? 500 : 0;
  const kcal = Math.max(1200, tdee + goalAdj + extra);
  const R = JSON.parse(JSON.stringify(REF));
  const set = (i, m, w2) => { R[i][0] = f ? w2 : m; };
  set(8, 850, 700); set(10, 14, 12); set(11, 1.2, 1.0); set(12, 1.4, 1.1); set(13, 1.6, 1.4); set(16, 110, 95); set(19, 350, 300); set(20, 11, a >= 51 ? 14 : 16); set(21, 14, 8);
  R[22][0] = a >= 51 ? 180 : 200;
  // Neue Werte (DGE-Referenzwerte bzw. Schätzwerte; Phosphor, Mangan nach EFSA): Vitamin K, Niacin, Kupfer nach Geschlecht/Alter
  R[32][0] = f ? (a >= 51 ? 65 : 60) : (a >= 51 ? 80 : 70); R[33][0] = f ? (a < 25 ? 13 : 12) : (a < 25 ? 16 : 15); R[37][0] = f ? 1.25 : 1.5;
  if (pf.smoker === 'ja') R[16][0] = f ? 135 : 155;
  if (f && pf.special === 'schwanger') { R[14][0] = 550; R[22][0] = 230; R[20][0] = 27; R[15][0] = 4.5; R[21][0] = 10; }
  if (f && pf.special === 'stillend') { R[14][0] = 450; R[22][0] = 260; R[20][0] = 20; R[15][0] = 5.5; R[21][0] = 11; }
  const sp = +pf.sportH || 0;
  let pk = a >= 65 ? 1.0 : 0.8;
  if (sp >= 2) pk = { kraft: 1.6, ausdauer: 1.2, mix: 1.4 }[pf.train || 'mix'];
  if (pf.goal === 'ab' && sp >= 2) pk = Math.min(2.0, pk + 0.2);
  if (f && pf.special) pk = Math.max(pk, 1.0);
  const pAuto = Math.round(w * pk);
  const own = k => { const v = +String(pf[k] ?? '').replace(',', '.'); return v > 0 ? Math.round(v) : 0; };
  if (own('fibG')) R[4][0] = own('fibG');
  const P = own('protG') || pAuto; R[1][0] = P; pk = Math.round(P / w * 10) / 10;
  R[23][0] = Math.round(kcal * 0.005 / 9 * 10) / 10;
  const oC = own('carbG'), oF = own('fatG');
  const fat = oF || (oC ? Math.max(40, Math.round((kcal - P * 4 - oC * 4) / 9)) : Math.round(kcal * 0.3 / 9));
  const carb = oC || Math.max(80, Math.round((kcal - P * 4 - fat * 9) / 4));
  const M = { 0: [Math.round(kcal), 'Kalorien', 'kcal'], 2: [fat, 'Fett', 'g'], 3: [carb, 'Kohlenhydrate', 'g'] };
  const L = { 7: [6, 'Salz', 'g'], 5: [Math.round(kcal * 0.1 / 4), 'Zucker', 'g'], 6: [Math.round(kcal * 0.1 / 9), 'Gesättigte Fette', 'g'] };
  return { kcal, R, L, M, bmr, pal, tdee, goalAdj, extra, bmi: w / Math.pow(hg / 100, 2), bfUsed: bf > 3 && bf < 60, pk, pAuto, ownMacros: !!(own('protG') || oC || oF) };
}
function avgNeeds() {
  return { kcal: 2150, R: JSON.parse(JSON.stringify(REF)), L: JSON.parse(JSON.stringify(LIMITS)), M: { 0: [2150, 'Kalorien', 'kcal'], 2: [72, 'Fett', 'g'], 3: [270, 'Kohlenhydrate', 'g'] } };
}

/* ---- Supplemente ---- */
const MULTI = { 8: 400, 9: 5, 10: 12, 11: 1.1, 12: 1.4, 13: 1.4, 14: 200, 15: 2.5, 16: 80, 19: 60, 20: 5, 21: 5, 22: 100 };
const SUPP_PRESETS = [['Vitamin D', 9, 20], ['Vitamin B12', 15, 500], ['Omega-3-Kapsel', 23, 0.5], ['Magnesium', 19, 300], ['Eisen', 20, 14], ['Zink', 21, 10], ['Jod', 22, 100], ['Calcium', 18, 500], ['Folsäure', 14, 400], ['Vitamin C', 16, 200], ['Multivitamin', 'multi', 1]];
const FREQ = [[1, 'Täglich'], [0.5, 'Jeden 2. Tag'], [1 / 7, '1× pro Woche']];
function suppVec(s) {
  const v = new Array(NV).fill(0), k = (+s.freq || 1) * (+s.amt || 0);
  if (s.i === 'multi') { for (const i in MULTI) v[i] = MULTI[i] * k; } else v[s.i] = k;
  return v;
}

/* ---- Was an einem Tag gegessen wurde ---- */
function dayIntake(name, ds) {
  const tot = new Array(NV).fill(0), src = {};
  const add = (label, v, fac) => { for (let i = 0; i < NV; i++) { const x = (v[i] || 0) * fac; if (x > 0) { tot[i] += x; (src[i] = src[i] || {}); src[i][label] = (src[i][label] || 0) + x; } } };
  const e = diary[name + '_' + ds];
  let planned = false;
  for (const p of planOn(ds)) {
    const r = recipeOf(p); if (!r) continue; const n = recipeNutrition(r); if (!n.ok) continue;
    const fac = e && e.plans && e.plans[p.id] != null ? e.plans[p.id] : (p.portion || 1); planned = true; if (!fac) continue;
    for (const part of n.parts) add(part.name, part.v, part.gr / 100 / n.serv * fac);
  }
  if (e) for (const f of e.foods || []) if (f.v && f.gr) add(f.name, fullV(f.v, f.src), f.gr / 100);
  const counted = !!e || planned;
  const pf = profiles[name];
  if (counted && pf) for (const s of pf.supps || []) add(s.label + ' (Supplement)', suppVec(s), 1);
  const sv = counted && window.saltVec ? saltVec(pf) : null; if (sv) add('Jodsalz beim Kochen', sv, 1);
  const logged = !!e && ((e.foods || []).some(f => f.gr > 0 && f.v) || Object.values(e.plans || {}).some(x => +x > 0));
  return { tot, src, logged, counted };
}
function rangeData(name, days) {
  const total = new Array(NV).fill(0), src = {}; let n = 0, logged = 0; const per = {};
  for (const ds of days) {
    const d = dayIntake(name, ds); per[ds] = d; if (!d.logged) continue; n++; logged++;
    for (let i = 0; i < NV; i++) total[i] += d.tot[i];
    for (const i in d.src) for (const k in d.src[i]) { (src[i] = src[i] || {}); src[i][k] = (src[i][k] || 0) + d.src[i][k]; }
  }
  return { total, src, n, logged, per, unknown: new Set() };
}
function coverage(tot, R) { const ks = Object.keys(R); return ks.reduce((a, i) => a + Math.min(100, tot[i] / R[i][0] * 100), 0) / ks.length; }
const covState = p => p >= 85 ? 'good' : p >= 60 ? 'ok' : 'low';

/* ---- Auswahl oben: Wochenplan oder Person ---- */
function whoSeg(cur, start) { return null; 
}

/* ---- Persönliche Auswertung ---- */
let pRange = 'day', pSel = null;
function resetNutriState() { pRange = 'day'; pSel = null; }
function openPersonReport(name, start) {
  nutriWho = name;
  const pf = profiles[name];
  const content = [whoSeg(name, start)];
  if (!pf) {
    const go = () => openProfileEdit(name, () => openPersonReport(name, start));
    content.push(h('div', { class: 'pcta' }, h('button', { class: 'pctaart', 'aria-label': 'Angaben machen', onclick: go }, h('span', { text: '?' })), h('h3', { text: `Noch keine Angaben von ${name}` }),
      h('p', { text: `Körper, Alltag und Sport einmal eintragen. Danach rechnet die App mit ${name}s eigenem Bedarf statt mit Durchschnittswerten.` }),
      h('button', { class: 'btn grad', onclick: go }, 'Angaben machen')));
    return nutriOut('Nährstoffe', content, () => openPersonReport(name, start));
  }
  const today = ymd(new Date());
  if (!pSel) pSel = today;
  const re = () => openPersonReport(name, start);
  const selD = new Date(pSel); const ws = weekStartOf(selD); const we = addDays(ws, 6);
  const days = [...Array(7)].map((_, i) => ymd(addDays(ws, i)));
  const nd = needsOf(pf);
  const wk = rangeData(name, days);
  const dayLbl = ds => { const x = new Date(ds); return (ds === today ? 'Heute' : ds === ymd(addDays(new Date(), -1)) ? 'Gestern' : WDL[x.getDay()]) + `, ${x.getDate()}. ${MON[x.getMonth()]}`; };
  // Eintragen für den gewählten Tag
  const selName = pSel === today ? 'Heute' : pSel === ymd(addDays(new Date(), -1)) ? 'Gestern' : WDL[selD.getDay()];
  content.push(h('button', { class: 'btn grad big quick', onclick: () => openDiary(name, pSel, re) }, ic('microphone'), `${selName} eintragen`));
  content.push(h('div', { class: 'seg wide', style: 'margin-top:14px' }, ...[['day', 'Tag'], ['week', 'Woche']].map(([k, tt]) => h('button', { class: pRange === k ? 'on' : '', onclick: () => { pRange = k; re(); } }, tt))));
  const move = dir => { pSel = ymd(addDays(selD, 7 * dir)); re(); };
  const wnav = (h('div', { class: 'pnav' }, h('button', { class: 'ib', 'aria-label': 'Woche davor', onclick: () => move(-1) }, ic('chevron-left')),
    h('div', { text: `${ws.getDate()}. ${MON[ws.getMonth()].slice(0, 3)}. bis ${we.getDate()}. ${MON[we.getMonth()].slice(0, 3)}.` }),
    h('button', { class: 'ib', 'aria-label': 'Woche danach', onclick: () => move(1) }, ic('chevron-right'))));
  // Tage der Woche
  const strip = h('div', { class: 'dstrip week' });
  days.forEach(ds => {
    const x = wk.per[ds]; const c = x.counted ? coverage(x.tot, nd.R) : 0; const dt = new Date(ds);
    const sel = pRange === 'day' && ds === pSel;
    strip.append(h('button', { class: 'dj wd' + ((dt.getDay() + 6) % 7) + ' ' + (x.counted ? covState(c) : 'none') + (x.logged ? ' logged' : '') + (ds === today ? ' today' : '') + (sel ? ' sel' : ''), onclick: () => { pSel = ds; pRange = 'day'; re(); } },
      x.counted ? fill(Math.max(6, Math.min(100, c))) : null,
      h('span', { class: 'djl', text: WD[(dt.getDay() + 6) % 7] })));
  });
  content.push(h('div', { class: 'weekcard' }, wnav, strip));
  // Werte: ein Tag oder Durchschnitt der Woche
  let vals, src, n, scale, sub, meta, opt;
  if (pRange === 'day') {
    const x = wk.per[pSel] || dayIntake(name, pSel);
    vals = x.tot; src = x.src; n = x.counted ? 1 : 0; scale = 1;
    const sd = new Date(pSel); sub = pSel === today ? 'heute gedeckt' : `gedeckt am ${sd.getDate()}. ${MON[sd.getMonth()]}`;
    meta = n ? `${fmtInt(vals[0])} von ${fmtInt(nd.kcal)} kcal` : 'Noch nichts eingetragen';
    opt = { div: 1, perLabel: 'an diesem Tag', needTxt: 'Dein Bedarf pro Tag', back: re };
  } else {
    vals = wk.total; src = wk.src; n = wk.n; scale = 7;
    sub = 'vom Wochenbedarf gedeckt';
    meta = n ? `${fmtInt(vals[0])} von ${fmtInt(nd.kcal * 7)} kcal` : 'Noch nichts eingetragen';
    opt = { div: 1, perLabel: 'diese Woche', needTxt: 'Dein Bedarf für 7 Tage', back: re };
  }
  const cov = n ? coverage(vals.map(v => v / scale), nd.R) : 0;
  const sc7 = pRange === 'day' ? 1 : 7;
  const mac = [['Kalorien', 0, nd.kcal, 'kcal', 'k'], ['Eiweiß', 1, nd.R[1][0], 'g', 'p'], ['Kohlenhydrate', 3, nd.M[3][0], 'g', 'c'], ['Fett', 2, nd.M[2][0], 'g', 'f']];
  content.push(h('div', { class: 'rephero phero2 ' + covState(cov) },
    h('div', { class: 'ph2top' },
      h('div', { class: 'ph2ring' }, ring(cov, covState(cov), 104), h('span', { class: 'ph2pct', text: fmtInt(cov) + ' %' })),
      h('div', { class: 'ph2txt' }, h('b', { text: pRange === 'day' ? (pSel === today ? 'Heute' : `Am ${new Date(pSel).getDate()}. ${MON[new Date(pSel).getMonth()].slice(0, 3)}.`) : 'Diese Woche' }), h('span', { text: n ? 'gedeckt, über alle Nährstoffe' : 'Noch nichts eingetragen' }))),
    h('div', { class: 'macs' + (n ? '' : ' zero') }, ...mac.map(([l, i, need, u, k]) => {
      const v = vals[i] || 0, nn = need * sc7, p = Math.min(100, v / nn * 100);
      return h('div', { class: 'mac ' + k }, h('div', { class: 'macl' }, h('span', { text: l }), h('span', { class: 'macv' }, h('b', { text: fmtInt(v) }), ` / ${fmtInt(nn)} ${u}`)), h('div', { class: 'macbar' }, h('i', { style: `width:${Math.max(2, p)}%` })));
    }))));
  if (n) {
    const top1 = i => { const tt = Object.entries(src[i] || {}).sort((a, b) => b[1] - a[1])[0]; return tt ? tt[0].replace(' (Supplement)', '') : ''; };
    const dd = { src, n, unknown: new Set() };
    content.push(...nutSections(nutRows(nd, vals, scale), top1, r => openNutrient(r, dd, start, opt)));
  }
  nutriOut('Nährstoffe', content, re);
}
function weekStartOf(dt) { const x = dayOnly(dt); return addDays(x, -((x.getDay() + 6) % 7)); }

/* ---- Angaben einmalig ---- */
function openProfileEdit(name, back) {
  const dKey = 'ep_pfdraft_' + name; let draft = null; try { draft = JSON.parse(LS.get(dKey) || 'null'); } catch (e) { }
  const pf = JSON.parse(JSON.stringify(draft || profiles[name] || { sex: name === 'Frieda' ? 'w' : 'm', pal: 1.55, sportH: 2, sportI: 2, train: 'mix', goal: 'halten', diet: 'alles', smoker: 'nein', special: '', supps: [] }));
  pf.supps = pf.supps || []; pf.train = pf.train || 'mix'; pf.diet = pf.diet || 'alles'; pf.smoker = pf.smoker || 'nein'; if (pf.special == null) pf.special = '';
  let saveT = null;
  const persist = () => {
    LS.set(dKey, JSON.stringify(pf));
    clearTimeout(saveT);
    if (pf.age && pf.height && pf.weight && db) saveT = setTimeout(() => { db.collection('profiles').doc(name).set(pf).then(() => { profiles[name] = JSON.parse(JSON.stringify(pf)); LS.del(dKey); }).catch(() => { }); }, 700);
  };
  const draw = () => {
    persist();
    const nd = needsOf(pf);
    const segOf = (key, opts) => h('div', { class: 'seg wide' + (opts.some(o => o[1].length > 12) ? ' sm' : '') }, ...opts.map(([v, t]) => h('button', { class: (pf[key] === v || (key === 'rate' && pf.rate == null && v === (pf.goal === 'zu' ? 0.25 : 0.5))) ? 'on' : '', onclick: () => { pf[key] = v; draw(); } }, t)));
    const num = (key, lbl, unit, ph, opt) => {
      const i = h('input', { class: 'fin', type: 'text', inputmode: 'decimal', value: pf[key] != null && pf[key] !== '' ? String(pf[key]).replace('.', ',') : '', placeholder: ph, autocomplete: 'off' });
      const row = h('label', { class: 'frow' + (pf[key] ? '' : opt ? ' opt' : ' empty') }, h('span', { class: 'fl', text: lbl }), h('span', { class: 'fv' }, i, h('span', { class: 'fu', text: unit || '' })));
      i.addEventListener('input', () => { i.value = i.value.replace(/[^0-9,.]/g, '').replace('.', ','); pf[key] = i.value.replace(',', '.'); persist(); row.classList.toggle('empty', !i.value && !opt); row.classList.toggle('opt', !i.value && !!opt); res.replaceChildren(...resKids()); });
      return row;
    };
    const resKids = () => {
      const n = needsOf(pf); const ln = (a, b) => h('div', { class: 'resl' }, h('span', { text: a }), h('b', { text: b }));
      return [h('div', { class: 'reskcal', text: fmtInt(n.kcal) + ' kcal' }), h('div', { class: 'muted', style: 'margin-bottom:10px', text: 'am Tag' }),
        ln(n.bfUsed ? 'Grundumsatz aus Muskelmasse' : 'Grundumsatz', fmtInt(n.bmr) + ' kcal'),
        ln('Alltag, Schritte und Sport', '× ' + n.pal.toFixed(2).replace('.', ',')),
        n.goalAdj ? ln(n.goalAdj < 0 ? 'Abnehmen' : 'Zunehmen', (n.goalAdj > 0 ? '+ ' : '− ') + fmtInt(Math.abs(n.goalAdj)) + ' kcal') : null,
        n.extra ? ln(pf.special === 'schwanger' ? 'Schwangerschaft' : 'Stillzeit', '+ ' + fmtInt(n.extra) + ' kcal') : null,
        ln('Eiweiß', `${fmtInt(n.R[1][0])} g (${String(n.pk).replace('.', ',')} g pro kg)`),
        ln('Fett / Kohlenhydrate', `${fmtInt(n.M[2][0])} g / ${fmtInt(n.M[3][0])} g`),
        pf.height && pf.weight ? ln('BMI', n.bmi.toFixed(1).replace('.', ',')) : null];
    };
    const res = h('div', { class: 'rescard' }, ...resKids());
    const pals = h('div', { class: 'palopts' }, ...PAL_OPTS.map(([v, t, s]) => h('button', { class: 'palopt' + (+pf.pal === v ? ' on' : ''), onclick: () => { pf.pal = v; draw(); } }, h('b', { text: t }), h('span', { text: s }))));
    const sport = h('div', { class: 'stepper' }, h('button', { class: 'ib', onclick: () => { pf.sportH = Math.max(0, (+pf.sportH || 0) - 1); draw(); } }, '−'), h('div', { class: 'stv' }, h('b', { text: String(+pf.sportH || 0) }), h('span', { text: 'Std. Sport pro Woche' })), h('button', { class: 'ib', onclick: () => { pf.sportH = Math.min(25, (+pf.sportH || 0) + 1); draw(); } }, ic('plus')));
    const supps = h('div', { class: 'supps' }, ...pf.supps.map((s, k) => {
      const unit = s.i === 'multi' ? 'Tablette' : REF[s.i][2];
      const a = h('input', { class: 'podin sm', type: 'text', inputmode: 'decimal', value: String(s.amt ?? '').replace('.', ','), autocomplete: 'off' }); a.addEventListener('input', () => { a.value = a.value.replace(/[^0-9,.]/g, '').replace('.', ','); s.amt = a.value.replace(',', '.'); persist(); });
      return h('div', { class: 'supp' }, h('div', { class: 'supph' }, h('b', { text: s.label }), h('button', { class: 'ib sm', 'aria-label': 'Entfernen', onclick: () => { pf.supps.splice(k, 1); draw(); } }, ic('trash'))),
        h('div', { class: 'row', style: 'gap:8px;align-items:center' }, a, h('span', { class: 'muted', text: unit + (s.i === 9 ? ' (1.000 IE = 25 µg)' : '') })),
        h('div', { class: 'seg wide sm' }, ...FREQ.map(([v, t]) => h('button', { class: Math.abs((+s.freq || 1) - v) < 0.01 ? 'on' : '', onclick: () => { s.freq = v; draw(); } }, t))));
    }));
    const addS = h('div', { class: 'tagbox' }, ...SUPP_PRESETS.filter(p => !pf.supps.some(s => s.label === p[0])).map(([l, i, amt]) => h('button', { class: 'pill addp', onclick: () => { pf.supps.push({ label: l, i, amt, freq: 1 }); draw(); } }, '+ ' + l)));
    const save = h('button', { class: 'btn grad', onclick: async () => {
      if (!pf.age || !pf.height || !pf.weight) return toast('Alter, Größe und Gewicht fehlen noch');
      save.disabled = true; clearTimeout(saveT); try { await db.collection('profiles').doc(name).set(pf); profiles[name] = pf; LS.del(dKey); toast('Gespeichert'); back(); } catch (e) { showErr(e); save.disabled = false; }
    } }, 'Speichern');
    const sh = $('#sheet'); const sc = sh.scrollTop;
    openSheet('Angaben von ' + name, [
      h('div', { class: 'muted', style: 'margin:-4px 4px 14px', text: 'Daraus schätzt die App deinen Bedarf. Alles wird sofort gespeichert, du kannst also zwischendurch in die Health-App schauen.' }),
      h('div', { class: 'fsec' }, h('h3', { text: 'Körper' }), segOf('sex', [['w', 'Weiblich'], ['m', 'Männlich']]),
        h('div', { class: 'frows' }, num('age', 'Alter', 'Jahre', '–'), num('height', 'Größe', 'cm', '–'), num('weight', 'Gewicht', 'kg', '–'), num('bodyFat', 'Körperfett, geschätzt', '%', 'optional', true), num('steps', 'Schritte pro Tag', '', 'optional', true)),
        h('div', { class: 'muted', style: 'margin:10px 4px 0;font-size:12.5px', text: 'Mit Körperfett rechnet die App über die Muskelmasse, das ist genauer. Schritte am besten als Durchschnitt aus der Health-App.' })),
      h('div', { class: 'fsec' }, h('h3', { text: 'Arbeit und Alltag' }), pals),
      h('div', { class: 'fsec' }, h('h3', { text: 'Sport' }), sport, segOf('sportI', [[1, 'Locker'], [2, 'Mittel'], [3, 'Intensiv']]), h('div', { style: 'height:8px' }), segOf('train', [['kraft', 'Kraft'], ['mix', 'Gemischt'], ['ausdauer', 'Ausdauer']])),
      h('div', { class: 'fsec' }, h('h3', { text: 'Ziel' }), segOf('goal', [['halten', 'Halten'], ['ab', 'Abnehmen'], ['zu', 'Zunehmen']]),
        pf.goal === 'ab' || pf.goal === 'zu' ? h('div', { style: 'margin-top:8px' }, segOf('rate', pf.goal === 'ab' ? [[0.25, '¼ kg pro Woche'], [0.5, '½ kg pro Woche'], [0.75, '¾ kg pro Woche']] : [[0.25, '¼ kg pro Woche'], [0.5, '½ kg pro Woche']])) : null),
      h('div', { class: 'fsec' }, h('h3', { text: 'Eigene Ziele' }),
        h('div', { class: 'frows' }, num('protG', 'Eiweiß', 'g am Tag', 'auto ' + fmtInt(nd.pAuto), true), num('fibG', 'Ballaststoffe', 'g am Tag', '30', true), num('carbG', 'Kohlenhydrate', 'g am Tag', 'auto', true), num('fatG', 'Fett', 'g am Tag', 'auto', true)),
        h('div', { class: 'muted', style: 'margin:10px 4px 0;font-size:12.5px', text: 'Leer lassen heißt automatisch. Was du nicht festlegst, rechnet die App aus den restlichen Kalorien.' })),
      h('div', { class: 'fsec' }, h('h3', { text: 'Ernährung' }), segOf('diet', [['alles', 'Alles'], ['vegetarisch', 'Vegetarisch'], ['vegan', 'Vegan']]),
        pf.diet === 'vegan' ? h('div', { class: 'muted', style: 'margin:8px 4px 0;font-size:12.5px', text: 'Vitamin B12 kommt vegan fast nur über Supplemente oder angereicherte Produkte. Trag es unten ein, wenn du es nimmst.' }) : null),
      h('div', { class: 'fsec' }, h('h3', { text: 'Sonst noch' }), h('div', { class: 'muted', style: 'margin:0 4px 6px', text: 'Rauchen' }), segOf('smoker', [['nein', 'Nein'], ['ja', 'Ja']]),
        pf.sex === 'w' ? h('div', null, h('div', { class: 'muted', style: 'margin:12px 4px 6px', text: 'Schwangerschaft oder Stillzeit' }), segOf('special', [['', 'Nein'], ['schwanger', 'Schwanger'], ['stillend', 'Stillzeit']])) : null),
      res,
      h('div', { class: 'fsec' }, h('h3', { text: 'Supplemente' }), pf.supps.length ? supps : h('div', { class: 'muted', style: 'margin:0 4px 10px', text: 'Nimmst du etwas regelmäßig? Tippe es an und pass die Menge an.' }), addS),
      h('div', { class: 'actions' }, save)]);
    $('#sheet .xclose').onclick = () => { closeSheet(); back(); };
    sh.scrollTop = sc;
  };
  draw(); $('#sheet').scrollTop = 0;
}

/* ---- Tagebuch: Diktat auswerten, ohne KI ---- */
const DF = (window.DIARY_FOODS || []).map(([al, bls, portion, piece, v]) => ({ al: al.split('|').map(norm), bls, portion, piece, v }));
const DF_IDX = new Map();
for (const f of DF) for (const a of f.al) { DF_IDX.set(a, f); if (!a.includes(' ')) for (const v of [a + 'n', a + 'en', a + 'e', a + 's', a + 'er', a.replace(/(n|en|e|s|er)$/, '')]) if (!DF_IDX.has(v)) DF_IDX.set(v, f); }
const DNUM = { ein: 1, eine: 1, einen: 1, einem: 1, einer: 1, eins: 1, zwei: 2, drei: 3, vier: 4, funf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, halb: 0.5, halbe: 0.5, halben: 0.5, halbes: 0.5, anderthalb: 1.5, eineinhalb: 1.5, paar: 3 };
const DUNIT = [[/^(g|gr|gramm)$/, () => 1], [/^(kg|kilo)$/, () => 1000], [/^(ml)$/, () => 1], [/^(l|liter)$/, () => 1000], [/^(scheibe|scheiben)$/, f => f.piece], [/^(stuck|stucke|stk)$/, f => f.piece],
  [/^(glas|glaser)$/, () => 200], [/^(tasse|tassen|kaffeetasse)$/, () => 200], [/^(becher)$/, f => f.portion], [/^(schussel|schusseln|schale|schalen|bowl)$/, () => 300], [/^(teller)$/, () => 350], [/^(portion|portionen)$/, f => f.portion],
  [/^(handvoll)$/, () => 30], [/^(scoop|scoops|messloffel|messloffeln)$/, () => 30], [/^(essloffel|el|loffel)$/, () => 12], [/^(teeloffel|tl)$/, () => 5], [/^(riegel)$/, () => 40], [/^(tafel|tafeln)$/, () => 100], [/^(kugel|kugeln)$/, () => 60], [/^(flasche|flaschen)$/, () => 500], [/^(dose|dosen)$/, () => 330], [/^(packung|packungen|tute)$/, f => f.portion * 2], [/^(stange|stangen|stuckchen)$/, f => f.piece]];
const DFILL = new Set('ich hab habe hatte hatten wir gegessen getrunken gefruhstuckt genascht noch so etwa ungefahr circa ca heute gestern es gab war waren also dann ne auch mir mich zum zur zu fruhstuck mittagessen abendessen mittag abend snack snacks zwischendurch abends mittags morgens nachmittags als nachtisch dessert den die das der dem des vom von davon sehr mal einfach eigentlich bisschen ganz glaube oder um uhr gerade nur mix mischung gemischt aus zusammen zusammengemischt selbstgemacht selbst gemacht shake'.split(' '));
function factorOf(c) {
  let m;
  if (/nicht ganz|fast (alles|ganz|komplett)/.test(c)) return 0.75;
  if ((m = c.match(/(\d+)\s*(%|prozent)/))) return +m[1] / 100;
  if (/drei ?viertel/.test(c)) return 0.75; if (/zwei ?drittel/.test(c)) return 0.67; if (/drittel/.test(c)) return 0.33; if (/viertel/.test(c)) return 0.25;
  if (/halb|hälfte|haelfte/.test(c)) return 0.5;
  if (/doppelt|zwei portionen|zwei teller|zweimal/.test(c)) return 2;
  if (/nachschlag|nachgenommen|extra portion|große portion|grosse portion/.test(c)) return 1.5;
  if (/bisschen|wenig|kleine portion|probiert|nur etwas/.test(c)) return 0.3;
  if (/\b(nicht|nichts|ausgelassen|übersprungen|weggelassen|keine?n?)\b/.test(c)) return 0;
  return 1;
}
const FAC_TXT = f => f === 0 ? 'nichts' : f === 1 ? 'ganz' : f === 0.5 ? 'die Hälfte' : Math.round(f * 100) + ' %';
function findExact(words) {
  const mine = typeof findMine === 'function' && findMine(words); if (mine) return mine;
  for (let n = Math.min(3, words.length); n >= 1; n--) for (let s = 0; s + n <= words.length; s++) {
    const ph = words.slice(s, s + n).join(' '); const f = DF_IDX.get(ph);
    if (f) return { s, n, f: { name: displayName(ph, f.bls), src: f.bls, v: f.v, portion: f.portion, piece: f.piece } };
  }
  for (let n = Math.min(3, words.length); n >= 1; n--) for (let s = 0; s + n <= words.length; s++) {
    const ph = words.slice(s, s + n).join(' '); const k = canon(ph); const v = window.NUTRI && window.NUTRI[k];
    if (v && ph.length >= 3) { const b = baseByKey.get(k); return { s, n, f: { name: b ? b.name : cap(ph), src: 'BLS', v, portion: PIECE[k] || 100, piece: PIECE[k] || 100 } }; }
  }
  return null;
}
function findFuzzy(words) {
  if (!blsAll) return null;
  const ws = words.filter(w => w.length >= 4); if (!ws.length) return null;
  const hits = blsAll.filter(([n]) => { const k = norm(n); return ws.every(w => k.includes(w.replace(/(n|en|e)$/, ''))); }).sort((a, b) => (norm(b[0]).startsWith(ws[0]) - norm(a[0]).startsWith(ws[0])) || a[0].length - b[0].length);
  return hits[0] ? { name: cap(ws.join(' ')), src: hits[0][0], v: hits[0][1], portion: 100, piece: 100 } : null;
}
function findFood(words) { const x = findExact(words); return x ? x.f : findFuzzy(words); }
// Mehrere Lebensmittel in einem Stück Text, z. B. „Kokos Rosinen Mix“ oder „Whey Shake“: alle bekannten herausziehen
function findFoods(words) {
  const out = []; let rest = words.slice();
  for (let i = 0; i < 4 && rest.length; i++) { const x = findExact(rest); if (!x) break; if (!out.some(o => o.src === x.f.src)) out.push(x.f); rest.splice(x.s, x.n); }
  if (out.length) return out;
  const f = findFuzzy(words); return f ? [f] : [];
}
function displayName(ph, bls) {
  if (/^Whey/.test(bls)) return 'Whey-Protein';
  const last = ph.split(' ').pop();
  for (const tok of bls.split(/[\s,()/]+/)) { const nt = norm(tok); if (nt.endsWith(last) && nt.length >= last.length) { const word = tok.slice(tok.length - last.length); return cap(ph.split(' ').slice(0, -1).concat(word).join(' ')); } }
  const fix = { kase: 'Käse', brotchen: 'Brötchen', musli: 'Müsli', kasekuchen: 'Käsekuchen', apfel: 'Apfel', mohren: 'Möhren', gummibarchen: 'Gummibärchen', nusse: 'Nüsse', doner: 'Döner', ruhrei: 'Rührei', hahnchen: 'Hähnchen', platzchen: 'Plätzchen', huttenkase: 'Hüttenkäse', konfiture: 'Konfitüre', weissbrot: 'Weißbrot', weisswein: 'Weißwein', weissbier: 'Weißbier', tomatensosse: 'Tomatensoße', sosse: 'Soße', nudelsosse: 'Nudelsoße', bolognesesosse: 'Bolognesesoße', gemusesuppe: 'Gemüsesuppe', mussli: 'Müsli', susskartoffeln: 'Süßkartoffeln' };
  return cap(ph.split(' ').map(w => fix[w] || w).join(' '));
}
function gramsFor(f, num, unitG, size) { const base = unitG != null ? unitG : f.piece || f.portion || 100; return Math.round((num != null ? num : (unitG != null ? 1 : 0)) * base * size || f.portion * size); }
function parseFoods(raw, isSide) {
  const lw = raw.toLowerCase().replace(/[-–\/+&]/g, ' ').replace(/(\d)\s*(g|ml|kg|l)\b/g, '$1 $2');
  let words = norm(lw).split(' ').filter(Boolean);
  let size = /\b(gro(ß|ss)e?[nmrs]?|riesige?[nmrs]?)\b/.test(lw) ? 1.4 : /\bkleine?[nmrs]?\b/.test(lw) ? 0.7 : 1;
  words = words.filter(w => !/^(gross|grosse|grossen|grosser|grosses|kleine|kleinen|kleiner|kleines|klein|riesig|riesige|riesigen)$/.test(w));
  let num = null, unitG = null, unitW = '';
  const amtIdx = words.findIndex(w => /^\d+(\.\d+)?$/.test(w) || DNUM[w] != null);
  if (amtIdx >= 0) { const w = words[amtIdx]; num = /^\d/.test(w) ? +w : DNUM[w]; if (w === 'ein' && words[amtIdx + 1] === 'paar') { num = 3; words.splice(amtIdx + 1, 1); } words.splice(amtIdx, 1); }
  const ui = words.findIndex(w => DUNIT.some(([re]) => re.test(w)));
  let unitFn = null; if (ui >= 0) { unitW = words[ui]; unitFn = DUNIT.find(([re]) => re.test(unitW))[1]; words.splice(ui, 1); }
  words = words.filter(w => !DFILL.has(w) && w.length > 1);
  if (!words.length) return [];
  const fs = findFoods(words);
  if (!fs.length) return [{ name: cap(words.join(' ')), amt: amtText(num, unitW), gr: null, v: null, src: '', unknown: true }];
  const k = fs.length;
  return fs.map(f => {
    let gr;
    if (unitFn) unitG = unitFn(f);
    if (num == null && unitG == null) gr = Math.round((isSide ? Math.min(f.portion, f.piece || f.portion) : f.portion) * size / (k > 1 ? 1.5 : 1));
    else if (unitG == null) gr = Math.round(num * (f.piece || f.portion) * size / k);
    else gr = Math.round((num == null ? 1 : num) * unitG * size / k);
    const amt = k > 1 ? (num != null || unitW ? `${fmtInt(gr)} g` : 'eine Portion') : amtText(num, unitW) || 'eine Portion';
    return { name: f.name, amt, gr, v: f.v, src: f.src, portion: f.portion, piece: f.piece };
  });
}
function parseFoodChunk(raw, isSide) { return parseFoods(raw, isSide)[0] || null; }
function amtText(num, unitW) { if (num == null && !unitW) return ''; const n = num == null ? 1 : num; return (n === 0.5 ? '½' : String(n).replace('.', ',')) + (unitW ? ' ' + (/^(g|gr|ml|kg|l)$/.test(unitW) ? unitW : cap(unitW)) : ''); }
function parseDiary(text, ds) {
  const out = { foods: [], plans: {} };
  const t = (text || '').replace(/(\d),(\d)/g, '$1.$2');
  const chunks = t.split(/[,;\n.!?]+|\s(?:und dann|und|dann|danach|außerdem|ausserdem|sowie|plus|später|zum frühstück|zum mittag(?:essen)?|zum abendessen|als nachtisch|mittags|abends|morgens|nachmittags)\s/i).map(s => s && s.trim()).filter(Boolean);
  const plans = planOn(ds).map(p => ({ p, words: norm(p.title).split(' ').filter(w => w.length >= 4) }));
  const recs = recipes.filter(r => recipeNutrition(r).ok).map(r => ({ r, words: norm(r.title).split(' ').filter(w => w.length >= 4) }));
  const hit = (c, words) => { const nc = norm(c); return words.length && words.some(w => nc.includes(w) || nc.includes(w.replace(/(n|en|e|s)$/, ''))); };
  for (const c of chunks) {
    const pm = plans.find(x => hit(c, x.words));
    if (pm) { out.plans[pm.p.id] = factorOf(c.toLowerCase()); continue; }
    const rm = recs.find(x => hit(c, x.words));
    if (rm) { const fac = factorOf(c.toLowerCase()) || 1; const n = recipeNutrition(rm.r); out.foods.push({ name: rm.r.title, amt: (fac === 1 ? '1' : String(fac).replace('.', ',')) + ' Portion', gr: Math.round(100 * fac), v: n.per, src: 'Euer Rezept', portion: 100, piece: 100, recipe: true }); continue; }
    const parts = c.split(/\s+mit\s+|\s+und\s+/i);
    let main = null;
    parts.forEach((pt, k) => { for (const f of parseFoods(pt, k > 0)) { if (!main) main = f; else if (main && /kaffee|tee|cappuccino|espresso/i.test(main.src || '') && /milch|drink|sahne/i.test(f.src || '') && !/\d/.test(pt)) { f.gr = 30; f.amt = 'ein Schuss'; } out.foods.push(f); } });
  }
  return out;
}
function regrams(f) {
  const lw = (f.amt || '').toLowerCase().replace('½', '0.5').replace(',', '.');
  const ws = norm(lw.replace(/(\d)\s*(g|ml|kg|l)\b/g, '$1 $2')).split(' ').filter(Boolean);
  let num = null, unitFn = null;
  for (const w of ws) { if (num == null && (/^\d+(\.\d+)?$/.test(w) || DNUM[w] != null)) num = /^\d/.test(w) ? +w : DNUM[w]; else { const u = DUNIT.find(([re]) => re.test(w)); if (u) unitFn = u[1]; } }
  const fb = { portion: f.portion || 100, piece: f.piece || f.portion || 100 };
  if (f.recipe) { f.gr = Math.round(100 * (num == null ? 1 : num)); return; }
  if (unitFn) f.gr = Math.round((num == null ? 1 : num) * unitFn(fb));
  else if (num != null) f.gr = Math.round(num * fb.piece);
}

function openDiary(name, ds, back) {
  const id = name + '_' + ds; const old = diary[id];
  const e = old ? JSON.parse(JSON.stringify(old)) : { person: name, date: ds, text: '', foods: [], plans: {} };
  e.plans = e.plans || {}; e.foods = e.foods || [];
  loadBls().catch(() => { });
  const pf = profiles[name]; const nd = pf ? needsOf(pf) : null;
  const dt = new Date(ds); const today = ymd(new Date()), yest = ymd(addDays(new Date(), -1));
  const dlabel = (ds === today ? 'Heute' : ds === yest ? 'Gestern' : WDL[dt.getDay()]) + `, ${dt.getDate()}. ${MON[dt.getMonth()]}`;
  // Speichert sich von selbst: nach jeder Änderung kurz warten, dann in die Datenbank
  let saveT = 0, saving = Promise.resolve(), dirty = false;
  const saveLbl = h('span', { class: 'dysave' });
  const persist = (now) => {
    dirty = true; clearTimeout(saveT);
    const run = () => { saveT = 0; if (!dirty) return saving; dirty = false; saveLbl.textContent = 'Speichert …';
      const copy = JSON.parse(JSON.stringify(e));
      saving = saving.then(() => db.collection('diary').doc(id).set(copy)).then(() => { diary[id] = copy; saveLbl.textContent = 'Gespeichert'; }, err => { console.error(err); dirty = true; saveLbl.textContent = 'Nicht gespeichert, keine Verbindung'; });
      return saving; };
    if (now) return run(); saveT = setTimeout(run, 500); return saving;
  };
  const txt = h('textarea', { class: 'dyin', rows: '1', placeholder: 'Oder hier eintippen', enterkeyhint: 'done' }); txt.value = '';
  const grow = () => { txt.style.height = 'auto'; txt.style.height = txt.scrollHeight + 'px'; };
  const stTxt = h('span', { class: 'dyst' }); const stBtn = h('button', { class: 'dygo hidden', type: 'button' });
  const status = h('div', { class: 'dystat hidden' }, stTxt, stBtn);
  const setStatus = (t, btn, fn) => { status.classList.toggle('hidden', !t && !btn); stTxt.textContent = t || ''; stBtn.classList.toggle('hidden', !btn); stBtn.textContent = btn || ''; stBtn.onclick = fn || null; };
  const listBox = h('div'), planBox = h('div'), sumBox = h('div', { class: 'dysum' });
  const kcalOf = f => f.v && f.gr ? f.v[0] * f.gr / 100 : 0;
  const drawSum = () => {
    const kc = e.foods.reduce((a, f) => a + kcalOf(f), 0) + planOn(ds).reduce((a, p) => { const r = recipeOf(p); if (!r) return a; const n = recipeNutrition(r); return a + (n.ok ? n.per[0] * (e.plans[p.id] ?? 1) : 0); }, 0);
    sumBox.replaceChildren(h('div', { class: 'dykc' }, h('b', { text: fmtInt(kc) + ' kcal' }), h('span', { text: nd ? ` von etwa ${fmtInt(nd.kcal)}` : '' })), saveLbl);
  };
  const changed = () => { drawSum(); persist(); };
  const drawPlans = () => {
    const ps = planOn(ds);
    planBox.className = ps.length ? 'dygrp' : 'hidden';
    planBox.replaceChildren(...(ps.length ? [h('h3', { text: 'Aus dem Plan' }), ...ps.map(p => h('div', { class: 'dplan' }, h('div', { class: 'dpt dyplt' }, h('span', { text: p.title + (recipeOf(p) ? '' : ' (ohne Rezept, zählt nicht mit)') }), h('button', { class: 'dydel', 'aria-label': 'Aus der Essenswoche löschen', onclick: async () => { if (!confirm(`„${p.title}“ aus der Essenswoche löschen?`)) return; delete e.plans[p.id]; await db.collection('plan').doc(p.id).delete().catch(showErr); plan = plan.filter(x => x.id !== p.id); drawPlans(); changed(); } }, ic('trash'))),
      h('div', { class: 'seg wide sm' }, ...[[0, '0'], [0.25, '¼'], [0.5, '½'], [0.75, '¾'], [1, '1'], [1.5, '1½']].map(([v, t]) => h('button', { class: Math.abs((e.plans[p.id] ?? 1) - v) < 0.01 ? 'on' : '', onclick: () => { e.plans[p.id] = v; drawPlans(); changed(); } }, t)))))] : []));
  };
  const drawList = () => {
    listBox.className = e.foods.length ? 'dygrp' : 'hidden'; listBox.replaceChildren(...(e.foods.length ? [h('h3', { text: 'Gegessen' })] : []), ...e.foods.map((f, k) => {
      const a = h('input', { class: 'dyamt', value: f.amt || '', placeholder: f.gr ? `${fmtInt(f.gr)} g` : 'Menge', enterkeyhint: 'done' });
      const kc = h('span', { class: 'dykcal', text: f.v && f.gr ? fmtInt(kcalOf(f)) + ' kcal' : '' });
      const grT = h('span', { class: 'dygr' });
      // Gramm nur zeigen, wenn die Menge nicht schon in Gramm dasteht
      const showGr = () => { const same = !a.value.trim() || norm(a.value).replace(/\s/g, '') === String(f.gr) + 'g'; grT.textContent = f.gr && !same ? `${fmtInt(f.gr)} g` : ''; a.style.width = (Math.max(4, (a.value || a.placeholder).length) * 0.56 + 0.6).toFixed(1) + 'em'; };
      showGr(); a.addEventListener('input', showGr);
      a.addEventListener('keydown', ev => { if (ev.key === 'Enter') a.blur(); });
      a.addEventListener('change', () => { f.amt = a.value; regrams(f); showGr(); kc.textContent = f.v && f.gr ? fmtInt(kcalOf(f)) + ' kcal' : ''; changed(); });
      const fix = () => { const g = { name: f.name }; pickProduct(g, () => { if (g.product) { f.v = g.product.v; f.src = g.product.name; f.unknown = false; if (!f.gr) { f.gr = 100; f.amt = '100 g'; } } drawList(); changed(); }); };
      return h('div', { class: 'dyrow' + (f.unknown ? ' unk' : '') },
        h('div', { class: 'dytop' }, h('span', { class: 'dyname', text: f.name }), kc),
        h('button', { class: 'dysrc', onclick: fix, text: f.unknown ? 'Nicht gefunden, tippen zum Suchen' : f.src === 'BLS' ? 'Lebensmittel-Datenbank, tippen zum Ändern' : f.src }),
        f.recipe || f.unknown ? null : varRow(f.name, f.variant, l => { const o = varVec(f.name, l); if (o) { f.variant = l; f.v = o[1]; f.src = o[2]; } drawList(); changed(); }),
        h('div', { class: 'dyamtrow' }, a, grT, h('button', { class: 'dydel', 'aria-label': 'Entfernen', onclick: () => { e.foods.splice(k, 1); drawList(); changed(); } }, ic('trash'))));
    }));
  };
  // Auswerten nacheinander, nie doppelt gleichzeitig
  let queue = Promise.resolve();
  const evalText = () => { const said = txt.value.trim(); if (!said) return queue; txt.value = ''; grow(); queue = queue.then(() => evalNow(said)); return queue; };
  const evalNow = async (said) => {
    setStatus('Suche die Lebensmittel heraus …');
    await loadBls().catch(() => { });
    let r = null;
    if (typeof aiCall === 'function' && aiState !== false) {
      const ps = planOn(ds), rs = recipes.filter(x => recipeNutrition(x).ok);
      const ctx = (ps.length ? 'Geplant für diesen Tag:\n' + ps.map(p => `- ${p.title} (id ${p.id})`).join('\n') + '\n' : '') + (rs.length ? 'Eigene Rezepte: ' + rs.map(x => x.title).slice(0, 80).join(', ') : '') + (myFoods.length ? '\n' + myFoodsContext() : '');
      const d = await aiCall('diary', { text: said, context: ctx }).catch(() => null);
      if (d) {
        r = { foods: [], plans: {} };
        for (const p of d.plans || []) if (ps.some(x => x.id === p.id)) r.plans[p.id] = Math.max(0, +p.factor || 1);
        for (const x of d.recipes || []) { const rr = rs.find(y => norm(y.title) === norm(x.title || '')); if (!rr) continue; const fac = +x.factor || 1; const n = recipeNutrition(rr); r.foods.push({ name: rr.title, amt: (fac === 1 ? '1' : String(fac).replace('.', ',')) + ' Portion', gr: Math.round(100 * fac), v: n.per, src: 'Euer Rezept', portion: 100, recipe: true }); }
        for (const x of d.foods || []) {
          const g = Math.max(1, Math.round(+x.grams || 100));
          const fs = parseFoods(`${g} g ${x.name}`, false);
          if (fs.length === 1) { fs[0].amt = x.label || `${g} g`; fs[0].gr = g; }
          r.foods.push(...fs);
        }
      }
    }
    if (!r) r = parseDiary(said, ds);
    Object.assign(e.plans, r.plans); e.foods.unshift(...r.foods); e.text = [e.text, said].filter(Boolean).join('\n');
    drawPlans(); drawList(); changed();
    const n = r.foods.length + Object.keys(r.plans).length;
    setStatus(n ? `Verstanden: „${said}“` : `Nichts erkannt in „${said}“. Nenn Lebensmittel und Mengen.`);
  };
  txt.addEventListener('input', () => { grow(); if (!rec) setStatus('', txt.value.trim() ? 'Eintragen' : '', evalText); });
  txt.addEventListener('keydown', ev => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); txt.blur(); } });
  txt.addEventListener('blur', () => { if (txt.value.trim() && !rec) evalText(); });
  // Aufnahme: Mikrofon im Feld, beim Zuhören ein klarer Fertig-Knopf
  let rec = null, chunks = [];
  const mic = h('button', { class: 'dybig', type: 'button', 'aria-label': 'Einsprechen' }, h('i', { class: 'r1' }), h('i', { class: 'r2' }), ic('microphone'));
  const micLbl = h('div', { class: 'dybiglbl', text: 'Tippen und sprechen' });
  // Ringe folgen der Lautstärke der Stimme (nur während der Aufnahme)
  let meter = null;
  const startMeter = stream => {
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)(); const an = ac.createAnalyser(); an.fftSize = 512;
      ac.createMediaStreamSource(stream).connect(an); const buf = new Uint8Array(an.fftSize); let lv = 0, raf = 0;
      const tick = () => { an.getByteTimeDomainData(buf); let sum = 0; for (const b of buf) { const x = (b - 128) / 128; sum += x * x; } const v = Math.min(1, Math.sqrt(sum / buf.length) * 5); lv = v > lv ? v : lv * 0.85 + v * 0.15; mic.style.setProperty('--lv', lv.toFixed(3)); raf = requestAnimationFrame(tick); };
      tick(); meter = () => { cancelAnimationFrame(raf); ac.close().catch(() => { }); mic.style.setProperty('--lv', '0'); meter = null; };
    } catch (err) { meter = null; }
  };
  // Live-Diktat mit der Spracherkennung des Geräts (Safari/iOS): Text erscheint schon beim Sprechen. Sonst Aufnahme wie bisher.
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let live = null;
  const startLive = () => {
    const r = new SR(); r.lang = 'de-DE'; r.interimResults = true; r.continuous = true;
    const base = txt.value.trim(); let fin = '', heard = false, stopped = false, lv = 0, raf = 0;
    const decay = () => { lv *= 0.9; mic.style.setProperty('--lv', lv.toFixed(3)); raf = lv > 0.02 ? requestAnimationFrame(decay) : 0; };
    const bump = () => { lv = Math.min(1, lv + 0.6); if (!raf) raf = requestAnimationFrame(decay); };
    const show = interim => { txt.value = [base, (fin + interim).trim()].filter(Boolean).join(', '); grow(); };
    const end = () => { cancelAnimationFrame(raf); mic.style.setProperty('--lv', '0'); live = null; mic.classList.remove('rec'); micLbl.textContent = 'Tippen und sprechen'; txt.classList.remove('livetxt'); txt.placeholder = 'Oder hier eintippen'; };
    r.onresult = ev => { let interim = ''; for (let k = ev.resultIndex; k < ev.results.length; k++) { const x = ev.results[k]; if (x.isFinal) fin += x[0].transcript.trim() + ' '; else interim += x[0].transcript; } heard = true; show(interim); bump(); };
    r.onspeechstart = bump;
    r.onerror = ev => {
      if (!/not-allowed|service-not-allowed|audio-capture|language-not-supported|network/.test(ev.error)) return;
      stopped = true; if (heard) return; end(); if (ev.error !== 'network') LS.set('ep_livesr', 'off'); startRecording();
    };
    // iOS beendet nach einer Pause von selbst; dann weiter zuhören, bis Fertig getippt wird
    r.onend = () => { if (!live && stopped) return; if (!stopped) { try { r.start(); return; } catch (x) { } } end(); show(''); if (txt.value.trim()) evalText(); else { if (!heard) LS.set('ep_livesr', 'off'); setStatus('Nichts verstanden. Tippe nochmal aufs Mikrofon.'); } };
    live = { stop: () => { stopped = true; try { r.stop(); } catch (x) { r.onend(); } } };
    try { r.start(); } catch (x) { live = null; return startRecording(); }
    mic.classList.add('rec'); txt.classList.add('livetxt'); txt.placeholder = 'Was du sagst, erscheint hier'; micLbl.textContent = 'Ich höre zu. Fertig? Nochmal tippen.'; setStatus('');
  };
  const stopRec = () => { if (live) return live.stop(); if (rec && rec.state !== 'inactive') rec.stop(); };
  mic.addEventListener('click', () => {
    if (live || rec) return stopRec();
    if (SR && LS.get('ep_livesr') !== 'off') return startLive();
    startRecording();
  });
  const startRecording = async () => {
    if (!navigator.mediaDevices || !window.MediaRecorder) return toast('Aufnahme wird hier nicht unterstützt');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks = []; rec = new MediaRecorder(stream);
      rec.ondataavailable = ev => ev.data.size && chunks.push(ev.data);
      // Zwischenstand alle paar Sekunden über die Cloud-Spracherkennung, damit man sieht, dass mitgeschrieben wird
      const base = txt.value.trim(); let busy = false, done = false;
      const preview = setInterval(async () => {
        if (busy || done || !chunks.length || typeof cloudTranscribe !== 'function' || cloudStt === false) return;
        busy = true;
        try { const t = await cloudTranscribe(new Blob(chunks, { type: chunks[0].type || 'audio/mp4' }), null, 'de'); if (!done && t) { txt.value = [base, t.trim()].filter(Boolean).join(', '); grow(); } } catch (x) { }
        busy = false;
      }, 2500);
      rec.onstop = async () => {
        done = true; clearInterval(preview); txt.value = base; grow(); txt.classList.remove('livetxt'); txt.placeholder = 'Oder hier eintippen';
        stream.getTracks().forEach(t => t.stop()); if (meter) meter(); rec = null; mic.classList.remove('rec'); micLbl.textContent = 'Tippen und sprechen';
        const blob = new Blob(chunks, { type: chunks[0] ? chunks[0].type : 'audio/mp4' });
        setStatus('Schreibe auf, was du gesagt hast …');
        try {
          const t = await window.transcribeVideo(blob, (m, fr) => { if (fr != null) setStatus(`Schreibe auf … ${Math.round(fr * 100)} %`); });
          if (t && t.trim()) { txt.value = (txt.value.trim() ? txt.value.trim() + ', ' : '') + t.trim(); await evalText(); }
          else setStatus('Nichts verstanden. Tippe nochmal aufs Mikrofon.');
        } catch (err) { console.error(err); setStatus('Konnte die Aufnahme nicht auswerten. Tippe es sonst ein.'); }
      };
      rec.start(1000); startMeter(stream); mic.classList.add('rec'); txt.classList.add('livetxt'); txt.placeholder = 'Was du sagst, erscheint hier'; micLbl.textContent = 'Ich höre zu. Fertig? Nochmal tippen.';
      setStatus('');
    } catch (err) { toast('Kein Zugriff aufs Mikrofon'); }
  };
  const addMine = f => { e.foods.unshift(f); drawList(); changed(); setStatus(`Eingetragen: ${f.name}, ${f.amt}`); };
  drawPlans(); drawList(); drawSum();
  // Beim Schließen oder Tag wechseln: Aufnahme beenden, Getipptes auswerten, alles speichern
  const flush = () => { stopRec(); evalText(); clearTimeout(saveT); queue.then(() => persist(true)); };
  const go = n => { flush(); openDiary(name, ymd(addDays(dt, n)), back); };
  openSheet('Was hast du gegessen?', [h('div', { class: 'dy' },
    h('div', { class: 'pnav' }, h('button', { class: 'ib', 'aria-label': 'Tag davor', onclick: () => go(-1) }, ic('chevron-left')), h('div', { text: dlabel }), h('button', { class: 'ib', 'aria-label': 'Tag danach', onclick: () => go(1) }, ic('chevron-right'))),
    h('div', { class: 'dygrp dyadd' }, h('div', { class: 'dybigwrap' }, mic, micLbl), h('div', { class: 'dyline' }, txt), status,
      h('div', { class: 'dyacts' }, h('button', { class: 'dyact', onclick: () => searchFlow(addMine) }, 'Suchen'), h('button', { class: 'dyact', onclick: () => scanFlow(addMine) }, 'Strichcode'), h('button', { class: 'dyact', onclick: () => photoFlow(addMine) }, 'Nährwert-Foto'))),
    listBox,
    planBox,
    sumBox,
    h('div', { class: 'ln dylink' }, h('div', { class: 'lr tap', onclick: () => { flush(); openDayNut(Math.max(0, Math.round((parseYmd(today) - parseYmd(ds)) / 864e5)), () => openDiary(name, ds, back)); } }, h('span', { class: 'tx', text: 'Nährstoffe an diesem Tag' }), h('span', { class: 'chev', text: '›' }))))]);
  // Immer gleich hoch, egal wie viel eingetragen ist: beim Blättern zwischen Tagen springt nichts
  $('#sheet').classList.add('fixh');
  $('#sheet .xclose').onclick = () => { flush(); closeSheet(); back(); };
}
