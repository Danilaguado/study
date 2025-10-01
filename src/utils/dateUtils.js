export const calcularMetricas = (registros, categoriaActual, diasTendencia) => {
  if (!categoriaActual || !registros[categoriaActual] || registros[categoriaActual].length === 0) {
    return null;
  }

  const regs = registros[categoriaActual];
  const diasRealizados = regs.filter(r => r.realizado).length;
  const diasTotales = regs.length;
  const tasaCumplimiento = (diasRealizados / diasTotales) * 100;

  const ultimosN = regs.slice(-diasTendencia);
  const valoresUltimosN = ultimosN.filter(r => r.realizado).map(r => r.valor);
  const promedioUltimosN = valoresUltimosN.length > 0 
    ? valoresUltimosN.reduce((a, b) => a + b, 0) / valoresUltimosN.length 
    : 0;

  const calcularTendencia = () => {
    if (valoresUltimosN.length < 3) return 'neutral';
    const mitad = Math.floor(valoresUltimosN.length / 2);
    const primera = valoresUltimosN.slice(0, mitad);
    const segunda = valoresUltimosN.slice(mitad);
    
    const promPrimera = primera.reduce((a, b) => a + b, 0) / primera.length;
    const promSegunda = segunda.reduce((a, b) => a + b, 0) / segunda.length;
    
    const diferencia = ((promSegunda - promPrimera) / promPrimera) * 100;
    
    if (diferencia > 10) return 'subiendo';
    if (diferencia < -10) return 'bajando';
    return 'estable';
  };

  const tendencia = calcularTendencia();

  const calcularMinutosParaEstable = () => {
    if (tendencia === 'bajando') {
      return Math.ceil(promedioUltimosN * 1.3);
    } else if (tendencia === 'estable') {
      return Math.ceil(promedioUltimosN * 1.1);
    }
    return Math.ceil(promedioUltimosN);
  };

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

  const valorSugerido = calcularMinutosParaEstable();
  const probabilidadCompletar = Math.min(95, tasaCumplimiento);

  const horasFrecuencia = {};
  regs.filter(r => r.realizado && r.horaInicio != null).forEach(r => {
    horasFrecuencia[r.horaInicio] = (horasFrecuencia[r.horaInicio] || 0) + r.valor;
  });

  const mejorHora = Object.keys(horasFrecuencia).length > 0
    ? Object.keys(horasFrecuencia).reduce((a, b) => 
        horasFrecuencia[a] > horasFrecuencia[b] ? a : b
      )
    : null;

  return {
    diasRealizados,
    diasTotales,
    tasaCumplimiento: tasaCumplimiento.toFixed(1),
    promedioUltimosN: promedioUltimosN.toFixed(0),
    tendencia,
    rachaActual,
    probabilidadManana: probabilidadManana.toFixed(0),
    valorSugerido,
    probabilidadCompletar: probabilidadCompletar.toFixed(0),
    mejorHora: mejorHora ? `${mejorHora}:00` : 'N/A'
  };
};
