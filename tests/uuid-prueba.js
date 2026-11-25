// Ids de prueba legibles: las pruebas escriben 'a', 'q' o 'p00001' y los productos llevan un
// UUID en minúsculas determinista, porque la lectura del archivo de Drive solo acepta UUID
// (drive-sync, "Contenido no válido en Drive"). Lo usan las pruebas de Node y las del navegador.
// Admite ids de hasta 15 caracteres ASCII.

export function uuid(corto) {
  const hex = [...corto].map((c) => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
  if (hex.length > 30) throw new Error(`Id de prueba demasiado largo: ${corto}`);
  const h = hex.padStart(30, '0');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(12, 15)}-8${h.slice(15, 18)}-${h.slice(18)}`;
}

// Inverso de uuid(): el id corto de un UUID de prueba, o el mismo texto si no lo es.
export function corto(id) {
  const partes = /^([0-9a-f]{8})-([0-9a-f]{4})-4([0-9a-f]{3})-8([0-9a-f]{3})-([0-9a-f]{12})$/.exec(id);
  if (!partes) return id;
  const hex = partes.slice(1).join('').replace(/^(00)+/, '');
  return hex.match(/../g)?.map((par) => String.fromCharCode(parseInt(par, 16))).join('') ?? '';
}
