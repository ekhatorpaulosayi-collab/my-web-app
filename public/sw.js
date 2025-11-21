// SERVICE WORKER DISABLED - Unregister immediately
console.log('[SW] Service Worker disabled - unregistering and clearing all caches');

// Delete ALL caches on activation
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      console.log('[SW] Deleting all caches:', cacheNames);
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => {
      console.log('[SW] All caches deleted, unregistering service worker');
      return self.registration.unregister();
    })
  );
});

// Install - immediately skip waiting
self.addEventListener('install', (event) => {
  console.log('[SW] Installing - will unregister');
  self.skipWaiting();
});

// Fetch - do nothing, let all requests pass through normally
self.addEventListener('fetch', (event) => {
  // Do nothing - let browser handle fetch naturally
  return;
});
