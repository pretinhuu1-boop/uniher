'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const CACHE_VERSION = 'uniher-v3';
    let reloaded = false;
    const isLocalhost =
      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const shouldEnableServiceWorker = window.isSecureContext || isLocalhost;

    const clearLegacyCaches = async () => {
      if (!('caches' in window)) return;
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key.startsWith('uniher-')).map((key) => caches.delete(key)));
      window.localStorage.removeItem('uniher-cache-version');
    };

    if (!shouldEnableServiceWorker) {
      navigator.serviceWorker.getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
        .catch(() => {});
      void clearLegacyCaches();
      return;
    }

    const clearStaleCaches = async () => {
      if (!('caches' in window)) return;
      const seenVersion = window.localStorage.getItem('uniher-cache-version');
      if (seenVersion === CACHE_VERSION) return;
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key.startsWith('uniher-') && key !== CACHE_VERSION).map((key) => caches.delete(key))
      );
      window.localStorage.setItem('uniher-cache-version', CACHE_VERSION);
    };

    void clearStaleCaches();

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });

    navigator.serviceWorker.register('/sw.js').then((registration) => {
      void registration.update();

      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            worker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    }).catch(() => {});
  }, []);
  return null;
}
