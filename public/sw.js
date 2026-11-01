// Keeps the app shell available offline. Data always comes from the server.
// __V__ is replaced with the deployed commit, so each deploy is a new worker
// with its own cache, and old caches are thrown away.
const V = '__V__';
const CACHE = 'chart-vault-' + V;
const SHELL = ['/', '/app.css?v=' + V, '/app.js?v=' + V, '/numeroscope.js?v=' + V, '/number-colors.js?v=' + V, '/tag-codes.js?v=' + V, '/numbertools.js?v=' + V, '/tools.js?v=' + V, '/readings.js?v=' + V, '/bizwords.js?v=' + V, '/placewords.js?v=' + V, '/celebrities.js?v=' + V, '/reading.js?v=' + V, '/archetypes.js?v=' + V, '/meaning.js?v=' + V, '/lookup.js?v=' + V, '/manifest.webmanifest', '/icons/icon-192.png', ...['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'].map((p) => '/planets/' + p + '.webp')];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Opening the app must not wait for the network (owner 2026-11-01: a loading screen on every launch).
// Code files carry the commit in their address (?v=...), so a cached copy is never stale: cache first.
// The page itself: the cached copy at once, refreshed in the background; a new build shows the
// "Updated to build" banner, whose tap fetches the page fresh before reloading.
const put = (req, res) => (res.ok ? caches.open(CACHE).then((c) => c.put(req, res.clone())).catch(() => {}) : Promise.resolve());
const network = (req) => fetch(req, { cache: 'no-cache' }).then((res) => put(req, res).then(() => res));
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/img/') || url.pathname.startsWith('/thumb/')) return;
  const fixed = url.searchParams.has('v') || /^\/(icons|planets|fonts)\//.test(url.pathname);
  if (fixed) {
    e.respondWith(caches.match(e.request).then((hit) => hit || network(e.request)));
    return;
  }
  if (e.request.mode === 'navigate' && url.pathname === '/' && !url.search) {
    const fresh = network(e.request);
    e.waitUntil(fresh.catch(() => {}));
    e.respondWith(caches.match('/').then((hit) => hit || fresh).catch(() => fresh));
    return;
  }
  // Everything else (the sign-in link, the banner's fresh fetch): network first, cached copy only offline.
  e.respondWith(network(e.request).catch(() => caches.match(e.request).then((hit) => hit || caches.match('/'))));
});
