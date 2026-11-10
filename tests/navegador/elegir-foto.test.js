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

async function montar(para = 'nuevo') {
  zona.replaceChildren();
  const pantalla = elegirFoto.crearPantallaElegirFoto({
    para,
    navegacion: { volver: () => navegaciones.push(['volver']) },
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

prueba('Botón desactivado', async () => {
  const raiz = await montar();
  const hacer = boton(raiz, 'Hacer foto');
  verdadero(hacer, 'falta "Hacer foto"');
  igual(hacer.disabled, true);
  verdadero(raiz.textContent.includes('Próximamente'), 'falta "Próximamente"');
  hacer.click();
  igual(navegaciones.length, 0);
  igual(borradores.leerBorrador('nuevo'), null);
});

prueba('un doble toque vuelve una sola vez', async () => {
  const raiz = await montar();
  botonDe(raiz, 'Arroz').click();
  botonDe(raiz, 'Tomate').click();
  igualProfundo(navegaciones, [['volver']]);
  igualProfundo(borradores.leerBorrador('nuevo')?.foto, conFoto('arroz'));
});
