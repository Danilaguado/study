import { useState, useEffect, useCallback } from "react";

export const useWakeLock = () => {
  const [wakeLock, setWakeLock] = useState(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    setIsSupported("wakeLock" in navigator);
  }, []);

  const solicitar = useCallback(async () => {
    if (!isSupported) {
      console.warn("Wake Lock no soportado en este navegador");
      return false;
    }

    try {
      const lock = await navigator.wakeLock.request("screen");
      setWakeLock(lock);
      setIsActive(true);
      console.log("✅ Wake Lock activado - Pantalla permanecerá encendida");

      lock.addEventListener("release", () => {
        console.log("Wake Lock liberado");
        setIsActive(false);
      });

      return true;
    } catch (err) {
      console.error("Error al solicitar Wake Lock:", err);
      return false;
    }
  }, [isSupported]);

  const liberar = useCallback(async () => {
    if (wakeLock) {
      try {
        await wakeLock.release();
        setWakeLock(null);
        setIsActive(false);
        console.log("Wake Lock liberado manualmente");
      } catch (err) {
        console.error("Error al liberar Wake Lock:", err);
      }
    }
  }, [wakeLock]);

  // Liberar automáticamente al desmontar
  useEffect(() => {
    return () => {
      if (wakeLock) {
        wakeLock.release();
      }
    };
  }, [wakeLock]);

  return {
    solicitar,
    liberar,
    isSupported,
    isActive,
  };
};
