'use strict';
/* ============ Meine Lebensmittel: Strichcode, Nährwert-Foto, eigene Produkte ============
   Sammlung `foods` (ganzer Haushalt): name, brand, code, v (Nährwerte je 100 g, Reihenfolge wie nutrition.js), portion (g), alias (Text), src ('Strichcode' | 'Foto' | 'Eigen'), by, created.
   Strichcode: ZXing (lib/zxing.min.js, MIT) liest das Kamerabild, Nährwerte kommen von Open Food Facts.
   Foto: die KI (Aufgabe `label`) liest die Nährwerttabelle. */
let myFoods = [];

// Open Food Facts liefert alle Werte je 100 g in Gramm; umgerechnet auf die Einheiten der App
const OFF_MAP = [[0, 'energy-kcal', 1], [1, 'proteins', 1], [2, 'fat', 1], [3, 'carbohydrates', 1], [4, 'fiber', 1], [5, 'sugars', 1], [6, 'saturated-fat', 1], [7, 'salt', 1],
  [8, 'vitamin-a', 1e6], [9, 'vitamin-d', 1e6], [10, 'vitamin-e', 1e3], [11, 'vitamin-b1', 1e3], [12, 'vitamin-b2', 1e3], [13, 'vitamin-b6', 1e3], [14, 'vitamin-b9', 1e6], [15, 'vitamin-b12', 1e6], [16, 'vitamin-c', 1e3],
  [17, 'potassium', 1e3], [18, 'calcium', 1e3], [19, 'magnesium', 1e3], [20, 'iron', 1e3], [21, 'zinc', 1e3], [22, 'iodine', 1e6], [23, 'omega-3-fat', 1],
  [24, 'monounsaturated-fat', 1], [25, 'polyunsaturated-fat', 1], [26, 'omega-6-fat', 1], [27, 'alpha-linolenic-acid', 1], [28, 'eicosapentaenoic-acid', 1], [29, 'docosahexaenoic-acid', 1],
  [31, 'starch', 1], [32, 'vitamin-k', 1e6], [33, 'vitamin-pp', 1e3], [34, 'pantothenic-acid', 1e3], [35, 'biotin', 1e6], [36, 'phosphorus', 1e3], [37, 'copper', 1e3], [38, 'manganese', 1e3], [39, 'lactose', 1]];
