// Pruebas de src/js/feedback.js: avisos breves (toasts) e indicador de carga.
// Spec: ui-feedback.
import { prueba, antesDeCada, igual, verdadero, rechaza } from './runner.js';

const feedback = await import('../../src/js/feedback.js').catch((error) => {
  console.error('No se pudo cargar feedback.js', error);
  return {};
});

const zona = document.createElement('div');
zona.id = 'zona-feedback';
zona.style.cssText = 'position:absolute; left:-10000px; top:0; width:390px;';
document.body.append(zona);

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const regiones = () => zona.querySelectorAll('.toast');

antesDeCada(() => {
  feedback.ocultarAvisos?.();
  zona.replaceChildren();
});

// ---------- Aviso breve ----------

prueba('el aviso breve muestra el texto y se anuncia', () => {
  feedback.mostrarAviso('Producto guardado', { raiz: zona });
  const [region] = regiones();
  verdadero(region, 'falta el aviso');
  igual(region.getAttribute('role'), 'status');
  igual(region.textContent, 'Producto guardado');
  igual(region.hidden, false);
});

prueba('el aviso breve desaparece solo', async () => {
  feedback.mostrarAviso('Producto guardado', { raiz: zona, duracion: 50 });
  await esperar(120);
  igual(regiones()[0].hidden, true);
});

prueba('Dos avisos seguidos', async () => {
  feedback.mostrarAviso('Producto guardado', { raiz: zona, duracion: 80 });
  await esperar(50);
  feedback.mostrarAviso('Producto eliminado', { raiz: zona, duracion: 80 });
  igual(regiones().length, 1, 'una única región');
  igual(regiones()[0].textContent, 'Producto eliminado');
  await esperar(50); // el temporizador del primero ya habría vencido
  igual(regiones()[0].hidden, false, 'el segundo reinicia la duración');
  await esperar(80);
  igual(regiones()[0].hidden, true);
});

prueba('el aviso breve no bloquea toques', () => {
  feedback.mostrarAviso('Producto guardado', { raiz: zona });
  verdadero(regiones()[0].classList.contains('toast'), 'usa la clase con pointer-events: none');
});

// ---------- Indicador de carga ----------

function promesaControlada() {
  let resolver;
  let rechazar;
  const promesa = new Promise((res, rej) => { resolver = res; rechazar = rej; });
  return { promesa, resolver, rechazar };
}
const cargando = (contenedor) => [...contenedor.querySelectorAll('.cargando')].find((p) => p.textContent === 'Cargando…');

prueba('Lectura lenta', async () => {
  const contenedor = document.createElement('div');
  zona.append(contenedor);
  const { promesa, resolver } = promesaControlada();
  const resultado = feedback.conIndicadorDeCarga(contenedor, promesa, { retraso: 20 });
  await esperar(50);
  const indicador = cargando(contenedor);
  verdadero(indicador, 'falta "Cargando…"');
  igual(indicador.getAttribute('role'), 'status');
  resolver(['leche']);
  igual((await resultado).join(), 'leche', 'devuelve el resultado');
  igual(cargando(contenedor), undefined, 'se quita al terminar');
});

prueba('Lectura rápida', async () => {
  const contenedor = document.createElement('div');
  zona.append(contenedor);
  const resultado = await feedback.conIndicadorDeCarga(contenedor, Promise.resolve(1), { retraso: 30 });
  igual(resultado, 1);
  await esperar(60);
  igual(cargando(contenedor), undefined, 'no llega a verse');
});

prueba('Lectura fallida', async () => {
  const contenedor = document.createElement('div');
  zona.append(contenedor);
  const { promesa, rechazar } = promesaControlada();
  const resultado = feedback.conIndicadorDeCarga(contenedor, promesa, { retraso: 10 });
  await esperar(40);
  verdadero(cargando(contenedor), 'se ve mientras tarda');
  rechazar(new Error('fallo'));
  await rechaza(resultado);
  igual(cargando(contenedor), undefined, 'se quita al fallar');
});
