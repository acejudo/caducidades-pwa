// Pantalla Listado: productos ordenados por caducidad, con su urgencia.
// Spec: openspec/specs/product-list. No importa ui.js, auth.js ni config.js, para poder
// probarse sin config.local.js (tests/navegador/listado.test.js).

import { listarProductos } from './storage.js';
import { diasRestantes, nivelUrgencia, textoCaducidad, filtrarPorEstado, FILTROS } from './productos.js';
import { formatearFecha, formatearCantidad } from './formato.js';
import { ICONOS } from './iconos.js';
import { el, icono, vaciar } from './utils.js';

// Último filtro elegido: se conserva al navegar dentro de la app y vuelve a "Todas" al
// recargar (design.md §7).
let filtroActivo = 'todas';

// Solo para las pruebas: vuelve al filtro por defecto.
export function reiniciarFiltro() {
  filtroActivo = 'todas';
}

const SIN_RESULTADOS = {
  pronto: 'No hay productos que caduquen pronto',
  caducadas: 'No hay productos caducados',
};

function estadoVacio(titulo, texto = null) {
  return el('div', { class: 'listado__vacio' },
    icono(ICONOS.vacio),
    el('p', { class: 'listado__vacio-titulo', text: titulo }),
    texto && el('p', { class: 'listado__vacio-texto', text: texto }),
  );
}

function tarjeta(producto, hoy) {
  const dias = diasRestantes(producto.fechaCaducidad, hoy);
  return el('li', {},
    el('a', {
      href: `#/producto/${encodeURIComponent(producto.id)}`,
      class: `tarjeta tarjeta--producto urgencia--${nivelUrgencia(dias)}`,
    },
    el('span', { class: 'tarjeta__foto' }, icono(ICONOS.producto)),
    el('span', { class: 'tarjeta__cuerpo' },
      el('span', { class: 'tarjeta__nombre', text: producto.nombre }),
      el('span', { class: 'tarjeta__caducidad', text: `Caduca el ${formatearFecha(producto.fechaCaducidad)}` }),
      el('span', { class: 'badge', text: textoCaducidad(dias) }),
      el('span', { class: 'tarjeta__cantidad', text: `Cantidad: ${formatearCantidad(producto.cantidad, producto.unidad)}` }),
    )),
  );
}

// Crea la pantalla. Devuelve { elemento, cargado }: `elemento` se entrega al router de
// inmediato y se rellena al leer los productos; `cargado` es la promesa de esa primera
// lectura (la usan las pruebas). `listar` y `hoy` se pueden sustituir en las pruebas.
export function crearPantallaListado({ listar = listarProductos, hoy = () => new Date() } = {}) {
  const pestanas = FILTROS.map(({ clave, texto }) => el('button', {
    type: 'button',
    role: 'tab',
    id: `filtro-${clave}`,
    class: 'pestana',
    'aria-controls': 'listado-panel',
    text: texto,
    onClick: () => elegirFiltro(clave),
  }));
  const barraFiltros = el('div', { class: 'pestanas', role: 'tablist', 'aria-label': 'Filtrar productos' }, pestanas);
  const contenido = el('div', { id: 'listado-panel', class: 'listado__contenido', role: 'tabpanel', 'aria-busy': 'true' });
  const elemento = el('section', { class: 'listado' },
    barraFiltros,
    contenido,
    el('a', { href: '#/producto/nuevo', class: 'fab', 'aria-label': 'Añadir producto' }, icono(ICONOS.mas)),
  );

  let productos = [];
  let estado = 'cargando'; // 'cargando' | 'listo' | 'error'

  function marcarPestanas() {
    FILTROS.forEach(({ clave }, i) => {
      const activa = clave === filtroActivo;
      // Todas enfocables con Tab (no hay navegación con flechas).
      pestanas[i].setAttribute('aria-selected', String(activa));
    });
    contenido.setAttribute('aria-labelledby', `filtro-${filtroActivo}`);
  }

  // Cambiar de filtro solo vuelve a pintar: no relee el almacenamiento.
  function elegirFiltro(clave) {
    filtroActivo = clave;
    pintar();
  }

  function pintar() {
    const ahora = hoy();
    marcarPestanas();
    vaciar(contenido);
    // Sin ningún producto no hay nada que filtrar: se ocultan las pestañas.
    barraFiltros.hidden = productos.length === 0;
    if (productos.length === 0) {
      contenido.append(estadoVacio('Todavía no hay productos', 'Pulsa + para añadir el primero'));
      return;
    }
    const visibles = filtrarPorEstado(productos, filtroActivo, ahora);
    contenido.append(visibles.length === 0
      ? estadoVacio(SIN_RESULTADOS[filtroActivo])
      : el('ul', { class: 'lista-productos' }, visibles.map((producto) => tarjeta(producto, ahora))));
  }

  function pintarError() {
    barraFiltros.hidden = true;
    vaciar(contenido);
    contenido.append(el('div', { class: 'listado__error', role: 'alert' },
      el('p', { class: 'listado__error-titulo', text: 'No se pudieron cargar los productos' }),
      el('p', { class: 'listado__vacio-texto', text: 'Comprueba que el navegador permite guardar datos y vuelve a intentarlo.' }),
      el('button', { type: 'button', class: 'btn btn--secundario', text: 'Reintentar', onClick: cargar }),
    ));
  }

  async function cargar() {
    estado = 'cargando';
    contenido.setAttribute('aria-busy', 'true');
    try {
      productos = await listar();
      estado = 'listo';
      pintar();
    } catch (error) {
      console.error('No se pudieron cargar los productos:', error);
      estado = 'error';
      pintarError();
    } finally {
      contenido.removeAttribute('aria-busy');
    }
  }

  // Al volver a primer plano (p. ej. al día siguiente) se recalculan días, urgencia y
  // filtros con un "hoy" nuevo, sin releer el almacenamiento. El listener se quita la
  // primera vez que llega con la sección ya fuera del documento (design.md §9).
  const escucha = new AbortController();
  document.addEventListener('visibilitychange', () => {
    if (!elemento.isConnected) {
      escucha.abort();
      return;
    }
    if (document.visibilityState === 'visible' && estado === 'listo') pintar();
  }, { signal: escucha.signal });

  marcarPestanas();
  return { elemento, cargado: cargar() };
}
