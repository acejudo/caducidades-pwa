// Pruebas de la pantalla Elegir foto (src/js/elegir-foto.js). Spec: product-photos.
// Montan la pantalla con una navegación falsa y comprueban el borrador del formulario.
import { prueba, antesDeCada, igual, igualProfundo, verdadero } from './runner.js';

const elegirFoto = await import('../../src/js/elegir-foto.js').catch((error) => {
  console.error('No se pudo cargar elegir-foto.js', error);
  return {};
});
const borradores = await import('../../src/js/borradores.js').catch(() => ({}));
const storage = await import('../../src/js/storage.js').catch(() => ({}));
const fotos = await import('../../src/js/fotos.js').catch(() => ({}));

const BD_PRUEBAS = 'caducidades-pruebas';

const zona = document.createElement('div');
zona.id = 'zona-elegir-foto';
zona.style.cssText = 'position:absolute; left:-10000px; top:0; width:390px;';
document.body.append(zona);
zona.addEventListener('click', (evento) => {
  if (evento.target.closest('a')) evento.preventDefault();
});

let navegaciones;
let compresiones;
// Doble de la compresión: por defecto devuelve una foto WebP con nombre fijo.
const FOTO_REAL = '3f2b8c1e-9a4d-4e6f-8b2a-1c5d7e9f0a3b.webp';
const BLOB_REAL = new Blob(['webp'], { type: 'image/webp' });
let comprimir;

async function montar(para = 'nuevo') {
  zona.replaceChildren();
  const pantalla = elegirFoto.crearPantallaElegirFoto({
    para,
    navegacion: { volver: () => navegaciones.push(['volver']) },
    comprimir: (archivo) => {
      compresiones.push(archivo);
      return comprimir(archivo);
    },
  });
  zona.append(pantalla.elemento);
  await pantalla.cargado;
  return pantalla.elemento;
}

const casillas = (raiz) => [...raiz.querySelectorAll('.fotos > li')];
const visibles = (raiz) => casillas(raiz).filter((li) => !li.hidden);
const nombreDe = (li) => li.textContent.trim();
const casilla = (raiz, nombre) => casillas(raiz).find((li) => nombreDe(li) === nombre);
const botonDe = (raiz, nombre) => casilla(raiz, nombre)?.querySelector('button');
const boton = (raiz, texto) => [...raiz.querySelectorAll('button')].find((b) => b.textContent.includes(texto)) ?? null;
const conFoto = (valor) => ({ tipo: 'predeterminada', valor });
function buscar(raiz, texto) {
  const campo = raiz.querySelector('input[type="search"]');
  campo.value = texto;
  campo.dispatchEvent(new Event('input', { bubbles: true }));
}

antesDeCada(async () => {
  borradores.descartarBorradores?.();
  navegaciones = [];
  compresiones = [];
  comprimir = async () => ({ nombre: FOTO_REAL, blob: BLOB_REAL, ancho: 10, alto: 10 });
  zona.replaceChildren();
});

prueba('Cuadrícula completa', async () => {
  const raiz = await montar();
  const nombres = casillas(raiz).map(nombreDe);
  igualProfundo(nombres, fotos.FOTOS_PREDETERMINADAS.map((f) => f.nombre));
  igual(nombres.at(-1), 'Genérico');
  for (const li of casillas(raiz)) {
    const img = li.querySelector('img');
    verdadero(img?.getAttribute('src')?.endsWith('.svg'), `${nombreDe(li)} sin imagen`);
    igual(img.getAttribute('alt'), '', 'imagen decorativa: el nombre va escrito');
  }
  igual(raiz.querySelectorAll('[aria-pressed="true"]').length, 0, 'ninguna marcada');
  const buscador = raiz.querySelector('input[type="search"]');
  igual(buscador?.getAttribute('placeholder'), 'Buscar producto…');
  verdadero(buscador.getAttribute('aria-label'), 'el buscador tiene etiqueta');
});

