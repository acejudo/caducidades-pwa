// Pruebas de src/js/storage.js (necesitan IndexedDB, por eso corren en el navegador).
// Spec: product-storage. Usan siempre la base de datos BD_PRUEBAS, nunca la real.
import { prueba, antesDeCada, igual, igualProfundo, verdadero, rechaza } from './runner.js';

// Import tolerante: si el módulo aún no está listo, cada prueba falla por separado (rojo).
const storage = await import('../../src/js/storage.js').catch((error) => {
  console.error('No se pudo cargar storage.js', error);
  return {};
});

const { ErrorValidacion } = await import('../../src/js/productos.js').catch(() => ({}));

const BD_PRUEBAS = 'caducidades-pruebas';
const MINIMO = Object.freeze({ nombre: 'Yogur', fechaCaducidad: '2026-11-20' });

function borrarBaseDeDatos(nombre) {
  return new Promise((resolver, rechazar) => {
    const peticion = indexedDB.deleteDatabase(nombre);
    peticion.onsuccess = () => resolver();
    peticion.onerror = () => rechazar(peticion.error);
    peticion.onblocked = () => rechazar(new Error(`No se pudo borrar ${nombre}: hay una conexión abierta`));
  });
}

// Abre la base de datos de pruebas directamente (sin storage.js) para inspeccionarla.
function abrirDirecto() {
  return new Promise((resolver, rechazar) => {
    const peticion = indexedDB.open(BD_PRUEBAS);
    peticion.onsuccess = () => resolver(peticion.result);
    peticion.onerror = () => rechazar(peticion.error);
  });
}

// Escribe o lee un registro tal cual en la base de datos de pruebas (sin storage.js).
async function conAlmacenDirecto(modo, operacion) {
  storage.usarBaseDeDatos(BD_PRUEBAS);
  const bd = await abrirDirecto();
  try {
    return await new Promise((resolver, rechazar) => {
      const transaccion = bd.transaction('productos', modo);
      let resultado;
      const solicitud = operacion(transaccion.objectStore('productos'));
      solicitud.onsuccess = () => { resultado = solicitud.result; };
      transaccion.oncomplete = () => resolver(resultado);
      transaccion.onabort = () => rechazar(transaccion.error);
    });
  } finally {
    bd.close();
  }
}
const escribirDirecto = (registro) => conAlmacenDirecto('readwrite', (almacen) => almacen.put(registro));
const leerDirecto = (id) => conAlmacenDirecto('readonly', (almacen) => almacen.get(id));

antesDeCada(async () => {
  storage.usarBaseDeDatos(BD_PRUEBAS); // cierra la conexión anterior
  await borrarBaseDeDatos(BD_PRUEBAS);
});

// ---------- Apertura y errores ----------

prueba('Sin productos', async () => {
  igualProfundo(await storage.listarProductos(), []);
});

prueba('tras la primera operación existe el almacén productos', async () => {
  await storage.listarProductos();
  storage.usarBaseDeDatos(BD_PRUEBAS); // suelta la conexión de storage.js
  const bd = await abrirDirecto();
  try {
    igual(bd.version, 1, 'versión');
    verdadero(bd.objectStoreNames.contains('productos'), 'falta el almacén productos');
  } finally {
    bd.close();
  }
});

prueba('Navegador sin almacenamiento', async () => {
  storage.usarBaseDeDatos(BD_PRUEBAS);
  indexedDB.open = () => { throw new DOMException('Almacenamiento bloqueado', 'SecurityError'); };
  try {
    const error = await rechaza(storage.listarProductos(), storage.ErrorAlmacenamiento);
    verdadero(error.causa instanceof DOMException, 'el error conserva la causa');
  } finally {
    delete indexedDB.open;
  }
  // Con el almacenamiento disponible de nuevo, la siguiente operación funciona.
  igualProfundo(await storage.listarProductos(), []);
});

prueba('fallo asíncrono al abrir la base de datos', async () => {
  storage.usarBaseDeDatos(BD_PRUEBAS);
  indexedDB.open = () => {
    const peticionFalsa = { error: new DOMException('Sin espacio', 'QuotaExceededError') };
    setTimeout(() => peticionFalsa.onerror?.({ target: peticionFalsa }));
    return peticionFalsa;
  };
  try {
    await rechaza(storage.listarProductos(), storage.ErrorAlmacenamiento);
  } finally {
    delete indexedDB.open;
  }
  igualProfundo(await storage.listarProductos(), []);
});

