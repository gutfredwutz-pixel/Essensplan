'use strict';
/* Vorrat (was zu Hause ist) und Essensvorschläge auf Start.
   Sammlung pantry, gilt für den ganzen Haushalt: { name, qty, category, added, by }.
   Die Vorschläge rechnen auf dem Gerät mit den BLS-Werten; nur „Gericht-Ideen“ fragt die KI. */

let pantry = [];
ART.pan = ART.rec; TITLES.pan = 'Essen';
const FRESH = new Set(['Obst & Gemüse', 'Milch & Eier', 'Fleisch & Fisch']);
const daysSince = ts => ts ? Math.floor((Date.now() - ts) / 864e5) : 0;
const inPantry = n => pantry.find(p => canon(p.name) === canon(n));
const onShopList = n => items.some(i => !i.checked && canon(i.name) === canon(n));
const agoTxt = d => d <= 0 ? 'seit heute' : d === 1 ? 'seit gestern' : `seit ${d} Tagen`;

function addPantry(raw, extra) {
  if (!db) return toast('Nicht verbunden');
  for (const part of String(raw).split(/,|\sund\s/)) {
    const p = parseEntry(part.trim()); if (!p.name) continue;
    const ex = inPantry(p.name);
    if (ex) { db.collection('pantry').doc(ex.id).update({ qty: p.qty || ex.qty || '', added: Date.now() }); continue; }
    db.collection('pantry').doc(slug(canonName(p.name)) || null).set(Object.assign({ name: p.name, qty: p.qty, category: catOf(p.name), added: Date.now(), by: me() }, extra || {}));
  }
}
// Abgehakte Sachen aus der Einkaufsliste in den Vorrat übernehmen
function cartToPantry() {
  const done = items.filter(i => i.checked); if (!done.length) return;
  for (const i of done) { if (!isNever(i.name)) addPantry((i.qty ? i.qty + ' ' : '') + i.name); queue('items/' + i.id, () => db.collection('items').doc(i.id).delete()); }
  toast(done.length === 1 ? '1 Sache im Vorrat' : `${done.length} Sachen im Vorrat`);
}
function usedUp(p, toList) {
  db.collection('pantry').doc(p.id).delete();
  if (toList) { addItem(p.name); toast(p.name + ' steht auf der Liste'); }
  closeSheet();
}
function openPantryItem(p) {
  const qi = h('input', { class: 'inp', value: p.qty || '', placeholder: 'Menge, z. B. 500 g', onchange: e => db.collection('pantry').doc(p.id).update({ qty: e.target.value.trim() }) });
  const st = gapState(), fit = st && st.lack.length ? foodFit(p.name, st) : null;
  const recs = recipes.filter(r => (r.ingredients || []).some(x => canon(x.name) === canon(p.name))).slice(0, 4);
  openSheet(p.name, [h('div', { class: 'form' },
    h('div', { class: 'fl' }, h('span', { text: 'Im Vorrat' }), h('span', { class: 'muted', text: agoTxt(daysSince(p.added)) })),
    h('label', { class: 'fl' }, h('span', { text: 'Menge' }), qi),
    fit && fit.parts.length ? h('div', { class: 'fl' }, h('span', { text: `Bringt in ${fit.g} g` }), h('span', { class: 'muted', text: fit.parts.slice(0, 3).map(x => `${x.nm} ${de(x.pct)} %`).join(', ') })) : null,
    ...recs.map(r => h('div', { class: 'fl tap', onclick: () => { closeSheet(); setTimeout(() => openRecipeView(r), 320); } }, h('span', { text: r.title }), h('span', { class: 'chev', text: '›' }))),
    h('button', { class: 'btn p done', onclick: () => usedUp(p, false) }, 'Aufgebraucht'),
    h('button', { class: 'btn g done', onclick: () => usedUp(p, true) }, 'Aufgebraucht, auf die Liste'))]);
}
function pantryRow(p) {
  const d = daysSince(p.added), old = FRESH.has(p.category) && d >= 4;
  return lrow({ class: 'lr tap', onclick: () => openPantryItem(p) },
    h('span', { class: 'tx', text: p.name }),
    p.qty ? h('span', { class: 'n', text: p.qty }) : null,
    old ? h('span', { class: 'n old', text: agoTxt(d) }) : null, h('span', { class: 'chev', text: '›' }));
}
PAGES.pan = function () {
  const cart = items.filter(i => i.checked);
  const sorted = pantry.slice().sort((a, b) => CATS.indexOf(CATS.includes(a.category) ? a.category : 'Sonstiges') - CATS.indexOf(CATS.includes(b.category) ? b.category : 'Sonstiges') || a.name.localeCompare(b.name, 'de'));
  const rows = []; let last = null;
  for (const p of sorted) { const c = CATS.includes(p.category) ? p.category : 'Sonstiges'; const r = pantryRow(p); if (last && c !== last) r.classList.add('gap'); last = c; rows.push(r); }
  return h('div', { class: 'pg' },
    cart.length ? secHead('Vom Einkauf', cart.length === 1 ? '1 Sache im Wagen' : `${cart.length} Sachen im Wagen`) : null,
    cart.length ? h('div', { class: 'ln' }, lrow({ class: 'lr tap', onclick: cartToPantry }, h('span', { class: 'tx', text: 'Alles in den Vorrat' }), h('span', { class: 'chev', text: '›' }))) : null,
    secHead('Zu Hause', pantry.length ? String(pantry.length) : null),
    h('div', { class: 'ln pantry' }, addRow('Was ist da? z. B. Reis, 6 Eier', s => addPantry(s)), ...rows),
    !pantry.length ? h('div', { class: 'greytxt', text: 'Abgehakte Sachen aus der Einkaufsliste kannst du mit einem Tipp übernehmen.' }) : null);
};

