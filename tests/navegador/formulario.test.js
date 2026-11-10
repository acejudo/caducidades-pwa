// Pruebas de las pantallas Nuevo/Editar producto (src/js/formulario.js). Spec: product-form.
// Montan el formulario con el almacenamiento real (base de datos de pruebas), una
// navegación falsa que registra las llamadas y una confirmación falsa configurable.
import { prueba, antesDeCada, igual, igualProfundo, verdadero } from './runner.js';

const storage = await import('../../src/js/storage.js').catch(() => ({}));
const formulario = await import('../../src/js/formulario.js').catch((error) => {
  console.error('No se pudo cargar formulario.js', error);
  return {};
});

const BD_PRUEBAS = 'caducidades-pruebas';
const CAMPOS = ['nombre', 'fechaCompra', 'fechaCaducidad', 'cantidad', 'categoria', 'notas'];

function borrarBaseDeDatos(nombre) {
  return new Promise((resolver, rechazar) => {
    const peticion = indexedDB.deleteDatabase(nombre);
    peticion.onsuccess = () => resolver();
    peticion.onerror = () => rechazar(peticion.error);
    peticion.onblocked = () => rechazar(new Error(`No se pudo borrar ${nombre}: hay una conexión abierta`));
  });
}

const zona = document.createElement('div');
zona.id = 'zona-formulario';
// Fuera de la pantalla pero no oculta: un elemento oculto no puede recibir el foco.
zona.style.cssText = 'position:absolute; left:-10000px; top:0; width:390px;';
document.body.append(zona);

// Red de seguridad: un envío no interceptado recargaría la página de pruebas. Se anota
// si el propio formulario lo evitó (en la app real, si no, recargaría la página).
let enviosSinInterceptar = 0;
zona.addEventListener('submit', (evento) => {
  if (!evento.defaultPrevented) enviosSinInterceptar += 1;
  evento.preventDefault();
});

// Los enlaces (zona de foto) no deben cambiar la URL de la página de pruebas; el
// formulario ya ha reaccionado al clic cuando el evento llega aquí.
zona.addEventListener('click', (evento) => {
  if (evento.target.closest('a')) evento.preventDefault();
});

// Estado de cada montaje: llamadas de navegación y respuestas de la confirmación falsa.
let navegaciones;
let confirmaciones;
let respuestaConfirmar;

async function montar(opciones = {}) {
  zona.replaceChildren();
  const pantalla = formulario.crearPantallaFormulario({
    navegacion: {
      volver: () => navegaciones.push(['volver']),
      reemplazar: (path) => navegaciones.push(['reemplazar', path]),
    },
    confirmar: async (datos) => { confirmaciones.push(datos); return respuestaConfirmar; },
    ...opciones,
  });
  zona.append(pantalla.elemento);
  await pantalla.cargado;
  return pantalla.elemento;
}

