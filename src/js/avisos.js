// Aviso de caducidad dentro de la app: preferencia de cada dispositivo, cierre en esta
// apertura, el aviso del Listado y la sección "Avisos" de Ajustes. Spec:
// openspec/specs/expiry-alerts. Sin notificaciones del sistema ni permisos. Necesita el
// DOM: se prueba en tests/navegador/avisos.test.js. No importa ui.js, auth.js ni config.js.

import { URGENCIA } from './constantes.js';
import { ICONOS } from './iconos.js';
import { el, icono } from './utils.js';

const CLAVE = 'caducidades.avisos';

// ---------- Preferencia ----------

// { activado(), activar(valor) }, guardada en localStorage como {"activado": bool}. Sin
// nada guardado (o con un valor que no se entiende) cuenta como activado. Si el
// almacenamiento no está disponible, recuerda el valor en memoria y nunca lanza.
export function preferenciaAvisos({ clave = CLAVE, almacenamiento = () => window.localStorage } = {}) {
  let enMemoria = null;

  function leerGuardado() {
    try {
      const datos = JSON.parse(almacenamiento().getItem(clave));
      return typeof datos?.activado === 'boolean' ? datos.activado : null;
    } catch {
      return null;
    }
  }

  return {
    activado() {
      return enMemoria ?? leerGuardado() ?? true;
    },
    activar(valor) {
      enMemoria = Boolean(valor);
      try {
        almacenamiento().setItem(clave, JSON.stringify({ activado: enMemoria }));
      } catch {
        // Sin almacenamiento: vale con la memoria mientras la app esté abierta.
      }
    },
  };
}

// La que comparten el Listado y Ajustes en la app.
export const avisosPorDefecto = preferenciaAvisos();

// ---------- Cierre en esta apertura ----------

// Se pierde al recargar o volver a abrir la app (el módulo se evalúa de nuevo).
let cerradoEnEstaApertura = false;

export function cerrarAviso() {
  cerradoEnEstaApertura = true;
}

export function avisoCerrado() {
  return cerradoEnEstaApertura;
}

// Solo para las pruebas: como si se abriera la app otra vez.
export function reiniciarAvisos() {
  cerradoEnEstaApertura = false;
}

// ---------- Aviso del Listado ----------

// Aviso con el resumen de productos urgentes (`resumirUrgentes` de productos.js). El botón
// principal lleva al filtro del resumen y el ✕ lo cierra. Oculto hasta `actualizar`.
export function crearAvisoCaducidad({ alElegirFiltro = () => {}, alCerrar = () => {} } = {}) {
  let resumen = null;
  const texto = el('span', { class: 'aviso-caducidad__texto' });
  const elemento = el('div', { class: 'aviso-caducidad', role: 'status', hidden: true },
    el('button', {
      type: 'button',
      class: 'aviso-caducidad__ver',
      onClick: () => resumen && alElegirFiltro(resumen.filtro),
    },
    icono(ICONOS.alerta),
    texto,
    el('span', { class: 'aviso-caducidad__accion' }, el('span', { text: 'Ver' }), icono(ICONOS.siguiente))),
    el('button', {
      type: 'button',
      class: 'aviso-caducidad__cerrar',
      'aria-label': 'Cerrar aviso',
      onClick: () => alCerrar(),
    }, icono(ICONOS.cerrar)),
  );

  function actualizar(nuevo) {
    resumen = nuevo;
    texto.textContent = nuevo?.texto ?? '';
    elemento.hidden = !nuevo;
  }

  return { elemento, actualizar };
}

// ---------- Sección de Ajustes ----------

export function crearSeccionAvisos({ preferencia = avisosPorDefecto } = {}) {
  const interruptor = el('input', {
    type: 'checkbox',
    role: 'switch',
    id: 'ajustes-avisos-interruptor',
    class: 'interruptor',
  });
  interruptor.checked = preferencia.activado();
  interruptor.addEventListener('change', () => preferencia.activar(interruptor.checked));

  const elemento = el('section', { class: 'ajustes-avisos' },
    el('h2', { class: 'ajustes-avisos__titulo', text: 'Avisos' }),
    el('label', { class: 'ajustes-avisos__opcion', for: interruptor.id },
      el('span', { text: 'Avisar de lo que caduca pronto' }),
      interruptor),
    el('p', {
      class: 'ajustes-avisos__ayuda',
      text: `Al abrir la app, el listado avisa de los productos caducados o que caducan en los próximos ${URGENCIA.rojoMaxDias} días.`,
    }),
  );

  return { elemento };
}
