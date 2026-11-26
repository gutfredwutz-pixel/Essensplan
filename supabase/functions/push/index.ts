// Supabase Edge Function "push": verschickt Mitteilungen (Web Push) an die iPhones.
// Wird jede Minute von der Datenbank aufgerufen (public.push_tick, siehe supabase-push.sql).
// Braucht keine eigenen Secrets: der Signier-Schlüssel kommt aus der Datenbank mit.
// In Supabase bei dieser Funktion "Verify JWT" ausschalten (die Datenbank hat keinen Nutzer-Token).

type Todo = { id: string; text?: string; date?: string; time?: string; repeat?: string; done?: boolean; doneDays?: Record<string, boolean>; remind?: number | string; created?: number };
type Goal = { id: string; title?: string; days?: Record<string, boolean>; created?: number };
type Sub = { id: string; sub: { endpoint: string; keys: { p256dh: string; auth: string } }; tz?: string; nudge?: boolean; todos: Todo[]; goals: Goal[]; sent: { key: string; at: string; kind: string }[] };

const enc = new TextEncoder();
const b64u = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const cat = (...a: Uint8Array[]) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let i = 0; for (const x of a) { o.set(x, i); i += x.length; } return o; };
async function hmac(key: Uint8Array, data: Uint8Array) {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data));
}

// Inhalt verschlüsseln nach RFC 8291 (aes128gcm)
export async function encrypt(payload: string, p256dh: string, auth: string) {
  const ua = unb64u(p256dh), secret = unb64u(auth);
  const eph = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']) as CryptoKeyPair;
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', eph.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', ua, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, eph.privateKey, 256));
  const prkKey = await hmac(secret, shared);
  const ikm = await hmac(prkKey, cat(enc.encode('WebPush: info\0'), ua, asPub, new Uint8Array([1])));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, cat(enc.encode('Content-Encoding: aes128gcm\0'), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, cat(enc.encode('Content-Encoding: nonce\0'), new Uint8Array([1])))).slice(0, 12);
  const k = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, k, cat(enc.encode(payload), new Uint8Array([2]))));
  const rs = new Uint8Array([0, 0, 16, 0]);
  return cat(salt, rs, new Uint8Array([asPub.length]), asPub, ct);
}

// Absender-Nachweis (VAPID, ES256)
export async function vapid(endpoint: string, priv: JsonWebKey, pub: string, site: string) {
  const aud = new URL(endpoint).origin;
  const head = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const body = b64u(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: site })));
  const key = await crypto.subtle.importKey('jwk', { ...priv, key_ops: ['sign'] }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(head + '.' + body)));
  return `vapid t=${head}.${body}.${b64u(sig)}, k=${pub}`;
}

const PUSH_HOSTS = /(^|\.)(push\.apple\.com|googleapis\.com|push\.services\.mozilla\.com|notify\.windows\.com)$/;
async function send(s: Sub, msg: Record<string, unknown>, cfg: { priv: JsonWebKey; pub: string; site: string }) {
  const ep = s.sub && s.sub.endpoint;
  if (!ep || !PUSH_HOSTS.test(new URL(ep).hostname)) return 400;
  const r = await fetch(ep, {
    method: 'POST',
    headers: { Authorization: await vapid(ep, cfg.priv, cfg.pub, cfg.site), TTL: '3600', 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', Urgency: 'normal' },
    body: await encrypt(JSON.stringify(msg), s.sub.keys.p256dh, s.sub.keys.auth),
  });
  await r.body?.cancel();
  return r.status;
}

/* ---------- Wann soll was kommen? ---------- */
function localNow(tz: string, d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d).map((x) => [x.type, x.value]));
  return { ds: `${p.year}-${p.month}-${p.day}`, min: +p.hour * 60 + +p.minute };
}
const toMin = (t: string) => { const m = /^(\d{1,2}):(\d{2})/.exec(t || ''); return m ? +m[1] * 60 + +m[2] : -1; };
const ymdDate = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
function dueOn(x: Todo, ds: string) { // wie in start.js
  const start = x.date || ds; if (!x.repeat || ds < start) return false;
  const d = ymdDate(ds), s = ymdDate(start);
  if (x.repeat === 'daily') return true;
  if (x.repeat === 'workdays') return d.getUTCDay() > 0 && d.getUTCDay() < 6;
  if (x.repeat === 'weekly') return d.getUTCDay() === s.getUTCDay();
  if (x.repeat === 'monthly') return d.getUTCDate() === s.getUTCDate();
  return false;
}
const openToday = (x: Todo, ds: string) => x.repeat ? dueOn(x, ds) && !(x.doneDays || {})[ds] : !x.done && (x.date || ds) <= ds;
export const remindOf = (x: Todo) => x.remind === 'off' ? -1 : (x.remind === undefined || x.remind === '' ? 15 : Number(x.remind));
const hash = (s: string) => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const join = (a: string[]) => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' und ' + a[a.length - 1];

