// Borradores en memoria de los formularios de producto, compartidos con Elegir foto.
// Clave: 'nuevo' o 'editar:<id>'. Forma: { valores?, foto? } (design.md §3).
// Solo viven mientras la app está abierta.

const borradores = new Map();

export function leerBorrador(clave) {
  return borradores.get(clave) ?? null;
}

export function guardarBorrador(clave, borrador) {
  borradores.set(clave, borrador);
}

export function descartarBorrador(clave) {
  borradores.delete(clave);
}

// Solo para las pruebas: olvida todos los borradores.
export function descartarBorradores() {
  borradores.clear();
}
