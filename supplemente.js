'use strict';
/* Supplemente prüfen und empfehlen, mit kurzen Rückfragen (Jodsalz, Salzmenge, Sonne).
   Feste Regeln, keine KI. Bedarf nach DGE, Höchstmengen für Supplemente nach BfR (Stellungnahme 2024).
   Nur Werte, die belegt sind; für andere Nährstoffe gibt es keine „zu viel“-Warnung. */

const SUPP_MAX = { 9: 20, 22: 100, 20: 6, 19: 250, 21: 6.5, 14: 200 }; // pro Tag aus Supplementen
const SALT_G = { wenig: 1, normal: 2.5, viel: 4 }; // Gramm Salz beim Kochen und Würzen am Tag
const JOD_PER_G = 20; // µg Jod pro Gramm Jodsalz (Durchschnitt Deutschland)
const QUESTIONS = {
  jodsalz: ['Nimmst du Jodsalz?', [['ja', 'Ja'], ['nein', 'Nein'], ['egal', 'Weiß nicht']]],
  salz: ['Wie viel salzt du beim Kochen?', [['wenig', 'Wenig'], ['normal', 'Normal'], ['viel', 'Viel']]],
  sonne: ['Wie oft bist du mittags draußen in der Sonne?', [['kaum', 'Kaum'], ['etwas', 'Manchmal'], ['viel', 'Fast täglich']]],
};
const winterNow = () => { const m = new Date().getMonth() + 1; return m >= 10 || m <= 3; };
function setAnswer(key, val) {
  const name = me(); if (!profiles[name]) return;
  profiles[name] = Object.assign({}, profiles[name], { [key]: val });
  db.collection('profiles').doc(name).update({ [key]: val });
  render(); if ($('#ov').classList.contains('on') && suppOpen) openSuppCheck();
}
function askRow(key) {
  const [q, opts] = QUESTIONS[key], cur = (profiles[me()] || {})[key];
  return h('div', { class: 'lr col ask' }, h('span', { class: 'tx', text: q }),
    h('div', { class: 'chips' }, ...opts.map(([v, l]) => h('button', { class: 'cp' + (cur === v ? ' on' : ''), onclick: e => { e.stopPropagation(); setAnswer(key, v); } }, l))));
}
// Jod aus Jodsalz beim Kochen zählt als Teil der Zufuhr (in dayIntake)
function saltVec(pf) {
  if (!pf || pf.jodsalz !== 'ja') return null;
  const g = SALT_G[pf.salz || 'normal'], v = new Array(NV).fill(0); v[22] = g * JOD_PER_G; v[7] = g; return v;
}

