/**
 * STOREHOUSE SERVICE WORKER - Phase 2
 * Smart caching with background sync
 *
 * Strategy:
 * - Cache static assets (JS, CSS, fonts, images)
 * - Network-first for API calls (Supabase, Firebase)
 * - Cache-first for assets
 * - Background sync for offline operations
 */

const CACHE_VERSION = 'storehouse-v2.1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

// Max cache sizes
const MAX_DYNAMIC_CACHE_SIZE = 50; // 50 pages
const MAX_IMAGE_CACHE_SIZE = 100; // 100 images

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html', // Fallback page
  '/manifest.webmanifest'
];

// Skip caching these patterns
const SKIP_CACHE_PATTERNS = [
  /supabase\.co/,
  /firebaseapp\.com/,
  /googleapis\.com/,
  /vercel\.app/,
  /chrome-extension:/,
  /__/,
  /\/auth\/confirm/,  // Don't cache auth confirmation pages
  /\/update-password/,  // Don't cache password update pages
  /\/auth\/callback/  // Don't cache auth callback pages
];

/**
 * Install Event - Cache static assets
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })));
      })
      .catch((err) => {
        console.error('[SW] Failed to cache static assets:', err);
      })
      .then(() => {
        console.log('[SW] Service worker installed');
        return self.skipWaiting(); // Activate immediately
      })
  );
});

/**
 * Activate Event - Clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Delete old versions
              return cacheName.startsWith('storehouse-') && cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE && cacheName !== IMAGE_CACHE;
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim(); // Take control immediately
      })
  );
});

/**
 * Fetch Event - Smart caching strategy
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip caching for certain patterns
  if (SKIP_CACHE_PATTERNS.some(pattern => pattern.test(request.url))) {
    return; // Let browser handle normally
  }

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Determine caching strategy based on request type
  if (isImageRequest(request)) {
    event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE, MAX_IMAGE_CACHE_SIZE));
  } else if (isStaticAsset(request)) {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
  } else {
    event.respondWith(networkFirstStrategy(request));
  }
});

/**
 * Cache-First Strategy (for static assets and images)
 * Fast loading from cache, update in background
 */
async function cacheFirstStrategy(request, cacheName, maxSize) {
  try {
    // Check cache first
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      console.log('[SW] Cache hit:', request.url);

      // Return cached, but update in background
      fetchAndCache(request, cacheName, maxSize);

      return cachedResponse;
    }

    // Not in cache, fetch from network
    console.log('[SW] Cache miss, fetching:', request.url);
    const networkResponse = await fetch(request);

    // Cache the response
    if (networkResponse && networkResponse.status === 200) {
      await addToCache(cache, request, networkResponse.clone(), maxSize);
    }

    return networkResponse;
  } catch (err) {
    console.error('[SW] Cache-first strategy failed:', err);

    // Try cache as last resort
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }

    throw err;
  }
}

/**
 * Network-First Strategy (for API calls and dynamic content)
 * Fresh data when online, cache fallback when offline
 */
async function networkFirstStrategy(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);

    if (networkResponse && networkResponse.status === 200) {
      // Cache successful responses
      const cache = await caches.open(DYNAMIC_CACHE);
      await addToCache(cache, request, networkResponse.clone(), MAX_DYNAMIC_CACHE_SIZE);
    }

    return networkResponse;
  } catch (err) {
    console.log('[SW] Network failed, trying cache:', request.url);

    // Network failed, try cache
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      console.log('[SW] Returning cached response');
      return cachedResponse;
    }

    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }

    throw err;
  }
}

/**
 * Background fetch and cache update
 */
function fetchAndCache(request, cacheName, maxSize) {
  fetch(request)
    .then((response) => {
      if (response && response.status === 200) {
        caches.open(cacheName)
          .then((cache) => {
            addToCache(cache, request, response, maxSize);
          });
      }
    })
    .catch((err) => {
      console.log('[SW] Background fetch failed:', err);
    });
}

/**
 * Add to cache with size limit
 */
async function addToCache(cache, request, response, maxSize) {
  await cache.put(request, response);

  // Limit cache size
  if (maxSize) {
    const keys = await cache.keys();
    if (keys.length > maxSize) {
      console.log('[SW] Cache limit reached, removing oldest entry');
      await cache.delete(keys[0]);
    }
  }
}

/**
 * Check if request is for an image
 */
function isImageRequest(request) {
  const url = new URL(request.url);
  return /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(url.pathname);
}

/**
 * Check if request is for a static asset
 */
function isStaticAsset(request) {
  const url = new URL(request.url);
  return /\.(js|css|woff|woff2|ttf|eot)$/i.test(url.pathname) || url.pathname === '/';
}

/**
 * Background Sync - Retry failed operations
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);

  if (event.tag === 'sync-queue') {
    event.waitUntil(syncQueue());
  }
});

/**
 * Sync queued operations
 */
async function syncQueue() {
  console.log('[SW] Syncing offline queue...');

  try {
    // Get all pending operations from localStorage
    // (This would normally be done by sending a message to the app)
    const clients = await self.clients.matchAll();

    if (clients.length > 0) {
      // Notify app to sync
      clients[0].postMessage({
        type: 'SYNC_QUEUE',
        timestamp: Date.now()
      });
    }

    console.log('[SW] Queue sync completed');
  } catch (err) {
    console.error('[SW] Queue sync failed:', err);
    throw err; // Will retry
  }
}

/**
 * Message handler - Respond to messages from app
 */
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }

  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.addAll(event.data.urls);
      })
    );
  }
});

console.log('[SW] Service worker loaded - Phase 2 Active');
