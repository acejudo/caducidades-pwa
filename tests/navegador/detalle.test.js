// Pruebas de la pantalla Detalle (src/js/detalle.js). Spec: product-detail.
// Montan el Detalle con el almacenamiento real (base de datos de pruebas), un "hoy" fijo,
// una navegación falsa y una confirmación falsa configurable.
import { prueba, antesDeCada, igual, igualProfundo, verdadero } from './runner.js';

const storage = await import('../../src/js/storage.js').catch(() => ({}));
const fotos = await import('../../src/js/fotos.js').catch(() => ({}));
const detalle = await import('../../src/js/detalle.js').catch((error) => {
  console.error('No se pudo cargar detalle.js', error);
  return {};
});

const BD_PRUEBAS = 'caducidades-pruebas';
const HOY_FIJO = new Date(2026, 10, 17, 10, 0); // 17 nov 2026, hora local

function borrarBaseDeDatos(nombre) {
  return new Promise((resolver, rechazar) => {
    const peticion = indexedDB.deleteDatabase(nombre);
    peticion.onsuccess = () => resolver();
    peticion.onerror = () => rechazar(peticion.error);
    peticion.onblocked = () => rechazar(new Error(`No se pudo borrar ${nombre}: hay una conexión abierta`));
  });
}

const zona = document.createElement('div');
zona.id = 'zona-detalle';
zona.style.cssText = 'position:absolute; left:-10000px; top:0; width:390px;';
document.body.append(zona);
zona.addEventListener('click', (evento) => {
  if (evento.target.closest('a')) evento.preventDefault();
});

let navegaciones;
let confirmaciones;
let respuestaConfirmar;

async function montar(id, opciones = {}) {
  zona.replaceChildren();
  const pantalla = detalle.crearPantallaDetalle({
    id,
    hoy: () => HOY_FIJO,
    navegacion: { reemplazar: (path) => navegaciones.push(['reemplazar', path]) },
    confirmar: async (datos) => { confirmaciones.push(datos); return respuestaConfirmar; },
    ...opciones,
  });
  zona.append(pantalla.elemento);
  await pantalla.cargado;
  return pantalla.elemento;
}

const textoDe = (raiz) => raiz.textContent.replace(/\s+/g, ' ').trim();
const texto = (raiz, selector) => raiz.querySelector(selector)?.textContent.replace(/\s+/g, ' ').trim() ?? null;
const boton = (raiz, contenido) => [...raiz.querySelectorAll('button')].find((b) => b.textContent.trim() === contenido) ?? null;
async function esperarA(condicion, ms = 2000) {
  const limite = Date.now() + ms;
  while (!condicion()) {
    if (Date.now() > limite) throw new Error('la condición no se cumplió a tiempo');
    await new Promise((r) => setTimeout(r, 10));
  }
}
const esperarUnPoco = () => new Promise((r) => setTimeout(r, 50));

const LECHE = Object.freeze({
  nombre: 'Leche entera',
  fechaCaducidad: '2026-11-20',
  fechaCompra: '2026-11-10',
  cantidad: 1,
  unidad: 'ud',
  categoria: 'Nevera',
  notas: 'Abrir y agitar',
  foto: { tipo: 'predeterminada', valor: 'leche' },
});

antesDeCada(async () => {
  storage.usarBaseDeDatos(BD_PRUEBAS);
  await borrarBaseDeDatos(BD_PRUEBAS);
  navegaciones = [];
  confirmaciones = [];
  respuestaConfirmar = true;
  zona.replaceChildren();
});

// ---------- Datos ----------

prueba('Detalle completo', async () => {
  const p = await storage.crearProducto({ ...LECHE });
  const raiz = await montar(p.id);
  igual(texto(raiz, '.detalle__nombre'), 'Leche entera');
  verdadero(texto(raiz, '.detalle__caducidad').includes('Caduca el 20 nov 2026'), 'falta la fecha de caducidad');
  igual(texto(raiz, '.detalle__caducidad .badge'), 'Caduca en 3 días');
  verdadero(raiz.querySelector('.detalle__caducidad').closest('.urgencia--naranja'), 'falta el color naranja');
  const todo = textoDe(raiz);
  for (const esperado of ['Comprado el 10 nov 2026', '1 ud', 'Nevera', 'Abrir y agitar']) {
    verdadero(todo.includes(esperado), `falta "${esperado}"`);
  }
  // Orden: foto, nombre, caducidad, datos, notas.
  const orden = ['.detalle__foto', '.detalle__nombre', '.detalle__caducidad', '.detalle__datos', '.detalle__notas']
    .map((s) => raiz.querySelector(s));
  verdadero(orden.every(Boolean), 'faltan secciones');
  for (let i = 1; i < orden.length; i += 1) {
    verdadero(orden[i - 1].compareDocumentPosition(orden[i]) & Node.DOCUMENT_POSITION_FOLLOWING, `orden ${i}`);
  }
});

