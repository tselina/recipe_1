// Service Worker for Recipe Portion Tracker
const CACHE_NAME = 'recipe-tracker-v1';
const STATIC_CACHE_NAME = 'recipe-tracker-static-v1';

// Files to cache for offline functionality
const STATIC_FILES = [
  '/',
  '/index.html',
  '/styles.css',
  '/manifest.json',
  '/js/app.js',
  '/js/data-models.js',
  '/js/barcode-scanner.js',
  '/js/portion-calculator.js',
  '/js/product-database.js',
  '/js/recipe-manager.js',
  '/js/storage-manager.js',
  '/js/ui-controller.js',
  '/icon.svg'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Service Worker: Static files cached successfully');
        // Notify clients that the service worker is ready
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'SW_INSTALLED',
              message: 'App is ready for offline use'
            });
          });
        });
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Error caching static files:', error);
        // Notify clients of installation failure
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'SW_INSTALL_ERROR',
              message: 'Failed to prepare app for offline use'
            });
          });
        });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && cacheName !== CACHE_NAME) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated successfully');
        // Notify all clients that the service worker is active
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'SW_ACTIVATED',
              message: 'App is ready and optimized for offline use'
            });
          });
        });
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip external requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          console.log('Service Worker: Serving from cache:', event.request.url);
          return cachedResponse;
        }

        // Otherwise, fetch from network
        console.log('Service Worker: Fetching from network:', event.request.url);
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response for caching
            const responseToCache = response.clone();

            // Cache the response for future use
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch((error) => {
            console.error('Service Worker: Network fetch failed:', error);
            
            // Notify clients about offline state
            self.clients.matchAll().then(clients => {
              clients.forEach(client => {
                client.postMessage({
                  type: 'NETWORK_ERROR',
                  message: 'Network unavailable - using offline mode',
                  url: event.request.url
                });
              });
            });
            
            // Return offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            
            // For other requests, return a generic offline response
            return new Response('Offline - Content not available', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// Background sync for future data synchronization
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Future: Implement background data sync if needed
      Promise.resolve()
    );
  }
});

// Push notification handling (for future features)
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'New notification from Recipe Tracker',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Open App',
        icon: '/icons/icon-192x192.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/icon-192x192.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Recipe Tracker', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked:', event.action);
  
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handling from main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
  
  if (event.data && event.data.type === 'CHECK_OFFLINE_READY') {
    // Check if all critical files are cached
    caches.open(STATIC_CACHE_NAME)
      .then(cache => cache.keys())
      .then(cachedRequests => {
        const cachedUrls = cachedRequests.map(req => req.url);
        const allFilesCached = STATIC_FILES.every(file => {
          const fullUrl = new URL(file, self.location.origin).href;
          return cachedUrls.some(cachedUrl => cachedUrl === fullUrl);
        });
        
        event.ports[0].postMessage({
          type: 'OFFLINE_READY_STATUS',
          ready: allFilesCached,
          cachedFiles: cachedUrls.length,
          totalFiles: STATIC_FILES.length
        });
      })
      .catch(error => {
        event.ports[0].postMessage({
          type: 'OFFLINE_READY_STATUS',
          ready: false,
          error: error.message
        });
      });
  }
  
  if (event.data && event.data.type === 'FORCE_UPDATE_CACHE') {
    // Force update cache with latest files
    caches.delete(STATIC_CACHE_NAME)
      .then(() => caches.open(STATIC_CACHE_NAME))
      .then(cache => cache.addAll(STATIC_FILES))
      .then(() => {
        event.ports[0].postMessage({
          type: 'CACHE_UPDATED',
          message: 'Cache updated successfully'
        });
      })
      .catch(error => {
        event.ports[0].postMessage({
          type: 'CACHE_UPDATE_ERROR',
          message: 'Failed to update cache: ' + error.message
        });
      });
  }
});

// Error handling
self.addEventListener('error', (event) => {
  console.error('Service Worker: Error occurred:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker: Unhandled promise rejection:', event.reason);
  event.preventDefault();
});