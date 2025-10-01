import { useEffect, useState } from "react";

export const useNotifications = () => {
  const [permiso, setPermiso] = useState(false);

  useEffect(() => {
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        setPermiso(true);
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((permission) => {
          setPermiso(permission === "granted");
        });
      }
    }
  }, []);

  const mostrarNotificacion = (titulo, opciones = {}) => {
    if (!permiso) {
      console.warn("No hay permiso para mostrar notificaciones");
      return;
    }

    if ("Notification" in window && Notification.permission === "granted") {
      const notificacion = new Notification(titulo, {
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        vibrate: [200, 100, 200, 100, 200],
        requireInteraction: true,
        ...opciones,
      });

      return notificacion;
    }
  };

  return { mostrarNotificacion, permiso };
};
