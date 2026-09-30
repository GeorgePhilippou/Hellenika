// Service worker for offline use. Strategy: precache the app shell, then
// cache-as-you-browse everything else same-origin so the whole site becomes
// available offline simply by having visited it, without hand-maintaining a
// file list that content updates would outdate.
//
// Code and data (HTML, JS, CSS, JSON) are network-first, so a deployed change
// shows on the next load instead of the load after; the cached copy is only
// used when the network is unavailable. Other files (icons, images) are
// stale-while-revalidate.
//
// Bump CACHE_VERSION when this file's logic changes.

const CACHE_VERSION = 'hellenika-v3';
const NETWORK_FIRST = /\.(?:html|js|mjs|css|json|webmanifest)$/i;
const SHELL_URLS = [
  './',
  './index.html',
  './manifest.json',
  './css/tokens.css',
  './css/base.css',
  './css/components.css',
  './css/views.css',
  './js/main.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(SHELL_URLS.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin === self.location.origin) {
    const path = url.pathname;
    const isCode = request.mode === 'navigate' || path.endsWith('/') || NETWORK_FIRST.test(path);
    event.respondWith(isCode ? networkFirst(request) : staleWhileRevalidate(request));
  } else if (request.destination === 'image') {
    // Entity photos are hotlinked from Wikipedia rather than bundled (see
    // js/components/images.js). They're immutable once resolved, so once a
    // photo has been viewed it's kept for good -- cache-first, no revalidation.
    event.respondWith(cacheFirstCrossOrigin(request));
  }
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    // 'no-cache' revalidates with the server (a cheap 304 when unchanged)
    // instead of trusting a possibly stale HTTP-cache copy.
    const response = await fetch(request, { cache: 'no-cache' });
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const shell = await cache.match('./index.html');
      if (shell) return shell;
    }
    return new Response('Offline and not yet cached.', {
      status: 503,
      statusText: 'Offline',
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);

  const networkFetch = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  if (cached) {
    // Serve the cached copy immediately; refresh the cache in the background
    // so the next load reflects whatever changed once we're back online.
    networkFetch.catch(() => {});
    return cached;
  }

  const fresh = await networkFetch;
  if (fresh) return fresh;

  if (request.mode === 'navigate') {
    const shell = await cache.match('./index.html');
    if (shell) return shell;
  }

  return new Response('Offline and not yet cached.', {
    status: 503,
    statusText: 'Offline',
    headers: { 'Content-Type': 'text/plain' },
  });
}

async function cacheFirstCrossOrigin(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    // <img> requests are same-origin-restricted to 'no-cors', so the response
    // is opaque (status 0, unreadable) -- still perfectly cacheable and replayable.
    const response = await fetch(request);
    if (response && (response.ok || response.type === 'opaque')) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return Response.error();
  }
}
