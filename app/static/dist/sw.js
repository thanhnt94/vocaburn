const CACHE_NAME = 'vocaburn-v1.0.1';

const STATIC_PRECACHE = [
  '/',
  '/manifest.json',
  '/manifest.webmanifest',
  '/favicon.png',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png'
];

// Install: precache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up older caches & claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: smart network-first navigation with stale-while-revalidate for assets
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle GET requests with http/https schemes
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // Always bypass API, uploads, auth endpoints, or external URLs
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/uploads/') ||
    url.pathname.startsWith('/auth-center/')
  ) {
    return;
  }

  // 1. Navigation (HTML pages): Network-first with cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/', responseClone));
          }
          return response;
        })
        .catch(() => {
          return caches.match('/') || caches.match(request);
        })
    );
    return;
  }

  // 2. Static assets (Vite hashed bundles, images, icons, fonts)
  if (
    url.pathname.startsWith('/static/') ||
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|webp|woff2?)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }
});

// Push Notifications
self.addEventListener('push', function(event) {
  if (event.data) {
    try {
      const payload = event.data.json();
      const options = {
        body: payload.body || "It's time to review your cards!",
        icon: '/favicon.png',
        badge: '/favicon.png',
        data: {
          url: payload.url || '/'
        }
      };
      event.waitUntil(
        self.registration.showNotification(payload.title || "Vocaburn Reminder", options)
      );
    } catch (e) {
      const options = {
        body: event.data.text(),
        icon: '/favicon.png'
      };
      event.waitUntil(
        self.registration.showNotification("Vocaburn Reminder", options)
      );
    }
  }
});

// Notification Click Handler
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const urlToOpen = event.notification.data ? event.notification.data.url : '/';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(windowClients) {
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
