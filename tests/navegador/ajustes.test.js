// Pruebas de la pantalla Ajustes (src/js/ajustes.js) con dobles de la sesión, el
// sincronizador y la preferencia de avisos. Specs: ui-theme ("Ajustes en una sola
// pantalla"), user-auth, sync-status y expiry-alerts.
import { prueba, antesDeCada, igual, verdadero } from './runner.js';

const ajustes = await import('../../src/js/ajustes.js').catch((error) => {
  console.error('No se pudo cargar ajustes.js', error);
  return {};
});
const { textoEstado } = await import('../../src/js/sincronizacion.js').catch(() => ({}));

function crearSincronizadorFalso(inicial = {}) {
  const actual = { enLinea: true, fase: 'inactivo', pendiente: false, tokenVigente: false, ultima: null, error: null, ...inicial };
  return {
    estado: () => ({ ...actual, texto: textoEstado(actual) }),
    suscribir: () => () => {},
    sincronizar: () => Promise.resolve(),
  };
}

function crearPreferenciaFalsa() {
  let activado = true;
  return { activado: () => activado, activar: (valor) => { activado = valor; } };
}

// Zona fuera de la pantalla con el ancho del móvil. Dentro, un <main class="contenido">
// con las clases de la app con navegación inferior, para que se apliquen sus márgenes.
const zona = document.createElement('div');
zona.style.cssText = 'position:absolute; left:-10000px; top:0; width:390px;';
document.body.append(zona);

async function cargarEstilos() {
  if (document.querySelector('link[data-estilos-app]')) return;
  const enlace = document.createElement('link');
  enlace.rel = 'stylesheet';
  enlace.href = '../../src/css/styles.css';
  enlace.dataset.estilosApp = '';
  const cargado = new Promise((resolver, rechazar) => { enlace.onload = resolver; enlace.onerror = rechazar; });
  document.head.append(enlace);
  await cargado;
}

let cierres;

async function montar() {
  await cargarEstilos();
  const { elemento } = ajustes.crearPantallaAjustes({
    sesion: { nombre: 'Prueba', email: 'prueba@example.com' },
    sincronizador: crearSincronizadorFalso(),
    preferenciaAvisos: crearPreferenciaFalsa(),
    alCerrarSesion: () => { cierres += 1; },
  });
  const contenido = document.createElement('main');
  contenido.className = 'contenido';
  const app = document.createElement('div');
  app.className = 'app--con-nav app--ajustes';
  contenido.append(elemento);
  app.append(contenido);
  zona.replaceChildren(app);
  return { elemento, contenido };
}

antesDeCada(() => {
  cierres = 0;
  zona.replaceChildren();
});

const texto = (nodo) => nodo.textContent.replace(/\s+/g, ' ').trim();
const cerrarSesion = (raiz) => [...raiz.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Cerrar sesión');

// Alto de la pantalla en el móvil de referencia menos la cabecera (56 px).
const ALTO_CONTENIDO = 740 - 56;
const ALTO_NAV = 64;
const ESPACIO_4 = 16;

prueba('Ajustes muestra sus secciones y Cerrar sesión', async () => {
  const { elemento } = await montar();
  const t = texto(elemento);
  for (const parte of ['Sincronización', 'Avisos', 'Cuenta', 'Prueba', 'prueba@example.com', 'Cerrar sesión']) {
    verdadero(t.toLowerCase().includes(parte.toLowerCase()), `falta "${parte}"`);
  }
  verdadero(!/\b(false|null|undefined)\b/.test(t), 'sin texto suelto');
});

prueba('Cerrar sesión llama a alCerrarSesion', async () => {
  const { elemento } = await montar();
  cerrarSesion(elemento).click();
  igual(cierres, 1);
});

prueba('Ajustes sin scroll', async () => {
  const { contenido } = await montar();
  const alto = contenido.getBoundingClientRect().height;
  verdadero(alto <= ALTO_CONTENIDO, `Ajustes mide ${Math.round(alto)} px y caben ${ALTO_CONTENIDO}`);
});

prueba('Cerrar sesión por encima de la navegación', async () => {
  const { elemento, contenido } = await montar();
  const boton = cerrarSesion(elemento).getBoundingClientRect();
  verdadero(boton.height >= 44, 'tamaño táctil mínimo');
  const debajo = contenido.getBoundingClientRect().bottom - boton.bottom;
  verdadero(debajo >= ALTO_NAV, `deja sitio a la navegación (${Math.round(debajo)} px)`);
  verdadero(debajo <= ALTO_NAV + ESPACIO_4 + 1, `sin margen sobrante (${Math.round(debajo)} px)`);
});
