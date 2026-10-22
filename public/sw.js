/**
 * NexusVerse 2K26 High-Speed Offline & Asset Cache Service Worker
 * Provides offline navigation fallback, stale-while-revalidate for static bundles & logos,
 * network-first for APIs, and programmatic cache purge capability.
 */

const CACHE_NAME = 'nexusverse-cache-v3';
const PRECACHE_URLS = [
  '/',
  '/register.html',
  '/starting-page.html',
  '/ieee-sb-logo.png',
  '/nbkrist-logo.png',
  '/symposium-poster.jpg'
];

// 1. Install Event: Precache core application shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Precache known assets, gracefully ignoring individual failures
      return Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn(`[SW] Precache skipped for ${url}:`, err.message);
          })
        )
      );
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// 2. Activate Event: Clean up outdated caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log(`[SW] Evicting outdated cache: ${name}`);
            return caches.delete(name);
          })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// 3. Fetch Event: Intelligent routing based on request destination
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignore non-GET requests and external third-party tracking/analytics
  if (request.method !== 'GET') {
    return;
  }

  // A. Backend API Requests: Network-First with Offline Cache Fallback for GETs
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If successful GET API response, clone into cache for offline viewing
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, copy).catch(() => {});
            });
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) {
            return cached;
          }
          return new Response(
            JSON.stringify({
              success: false,
              offline: true,
              error: 'Offline mode: network connection currently unavailable.'
            }),
            {
              headers: { 'Content-Type': 'application/json' },
              status: 503
            }
          );
        })
    );
    return;
  }

  // B. Navigation / HTML Document Requests: Network-First with cached page fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cachedPage = await caches.match(request);
        if (cachedPage) return cachedPage;
        const registerPage = await caches.match('/register.html');
        if (registerPage) return registerPage;
        return caches.match('/');
      })
    );
    return;
  }

  // C. Static Assets (Scripts, Styles, Images, Fonts): Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone).catch(() => {});
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Network failure is fine if we have cached response
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    })
  );
});

// 4. Message Event: Programmatic Cache Invalidation and Refresh
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((keys) => {
      return Promise.all(keys.map((k) => caches.delete(k)));
    }).then(() => {
      console.log('[SW] All browser caches cleared via admin action.');
      if (event.source) {
        event.source.postMessage({
          type: 'CACHE_CLEARED_SUCCESS',
          timestamp: Date.now()
        });
      }
    });
  }

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
