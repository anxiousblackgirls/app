// Lets the app open without internet. Always tries the network first so new content shows up right away.
var CACHE = 'abg-v4';
var CORE = [
  './', 'index.html', 'app.css', 'app.js', 'manifest.webmanifest',
  'content/affirmations.json', 'content/articles.json', 'content/journal-prompts.json',
  'assets/logo-header.png', 'assets/logo-stacked-url.png', 'assets/icon-192.png',
  'assets/fonts/dm-sans-latin-400-normal.woff2', 'assets/fonts/dm-sans-latin-700-normal.woff2', 'assets/fonts/montserrat-latin-800-normal.woff2'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }));
  self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      return res;
    }).catch(function () { return caches.match(e.request); })
  );
});
