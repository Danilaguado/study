import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Calendar, Target, Award, Download, Upload, Plus, X, FolderOpen } from 'lucide-react';
import * as XLSX from 'xlsx';

const HabitTracker = () => {
  const [categorias, setCategorias] = useState([]);
  const [categoriaActual, setCategoriaActual] = useState(null);
  const [registros, setRegistros] = useState({});
  const [mostrarNuevaCategoria, setMostrarNuevaCategoria] = useState(false);
  const [nuevaCategoria, setNuevaCategoria] = useState('');
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
    if (!window.confirm(`¿Eliminar la categoría "${categoria}" y todos sus registros?`)) return;
    
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
      alert('Por favor ingresa el valor (minutos, veces, etc.)');
      return;
    }

    const registro = {
      fecha: nuevoRegistro.fecha,
      realizado: nuevoRegistro.realizado,
      valor: nuevoRegistro.realizado ? parseInt(nuevoRegistro.valor) : 0,
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
        'Realizado': r.realizado ? 'Sí' : 'No',
        'Valor': r.valor
      }));

      const ws = XLSX.utils.json_to_sheet(datos);
      XLSX.utils.book_append_sheet(wb, ws, categoria.substring(0, 31));
    });

    XLSX.writeFile(wb, `habitos-backup-${new Date().toISOString().split('T')[0]}.xlsx`);
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
              realizado: row.Realizado === 'Sí' || row.Realizado === true,
              valor: parseInt(row.Valor) || 0,
              id: Date.now() + index
            }));
          }
        });

        setCategorias(nuevasCategorias);
        setRegistros(nuevosRegistros);
        setCategoriaActual(nuevasCategorias[0] || null);
        alert(`✅ Datos importados correctamente. ${nuevasCategorias.length} categorías cargadas.`);
      } catch (error) {
        alert('Error al leer el archivo Excel. Verifica que tenga el formato correcto.');
        console.error(error);
      }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
  };

  const calcularMetricas = () => {
    if (!categoriaActual || !registros[categoriaActual] || registros[categoriaActual].length === 0) {
      return null;
    }

    const regs = registros[categoriaActual];
    const diasRealizados = regs.filter(r => r.realizado).length;
    const diasTotales = regs.length;
    const tasaCumplimiento = (diasRealizados / diasTotales) * 100;

    const ultimos7 = regs.slice(-7);
    const valoresUltimos7 = ultimos7.filter(r => r.realizado).map(r => r.valor);
    const promedioUltimos7 = valoresUltimos7.length > 0 
      ? valoresUltimos7.reduce((a, b) => a + b, 0) / valoresUltimos7.length 
      : 0;

    const calcularTendencia = () => {
      if (valoresUltimos7.length < 3) return 'neutral';
      const mitad = Math.floor(valoresUltimos7.length / 2);
      const primera = valoresUltimos7.slice(0, mitad);
      const segunda = valoresUltimos7.slice(mitad);
      
      const promPrimera = primera.reduce((a, b) => a + b, 0) / primera.length;
      const promSegunda = segunda.reduce((a, b) => a + b, 0) / segunda.length;
      
      const diferencia = ((promSegunda - promPrimera) / promPrimera) * 100;
      
      if (diferencia > 10) return 'subiendo';
      if (diferencia < -10) return 'bajando';
      return 'estable';
    };

    const tendencia = calcularTendencia();

    let rachaActual = 0;
    for (let i = regs.length - 1; i >= 0; i--) {
      if (regs[i].realizado) rachaActual++;
      else break;
    }

    const factorRacha = Math.min(rachaActual * 5, 30);
    const factorCumplimiento = tasaCumplimiento * 0.5;
    const factorTendencia = tendencia === 'subiendo' ? 15 : tendencia === 'bajando' ? -15 : 0;
    
    let probabilidadManana = 50 + factorRacha + factorCumplimiento + factorTendencia;
    probabilidadManana = Math.max(5, Math.min(95, probabilidadManana));

    const valorSugerido = tendencia === 'bajando' 
      ? Math.ceil(promedioUltimos7 * 1.2)
      : Math.ceil(promedioUltimos7 * 1.1);

    const probabilidadCompletar = Math.min(95, tasaCumplimiento);

    return {
      diasRealizados,
      diasTotales,
      tasaCumplimiento: tasaCumplimiento.toFixed(1),
      promedioUltimos7: promedioUltimos7.toFixed(0),
      tendencia,
      rachaActual,
      probabilidadManana: probabilidadManana.toFixed(0),
      valorSugerido,
      probabilidadCompletar: probabilidadCompletar.toFixed(0)
    };
  };

  const metricas = calcularMetricas();

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
        fecha: new Date(r.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }),
        valor: r.valor
      }))
    : [];

  const registrosActuales = categoriaActual ? (registros[categoriaActual] || []) : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-indigo-900 mb-2 text-center">
          📊 Tracker de Hábitos Multi-Categoría
        </h1>
        <p className="text-center text-gray-600 mb-8">Analiza múltiples hábitos con estadísticas predictivas</p>

        <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={exportarExcel}
              disabled={categorias.length === 0}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <Download size={18} />
              Exportar Excel
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              <Upload size={18} />
              Importar Excel
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={importarExcel}
              className="hidden"
            />
          </div>
          <p className="text-center text-xs text-gray-500 mt-3">
            💾 Archivos compatibles con Excel y Google Sheets (.xlsx)
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-indigo-800 flex items-center gap-2">
              <FolderOpen size={24} />
              Categorías
            </h2>
            <button
              onClick={() => setMostrarNuevaCategoria(!mostrarNuevaCategoria)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              <Plus size={18} />
              Nueva Categoría
            </button>
          </div>

          {mostrarNuevaCategoria && (
            <div className="mb-4 p-4 bg-indigo-50 rounded-lg">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nuevaCategoria}
                  onChange={(e) => setNuevaCategoria(e.target.value)}
                  placeholder="Ej: Inglés, Gym, Leer, Meditar..."
                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  onKeyPress={(e) => e.key === 'Enter' && agregarCategoria()}
                />
                <button
                  onClick={agregarCategoria}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-medium"
                >
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
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      categoriaActual === cat
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {cat}
                  </button>
                  <button
                    onClick={() => eliminarCategoria(cat)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              👋 Crea tu primera categoría para comenzar
            </p>
          )}
        </div>

        {categoriaActual && (
          <>
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4 text-indigo-800">
                Registrar: {categoriaActual}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fecha</label>
                  <input
                    type="date"
                    value={nuevoRegistro.fecha}
                    onChange={(e) => setNuevoRegistro({...nuevoRegistro, fecha: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">¿Realizado?</label>
                  <select
                    value={nuevoRegistro.realizado}
                    onChange={(e) => setNuevoRegistro({...nuevoRegistro, realizado: e.target.value === 'true'})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="true">Sí</option>
                    <option value="false">No</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Valor (min/veces)</label>
                  <input
                    type="number"
                    value={nuevoRegistro.valor}
                    onChange={(e) => setNuevoRegistro({...nuevoRegistro, valor: e.target.value})}
                    disabled={!nuevoRegistro.realizado}
                    placeholder="Ej: 30"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={agregarRegistro}
                    className="w-full bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                  >
                    Agregar
                  </button>
                </div>
              </div>
            </div>

            {metricas && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-600">Probabilidad Mañana</h3>
                      <Calendar className="text-indigo-600" size={20} />
                    </div>
                    <p className="text-3xl font-bold text-indigo-900">{metricas.probabilidadManana}%</p>
                    <p className="text-xs text-gray-500 mt-1">De que lo realices</p>
                  </div>

                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-600">Tendencia</h3>
                      {getTendenciaIcon(metricas.tendencia)}
                    </div>
                    <p className={`text-3xl font-bold ${getTendenciaColor(metricas.tendencia)}`}>
                      {metricas.tendencia === 'subiendo' ? '↗ Subiendo' : 
                       metricas.tendencia === 'bajando' ? '↘ Bajando' : '→ Estable'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Últimos 7 días</p>
                  </div>

                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-600">Racha Actual</h3>
                      <Award className="text-yellow-500" size={20} />
                    </div>
                    <p className="text-3xl font-bold text-yellow-600">{metricas.rachaActual} días</p>
                    <p className="text-xs text-gray-500 mt-1">Consecutivos</p>
                  </div>

                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-600">Tasa Éxito</h3>
                      <Target className="text-green-600" size={20} />
                    </div>
                    <p className="text-3xl font-bold text-green-600">{metricas.probabilidadCompletar}%</p>
                    <p className="text-xs text-gray-500 mt-1">Cumplimiento</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-indigo-900 mb-4">📊 Estadísticas</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg">
                        <span className="text-gray-700">Días realizados</span>
                        <span className="font-bold text-indigo-900">{metricas.diasRealizados} / {metricas.diasTotales}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <span className="text-gray-700">Tasa de cumplimiento</span>
                        <span className="font-bold text-green-600">{metricas.tasaCumplimiento}%</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                        <span className="text-gray-700">Promedio últimos 7 días</span>
                        <span className="font-bold text-blue-600">{metricas.promedioUltimos7}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                        <span className="text-gray-700">Valor sugerido mañana</span>
                        <span className="font-bold text-purple-600">≥ {metricas.valorSugerido}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-indigo-900 mb-4">💡 Recomendaciones</h3>
                    <div className="space-y-3">
                      {metricas.tendencia === 'bajando' && (
                        <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded">
                          <p className="text-red-800 font-medium">⚠️ Alerta: Tendencia descendente</p>
                          <p className="text-sm text-red-600 mt-1">
                            Intenta llegar al menos a {metricas.valorSugerido} mañana para recuperar el ritmo.
                          </p>
                        </div>
                      )}
                      {metricas.tendencia === 'subiendo' && (
                        <div className="p-3 bg-green-50 border-l-4 border-green-500 rounded">
                          <p className="text-green-800 font-medium">✅ ¡Excelente! Vas en ascenso</p>
                          <p className="text-sm text-green-600 mt-1">
                            Mantén el impulso alcanzando {metricas.valorSugerido} o más.
                          </p>
                        </div>
                      )}
                      {metricas.rachaActual >= 7 && (
                        <div className="p-3 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                          <p className="text-yellow-800 font-medium">🔥 ¡Racha de {metricas.rachaActual} días!</p>
                          <p className="text-sm text-yellow-600 mt-1">
                            Estás construyendo un hábito sólido. ¡No lo rompas!
                          </p>
                        </div>
                      )}
                      {parseFloat(metricas.probabilidadCompletar) >= 80 && (
                        <div className="p-3 bg-indigo-50 border-l-4 border-indigo-500 rounded">
                          <p className="text-indigo-800 font-medium">🎯 Alta probabilidad de éxito</p>
                          <p className="text-sm text-indigo-600 mt-1">
                            Con tu ritmo actual, mantienes {metricas.probabilidadCompletar}% de cumplimiento.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {datosGrafico.length > 0 && (
                  <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <h3 className="text-lg font-semibold text-indigo-900 mb-4">📈 Evolución de {categoriaActual}</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={datosGrafico}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="fecha" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="valor" stroke="#4f46e5" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            )}

            {registrosActuales.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-indigo-900 mb-4">📋 Historial: {categoriaActual}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-indigo-200">
                        <th className="text-left p-3 text-indigo-900">Fecha</th>
                        <th className="text-left p-3 text-indigo-900">¿Realizado?</th>
                        <th className="text-left p-3 text-indigo-900">Valor</th>
                        <th className="text-left p-3 text-indigo-900">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...registrosAct
