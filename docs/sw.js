/* Keeps Follow-Through working offline: the app itself is cached; your data comes from your own script. */
const CACHE = 'ft-web-1373c2d4c2';
const SHELL = ['./', 'index.html', 'web.js', 'bisi.js', 'games.js', 'welcome.js', 'events.js', 'hive.js', 'kit.js', 'local.js', 'fun.js', 'grunge.js', 'fonts/nunito.woff2', 'fonts/patrickhand.woff2', 'fonts/smoochsans.woff2', 'fonts/spacegrotesk.woff2', 'fonts/spacemono.woff2', 'fonts/yellowtail.woff2',
  'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'Code.gs'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;   // never touch calls to your script
  // network first (so updates arrive), cached copy when offline
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
});
