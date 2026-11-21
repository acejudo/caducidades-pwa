// Pruebas de src/js/avisos.js: preferencia de avisos, cierre en esta apertura, aviso del
// Listado y sección de Ajustes. Spec: expiry-alerts.
import { prueba, antesDeCada, igual, igualProfundo, verdadero } from './runner.js';

const avisos = await import('../../src/js/avisos.js').catch((error) => {
  console.error('No se pudo cargar avisos.js', error);
  return {};
});

const CLAVE = 'caducidades-pruebas.avisos';

const zona = document.createElement('div');
zona.id = 'zona-avisos';
zona.style.cssText = 'position:absolute; left:-10000px; top:0; width:390px;';
document.body.append(zona);

antesDeCada(() => {
  try { window.localStorage.removeItem(CLAVE); } catch { /* sin almacenamiento */ }
  avisos.reiniciarAvisos?.();
  zona.replaceChildren();
});

function sinTextoSuelto(raiz) {
  for (const nodo of raiz.childNodes) {
    verdadero(nodo.nodeType !== Node.TEXT_NODE, `texto suelto: "${nodo.textContent}"`);
  }
  verdadero(!/\b(false|null|undefined)\b/.test(raiz.textContent), 'texto false/null/undefined');
}

// ---------- Preferencia ----------

prueba('Valor por defecto', () => {
  igual(avisos.preferenciaAvisos({ clave: CLAVE }).activado(), true);
});

prueba('Preferencia conservada', () => {
  avisos.preferenciaAvisos({ clave: CLAVE }).activar(false);
  igual(avisos.preferenciaAvisos({ clave: CLAVE }).activado(), false, 'una instancia nueva lee lo guardado');
  avisos.preferenciaAvisos({ clave: CLAVE }).activar(true);
  igual(avisos.preferenciaAvisos({ clave: CLAVE }).activado(), true);
});

prueba('un valor guardado que no se entiende cuenta como activado', () => {
  window.localStorage.setItem(CLAVE, '{roto');
  igual(avisos.preferenciaAvisos({ clave: CLAVE }).activado(), true);
  window.localStorage.setItem(CLAVE, '"no"');
  igual(avisos.preferenciaAvisos({ clave: CLAVE }).activado(), true);
});

prueba('Almacenamiento bloqueado', () => {
  const bloqueado = {
    getItem() { throw new DOMException('bloqueado', 'SecurityError'); },
    setItem() { throw new DOMException('bloqueado', 'SecurityError'); },
  };
  const errores = [];
  const original = console.error;
  console.error = (...args) => errores.push(args);
  try {
    const preferencia = avisos.preferenciaAvisos({ clave: CLAVE, almacenamiento: () => bloqueado });
    igual(preferencia.activado(), true);
    preferencia.activar(false);
    igual(preferencia.activado(), false, 'se mantiene en memoria');
  } finally {
    console.error = original;
  }
  igual(errores.length, 0, 'sin errores en la consola');
});

prueba('sin localStorage accesible (el acceso lanza) también funciona', () => {
  const preferencia = avisos.preferenciaAvisos({ clave: CLAVE, almacenamiento: () => { throw new Error('sin acceso'); } });
  igual(preferencia.activado(), true);
  preferencia.activar(false);
  igual(preferencia.activado(), false);
});

prueba('avisosPorDefecto es una preferencia compartida', () => {
  verdadero(typeof avisos.avisosPorDefecto?.activado === 'function', 'falta avisosPorDefecto');
  verdadero(typeof avisos.avisosPorDefecto.activar === 'function');
});

// ---------- Cierre en esta apertura ----------

prueba('cerrar el aviso dura hasta reiniciar (nueva apertura)', () => {
  igual(avisos.avisoCerrado(), false);
  avisos.cerrarAviso();
  igual(avisos.avisoCerrado(), true);
  avisos.reiniciarAvisos();
  igual(avisos.avisoCerrado(), false);
});

// ---------- Aviso del Listado ----------

const RESUMEN = Object.freeze({ caducados: 1, proximos: 2, texto: '1 producto ha caducado y 2 caducan hoy o en los próximos 2 días', filtro: 'caducadas' });

