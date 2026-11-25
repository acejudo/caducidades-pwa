// Pruebas de las pantallas Nuevo/Editar producto (src/js/formulario.js). Spec: product-form.
// Montan el formulario con el almacenamiento real (base de datos de pruebas), una
// navegación falsa que registra las llamadas y una confirmación falsa configurable.
import { prueba, antesDeCada, igual, igualProfundo, verdadero } from './runner.js';

const storage = await import('../../src/js/storage.js').catch(() => ({}));
const formulario = await import('../../src/js/formulario.js').catch((error) => {
  console.error('No se pudo cargar formulario.js', error);
  return {};
});

const borradores = await import('../../src/js/borradores.js').catch(() => ({}));
const fotos = await import('../../src/js/fotos.js').catch(() => ({}));

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
  igual(foto.getAttribute('href'), '#/producto/nuevo/foto');
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

prueba('Máximo', async () => {
  const raiz = await montar();
  escribir(raiz, 'cantidad', '9999');
  igual(sumar(raiz).disabled, true, 'con 9999');
  restar(raiz).click();
  igual(control(raiz, 'cantidad').value, '9998');
  igual(sumar(raiz).disabled, false, 'con 9998');
  escribir(raiz, 'cantidad', '9998,5');
  igual(sumar(raiz).disabled, true, 'con 9998,5');
  restar(raiz).click();
  igual(sumar(raiz).disabled, false, 'con 9997,5');
  escribir(raiz, 'cantidad', 'abc');
  igual(sumar(raiz).disabled, false, 'con un texto no válido');
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

prueba('Cantidad escrita por encima del máximo', async () => {
  const raiz = await montar();
  escribir(raiz, 'nombre', 'Leche');
  escribir(raiz, 'fechaCaducidad', '2026-12-01');
  escribir(raiz, 'cantidad', '10000');
  guardar(raiz).click();
  await esperarA(() => visible(errorDe(raiz, 'cantidad')));
  igual(errorDe(raiz, 'cantidad').textContent, 'La cantidad no puede ser mayor que 9999');
  igual(control(raiz, 'cantidad').getAttribute('aria-invalid'), 'true');
  const enfocado = document.activeElement;
  igual(`${enfocado?.tagName}[${enfocado?.name ?? enfocado?.className}]`, 'INPUT[cantidad]', 'el foco va a la cantidad');
  igual((await storage.listarProductos()).length, 0, 'no se guarda nada');
  igual(navegaciones.length, 0, 'no se navega');
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

// ---------- Foto ----------

const zonaFoto = (raiz) => raiz.querySelector('a.zona-foto');
const imagenDeZona = (raiz) => zonaFoto(raiz).querySelector('img');
const conFoto = (valor) => ({ tipo: 'predeterminada', valor });
const SIN_FOTO = Object.freeze({ tipo: 'ninguna', valor: null });

prueba('Alta sin foto', async () => {
  const raiz = await montar();
  igual(imagenDeZona(raiz), null, 'sin imagen');
  verdadero(zonaFoto(raiz).querySelector('svg'), 'falta el icono de cámara');
  verdadero(zonaFoto(raiz).textContent.includes('Toca para elegir foto'));
  igual(zonaFoto(raiz).getAttribute('href'), '#/producto/nuevo/foto');
});

prueba('Edición con foto', async () => {
  const p = await storage.crearProducto({ ...COMPLETO, foto: conFoto('yogur') });
  const raiz = await montar({ id: p.id });
  igual(imagenDeZona(raiz)?.getAttribute('src'), fotos.urlFoto?.('yogur'));
  verdadero(zonaFoto(raiz).textContent.includes('Yogur'), 'falta el nombre de la foto');
  igual(zonaFoto(raiz).getAttribute('href'), `#/producto/${encodeURIComponent(p.id)}/editar/foto`);
});

prueba('Alta con foto', async () => {
  borradores.guardarBorrador('nuevo', { foto: conFoto('yogur') });
  const raiz = await montar();
  igual(imagenDeZona(raiz)?.getAttribute('src'), fotos.urlFoto?.('yogur'), 'muestra la foto elegida');
  escribir(raiz, 'nombre', 'Yogur griego');
  escribir(raiz, 'fechaCaducidad', dentroDe(5));
  guardar(raiz).click();
  await esperarA(() => navegaciones.length > 0);
  const [p] = await storage.listarProductos();
  igualProfundo(p.foto, conFoto('yogur'));
});

prueba('Cambiar la foto en la edición', async () => {
  const p = await storage.crearProducto({ ...COMPLETO, foto: conFoto('leche') });
  borradores.guardarBorrador(`editar:${p.id}`, { foto: { ...SIN_FOTO } });
  const raiz = await montar({ id: p.id });
  igual(imagenDeZona(raiz), null, 'la zona queda sin foto');
  guardar(raiz).click();
  await esperarA(() => navegaciones.length > 0);
  igualProfundo((await storage.obtenerProducto(p.id)).foto, SIN_FOTO);
});

prueba('Edición sin tocar la foto', async () => {
  const p = await storage.crearProducto({ ...COMPLETO, foto: conFoto('leche') });
  const raiz = await montar({ id: p.id });
  escribir(raiz, 'nombre', 'Leche sin lactosa');
  guardar(raiz).click();
  await esperarA(() => navegaciones.length > 0);
  const guardado = await storage.obtenerProducto(p.id);
  igual(guardado.nombre, 'Leche sin lactosa');
  igualProfundo(guardado.foto, conFoto('leche'));
});

prueba('Cancelar tras cambiar la foto', async () => {
  const p = await storage.crearProducto({ ...COMPLETO, foto: conFoto('leche') });
  borradores.guardarBorrador(`editar:${p.id}`, { foto: conFoto('queso') });
  const raiz = await montar({ id: p.id });
  respuestaConfirmar = false;
  boton(raiz, 'Cancelar').click();
  await esperarA(() => confirmaciones.length > 0);
  igual(confirmaciones[0].titulo, '¿Descartar los cambios?');
});

prueba('Volver sin elegir conserva la foto', async () => {
  borradores.guardarBorrador('nuevo', { foto: conFoto('queso') });
  let raiz = await montar();
  zonaFoto(raiz).click();
  igualProfundo(borradores.leerBorrador('nuevo')?.foto, conFoto('queso'), 'el borrador guarda la foto');
  raiz = await montar(); // vuelve con la flecha sin elegir nada
  igual(imagenDeZona(raiz)?.getAttribute('src'), fotos.urlFoto?.('queso'));
});

prueba('Borrador descartado al guardar: también sin foto', async () => {
  borradores.guardarBorrador('nuevo', { foto: conFoto('pan') });
  let raiz = await montar();
  escribir(raiz, 'nombre', 'Pan');
  escribir(raiz, 'fechaCaducidad', dentroDe(2));
  guardar(raiz).click();
  await esperarA(() => navegaciones.length > 0);
  raiz = await montar();
  igual(imagenDeZona(raiz), null, 'el alta vuelve sin foto');
});

// ---------- Fotos reales (fotos-reales) ----------

const FOTO_REAL = '3f2b8c1e-9a4d-4e6f-8b2a-1c5d7e9f0a3b.webp';
const fotoReal = () => ({ tipo: 'real', valor: FOTO_REAL });

// Una imagen WebP pequeña de verdad, para que el <img> la pueda cargar.
async function imagenReal() {
  const lienzo = document.createElement('canvas');
  lienzo.width = 8;
  lienzo.height = 8;
  lienzo.getContext('2d').fillRect(0, 0, 8, 8);
  return new Promise((resolver) => lienzo.toBlob(resolver, 'image/webp'));
}

const imagenBlob = (raiz) => {
  const img = imagenDeZona(raiz);
  return img?.getAttribute('src')?.startsWith('blob:') ? img : null;
};

// Almacén real con registro del orden de las llamadas de guardado.
function almacenEspia(cambios = {}) {
  const llamadas = [];
  const espiar = (nombre, fn) => async (...args) => { llamadas.push(nombre); return fn(...args); };
  return {
    llamadas,
    almacen: {
      obtenerProducto: storage.obtenerProducto,
      crearProducto: espiar('crearProducto', cambios.crearProducto ?? storage.crearProducto),
      actualizarProducto: espiar('actualizarProducto', cambios.actualizarProducto ?? storage.actualizarProducto),
      eliminarProducto: storage.eliminarProducto,
      guardarFoto: espiar('guardarFoto', cambios.guardarFoto ?? storage.guardarFoto),
      obtenerFoto: storage.obtenerFoto,
    },
  };
}

prueba('Edición con foto real', async () => {
  await storage.guardarFoto(FOTO_REAL, await imagenReal(), { subida: true });
  const p = await storage.crearProducto({ ...COMPLETO, foto: fotoReal() });
  const raiz = await montar({ id: p.id });
  await esperarA(() => imagenBlob(raiz));
  verdadero(zonaFoto(raiz).textContent.includes('Tu foto'), 'falta "Tu foto"');
  verdadero(zonaFoto(raiz).textContent.includes('Toca para cambiar'), 'falta "Toca para cambiar"');
});

prueba('Edición con foto real que aún no está en el dispositivo', async () => {
  const p = await storage.crearProducto({ ...COMPLETO, foto: fotoReal() });
  const raiz = await montar({ id: p.id });
  await esperarUnPoco();
  igual(imagenDeZona(raiz), null, 'sin imagen');
  verdadero(zonaFoto(raiz).querySelector('svg'), 'icono genérico');
  verdadero(zonaFoto(raiz).textContent.includes('Tu foto'), 'falta "Tu foto"');
});

prueba('Alta con foto real', async () => {
  const blob = await imagenReal();
  borradores.guardarBorrador('nuevo', { foto: fotoReal(), imagen: blob });
  const { almacen, llamadas } = almacenEspia();
  const raiz = await montar({ almacen });
  await esperarA(() => imagenBlob(raiz));
  verdadero(zonaFoto(raiz).textContent.includes('Tu foto'), 'falta "Tu foto"');
  escribir(raiz, 'nombre', 'Tarta de queso');
  escribir(raiz, 'fechaCaducidad', dentroDe(3));
  guardar(raiz).click();
  await esperarA(() => navegaciones.length > 0);
  igualProfundo(llamadas, ['guardarFoto', 'crearProducto'], 'primero la foto y después el producto');
  const [p] = await storage.listarProductos();
  igualProfundo(p.foto, fotoReal());
  igual((await storage.obtenerFoto(FOTO_REAL))?.size, blob.size, 'la foto está en el dispositivo');
  const [registro] = await storage.listarFotos();
  igual(registro.subida, false, 'aún no está en Drive');
});

prueba('Cambiar a foto real en la edición', async () => {
  const p = await storage.crearProducto({ ...COMPLETO, foto: conFoto('leche') });
  borradores.guardarBorrador(`editar:${p.id}`, { foto: fotoReal(), imagen: await imagenReal() });
  const { almacen, llamadas } = almacenEspia();
  const raiz = await montar({ id: p.id, almacen });
  guardar(raiz).click();
  await esperarA(() => navegaciones.length > 0);
  igualProfundo(llamadas, ['guardarFoto', 'actualizarProducto']);
  igualProfundo((await storage.obtenerProducto(p.id)).foto, fotoReal());
});

prueba('Edición sin tocar una foto real', async () => {
  await storage.guardarFoto(FOTO_REAL, await imagenReal(), { subida: true });
  const p = await storage.crearProducto({ ...COMPLETO, foto: fotoReal() });
  const { almacen, llamadas } = almacenEspia();
  const raiz = await montar({ id: p.id, almacen });
  escribir(raiz, 'nombre', 'Otra cosa');
  guardar(raiz).click();
  await esperarA(() => navegaciones.length > 0);
  igualProfundo(llamadas, ['actualizarProducto'], 'no vuelve a guardar la foto');
  igualProfundo((await storage.obtenerProducto(p.id)).foto, fotoReal());
});

prueba('Cancelar con foto real', async () => {
  const p = await storage.crearProducto({ ...COMPLETO, foto: conFoto('leche') });
  borradores.guardarBorrador(`editar:${p.id}`, { foto: fotoReal(), imagen: await imagenReal() });
  const { almacen, llamadas } = almacenEspia();
  const raiz = await montar({ id: p.id, almacen });
  respuestaConfirmar = true;
  boton(raiz, 'Cancelar').click();
  await esperarA(() => navegaciones.length > 0);
  igual(confirmaciones[0]?.titulo, '¿Descartar los cambios?');
  igualProfundo(llamadas, [], 'no guarda nada');
  igualProfundo((await storage.obtenerProducto(p.id)).foto, conFoto('leche'));
  igual(await storage.obtenerFoto(FOTO_REAL), null);
  igual(borradores.leerBorrador(`editar:${p.id}`), null, 'se descarta el borrador');
});

prueba('Fallo al guardar la foto', async () => {
  borradores.guardarBorrador('nuevo', { foto: fotoReal(), imagen: await imagenReal() });
  const { almacen, llamadas } = almacenEspia({
    guardarFoto: async () => { throw new storage.ErrorAlmacenamiento('sin espacio'); },
  });
  const raiz = await montar({ almacen });
  escribir(raiz, 'nombre', 'Queso');
  escribir(raiz, 'fechaCaducidad', dentroDe(9));
  guardar(raiz).click();
  const aviso = () => raiz.querySelector('.formulario__aviso');
  await esperarA(() => visible(aviso()));
  igual(aviso().textContent, 'No se pudo guardar el producto. Inténtalo de nuevo.');
  igualProfundo(llamadas, ['guardarFoto'], 'no se guarda el producto');
  igualProfundo(await storage.listarProductos(), []);
  igual(control(raiz, 'nombre').value, 'Queso', 'lo escrito sigue');
  verdadero(imagenBlob(raiz), 'la foto sigue');
  igual(guardar(raiz).disabled, false);
  igual(navegaciones.length, 0);
});

prueba('Ir a Elegir foto con una foto real conserva la imagen', async () => {
  const blob = await imagenReal();
  borradores.guardarBorrador('nuevo', { valores: { nombre: 'Pizza' }, foto: fotoReal(), imagen: blob });
  let raiz = await montar();
  zonaFoto(raiz).click();
  const borrador = borradores.leerBorrador('nuevo');
  igualProfundo(borrador?.foto, fotoReal());
  igual(borrador?.imagen, blob, 'el borrador guarda la imagen');
  raiz = await montar(); // vuelve con la flecha sin elegir nada
  await esperarA(() => imagenBlob(raiz));
  igual(control(raiz, 'nombre').value, 'Pizza');
});

prueba('Cancelar tras cambiar a una foto real', async () => {
  const p = await storage.crearProducto({ ...COMPLETO, foto: conFoto('leche') });
  borradores.guardarBorrador(`editar:${p.id}`, { foto: fotoReal(), imagen: await imagenReal() });
  const raiz = await montar({ id: p.id });
  respuestaConfirmar = false;
  boton(raiz, 'Cancelar').click();
  await esperarA(() => confirmaciones.length > 0);
  igual(confirmaciones[0].titulo, '¿Descartar los cambios?');
});

// ---------- Alta en una sola pantalla y avisos (pulido-final) ----------

// Hoja de estilos de la app, para medir (se carga una sola vez).
async function cargarEstilosFormulario() {
  if (document.querySelector('link[data-estilos-app]')) return;
  const enlace = document.createElement('link');
  enlace.rel = 'stylesheet';
  enlace.href = '../../src/css/styles.css';
  enlace.dataset.estilosApp = '';
  const cargado = new Promise((resolver, rechazar) => { enlace.onload = resolver; enlace.onerror = rechazar; });
  document.head.append(enlace);
  await cargado;
}

// Zona con el ancho útil del móvil: 390 px menos el margen lateral de la app (16 px).
const zonaMovilFormulario = document.createElement('div');
zonaMovilFormulario.style.cssText = 'position:absolute; left:-10000px; top:0; width:390px; padding:0 16px; box-sizing:border-box;';
document.body.append(zonaMovilFormulario);
zonaMovilFormulario.addEventListener('submit', (evento) => evento.preventDefault());
zonaMovilFormulario.addEventListener('click', (evento) => {
  if (evento.target.closest('a')) evento.preventDefault();
});

// Alto disponible para el formulario en 390×844 con la app instalada en un iPhone: pantalla
// menos la cabecera (56 px), la zona segura superior (47 px, la barra de estado), el margen
// superior del contenido (16 px) y la zona segura inferior (34 px, la barra de inicio). En
// el formulario no hay margen inferior: la fila de botones fija ya cierra la pantalla.
const ALTO_DISPONIBLE = 844 - 56 - 47 - 16 - 34;

async function montarEnMovil(opciones = {}) {
  await cargarEstilosFormulario();
  const pantalla = formulario.crearPantallaFormulario({
    navegacion: { volver: () => navegaciones.push(['volver']), reemplazar: (path) => navegaciones.push(['reemplazar', path]) },
    confirmar: async (datos) => { confirmaciones.push(datos); return respuestaConfirmar; },
    ...opciones,
  });
  zonaMovilFormulario.replaceChildren(pantalla.elemento);
  await pantalla.cargado;
  return pantalla.elemento;
}

prueba('Alta sin scroll', async () => {
  try {
    const raiz = await montarEnMovil();
    const alto = raiz.querySelector('form').getBoundingClientRect().height;
    verdadero(alto <= ALTO_DISPONIBLE, `el formulario mide ${Math.round(alto)} px y caben ${ALTO_DISPONIBLE}`);
    const zonaFotoMovil = raiz.querySelector('a.zona-foto');
    verdadero(zonaFotoMovil.getBoundingClientRect().height <= 96, `la zona de foto mide ${Math.round(zonaFotoMovil.getBoundingClientRect().height)} px`);
    igual(control(raiz, 'notas').getAttribute('rows'), '2');
  } finally {
    zonaMovilFormulario.replaceChildren();
  }
});

prueba('Botones en una fila', async () => {
  try {
    const raiz = await montarEnMovil();
    const cajaGuardar = boton(raiz, 'Guardar').getBoundingClientRect();
    const cajaCancelar = boton(raiz, 'Cancelar').getBoundingClientRect();
    verdadero(Math.abs(cajaGuardar.top - cajaCancelar.top) <= 1, 'en la misma fila');
    verdadero(cajaGuardar.left > cajaCancelar.left, '"Guardar" a la derecha');
    verdadero(cajaGuardar.height >= 44 && cajaCancelar.height >= 44, 'tamaño táctil mínimo');
    igual(boton(raiz, 'Guardar').type, 'submit', 'Intro en un campo sigue guardando');
  } finally {
    zonaMovilFormulario.replaceChildren();
  }
});

prueba('Eliminar al final de la edición', async () => {
  const p = await storage.crearProducto({ ...COMPLETO });
  const raiz = await montar({ id: p.id });
  const eliminar = boton(raiz, 'Eliminar');
  verdadero(eliminar, 'falta "Eliminar"');
  verdadero(control(raiz, 'notas').compareDocumentPosition(eliminar) & Node.DOCUMENT_POSITION_FOLLOWING, 'después de Notas');
  igual(eliminar.closest('.formulario__acciones'), null, 'fuera de la fila fija');
});

prueba('la zona de foto compacta con foto predeterminada', async () => {
  borradores.guardarBorrador('nuevo', { foto: conFoto('yogur') });
  try {
    const raiz = await montarEnMovil();
    const zonaFotoMovil = raiz.querySelector('a.zona-foto');
    verdadero(zonaFotoMovil.getBoundingClientRect().height <= 96, 'compacta también con foto');
    verdadero(zonaFotoMovil.textContent.includes('Yogur'), 'con el nombre');
  } finally {
    zonaMovilFormulario.replaceChildren();
  }
});

prueba('Guardar un producto', async () => {
  const avisos = [];
  const raiz = await montar({ avisar: (texto) => avisos.push(texto) });
  escribir(raiz, 'nombre', 'Yogur');
  escribir(raiz, 'fechaCaducidad', dentroDe(5));
  guardar(raiz).click();
  await esperarA(() => navegaciones.length > 0);
  igualProfundo(avisos, ['Producto guardado']);
});

prueba('Error al guardar', async () => {
  const avisos = [];
  const fallo = async () => { throw new storage.ErrorAlmacenamiento('sin espacio'); };
  const raiz = await montar({ almacen: { crearProducto: fallo }, avisar: (texto) => avisos.push(texto) });
  escribir(raiz, 'nombre', 'Queso');
  escribir(raiz, 'fechaCaducidad', dentroDe(9));
  guardar(raiz).click();
  await esperarA(() => visible(raiz.querySelector('.formulario__aviso')));
  igualProfundo(avisos, [], 'no se avisa de guardado');
});

prueba('Producto eliminado desde la edición', async () => {
  const avisos = [];
  const p = await storage.crearProducto({ ...COMPLETO });
  const raiz = await montar({ id: p.id, avisar: (texto) => avisos.push(texto) });
  respuestaConfirmar = true;
  boton(raiz, 'Eliminar').click();
  await esperarA(() => navegaciones.length > 0);
  igualProfundo(avisos, ['Producto eliminado']);
});

prueba('Lectura lenta en Editar', async () => {
  let terminar;
  const pendiente = new Promise((r) => { terminar = r; });
  zona.replaceChildren();
  const pantalla = formulario.crearPantallaFormulario({
    id: 'lento',
    almacen: { obtenerProducto: () => pendiente },
    retrasoCarga: 10,
  });
  zona.append(pantalla.elemento);
  await new Promise((r) => setTimeout(r, 40));
  verdadero(pantalla.elemento.textContent.includes('Cargando…'), 'falta "Cargando…"');
  terminar(null);
  await pantalla.cargado;
  verdadero(!pantalla.elemento.textContent.includes('Cargando…'), 'se quita al terminar');
  verdadero(pantalla.elemento.textContent.includes('Este producto no existe'), 'pinta el resultado');
});

// ---------- Límites (endurecimiento-seguridad) ----------

prueba('Mensaje en el formulario', async () => {
  const lleno = async () => { throw new storage.ErrorLimiteProductos(); };
  const raiz = await montar({ almacen: { crearProducto: lleno } });
  escribir(raiz, 'nombre', 'Queso');
  escribir(raiz, 'fechaCaducidad', dentroDe(9));
  guardar(raiz).click();
  const aviso = () => raiz.querySelector('.formulario__aviso');
  await esperarA(() => visible(aviso()));
  igual(aviso().textContent, 'Has llegado al máximo de 2000 productos. Elimina alguno para añadir más.');
  igual(control(raiz, 'nombre').value, 'Queso', 'lo escrito se conserva');
  igual(navegaciones.length, 0, 'no se navega');
  igual(guardar(raiz).disabled, false);
});

prueba('las notas tienen un máximo de 1000 caracteres', async () => {
  const raiz = await montar();
  igual(control(raiz, 'notas').getAttribute('maxlength'), '1000');
});