prueba('Foto actual marcada', async () => {
  borradores.guardarBorrador('nuevo', { valores: { nombre: 'Queso curado' }, foto: conFoto('queso') });
  const raiz = await montar();
  const marcadas = [...raiz.querySelectorAll('[aria-pressed="true"]')];
  igual(marcadas.length, 1);
  igual(marcadas[0], botonDe(raiz, 'Queso'));
  verdadero(casilla(raiz, 'Queso').classList.contains('foto--seleccionada') || marcadas[0].classList.contains('foto--seleccionada'),
    'falta la marca visual');
  igualProfundo(borradores.leerBorrador('nuevo')?.valores, { nombre: 'Queso curado' }, 'leer no borra el borrador');
});

prueba('Elegir desde Nuevo producto', async () => {
  borradores.guardarBorrador('nuevo', { valores: { nombre: 'Pollo' }, foto: { tipo: 'ninguna', valor: null } });
  const raiz = await montar();
  botonDe(raiz, 'Pollo').click();
  igualProfundo(borradores.leerBorrador('nuevo'), { valores: { nombre: 'Pollo' }, foto: conFoto('pollo') });
  igualProfundo(navegaciones, [['volver']]);
});

prueba('Elegir desde la edición', async () => {
  storage.usarBaseDeDatos(BD_PRUEBAS);
  const p = await storage.crearProducto({ nombre: 'Tortilla', fechaCaducidad: '2026-12-01', foto: conFoto('generico') });
  borradores.guardarBorrador(`editar:${p.id}`, { valores: { nombre: 'Tortilla' }, foto: conFoto('generico') });
  const raiz = await montar(`editar:${p.id}`);
  botonDe(raiz, 'Huevos').click();
  igualProfundo(borradores.leerBorrador(`editar:${p.id}`)?.foto, conFoto('huevos'));
  igual(borradores.leerBorrador('nuevo'), null, 'no toca el borrador del alta');
  igualProfundo(navegaciones, [['volver']]);
  igualProfundo((await storage.obtenerProducto(p.id)).foto, conFoto('generico'), 'el producto guardado no cambia');
});

prueba('Entrada directa por URL', async () => {
  const raiz = await montar();
  botonDe(raiz, 'Pan').click();
  igualProfundo(borradores.leerBorrador('nuevo'), { foto: conFoto('pan') });
  igualProfundo(navegaciones, [['volver']]);
});

prueba('Quitar la foto', async () => {
  borradores.guardarBorrador('nuevo', { valores: { nombre: 'Leche' }, foto: conFoto('leche') });
  const raiz = await montar();
  boton(raiz, 'Sin foto').click();
  igualProfundo(borradores.leerBorrador('nuevo'), { valores: { nombre: 'Leche' }, foto: { tipo: 'ninguna', valor: null } });
  igualProfundo(navegaciones, [['volver']]);
});

prueba('Buscar sin acento', async () => {
  const raiz = await montar();
  buscar(raiz, 'platano');
  igualProfundo(visibles(raiz).map(nombreDe), ['Plátano']);
});

prueba('Buscar parte del nombre', async () => {
  const raiz = await montar();
  buscar(raiz, 'LE');
  const nombres = visibles(raiz).map(nombreDe);
  verdadero(nombres.includes('Leche'), 'falta Leche');
  verdadero(!nombres.includes('Pan'), 'sobra Pan');
  buscar(raiz, '');
  igual(visibles(raiz).length, casillas(raiz).length, 'vacío muestra todas');
});

prueba('Sin coincidencias', async () => {
  const raiz = await montar();
  const mensaje = () => [...raiz.querySelectorAll('p')].find((p) => p.textContent.includes('No hay fotos que coincidan'));
  verdadero(!mensaje() || mensaje().hidden, 'sin mensaje al principio');
  buscar(raiz, 'zzz');
  igual(visibles(raiz).length, 0);
  verdadero(mensaje() && !mensaje().hidden, 'falta el mensaje');
  verdadero(boton(raiz, 'Sin foto') && !boton(raiz, 'Sin foto').hidden, '"Sin foto" sigue visible');
  buscar(raiz, 'pan');
  verdadero(mensaje().hidden, 'el mensaje se oculta al encontrar algo');
});

