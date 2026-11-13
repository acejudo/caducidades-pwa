// Almacenamiento local de productos en IndexedDB, disponible sin conexión.
// Spec: openspec/specs/product-storage. Importa solo módulos sin datos sensibles
// (nunca config.js), para poder probarse sin config.local.js.

import {
  ErrorValidacion, aplicarCambios, marcarEliminado, nuevoProducto, ordenarPorCaducidad,
} from './productos.js';
import { fusionar } from './sincronizacion.js';

const VERSION = 1;
const ALMACEN = 'productos';

let nombreBaseDeDatos = 'caducidades';
let conexion = null; // Promise<IDBDatabase> de la conexión abierta (o abriéndose)
let baseDeDatosAbierta = null; // IDBDatabase, para poder cerrarla de forma síncrona
let persistenciaPedida = false;

export class ErrorAlmacenamiento extends Error {
  constructor(mensaje, causa) {
    super(mensaje);
    this.name = 'ErrorAlmacenamiento';
    this.causa = causa;
  }
}

export class ErrorNoEncontrado extends Error {
  constructor(id) {
    super('El producto no existe');
    this.name = 'ErrorNoEncontrado';
    this.id = id;
  }
}

// Cierra la conexión actual y hace que las siguientes operaciones usen `nombre`.
// Solo para las pruebas (base de datos 'caducidades-pruebas'); la app no la llama.
export function usarBaseDeDatos(nombre) {
  baseDeDatosAbierta?.close();
  baseDeDatosAbierta = null;
  conexion = null;
  nombreBaseDeDatos = nombre;
}

// ---------- Conexión ----------

// Cambios de esquema por versión: cada versión nueva añade su `case` sin `break`, para
// que una base de datos antigua aplique todos los pasos pendientes sin perder datos.
function migrar(bd, versionAnterior) {
  switch (versionAnterior) {
    case 0:
      bd.createObjectStore(ALMACEN, { keyPath: 'id' });
    // falls through
    default:
  }
}

function pedirPersistencia() {
  if (persistenciaPedida) return;
  persistenciaPedida = true;
  // Mejora posible: reduce el riesgo de que el navegador borre los datos. No se espera.
  globalThis.navigator?.storage?.persist?.().catch(() => {});
}

function abrir() {
  if (conexion) return conexion;

  const intento = new Promise((resolver, rechazar) => {
    const peticion = indexedDB.open(nombreBaseDeDatos, VERSION); // puede lanzar: lo recoge la promesa
    peticion.onupgradeneeded = (evento) => migrar(peticion.result, evento.oldVersion);
    peticion.onsuccess = () => {
      const bd = peticion.result;
      // Otra pestaña con una versión nueva necesita actualizar: soltamos la conexión.
      bd.onversionchange = () => {
        bd.close();
        if (baseDeDatosAbierta === bd) {
          baseDeDatosAbierta = null;
          conexion = null;
        }
      };
      baseDeDatosAbierta = bd;
      resolver(bd);
    };
    peticion.onerror = () => rechazar(peticion.error);
  }).catch((causa) => {
    if (conexion === intento) conexion = null; // permite reintentar
    throw new ErrorAlmacenamiento('No se pudo abrir el almacenamiento local', causa);
  });

  conexion = intento;
  pedirPersistencia();
  return intento;
}

// ---------- Transacciones ----------

function peticion(solicitud) {
  return new Promise((resolver, rechazar) => {
    solicitud.onsuccess = () => resolver(solicitud.result);
    solicitud.onerror = () => rechazar(solicitud.error);
  });
}

function esErrorDeDominio(error) {
  return error instanceof ErrorNoEncontrado || error instanceof ErrorValidacion;
}

