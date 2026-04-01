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
const CACHE_NAME = 'uniher-v2';
const PRECACHE_URLS = ['/', '/logo-uniher.png', '/manifest.json'];

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

// Network-first strategy for API, cache-first for static assets
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/')) return;
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(async cached => {
      if (cached) return cached;
      try {
        return await fetch(event.request);
      } catch {
        if (event.request.mode === 'navigate') {
          const fallback = await caches.match('/');
          if (fallback) return fallback;
        }
        return Response.error();
      }
    })
  );
});
