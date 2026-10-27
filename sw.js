// Copyright (c) 2026 Anxious Black Girls, LLC. All rights reserved. Unauthorized copying or reuse is prohibited. See LICENSE.
// Lets the app open without internet. Always tries the network first so new content shows up right away.
var CACHE = 'abg-v26';
var CORE = [
  './', 'index.html', 'app.css', 'app.js', 'manifest.webmanifest',
  'affirmations.json', 'articles.json', 'journal-prompts.json', 'about.json', 'faq.json', 'skills.json',
  'logo-header.png', 'logo-circle.png', 'logo-stacked.png', 'logo-stacked-url.png', 'icon-192.png',
  'dm-sans-latin-400-normal.woff2', 'dm-sans-latin-700-normal.woff2', 'montserrat-latin-800-normal.woff2'
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
  if (/\.mp3$/.test(new URL(e.request.url).pathname)) return; // let audio stream directly
  e.respondWith(
    fetch(e.request).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      return res;
    }).catch(function () { return caches.match(e.request); })
  );
});