// Ejecuta `operacion(almacen)` en una transacción y devuelve su resultado cuando la
// transacción se ha confirmado (oncomplete). Si la operación lanza, la transacción se
// aborta: los errores de dominio pasan tal cual y el resto se convierte en
// ErrorAlmacenamiento.
async function enTransaccion(modo, operacion) {
  const bd = await abrir();

  let transaccion;
  try {
    transaccion = bd.transaction(ALMACEN, modo);
  } catch (causa) {
    usarBaseDeDatos(nombreBaseDeDatos); // conexión cerrada o inválida: se reabrirá
    throw new ErrorAlmacenamiento('No se pudo acceder al almacenamiento local', causa);
  }

  const terminada = new Promise((resolver, rechazar) => {
    transaccion.oncomplete = () => resolver();
    transaccion.onabort = () => rechazar(transaccion.error);
  });
  terminada.catch(() => {}); // se gestiona abajo; evita avisos de promesa sin capturar

  let resultado;
  try {
    resultado = await operacion(transaccion.objectStore(ALMACEN));
  } catch (error) {
    try { transaccion.abort(); } catch { /* ya abortada */ }
    if (esErrorDeDominio(error)) throw error;
    throw new ErrorAlmacenamiento('Falló una operación del almacenamiento local', error);
  }

  try {
    await terminada;
  } catch (causa) {
    throw new ErrorAlmacenamiento('No se pudo guardar en el almacenamiento local', causa);
  }
  return resultado;
}

// ---------- API pública ----------

// Emite 'cambio' tras cada alta, actualización o baja confirmada, para que la
// sincronización marque cambios pendientes. Los guardados de la sincronización no avisan.
export const cambiosLocales = new EventTarget();

function avisarCambio() {
  cambiosLocales.dispatchEvent(new Event('cambio'));
}

// Productos no eliminados, ordenados por caducidad.
export async function listarProductos() {
  const todos = await enTransaccion('readonly', (almacen) => peticion(almacen.getAll()));
  return ordenarPorCaducidad(todos.filter((producto) => !producto.eliminado));
}

// Producto no eliminado con ese id, o null.
export async function obtenerProducto(id) {
  const producto = await enTransaccion('readonly', (almacen) => peticion(almacen.get(id)));
  return producto && !producto.eliminado ? producto : null;
}

// Valida y guarda un producto nuevo; devuelve el producto guardado.
// Lanza ErrorValidacion (no se guarda nada) o ErrorAlmacenamiento.
export async function crearProducto(datos) {
  const producto = nuevoProducto(datos);
  await enTransaccion('readwrite', (almacen) => peticion(almacen.add(producto)));
  avisarCambio();
  return producto;
}

// Aplica `cambios` al producto guardado, lo valida y lo guarda en la misma
// transacción; devuelve el producto resultante. Lanza ErrorNoEncontrado (no existe o
// está eliminado), ErrorValidacion o ErrorAlmacenamiento, sin cambiar nada.
export async function actualizarProducto(id, cambios) {
  const resultado = await enTransaccion('readwrite', async (almacen) => {
    const guardado = await peticion(almacen.get(id));
    if (!guardado || guardado.eliminado) throw new ErrorNoEncontrado(id);
    const actualizado = aplicarCambios(guardado, cambios);
    await peticion(almacen.put(actualizado));
    return actualizado;
  });
  avisarCambio();
  return resultado;
}

// Marca el producto como eliminado (conserva el registro para la sincronización).
// Si no existe o ya estaba eliminado, no hace nada.
export async function eliminarProducto(id) {
  const eliminado = await enTransaccion('readwrite', async (almacen) => {
    const guardado = await peticion(almacen.get(id));
    if (!guardado || guardado.eliminado) return false;
    await peticion(almacen.put(marcarEliminado(guardado)));
    return true;
  });
  if (eliminado) avisarCambio();
}

// ---------- Sincronización con Drive (drive-sync) ----------

// Todos los productos, también los eliminados, sin ordenar.
export async function listarTodos() {
  return enTransaccion('readonly', (almacen) => peticion(almacen.getAll()));
}

// Guarda los productos que llegan de la sincronización con su `actualizado` original.
// Fusiona con lo guardado en la misma transacción: un cambio que el usuario haya hecho
// mientras tanto es más reciente y gana. Después borra los `idsPurgados` que sigan
// eliminados. No avisa de cambio local.
export async function guardarSincronizados(productos, idsPurgados = []) {
  await enTransaccion('readwrite', async (almacen) => {
    const guardados = await peticion(almacen.getAll());
    const porId = new Map(guardados.map((p) => [p.id, p]));
    for (const producto of fusionar(guardados, productos)) {
      if (porId.get(producto.id) !== producto) await peticion(almacen.put(producto));
      porId.set(producto.id, producto);
    }
    for (const id of idsPurgados) {
      if (porId.get(id)?.eliminado) await peticion(almacen.delete(id));
    }
  });
}