prueba('un doble toque vuelve una sola vez', async () => {
  const raiz = await montar();
  botonDe(raiz, 'Arroz').click();
  botonDe(raiz, 'Tomate').click();
  igualProfundo(navegaciones, [['volver']]);
  igualProfundo(borradores.leerBorrador('nuevo')?.foto, conFoto('arroz'));
});

// ---------- Hacer foto o elegirla de la galería (fotos-reales) ----------

const entradaCamara = (raiz) => raiz.querySelector('input[type="file"][capture]');
const entradaGaleria = (raiz) => raiz.querySelector('input[type="file"]:not([capture])');
const fotoReal = () => ({ tipo: 'real', valor: FOTO_REAL });

// Simula que el usuario elige un archivo (o cancela, sin archivos) en un <input type=file>.
function elegirArchivo(entrada, archivos) {
  const transferencia = new DataTransfer();
  for (const archivo of archivos) transferencia.items.add(archivo);
  entrada.files = transferencia.files;
  entrada.dispatchEvent(new Event('change', { bubbles: true }));
}

const imagen = () => new File([new Uint8Array([1, 2, 3])], 'IMG_0001.jpg', { type: 'image/jpeg' });

async function esperar(condicion, mensaje) {
  for (let i = 0; i < 100; i += 1) {
    if (condicion()) return;
    await new Promise((resolver) => setTimeout(resolver, 10));
  }
  throw new Error(`Tiempo agotado: ${mensaje}`);
}

const textoVisible = (raiz, texto) => [...raiz.querySelectorAll('p, [role="status"], [role="alert"]')]
  .some((nodo) => !nodo.hidden && nodo.textContent.includes(texto));

prueba('Botones disponibles', async () => {
  const raiz = await montar();
  for (const texto of ['Hacer foto', 'Elegir de la galería', 'Sin foto']) {
    const b = boton(raiz, texto);
    verdadero(b, `falta "${texto}"`);
    igual(b.disabled, false, `"${texto}" desactivado`);
  }
  verdadero(!raiz.textContent.includes('Próximamente'), 'sobra "Próximamente"');
  igual(entradaCamara(raiz)?.getAttribute('capture'), 'environment', 'la cámara usa capture');
  igual(entradaCamara(raiz).getAttribute('accept'), 'image/*');
  igual(entradaGaleria(raiz)?.getAttribute('accept'), 'image/*', 'falta la entrada de la galería');
});

prueba('"Hacer foto" abre la cámara y "Elegir de la galería" las fotos', async () => {
  const raiz = await montar();
  const abiertas = [];
  entradaCamara(raiz).addEventListener('click', (e) => { e.preventDefault(); abiertas.push('camara'); });
  entradaGaleria(raiz).addEventListener('click', (e) => { e.preventDefault(); abiertas.push('galeria'); });
  boton(raiz, 'Hacer foto').click();
  boton(raiz, 'Elegir de la galería').click();
  igualProfundo(abiertas, ['camara', 'galeria']);
});

prueba('Foto de la galería en Nuevo producto', async () => {
  borradores.guardarBorrador('nuevo', { valores: { nombre: 'Pollo' }, foto: { tipo: 'ninguna', valor: null } });
  const raiz = await montar();
  const archivo = imagen();
  elegirArchivo(entradaGaleria(raiz), [archivo]);
  await esperar(() => navegaciones.length > 0, 'no volvió al formulario');
  igual(compresiones[0], archivo, 'se comprime el archivo elegido');
  const borrador = borradores.leerBorrador('nuevo');
  igualProfundo(borrador.valores, { nombre: 'Pollo' });
  igualProfundo(borrador.foto, fotoReal());
  igual(borrador.imagen, BLOB_REAL, 'el borrador lleva la imagen comprimida');
  igualProfundo(navegaciones, [['volver']]);
});

