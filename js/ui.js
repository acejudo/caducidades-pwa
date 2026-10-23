// Interfaz: cabecera, navegación inferior y pantallas.
// Las pantallas son marcadores hasta que cada cambio implemente la suya.

import { el, icono, vaciar } from './utils.js';
import { volver } from './router.js';

// Iconos de Lucide (licencia ISC), incrustados para no depender de la librería.
const ICONOS = {
  lista: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12h.01"/><path d="M3 18h.01"/><path d="M3 6h.01"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M8 6h13"/></svg>',
  ajustes: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
  volver: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>',
  mas: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
  camara: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>',
};

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
  vaciar($cabecera());
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

function zonaFoto() {
  return el('a', { href: '#/elegir-foto', class: 'zona-foto' },
    icono(ICONOS.camara), el('span', { text: 'Toca para elegir foto' }));
}

export const pantallas = {
  login: () => marcador('Aquí irá el botón "Entrar con Google".'),

  listado: () => marcador('Aquí irá la lista de productos.',
    // Provisional: se quitará cuando existan productos reales.
    el('a', { href: '#/producto/ejemplo', class: 'tarjeta urgencia--naranja' },
      el('div', {},
        el('p', { class: 'tarjeta__nombre', text: 'Producto de ejemplo' }),
        el('p', { class: 'tarjeta__meta', text: 'Toca para ver el detalle' })),
    ),
    el('a', { href: '#/producto/nuevo', class: 'fab', 'aria-label': 'Añadir producto' }, icono(ICONOS.mas)),
  ),

  nuevo: () => marcador('Aquí irá el formulario de alta.', zonaFoto()),

  detalle: ({ params }) => marcador(`Aquí irá el detalle del producto "${params.id}".`,
    el('a', { href: `#/producto/${encodeURIComponent(params.id)}/editar`, class: 'btn btn--primario btn--bloque', text: 'Editar' }),
  ),

  editar: ({ params }) => marcador(`Aquí irá el formulario de edición del producto "${params.id}".`, zonaFoto()),

  elegirFoto: () => marcador('Aquí irá la cuadrícula de fotos predeterminadas.'),

  ajustes: () => marcador('Aquí irán la sincronización, la cuenta y el cierre de sesión.',
    // Provisional: se quitará en el cambio de autenticación.
    el('a', { href: '#/login', class: 'btn btn--secundario btn--bloque', text: 'Ir a Login' }),
  ),
};
