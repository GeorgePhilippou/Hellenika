// Service worker for offline use. Strategy: precache the app shell, then
// cache-as-you-browse everything else same-origin (stale-while-revalidate)
// so the whole site becomes available offline simply by having visited it,
// without hand-maintaining a file list that content updates would outdate.

const CACHE_VERSION = 'hellenika-v1';
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
      .then((cache) => cache.addAll(SHELL_URLS))
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
    event.respondWith(staleWhileRevalidate(request));
  } else if (request.destination === 'image') {
    // Entity photos are hotlinked from Wikipedia rather than bundled (see
    // js/components/images.js). They're immutable once resolved, so once a
    // photo has been viewed it's kept for good -- cache-first, no revalidation.
    event.respondWith(cacheFirstCrossOrigin(request));
  }
});

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
