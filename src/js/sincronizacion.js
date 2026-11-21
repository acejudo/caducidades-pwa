// Lógica pura de la sincronización con Drive: leer y escribir el archivo, fusionar,
// purgar y el texto del estado. Specs: openspec/specs/drive-sync y sync-status.
// Sin DOM, sin red ni almacenamiento: se prueba en Node (tests/sincronizacion.test.js).

import { normalizarProducto, validarProducto, esNombreFotoReal } from './productos.js';

export const VERSION_ARCHIVO = 1;
// Las bajas con más días que estos se quitan del dispositivo y del archivo.
export const DIAS_PURGA = 90;
const MS_POR_DIA = 86_400_000;

export class ErrorArchivoNoValido extends Error {
  constructor(mensaje, causa) {
    super(mensaje);
    this.name = 'ErrorArchivoNoValido';
    this.causa = causa;
  }
}

const esFechaHora = (valor) => typeof valor === 'string' && !Number.isNaN(Date.parse(valor));

// Producto del archivo listo para guardar, o null si no cumple el modelo.
function productoDelArchivo(datos) {
  if (!datos || typeof datos !== 'object') return null;
  const { id, eliminado, actualizado } = datos;
  if (typeof id !== 'string' || !id || typeof eliminado !== 'boolean' || !esFechaHora(actualizado)) return null;
  const campos = normalizarProducto(datos);
  if (Object.keys(validarProducto(campos)).length > 0) return null;
  return { id, ...campos, eliminado, actualizado };
}

// Texto de caducidades.json → { productos, descartados }. Lanza ErrorArchivoNoValido si
// no es un JSON con el formato de SPEC §4.2; los productos no válidos se descartan.
export function leerArchivo(texto) {
  let archivo;
  try {
    archivo = JSON.parse(texto);
  } catch (causa) {
    throw new ErrorArchivoNoValido('El archivo de Drive no es JSON', causa);
  }
  if (!archivo || typeof archivo !== 'object' || Array.isArray(archivo)
    || archivo.version !== VERSION_ARCHIVO || !Array.isArray(archivo.productos)) {
    throw new ErrorArchivoNoValido('El archivo de Drive no tiene el formato esperado');
  }
  const productos = archivo.productos.map(productoDelArchivo).filter(Boolean);
  return { productos, descartados: archivo.productos.length - productos.length };
}

// Texto del archivo con todos los productos (también los eliminados), ordenados por id
// para que el contenido no dependa del orden de llegada.
export function crearArchivo(productos, ahora = new Date()) {
  const ordenados = [...productos].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return JSON.stringify({
    version: VERSION_ARCHIVO,
    ultimaActualizacion: ahora.toISOString(),
    productos: ordenados,
  }, null, 2);
}

// Versión que gana entre dos del mismo producto: el `actualizado` más reciente. Si
// empatan, la eliminada y, si ninguna lo está, la remota (resultado determinista).
function ganadora(local, remoto) {
  const diferencia = Date.parse(local.actualizado) - Date.parse(remoto.actualizado);
  if (diferencia !== 0) return diferencia > 0 ? local : remoto;
  if (local.eliminado !== remoto.eliminado) return local.eliminado ? local : remoto;
  return remoto;
}

// Une las dos listas por id con last-write-wins. No modifica las entradas.
export function fusionar(locales, remotos) {
  const resultado = new Map(locales.map((p) => [p.id, p]));
  for (const remoto of remotos) {
    const local = resultado.get(remoto.id);
    resultado.set(remoto.id, local ? ganadora(local, remoto) : remoto);
  }
  return [...resultado.values()];
}

// Quita las bajas de más de `dias` días.
export function purgar(productos, ahora = new Date(), dias = DIAS_PURGA) {
  const limite = ahora.getTime() - dias * MS_POR_DIA;
  return productos.filter((p) => !(p.eliminado && Date.parse(p.actualizado) < limite));
}

// Huella de una lista: qué versión de cada producto contiene.
function huella(productos) {
  return productos.map((p) => `${p.id}@${p.actualizado}@${p.eliminado}`).sort().join('|');
}

