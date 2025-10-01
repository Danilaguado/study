import React, { useState, useEffect, useRef } from 'react';
import { Pause, Play, X } from 'lucide-react';

const FocusMode = ({ isOpen, onClose, onComplete, categoriaActual }) => {
  const [tiempoSeleccionado, setTiempoSeleccionado] = useState(30);
  const [tiempoRestante, setTiempoRestante] = useState(30 * 60);
  const [enPausa, setEnPausa] = useState(true);
  const [iniciado, setIniciado] = useState(false);
  const [tiempoEstudiado, setTiempoEstudiado] = useState(0);
  const intervaloRef = useRef(null);
  const scrollRef = useRef(null);

  const totalBarras = 40;
  const barrasCompletadas = Math.floor((1 - tiempoRestante / (tiempoSeleccionado * 60)) * totalBarras);

  useEffect(() => {
    if (!enPausa && iniciado) {
      intervaloRef.current = setInterval(() => {
        setTiempoRestante(prev => {
          if (prev <= 1) {
            clearInterval(intervaloRef.current);
            finalizarSesion(tiempoSeleccionado);
            return 0;
          }
          return prev - 1;
        });
        setTiempoEstudiado(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (intervaloRef.current) clearInterval(intervaloRef.current);
    };
  }, [enPausa, iniciado, tiempoSeleccionado]);

  const iniciarSesion = () => {
    setIniciado(true);
    setEnPausa(false);
    setTiempoRestante(tiempoSeleccionado * 60);
  };

  const togglePausa = () => {
    setEnPausa(!enPausa);
  };

  const finalizarSesion = (minutosEstudiados) => {
    const minutos = Math.floor(minutosEstudiados || tiempoEstudiado / 60);
    if (minutos > 0) {
      onComplete(minutos);
    }
    cerrarModal();
  };

  const cerrarModal = () => {
    if (intervaloRef.current) clearInterval(intervaloRef.current);
    setIniciado(false);
    setEnPausa(true);
    setTiempoRestante(30 * 60);
    setTiempoSeleccionado(30);
    setTiempoEstudiado(0);
    onClose();
  };

  const handleCancelar = () => {
    const minutosEstudiados = Math.floor(tiempoEstudiado / 60);
    if (minutosEstudiados > 0) {
      if (window.confirm(`¿Guardar ${minutosEstudiados} minutos estudiados?`)) {
        finalizarSesion(minutosEstudiados);
      } else {
        cerrarModal();
      }
    } else {
      cerrarModal();
    }
  };

  const formatearTiempo = (segundos) => {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleScroll = (e) => {
    const scrollTop = e.target.scrollTop;
    const itemHeight = 60;
    const nuevoTiempo = Math.round(scrollTop / itemHeight) + 5;
    setTiempoSeleccionado(Math.max(5, Math.min(60, nuevoTiempo)));
  };

  useEffect(() => {
    if (scrollRef.current && !iniciado) {
      scrollRef.current.scrollTop = (tiempoSeleccionado - 5) * 60;
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 max-w-md w-full shadow-2xl">
        
        {!iniciado ? (
          <>
            <h2 className="text-3xl font-bold text-white mb-2 text-center">Focus Mode</h2>
            <p className="text-gray-400 text-center mb-8">{categoriaActual}</p>
            
            <div className="mb-8">
              <div 
                ref={scrollRef}
                onScroll={handleScroll}
                className="h-48 overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                <div className="h-24"></div>
                {[...Array(56)].map((_, i) => {
                  const mins = i + 5;
                  return (
                    <div
                      key={mins}
                      className={`h-16 flex items-center justify-center snap-center transition-all ${
                        mins === tiempoSeleccionado
                          ? 'text-5xl font-bold text-white'
                          : 'text-2xl text-gray-600'
                      }`}
                    >
                      {mins === tiempoSeleccionado && <span>{mins} min</span>}
                      {mins !== tiempoSeleccionado && <span className="text-sm">{mins}</span>}
                    </div>
                  );
                })}
                <div className="h-24"></div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={cerrarModal}
                className="flex-1 bg-gray-700 text-white px-6 py-4 rounded-xl hover:bg-gray-600 font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={iniciarSesion}
                className="flex-1 bg-blue-600 text-white px-6 py-4 rounded-xl hover:bg-blue-700 font-bold"
              >
                Iniciar
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-white">Focus Mode</h2>
              <button onClick={handleCancelar} className="text-gray-400 hover:text-white">
                <X size={28} />
              </button>
            </div>

            <div className="relative w-64 h-64 mx-auto mb-8">
              <svg className="w-full h-full -rotate-90">
                {[...Array(totalBarras)].map((_, i) => {
                  const angle = (360 / totalBarras) * i;
                  const isCompleted = i < barrasCompletadas;
                  return (
                    <line
                      key={i}
                      x1="50%"
                      y1="10%"
                      x2="50%"
                      y2="20%"
                      stroke={isCompleted ? '#3b82f6' : '#374151'}
                      strokeWidth="4"
                      strokeLinecap="round"
                      transform={`rotate(${angle} 128 128)`}
                    />
                  );
                })}
              </svg>
              
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-6xl font-bold text-white mb-2">
                  {Math.ceil(tiempoRestante / 60)}
                </div>
                <div className="text-xl text-gray-400">min</div>
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <button
                onClick={togglePausa}
                className="bg-blue-600 text-white p-5 rounded-full hover:bg-blue-700 transition-all"
              >
                {enPausa ? <Play size={28} fill="white" /> : <Pause size={28} fill="white" />}
              </button>
            </div>

            <p className="text-center text-gray-400 mt-6 text-sm">
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