function montarAviso() {
  const llamadas = [];
  const aviso = avisos.crearAvisoCaducidad({
    alElegirFiltro: (filtro) => llamadas.push(['filtro', filtro]),
    alCerrar: () => llamadas.push(['cerrar']),
  });
  zona.append(aviso.elemento);
  return { aviso, llamadas };
}
const botonPrincipal = (raiz) => [...raiz.querySelectorAll('button')].find((b) => !b.getAttribute('aria-label'));
const botonCerrar = (raiz) => raiz.querySelector('button[aria-label="Cerrar aviso"]');

prueba('el aviso muestra el texto del resumen y "Ver"', () => {
  const { aviso } = montarAviso();
  aviso.actualizar(RESUMEN);
  igual(aviso.elemento.hidden, false);
  verdadero(aviso.elemento.textContent.includes(RESUMEN.texto), 'falta el texto');
  verdadero(botonPrincipal(aviso.elemento)?.textContent.includes('Ver'), 'falta "Ver"');
  igual(aviso.elemento.getAttribute('role'), 'status');
  verdadero(aviso.elemento.querySelector('svg'), 'falta el icono');
  sinTextoSuelto(aviso.elemento);
});

prueba('sin resumen el aviso se oculta', () => {
  const { aviso } = montarAviso();
  aviso.actualizar(RESUMEN);
  aviso.actualizar(null);
  igual(aviso.elemento.hidden, true);
});

prueba('el botón principal elige el filtro del resumen', () => {
  const { aviso, llamadas } = montarAviso();
  aviso.actualizar(RESUMEN);
  botonPrincipal(aviso.elemento).click();
  aviso.actualizar({ ...RESUMEN, caducados: 0, filtro: 'pronto' });
  botonPrincipal(aviso.elemento).click();
  igualProfundo(llamadas, [['filtro', 'caducadas'], ['filtro', 'pronto']]);
});

prueba('el botón "Cerrar aviso" llama a alCerrar', () => {
  const { aviso, llamadas } = montarAviso();
  aviso.actualizar(RESUMEN);
  verdadero(botonCerrar(aviso.elemento), 'falta el botón Cerrar aviso');
  botonCerrar(aviso.elemento).click();
  igualProfundo(llamadas, [['cerrar']]);
});

prueba('los botones del aviso se pueden usar con el teclado', () => {
  const { aviso } = montarAviso();
  aviso.actualizar(RESUMEN);
  for (const boton of aviso.elemento.querySelectorAll('button')) {
    igual(boton.type, 'button');
    verdadero(boton.tabIndex >= 0, 'enfocable');
  }
});

// ---------- Sección de Ajustes ----------

function preferenciaFalsa(valor) {
  const cambios = [];
  return { cambios, activado: () => valor, activar: (nuevo) => { valor = nuevo; cambios.push(nuevo); } };
}

prueba('la sección "Avisos" tiene el interruptor activado por defecto', () => {
  const preferencia = preferenciaFalsa(true);
  const { elemento } = avisos.crearSeccionAvisos({ preferencia });
  zona.append(elemento);
  verdadero(elemento.querySelector('h2')?.textContent.includes('Avisos'), 'falta el título');
  const interruptor = elemento.querySelector('input[role="switch"]');
  verdadero(interruptor, 'falta el interruptor');
  igual(interruptor.type, 'checkbox');
  igual(interruptor.checked, true);
  const etiqueta = interruptor.closest('label') ?? elemento.querySelector(`label[for="${interruptor.id}"]`);
  verdadero(etiqueta?.textContent.includes('Avisar de lo que caduca pronto'), 'falta la etiqueta');
  sinTextoSuelto(elemento);
});

prueba('el interruptor refleja una preferencia desactivada', () => {
  const { elemento } = avisos.crearSeccionAvisos({ preferencia: preferenciaFalsa(false) });
  igual(elemento.querySelector('input[role="switch"]').checked, false);
});

prueba('Desactivar los avisos guarda la preferencia', () => {
  const preferencia = preferenciaFalsa(true);
  const { elemento } = avisos.crearSeccionAvisos({ preferencia });
  zona.append(elemento);
  const interruptor = elemento.querySelector('input[role="switch"]');
  interruptor.click();
  igualProfundo(preferencia.cambios, [false]);
  interruptor.click();
  igualProfundo(preferencia.cambios, [false, true]);
});
