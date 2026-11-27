// Pantalla Listado: productos ordenados por caducidad, con su urgencia.
// Spec: openspec/specs/product-list. No importa ui.js, auth.js ni config.js, para poder
// probarse sin config.local.js (tests/navegador/listado.test.js).

import { listarProductos, eliminarProducto, obtenerFoto as obtenerFotoGuardada } from './storage.js';
import {
  diasRestantes, nivelUrgencia, textoRelativo, filtrarPorEstado, resumirUrgentes, FILTROS,
  contarPorFiltro, agruparPorSeccion, buscarPorNombre,
} from './productos.js';
import { avisosPorDefecto, avisoCerrado, cerrarAviso, crearAvisoCaducidad } from './avisos.js';
import { crearAvisoSincronizacion } from './estado-sincronizacion.js';
import { mostrarAviso, conIndicadorDeCarga } from './feedback.js';
import { formatearFechaCorta, formatearCantidad } from './formato.js';
import { pintarFoto } from './fotos-reales.js';
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
  pronto: 'No hay productos que caduquen esta semana',
  caducadas: 'No hay productos caducados',
};

function estadoVacio(titulo, texto = null) {
  return el('div', { class: 'listado__vacio' },
    icono(ICONOS.vacio),
    el('p', { class: 'listado__vacio-titulo', text: titulo }),
    texto && el('p', { class: 'listado__vacio-texto', text: texto }),
  );
}

// La imagen del catálogo, la foto real o, si no hay ninguna que mostrar, el icono
// genérico (la foto real se pinta en cuanto se lee). La imagen es decorativa: el nombre
// del producto va al lado.
function fotoDeFila(producto, obtenerFoto) {
  const contenedor = el('span', { class: 'fila-producto__foto' });
  pintarFoto(contenedor, producto, { obtenerFoto, ancho: 44, alto: 44 });
  return contenedor;
}

// "1 ud" es lo habitual: solo se muestra la cantidad cuando es otra.
const cantidadVisible = (producto) => !(producto.cantidad === 1 && producto.unidad === 'ud');