// Qué hay que hacer en una sincronización: el resultado de fusionar y purgar, si cambia
// lo guardado en el dispositivo, si hay que subirlo a Drive y qué ids se han purgado.
export function planificar(locales, remotos, ahora = new Date()) {
  const fusionados = fusionar(locales, remotos);
  const resultado = purgar(fusionados, ahora);
  const quedan = new Set(resultado.map((p) => p.id));
  const idsPurgados = fusionados.filter((p) => !quedan.has(p.id)).map((p) => p.id).sort();
  const final = huella(resultado);
  return {
    resultado,
    idsPurgados,
    cambiaLocal: final !== huella(locales),
    hayQueSubir: final !== huella(remotos),
  };
}

// ---------- Fotos reales (fotos-reales, design.md §6) ----------

// Margen antes de borrar una foto sin usar: así no se borra una foto recién hecha que otro
// dispositivo aún no ha anotado en la lista.
export const MARGEN_FOTOS_MS = MS_POR_DIA;

const porNombre = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

// Nombres de las fotos reales válidas de los productos (de todos, o solo de los activos).
function nombresDeFotos(productos, { soloActivos }) {
  const nombres = new Set();
  for (const p of productos) {
    if (soloActivos && p.eliminado) continue;
    if (p.foto?.tipo === 'real' && esNombreFotoReal(p.foto.valor)) nombres.add(p.foto.valor);
  }
  return nombres;
}

// Qué hacer con las fotos al sincronizar:
// - productos: el resultado fusionado de la lista (también los eliminados);
// - locales: [{ nombre, subida, creada }] del dispositivo;
// - remotas: [{ id, name, createdTime, ownedByMe }] de la carpeta de fotos de Drive.
// Devuelve { subir, marcarSubidas, descargar: [{ nombre, id }], borrarLocales,
// borrarRemotas: [id] }. Solo se tocan archivos con nombre de foto real válido, y en Drive
// solo se borran los de la propia cuenta.
export function planificarFotos({ productos, locales = [], remotas = [], ahora = new Date() }) {
  const activas = nombresDeFotos(productos, { soloActivos: true });
  const usadas = nombresDeFotos(productos, { soloActivos: false });
  const limite = ahora.getTime() - MARGEN_FOTOS_MS;
  const antigua = (fecha) => Date.parse(fecha) < limite;

  const remotasPorNombre = new Map();
  for (const remota of remotas) {
    if (esNombreFotoReal(remota.name) && !remotasPorNombre.has(remota.name)) remotasPorNombre.set(remota.name, remota);
  }
  const localesPorNombre = new Map(locales.filter((l) => esNombreFotoReal(l.nombre)).map((l) => [l.nombre, l]));

  const pendientes = [...localesPorNombre.values()].filter((l) => !l.subida);
  return {
    subir: pendientes.filter((l) => activas.has(l.nombre) && !remotasPorNombre.has(l.nombre)).map((l) => l.nombre).sort(porNombre),
    marcarSubidas: pendientes.filter((l) => remotasPorNombre.has(l.nombre)).map((l) => l.nombre).sort(porNombre),
    descargar: [...activas].filter((n) => !localesPorNombre.has(n) && remotasPorNombre.has(n)).sort(porNombre)
      .map((nombre) => ({ nombre, id: remotasPorNombre.get(nombre).id })),
    borrarLocales: [...localesPorNombre.values()].filter((l) => !usadas.has(l.nombre) && antigua(l.creada))
      .map((l) => l.nombre).sort(porNombre),
    borrarRemotas: [...remotasPorNombre.values()]
      .filter((r) => !usadas.has(r.name) && r.ownedByMe === true && antigua(r.createdTime))
      .sort((a, b) => porNombre(a.name, b.name)).map((r) => r.id),
  };
}

// Texto del estado de sincronización (sync-status), por orden de prioridad.
export function textoEstado({ enLinea, fase, pendiente, tokenVigente }) {
  if (!enLinea) return 'Sin conexión';
  if (fase === 'sincronizando') return 'Sincronizando…';
  if (fase === 'error') return 'Error al sincronizar';
  if (!tokenVigente) return 'Toca para sincronizar';
  if (pendiente) return 'Cambios pendientes';
  return 'Sincronizado';
}

// Si el Listado debe mostrar "Hay cambios sin sincronizar. Toca para sincronizar"
// (sync-status): hay cambios pendientes, hay conexión, no hay token para sincronizar sola y
// no se está sincronizando. Tras un error también, para poder reintentar con un toque.
export function avisoPendiente({ enLinea, fase, pendiente, tokenVigente }) {
  return Boolean(enLinea && pendiente && !tokenVigente && fase !== 'sincronizando');
}
