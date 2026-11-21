// Cómo informa la app de lo que acaba de pasar y de lo que está haciendo: avisos breves
// (toasts) e indicador de carga. Spec: openspec/specs/ui-feedback. Necesita el DOM: se
// prueba en tests/navegador/feedback.test.js. No importa ui.js, auth.js ni config.js.

import { ICONOS } from './iconos.js';
import { el, icono } from './utils.js';

const DURACION_MS = 3000;
const RETRASO_CARGA_MS = 300;

// ---------- Aviso breve ----------

// Una región por raíz: un aviso nuevo sustituye al anterior y reinicia la duración.
const regiones = new Map(); // raíz → { region, temporizador }

// Muestra `texto` unos segundos en una píldora con un check, arriba, bajo la cabecera. Se
// anuncia a los lectores de pantalla (role="status") y no bloquea los toques
// (pointer-events: none en el CSS).
export function mostrarAviso(texto, { duracion = DURACION_MS, raiz = document.body } = {}) {
  let estado = regiones.get(raiz);
  if (!estado || !estado.region.isConnected) {
    const mensaje = el('span', { class: 'toast__texto' });
    const region = el('div', { class: 'toast', role: 'status', 'aria-live': 'polite', hidden: true },
      el('span', { class: 'toast__icono' }, icono(ICONOS.check)), mensaje);
    estado = { region, mensaje, temporizador: null };
    raiz.append(region);
    regiones.set(raiz, estado);
  }
  clearTimeout(estado.temporizador);
  estado.mensaje.textContent = texto;
  estado.region.hidden = false;
  estado.temporizador = setTimeout(() => {
    estado.region.hidden = true;
  }, duracion);
}

// Solo para las pruebas: oculta los avisos y olvida las regiones.
export function ocultarAvisos() {
  for (const { region, temporizador } of regiones.values()) {
    clearTimeout(temporizador);
    region.remove();
  }
  regiones.clear();
}

// ---------- Indicador de carga ----------

// Espera `promesa` y devuelve su resultado (o lanza su error). Si tarda más de `retraso`
// ms, pone "Cargando…" en `contenedor` hasta que termina; si es más rápida no llega a
// verse, para que la pantalla no parpadee. Después la pantalla pinta lo que corresponda.
export async function conIndicadorDeCarga(contenedor, promesa, { retraso = RETRASO_CARGA_MS } = {}) {
  let indicador = null;
  const temporizador = setTimeout(() => {
    indicador = el('p', { class: 'cargando', role: 'status', text: 'Cargando…' });
    contenedor.replaceChildren(indicador);
  }, retraso);
  try {
    return await promesa;
  } finally {
    clearTimeout(temporizador);
    indicador?.remove();
  }
}
