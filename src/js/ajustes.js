// Pantalla Ajustes: sincronización, avisos, cuenta y "Cerrar sesión".
// Specs: ui-theme ("Ajustes en una sola pantalla"), sync-status, expiry-alerts y user-auth.
// No importa ui.js, auth.js ni config.js: la sesión, el sincronizador, la preferencia de
// avisos y el cierre de sesión llegan como dependencias (tests/navegador/ajustes.test.js).

import { el } from './utils.js';
import { crearSeccionSincronizacion } from './estado-sincronizacion.js';
import { crearSeccionAvisos, avisosPorDefecto } from './avisos.js';

export function crearPantallaAjustes({
  sesion = null,
  sincronizador,
  preferenciaAvisos = avisosPorDefecto,
  alCerrarSesion = () => {},
} = {}) {
  const elemento = el('section', { class: 'ajustes' },
    crearSeccionSincronizacion({ sincronizador }).elemento,
    crearSeccionAvisos({ preferencia: preferenciaAvisos }).elemento,
    el('section', { class: 'cuenta' },
      el('h2', { class: 'cuenta__titulo', text: 'Cuenta' }),
      el('p', { class: 'cuenta__nombre', text: sesion?.nombre ?? '' }),
      el('p', { class: 'cuenta__email', text: sesion?.email ?? '' }),
    ),
    el('button', {
      type: 'button',
      class: 'btn btn--peligro btn--bloque',
      text: 'Cerrar sesión',
      onClick: alCerrarSesion,
    }),
  );
  return { elemento };
}
