export const obtenerDiaSemana = (fecha) => {
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return dias[new Date(fecha + 'T00:00:00').getDay()];
};

export const formatearFechaLocal = (fecha) => {
  const date = new Date(fecha + 'T00:00:00');
  return date.toISOString().split('T')[0];
};