/* ---------- Gewohnheiten: was du oft isst, kochst und kaufst (letzte 30 Tage) ---------- */
function habits() {
  const name = me(), eat = new Map(), cook = new Map(), buy = new Map(), inc = (m, k, n = 1) => k && m.set(k, (m.get(k) || 0) + n);
  for (let i = 0; i < 30; i++) {
    const ds = ymd(addDays(new Date(), -i)), e = diary[name + '_' + ds];
    if (e) for (const f of e.foods || []) inc(eat, canonName(f.name));
    for (const p of planOn(ds)) inc(cook, p.title || (recipeOf(p) || {}).title);
  }
  for (const k of known.values()) if (k.count > 1 && k.name) inc(buy, canonName(k.name), k.count);
  const top = (m, n) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(x => x[0]);
  const fam = new Map(); for (const [k, v] of eat) fam.set(canon(k), (fam.get(canon(k)) || 0) + v); for (const [k, v] of buy) fam.set(canon(k), (fam.get(canon(k)) || 0) + v);
  return { eaten: top(eat, 10), cooked: top(cook, 6), bought: top(buy, 10), fam };
}

/* ---------- Was fehlt dir? ---------- */
// Nährstoffe, die in den letzten 7 Tagen im Schnitt unter 80 % lagen (wie „Fehlt am meisten“ in der Statistik)
function gapState() {
  const name = me(); if (!name) return null;
  const pf = profiles[name], nd = pf ? needsOf(pf) : avgNeeds(), refs = allRefs(nd);
  const days = [...Array(7)].map((_, i) => ymd(addDays(new Date(), i - 6)));
  const d = rangeData(name, days); if (!d.n) return { refs, lack: [], none: true };
  const lack = [];
  for (const [, keys] of NUT_GROUPS) for (const i of keys) {
    if (MACRO.has(i) || LIMIT_KEYS.has(i) || !refs[i]) continue;
    const pct = d.total[i] / d.n / refs[i][0] * 100; if (pct < 80) lack.push({ i, nm: refs[i][1], pct, gap: (100 - pct) / 100 });
  }
  lack.sort((a, b) => a.pct - b.pct);
  const t = dayIntake(name, today()), kcalOpen = t.logged ? Math.round(refs[0][0] - t.tot[0]) : null;
  return { refs, lack: lack.slice(0, 5), kcalOpen };
}
// Wie gut passt ein Lebensmittel (eine übliche Portion) zu den Lücken?
function foodFit(name, st) {
  const v = nutOf({ name }); if (!v || !dietOk(name) || isSpice(name)) return null;
  const g = portionOf(name);
  let score = 0; const parts = [];
  for (const l of st.lack) {
    if (NO_FOOD_TIP.has(l.i)) continue;
    const share = (v[l.i] || 0) * g / 100 / st.refs[l.i][0]; if (share <= 0) continue;
    score += l.gap * Math.min(share, l.gap); if (share >= 0.12) parts.push({ nm: l.nm, pct: Math.round(share * 100) });
  }
  // zu viel Salz oder gesättigte Fette bremsen
  for (const i of LIMIT_KEYS) if (st.refs[i]) { const s = (v[i] || 0) * g / 100 / st.refs[i][0]; if (s > 0.25) score -= (s - 0.25) * 0.5; }
  parts.sort((a, b) => b.pct - a.pct);
  return { name, g, score, parts };
}
const fitTxt = f => f.parts.slice(0, 2).map(x => x.nm).join(', ');
function buyCandidates(st) {
  // nur Alltägliches: feste Alltagsliste, gute Quellen daraus und was ihr ohnehin oft kauft oder esst
  const fam = habits().fam, every = new Set(EVERYDAY.map(canon)), names = new Set();
  const ok = n => every.has(canon(n)) || (fam.get(canon(n)) || 0) >= 2;
  for (const l of st.lack) {
    if (NO_FOOD_TIP.has(l.i)) continue;
    for (const [n] of (GOOD_SRC[l.i] || [])) if (ok(n)) names.add(n);
    for (const n of suggestFoods2(l.i)) names.add(n);
  }
  for (const [k, c] of fam) if (c >= 2) { const v = nutOf({ name: k }); if (v) names.add(k.replace(/^./, x => x.toUpperCase())); }
  return greedy([...names].filter(n => !inPantry(n) && !onShopList(n)), st, 8);
}
// Jod fehlt und kein Jodsalz im Haus: das ist der einfachste Tipp, kein Fisch
function jodTip(st) {
  const pf = profiles[me()] || {};
  if (pf.jodsalz === 'ja' || !st.lack.some(l => l.i === 22) || inPantry('Jodsalz') || onShopList('Jodsalz')) return null;
  return { name: 'Jodsalz', txt: 'statt normalem Salz, für Jod' };
}
// Nacheinander auswählen: nach jedem Treffer gilt dessen Lücke als kleiner, damit nicht dreimal dasselbe kommt
function greedy(names, st, n) {
  const fam = habits().fam;
  const s2 = { refs: st.refs, lack: st.lack.map(l => Object.assign({}, l)) }, out = [], seen = new Set();
  let pool = [...new Set(names)].filter(x => { const c = canon(x); if (seen.has(c)) return false; seen.add(c); return true; });
  while (out.length < n && pool.length) {
    const fits = pool.map(x => foodFit(x, s2)).filter(f => f && f.score > 0.02 && f.parts.length)
      .map(f => Object.assign(f, { rank: f.score * (1 + 0.35 * Math.min(1, (fam.get(canon(f.name)) || 0) / 4)) })).sort((a, b) => b.rank - a.rank);
    if (!fits.length) break;
    const f = fits[0]; out.push(foodFit(f.name, st)); pool = pool.filter(x => x !== f.name);
    for (const l of s2.lack) { const v = nutOf({ name: f.name }), sh = (v[l.i] || 0) * f.g / 100 / st.refs[l.i][0]; l.gap = Math.max(0, l.gap - sh); }
    s2.lack = s2.lack.filter(l => l.gap > 0.05);
  }
  return out.map((f, k) => f || null).filter(Boolean);
}
function eatSoon(st) {
  const top = st.lack.length ? greedy(pantry.map(p => p.name), st, 3).map(f => ({ p: inPantry(f.name), f, d: daysSince(inPantry(f.name).added), s: 1 })) : [];
  const rest = pantry.filter(p => !top.some(t => t.p === p)).map(p => {
    const d = daysSince(p.added), fresh = FRESH.has(p.category);
    return { p, f: null, d, fresh };
  }).filter(x => x.fresh && x.d >= 3).sort((a, b) => b.d - a.d);
  return [...top, ...rest];
}
// Eigene Rezepte, für die das meiste schon da ist
function pantryRecipes() {
  return recipes.map(r => {
    const ings = (r.ingredients || []).filter(g => g.name && !isNever(g.name) && !isSpice(g.name));
    const have = ings.filter(g => inPantry(g.name)), miss = ings.filter(g => !inPantry(g.name));
    return { r, n: ings.length, have: have.length, miss };
  }).filter(x => x.n >= 2 && x.have >= 2 && x.have / x.n >= 0.5).sort((a, b) => b.have / b.n - a.have / a.n || b.have - a.have);
}