prueba('Sin fecha de compra ni notas', async () => {
  const p = await storage.crearProducto({ ...LECHE, fechaCompra: null, notas: null });
  const raiz = await montar(p.id);
  verdadero(!textoDe(raiz).includes('Comprado'), 'sobra la fecha de compra');
  igual(raiz.querySelector('.detalle__notas'), null, 'sobra la sección de notas');
  const textoSuelto = [...raiz.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent);
  igualProfundo(textoSuelto, [], 'sin texto suelto ("null")');
  verdadero(!/\b(null|false|undefined)\b/.test(textoDe(raiz)), textoDe(raiz));
});

prueba('Producto caducado', async () => {
  const p = await storage.crearProducto({ ...LECHE, fechaCaducidad: '2026-11-16' });
  const raiz = await montar(p.id);
  igual(texto(raiz, '.detalle__caducidad .badge'), '¡Caducado!');
  verdadero(raiz.querySelector('.detalle__caducidad').closest('.urgencia--rojo'), 'falta el color rojo');
});

prueba('Textos con marcado', async () => {
  const p = await storage.crearProducto({ ...LECHE, nombre: '<b>Pan</b>', notas: '<i>tostar</i>' });
  const raiz = await montar(p.id);
  igual(texto(raiz, '.detalle__nombre'), '<b>Pan</b>');
  verdadero(textoDe(raiz).includes('<i>tostar</i>'), 'las notas se muestran literalmente');
  igual(raiz.querySelector('b, i'), null, 'no se interpreta HTML');
});

prueba('foto del detalle: imagen del catálogo o icono genérico', async () => {
  const conFoto = await storage.crearProducto({ ...LECHE });
  let raiz = await montar(conFoto.id);
  igual(raiz.querySelector('.detalle__foto img')?.getAttribute('src'), fotos.urlFoto?.('leche'));
  const desconocida = await storage.crearProducto({ ...LECHE, foto: { tipo: 'predeterminada', valor: 'kiwi' } });
  raiz = await montar(desconocida.id);
  igual(raiz.querySelector('.detalle__foto img'), null, 'sin imagen con un id desconocido');
  verdadero(raiz.querySelector('.detalle__foto svg'), 'icono genérico');
});

// ---------- Editar y eliminar ----------

prueba('Abrir la edición', async () => {
  const p = await storage.crearProducto({ ...LECHE });
  const raiz = await montar(p.id);
  const editar = [...raiz.querySelectorAll('a')].find((a) => a.textContent.trim() === 'Editar');
  igual(editar?.getAttribute('href'), `#/producto/${encodeURIComponent(p.id)}/editar`);
});

prueba('Eliminar confirmado', async () => {
  const p = await storage.crearProducto({ ...LECHE, nombre: 'Leche' });
  const raiz = await montar(p.id);
  respuestaConfirmar = true;
  boton(raiz, 'Eliminar').click();
  await esperarA(() => navegaciones.length > 0);
  igualProfundo(navegaciones, [['reemplazar', '/listado']]);
  igual(await storage.obtenerProducto(p.id), null, 'eliminado del almacenamiento');
  igual(confirmaciones[0].titulo, '¿Eliminar «Leche»?');
  igual(confirmaciones[0].aceptar, 'Eliminar');
  igual(confirmaciones[0].peligro, true);
});

prueba('Eliminar cancelado', async () => {
  const p = await storage.crearProducto({ ...LECHE });
  const raiz = await montar(p.id);
  respuestaConfirmar = false;
  boton(raiz, 'Eliminar').click();
  await esperarA(() => confirmaciones.length > 0);
  await esperarUnPoco();
  igual(navegaciones.length, 0);
  igualProfundo(await storage.obtenerProducto(p.id), p, 'el producto no cambia');
  igual(texto(raiz, '.detalle__nombre'), 'Leche entera', 'sigue en el Detalle');
});

prueba('Fallo al eliminar', async () => {
  const p = await storage.crearProducto({ ...LECHE });
  const fallo = async () => { throw new storage.ErrorAlmacenamiento('sin espacio'); };
  const raiz = await montar(p.id, { almacen: { obtenerProducto: storage.obtenerProducto, eliminarProducto: fallo } });
  boton(raiz, 'Eliminar').click();
  const aviso = () => raiz.querySelector('[role="alert"]');
  await esperarA(() => aviso() && !aviso().hidden && aviso().textContent);
  igual(aviso().textContent, 'No se pudo eliminar el producto. Inténtalo de nuevo.');
  igual(navegaciones.length, 0);
  igual(texto(raiz, '.detalle__nombre'), 'Leche entera');
});

