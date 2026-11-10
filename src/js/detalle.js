// Pantalla Detalle del producto: foto, datos, urgencia y acciones Editar y Eliminar.
// Spec: openspec/specs/product-detail. No importa ui.js, auth.js ni config.js, para poder
// probarse sin config.local.js (tests/navegador/detalle.test.js).

import { obtenerProducto, eliminarProducto } from './storage.js';
import { diasRestantes, nivelUrgencia, textoCaducidad } from './productos.js';
import { formatearFecha, formatearCantidad } from './formato.js';
import { fotoDeProducto } from './fotos.js';
import { ICONOS } from './iconos.js';
import { reemplazar } from './router.js';
import { confirmar as confirmarDialogo } from './dialogo.js';
import { el, icono } from './utils.js';

function foto(producto) {
  const predeterminada = fotoDeProducto(producto);
  return el('div', { class: 'detalle__foto' },
    predeterminada
      ? el('img', { src: predeterminada.url, alt: '', width: 160, height: 160 })
      : icono(ICONOS.producto));
}

function dato(etiqueta, valor) {
  return el('div', { class: 'detalle__dato' },
    el('dt', { text: etiqueta }),
    el('dd', { text: valor }));
}

// Crea la pantalla del producto `id`. Devuelve { elemento, cargado } como las demás
// pantallas; las dependencias se sustituyen en las pruebas (design.md §6).
export function crearPantallaDetalle({
  id,
  almacen = { obtenerProducto, eliminarProducto },
  navegacion = { reemplazar },
  confirmar = confirmarDialogo,
  hoy = () => new Date(),
} = {}) {
  const elemento = el('section', { class: 'detalle' });

  function pintarEstado(titulo, accion) {
    elemento.replaceChildren(el('div', { class: 'formulario__estado', role: 'alert' },
      el('p', { class: 'formulario__estado-titulo', text: titulo }),
      accion));
  }

  function pintar(producto) {
    const dias = diasRestantes(producto.fechaCaducidad, hoy());
    const aviso = el('p', { class: 'formulario__aviso', role: 'alert', hidden: true });
    const eliminar = el('button', { type: 'button', class: 'btn btn--peligro btn--bloque' },
      icono(ICONOS.eliminar), el('span', { text: 'Eliminar' }));

    eliminar.addEventListener('click', async () => {
      const eliminarlo = await confirmar({
        titulo: `¿Eliminar «${producto.nombre}»?`,
        mensaje: 'Dejará de aparecer en la lista.',
        aceptar: 'Eliminar',
        peligro: true,
      });
      if (!eliminarlo) return;
      try {
        await almacen.eliminarProducto(id);
        navegacion.reemplazar('/listado');
      } catch (error) {
        console.error('No se pudo eliminar el producto:', error);
        aviso.textContent = 'No se pudo eliminar el producto. Inténtalo de nuevo.';
        aviso.hidden = false;
      }
    });

    elemento.replaceChildren(
      foto(producto),
      el('h2', { class: 'detalle__nombre', text: producto.nombre }),
      el('div', { class: `detalle__caducidad urgencia--${nivelUrgencia(dias)}` },
        el('span', { class: 'detalle__fecha', text: `Caduca el ${formatearFecha(producto.fechaCaducidad)}` }),
        el('span', { class: 'badge', text: textoCaducidad(dias) })),
      el('dl', { class: 'detalle__datos' },
        producto.fechaCompra && dato('Fecha de compra', `Comprado el ${formatearFecha(producto.fechaCompra)}`),
        dato('Cantidad', formatearCantidad(producto.cantidad, producto.unidad)),
        dato('Categoría', producto.categoria)),
      producto.notas && el('section', { class: 'detalle__notas' },
        el('h3', { class: 'detalle__subtitulo', text: 'Notas' }),
        el('p', { class: 'detalle__texto', text: producto.notas })),
      aviso,
      el('div', { class: 'detalle__acciones' },
        el('a', { href: `#/producto/${encodeURIComponent(id)}/editar`, class: 'btn btn--secundario btn--bloque' },
          icono(ICONOS.editar), el('span', { text: 'Editar' })),
        eliminar),
    );
  }

  async function cargar() {
    let producto;
    try {
      producto = await almacen.obtenerProducto(id);
    } catch (error) {
      console.error('No se pudo cargar el producto:', error);
      pintarEstado('No se pudo cargar el producto',
        el('button', { type: 'button', class: 'btn btn--secundario', text: 'Reintentar', onClick: cargar }));
      return;
    }
    if (!producto) {
      // También al volver con Atrás a un producto ya eliminado.
      pintarEstado('Este producto no existe o se ha eliminado',
        el('a', { href: '#/listado', class: 'btn btn--secundario', text: 'Volver al listado' }));
      return;
    }
    pintar(producto);
  }

  return { elemento, cargado: cargar() };
}
