// Keeps the app shell available offline. Data always comes from the server.
// __V__ is replaced with the deployed commit, so each deploy is a new worker
// with its own cache, and old caches are thrown away.
const V = '__V__';
const CACHE = 'chart-vault-' + V;
const SHELL = ['/', '/app.css?v=' + V, '/app.js?v=' + V, '/numeroscope.js?v=' + V, '/number-colors.js?v=' + V, '/tag-codes.js?v=' + V, '/numbertools.js?v=' + V, '/tools.js?v=' + V, '/readings.js?v=' + V, '/bizwords.js?v=' + V, '/placewords.js?v=' + V, '/celebrities.js?v=' + V, '/reading.js?v=' + V, '/archetypes.js?v=' + V, '/meaning.js?v=' + V, '/manifest.webmanifest', '/icons/icon-192.png', ...['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'].map((p) => '/planets/' + p + '.webp')];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/img/') || url.pathname.startsWith('/thumb/')) return;
  // Network first (always fresh when online); cached copy only when offline.
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' }).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request).then((hit) => hit || caches.match('/')))
  );
});
