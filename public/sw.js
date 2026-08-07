/* Continental Automobile — service worker (public site) */
'use strict';

const VERSION = 'continental-v3';
const STATIC_CACHE = VERSION + '-static';
const PAGES_CACHE = VERSION + '-pages';
const IMAGES_CACHE = VERSION + '-images';

const PRECACHE = [
  '/offline.html',
  '/assets/css/client.css',
  '/assets/js/client.js',
  '/assets/icons/favicon.svg',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/img/part-placeholder.svg',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  if (keys.length > max) {
    await cache.delete(keys[0]);
    return trimCache(name, max);
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/socket.io') || url.pathname.startsWith('/api/') ||
      url.pathname.startsWith('/admin') || url.pathname.startsWith('/workers')) return;

  // Pages: network first (live catalog), cached copy when offline, offline page last.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(PAGES_CACHE);
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        return (await caches.match(req)) || (await caches.match('/offline.html'));
      }
    })());
    return;
  }

  // Product images: cache first with a cap.
  if (url.pathname.startsWith('/uploads/')) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(IMAGES_CACHE);
        cache.put(req, fresh.clone());
        trimCache(IMAGES_CACHE, 80);
        return fresh;
      } catch {
        return caches.match('/assets/img/part-placeholder.svg');
      }
    })());
    return;
  }

  // Static assets: stale-while-revalidate.
  event.respondWith((async () => {
    const cached = await caches.match(req);
    const network = fetch(req).then((fresh) => {
      caches.open(STATIC_CACHE).then((cache) => cache.put(req, fresh.clone()));
      return fresh.clone();
    }).catch(() => cached);
    return cached || network;
  })());
});