// ---------- Alta y lectura ----------

prueba('Alta válida', async () => {
  const antes = Date.now();
  const p = await storage.crearProducto({ ...MINIMO, cantidad: '2', notas: ' natural ' });
  verdadero(typeof p.id === 'string' && p.id.length > 0, 'tiene id');
  verdadero(Date.parse(p.actualizado) >= antes - 1, 'actualizado es la hora de la operación');
  igual(p.eliminado, false);
  igual(p.cantidad, 2);
  igual(p.notas, 'natural');
  igualProfundo(await storage.obtenerProducto(p.id), p);
});

prueba('Alta no válida', async () => {
  await storage.crearProducto({ ...MINIMO });
  const error = await rechaza(storage.crearProducto({ fechaCaducidad: '2026-11-20' }), ErrorValidacion);
  igualProfundo(Object.keys(error.campos), ['nombre']);
  igual((await storage.listarProductos()).length, 1, 'el número de productos no cambia');
});

prueba('Producto existente', async () => {
  const a = await storage.crearProducto({ ...MINIMO, nombre: 'Leche' });
  const b = await storage.crearProducto({ ...MINIMO, nombre: 'Queso' });
  igualProfundo(await storage.obtenerProducto(a.id), a);
  igualProfundo(await storage.obtenerProducto(b.id), b);
});

prueba('Id desconocido o eliminado', async () => {
  igual(await storage.obtenerProducto('no-existe'), null);
  const p = await storage.crearProducto({ ...MINIMO });
  await escribirDirecto({ ...p, eliminado: true });
  igual(await storage.obtenerProducto(p.id), null);
});

prueba('Lista ordenada', async () => {
  await storage.crearProducto({ nombre: 'Queso', fechaCaducidad: '2026-11-25' });
  await storage.crearProducto({ nombre: 'Pollo', fechaCaducidad: '2026-11-10' });
  const borrado = await storage.crearProducto({ nombre: 'Huevos', fechaCaducidad: '2026-11-01' });
  await storage.crearProducto({ nombre: 'Leche', fechaCaducidad: '2026-11-15' });
  await escribirDirecto({ ...borrado, eliminado: true });
  const nombres = (await storage.listarProductos()).map((p) => p.nombre);
  igualProfundo(nombres, ['Pollo', 'Leche', 'Queso']);
});

// ---------- Edición y baja ----------

prueba('Edición parcial', async () => {
  const p = await storage.crearProducto({ ...MINIMO, notas: 'natural' });
  const editado = await storage.actualizarProducto(p.id, { cantidad: 3 });
  igual(editado.cantidad, 3);
  igualProfundo({ ...editado, cantidad: p.cantidad, actualizado: p.actualizado }, p, 'el resto no cambia');
  verdadero(editado.actualizado > p.actualizado, 'actualizado es posterior al anterior');
  igualProfundo(await storage.obtenerProducto(p.id), editado);
});

prueba('Edición no válida', async () => {
  const p = await storage.crearProducto({ ...MINIMO });
  const error = await rechaza(storage.actualizarProducto(p.id, { nombre: '  ' }), ErrorValidacion);
  igualProfundo(Object.keys(error.campos), ['nombre']);
  igualProfundo(await storage.obtenerProducto(p.id), p, 'el producto guardado no cambia');
});

prueba('Producto inexistente', async () => {
  const error = await rechaza(storage.actualizarProducto('no-existe', { cantidad: 2 }), storage.ErrorNoEncontrado);
  igual(error.message, 'El producto no existe');
  igual(error.id, 'no-existe');
  const p = await storage.crearProducto({ ...MINIMO });
  await escribirDirecto({ ...p, eliminado: true });
  await rechaza(storage.actualizarProducto(p.id, { cantidad: 2 }), storage.ErrorNoEncontrado, 'eliminado');
  igual((await leerDirecto(p.id)).cantidad, 1, 'el eliminado no cambia');
});

