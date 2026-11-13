// Pruebas del icono de sincronización de la cabecera y de la sección de Ajustes
// (src/js/estado-sincronizacion.js) con un sincronizador falso. Spec: sync-status.
import { prueba, antesDeCada, igual, igualProfundo, verdadero } from './runner.js';

const vista = await import('../../src/js/estado-sincronizacion.js').catch((error) => {
  console.error('No se pudo cargar estado-sincronizacion.js', error);
  return {};
});
const { textoEstado } = await import('../../src/js/sincronizacion.js').catch(() => ({}));

const zona = document.createElement('div');
zona.id = 'zona-estado-sync';
zona.style.cssText = 'position:absolute; left:-10000px; top:0; width:390px;';
document.body.append(zona);

// Sincronizador falso: publica el estado que se le indique y anota las peticiones.
function crearSincronizadorFalso(inicial = {}) {
  const base = { enLinea: true, fase: 'inactivo', pendiente: false, tokenVigente: true, ultima: null, error: null };
  let actual = { ...base, ...inicial };
  const suscriptores = new Set();
  const completo = () => ({ ...actual, texto: textoEstado(actual) });
  return {
    peticiones: [],
    suscriptores,
    estado: completo,
    suscribir(fn) { suscriptores.add(fn); return () => suscriptores.delete(fn); },
    sincronizar(opciones) { this.peticiones.push(opciones); return Promise.resolve(); },
    publicar(cambios) {
      actual = { ...actual, ...cambios };
      for (const fn of [...suscriptores]) fn(completo());
    },
  };
}

const AHORA = new Date(2026, 10, 13, 20, 0);
let sinc;

function montarBoton(inicial) {
  sinc = crearSincronizadorFalso(inicial);
  const { elemento } = vista.crearBotonSincronizacion({ sincronizador: sinc });
  zona.replaceChildren(elemento);
  return elemento;
}

function montarSeccion(inicial) {
  sinc = crearSincronizadorFalso(inicial);
  const { elemento } = vista.crearSeccionSincronizacion({ sincronizador: sinc, ahora: () => AHORA });
  zona.replaceChildren(elemento);
  return elemento;
}

const texto = (nodo) => nodo.textContent.replace(/\s+/g, ' ').trim();
const botonDe = (raiz, contenido) => [...raiz.querySelectorAll('button')].find((b) => b.textContent.includes(contenido));

antesDeCada(() => {
  zona.replaceChildren();
});

// ---------- Icono de la cabecera ----------

prueba('Pulsar el icono', () => {
  const boton = montarBoton({ tokenVigente: false });
  igual(boton.tagName, 'BUTTON');
  igual(boton.disabled, false);
  boton.click();
  igualProfundo(sinc.peticiones, [{ aPeticion: true }]);
});

prueba('Nombre accesible', () => {
  const boton = montarBoton({ pendiente: true });
  igual(boton.getAttribute('aria-label'), 'Sincronizar: Cambios pendientes');
  verdadero(boton.querySelector('.sync__aviso'), 'marca de aviso con cambios pendientes');
});

prueba('Sin conexión', () => {
  const boton = montarBoton({ enLinea: false });
  igual(boton.disabled, true);
  igual(boton.getAttribute('aria-label'), 'Sincronizar: Sin conexión');
  verdadero(boton.querySelector('[data-icono="sin-conexion"]'), 'icono tachado');
});

prueba('mientras sincroniza gira y está desactivado', () => {
  const boton = montarBoton({ fase: 'sincronizando' });
  igual(boton.disabled, true);
  verdadero(boton.classList.contains('sync--girando'));
  igual(boton.querySelector('.sync__aviso'), null);
});

prueba('sincronizado: sin marca de aviso', () => {
  const boton = montarBoton({});
  igual(boton.querySelector('.sync__aviso'), null);
  igual(boton.getAttribute('aria-label'), 'Sincronizar: Sincronizado');
  verdadero(boton.querySelector('[data-icono="sincronizar"]'));
});

prueba('error y sin token: marca de aviso', () => {
  verdadero(montarBoton({ fase: 'error', error: 'x' }).querySelector('.sync__aviso'));
  verdadero(montarBoton({ tokenVigente: false }).querySelector('.sync__aviso'));
});

// ---------- Sección de Ajustes ----------

prueba('Sincronizar desde Ajustes', () => {
  const seccion = montarSeccion({ ultima: new Date(2026, 10, 13, 18, 30).toISOString() });
  verdadero(texto(seccion).includes('Sincronización'), 'título');
  verdadero(texto(seccion).includes('Sincronizado'), 'estado');
  verdadero(texto(seccion).includes('Última sincronización: hoy a las 18:30'));
  botonDe(seccion, 'Sincronizar ahora').click();
  igualProfundo(sinc.peticiones, [{ aPeticion: true }]);
  sinc.publicar({ fase: 'sincronizando' });
  verdadero(texto(seccion).includes('Sincronizando…'));
  igual(botonDe(seccion, 'Sincronizar ahora').disabled, true, 'desactivado mientras sincroniza');
});

prueba('Nunca sincronizado', () => {
  const seccion = montarSeccion({ ultima: null, pendiente: true });
  verdadero(texto(seccion).includes('Última sincronización: Nunca'));
});

prueba('Error visible', () => {
  const seccion = montarSeccion({ fase: 'error', error: 'Google Drive no respondió como se esperaba. Inténtalo más tarde.' });
  verdadero(texto(seccion).includes('Error al sincronizar'));
  verdadero(texto(seccion).includes('Google Drive no respondió como se esperaba. Inténtalo más tarde.'));
  igual(botonDe(seccion, 'Sincronizar ahora').disabled, false);
});

prueba('Sincronizar ahora sin conexión está desactivado', () => {
  const seccion = montarSeccion({ enLinea: false });
  igual(botonDe(seccion, 'Sincronizar ahora').disabled, true);
});

// ---------- Actualización ----------

prueba('Cambio guardado', () => {
  const boton = montarBoton({});
  const seccion = vista.crearSeccionSincronizacion({ sincronizador: sinc, ahora: () => AHORA }).elemento;
  zona.append(seccion);
  sinc.publicar({ pendiente: true, tokenVigente: false });
  igual(boton.getAttribute('aria-label'), 'Sincronizar: Toca para sincronizar');
  verdadero(boton.querySelector('.sync__aviso'));
  verdadero(texto(seccion).includes('Toca para sincronizar'));
});

prueba('fuera del documento se da de baja', () => {
  montarBoton({});
  vista.crearSeccionSincronizacion({ sincronizador: sinc, ahora: () => AHORA }).elemento; // nunca montada
  igual(sinc.suscriptores.size, 2);
  zona.replaceChildren(); // se cambia de pantalla
  sinc.publicar({ pendiente: true });
  igual(sinc.suscriptores.size, 0);
});