/* ---------- Auf Start ---------- */
function foodTips() {
  if (!me()) return [];
  const st = gapState(); if (!st) return [];
  const out = [];
  const soon = eatSoon(st).slice(0, 3), rec = pantryRecipes()[0], buy = st.none ? [] : [jodTip(st), ...buyCandidates(st)].filter(Boolean).slice(0, 3);
  const meta = st.kcalOpen != null && st.kcalOpen >= 150 ? `heute noch ${de(st.kcalOpen)} kcal` : null;
  const soonRows = soon.map(x => lrow({ class: 'lr tap', onclick: () => openPantryItem(x.p) },
    h('span', { class: 'tx', text: x.p.name }), h('span', { class: 'n', text: x.f && x.f.parts.length ? fitTxt(x.f) : agoTxt(x.d) }), h('span', { class: 'chev', text: '›' })));
  if (rec) soonRows.push(lrow({ class: 'lr tap', onclick: () => openRecipeView(rec.r) }, h('span', { class: 'tx', text: rec.r.title }), h('span', { class: 'n', text: `${rec.have} von ${rec.n} Zutaten da` }), h('span', { class: 'chev', text: '›' })));
  soonRows.push(lrow({ class: 'lr tap', onclick: () => openMealIdeas() }, h('span', { class: 'tx', text: 'Gericht-Ideen' }), h('span', { class: 'n', text: pantry.length ? 'mit deinem Vorrat' : '' }), h('span', { class: 'chev', text: '›' })));
  if (!pantry.length) soonRows.unshift(lrow({ class: 'lr tap', onclick: () => goTab('pan', 1) }, h('span', { class: 'add', text: 'Vorrat eintragen, dann passen die Vorschläge besser' })));
  out.push(secHead('Bald essen', meta), h('div', { class: 'ln tipl' }, ...soonRows));
  if (buy.length) out.push(secHead('Einkaufen'), h('div', { class: 'ln tipl' }, ...buy.map(buyRow)));
  return out;
}
function buyRow(f) {
  const n = h('span', { class: 'n', text: f.txt || fitTxt(f) });
  const b = slAddBtn(f.name);
  b.addEventListener('click', () => { n.textContent = 'auf der Liste'; });
  return lrow({ class: 'lr tap buy', onclick: e => { if (e.target.closest('.sladdb')) return; b.click(); } }, h('span', { class: 'tx', text: f.name }), n, b);
}

