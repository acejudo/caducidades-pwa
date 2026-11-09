// Pruebas de la pantalla Listado (src/js/listado.js). Spec: product-list.
// Montan la pantalla con un "hoy" fijo y productos guardados en la base de datos de
// pruebas, y comprueban el DOM.
import { prueba, antesDeCada, igual, igualProfundo, verdadero } from './runner.js';

// Imports tolerantes: si un módulo aún no existe, cada prueba falla por separado (rojo).
const storage = await import('../../src/js/storage.js').catch(() => ({}));
const listado = await import('../../src/js/listado.js').catch((error) => {
  console.error('No se pudo cargar listado.js', error);
  return {};
});

const BD_PRUEBAS = 'caducidades-pruebas';
const HOY_FIJO = new Date(2026, 10, 17, 10, 0); // 17 nov 2026, hora local

// Fecha YYYY-MM-DD a `dias` de `base`.
function dentroDe(dias, base = HOY_FIJO) {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function borrarBaseDeDatos(nombre) {
  return new Promise((resolver, rechazar) => {
    const peticion = indexedDB.deleteDatabase(nombre);
    peticion.onsuccess = () => resolver();
    peticion.onerror = () => rechazar(peticion.error);
    peticion.onblocked = () => rechazar(new Error(`No se pudo borrar ${nombre}: hay una conexión abierta`));
  });
}

// Zona oculta del documento donde se monta la pantalla en cada prueba.
const zona = document.createElement('div');
zona.id = 'zona-pruebas';
zona.hidden = true;
document.body.append(zona);

async function montar(opciones = {}) {
  zona.replaceChildren();
  const pantalla = listado.crearPantallaListado({ hoy: () => HOY_FIJO, ...opciones });
  zona.append(pantalla.elemento);
  await pantalla.cargado;
  return pantalla.elemento;
}

const tarjetas = (raiz) => [...raiz.querySelectorAll('.lista-productos a.tarjeta')];
const texto = (nodo, selector) => nodo.querySelector(selector)?.textContent.trim() ?? null;
const nombres = (raiz) => tarjetas(raiz).map((t) => texto(t, '.tarjeta__nombre'));

antesDeCada(async () => {
  storage.usarBaseDeDatos(BD_PRUEBAS);
  await borrarBaseDeDatos(BD_PRUEBAS);
  listado.reiniciarFiltro();
  zona.replaceChildren();
});

// ---------- Lista y tarjetas ----------

prueba('Orden del listado', async () => {
  await storage.crearProducto({ nombre: 'Queso', fechaCaducidad: dentroDe(10) });
  await storage.crearProducto({ nombre: 'Leche', fechaCaducidad: dentroDe(3) });
  await storage.crearProducto({ nombre: 'Yogur', fechaCaducidad: dentroDe(-1) });
  igualProfundo(nombres(await montar()), ['Yogur', 'Leche', 'Queso']);
});

prueba('Productos eliminados', async () => {
  const borrado = await storage.crearProducto({ nombre: 'Pollo', fechaCaducidad: dentroDe(2) });
  await storage.crearProducto({ nombre: 'Arroz', fechaCaducidad: dentroDe(30) });
  await storage.eliminarProducto(borrado.id);
  igualProfundo(nombres(await montar()), ['Arroz']);
});

prueba('Tarjeta completa', async () => {
  await storage.crearProducto({ nombre: 'Leche entera', fechaCaducidad: '2026-11-20', cantidad: 1, unidad: 'ud' });
  const [tarjeta] = tarjetas(await montar());
  igual(texto(tarjeta, '.tarjeta__nombre'), 'Leche entera');
  igual(texto(tarjeta, '.tarjeta__caducidad'), 'Caduca el 20 nov 2026');
  igual(texto(tarjeta, '.badge'), 'Caduca en 3 días');
  igual(texto(tarjeta, '.tarjeta__cantidad'), 'Cantidad: 1 ud');
});

prueba('cantidad decimal en la tarjeta', async () => {
  await storage.crearProducto({ nombre: 'Harina', fechaCaducidad: dentroDe(40), cantidad: 0.5, unidad: 'kg' });
  igual(texto(tarjetas(await montar())[0], '.tarjeta__cantidad'), 'Cantidad: 0,5 kg');
});

prueba('Producto sin foto', async () => {
  await storage.crearProducto({ nombre: 'Pan', fechaCaducidad: dentroDe(1) });
  const foto = tarjetas(await montar())[0].querySelector('.tarjeta__foto');
  verdadero(foto, 'falta la zona de foto');
  verdadero(foto.querySelector('svg'), 'falta el icono genérico');
  igual(foto.querySelector('img'), null);
});

prueba('Nombre con marcado', async () => {
  await storage.crearProducto({ nombre: '<b>Pan</b>', fechaCaducidad: dentroDe(1) });
  const nombre = tarjetas(await montar())[0].querySelector('.tarjeta__nombre');
  igual(nombre.textContent, '<b>Pan</b>');
  igual(nombre.querySelector('b'), null, 'no se interpreta como HTML');
});

prueba('Colores por nivel', async () => {
  await storage.crearProducto({ nombre: 'A', fechaCaducidad: dentroDe(-1) });
  await storage.crearProducto({ nombre: 'B', fechaCaducidad: dentroDe(2) });
  await storage.crearProducto({ nombre: 'C', fechaCaducidad: dentroDe(5) });
  await storage.crearProducto({ nombre: 'D', fechaCaducidad: dentroDe(12) });
  const lista = tarjetas(await montar());
  const nivel = (t) => [...t.classList].find((c) => c.startsWith('urgencia--'));
  igualProfundo(lista.map(nivel), ['urgencia--rojo', 'urgencia--rojo', 'urgencia--naranja', 'urgencia--verde']);
  igualProfundo(lista.map((t) => texto(t, '.badge')), ['¡Caducado!', 'Caduca en 2 días', 'Caduca en 5 días', 'Caduca en 12 días']);
});

prueba('Abrir el detalle', async () => {
  const p = await storage.crearProducto({ nombre: 'Leche', fechaCaducidad: dentroDe(3) });
  igual(tarjetas(await montar())[0].getAttribute('href'), `#/producto/${p.id}`);
  // El id se codifica en la URL.
  const raro = { ...p, id: 'a b/c' };
  const raiz = await montar({ listar: async () => [raro] });
  igual(tarjetas(raiz)[0].getAttribute('href'), '#/producto/a%20b%2Fc');
});

prueba('Añadir producto', async () => {
  const fab = (await montar()).querySelector('a.fab');
  verdadero(fab, 'falta el botón +');
  igual(fab.getAttribute('href'), '#/producto/nuevo');
  igual(fab.getAttribute('aria-label'), 'Añadir producto');
});

// ---------- Filtros ----------

const pestanas = (raiz) => [...raiz.querySelectorAll('[role="tablist"] [role="tab"]')];
const pestanaActiva = (raiz) => pestanas(raiz).filter((p) => p.getAttribute('aria-selected') === 'true').map((p) => p.textContent.trim());
const pulsar = (raiz, textoPestana) => pestanas(raiz).find((p) => p.textContent.trim() === textoPestana).click();

async function crearConDias(...dias) {
  for (const n of dias) await storage.crearProducto({ nombre: `En ${n}`, fechaCaducidad: dentroDe(n) });
}

prueba('pestañas accesibles con Todas por defecto', async () => {
  await crearConDias(1);
  const raiz = await montar();
  verdadero(raiz.querySelector('[role="tablist"]'), 'falta la lista de pestañas');
  igualProfundo(pestanas(raiz).map((p) => p.textContent.trim()), ['Todas', 'Pronto', 'Caducadas']);
  igualProfundo(pestanaActiva(raiz), ['Todas']);
  verdadero(raiz.querySelector('[role="tabpanel"] .lista-productos'), 'la lista va en el panel');
});

prueba('Filtro Pronto', async () => {
  await crearConDias(-1, 0, 7, 8);
  const raiz = await montar();
  pulsar(raiz, 'Pronto');
  igualProfundo(pestanaActiva(raiz), ['Pronto']);
  igualProfundo(nombres(raiz), ['En 0', 'En 7']);
});

prueba('Filtro Caducadas', async () => {
  await crearConDias(-3, -1, 0, 5);
  const raiz = await montar();
  pulsar(raiz, 'Caducadas');
  igualProfundo(nombres(raiz), ['En -3', 'En -1']);
  pulsar(raiz, 'Todas');
  igualProfundo(nombres(raiz), ['En -3', 'En -1', 'En 0', 'En 5']);
});

prueba('Filtro conservado', async () => {
  await crearConDias(-1, 2, 9);
  pulsar(await montar(), 'Pronto');
  // Volver a Listado = montar la pantalla de nuevo.
  const raiz = await montar();
  igualProfundo(pestanaActiva(raiz), ['Pronto']);
  igualProfundo(nombres(raiz), ['En 2']);
});

prueba('cambiar de filtro no vuelve a leer el almacenamiento', async () => {
  let lecturas = 0;
  const p = await storage.crearProducto({ nombre: 'A', fechaCaducidad: dentroDe(1) });
  const raiz = await montar({ listar: async () => { lecturas += 1; return [p]; } });
  pulsar(raiz, 'Caducadas');
  pulsar(raiz, 'Pronto');
  igual(lecturas, 1);
});

// ---------- Estados vacíos y de error ----------

async function esperarA(condicion, ms = 2000) {
  const limite = Date.now() + ms;
  while (!condicion()) {
    if (Date.now() > limite) throw new Error('la condición no se cumplió a tiempo');
    await new Promise((r) => setTimeout(r, 10));
  }
}

prueba('Sin productos', async () => {
  const raiz = await montar();
  const vacio = raiz.querySelector('.listado__vacio');
  verdadero(vacio, 'falta el estado vacío');
  igual(texto(vacio, '.listado__vacio-titulo'), 'Todavía no hay productos');
  igual(texto(vacio, '.listado__vacio-texto'), 'Pulsa + para añadir el primero');
  verdadero(vacio.querySelector('svg'), 'falta el icono');
  igual(raiz.querySelector('[role="tablist"]').hidden, true, 'las pestañas se ocultan');
  verdadero(raiz.querySelector('a.fab'), 'el botón + sigue visible');
  igual(raiz.querySelector('.lista-productos'), null);
});

prueba('Filtro sin resultados', async () => {
  await storage.crearProducto({ nombre: 'Arroz', fechaCaducidad: dentroDe(40) });
  const raiz = await montar();
  pulsar(raiz, 'Caducadas');
  igual(texto(raiz, '.listado__vacio-titulo'), 'No hay productos caducados');
  igual(raiz.querySelector('[role="tablist"]').hidden, false, 'las pestañas siguen visibles');
  igual(raiz.querySelector('.lista-productos'), null);
  pulsar(raiz, 'Pronto');
  igual(texto(raiz, '.listado__vacio-titulo'), 'No hay productos que caduquen pronto');
  pulsar(raiz, 'Todas');
  igualProfundo(nombres(raiz), ['Arroz']);
  igual(raiz.querySelector('.listado__vacio'), null);
});

prueba('Almacenamiento no disponible', async () => {
  const fallo = async () => { throw new storage.ErrorAlmacenamiento('No se pudo abrir el almacenamiento local'); };
  const raiz = await montar({ listar: fallo });
  const error = raiz.querySelector('.listado__error');
  verdadero(error, 'falta el estado de error');
  igual(texto(error, '.listado__error-titulo'), 'No se pudieron cargar los productos');
  const boton = error.querySelector('button');
  igual(boton?.textContent.trim(), 'Reintentar');
  verdadero(raiz.querySelector('a.fab'), 'el botón + sigue visible');
  igual(raiz.querySelector('[role="tabpanel"]').hasAttribute('aria-busy'), false, 'deja de estar ocupado');
});

prueba('Reintento correcto', async () => {
  const p = await storage.crearProducto({ nombre: 'Leche', fechaCaducidad: dentroDe(3) });
  let intentos = 0;
  const listar = async () => {
    intentos += 1;
    if (intentos === 1) throw new storage.ErrorAlmacenamiento('fallo temporal');
    return [p];
  };
  const raiz = await montar({ listar });
  raiz.querySelector('.listado__error button').click();
  await esperarA(() => raiz.querySelector('.lista-productos'));
  igualProfundo(nombres(raiz), ['Leche']);
  igual(raiz.querySelector('.listado__error'), null);
  igual(raiz.querySelector('[role="tablist"]').hidden, false);
  igual(intentos, 2);
});

// ---------- Días restantes actualizados ----------

function simularVuelta() {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
  try {
    document.dispatchEvent(new Event('visibilitychange'));
  } finally {
    delete document.visibilityState; // vuelve al valor real del prototipo
  }
}

prueba('La app vuelve al día siguiente', async () => {
  const p = await storage.crearProducto({ nombre: 'Leche', fechaCaducidad: dentroDe(1) });
  let fecha = HOY_FIJO;
  let lecturas = 0;
  const raiz = await montar({ hoy: () => fecha, listar: async () => { lecturas += 1; return [p]; } });
  igual(texto(raiz, '.badge'), 'Caduca mañana');
  fecha = new Date(2026, 10, 18, 8, 0); // al día siguiente
  simularVuelta();
  igual(texto(raiz, '.badge'), 'Caduca hoy');
  igual(lecturas, 1, 'no vuelve a leer el almacenamiento');
});

prueba('fuera del documento no pinta y suelta el listener', async () => {
  const p = await storage.crearProducto({ nombre: 'Leche', fechaCaducidad: dentroDe(1) });
  let llamadasHoy = 0;
  const raiz = await montar({ hoy: () => { llamadasHoy += 1; return HOY_FIJO; }, listar: async () => [p] });
  const antes = llamadasHoy;
  zona.replaceChildren(); // se navega a otra pantalla
  simularVuelta();
  igual(llamadasHoy, antes, 'no pinta con la sección fuera del documento');
  zona.append(raiz); // aunque volviera a estar en el documento, el listener ya no existe
  simularVuelta();
  igual(llamadasHoy, antes, 'el listener se ha quitado');
});

prueba('volver a primer plano mientras carga no muestra el estado vacío', async () => {
  let soltar;
  const pendiente = new Promise((r) => { soltar = r; });
  const pantalla = listado.crearPantallaListado({ hoy: () => HOY_FIJO, listar: () => pendiente });
  zona.replaceChildren(pantalla.elemento);
  simularVuelta();
  igual(pantalla.elemento.querySelector('.listado__vacio'), null);
  soltar([]);
  await pantalla.cargado;
  verdadero(pantalla.elemento.querySelector('.listado__vacio'), 'al terminar sí muestra el estado vacío');
});
