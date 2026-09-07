/* Spooky Clicker 2026 — offline cache. Precaches the shell; runtime-caches the rest. */
'use strict';

var CACHE = 'spooky-clicker-v1';

var CORE = [
  './',
  'index.html',
  'style.css',
  'manifest.webmanifest',
  'js/data.js',
  'js/state.js',
  'js/audio.js',
  'js/ui.js',
  'js/screens.js',
  'js/main.js',
  'assets/icon-192.png',
  'assets/icon-512.png',
  'assets/font.ttf',
  'assets/bg-game.png',
  'assets/bg-other.png',
  'assets/cauldron-basic.png',
  'assets/skull.png',
  'assets/star.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) { return cache.addAll(CORE); })
      .then(function () { return self.skipWaiting(); })
      .catch(function () {})
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  var url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(event.request).then(function (hit) {
      if (hit) return hit;
      return fetch(event.request).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (cache) { cache.put(event.request, copy); });
        return res;
      }).catch(function () {
        return caches.match('index.html');
      });
    })
  );
});
