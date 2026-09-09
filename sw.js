// Service worker: installable, playable offline, and self-updating.
// Network-first so a new deploy is picked up at once; the cache is only the offline fallback.
// Scope-relative paths, so it works both at the local dev root and under /planeta/ on GitHub Pages.
const CACHE = 'planeta-20260909155324'; // bumped automatically by deploy.py
const FILES = ['./', './index.html', './style.css', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png',
  './js/main.js', './js/game.js', './js/audio.js', './js/i18n.js', './js/themes.js', './js/storage.js', './js/rng.js', './js/share.js', './js/journey.js', './js/encounters.js', './js/music.js',
  'https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.js'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES).catch(() => {}))); self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const scope = new URL(self.registration.scope);
  const own = url.origin === scope.origin && url.pathname.startsWith(scope.pathname);
  if (!own && !url.hostname.includes('cdn.jsdelivr.net')) return;
  e.respondWith(fetch(req, { cache: 'no-cache' }).then((r) => { if (r && r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return r; })
    .catch(() => caches.match(req, { ignoreSearch: true })));
});