function suppCheck(name) {
  const pf = profiles[name]; if (!pf) return null;
  const refs = allRefs(needsOf(pf)), supps = pf.supps || [];
  const days = [...Array(14)].map((_, i) => ymd(addDays(new Date(), i - 13)));
  const d = rangeData(name, days), enough = d.logged >= 5;
  const dose = new Array(NV).fill(0); for (const s of supps) suppVec(s).forEach((x, i) => dose[i] += x);
  const food = i => d.n ? Math.max(0, d.total[i] / d.n - dose[i]) : 0; // im Schnitt ohne Supplemente
  const pct = i => refs[i] ? Math.round(food(i) / refs[i][0] * 100) : 0;
  const unit = i => (refs[i] || REF[i] || [0, '', ''])[2];
  const hints = [], recs = [], asks = [];
  // 1. Was du schon nimmst
  const mine = supps.map(s => {
    const v = suppVec(s), keys = v.map((x, i) => x > 0 ? i : -1).filter(i => i >= 0);
    let state = 'ok', txt = '';
    const high = keys.find(i => SUPP_MAX[i] && dose[i] > SUPP_MAX[i] * 1.05);
    if (high != null) {
      state = 'high'; const both = supps.filter(t => suppVec(t)[high] > 0).length > 1;
      txt = `${both ? 'Zusammen mit deinen anderen Supplementen' : 'Damit'} ${de(dose[high], 1)} ${unit(high)} ${refs[high][1]} am Tag. Empfohlen sind höchstens ${de(SUPP_MAX[high], 1)} ${unit(high)} aus Supplementen.`;
    } else if (s.i !== 'multi' && enough && s.i !== 9 && !(s.i === 15 && pf.diet === 'vegan') && pct(s.i) >= 100) {
      state = 'extra'; txt = `Übers Essen hattest du im Schnitt schon ${pct(s.i)} % vom Bedarf. Das Supplement brauchst du dafür eigentlich nicht.`;
    } else if (s.i !== 'multi' && refs[s.i]) {
      txt = d.n ? `Mit Supplement im Schnitt ${Math.min(999, pct(s.i) + Math.round(dose[s.i] / refs[s.i][0] * 100))} % vom Bedarf.` : 'Passt.';
    } else txt = 'Keine Werte über den Höchstmengen.';
    if (state === 'high') hints.push({ kind: 'high', title: `${s.label}: mehr als empfohlen`, txt });
    return { s, state, txt };
  });
  // 2. Vitamin D: im Winter für fast alle, im Sommer je nach Sonne
  if (dose[9] < 10) {
    const need = winterNow() || pf.sonne === 'kaum';
    if (need) recs.push({ i: 9, title: 'Vitamin D: 20 µg (800 IE) am Tag', txt: winterNow() ? 'Von Oktober bis März bildet die Haut in Deutschland kaum Vitamin D, übers Essen kommen nur wenige µg.' : 'Ohne viel Sonne bildet die Haut zu wenig Vitamin D.' });
    else if (!pf.sonne) asks.push('sonne');
  }
  // 3. Jod: erst Jodsalz und Seefisch, Supplement nur, wenn das nicht reicht
  if (!pf.jodsalz) asks.push('jodsalz');
  else if (pf.jodsalz === 'ja' && !pf.salz) asks.push('salz');
  if (enough && dose[22] < 50 && pct(22) < 70) {
    recs.push({ i: 22, title: 'Jod', txt: (pf.jodsalz !== 'ja' ? 'Am einfachsten: Jodsalz statt normalem Salz. ' : '') + `Dazu 1 bis 2 Mal pro Woche Seefisch wie Seelachs oder Kabeljau. Reicht das nicht, gehen 100 µg am Tag als Supplement. Im Schnitt hattest du ${pct(22)} %.` });
  }
  // 4. B12 bei veganer oder vegetarischer Ernährung
  if (dose[15] <= 0 && (pf.diet === 'vegan' || (pf.diet === 'vegetarisch' && enough && pct(15) < 60)))
    recs.push({ i: 15, title: 'Vitamin B12', txt: pf.diet === 'vegan' ? 'Vegan brauchst du ein B12-Supplement. Die Menge am besten in der Apotheke klären und einmal im Jahr den Blutwert messen lassen.' : `Im Schnitt hattest du ${pct(15)} %. Mehr Milchprodukte und Eier helfen, sonst ein B12-Supplement.` });
  // 5. Omega-3 und Eisen: zuerst übers Essen
  if (enough && dose[23] <= 0 && pct(23) < 50)
    recs.push({ i: 23, title: 'Omega-3', txt: pf.diet === 'alles' || !pf.diet ? `1 bis 2 Mal pro Woche fetter Fisch wie Lachs, Hering oder Makrele. Im Schnitt hattest du ${pct(23)} %.` : 'Leinöl, Walnüsse oder Leinsamen. Für EPA und DHA gibt es Algenöl als Supplement.' });
  if (enough && dose[20] <= 0 && pct(20) < 60)
    recs.push({ i: 20, title: 'Eisen', txt: `Im Schnitt ${pct(20)} %. Besser übers Essen, etwa Linsen oder Haferflocken mit etwas Vitamin C dazu. Eisen nur nach einem Bluttest einnehmen, zu viel schadet.` });
  return { pf, mine, recs, asks, hints, enough, logged: d.logged };
}
function suppCount(c) { return c ? c.hints.length + c.recs.length + c.mine.filter(m => m.state === 'extra').length : 0; }

