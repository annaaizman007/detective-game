// Offline after the first visit -- and never stale after a deploy.
//
// Hashed build files (assets/index-*.js, phaser-*.js, *.css) never change
// under the same name, so they are cache-first. Everything else -- the page
// itself, the manifests, the paintings, the voice pack -- changes under the
// same name whenever the game is rebuilt, so it is network-first (the
// browser's own HTTP cache makes that a cheap conditional request) with the
// cached copy only as the offline fallback. VERSION is stamped per build by
// tools/prune-dist.mjs, so a new deploy gets a fresh cache and old ones go.

const VERSION = 'ashgrave-dev';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const isHashed = (pathname) => /\/assets\/[^/]+-[A-Za-z0-9_-]{6,}\.(js|css)$/.test(pathname);

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // fonts come from Google; let the browser cache them

  if (isHashed(url.pathname)) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    })));
    return;
  }

  // Network first, cache as the offline fallback.
  event.respondWith(
    fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then((hit) => hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined))),
  );
});
