// Teranga Livraison : ouverture sans internet + avis des nouvelles courses (Seck Apps)
const CACHE = 'teranga-livraison-v1';
const BASE = ['./', './index.html', './commande.html', './icon-192.png', './apple-touch-icon.png',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(BASE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('teranga-livraison-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
function fromNetwork(req, ms) {
  return new Promise((ok, ko) => { const t = setTimeout(ko, ms); fetch(req).then(r => { clearTimeout(t); ok(r); }, e => { clearTimeout(t); ko(e); }); });
}
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('supabase.co') || url.hostname.endsWith('supabase.in')) return;   // les données ne passent jamais par le cache
  if (req.mode === 'navigate') {
    const page = url.pathname.endsWith('commande.html') ? './commande.html' : './';
    e.respondWith(fromNetwork(req, 6000).then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(page, copy)); } return r; })
      .catch(() => caches.match(page).then(r => r || caches.match('./'))));
    return;
  }
  if (url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'fonts.gstatic.com' || url.hostname === 'fonts.googleapis.com' || url.origin === location.origin) {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(n => { if (n.ok || n.type === 'opaque') { const c2 = n.clone(); caches.open(CACHE).then(c => c.put(req, c2)); } return n; })));
  }
});
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Teranga Livraison', {
    body: d.body || '', tag: d.tag || 'livraison-' + Date.now(), renotify: true, vibrate: [300, 120, 300, 120, 300],
    icon: './apple-touch-icon.png', badge: './icon-192.png', data: { url: './' }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) if (!/commande\.html/.test(w.url)) { await w.focus(); return; }
    await self.clients.openWindow('./');
  })());
});
