import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Calendar, Target, Award, Download, Upload, Plus, X, FolderOpen, ChevronDown, ChevronUp, Focus } from 'lucide-react';
import * as XLSX from 'xlsx';
import FocusMode from './FocusMode';
import { obtenerDiaSemana } from '../utils/dateUtils';
import { calcularMetricas } from '../utils/metricsCalculator';

const StudyTracker = () => {
  const [categorias, setCategorias] = useState([]);
  const [categoriaActual, setCategoriaActual] = useState(null);
  const [registros, setRegistros] = useState({});
  const [mostrarNuevaCategoria, setMostrarNuevaCategoria] = useState(false);
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [registroAbierto, setRegistroAbierto] = useState(false);
  const [diasTendencia, setDiasTendencia] = useState(7);
  const [mostrarFocusMode, setMostrarFocusMode] = useState(false);
  const [mostrarMasRegistros, setMostrarMasRegistros] = useState(false);
  const [nuevoRegistro, setNuevoRegistro] = useState({
    fecha: new Date().toISOString().split('T')[0],
    realizado: true,
    valor: ''
  });
  const fileInputRef = useRef(null);

  useEffect(() => {
    const categoriasGuardadas = localStorage.getItem('categorias');
    const registrosGuardados = localStorage.getItem('registros');
    
    if (categoriasGuardadas) {
      const cats = JSON.parse(categoriasGuardadas);
      setCategorias(cats);
      if (cats.length > 0) setCategoriaActual(cats[0]);
    }
    
    if (registrosGuardados) {
      setRegistros(JSON.parse(registrosGuardados));
    }
  }, []);

  useEffect(() => {
    if (categorias.length > 0) {
      localStorage.setItem('categorias', JSON.stringify(categorias));
    }
  }, [categorias]);

  useEffect(() => {
    if (Object.keys(registros).length > 0) {
      localStorage.setItem('registros', JSON.stringify(registros));
    }
  }, [registros]);

  const handleFocusComplete = (minutosEstudiados) => {
    const hoy = new Date().toISOString().split('T')[0];
    const horaActual = new Date().getHours();
    const registrosCategoria = registros[categoriaActual] || [];
    
    const registroHoy = registrosCategoria.find(r => r.fecha === hoy);

    if (registroHoy) {
      const registrosActualizados = registrosCategoria.map(r => 
        r.fecha === hoy 
          ? { ...r, valor: r.valor + minutosEstudiados }
          : r
      );
      setRegistros({
        ...registros,
        [categoriaActual]: registrosActualizados
      });
    } else {
      const nuevoRegistroFocus = {
        fecha: hoy,
        realizado: true,
        valor: minutosEstudiados,
        diaSemana: obtenerDiaSemana(hoy),
        horaInicio: horaActual,
        id: Date.now()
      };

      const nuevosRegistrosCategoria = [...registrosCategoria, nuevoRegistroFocus].sort((a, b) => 
        new Date(a.fecha) - new Date(b.fecha)
      );

      setRegistros({
        ...registros,
        [categoriaActual]: nuevosRegistrosCategoria
      });
    }
  };

  const agregarCategoria = () => {
    if (!nuevaCategoria.trim()) {
      alert('Por favor ingresa un nombre para la categoría');
      return;
    }
    
    if (categorias.includes(nuevaCategoria.trim())) {
      alert('Esta categoría ya existe');
      return;
    }

    const nuevaCat = nuevaCategoria.trim();
    setCategorias([...categorias, nuevaCat]);
    setRegistros({...registros, [nuevaCat]: []});
    setCategoriaActual(nuevaCat);
    setNuevaCategoria('');
    setMostrarNuevaCategoria(false);
  };

  const eliminarCategoria = (categoria) => {
    if (!window.confirm(`¿Eliminar "${categoria}" y todos sus registros?`)) return;
    
    const nuevasCategorias = categorias.filter(c => c !== categoria);
    const nuevosRegistros = {...registros};
    delete nuevosRegistros[categoria];
    
    setCategorias(nuevasCategorias);
    setRegistros(nuevosRegistros);
    if (categoriaActual === categoria) {
      setCategoriaActual(nuevasCategorias[0] || null);
    }
  };

  const agregarRegistro = () => {
    if (!categoriaActual) {
      alert('Primero crea una categoría');
      return;
    }

    if (nuevoRegistro.realizado && (!nuevoRegistro.valor || nuevoRegistro.valor <= 0)) {
      alert('Por favor ingresa los minutos');
      return;
    }

    const registro = {
      fecha: nuevoRegistro.fecha,
      realizado: nuevoRegistro.realizado,
      valor: nuevoRegistro.realizado ? parseInt(nuevoRegistro.valor) : 0,
      diaSemana: obtenerDiaSemana(nuevoRegistro.fecha),
      horaInicio: new Date().getHours(),
      id: Date.now()
    };

    const registrosCategoria = registros[categoriaActual] || [];
    const nuevosRegistrosCategoria = [...registrosCategoria, registro].sort((a, b) => 
      new Date(a.fecha) - new Date(b.fecha)
    );

    setRegistros({
      ...registros,
      [categoriaActual]: nuevosRegistrosCategoria
    });

    setNuevoRegistro({
      fecha: new Date().toISOString().split('T')[0],
      realizado: true,
      valor: ''
    });
  };

  const eliminarRegistro = (id) => {
    const registrosCategoria = registros[categoriaActual] || [];
    setRegistros({
      ...registros,
      [categoriaActual]: registrosCategoria.filter(r => r.id !== id)
    });
  };

  const exportarExcel = () => {
    const wb = XLSX.utils.book_new();

    categorias.forEach(categoria => {
      const registrosCategoria = registros[categoria] || [];
      const datos = registrosCategoria.map(r => ({
        'Fecha': r.fecha,
        'Día': r.diaSemana || '',
        'Realizado': r.realizado ? 'Sí' : 'No',
        'Minutos': r.valor,
        'Hora': r.horaInicio || ''
      }));

      const ws = XLSX.utils.json_to_sheet(datos);
      XLSX.utils.book_append_sheet(wb, ws, categoria.substring(0, 31));
    });

    XLSX.writeFile(wb, `study-tracker-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const importarExcel = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        const nuevasCategorias = [];
        const nuevosRegistros = {};

        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          if (jsonData.length > 0) {
            nuevasCategorias.push(sheetName);
            nuevosRegistros[sheetName] = jsonData.map((row, index) => ({
              fecha: row.Fecha,
              diaSemana: row.Día || obtenerDiaSemana(row.Fecha),
              realizado: row.Realizado === 'Sí',
              valor: parseInt(row.Minutos) || 0,
              horaInicio: row.Hora || null,
              id: Date.now() + index
            }));
          }
        });

        setCategorias(nuevasCategorias);
        setRegistros(nuevosRegistros);
        setCategoriaActual(nuevasCategorias[0] || null);
        alert(`✅ ${nuevasCategorias.length} categorías importadas.`);
      } catch (error) {
        alert('Error al leer el archivo Excel.');
      }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
  };

  const metricas = calcularMetricas(registros, categoriaActual, diasTendencia);

  const getTendenciaIcon = (tendencia) => {
    if (tendencia === 'subiendo') return <TrendingUp className="text-green-500" />;
    if (tendencia === 'bajando') return <TrendingDown className="text-red-500" />;
    return <Minus className="text-yellow-500" />;
  };

  const getTendenciaColor = (tendencia) => {
    if (tendencia === 'subiendo') return 'text-green-600';
    if (tendencia === 'bajando') return 'text-red-600';
    return 'text-yellow-600';
  };

  const datosGrafico = categoriaActual && registros[categoriaActual]
    ? registros[categoriaActual].filter(r => r.realizado).map(r => ({
        fecha: new Date(r.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }),
        minutos: r.valor
      }))
    : [];

  const registrosActuales = categoriaActual ? (registros[categoriaActual] || []) : [];
  const registrosMostrar = mostrarMasRegistros ? registrosActuales : registrosActuales.slice(-10);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-indigo-900 mb-2 text-center">
          📚 Study Tracker
        </h1>
        <p className="text-center text-gray-600 mb-8">Analiza tus hábitos de estudio</p>

        <FocusMode
          isOpen={mostrarFocusMode}
          onClose={() => setMostrarFocusMode(false)}
          onComplete={handleFocusComplete}
          categoriaActual={categoriaActual}
        />

        <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={exportarExcel}
              disabled={categorias.length === 0}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium disabled:bg-gray-400"
            >
              <Download size={18} />
              Exportar
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 font-medium"
            >
              <Upload size={18} />
              Importar
            </button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={importarExcel} className="hidden" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-indigo-800 flex items-center gap-2">
              <FolderOpen size={24} />
              Categorías
            </h2>
            <button
              onClick={() => setMostrarNuevaCategoria(!mostrarNuevaCategoria)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium"
            >
              <Plus size={18} />
              Nueva
            </button>
          </div>

          {mostrarNuevaCategoria && (
            <div className="mb-4 p-4 bg-indigo-50 rounded-lg">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nuevaCategoria}
                  onChange={(e) => setNuevaCategoria(e.target.value)}
                  placeholder="Ej: Matemáticas, Inglés..."
                  className="flex-1 p-2 border rounded-lg"
                  onKeyPress={(e) => e.key === 'Enter' && agregarCategoria()}
                />
                <button onClick={agregarCategoria} className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-medium">
                  Crear
                </button>
                <button
                  onClick={() => {
                    setMostrarNuevaCategoria(false);
                    setNuevaCategoria('');
                  }}
                  className="bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {categorias.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {categorias.map(cat => (
                <div key={cat} className="relative group">
                  <button
                    onClick={() => setCategoriaActual(cat)}
                    className={`px-4 py-2 rounded-lg font-medium ${
                      categoriaActual === cat ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {cat}
                  </button>
                  <button
                    onClick={() => eliminarCategoria(cat)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              👋 Crea tu primera categoría
            </p>
          )}
        </div>

        {categoriaActual && (
          <>
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-xl font-semibold text-indigo-800 mb-4 flex items-center gap-2">
                <Focus size={24} />
                Iniciar Estudio
              </h2>
              <button
                onClick={() => setMostrarFocusMode(true)}
                className="w-full bg-indigo-600 text-white px-6 py-4 rounded-lg hover:bg-indigo-700 font-bold text-lg flex items-center justify-center gap-3"
              >
                <Focus size={24} />
                Focus Mode
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-lg mb-6">
              <button
                onClick={() => setRegistroAbierto(!registroAbierto)}
                className="w-full p-6 flex justify-between items-center hover:bg-gray-50"
              >
                <h2 className="text-xl font-semibold text-indigo-800">Registrar Manualmente</h2>
                {registroAbierto ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
              </button>
              
              {registroAbierto && (
                <div className="p-6 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Fecha</label>
                      <input
                        type="date"
                        value={nuevoRegistro.fecha}
                        onChange={(e) => setNuevoRegistro({...nuevoRegistro, fecha: e.target.value})}
                        className="w-full p-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">¿Estudiaste?</label>
                      <select
                        value={nuevoRegistro.realizado}
                        onChange={(e) => setNuevoRegistro({...nuevoRegistro, realizado: e.target.value === 'true'})}
                        className="w-full p-2 border rounded-lg"
                      >
                        <option value="true">Sí</option>
                        <option value="false">No</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Minutos</label>
                      <input
                        type="number"
                        value={nuevoRegistro.valor}
                        onChange={(e) => setNuevoRegistro({...nuevoRegistro, valor: e.target.value})}
                        disabled={!nuevoRegistro.realizado}
                        placeholder="Ej: 30"
                        className="w-full p-2 border rounded-lg disabled:bg-gray-100"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={agregarRegistro}
                        className="w-full bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 font-medium"
                      >
                        Agregar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {metricas && (
              <>
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-indigo-900">Tendencia</h3>
                    <select
                      value={diasTendencia}
                      onChange={(e) => setDiasTendencia(parseInt(e.target.value))}
                      className="p-2 border rounded-lg"
                    >
                      <option value={7}>7 días</option>
                      <option value={14}>14 días</option>
                      <option value={30}>30 días</option>
                      <option value={60}>60 días</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="bg-indigo-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-600">Probabilidad</h4>
                        <Calendar className="text-indigo-600" size={20} />
                      </div>
                      <p className="text-3xl font-bold text-indigo-900">{metricas.probabilidadManana}%</p>
                    </div>

                    <div className="bg-white rounded-lg p-4 border-2">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-600">Tendencia</h4>
                        {getTendenciaIcon(metricas.tendencia)}
                      </div>
                      <p className={`text-2xl font-bold ${getTendenciaColor(metricas.tendencia)}`}>
                        {metricas.tendencia === 'subiendo' ? '↗ Subiendo' : 
                         metricas.tendencia === 'bajando' ? '↘ Bajando' : '→ Estable'}
                      </p>
                    </div>

                    <div className="bg-yellow-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-600">Racha</h4>
                        <Award className="text-yellow-500" size={20} />
                      </div>
                      <p className="text-3xl font-bold text-yellow-600">{metricas.rachaActual} días</p>
                    </div>

                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-600">Tasa</h4>
                        <Target className="text-green-600" size={20} />
                      </div>
                      <p className="text-3xl font-bold text-green-600">{metricas.probabilidadCompletar}%</p>
                    </div>

                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-600">Mejor Hora</h4>
                        <Calendar className="text-purple-600" size={20} />
                      </div>
                      <p className="text-2xl font-bold text-purple-600">{metricas.mejorHora}</p>
                    </div>
                  </div>

                  {metricas.tendencia === 'bajando' && (
                    <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-500 rounded">
                      <p className="text-red-800 font-medium">⚠️ Para volver a estable</p>
                      <p className="text-sm text-red-600 mt-1">
                        Estudia al menos {metricas.valorSugerido} minutos
                      </p>
                    </div>
                  )}

                  {metricas.tendencia === 'estable' && (
                    <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                      <p className="text-blue-800 font-medium">📊 Para mejorar</p>
                      <p className="text-sm text-blue-600 mt-1">
                        Estudia al menos {metricas.valorSugerido} minutos
                      </p>
                    </div>
                  )}
                </div>

                {datosGrafico.length > 0 && (
                  <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <h3 className="text-lg font-semibold text-indigo-900 mb-4">📈 Evolución</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={datosGrafico}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="fecha" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="minutos" stroke="#4f46e5" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {registrosActuales.length > 0 && (
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-indigo-900 mb-4">📋 Historial</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b-2">
                            <th className="text-left p-3">Fecha</th>
                            <th className="text-left p-3">Día</th>
                            <th className="text-left p-3">¿Estudiaste?</th>
                            <th className="text-left p-3">Minutos</th>
                            <th className="text-left p-3">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...registrosMostrar].reverse().map((registro) => (
                            <tr key={registro.id} className="border-b hover:bg-indigo-50">
                              <td className="p-3">{new Date(registro.fecha + 'T00:00:00').toLocaleDateString('es-ES')}</td>
                              <td className="p-3 text-sm">{registro.diaSemana}</td>
                              <td className="p-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  registro.realizado ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {registro.realizado ? '✓ Sí' : '✗ No'}
                                </span>
                              </td>
                              <td className="p-3 font-medium">{registro.valor}</td>
                              <td className="p-3">
                                <button
                                  onClick={() => eliminarRegistro(registro.id)}
                                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                                >
                                  Eliminar
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {registrosActuales.length > 10 && (
                      <div className="mt-4 text-center">
                        <button
                          onClick={() => setMostrarMasRegistros(!mostrarMasRegistros)}
                          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                        >
                          {mostrarMasRegistros ? 'Mostrar menos' : `Ver ${registrosActuales.length - 10} más...`}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {!categoriaActual && categorias.length === 0 && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <p className="text-gray-500 text-lg">
              👋 ¡Bienvenido a Study Tracker!
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Crea tu primera categoría para comenzar
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudyTracker;