/* ---------- Gericht-Ideen (KI) ---------- */
// Die KI bekommt nur Namen und Zahlen, keine Personendaten. Ergebnis wird pro Tag und Vorrat gemerkt, damit wiederholtes Öffnen nichts kostet.
function mealContext(st) {
  const pan = pantry.map(p => `${p.name}${p.qty ? ' (' + p.qty + ')' : ''}${FRESH.has(p.category) ? ', ' + agoTxt(daysSince(p.added)) : ''}`);
  const lack = st.lack.map(l => `${l.nm}: im Schnitt ${Math.round(l.pct)} % vom Bedarf`);
  const buy = st.none ? [] : buyCandidates(st).slice(0, 8).map(f => `${f.name} (${fitTxt(f)})`);
  return [
    'Vorrat zu Hause: ' + (pan.join('; ') || 'nichts eingetragen'),
    'Fehlt in den letzten 7 Tagen: ' + (lack.join('; ') || (st.none ? 'unbekannt, noch nichts eingetragen' : 'nichts Wichtiges')),
    st.kcalOpen != null ? `Heute noch offen: etwa ${Math.max(0, st.kcalOpen)} kcal` : '',
    buy.length ? 'Gute Kauf-Ideen laut Nährwerttabelle: ' + buy.join('; ') : '',
    recipes.length ? 'Eigene Rezepte: ' + recipes.slice(0, 40).map(r => r.title).join('; ') : '',
    (hhSet.never || []).length ? 'Mögen wir nicht: ' + hhSet.never.join(', ') : '',
    ...(hb => [hb.eaten.length ? 'Isst oft: ' + hb.eaten.join(', ') : '', hb.cooked.length ? 'Kocht oft: ' + hb.cooked.join(', ') : '', hb.bought.length ? 'Kauft oft: ' + hb.bought.join(', ') : '',
      (hb.eaten.length || hb.cooked.length) ? 'Bevorzuge Gerichte und Zutaten, die oft gegessen werden. Höchstens eine Idee darf etwas Neues sein.' : ''])(habits()),
  ].filter(Boolean).join('\n');
}
async function openMealIdeas(fresh) {
  const st = gapState() || { refs: {}, lack: [], none: true };
  const ctx = mealContext(st), key = 'ep_meal_' + me() + '_' + today();
  let cached = null; try { const c = JSON.parse(LS.get(key) || 'null'); if (c && c.ctx === ctx) cached = c.data; } catch (e) { }
  const body = h('div', { class: 'ln ideas' });
  openSheet('Gericht-Ideen', [body]);
  const show = data => {
    const ideas = (data && data.ideas) || [];
    if (!ideas.length) return fallback();
    body.replaceChildren(...ideas.map(ideaBlock), h('div', { class: 'links' }, h('button', { onclick: () => openMealIdeas(true) }, 'Andere Ideen')));
  };
  const fallback = () => {
    const rs = pantryRecipes().slice(0, 4);
    body.replaceChildren(h('div', { class: 'greytxt', text: 'Die KI ist gerade nicht erreichbar.' + (rs.length ? ' Aus deinen Rezepten passt:' : '') }),
      ...rs.map(x => lrow({ class: 'lr tap', onclick: () => { closeSheet(); setTimeout(() => openRecipeView(x.r), 320); } }, h('span', { class: 'tx', text: x.r.title }), h('span', { class: 'n', text: `${x.have} von ${x.n} da` }))));
  };
  if (cached && !fresh) return show(cached);
  body.replaceChildren(h('div', { class: 'greytxt', text: 'Einen Moment, die KI überlegt …' }));
  const data = await aiCall('meal', { context: ctx, text: fresh ? 'Bitte andere Ideen als eben.' : 'Was soll ich bald essen?' });
  if (data && data.ideas) LS.set(key, JSON.stringify({ ctx, data }));
  if (body.isConnected) show(data);
}
function ideaBlock(x) {
  const buy = (x.buy || []).filter(Boolean);
  return h('div', { class: 'idea' },
    h('div', { class: 'it', text: x.title }),
    x.why ? h('div', { class: 'iw', text: x.why }) : null,
    (x.use || []).length ? h('div', { class: 'iu', text: 'Aus dem Vorrat: ' + x.use.join(', ') }) : null,
    buy.length ? h('div', { class: 'ib2' }, h('span', { text: 'Dazu kaufen: ' }), ...buy.map((n, k) => {
      const b = h('button', { class: 'buyt' + (onShopList(n) ? ' on' : ''), text: n + (k < buy.length - 1 ? ',' : '') });
      b.onclick = () => { if (b.classList.contains('on')) return; addItem(n); b.classList.add('on'); toast(n + ' steht auf der Liste'); };
      return b;
    })) : null,
    (x.steps || []).length ? h('div', { class: 'is', text: x.steps.join(' ') }) : null);
}