// ---------- Inexistente y error ----------

prueba('Id desconocido', async () => {
  const raiz = await montar('no-existe');
  verdadero(textoDe(raiz).includes('Este producto no existe o se ha eliminado'), 'falta el aviso');
  igual(raiz.querySelector('a[href="#/listado"]')?.textContent.trim(), 'Volver al listado');
  igual(boton(raiz, 'Eliminar'), null);
  igual(raiz.querySelector('.detalle__nombre'), null);
});

prueba('Volver a un producto eliminado', async () => {
  const p = await storage.crearProducto({ ...LECHE });
  await storage.eliminarProducto(p.id);
  const raiz = await montar(p.id);
  verdadero(textoDe(raiz).includes('Este producto no existe o se ha eliminado'));
});

prueba('Reintento correcto', async () => {
  const p = await storage.crearProducto({ ...LECHE });
  let intentos = 0;
  const obtenerProducto = async (id) => {
    intentos += 1;
    if (intentos === 1) throw new storage.ErrorAlmacenamiento('fallo temporal');
    return storage.obtenerProducto(id);
  };
  const raiz = await montar(p.id, { almacen: { obtenerProducto, eliminarProducto: storage.eliminarProducto } });
  verdadero(textoDe(raiz).includes('No se pudo cargar el producto'), 'falta el error');
  boton(raiz, 'Reintentar').click();
  await esperarA(() => raiz.querySelector('.detalle__nombre'));
  igual(texto(raiz, '.detalle__nombre'), 'Leche entera');
});

// ---------- Fotos reales (fotos-reales) ----------

const FOTO_REAL = '3f2b8c1e-9a4d-4e6f-8b2a-1c5d7e9f0a3b.webp';

async function imagenReal() {
  const lienzo = document.createElement('canvas');
  lienzo.width = 8;
  lienzo.height = 8;
  lienzo.getContext('2d').fillRect(0, 0, 8, 8);
  return new Promise((resolver) => lienzo.toBlob(resolver, 'image/webp'));
}

async function esperarHasta(condicion, ms = 2000) {
  const limite = Date.now() + ms;
  while (!condicion()) {
    if (Date.now() > limite) throw new Error('la condición no se cumplió a tiempo');
    await new Promise((r) => setTimeout(r, 10));
  }
}

async function sinErroresEnConsola(fn) {
  const errores = [];
  const original = console.error;
  console.error = (...args) => errores.push(args);
  try {
    await fn();
  } finally {
    console.error = original;
  }
  igual(errores.length, 0, 'hubo errores en la consola');
}

prueba('Foto real en el dispositivo', async () => {
  await storage.guardarFoto(FOTO_REAL, await imagenReal(), { subida: true });
  const p = await storage.crearProducto({ ...LECHE, foto: { tipo: 'real', valor: FOTO_REAL } });
  const raiz = await montar(p.id);
  const foto = raiz.querySelector('.detalle__foto');
  await esperarHasta(() => foto.querySelector('img')?.getAttribute('src')?.startsWith('blob:'));
  igual(foto.querySelector('img').getAttribute('alt'), '');
  igual(foto.querySelector('svg'), null, 'sin icono genérico');
});

prueba('Foto real todavía no disponible', async () => {
  await sinErroresEnConsola(async () => {
    const p = await storage.crearProducto({ ...LECHE, foto: { tipo: 'real', valor: FOTO_REAL } });
    const raiz = await montar(p.id);
    await new Promise((r) => setTimeout(r, 50));
    const foto = raiz.querySelector('.detalle__foto');
    igual(foto.querySelector('img'), null, 'sin imagen');
    verdadero(foto.querySelector('svg'), 'icono genérico');
  });
});

prueba('Detalle con foto real y almacén parcial', async () => {
  // Las pruebas que sustituyen solo algunas operaciones siguen teniendo obtenerFoto.
  await storage.guardarFoto(FOTO_REAL, await imagenReal(), { subida: true });
  const p = await storage.crearProducto({ ...LECHE, foto: { tipo: 'real', valor: FOTO_REAL } });
  const raiz = await montar(p.id, { almacen: { obtenerProducto: storage.obtenerProducto } });
  const foto = raiz.querySelector('.detalle__foto');
  await esperarHasta(() => foto.querySelector('img')?.getAttribute('src')?.startsWith('blob:'));
});

