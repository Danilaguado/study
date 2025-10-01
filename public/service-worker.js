const CACHE_NAME = "study-tracker-v1";
const urlsToCache = [
  "/",
  "/static/js/bundle.js",
  "/static/js/main.chunk.js",
  "/static/js/0.chunk.js",
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches
      .match(event.request)
      .then((response) => response || fetch(event.request))
  );
});

self.addEventListener("activate", (event) => {
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

// Manejar clics en notificaciones
self.addEventListener("notificationclick", (event) => {
  console.log("Notificación clickeada", event);
  event.notification.close();

  // Abrir o enfocar la app
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (clientList) {
        // Si hay una ventana abierta, enfocarla
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url && "focus" in client) {
            return client.focus();
          }
        }
        // Si no hay ventana abierta, abrir una nueva
        if (clients.openWindow) {
          return clients.openWindow("/");
        }
      })
  );
});

// Escuchar mensajes desde la app
self.addEventListener("message", (event) => {
  console.log("SW: Mensaje recibido", event.data);

  if (event.data && event.data.type === "TIMER_UPDATE") {
    // Actualizar badge si es soportado
    if ("setAppBadge" in self.registration) {
      self.registration
        .setAppBadge(event.data.minutes)
        .catch((err) => console.log("Error setting badge:", err));
    }
  }

  if (event.data && event.data.type === "TIMER_COMPLETE") {
    // Mostrar notificación
    const minutos = event.data.minutes || 0;

    self.registration
      .showNotification("¡Focus Mode Completado! 🎉", {
        body: `¡Felicitaciones! Completaste ${minutos} minutos de estudio`,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        vibrate: [200, 100, 200, 100, 400],
        tag: "focus-complete",
        requireInteraction: true,
        actions: [
          {
            action: "open",
            title: "Ver resultados",
          },
        ],
        data: {
          dateOfArrival: Date.now(),
          primaryKey: "focus-complete",
        },
      })
      .then(() => {
        console.log("SW: Notificación mostrada");

        // Limpiar badge
        if ("clearAppBadge" in self.registration) {
          self.registration
            .clearAppBadge()
            .catch((err) => console.log("Error clearing badge:", err));
        }
      })
      .catch((err) => {
        console.error("SW: Error mostrando notificación:", err);
      });
  }
});

// Manejar notificaciones push (si implementas push en el futuro)
self.addEventListener("push", function (event) {
  console.log("Push recibido:", event);

  let title = "Study Tracker";
  let options = {
    body: event.data ? event.data.text() : "Nueva notificación",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});
