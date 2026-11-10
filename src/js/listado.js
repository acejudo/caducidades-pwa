// Pantalla Listado: productos ordenados por caducidad, con su urgencia.
// Spec: openspec/specs/product-list. No importa ui.js, auth.js ni config.js, para poder
// probarse sin config.local.js (tests/navegador/listado.test.js).

import { listarProductos, eliminarProducto } from './storage.js';
import { diasRestantes, nivelUrgencia, textoCaducidad, filtrarPorEstado, FILTROS } from './productos.js';
import { formatearFecha, formatearCantidad } from './formato.js';
import { fotoDeProducto } from './fotos.js';
import { ICONOS } from './iconos.js';
import { activarDeslizar } from './deslizar.js';
import { confirmar as confirmarDialogo } from './dialogo.js';
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

// La imagen del catálogo o, si no hay ninguna que mostrar, el icono genérico. La imagen
// es decorativa: el nombre del producto va al lado.
function fotoDeTarjeta(producto) {
  const foto = fotoDeProducto(producto);
  return foto
    ? el('img', { src: foto.url, alt: '', width: 48, height: 48 })
    : icono(ICONOS.producto);
}

// Cada tarjeta va dentro de un contenedor deslizable con el botón Eliminar detrás. El
// botón solo se alcanza con el gesto (tabindex -1, oculto a los lectores de pantalla):
// el Detalle ofrece la misma acción por teclado (design.md §8).
function tarjeta(producto, hoy, alEliminar) {
  const dias = diasRestantes(producto.fechaCaducidad, hoy);
  return el('li', {}, el('div', { class: 'tarjeta-deslizable' },
    el('button', {
      type: 'button',
      class: 'tarjeta__eliminar',
      tabindex: '-1',
      'aria-hidden': 'true',
      onClick: () => alEliminar(producto),
    }, icono(ICONOS.eliminar), el('span', { text: 'Eliminar' })),
    el('a', {
      href: `#/producto/${encodeURIComponent(producto.id)}`,
      class: `tarjeta tarjeta--producto urgencia--${nivelUrgencia(dias)}`,
    },
    el('span', { class: 'tarjeta__foto' }, fotoDeTarjeta(producto)),
    el('span', { class: 'tarjeta__cuerpo' },
      el('span', { class: 'tarjeta__nombre', text: producto.nombre }),
      el('span', { class: 'tarjeta__caducidad', text: `Caduca el ${formatearFecha(producto.fechaCaducidad)}` }),
      el('span', { class: 'badge', text: textoCaducidad(dias) }),
      el('span', { class: 'tarjeta__cantidad', text: `Cantidad: ${formatearCantidad(producto.cantidad, producto.unidad)}` }),
    ))),
  );
}

// Crea la pantalla. Devuelve { elemento, cargado }: `elemento` se entrega al router de
// inmediato y se rellena al leer los productos; `cargado` es la promesa de esa primera
// lectura (la usan las pruebas). Las dependencias se pueden sustituir en las pruebas.
export function crearPantallaListado({
  listar = listarProductos,
  hoy = () => new Date(),
  eliminar = eliminarProducto,
  confirmar = confirmarDialogo,
} = {}) {
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
  const aviso = el('p', { class: 'listado__aviso', role: 'alert', hidden: true });
  const elemento = el('section', { class: 'listado' },
    barraFiltros,
    aviso,
    contenido,
    el('a', { href: '#/producto/nuevo', class: 'fab', 'aria-label': 'Añadir producto' }, icono(ICONOS.mas)),
  );

  let productos = [];
  let estado = 'cargando'; // 'cargando' | 'listo' | 'error'
  const deslizador = activarDeslizar(contenido);

  // Eliminar desde una tarjeta abierta: confirmar y quitarla de la lista sin salir.
  async function eliminarDesdeLista(producto) {
    const eliminarlo = await confirmar({
      titulo: `¿Eliminar «${producto.nombre}»?`,
      mensaje: 'Dejará de aparecer en la lista.',
      aceptar: 'Eliminar',
      peligro: true,
    });
    if (!eliminarlo) {
      deslizador.cerrar();
      return;
    }
    try {
      await eliminar(producto.id);
      aviso.hidden = true;
      productos = productos.filter((p) => p.id !== producto.id);
      pintar();
    } catch (error) {
      console.error('No se pudo eliminar el producto:', error);
      aviso.textContent = 'No se pudo eliminar el producto. Inténtalo de nuevo.';
      aviso.hidden = false;
      deslizador.cerrar();
    }
  }

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
      : el('ul', { class: 'lista-productos' }, visibles.map((producto) => tarjeta(producto, ahora, eliminarDesdeLista))));
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
