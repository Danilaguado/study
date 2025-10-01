const togglePausa = () => {
  setEnPausa(!enPausa);
};
import React, { useState, useEffect, useRef } from "react";
import { Pause, Play, X, CheckCircle, RefreshCw } from "lucide-react";
import { useWakeLock } from "../hooks/useWakeLock";
import { useTimerPersistence } from "../hooks/useTimerPersistence";
import { useNotifications } from "../hooks/useNotifications";

const FocusMode = ({ isOpen, onClose, onComplete, categoriaActual }) => {
  const [tiempoSeleccionado, setTiempoSeleccionado] = useState(30);
  const [tiempoRestante, setTiempoRestante] = useState(30 * 60);
  const [enPausa, setEnPausa] = useState(true);
  const [iniciado, setIniciado] = useState(false);
  const [completado, setCompletado] = useState(false);
  const [tiempoEstudiado, setTiempoEstudiado] = useState(0);
  const [tiempoInicioTimestamp, setTiempoInicioTimestamp] = useState(null);
  const [tienePermisoNotificaciones, setTienePermisoNotificaciones] =
    useState(false);

  const intervaloRef = useRef(null);
  const scrollRef = useRef(null);

  const {
    solicitar: solicitarWakeLock,
    liberar: liberarWakeLock,
    isSupported: wakeLockSupported,
  } = useWakeLock();
  const { guardarEstado, cargarEstado, limpiarEstado, calcularTiempoRestante } =
    useTimerPersistence("focusTimer");
  const { mostrarNotificacion } = useNotifications();

  const totalBarras = 40;
  const barrasCompletadas = Math.floor(
    (1 - tiempoRestante / (tiempoSeleccionado * 60)) * totalBarras
  );

  // Verificar permisos de notificación al montar
  useEffect(() => {
    if ("Notification" in window) {
      setTienePermisoNotificaciones(Notification.permission === "granted");
    }
  }, []);

  // Cargar estado guardado al montar
  useEffect(() => {
    const estadoGuardado = cargarEstado();
    if (estadoGuardado && estadoGuardado.activo) {
      const restante = calcularTiempoRestante(
        estadoGuardado.tiempoInicioTimestamp,
        estadoGuardado.duracionSegundos
      );

      if (restante > 0) {
        setTiempoSeleccionado(Math.ceil(estadoGuardado.duracionSegundos / 60));
        setTiempoRestante(restante);
        setTiempoInicioTimestamp(estadoGuardado.tiempoInicioTimestamp);
        setIniciado(true);
        setEnPausa(false);
        solicitarWakeLock();
      } else {
        const minutosEstudiados = Math.floor(
          estadoGuardado.duracionSegundos / 60
        );
        mostrarNotificacion("¡Focus Mode Completado!", {
          body: `Completaste ${minutosEstudiados} minutos de estudio en ${categoriaActual}`,
        });
        setCompletado(true);
        setTiempoEstudiado(estadoGuardado.duracionSegundos);
        limpiarEstado();
      }
    }
  }, []);

  // Guardar estado cuando cambia
  useEffect(() => {
    if (iniciado && tiempoInicioTimestamp && !completado) {
      guardarEstado({
        activo: true,
        tiempoInicioTimestamp,
        duracionSegundos: tiempoSeleccionado * 60,
        categoriaActual,
      });
    }
  }, [
    iniciado,
    tiempoInicioTimestamp,
    tiempoSeleccionado,
    categoriaActual,
    completado,
  ]);

  // Actualizar título de la página
  useEffect(() => {
    if (iniciado && !enPausa && !completado) {
      const mins =
        tiempoRestante >= 60 ? Math.ceil(tiempoRestante / 60) : tiempoRestante;
      const unidad = tiempoRestante >= 60 ? "min" : "seg";
      document.title = `⏱️ ${mins} ${unidad} - Study Tracker`;
    } else {
      document.title = "Study Tracker";
    }
  }, [tiempoRestante, iniciado, enPausa, completado]);

  // Timer principal
  useEffect(() => {
    if (!enPausa && iniciado && !completado && tiempoInicioTimestamp) {
      const checkInterval = setInterval(() => {
        const ahora = Date.now();
        const transcurrido = Math.floor((ahora - tiempoInicioTimestamp) / 1000);
        const duracionTotal = tiempoSeleccionado * 60;
        const nuevoTiempoRestante = duracionTotal - transcurrido;

        if (nuevoTiempoRestante <= 0) {
          // Detener el intervalo
          clearInterval(checkInterval);

          // Actualizar estados finales
          setTiempoRestante(0);
          setTiempoEstudiado(duracionTotal);

          // Marcar como completado
          setCompletado(true);
          setIniciado(false);
          setEnPausa(true);

          // Limpiar recursos
          liberarWakeLock();
          limpiarEstado();

          // Enviar notificación solo si hay permisos
          const minutosCompletados = Math.floor(duracionTotal / 60);

          if (
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            try {
              const notification = new Notification(
                "¡Focus Mode Completado! 🎉",
                {
                  body: `Completaste ${minutosCompletados} minutos de estudio en ${categoriaActual}`,
                  icon: "/icon-192.png",
                  badge: "/icon-192.png",
                  tag: "focus-complete",
                  requireInteraction: false,
                }
              );

              console.log("Notificación enviada exitosamente");

              // Auto-cerrar después de 5 segundos
              setTimeout(() => notification.close(), 5000);
            } catch (error) {
              console.error("Error al enviar notificación:", error);
            }
          }
        } else {
          setTiempoRestante(nuevoTiempoRestante);
          setTiempoEstudiado(transcurrido);
        }
      }, 1000);

      intervaloRef.current = checkInterval;
    }

    return () => {
      if (intervaloRef.current) {
        clearInterval(intervaloRef.current);
        intervaloRef.current = null;
      }
    };
  }, [
    enPausa,
    iniciado,
    completado,
    tiempoSeleccionado,
    tiempoInicioTimestamp,
    categoriaActual,
    liberarWakeLock,
    limpiarEstado,
    mostrarNotificacion,
  ]);

  const iniciarSesion = async () => {
    const timestamp = Date.now();
    setTiempoInicioTimestamp(timestamp);
    setIniciado(true);
    setEnPausa(false);
    setCompletado(false);
    setTiempoRestante(tiempoSeleccionado * 60);
    setTiempoEstudiado(0);
    await solicitarWakeLock();
  };

  const solicitarPermisoNotificaciones = async () => {
    if ("Notification" in window && Notification.permission === "default") {
      try {
        const permission = await Notification.requestPermission();
        setTienePermisoNotificaciones(permission === "granted");
        if (permission === "granted") {
          // Mostrar notificación de prueba
          new Notification("¡Notificaciones activadas! ✅", {
            body: "Recibirás alertas cuando completes tus sesiones de estudio",
            icon: "/icon-192.png",
          });
        }
      } catch (error) {
        console.error("Error al solicitar permisos:", error);
      }
    }
  };

  const guardarYCerrar = () => {
    const minutosEstudiados = Math.floor(tiempoEstudiado / 60);
    if (minutosEstudiados > 0) {
      onComplete(minutosEstudiados);
    }
    cerrarModal();
  };

  const iniciarOtroPomodoro = () => {
    const minutosEstudiados = Math.floor(tiempoEstudiado / 60);
    if (minutosEstudiados > 0) {
      onComplete(minutosEstudiados);
    }
    setCompletado(false);
    setTiempoEstudiado(0);
    setTiempoRestante(tiempoSeleccionado * 60);
    setTiempoInicioTimestamp(null);
    setIniciado(false);
    setEnPausa(true);
  };

  const cerrarModal = async () => {
    if (intervaloRef.current) {
      clearInterval(intervaloRef.current);
      intervaloRef.current = null;
    }
    await liberarWakeLock();
    limpiarEstado();

    document.title = "Study Tracker";
    setIniciado(false);
    setEnPausa(true);
    setCompletado(false);
    setTiempoRestante(30 * 60);
    setTiempoSeleccionado(30);
    setTiempoEstudiado(0);
    setTiempoInicioTimestamp(null);

    onClose();
  };

  const handleCancelar = () => {
    const minutosEstudiados = Math.floor(tiempoEstudiado / 60);
    if (minutosEstudiados > 0) {
      if (window.confirm(`¿Guardar ${minutosEstudiados} minutos estudiados?`)) {
        onComplete(minutosEstudiados);
      }
    }
    cerrarModal();
  };

  const handleScroll = (e) => {
    const container = e.target;
    const itemHeight = 80;
    const scrollTop = container.scrollTop;

    const centerIndex = Math.round(scrollTop / itemHeight);
    const nuevoTiempo = Math.max(1, Math.min(60, centerIndex + 1));

    setTiempoSeleccionado(nuevoTiempo);
  };

  useEffect(() => {
    if (scrollRef.current && !iniciado && !completado) {
      const itemHeight = 80;
      const targetScroll = (tiempoSeleccionado - 1) * itemHeight;
      scrollRef.current.scrollTo({
        top: targetScroll,
        behavior: "smooth",
      });
    }
  }, [iniciado, completado, tiempoSeleccionado]);

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50 p-4'>
      <div className='bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 max-w-md w-full shadow-2xl'>
        {completado ? (
          <>
            <div className='text-center'>
              <CheckCircle size={80} className='text-green-500 mx-auto mb-6' />
              <h2 className='text-4xl font-bold text-white mb-4'>
                ¡Felicitaciones! 🎉
              </h2>
              <p className='text-2xl text-gray-300 mb-2'>Completaste</p>
              <p className='text-5xl font-bold text-blue-400 mb-8'>
                {Math.floor(tiempoEstudiado / 60)} min
              </p>
              <p className='text-gray-400 mb-8'>de {categoriaActual}</p>

              <div className='flex flex-col gap-3'>
                <button
                  onClick={guardarYCerrar}
                  className='w-full bg-green-600 text-white px-6 py-4 rounded-xl hover:bg-green-700 font-bold text-lg flex items-center justify-center gap-2'
                >
                  <CheckCircle size={24} />
                  Guardar y Finalizar
                </button>
                <button
                  onClick={iniciarOtroPomodoro}
                  className='w-full bg-blue-600 text-white px-6 py-4 rounded-xl hover:bg-blue-700 font-bold text-lg flex items-center justify-center gap-2'
                >
                  <RefreshCw size={24} />
                  Iniciar Otro Focus
                </button>
              </div>
            </div>
          </>
        ) : !iniciado ? (
          <>
            <h2 className='text-3xl font-bold text-white mb-2 text-center'>
              Focus Mode
            </h2>
            <p className='text-gray-400 text-center mb-2'>{categoriaActual}</p>

            {/* Mostrar estado de notificaciones */}
            {!tienePermisoNotificaciones && "Notification" in window && (
              <div className='bg-yellow-900/50 border border-yellow-600 rounded-lg p-3 mb-4'>
                <p className='text-yellow-300 text-sm text-center mb-2'>
                  🔔 Activa las notificaciones para recibir alertas
                </p>
                <button
                  onClick={solicitarPermisoNotificaciones}
                  className='w-full bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 font-medium text-sm'
                >
                  Activar Notificaciones
                </button>
              </div>
            )}

            {tienePermisoNotificaciones && (
              <p className='text-green-400 text-center mb-2 text-xs'>
                ✓ Notificaciones activadas
              </p>
            )}

            {wakeLockSupported && (
              <p className='text-green-400 text-center mb-6 text-xs'>
                ✓ Pantalla permanecerá encendida
              </p>
            )}

            <div className='mb-8 relative'>
              <div className='absolute inset-0 flex items-center justify-center pointer-events-none z-10'>
                <div className='w-full h-20 bg-gradient-to-b from-transparent via-blue-500/20 to-transparent rounded-lg'></div>
              </div>

              <div className='absolute inset-0 flex items-center justify-center pointer-events-none z-20'>
                <div className='flex items-baseline gap-3 ml-20'>
                  <span className='text-3xl text-white font-semibold'>min</span>
                </div>
              </div>

              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className='h-64 overflow-y-scroll snap-y snap-mandatory scrollbar-hide relative scroll-smooth'
                style={{
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                  scrollBehavior: "smooth",
                }}
              >
                <div className='h-28'></div>
                {[...Array(60)].map((_, i) => {
                  const mins = i + 1;
                  const isSelected = mins === tiempoSeleccionado;
                  return (
                    <div
                      key={mins}
                      className='h-20 flex items-center justify-center snap-center'
                    >
                      <span
                        className={`transition-all duration-200 ${
                          isSelected
                            ? "text-6xl font-bold text-white"
                            : "text-2xl text-gray-600"
                        }`}
                      >
                        {mins}
                      </span>
                    </div>
                  );
                })}
                <div className='h-28'></div>
              </div>
            </div>

            <div className='flex gap-4'>
              <button
                onClick={cerrarModal}
                className='flex-1 bg-gray-700 text-white px-6 py-4 rounded-xl hover:bg-gray-600 font-bold'
              >
                Cancelar
              </button>
              <button
                onClick={iniciarSesion}
                className='flex-1 bg-blue-600 text-white px-6 py-4 rounded-xl hover:bg-blue-700 font-bold'
              >
                Iniciar
              </button>
            </div>
          </>
        ) : (
          <>
            <div className='flex justify-between items-center mb-8'>
              <h2 className='text-2xl font-bold text-white'>Focus Mode</h2>
              <button
                onClick={handleCancelar}
                className='text-gray-400 hover:text-white'
              >
                <X size={28} />
              </button>
            </div>

            <div className='relative w-64 h-64 mx-auto mb-8'>
              <svg className='w-full h-full -rotate-90'>
                {[...Array(totalBarras)].map((_, i) => {
                  const angle = (360 / totalBarras) * i;
                  const isCompleted = i < barrasCompletadas;
                  return (
                    <line
                      key={i}
                      x1='50%'
                      y1='10%'
                      x2='50%'
                      y2='20%'
                      stroke={isCompleted ? "#3b82f6" : "#374151"}
                      strokeWidth='4'
                      strokeLinecap='round'
                      transform={`rotate(${angle} 128 128)`}
                    />
                  );
                })}
              </svg>

              <div className='absolute inset-0 flex flex-col items-center justify-center'>
                <div className='text-6xl font-bold text-white mb-2'>
                  {tiempoRestante >= 60
                    ? Math.ceil(tiempoRestante / 60)
                    : tiempoRestante}
                </div>
                <div className='text-xl text-gray-400'>
                  {tiempoRestante >= 60 ? "min" : "seg"}
                </div>
              </div>
            </div>

            <div className='flex justify-center gap-4'>
              <button
                onClick={togglePausa}
                className='bg-blue-600 text-white p-5 rounded-full hover:bg-blue-700 transition-all'
              >
                {enPausa ? (
                  <Play size={28} fill='white' />
                ) : (
                  <Pause size={28} fill='white' />
                )}
              </button>
            </div>

            <p className='text-center text-gray-400 mt-6 text-sm'>
              Tiempo estudiado: {Math.floor(tiempoEstudiado / 60)} min
            </p>
          </>
        )}
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default FocusMode;
