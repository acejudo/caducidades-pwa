// Estado de la sincronización en pantalla: el icono de la cabecera del Listado y la
// sección Sincronización de Ajustes. Spec: openspec/specs/sync-status.
// No importa ui.js, auth.js ni config.js: recibe el sincronizador y se prueba con uno
// falso (tests/navegador/estado-sincronizacion.test.js).

import { formatearMomento } from './formato.js';
import { ICONOS } from './iconos.js';
import { el, icono } from './utils.js';

// Estados que piden la atención del usuario: llevan una marca de aviso en el icono.
const CON_AVISO = new Set(['Cambios pendientes', 'Toca para sincronizar', 'Error al sincronizar']);

const sePuedePedir = (estado) => estado.enLinea && estado.fase !== 'sincronizando';

// Se suscribe al sincronizador y pinta con cada estado. Se da de baja la primera vez que
// recibe un estado con el elemento ya fuera del documento (se cambió de pantalla).
function seguirEstado(sincronizador, elemento, pintar) {
  pintar(sincronizador.estado());
  const dejar = sincronizador.suscribir((estado) => {
    if (!elemento.isConnected) {
      dejar();
      return;
    }
    pintar(estado);
  });
}

export function crearBotonSincronizacion({ sincronizador }) {
  const elemento = el('button', {
    type: 'button',
    class: 'cabecera__accion sync',
    onClick: () => sincronizador.sincronizar({ aPeticion: true }),
  });

  seguirEstado(sincronizador, elemento, (estado) => {
    const sinConexion = !estado.enLinea;
    elemento.replaceChildren(
      el('span', { class: 'sync__icono', 'data-icono': sinConexion ? 'sin-conexion' : 'sincronizar' },
        icono(sinConexion ? ICONOS.sinConexion : ICONOS.sincronizar)),
      CON_AVISO.has(estado.texto) && el('span', { class: 'sync__aviso', 'aria-hidden': 'true' }),
    );
    elemento.classList.toggle('sync--girando', estado.fase === 'sincronizando');
    elemento.setAttribute('aria-label', `Sincronizar: ${estado.texto}`);
    elemento.disabled = !sePuedePedir(estado);
  });

  return { elemento };
}

export function crearSeccionSincronizacion({ sincronizador, ahora = () => new Date() }) {
  const textoEstado = el('p', { class: 'ajustes-sync__estado' });
  const ultima = el('p', { class: 'ajustes-sync__ultima' });
  const error = el('p', { class: 'ajustes-sync__error', role: 'alert', hidden: true });
  const boton = el('button', {
    type: 'button',
    class: 'btn btn--primario btn--bloque',
    onClick: () => sincronizador.sincronizar({ aPeticion: true }),
  }, icono(ICONOS.sincronizar), el('span', { text: 'Sincronizar ahora' }));

  const elemento = el('section', { class: 'ajustes-sync' },
    el('h2', { class: 'ajustes-sync__titulo', text: 'Sincronización' }),
    el('p', { class: 'ajustes-sync__servicio', text: 'Google Drive' }),
    textoEstado,
    ultima,
    error,
    boton,
  );

  seguirEstado(sincronizador, elemento, (estado) => {
    textoEstado.textContent = estado.texto;
    textoEstado.dataset.estado = estado.texto;
    ultima.textContent = `Última sincronización: ${estado.ultima ? formatearMomento(estado.ultima, ahora()) : 'Nunca'}`;
    error.textContent = estado.fase === 'error' ? estado.error ?? '' : '';
    error.hidden = !error.textContent;
    boton.disabled = !sePuedePedir(estado);
  });

  return { elemento };
}