// Cada fila va dentro de un contenedor deslizable con el botón Eliminar detrás. El
// botón solo se alcanza con el gesto (tabindex -1, oculto a los lectores de pantalla):
// el Detalle ofrece la misma acción por teclado. La urgencia la marca el color del
// tiempo relativo, que siempre va escrito.
function fila(producto, hoy, alEliminar, obtenerFoto) {
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
      // `tarjeta` es lo que mueve deslizar.js; el aspecto es el de `fila-producto`.
      class: 'tarjeta fila-producto',
    },
    fotoDeFila(producto, obtenerFoto),
    el('span', { class: 'fila-producto__cuerpo' },
      el('span', { class: 'fila-producto__nombre', text: producto.nombre }),
      el('span', { class: 'fila-producto__caducidad' },
        el('span', { class: `fila-producto__relativo urgencia-texto--${nivelUrgencia(dias)}`, text: textoRelativo(dias) }),
        el('span', { class: 'fila-producto__separador', 'aria-hidden': 'true', text: ' · ' }),
        el('span', { class: 'fila-producto__fecha', text: formatearFechaCorta(producto.fechaCaducidad, hoy) }),
      ),
    ),
    cantidadVisible(producto) && el('span', {
      class: 'fila-producto__cantidad',
      text: formatearCantidad(producto.cantidad, producto.unidad),
    }))),
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
  obtenerFoto = obtenerFotoGuardada,
  // Aviso de caducidad (expiry-alerts): preferencia y cierre en esta apertura.
  avisos = { activado: () => avisosPorDefecto.activado(), cerrado: avisoCerrado, cerrar: cerrarAviso },
  // El sincronizador de la app (lo pasa ui.js): muestra el aviso de cambios sin sincronizar.
  sincronizador = null,
  // Aviso breve tras eliminar y retraso del indicador de carga (ui-feedback).
  avisar = mostrarAviso,
  retrasoCarga,
} = {}) {
  // Cada filtro muestra su número de productos: "Caducados · 3".
  const contadores = {};
  const pestanas = FILTROS.map(({ clave, texto }) => el('button', {
    type: 'button',
    role: 'tab',
    id: `filtro-${clave}`,
    class: 'pestana',
    'aria-controls': 'listado-panel',
    onClick: () => elegirFiltro(clave),
  },
  el('span', { class: 'pestana__nombre', text: texto }),
  el('span', { class: 'pestana__separador', 'aria-hidden': 'true', text: ' · ' }),
  contadores[clave] = el('span', { class: 'pestana__contador', text: '0' }),
  ));
  const barraFiltros = el('div', { class: 'pestanas', role: 'tablist', 'aria-label': 'Filtrar productos' }, pestanas);
  // Búsqueda por nombre: filtra al escribir, sin releer el almacenamiento. El texto no se
  // conserva al salir del Listado (el filtro sí).
  const campoBusqueda = el('input', {
    type: 'search',
    class: 'buscador__campo',
    placeholder: 'Buscar producto',
    'aria-label': 'Buscar producto',
    autocomplete: 'off',
    enterkeyhint: 'search',
  });
  campoBusqueda.addEventListener('input', () => pintar());
  const zonaBusqueda = el('label', { class: 'buscador listado__buscador' }, icono(ICONOS.buscar), campoBusqueda);
  const contenido = el('div', { id: 'listado-panel', class: 'listado__contenido', role: 'tabpanel', 'aria-busy': 'true' });
  const aviso = el('p', { class: 'listado__aviso', role: 'alert', hidden: true });
  const avisoCaducidad = crearAvisoCaducidad({
    alElegirFiltro: (clave) => elegirFiltro(clave),
    alCerrar: () => {
      avisos.cerrar();
      pintar();
    },
  });
  const elemento = el('section', { class: 'listado' },
    zonaBusqueda,
    barraFiltros,
    sincronizador && crearAvisoSincronizacion({ sincronizador }).elemento,
    avisoCaducidad.elemento,
    aviso,
    contenido,
    el('a', { href: '#/producto/nuevo', class: 'fab', 'aria-label': 'Añadir producto' },
      icono(ICONOS.mas), el('span', { class: 'fab__texto', text: 'Añadir' })),
  );
  // Acceso a Ajustes en la cabecera, detrás del estado de sincronización (app-navigation).
  const accionCabecera = el('a', { href: '#/ajustes', class: 'cabecera__accion', 'aria-label': 'Ajustes' },
    icono(ICONOS.ajustes));

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
      avisar('Producto eliminado');
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
    // El aviso se calcula con los mismos productos y la misma fecha que la lista.
    avisoCaducidad.actualizar(avisos.activado() && !avisos.cerrado() ? resumirUrgentes(productos, ahora) : null);
    vaciar(contenido);
    // Sin ningún producto no hay nada que filtrar ni buscar: se ocultan los dos.
    barraFiltros.hidden = productos.length === 0;
    zonaBusqueda.hidden = productos.length === 0;
    if (productos.length === 0) {
      contenido.append(estadoVacio('Todavía no hay productos', 'Pulsa «Añadir» para guardar el primero'));
      return;
    }
    // Los contadores cuentan todos los productos: no dependen de la búsqueda.
    const cuenta = contarPorFiltro(productos, ahora);
    for (const [clave, contador] of Object.entries(contadores)) contador.textContent = String(cuenta[clave]);
    const busqueda = campoBusqueda.value;
    const visibles = buscarPorNombre(filtrarPorEstado(productos, filtroActivo, ahora), busqueda);
    if (visibles.length === 0) {
      contenido.append(estadoVacio(busqueda.trim()
        ? `Ningún producto coincide con «${busqueda.trim()}»`
        : SIN_RESULTADOS[filtroActivo]));
      return;
    }
    // Con un filtro activo queda una sola sección, con su cabecera.
    contenido.append(...agruparPorSeccion(visibles, ahora).map(({ clave, titulo, productos: deLaSeccion }) => {
      const idTitulo = `seccion-${clave}`;
      return el('section', { class: `listado__seccion listado__seccion--${clave}`, 'aria-labelledby': idTitulo },
        el('h2', { class: 'listado__seccion-cabecera', id: idTitulo },
          el('span', { class: 'listado__seccion-titulo', text: titulo }),
          el('span', { class: 'listado__seccion-contador', text: String(deLaSeccion.length) }),
        ),
        el('ul', { class: 'lista-productos' },
          deLaSeccion.map((producto) => fila(producto, ahora, eliminarDesdeLista, obtenerFoto))),
      );
    }));
  }

  function pintarError() {
    barraFiltros.hidden = true;
    zonaBusqueda.hidden = true;
    avisoCaducidad.actualizar(null);
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
      productos = await conIndicadorDeCarga(contenido, listar(), { retraso: retrasoCarga });
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
  return { elemento, cargado: cargar(), accionCabecera };
}