prueba('Foto de la cámara', async () => {
  const raiz = await montar();
  elegirArchivo(entradaCamara(raiz), [imagen()]);
  await esperar(() => navegaciones.length > 0, 'no volvió al formulario');
  igualProfundo(borradores.leerBorrador('nuevo')?.foto, fotoReal());
});

prueba('Cancelar la cámara', async () => {
  borradores.guardarBorrador('nuevo', { foto: conFoto('leche') });
  const raiz = await montar();
  elegirArchivo(entradaCamara(raiz), []);
  await new Promise((resolver) => setTimeout(resolver, 30));
  igual(compresiones.length, 0);
  igual(navegaciones.length, 0);
  igualProfundo(borradores.leerBorrador('nuevo'), { foto: conFoto('leche') });
});

prueba('Archivo que no es una imagen', async () => {
  borradores.guardarBorrador('nuevo', { foto: conFoto('leche') });
  comprimir = async () => { throw new Error('No se pudo usar esta foto'); };
  const raiz = await montar();
  elegirArchivo(entradaGaleria(raiz), [new File(['hola'], 'nota.txt', { type: 'text/plain' })]);
  await esperar(() => textoVisible(raiz, 'No se pudo usar esta foto'), 'falta el aviso');
  igual(navegaciones.length, 0, 'sigue en Elegir foto');
  igualProfundo(borradores.leerBorrador('nuevo'), { foto: conFoto('leche') });
  verdadero(!textoVisible(raiz, 'Preparando foto'), 'se quita "Preparando foto…"');
  // Se puede seguir eligiendo.
  botonDe(raiz, 'Pan').click();
  igualProfundo(navegaciones, [['volver']]);
});

prueba('Doble elección', async () => {
  let terminar;
  comprimir = () => new Promise((resolver) => { terminar = () => resolver({ nombre: FOTO_REAL, blob: BLOB_REAL, ancho: 10, alto: 10 }); });
  const raiz = await montar();
  elegirArchivo(entradaGaleria(raiz), [imagen()]);
  await esperar(() => textoVisible(raiz, 'Preparando foto…'), 'falta "Preparando foto…"');
  botonDe(raiz, 'Queso').click();
  boton(raiz, 'Sin foto').click();
  igual(navegaciones.length, 0, 'no vuelve mientras se prepara');
  terminar();
  await esperar(() => navegaciones.length > 0, 'no volvió al formulario');
  igualProfundo(borradores.leerBorrador('nuevo')?.foto, fotoReal());
  igualProfundo(navegaciones, [['volver']]);
});

prueba('una foto real actual no marca ninguna casilla', async () => {
  borradores.guardarBorrador('nuevo', { foto: fotoReal(), imagen: BLOB_REAL });
  const raiz = await montar();
  igual(raiz.querySelectorAll('[aria-pressed="true"]').length, 0);
});

prueba('elegir una predeterminada tras una foto real quita la imagen del borrador', async () => {
  borradores.guardarBorrador('nuevo', { valores: { nombre: 'Pan' }, foto: fotoReal(), imagen: BLOB_REAL });
  const raiz = await montar();
  botonDe(raiz, 'Pan').click();
  igualProfundo(borradores.leerBorrador('nuevo'), { valores: { nombre: 'Pan' }, foto: conFoto('pan') });
});

prueba('"Sin foto" tras una foto real quita la imagen del borrador', async () => {
  borradores.guardarBorrador('nuevo', { foto: fotoReal(), imagen: BLOB_REAL });
  const raiz = await montar();
  boton(raiz, 'Sin foto').click();
  igualProfundo(borradores.leerBorrador('nuevo'), { foto: { tipo: 'ninguna', valor: null } });
});

prueba('Elegir foto no deja texto suelto', async () => {
  const raiz = await montar();
  for (const nodo of raiz.childNodes) {
    verdadero(nodo.nodeType !== Node.TEXT_NODE, `texto suelto: "${nodo.textContent}"`);
  }
  verdadero(!/\b(false|null|undefined)\b/.test(raiz.textContent), 'texto false/null/undefined');
});
