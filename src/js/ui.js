// Interfaz: cabecera, navegación inferior y pantallas.
// Las pantallas que aún no están implementadas son marcadores.

import { el, icono, vaciar } from './utils.js';
import { ICONOS } from './iconos.js';
import { crearPantallaListado } from './listado.js';
import { crearPantallaFormulario } from './formulario.js';
import { volver, reemplazar } from './router.js';
import { sesionActual, iniciarSesion, cerrarSesion, cargarGoogle } from './auth.js';

const NAV = [
  { path: '/listado', texto: 'Listado', icono: ICONOS.lista },
  { path: '/ajustes', texto: 'Ajustes', icono: ICONOS.ajustes },
];

const $app = () => document.getElementById('app');
const $cabecera = () => document.getElementById('cabecera');
const $contenido = () => document.getElementById('contenido');
const $nav = () => document.getElementById('nav-inferior');

// Pinta la pantalla del destino devuelto por el router.
export function mostrar({ ruta, path, params }) {
  pintarCabecera(ruta);
  pintarNav(ruta, path);
  vaciar($contenido());
  $contenido().append(ruta.render({ params }));
  document.title = `${ruta.titulo} · Caducidades`;
  window.scrollTo(0, 0);
}

function pintarCabecera(ruta) {
  const visible = ruta.mostrarCabecera !== false;
  $cabecera().hidden = !visible;
  $app().classList.toggle('app--sin-cabecera', !visible);
  vaciar($cabecera());
  if (!visible) return;
  if (ruta.padre) {
    $cabecera().append(
      el('button', { type: 'button', class: 'cabecera__volver', 'aria-label': 'Volver', onClick: volver },
        icono(ICONOS.volver)),
    );
  }
  $cabecera().append(el('h1', { class: 'cabecera__titulo', text: ruta.titulo }));
}

function pintarNav(ruta, path) {
  const nav = $nav();
  nav.hidden = !ruta.mostrarNav;
  $app().classList.toggle('app--con-nav', Boolean(ruta.mostrarNav));
  vaciar(nav);
  if (!ruta.mostrarNav) return;
  for (const item of NAV) {
    const activo = path === item.path;
    nav.append(
      el('a', {
        href: `#${item.path}`,
        class: `nav-inferior__item${activo ? ' nav-inferior__item--activo' : ''}`,
        'aria-current': activo ? 'page' : null,
      }, icono(item.icono), el('span', { text: item.texto })),
    );
  }
}

// ---------- Pantallas (marcadores) ----------

function marcador(nota, ...hijos) {
  return el('section', { class: 'marcador' },
    el('p', { class: 'marcador__nota', text: nota }),
    ...hijos);
}

const MENSAJES_LOGIN = {
  cancelado: 'No se completó el inicio de sesión. Puedes volver a intentarlo.',
  'sin-drive': 'Hace falta permitir el acceso a Google Drive para usar Caducidades.',
  error: 'No se pudo conectar con Google. Comprueba la conexión y vuelve a intentarlo.',
};

function pantallaLogin() {
  const boton = el('button', { type: 'button', class: 'btn btn--primario btn--grande' });
  const aviso = el('p', { class: 'login__aviso', text: 'Necesitas conexión a internet para entrar.' });
  const mensaje = el('div', { class: 'login__mensaje', role: 'alert' });
  let enCurso = false;
  let reintentar = false;

  const actualizar = () => {
    const conConexion = navigator.onLine;
    aviso.hidden = conConexion;
    boton.disabled = enCurso || !conConexion;
    boton.textContent = enCurso ? 'Conectando…' : reintentar ? 'Reintentar' : 'Entrar con Google';
  };

  const mostrarMensaje = (resultado) => {
    vaciar(mensaje);
    if (resultado.motivo === 'denegado') {
      mensaje.append(
        el('strong', { text: 'Acceso denegado' }),
        el('span', { text: resultado.email
          ? `La cuenta ${resultado.email} no está autorizada para usar Caducidades.`
          : 'Esta cuenta no está autorizada para usar Caducidades.' }),
      );
    } else {
      mensaje.append(el('span', { text: MENSAJES_LOGIN[resultado.motivo] ?? MENSAJES_LOGIN.error }));
    }
  };

  boton.addEventListener('click', async () => {
    enCurso = true;
    vaciar(mensaje);
    actualizar();
    const resultado = await iniciarSesion();
    enCurso = false;
    if (resultado.ok) {
      reemplazar('/listado');
      return;
    }
    reintentar = resultado.motivo === 'error';
    mostrarMensaje(resultado);
    actualizar();
  });

  // Escucha la red solo mientras la pantalla está montada.
  const escucha = new AbortController();
  const alCambiarRed = () => (boton.isConnected ? actualizar() : escucha.abort());
  window.addEventListener('online', alCambiarRed, { signal: escucha.signal });
  window.addEventListener('offline', alCambiarRed, { signal: escucha.signal });

  // Precarga Google para que el clic abra la ventana sin esperas (y sin bloqueo de popups).
  if (navigator.onLine) cargarGoogle().catch(() => {});

  actualizar();
  return el('section', { class: 'login' },
    el('h1', { class: 'login__titulo', text: 'Caducidades' }),
    el('p', { class: 'login__texto', text: 'Controla las fechas de caducidad de tus alimentos. Entra con tu cuenta de Google autorizada.' }),
    boton,
    aviso,
    mensaje,
  );
}

function pantallaAjustes() {
  const sesion = sesionActual();
  return marcador('Aquí irán la sincronización y las notificaciones.',
    el('section', { class: 'cuenta' },
      el('h2', { class: 'cuenta__titulo', text: 'Cuenta' }),
      el('p', { class: 'cuenta__nombre', text: sesion?.nombre ?? '' }),
      el('p', { class: 'cuenta__email', text: sesion?.email ?? '' }),
    ),
    el('button', {
      type: 'button',
      class: 'btn btn--peligro btn--bloque',
      text: 'Cerrar sesión',
      onClick: () => {
        cerrarSesion();
        reemplazar('/login');
      },
    }),
  );
}

export const pantallas = {
  login: pantallaLogin,

  listado: () => crearPantallaListado().elemento,

  nuevo: () => crearPantallaFormulario().elemento,

  detalle: ({ params }) => marcador(`Aquí irá el detalle del producto "${params.id}".`,
    el('a', { href: `#/producto/${encodeURIComponent(params.id)}/editar`, class: 'btn btn--primario btn--bloque', text: 'Editar' }),
  ),

  editar: ({ params }) => crearPantallaFormulario({ id: params.id }).elemento,

  elegirFoto: () => marcador('Aquí irá la cuadrícula de fotos predeterminadas.'),

  ajustes: pantallaAjustes,
};