let suppOpen = false;
function openSuppCheck() {
  const name = me(), c = suppCheck(name); if (!c) return openProfileEdit(name, () => render());
  const rowOf = (title, txt, strong) => h('div', { class: 'lr col' }, h('span', { class: 'tx' + (strong ? ' strong' : ''), text: title }), txt ? h('span', { class: 'sub', text: txt }) : null);
  const word = { ok: 'passt', high: 'mehr als empfohlen', extra: 'eher unnötig' };
  const content = [
    c.mine.length ? secHead('Was du nimmst') : null,
    c.mine.length ? h('div', { class: 'ln' }, ...c.mine.map(m => h('div', { class: 'lr col' },
      h('div', { class: 'top' }, h('span', { class: 'tx', text: `${m.s.label}, ${de(m.s.amt, 1)} ${m.s.i === 'multi' ? 'Tablette' : REF[m.s.i][2]}${Math.abs((+m.s.freq || 1) - 1) > 0.01 ? ' ' + (FREQ.find(f => Math.abs(f[0] - m.s.freq) < 0.01) || ['', ''])[1].toLowerCase() : ''}` }), h('span', { class: 'n' + (m.state === 'high' ? ' strong' : ''), text: word[m.state] })),
      h('span', { class: 'sub', text: m.txt })))) : null,
    secHead('Empfehlung'),
    h('div', { class: 'ln' }, ...(c.recs.length ? c.recs.map(r => rowOf(r.title, r.txt)) : [rowOf('Gerade nichts', c.enough ? 'Was du isst und nimmst, passt.' : '')]),
      !c.enough ? rowOf('Noch zu wenig eingetragen', `Du hast an ${c.logged} der letzten 14 Tage eingetragen, was du gegessen hast. Ab 5 Tagen prüft die App auch Jod, Omega-3, Eisen und ob ein Supplement unnötig ist.`) : null),
    h('div', { class: 'ln' },
      lrow({ class: 'lr tap', onclick: () => { suppOpen = false; openProfileEdit(name, () => openSuppCheck()); } }, h('span', { class: 'tx', text: 'Supplemente eintragen oder ändern' }), h('span', { class: 'chev', text: '›' }))),
    secHead('Deine Angaben'),
    h('div', { class: 'ln' }, ...[...c.asks, ...['jodsalz', 'salz', 'sonne'].filter(k => !c.asks.includes(k) && (k !== 'salz' || c.pf.jodsalz === 'ja'))].map(askRow)),
    h('div', { class: 'greytxt sm', text: 'Ersetzt keinen Arzt. Bedarf nach DGE, Höchstmengen für Supplemente nach BfR.' }),
  ];
  suppOpen = true; const sc = $('#ov').classList.contains('on') ? $('#sheet').scrollTop : 0;
  openSheet('Supplemente', content); $('#sheet').scrollTop = sc;
}

// Auf Start höchstens eine Zeile: Warnung vor Frage vor Empfehlung
function suppTip() {
  const c = me() && suppCheck(me()); if (!c) return [];
  let row = null;
  if (c.hints[0]) row = lrow({ class: 'lr tap', onclick: openSuppCheck }, h('span', { class: 'tx', text: c.hints[0].title }), h('span', { class: 'chev', text: '›' }));
  else if (c.asks[0]) row = askRow(c.asks[0]);
  else if (c.recs[0]) row = lrow({ class: 'lr tap', onclick: openSuppCheck }, h('span', { class: 'tx', text: c.recs[0].title }), h('span', { class: 'chev', text: '›' }));
  return row ? [secHead('Supplemente'), h('div', { class: 'ln' }, row)] : [];
}
