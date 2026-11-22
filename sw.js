// Große Dateien (Modelle, Bibliotheken) lokal behalten, alles andere frisch laden
const BIG = 'ep-big-v1';
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (u.origin !== location.origin || e.request.method !== 'GET') return;
  if (/\/(models|ort|lib|lang)\//.test(u.pathname)) {
    e.respondWith(caches.open(BIG).then(async c => {
      const hit = await c.match(e.request); if (hit) return hit;
      const r = await fetch(e.request); if (r.ok) c.put(e.request, r.clone()); return r;
    }));
  }
});
