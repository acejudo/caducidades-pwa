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
