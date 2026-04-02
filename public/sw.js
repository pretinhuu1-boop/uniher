// UniHER Service Worker — Push Notifications + PWA Cache

// Push notification handler
self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'Nova notificação',
    icon: '/logo-uniher.png',
    badge: '/logo-uniher.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' },
    actions: [{ action: 'open', title: 'Abrir' }]
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'UniHER', options)
  );
});

// Click handler
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(clients.openWindow(url));
});

// PWA Cache strategy
const CACHE_NAME = 'uniher-v3';
const PRECACHE_URLS = ['/logo-uniher.png', '/manifest.json'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Never cache Next internals or API. For HTML/navigation, prefer network to avoid
// stale documents referencing old chunk names after deploys.
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/')) return;
  if (event.request.method !== 'GET') return;

  const isNavigation = event.request.mode === 'navigate'
    || event.request.headers.get('accept')?.includes('text/html');

  if (isNavigation) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(event.request);
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, fresh.clone());
        return fresh;
      } catch {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        return Response.error();
      }
    })());
    return;
  }

  event.respondWith(
    caches.match(event.request).then(async cached => {
      if (cached) return cached;
      try {
        const fresh = await fetch(event.request);
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, fresh.clone());
        return fresh;
      } catch {
        return Response.error();
      }
    })
  );
});