function offVec(n) {
  const v = new Array(NV).fill(0);
  for (const [i, k, f] of OFF_MAP) { const x = +n[k + '_100g']; if (x > 0) v[i] = Math.round(x * f * 1000) / 1000; }
  if (!v[0] && +n['energy_100g']) v[0] = Math.round(+n['energy_100g'] / 4.184);
  if (!v[14] && +n['folates_100g']) v[14] = Math.round(+n['folates_100g'] * 1e6);
  return v;
}
async function offProduct(code) {
  const u = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=code,product_name,product_name_de,generic_name_de,brands,nutriments,serving_quantity,quantity`;
  const j = await (await fetch(u)).json();
  if (!j || j.status !== 1 || !j.product) return null;
  const p = j.product, n = p.nutriments || {};
  if (n['energy-kcal_100g'] == null && n['energy_100g'] == null) return { code, name: p.product_name_de || p.product_name || '', brand: (p.brands || '').split(',')[0].trim(), v: null };
  return { code, name: p.product_name_de || p.product_name || p.generic_name_de || 'Produkt', brand: (p.brands || '').split(',')[0].trim(), v: offVec(n), portion: Math.round(+p.serving_quantity) || null, src: 'Strichcode' };
}

/* ---- Unterseite in einem offenen Sheet, zurück per Wischen nach rechts ---- */
function subSheet(title, content, onBack) {
  const s = $('#sheet'); const saved = [...s.childNodes], sc = s.scrollTop, prevBack = sheetBack, cls = s.className;
  const restore = () => { if (onBack) onBack(); s.className = cls; s.replaceChildren(...saved); $('#ov').classList.add('on'); lockBody(true); barColor(); s.scrollTop = sc; sheetBack = prevBack; };
  openSheet(title, content); sheetBack = restore;
  const x = $('#sheet .xclose'); if (x) x.onclick = () => { if (onBack) onBack(); restore(); };
  return restore;
}

/* ---- Strichcode scannen ---- */
let zxingP = null;
function loadZxing() { if (window.ZXing) return Promise.resolve(); if (!zxingP) zxingP = new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = 'lib/zxing.min.js'; sc.onload = res; sc.onerror = rej; document.head.appendChild(sc); }); return zxingP; }
function zxReader() {
  const Z = window.ZXing, hints = new Map();
  hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.EAN_8, Z.BarcodeFormat.UPC_A, Z.BarcodeFormat.UPC_E]);
  hints.set(Z.DecodeHintType.TRY_HARDER, true);
  const r = new Z.MultiFormatReader(); r.setHints(hints); return r;
}
function zxDecode(reader, canvas) {
  const Z = window.ZXing;
  try { return reader.decode(new Z.BinaryBitmap(new Z.HybridBinarizer(new Z.HTMLCanvasElementLuminanceSource(canvas)))).getText(); } catch (e) { return null; }
}
async function decodeImageFile(file) {
  await loadZxing(); const reader = zxReader();
  const bmp = await createImageBitmap(file); const c = document.createElement('canvas'), ctx = c.getContext('2d');
  for (const rot of [0, 90]) {
    const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height)), w = Math.round(bmp.width * k), hh = Math.round(bmp.height * k);
    if (rot) { c.width = hh; c.height = w; ctx.translate(hh, 0); ctx.rotate(Math.PI / 2); } else { c.width = w; c.height = hh; }
    ctx.drawImage(bmp, 0, 0, w, hh); ctx.setTransform(1, 0, 0, 1, 0, 0);
    const t = zxDecode(reader, c); if (t) return t;
  }
  return null;
}
// Öffnet die Kamera; onCode(code) bekommt die erkannte Nummer
function openScanner(onCode) {
  let stream = null, timer = 0, done = false;
  const video = h('video', { class: 'scanv', playsinline: '', muted: '', autoplay: '' });
  const msg = h('div', { class: 'scanmsg', text: 'Kamera startet …' });
  const num = h('input', { class: 'scannum', placeholder: 'Oder Nummer eintippen', inputmode: 'numeric', enterkeyhint: 'search' });
  const file = h('input', { type: 'file', accept: 'image/*', class: 'hidden' });
  const stop = () => { done = true; clearInterval(timer); if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; };
  const finish = code => { if (done && !code) return; stop(); if (navigator.vibrate) navigator.vibrate(30); back(); onCode(code); };
  num.addEventListener('keydown', e => { if (e.key === 'Enter' && /^\d{6,14}$/.test(num.value.trim())) finish(num.value.trim()); });
  file.addEventListener('change', async () => { const f = file.files[0]; if (!f) return; msg.textContent = 'Lese das Foto …'; const t = await decodeImageFile(f).catch(() => null); if (t) finish(t); else msg.textContent = 'Auf dem Foto war kein Strichcode zu erkennen. Nochmal näher und gerade versuchen.'; });
  const back = subSheet('Strichcode scannen', [h('div', { class: 'scanbox' }, video, h('div', { class: 'scanline' })), msg,
    h('div', { class: 'ln scanalt' }, lrow({ class: 'lr' }, num), lrow({ class: 'lr tap', onclick: () => file.click() }, h('span', { class: 'tx', text: 'Foto vom Strichcode wählen' }), h('span', { class: 'chev', text: '›' }))), file], stop);
  (async () => {
    try {
      await loadZxing(); if (done) return;
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      if (done) { stream.getTracks().forEach(t => t.stop()); return; }
      video.srcObject = stream; await video.play().catch(() => { });
      msg.textContent = 'Halte den Strichcode in den Rahmen.';
      const reader = zxReader(), c = document.createElement('canvas'), ctx = c.getContext('2d', { willReadFrequently: true });
      timer = setInterval(() => {
        if (done || !video.videoWidth) return;
        const vw = video.videoWidth, vh = video.videoHeight, sw = Math.round(vw * 0.8), sh = Math.round(vh * 0.45);
        c.width = sw; c.height = sh; ctx.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, sw, sh);
        const t = zxDecode(reader, c); if (t) finish(t);
      }, 180);
    } catch (e) { console.warn(e); msg.textContent = 'Kein Zugriff auf die Kamera. Du kannst ein Foto vom Strichcode wählen oder die Nummer eintippen.'; }
  })();
}

/* ---- Nährwerttabelle fotografieren ---- */
const LABEL_MICRO = [[/vitamin a\b|retinol/, 8, 'µg'], [/vitamin d/, 9, 'µg'], [/vitamin e/, 10, 'mg'], [/vitamin b1\b|thiamin/, 11, 'mg'], [/vitamin b2|riboflavin/, 12, 'mg'], [/vitamin b6/, 13, 'mg'], [/fols|folat|vitamin b9/, 14, 'µg'], [/vitamin b12|cobalamin/, 15, 'µg'], [/vitamin c/, 16, 'mg'],
  [/kalium|potassium/, 17, 'mg'], [/calcium|kalzium/, 18, 'mg'], [/magnesium/, 19, 'mg'], [/eisen|iron/, 20, 'mg'], [/zink|zinc/, 21, 'mg'], [/jod|iod/, 22, 'µg'], [/omega.?3/, 23, 'g'], [/einfach unges|monounsat/, 24, 'g'], [/mehrfach unges|polyunsat/, 25, 'g'], [/omega.?6/, 26, 'g'],
  [/alpha.?linol|\bala\b/, 27, 'g'], [/\bepa\b|eicosapent/, 28, 'g'], [/\bdha\b|docosahex/, 29, 'g'], [/st(ä|ae)rke|starch/, 31, 'g'], [/vitamin k/, 32, 'µg'], [/niacin|vitamin b3/, 33, 'mg'], [/panthoten|pantothen|vitamin b5/, 34, 'mg'], [/biotin|vitamin b7/, 35, 'µg'], [/phosphor/, 36, 'mg'], [/kupfer|copper/, 37, 'mg'], [/mangan/, 38, 'mg'], [/lactose|laktose|milchzucker/, 39, 'g']];
const UNIT_F = { g: 1, mg: 1e-3, 'µg': 1e-6, ug: 1e-6, mcg: 1e-6 };
function convUnit(x, from, to) { const a = UNIT_F[String(from || to).toLowerCase().replace('μ', 'µ')] || UNIT_F[to]; return x * a / UNIT_F[to]; }
async function labelFromPhoto(file) {
  if (typeof aiCall !== 'function' || aiState === false) throw new Error('Für das Foto wird die KI gebraucht. Sie ist gerade nicht erreichbar.');
  const b64 = await toJpeg64(file, 1600);
  const d = await aiCall('label', { frames: [b64], text: 'Lies die Nährwerttabelle und den Produktnamen auf dem Foto.' });
  if (!d || d.kcal == null) return null;
  const v = new Array(NV).fill(0);
  [[0, 'kcal'], [1, 'protein'], [2, 'fat'], [3, 'carbs'], [4, 'fiber'], [5, 'sugar'], [6, 'sat_fat'], [7, 'salt']].forEach(([i, k]) => { const x = +d[k]; if (x > 0) v[i] = Math.round(x * 100) / 100; });
  for (const m of d.micros || []) { const nm = norm(m.name || '').replace(/ä/g, 'a'); const hit = LABEL_MICRO.find(([re]) => re.test(String(m.name || '').toLowerCase()) || re.test(nm)); if (hit && +m.amount > 0) v[hit[1]] = Math.round(convUnit(+m.amount, m.unit, hit[2]) * 1000) / 1000; }
  return { name: d.name || 'Produkt', brand: d.brand || '', v, portion: Math.round(+d.portion_g) || null, src: 'Foto' };
}

/* ---- Produkt ansehen, speichern, eintragen ---- */
const KEY_ROWS = [[0, 'Kalorien', 'kcal'], [1, 'Eiweiß', 'g'], [3, 'Kohlenhydrate', 'g'], [5, 'davon Zucker', 'g'], [2, 'Fett', 'g'], [6, 'davon gesättigt', 'g'], [4, 'Ballaststoffe', 'g'], [7, 'Salz', 'g']];
const numDe = x => (x >= 100 ? fmtInt(x) : String(Math.round(x * 10) / 10).replace('.', ','));
function myFoodId(p) { return p.id || (p.code ? 'c' + p.code : slug(p.name || 'produkt') + '-' + Date.now().toString(36)); }
async function saveMyFood(p) {
  const id = myFoodId(p); p.id = id;
  const doc = { name: p.name, brand: p.brand || '', code: p.code || '', v: p.v, portion: p.portion || null, alias: p.alias || '', src: p.src || 'Eigen', by: me(), created: p.created || Date.now() };
  await db.collection('foods').doc(id).set(doc);
  const i = myFoods.findIndex(x => x.id === id); if (i >= 0) myFoods[i] = { id, ...doc }; else myFoods.push({ id, ...doc });
  return id;
}
// p: Produkt; onUse(food) trägt ein (optional)
function openProductSheet(p, onUse, opts = {}) {
  const saved = () => !!(p.id && myFoods.some(x => x.id === p.id));
  const name = h('input', { class: 'pdname', value: p.name || '', placeholder: 'Name' });
  const alias = h('input', { class: 'pdin', value: p.alias || '', placeholder: 'z. B. Whey, Shake' });
  const portion = h('input', { class: 'pdin', value: p.portion ? String(p.portion) : '', placeholder: '100', inputmode: 'decimal' });
  const amount = h('input', { class: 'pdin', value: String(p.portion || 100), inputmode: 'decimal' });
  const status = h('div', { class: 'pdstat' });
  const autosave = () => { if (!saved()) return; p.name = name.value.trim() || p.name; p.alias = alias.value.trim(); p.portion = +String(portion.value).replace(',', '.') || null; saveMyFood(p).then(() => status.textContent = 'Gespeichert', () => status.textContent = 'Nicht gespeichert, keine Verbindung'); };
  [name, alias, portion].forEach(x => x.addEventListener('change', autosave));
  if (opts.edit && !p.v) p.v = new Array(NV).fill(0);
  const v = p.v || [];
  const rows = KEY_ROWS.map(([i, nm, u]) => {
    if (opts.edit) { const inp = h('input', { class: 'pdin', value: v[i] ? String(v[i]).replace('.', ',') : '', placeholder: '0', inputmode: 'decimal' }); inp.addEventListener('change', () => { v[i] = Math.max(0, +String(inp.value).replace(',', '.') || 0); autosave(); }); return lrow({}, h('span', { class: 'tx' + (/^davon/.test(nm) ? ' dim' : ''), text: nm }), inp, h('span', { class: 'dim pdu', text: u })); }
    return lrow({}, h('span', { class: 'tx' + (/^davon/.test(nm) ? ' dim' : ''), text: nm }), h('span', { class: 'n', text: v[i] ? `${numDe(v[i])} ${u}` : (i <= 3 ? '0 ' + u : '-') }));
  });
  const refs = typeof REF !== 'undefined' ? REF : {};
  const micro = Object.keys(refs).map(Number).filter(i => i > 7 && i !== 1 && v[i] > 0).map(i => lrow({}, h('span', { class: 'tx', text: refs[i][1] }), h('span', { class: 'n', text: `${numDe(v[i])} ${refs[i][2]}` })));
  const saveBtn = h('button', { class: 'pdbtn', onclick: async () => { p.name = name.value.trim() || p.name; p.alias = alias.value.trim(); p.portion = +String(portion.value).replace(',', '.') || null; try { await saveMyFood(p); saveBtn.remove(); status.textContent = 'In deinen Lebensmitteln gespeichert'; } catch (e) { showErr(e); } } }, 'In meine Lebensmittel');
  const useBtn = onUse ? h('button', { class: 'pdbtn', onclick: async () => {
    const g = Math.max(1, Math.round(+String(amount.value).replace(',', '.') || 100));
    p.name = name.value.trim() || p.name; p.alias = alias.value.trim(); p.portion = +String(portion.value).replace(',', '.') || p.portion || null;
    if (!saved() && opts.autoSave !== false) await saveMyFood(p).catch(() => { });
    back(); onUse(foodFromProduct(p, g));
  } }, 'Eintragen') : null;
  const del = saved() && opts.allowDelete ? h('button', { class: 'pdbtn dim', onclick: async () => { await db.collection('foods').doc(p.id).delete().catch(showErr); myFoods = myFoods.filter(x => x.id !== p.id); back(); if (opts.onDelete) opts.onDelete(); } }, 'Löschen') : null;
  const back = subSheet(p.brand ? p.brand : opts.edit ? 'Selbst anlegen' : p.src === 'BLS' ? 'Lebensmittel' : 'Produkt', [
    h('div', { class: 'pd' },
      name,
      h('div', { class: 'pdsrc', text: p.src === 'Foto' ? 'Von deinem Foto der Nährwerttabelle' : p.src === 'Strichcode' ? `Strichcode ${p.code || ''}, Werte von Open Food Facts` : p.src === 'OFF' ? 'Herstellerangaben von Open Food Facts' : p.src === 'BLS' ? `Lebensmittel-Datenbank: ${p.bls || p.name}` : opts.edit ? 'Trag die Werte pro 100 g von der Packung ein' : 'Eigenes Lebensmittel' }),
      onUse ? h('div', { class: 'pdline' }, h('span', { text: 'Gegessen' }), amount, h('span', { class: 'dim', text: 'g' }), h('span', { class: 'pdsp' }), useBtn) : null,
      secHead('Pro 100 g'), h('div', { class: 'ln' }, ...rows),
      micro.length ? secHead('Vitamine und Mineralstoffe') : null, micro.length ? h('div', { class: 'ln' }, ...micro) : null,
      secHead('Einstellungen'), h('div', { class: 'ln' },
        lrow({}, h('span', { class: 'tx', text: 'Eine Portion' }), portion, h('span', { class: 'dim', text: 'g' })),
        lrow({ class: 'lr col' }, h('span', { class: 'tx', text: 'So sage ich dazu' }), alias)),
      h('div', { class: 'pdacts' }, saved() ? null : saveBtn, del), status)]);
  return back;
}
function foodFromProduct(p, g) {
  const src = p.src === 'BLS' ? (p.bls || p.name) : p.src === 'OFF' ? `${p.brand ? p.brand + ', ' : ''}Open Food Facts` : p.brand ? `${p.brand}, eigenes Produkt` : 'Eigenes Produkt';
  return { name: p.name, amt: `${fmtInt(g)} g`, gr: g, v: p.v, src, portion: p.portion || 100, piece: p.portion || 100, my: p.id || null };
}

/* ---- Lebensmittel selbst suchen ---- */
function foodSearch(q) {
  const words = norm(q).split(' ').filter(w => w.length >= 2); if (!words.length) return [];
  const has = t => { const k = norm(t); return words.every(w => k.includes(w)); };
  const out = [], seen = new Set();
  const push = (x) => { const k = norm(x.name); if (seen.has(k)) return; seen.add(k); out.push(x); };
  for (const p of myFoods) if (p.v && has(`${p.name} ${p.brand || ''} ${p.alias || ''}`)) push({ ...p, mine: true });
  for (const [al, bls, portion, piece, v] of window.DIARY_FOODS || []) if (has(al.replace(/\|/g, ' ') + ' ' + bls)) push({ name: bls, bls, v, portion, src: 'BLS' });
  for (const [k, v] of Object.entries(window.NUTRI || {})) if (has(k)) { const b = baseByKey.get(k); push({ name: b ? b.name : cap(k), bls: '', v, portion: PIECE[k] || 100, src: 'BLS' }); if (out.length > 40) break; }
  if (blsAll) blsAll.filter(([n]) => has(n)).map(x => [x, blsRank(x[0], words)]).sort((a, b) => a[1] - b[1]).map(x => x[0]).slice(0, 30).forEach(([n, v]) => push({ name: n, bls: n, v, portion: 100, src: 'BLS' }));
  return out.slice(0, 50);
}
async function offSearch(q) {
  const u = 'https://world.openfoodfacts.org/cgi/search.pl?search_simple=1&json=1&page_size=20&lc=de&cc=de&fields=code,product_name,product_name_de,brands,nutriments,serving_quantity&search_terms=' + encodeURIComponent(q);
  const j = await (await fetch(u)).json();
  return (j.products || []).filter(p => p.nutriments && p.nutriments['energy-kcal_100g'] != null).map(p => ({ name: p.product_name_de || p.product_name || 'Produkt', brand: (p.brands || '').split(',')[0].trim(), code: p.code, v: offVec(p.nutriments), portion: Math.round(+p.serving_quantity) || null, src: 'OFF' }));
}
function searchFlow(onUse0, q0) {
  loadBls().catch(() => { });
  let backS = null; const onUse = onUse0 ? f => { if (backS) backS(); onUse0(f); } : null;
  const q = h('input', { class: 'scannum', placeholder: 'Lebensmittel oder Produkt', enterkeyhint: 'search', autocomplete: 'off' });
  const res = h('div', { class: 'ln' }), more = h('div', { class: 'ln' });
  const row = x => lrow({ class: 'lr tap', onclick: () => openProductSheet({ ...x }, onUse, { autoSave: !!(x.src === 'OFF') }) },
    h('span', { class: 'tx', text: x.name }), h('span', { class: 'n', text: x.mine ? (x.brand || 'Meins') : x.brand || `${fmtInt(x.v[0])} kcal` }), h('span', { class: 'chev', text: '›' }));
  let t = 0;
  const run = () => { const r = foodSearch(q.value); res.replaceChildren(...(r.length ? r.map(row) : q.value.trim().length >= 2 ? [lrow({}, h('span', { class: 'tx dim', text: 'Nichts gefunden. Probier die Markensuche oder leg es selbst an.' }))] : [])); };
  q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(run, 180); });
  q.addEventListener('keydown', e => { if (e.key === 'Enter') { q.blur(); run(); } });
  const offRow = lrow({ class: 'lr tap', onclick: async () => {
    if (q.value.trim().length < 2) return toast('Erst oben etwas eintippen');
    more.replaceChildren(lrow({}, h('span', { class: 'tx dim', text: 'Suche bei Open Food Facts …' })));
    try { const r = await offSearch(q.value.trim()); more.replaceChildren(...(r.length ? r.map(row) : [lrow({}, h('span', { class: 'tx dim', text: 'Kein Markenprodukt gefunden.' }))])); }
    catch (e) { more.replaceChildren(lrow({}, h('span', { class: 'tx dim', text: 'Open Food Facts gerade nicht erreichbar.' }))); }
  } }, h('span', { class: 'tx', text: 'Markenprodukte suchen' }), h('span', { class: 'chev', text: '›' }));
  backS = subSheet('Lebensmittel suchen', [h('div', { class: 'ln' }, lrow({ class: 'lr' }, q)), res, more,
    h('div', { class: 'ln srchmore' }, offRow,
      lrow({ class: 'lr tap', onclick: () => scanFlow(onUse) }, h('span', { class: 'tx', text: 'Strichcode scannen' }), h('span', { class: 'chev', text: '›' })),
      lrow({ class: 'lr tap', onclick: () => photoFlow(onUse) }, h('span', { class: 'tx', text: 'Nährwerte fotografieren' }), h('span', { class: 'chev', text: '›' })),
      lrow({ class: 'lr tap', onclick: () => openProductSheet({ name: cap(q.value.trim()), src: 'Eigen' }, onUse, { edit: true }) }, h('span', { class: 'tx', text: 'Selbst anlegen' }), h('span', { class: 'chev', text: '›' })))]);
  if (q0) { q.value = q0; run(); loadBls().then(run, () => { }); } else setTimeout(() => q.focus(), 60);
}
// Ganzer Ablauf: scannen → nachschlagen → Produktfenster
function scanFlow(onUse) {
  openScanner(async code => {
    const known = myFoods.find(x => x.code === code); if (known) return openProductSheet({ ...known }, onUse);
    toast('Suche das Produkt …');
    let p = null; try { p = await offProduct(code); } catch (e) { toast('Open Food Facts gerade nicht erreichbar'); return; }
    if (!p) { toast('Produkt nicht gefunden. Fotografier die Nährwerttabelle.'); return photoFlow(onUse, { code }); }
    if (!p.v) { toast('Zu diesem Produkt fehlen Nährwerte. Fotografier die Nährwerttabelle.'); return photoFlow(onUse, { code, name: p.name, brand: p.brand }); }
    openProductSheet(p, onUse);
  });
}
function photoFlow(onUse, base = {}) {
  const file = h('input', { type: 'file', accept: 'image/*' }); file.style.display = 'none'; document.body.appendChild(file);
  file.addEventListener('change', async () => {
    const f = file.files[0]; file.remove(); if (!f) return;
    toast('Lese die Nährwerte …');
    try {
      const p = await labelFromPhoto(f);
      if (!p) return toast('Auf dem Foto war keine Nährwerttabelle zu lesen. Nochmal gerade und näher versuchen.');
      if (base.code) p.code = base.code; if (base.name && (!p.name || p.name === 'Produkt')) p.name = base.name; if (base.brand && !p.brand) p.brand = base.brand;
      openProductSheet(p, onUse);
    } catch (e) { toast(e.message || 'Konnte das Foto nicht lesen'); }
  });
  file.click();
}

/* ---- Erkennung: eigene Produkte zuerst ---- */
function myFoodIndex() {
  const m = new Map();
  for (const p of myFoods) {
    const keys = [p.name, p.brand ? p.brand + ' ' + p.name : '', ...(p.alias || '').split(/[,;]/)].map(x => norm(String(x || '').replace(/[-–/]/g, ' '))).filter(x => x.length >= 2);
    for (const k of keys) if (!m.has(k)) m.set(k, p);
  }
  return m;
}
function mineF(p) { return { name: p.name, src: p.brand ? `${p.brand}, eigenes Produkt` : 'Eigenes Produkt', v: p.v, portion: p.portion || 100, piece: p.portion || 100 }; }
function findMine(words) {
  if (!myFoods.length) return null; const m = myFoodIndex();
  for (let n = Math.min(5, words.length); n >= 1; n--) for (let s = 0; s + n <= words.length; s++) {
    const p = m.get(words.slice(s, s + n).join(' '));
    if (p && p.v) return { s, n, f: mineF(p) };
  }
  // Mindestens zwei gesagte Wörter, die alle im Produktnamen stecken („Clear Whey“ → „Clear Whey Pfirsich“)
  for (let n = Math.min(4, words.length); n >= 2; n--) for (let s = 0; s + n <= words.length; s++) {
    const ph = words.slice(s, s + n);
    const hits = myFoods.filter(p => p.v && ph.every(w => norm(`${p.brand || ''} ${p.name}`.replace(/[-–/]/g, ' ')).split(' ').includes(w)));
    if (hits.length) return { s, n, f: mineF(hits.sort((a, b) => a.name.length - b.name.length)[0]) };
  }
  return null;
}
function myFoodsContext() { return myFoods.length ? 'Eigene Produkte (wenn passend, genau diesen Namen nehmen; Portion in g): ' + myFoods.slice(0, 60).map(p => `${p.name}${p.brand ? ' (' + p.brand + ')' : ''}${p.alias ? ' [' + p.alias + ']' : ''}${p.portion ? ' ' + p.portion + ' g' : ''}`).join('; ') : ''; }

/* ---- Einstellungen > Meine Lebensmittel ---- */
function myFoodsPage(note) {
  const list = myFoods.slice().sort((a, b) => (a.name || '').localeCompare(b.name || '', 'de'));
  const re = () => refreshSet();
  return [note('Produkte, die du gescannt, fotografiert oder angelegt hast. Die App erkennt sie beim Diktieren, auch unter dem Namen bei „So sage ich dazu“.'),
    h('div', { class: 'ln' },
      lrow({ class: 'lr tap', onclick: () => scanFlow(null) }, h('span', { class: 'tx', text: 'Strichcode scannen' }), h('span', { class: 'chev', text: '›' })),
      lrow({ class: 'lr tap', onclick: () => photoFlow(null) }, h('span', { class: 'tx', text: 'Nährwerttabelle fotografieren' }), h('span', { class: 'chev', text: '›' })),
      lrow({ class: 'lr tap', onclick: () => openProductSheet({ name: '', src: 'Eigen' }, null, { edit: true }) }, h('span', { class: 'tx', text: 'Selbst anlegen' }), h('span', { class: 'chev', text: '›' }))),
    list.length ? h('div', { class: 'ln', style: 'margin-top:18px' }, ...list.map(p => lrow({ class: 'lr tap', onclick: () => openProductSheet({ ...p }, null, { allowDelete: true, onDelete: re }) }, h('span', { class: 'tx', text: p.name }), h('span', { class: 'n', text: p.brand || '' }), h('span', { class: 'chev', text: '›' })))) : note('Noch keine eigenen Lebensmittel.')];
}