// ---------- Foto 4:3, visor y avisos (pulido-final) ----------

const visorAbierto = () => document.querySelector('dialog.visor-foto');

function cerrarVisores() {
  for (const dialogo of document.querySelectorAll('dialog.visor-foto')) {
    if (dialogo.open) dialogo.close();
    dialogo.remove();
  }
}

async function montarConFotoReal() {
  await storage.guardarFoto(FOTO_REAL, await imagenReal(), { subida: true });
  const p = await storage.crearProducto({ ...LECHE, foto: { tipo: 'real', valor: FOTO_REAL } });
  const raiz = await montar(p.id);
  const contenedor = raiz.querySelector('.detalle__foto');
  await esperarHasta(() => contenedor.querySelector('img.foto-real'));
  return { raiz, contenedor };
}

prueba('Foto vertical', async () => {
  const { contenedor } = await montarConFotoReal();
  await esperarHasta(() => contenedor.classList.contains('detalle__foto--real'));
});

prueba('una foto predeterminada no usa el recuadro 4:3', async () => {
  const p = await storage.crearProducto({ ...LECHE });
  const raiz = await montar(p.id);
  await new Promise((r) => setTimeout(r, 30));
  igual(raiz.querySelector('.detalle__foto').classList.contains('detalle__foto--real'), false);
});

prueba('Abrir y cerrar la foto', async () => {
  try {
    const { contenedor } = await montarConFotoReal();
    igual(contenedor.tagName, 'BUTTON');
    igual(contenedor.getAttribute('aria-label'), 'Ver la foto a pantalla completa');
    contenedor.click();
    await esperarHasta(() => visorAbierto()?.open);
    const visor = visorAbierto();
    verdadero(visor.querySelector('img')?.src.startsWith('blob:'), 'el visor muestra la foto');
    // Botón ✕ en la esquina: icono, sin texto visible, y nombre accesible "Cerrar".
    const cerrar = visor.querySelector('button[aria-label="Cerrar"]');
    verdadero(cerrar, 'falta el botón "Cerrar"');
    verdadero(cerrar.querySelector('svg'), 'el botón lleva el icono ✕');
    igual(cerrar.textContent.trim(), '', 'sin texto visible');
    cerrar.click();
    await esperarHasta(() => !visorAbierto());
  } finally {
    cerrarVisores();
  }
});

prueba('el visor se cierra con Escape y tocando fuera de la foto', async () => {
  try {
    const { contenedor } = await montarConFotoReal();
    contenedor.click();
    await esperarHasta(() => visorAbierto()?.open);
    visorAbierto().dispatchEvent(new Event('cancel', { cancelable: true }));
    visorAbierto()?.close(); // Escape: el navegador cancela y cierra el diálogo
    await esperarHasta(() => !visorAbierto());

    contenedor.click();
    await esperarHasta(() => visorAbierto()?.open);
    visorAbierto().dispatchEvent(new MouseEvent('click', { bubbles: true })); // en el fondo, fuera de la imagen
    await esperarHasta(() => !visorAbierto());
  } finally {
    cerrarVisores();
  }
});

prueba('Foto predeterminada: sin visor', async () => {
  try {
    const p = await storage.crearProducto({ ...LECHE });
    const raiz = await montar(p.id);
    const contenedor = raiz.querySelector('.detalle__foto');
    igual(contenedor.tagName, 'DIV', 'no es un botón');
    contenedor.click();
    await new Promise((r) => setTimeout(r, 30));
    igual(visorAbierto(), null);
  } finally {
    cerrarVisores();
  }
});

prueba('Eliminar desde el Detalle', async () => {
  const avisos = [];
  const p = await storage.crearProducto({ ...LECHE });
  const raiz = await montar(p.id, { avisar: (texto) => avisos.push(texto) });
  respuestaConfirmar = true;
  boton(raiz, 'Eliminar').click();
  await esperarA(() => navegaciones.length > 0);
  igualProfundo(avisos, ['Producto eliminado']);
});

prueba('Lectura lenta en el Detalle', async () => {
  let terminar;
  const pendiente = new Promise((r) => { terminar = r; });
  zona.replaceChildren();
  const pantalla = detalle.crearPantallaDetalle({ id: 'lento', almacen: { obtenerProducto: () => pendiente }, retrasoCarga: 10 });
  zona.append(pantalla.elemento);
  await new Promise((r) => setTimeout(r, 40));
  verdadero(pantalla.elemento.textContent.includes('Cargando…'), 'falta "Cargando…"');
  terminar(null);
  await pantalla.cargado;
  verdadero(!pantalla.elemento.textContent.includes('Cargando…'), 'se quita al terminar');
});
