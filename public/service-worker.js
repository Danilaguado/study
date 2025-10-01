const CACHE_NAME = 'study-tracker-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/js/main.chunk.js',
  '/static/js/0.chunk.js',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Escuchar mensajes desde la app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'TIMER_UPDATE') {
    // Actualizar badge
    if (navigator.setAppBadge) {
      navigator.setAppBadge(event.data.minutes);
    }
  }

  if (event.data && event.data.type === 'TIMER_COMPLETE') {
    // Mostrar notificación
    self.registration.showNotification('Focus Mode Completado', {
      body: `¡Felicitaciones! Completaste ${event.data.minutes} minutos de estudio`,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      tag: 'focus-complete'
    });

    // Limpiar badge
    if (navigator.clearAppBadge) {
      navigator.clearAppBadge();
    }
  }
});