export function plan(s: Sub, now = new Date()) {
  const { ds, min } = localNow(s.tz || 'Europe/Berlin', now);
  const sent = new Set((s.sent || []).map((x) => x.key));
  const out: { key: string; kind: string; msg: Record<string, unknown> }[] = [];
  const todos = s.todos || [], goals = s.goals || [];
  // 1. Erinnerungen für To-dos mit Uhrzeit (wählbar im To-do, Standard 15 Minuten vorher)
  for (const x of todos) {
    const tm = toMin(x.time || ''), rem = remindOf(x);
    if (tm < 0 || rem < 0 || !openToday(x, ds) || (!x.repeat && (x.date || ds) !== ds)) continue;
    const at = tm - rem, key = `r:${x.id}:${ds}:${rem}`;
    if (min < at || min - at > 20 || sent.has(key)) continue;
    const body = rem === 0 || min >= tm ? `Jetzt, um ${x.time}` : `In ${tm - min >= 60 ? 'einer Stunde' : tm - min === 1 ? 'einer Minute' : (tm - min) + ' Minuten'}, um ${x.time}`;
    out.push({ key, kind: 'remind', msg: { title: x.text || 'To-do', body, tag: 'r-' + x.id, url: './?tab=todo' } });
  }
  // 2. Anstupser in freien Lücken: offene Ziele und To-dos ohne Uhrzeit, höchstens 2 am Tag
  if (s.nudge !== false) {
    const timed = todos.filter((x) => toMin(x.time || '') >= 0 && openToday(x, ds) && (x.repeat || (x.date || ds) === ds)).map((x) => toMin(x.time || ''));
    const busy = timed.some((t) => Math.abs(t - min) < 60);
    const recent = (s.sent || []).some((x) => Date.now() - Date.parse(x.at) < 45 * 60000);
    const today = (s.sent || []).filter((x) => x.kind === 'nudge' && x.key.startsWith(`n:${ds}:`));
    const lastN = today.reduce((m, x) => Math.max(m, Date.parse(x.at)), 0);
    const h0 = hash(ds + s.id), first = 12 * 60 + (h0 % 90), second = 17 * 60 + 30 + ((h0 >> 8) % 90);
    const slotOk = today.length === 0 ? min >= first && min <= 21 * 60 : today.length === 1 && min >= second && min <= 21 * 60 && Date.now() - lastN >= 3 * 3600000;
    if (slotOk && !busy && !recent) {
      const had = new Set(today.map((x) => x.key.split(':')[2]));
      const cand = [
        ...goals.filter((g) => !(g.days || {})[ds]).map((g) => ({ id: g.id, text: g.title || '' })),
        ...todos.filter((x) => toMin(x.time || '') < 0 && openToday(x, ds)).sort((a, b) => (a.created || 0) - (b.created || 0)).map((x) => ({ id: x.id, text: x.text || '' })),
      ].filter((c) => c.text);
      const pick = cand.find((c) => !had.has(c.id)) || null;
      if (pick) {
        const rest = cand.filter((c) => c !== pick).slice(0, 2).map((c) => c.text);
        const more = cand.length - 1 - rest.length;
        const body = 'Gerade steht nichts an, guter Moment dafür.' + (rest.length ? ` Auch noch offen: ${join(more > 0 ? [...rest, `${more} weitere`] : rest)}.` : '');
        out.push({ key: `n:${ds}:${pick.id}`, kind: 'nudge', msg: { title: pick.text, body, tag: 'nudge', url: './?tab=todo' } });
      }
    }
  }
  return out;
}

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, 'content-type': 'application/json' } });

if (typeof Deno !== 'undefined') Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const b = await req.json();
    if (b.task !== 'push_tick' || !b.token || !b.priv || !b.pub || !b.url || !b.anon) return json({ ok: false, error: 'Unbekannte Aufgabe' }, 400);
    const cfg = { priv: b.priv as JsonWebKey, pub: String(b.pub), site: String(b.site || 'mailto:push@localhost') };
    const sent: { sub: string; key: string; kind: string }[] = [], gone: string[] = [];
    for (const s of (b.subs || []) as Sub[]) {
      const list = b.test === s.id ? [{ key: 'test:' + Date.now(), kind: 'test', msg: { title: 'Mitteilungen sind an', body: 'So sehen Erinnerungen und Anstupser aus.', tag: 'test', url: './' } }] : plan(s);
      for (const m of list) {
        const st = await send(s, m.msg, cfg).catch(() => 0);
        if (st === 404 || st === 410) { gone.push(s.id); break; }
        if (st >= 200 && st < 300) sent.push({ sub: s.id, key: m.key, kind: m.kind });
      }
    }
    // Zurückmelden, was raus ist (damit nichts doppelt kommt), und abgelaufene Geräte entfernen
    await fetch(String(b.url) + '/rest/v1/rpc/push_mark', {
      method: 'POST', headers: { apikey: String(b.anon), 'content-type': 'application/json' },
      body: JSON.stringify({ p_token: b.token, p_sent: sent, p_gone: gone }),
    }).then((r) => r.body?.cancel());
    return json({ ok: true, sent: sent.length, gone: gone.length });
  } catch (e) {
    return json({ ok: false, error: String((e as Error).message || e) }, 400);
  }
});
