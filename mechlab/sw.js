// MechLab service worker: lets the app open offline and install like a real app.
// Network first (so updates show up right away), falling back to the cached copy.
const CACHE = 'mechlab-v3';
const SHELL = ['./', 'index.html', 'style.css', 'app.js', 'prompts.js', 'labs/gcode.js', 'labs/cnc-ui.js', 'labs/vision.js', 'manifest.webmanifest', 'icons/icon.svg',
  'vendor/marked.mjs', 'vendor/purify.mjs', 'vendor/katex.mjs', 'vendor/katex.min.css'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // never touch AI API calls
  e.respondWith(fetch(e.request).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('index.html'))));
});