const control = (raiz, nombre) => raiz.querySelector(`[name="${nombre}"]`);
const boton = (raiz, texto) => [...raiz.querySelectorAll('button')].find((b) => b.textContent.trim() === texto) ?? null;
function escribir(raiz, nombre, valor) {
  const c = control(raiz, nombre);
  c.value = valor;
  c.dispatchEvent(new Event('input', { bubbles: true }));
  c.dispatchEvent(new Event('change', { bubbles: true }));
}
async function esperarA(condicion, ms = 2000) {
  const limite = Date.now() + ms;
  while (!condicion()) {
    if (Date.now() > limite) throw new Error('la condición no se cumplió a tiempo');
    await new Promise((r) => setTimeout(r, 10));
  }
}
function dentroDe(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const COMPLETO = Object.freeze({
  nombre: 'Salmón ahumado',
  fechaCompra: '2026-11-08',
  fechaCaducidad: '2026-11-30',
  cantidad: 2,
  unidad: 'pack',
  categoria: 'Congelador',
  foto: { tipo: 'predeterminada', valor: 'salmon' },
  notas: 'Para el viernes',
});

antesDeCada(async () => {
  storage.usarBaseDeDatos(BD_PRUEBAS);
  await borrarBaseDeDatos(BD_PRUEBAS);
  formulario.descartarBorradores?.();
  navegaciones = [];
  confirmaciones = [];
  respuestaConfirmar = true;
  enviosSinInterceptar = 0;
  zona.replaceChildren();
});

// ---------- Campos y valores iniciales ----------

prueba('Formulario de alta vacío', async () => {
  const raiz = await montar();
  const campos = [...raiz.querySelectorAll('.campo')].map((c) => c.dataset.campo);
  igualProfundo(campos, CAMPOS, 'orden de los campos');
  const foto = raiz.querySelector('a.zona-foto');
  verdadero(foto, 'falta la zona de foto');
  igual(foto.getAttribute('href'), '#/elegir-foto');
  verdadero(foto.compareDocumentPosition(raiz.querySelector('.campo')) & Node.DOCUMENT_POSITION_FOLLOWING, 'la foto va primero');
  igualProfundo(
    ['nombre', 'fechaCompra', 'fechaCaducidad', 'notas', 'cantidad', 'unidad', 'categoria'].map((n) => control(raiz, n).value),
    ['', '', '', '', '1', 'ud', 'Nevera'],
  );
  igualProfundo([...control(raiz, 'unidad').options].map((o) => o.value), ['ud', 'pack', 'kg', 'g', 'l', 'ml']);
  igualProfundo([...control(raiz, 'categoria').options].map((o) => o.value), ['Nevera', 'Congelador', 'Despensa', 'Otros']);
  igual(control(raiz, 'fechaCaducidad').type, 'date');
  igual(control(raiz, 'cantidad').getAttribute('inputmode'), 'decimal');
  // Obligatorios con * y opcionales con "(opcional)".
  const marca = (campo, selector) => raiz.querySelector(`.campo[data-campo="${campo}"] ${selector}`);
  verdadero(marca('nombre', '.campo__obligatorio') && marca('fechaCaducidad', '.campo__obligatorio'), 'faltan los *');
  igual(marca('fechaCompra', '.campo__opcional')?.textContent.trim(), '(opcional)');
  igual(marca('notas', '.campo__opcional')?.textContent.trim(), '(opcional)');
  verdadero(boton(raiz, 'Guardar') && boton(raiz, 'Cancelar'), 'faltan Guardar y Cancelar');
  igual(boton(raiz, 'Eliminar'), null, 'sin Eliminar en el alta');
  // Cada control tiene etiqueta accesible.
  for (const n of [...CAMPOS, 'unidad']) {
    const c = control(raiz, n);
    verdadero(c.labels?.length > 0 || c.getAttribute('aria-label'), `${n} sin etiqueta`);
  }
});

prueba('Formulario de edición relleno', async () => {
  const p = await storage.crearProducto({ ...COMPLETO });
  const raiz = await montar({ id: p.id });
  igualProfundo(
    ['nombre', 'fechaCompra', 'fechaCaducidad', 'cantidad', 'unidad', 'categoria', 'notas'].map((n) => control(raiz, n).value),
    ['Salmón ahumado', '2026-11-08', '2026-11-30', '2', 'pack', 'Congelador', 'Para el viernes'],
  );
  verdadero(boton(raiz, 'Guardar') && boton(raiz, 'Cancelar') && boton(raiz, 'Eliminar'), 'faltan botones');
});

prueba('Unidad fuera de la lista', async () => {
  const p = await storage.crearProducto({ ...COMPLETO, unidad: 'bote' });
  const raiz = await montar({ id: p.id });
  igual(control(raiz, 'unidad').value, 'bote');
  verdadero([...control(raiz, 'unidad').options].some((o) => o.value === 'bote'), 'falta la opción');
});

// ---------- Botones de cantidad ----------

const restar = (raiz) => raiz.querySelector('[data-accion="restar"]');
const sumar = (raiz) => raiz.querySelector('[data-accion="sumar"]');

prueba('Sumar y restar', async () => {
  const raiz = await montar();
  sumar(raiz).click();
  sumar(raiz).click();
  restar(raiz).click();
  igual(control(raiz, 'cantidad').value, '2');
});

prueba('Mínimo', async () => {
  const raiz = await montar();
  igual(restar(raiz).disabled, true, 'con 1');
  sumar(raiz).click();
  igual(restar(raiz).disabled, false, 'con 2');
  restar(raiz).click();
  igual(restar(raiz).disabled, true, 'de vuelta a 1');
  escribir(raiz, 'cantidad', '0,5');
  igual(restar(raiz).disabled, true, 'con 0,5');
  sumar(raiz).click();
  igual(control(raiz, 'cantidad').value, '1,5', 'suma conservando la coma');
  igual(restar(raiz).disabled, false, 'con 1,5');
});

prueba('botones de cantidad accesibles', async () => {
  const raiz = await montar();
  igual(restar(raiz).getAttribute('aria-label'), 'Restar uno');
  igual(sumar(raiz).getAttribute('aria-label'), 'Sumar uno');
  igual(restar(raiz).type, 'button');
  igual(sumar(raiz).type, 'button');
});

// ---------- Guardar y validación ----------

const guardar = (raiz) => boton(raiz, 'Guardar') ?? raiz.querySelector('button[type="submit"]');
const errorDe = (raiz, campo) => raiz.querySelector(`#error-${campo}`);
const visible = (nodo) => nodo && !nodo.hidden;

prueba('Alta correcta', async () => {
  const raiz = await montar();
  escribir(raiz, 'nombre', 'Yogur');
  escribir(raiz, 'fechaCaducidad', dentroDe(5));
  guardar(raiz).click();
  await esperarA(() => navegaciones.length > 0);
  igualProfundo(navegaciones, [['volver']]);
  igual(enviosSinInterceptar, 0, 'el formulario no recarga la página');
  const lista = await storage.listarProductos();
  igualProfundo(lista.map((p) => [p.nombre, p.fechaCaducidad, p.cantidad, p.unidad, p.categoria]), [['Yogur', dentroDe(5), 1, 'ud', 'Nevera']]);
});

prueba('Edición correcta', async () => {
  const p = await storage.crearProducto({ ...COMPLETO });
  const raiz = await montar({ id: p.id });
  escribir(raiz, 'cantidad', '3');
  guardar(raiz).click();
  await esperarA(() => navegaciones.length > 0);
  igualProfundo(navegaciones, [['reemplazar', '/listado']]);
  const guardado = await storage.obtenerProducto(p.id);
  igual(guardado.cantidad, 3);
  igual(guardado.id, p.id);
  igualProfundo(guardado.foto, { tipo: 'predeterminada', valor: 'salmon' }, 'la foto no cambia');
  igual((await storage.listarProductos()).length, 1);
});

prueba('Cantidad decimal escrita', async () => {
  const raiz = await montar();
  escribir(raiz, 'nombre', 'Harina');
  escribir(raiz, 'fechaCaducidad', dentroDe(60));
  escribir(raiz, 'cantidad', '0,5');
  escribir(raiz, 'unidad', 'kg');
  guardar(raiz).click();
  await esperarA(() => navegaciones.length > 0);
  const [p] = await storage.listarProductos();
  igual(p.cantidad, 0.5);
  igual(p.unidad, 'kg');
});

prueba('Unidad fuera de la lista: se conserva al guardar', async () => {
  const p = await storage.crearProducto({ ...COMPLETO, unidad: 'bote' });
  const raiz = await montar({ id: p.id });
  escribir(raiz, 'notas', 'abierto');
  guardar(raiz).click();
  await esperarA(() => navegaciones.length > 0);
  igual((await storage.obtenerProducto(p.id)).unidad, 'bote');
});

prueba('Doble pulsación', async () => {
  const raiz = await montar();
  escribir(raiz, 'nombre', 'Pan');
  escribir(raiz, 'fechaCaducidad', dentroDe(2));
  guardar(raiz).click();
  igual(guardar(raiz).disabled, true, 'desactivado mientras guarda');
  igual(guardar(raiz).textContent.trim(), 'Guardando…');
  guardar(raiz).click();
  await esperarA(() => navegaciones.length > 0);
  await new Promise((r) => setTimeout(r, 100));
  igual((await storage.listarProductos()).length, 1);
  igual(navegaciones.length, 1);
});

prueba('Guardar sin obligatorios', async () => {
  const raiz = await montar();
  guardar(raiz).click();
  await esperarA(() => visible(errorDe(raiz, 'nombre')));
  igual(errorDe(raiz, 'nombre').textContent, 'El nombre es obligatorio');
  igual(errorDe(raiz, 'fechaCaducidad').textContent, 'La fecha de caducidad es obligatoria');
  for (const campo of ['nombre', 'fechaCaducidad']) {
    igual(control(raiz, campo).getAttribute('aria-invalid'), 'true', campo);
    igual(control(raiz, campo).getAttribute('aria-describedby'), `error-${campo}`, campo);
  }
  const enfocado = document.activeElement;
  igual(`${enfocado?.tagName}[${enfocado?.name ?? enfocado?.className}]`, 'INPUT[nombre]', 'el foco va a Nombre');
  igual(visible(errorDe(raiz, 'fechaCompra')), false);
  igual((await storage.listarProductos()).length, 0, 'no se guarda nada');
  igual(navegaciones.length, 0, 'no se navega');
  igual(guardar(raiz).disabled, false);
});

prueba('Corregir un campo', async () => {
  const raiz = await montar();
  guardar(raiz).click();
  await esperarA(() => visible(errorDe(raiz, 'nombre')));
  escribir(raiz, 'nombre', 'Leche');
  igual(visible(errorDe(raiz, 'nombre')), false, 'desaparece el del nombre');
  igual(control(raiz, 'nombre').hasAttribute('aria-invalid'), false);
  igual(visible(errorDe(raiz, 'fechaCaducidad')), true, 'sigue el de la fecha');
});

prueba('Fallo al guardar', async () => {
  const fallo = async () => { throw new storage.ErrorAlmacenamiento('sin espacio'); };
  const raiz = await montar({ almacen: { crearProducto: fallo } });
  escribir(raiz, 'nombre', 'Queso');
  escribir(raiz, 'fechaCaducidad', dentroDe(9));
  guardar(raiz).click();
  const aviso = () => raiz.querySelector('.formulario__aviso');
  await esperarA(() => visible(aviso()));
  igual(aviso().textContent, 'No se pudo guardar el producto. Inténtalo de nuevo.');
  igual(control(raiz, 'nombre').value, 'Queso', 'lo escrito sigue');
  igual(guardar(raiz).disabled, false);
  igual(guardar(raiz).textContent.trim(), 'Guardar');
  igual(navegaciones.length, 0);
});

// ---------- Cancelar y eliminar ----------

const esperarUnPoco = () => new Promise((r) => setTimeout(r, 50));

prueba('Cancelar sin cambios', async () => {
  const raiz = await montar();
  boton(raiz, 'Cancelar').click();
  await esperarA(() => navegaciones.length > 0);
  igual(confirmaciones.length, 0, 'no pregunta');
  igualProfundo(navegaciones, [['volver']]);
});

prueba('Cancelar sin cambios en la edición', async () => {
  const p = await storage.crearProducto({ ...COMPLETO });
  const raiz = await montar({ id: p.id });
  boton(raiz, 'Cancelar').click();
  await esperarA(() => navegaciones.length > 0);
  igual(confirmaciones.length, 0, 'abrir y salir no cuenta como cambio');
});

prueba('Cancelar con cambios y seguir editando', async () => {
  const raiz = await montar();
  escribir(raiz, 'nombre', 'Huevos');
  respuestaConfirmar = false;
  boton(raiz, 'Cancelar').click();
  await esperarA(() => confirmaciones.length > 0);
  await esperarUnPoco();
  igual(confirmaciones[0].titulo, '¿Descartar los cambios?');
  igual(confirmaciones[0].aceptar, 'Descartar');
  igual(confirmaciones[0].cancelar, 'Seguir editando');
  igual(navegaciones.length, 0, 'sigue en el formulario');
  igual(control(raiz, 'nombre').value, 'Huevos');
});

prueba('Cancelar con cambios y descartar', async () => {
  const raiz = await montar();
  escribir(raiz, 'nombre', 'Huevos');
  respuestaConfirmar = true;
  boton(raiz, 'Cancelar').click();
  await esperarA(() => navegaciones.length > 0);
  igualProfundo(navegaciones, [['volver']]);
  igual((await storage.listarProductos()).length, 0, 'no se guarda nada');
});

prueba('Eliminar confirmado', async () => {
  const p = await storage.crearProducto({ ...COMPLETO, nombre: 'Leche' });
  const raiz = await montar({ id: p.id });
  respuestaConfirmar = true;
  boton(raiz, 'Eliminar').click();
  await esperarA(() => navegaciones.length > 0);
  igualProfundo(navegaciones, [['reemplazar', '/listado']]);
  igual(await storage.obtenerProducto(p.id), null, 'eliminado del almacenamiento');
  igual(confirmaciones[0].titulo, '¿Eliminar «Leche»?', 'la confirmación nombra el producto');
  igual(confirmaciones[0].aceptar, 'Eliminar');
  igual(confirmaciones[0].peligro, true);
});

prueba('Eliminar cancelado', async () => {
  const p = await storage.crearProducto({ ...COMPLETO, nombre: 'Leche' });
  const raiz = await montar({ id: p.id });
  respuestaConfirmar = false;
  boton(raiz, 'Eliminar').click();
  await esperarA(() => confirmaciones.length > 0);
  await esperarUnPoco();
  igual(navegaciones.length, 0);
  igualProfundo(await storage.obtenerProducto(p.id), p, 'el producto no cambia');
});

// ---------- Producto inexistente y borrador ----------

const textoPantalla = (raiz) => raiz.textContent.replace(/\s+/g, ' ').trim();

prueba('Editar un id desconocido', async () => {
  const raiz = await montar({ id: 'no-existe' });
  verdadero(textoPantalla(raiz).includes('Este producto no existe o se ha eliminado'), 'falta el aviso');
  const enlace = raiz.querySelector('a[href="#/listado"]');
  igual(enlace?.textContent.trim(), 'Volver al listado');
  igual(raiz.querySelector('form'), null, 'sin formulario');
});

prueba('Editar un producto eliminado', async () => {
  const p = await storage.crearProducto({ ...COMPLETO });
  await storage.eliminarProducto(p.id);
  const raiz = await montar({ id: p.id });
  verdadero(textoPantalla(raiz).includes('Este producto no existe o se ha eliminado'));
  igual(raiz.querySelector('form'), null);
});

prueba('error al cargar el producto con Reintentar', async () => {
  const p = await storage.crearProducto({ ...COMPLETO });
  let intentos = 0;
  const obtenerProducto = async (id) => {
    intentos += 1;
    if (intentos === 1) throw new storage.ErrorAlmacenamiento('fallo temporal');
    return storage.obtenerProducto(id);
  };
  const raiz = await montar({ id: p.id, almacen: { obtenerProducto } });
  verdadero(textoPantalla(raiz).includes('No se pudo cargar el producto'), 'falta el error');
  boton(raiz, 'Reintentar').click();
  await esperarA(() => raiz.querySelector('form'));
  igual(control(raiz, 'nombre').value, 'Salmón ahumado');
});

prueba('Ir a Elegir foto y volver', async () => {
  let raiz = await montar();
  escribir(raiz, 'nombre', 'Pollo');
  escribir(raiz, 'cantidad', '3');
  raiz.querySelector('a.zona-foto').click();
  raiz = await montar(); // volver al formulario
  igual(control(raiz, 'nombre').value, 'Pollo');
  igual(control(raiz, 'cantidad').value, '3');
  boton(raiz, 'Cancelar').click();
  await esperarA(() => confirmaciones.length > 0);
  igual(confirmaciones[0].titulo, '¿Descartar los cambios?', 'el borrador cuenta como cambios');
});

prueba('Ir a Elegir foto y volver en la edición', async () => {
  const p = await storage.crearProducto({ ...COMPLETO });
  let raiz = await montar({ id: p.id });
  escribir(raiz, 'notas', 'abierto el lunes');
  raiz.querySelector('a.zona-foto').click();
  raiz = await montar({ id: p.id });
  igual(control(raiz, 'notas').value, 'abierto el lunes');
  igual(control(raiz, 'nombre').value, 'Salmón ahumado');
});

prueba('Borrador descartado al guardar', async () => {
  let raiz = await montar();
  escribir(raiz, 'nombre', 'Pollo');
  raiz.querySelector('a.zona-foto').click();
  raiz = await montar();
  escribir(raiz, 'fechaCaducidad', dentroDe(3));
  guardar(raiz).click();
  await esperarA(() => navegaciones.length > 0);
  raiz = await montar();
  igual(control(raiz, 'nombre').value, '', 'el alta vuelve a estar vacía');
});

prueba('un borrador del alta no aparece en la edición', async () => {
  const p = await storage.crearProducto({ ...COMPLETO });
  const alta = await montar();
  escribir(alta, 'nombre', 'Pollo');
  alta.querySelector('a.zona-foto').click();
  const raiz = await montar({ id: p.id });
  igual(control(raiz, 'nombre').value, 'Salmón ahumado');
});