prueba('Eliminar', async () => {
  const p = await storage.crearProducto({ ...MINIMO });
  const otro = await storage.crearProducto({ ...MINIMO, nombre: 'Leche' });
  igual(await storage.eliminarProducto(p.id), undefined);
  igualProfundo((await storage.listarProductos()).map((x) => x.id), [otro.id]);
  igual(await storage.obtenerProducto(p.id), null);
  const registro = await leerDirecto(p.id);
  igual(registro.eliminado, true, 'el registro interno se conserva marcado');
  verdadero(registro.actualizado > p.actualizado, 'con un actualizado nuevo');
  igualProfundo({ ...registro, eliminado: false, actualizado: p.actualizado }, p, 'sin cambiar el resto');
});

prueba('Eliminar dos veces', async () => {
  const p = await storage.crearProducto({ ...MINIMO });
  await storage.eliminarProducto(p.id);
  const primero = await leerDirecto(p.id);
  await storage.eliminarProducto(p.id);
  igualProfundo(await leerDirecto(p.id), primero, 'su actualizado no cambia');
  await storage.eliminarProducto('no-existe');
  igual(await leerDirecto('no-existe'), undefined, 'no se crea ningún registro');
});

prueba('Valor de entrada ignorado', async () => {
  const viejo = '2000-01-01T00:00:00.000Z';
  const antes = Date.now();
  const p = await storage.crearProducto({ ...MINIMO, actualizado: viejo, eliminado: true, id: 'mio' });
  verdadero(Date.parse(p.actualizado) >= antes - 1, 'alta: actualizado es la hora de la operación');
  igual(p.eliminado, false);
  verdadero(p.id !== 'mio', 'el id no lo elige la entrada');
  const editado = await storage.actualizarProducto(p.id, { actualizado: viejo, notas: 'abierto' });
  verdadero(editado.actualizado > p.actualizado, 'edición: actualizado es la hora de la operación');
  igual((await leerDirecto(p.id)).actualizado, editado.actualizado);
});

// ---------- Persistencia y datos compartidos ----------

prueba('Reapertura', async () => {
  const p = await storage.crearProducto({ ...MINIMO, notas: 'abierto el lunes' });
  storage.usarBaseDeDatos(BD_PRUEBAS); // cierra la conexión: la siguiente lectura reabre
  igualProfundo(await storage.obtenerProducto(p.id), p);
  igualProfundo(await storage.listarProductos(), [p]);
});

prueba('Cerrar sesión y volver a entrar', async () => {
  // auth.js no debe conocer el almacenamiento de productos.
  const fuente = await (await fetch('../../src/js/auth.js')).text();
  verdadero(!/indexedDB|storage\.js|deleteDatabase/.test(fuente), 'auth.js no toca los productos');

  const a = await storage.crearProducto({ ...MINIMO, nombre: 'Leche' });
  const b = await storage.crearProducto({ ...MINIMO, nombre: 'Queso' });

  // Si existe config.local.js se prueba además el cierre de sesión real. Se guarda y
  // restaura la sesión del origen para no cerrar la de desarrollo al abrir la página a mano.
  const auth = await import('../../src/js/auth.js').catch(() => null);
  if (auth) {
    const sesionPrevia = localStorage.getItem('caducidades.sesion');
    localStorage.setItem('caducidades.sesion', JSON.stringify({ email: 'prueba@example.com', nombre: 'Prueba', desde: new Date().toISOString() }));
    try {
      auth.cerrarSesion();
      igual(auth.sesionActual(), null, 'la sesión se ha cerrado');
    } finally {
      if (sesionPrevia === null) localStorage.removeItem('caducidades.sesion');
      else localStorage.setItem('caducidades.sesion', sesionPrevia);
    }
  }

  storage.usarBaseDeDatos(BD_PRUEBAS); // volver a entrar: conexión nueva
  igualProfundo((await storage.listarProductos()).map((p) => p.id), [a.id, b.id]);
});

// ---------- Sincronización con Drive ----------

function remoto(id, cambios = {}) {
  return {
    id,
    nombre: `Remoto ${id}`,
    fechaCompra: null,
    fechaCaducidad: '2026-11-30',
    cantidad: 1,
    unidad: 'ud',
    categoria: 'Nevera',
    foto: { tipo: 'ninguna', valor: null },
    notas: null,
    eliminado: false,
    actualizado: '2026-11-01T10:00:00.000Z',
    ...cambios,
  };
}

