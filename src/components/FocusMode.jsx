import React, { useState, useEffect, useRef, useCallback } from "react";
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

  useEffect(() => {
    if (!enPausa && iniciado && !completado && tiempoInicioTimestamp) {
      intervaloRef.current = setInterval(() => {
        const ahora = Date.now();
        const transcurrido = Math.floor((ahora - tiempoInicioTimestamp) / 1000);
        const duracionTotal = tiempoSeleccionado * 60;
        const nuevoTiempoRestante = duracionTotal - transcurrido;

        if (nuevoTiempoRestante <= 0) {
          setTiempoRestante(0);
          setTiempoEstudiado(duracionTotal);
          finalizarSesion();
        } else {
          setTiempoRestante(nuevoTiempoRestante);
          setTiempoEstudiado(transcurrido);
        }
      }, 100); // Usar 100ms para detectar más rápido el fin
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
    finalizarSesion,
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

  const togglePausa = () => {
    setEnPausa(!enPausa);
  };

  const finalizarSesion = useCallback(() => {
    const minutosEstudiados = Math.floor(tiempoSeleccionado);

    // Limpiar el intervalo inmediatamente
    if (intervaloRef.current) {
      clearInterval(intervaloRef.current);
      intervaloRef.current = null;
    }

    // Actualizar estado inmediatamente
    setCompletado(true);
    setIniciado(false);
    setEnPausa(true);

    // Liberar wake lock y limpiar estado
    liberarWakeLock();
    limpiarEstado();

    // Enviar notificación push
    mostrarNotificacion("¡Focus Mode Completado! 🎉", {
      body: `Completaste ${minutosEstudiados} minutos de estudio en ${categoriaActual}`,
      tag: "focus-complete",
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200],
    });

    // Reproducir sonido de notificación
    try {
      const audio = new Audio(
        "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLYiTcIG2m98OScTgwOUarm7blmFwU7k9n1unEiBC13yO/eizEIHWq+8+OWT"
      );
      audio.play().catch((e) => console.log("No se pudo reproducir sonido"));
    } catch (e) {
      console.log("Error al crear audio");
    }
  }, [
    tiempoSeleccionado,
    categoriaActual,
    liberarWakeLock,
    limpiarEstado,
    mostrarNotificacion,
  ]);

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
  };

  const cerrarModal = async () => {
    if (intervaloRef.current) clearInterval(intervaloRef.current);
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

    // Calcular qué elemento está en el centro
    const centerIndex = Math.round(scrollTop / itemHeight);
    const nuevoTiempo = Math.max(5, Math.min(60, centerIndex + 5));

    setTiempoSeleccionado(nuevoTiempo);
  };

  useEffect(() => {
    if (scrollRef.current && !iniciado && !completado) {
      const itemHeight = 80;

      // Posicionar el scroll para que el tiempo seleccionado esté en el centro
      const targetScroll = (tiempoSeleccionado - 5) * itemHeight;
      scrollRef.current.scrollTop = targetScroll;
    }
  }, [iniciado, completado]);

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
                <div className='flex items-baseline gap-2'>
                  <span className='text-3xl text-white font-semibold ml-16'>
                    min
                  </span>
                </div>
              </div>

              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className='h-64 overflow-y-scroll snap-y snap-mandatory scrollbar-hide relative'
                style={{
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                }}
              >
                <div className='h-28'></div>
                {[...Array(56)].map((_, i) => {
                  const mins = i + 5;
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
