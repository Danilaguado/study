import { useState, useEffect, useCallback } from "react";

export const useTimerPersistence = (storageKey = "focusTimer") => {
  const guardarEstado = useCallback(
    (estado) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(estado));
      } catch (error) {
        console.error("Error al guardar estado:", error);
      }
    },
    [storageKey]
  );

  const cargarEstado = useCallback(() => {
    try {
      const estadoGuardado = localStorage.getItem(storageKey);
      if (estadoGuardado) {
        return JSON.parse(estadoGuardado);
      }
    } catch (error) {
      console.error("Error al cargar estado:", error);
    }
    return null;
  }, [storageKey]);

  const limpiarEstado = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error("Error al limpiar estado:", error);
    }
  }, [storageKey]);

  const calcularTiempoRestante = useCallback(
    (tiempoInicioTimestamp, duracionSegundos) => {
      const ahora = Date.now();
      const transcurrido = Math.floor((ahora - tiempoInicioTimestamp) / 1000);
      const restante = duracionSegundos - transcurrido;
      return Math.max(0, restante);
    },
    []
  );

  return {
    guardarEstado,
    cargarEstado,
    limpiarEstado,
    calcularTiempoRestante,
  };
};
