// Formato de fechas y cantidades en español. Puro y sin importaciones.
// Usa una tabla de meses propia: Intl da "sept" o "sep." según el motor y la versión.

const MESES = Object.freeze(['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic']);

// '2026-11-20' → '20 nov 2026'. Trabaja con el texto: no crea un Date, así que no
// depende de la zona horaria.
export function formatearFecha(fecha) {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return `${dia} ${MESES[mes - 1]} ${anio}`;
}

// 0.5, 'kg' → '0,5 kg': coma decimal y como máximo dos decimales, sin ceros sobrantes.
export function formatearCantidad(cantidad, unidad) {
  const numero = String(Math.round(cantidad * 100) / 100).replace('.', ',');
  return `${numero} ${unidad}`;
}

// Momento ISO → 'hoy a las 18:30', 'ayer a las 9:05' o '10 nov 2026 a las 18:30', en la
// hora local del dispositivo (última sincronización, sync-status).
export function formatearMomento(iso, ahora = new Date()) {
  const momento = new Date(iso);
  const hora = `${momento.getHours()}:${String(momento.getMinutes()).padStart(2, '0')}`;
  const dia = (fecha) => `${fecha.getFullYear()}-${fecha.getMonth()}-${fecha.getDate()}`;
  const ayer = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - 1);
  if (dia(momento) === dia(ahora)) return `hoy a las ${hora}`;
  if (dia(momento) === dia(ayer)) return `ayer a las ${hora}`;
  return `${momento.getDate()} ${MESES[momento.getMonth()]} ${momento.getFullYear()} a las ${hora}`;
}