// Anota los avisos de cambio local hasta que se llama a la función devuelta.
function escucharCambios() {
  const avisos = [];
  const oyente = (evento) => avisos.push(evento.type);
  storage.cambiosLocales.addEventListener('cambio', oyente);
  return { avisos, dejar: () => storage.cambiosLocales.removeEventListener('cambio', oyente) };
}

prueba('listarTodos incluye los eliminados', async () => {
  const leche = await storage.crearProducto({ nombre: 'Leche', fechaCaducidad: '2026-11-20' });
  const pan = await storage.crearProducto({ nombre: 'Pan', fechaCaducidad: '2026-11-21' });
  await storage.eliminarProducto(pan.id);
  const todos = await storage.listarTodos();
  igualProfundo(todos.map((p) => p.id).sort(), [leche.id, pan.id].sort());
  igual(todos.find((p) => p.id === pan.id).eliminado, true);
});

prueba('Producto recibido de Drive', async () => {
  await storage.guardarSincronizados([remoto('r1', { actualizado: '2026-11-01T10:00:00.000Z' })]);
  const guardado = await storage.obtenerProducto('r1');
  igual(guardado?.actualizado, '2026-11-01T10:00:00.000Z', 'conserva actualizado');
  igualProfundo(guardado, remoto('r1'));
});

prueba('guardarSincronizados no pisa un producto local más reciente', async () => {
  const local = await storage.crearProducto({ nombre: 'Editado ahora', fechaCaducidad: '2026-11-20' });
  // Una sincronización que empezó antes trae una versión antigua del mismo producto.
  await storage.guardarSincronizados([remoto(local.id, { nombre: 'Versión antigua', actualizado: '2026-11-01T10:00:00.000Z' })]);
  igual((await storage.obtenerProducto(local.id)).nombre, 'Editado ahora');
});

prueba('guardarSincronizados aplica bajas y borra los ids purgados', async () => {
  await storage.guardarSincronizados([remoto('a'), remoto('b'), remoto('viejo', { eliminado: true })]);
  await storage.guardarSincronizados(
    [remoto('a'), remoto('b', { eliminado: true, actualizado: '2026-11-02T10:00:00.000Z' })],
    ['viejo'],
  );
  igualProfundo((await storage.listarProductos()).map((p) => p.id), ['a']);
  igual(await leerDirecto('viejo'), undefined, 'purgado del almacenamiento');
  igual((await leerDirecto('b')).eliminado, true, 'la baja se guarda');
});

prueba('guardarSincronizados no borra un purgado que vuelve a estar vivo', async () => {
  await storage.listarProductos(); // crea la base de datos
  await escribirDirecto(remoto('p', { nombre: 'Vivo', actualizado: '2026-11-12T10:00:00.000Z' }));
  await storage.guardarSincronizados([], ['p']);
  igual((await storage.obtenerProducto('p'))?.nombre, 'Vivo');
});

prueba('Alta avisa', async () => {
  const { avisos, dejar } = escucharCambios();
  try {
    const p = await storage.crearProducto({ ...MINIMO });
    igual(avisos.length, 1, 'alta');
    await storage.actualizarProducto(p.id, { cantidad: 3 });
    igual(avisos.length, 2, 'actualización');
    await storage.eliminarProducto(p.id);
    igual(avisos.length, 3, 'baja');
  } finally {
    dejar();
  }
});

prueba('Escritura fallida', async () => {
  const p = await storage.crearProducto({ ...MINIMO });
  const { avisos, dejar } = escucharCambios();
  try {
    await rechaza(storage.actualizarProducto(p.id, { nombre: '' }), ErrorValidacion);
    await rechaza(storage.crearProducto({ nombre: '' }), ErrorValidacion);
    await storage.eliminarProducto('no-existe');
    igual(avisos.length, 0);
  } finally {
    dejar();
  }
});

prueba('Guardado de la sincronización', async () => {
  const { avisos, dejar } = escucharCambios();
  try {
    await storage.guardarSincronizados([remoto('r1')]);
    igual(avisos.length, 0);
  } finally {
    dejar();
  }
});
