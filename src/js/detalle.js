// Pantalla Detalle del producto: foto, datos, urgencia y acciones Editar y Eliminar.
// Spec: openspec/specs/product-detail. No importa ui.js, auth.js ni config.js, para poder
// probarse sin config.local.js (tests/navegador/detalle.test.js).

import { obtenerProducto, eliminarProducto, obtenerFoto } from './storage.js';
import { diasRestantes, nivelUrgencia, textoCaducidad } from './productos.js';
import { formatearFecha, formatearCantidad } from './formato.js';
import { pintarFoto } from './fotos-reales.js';
import { fotoDeProducto } from './fotos.js';
import { mostrarAviso, conIndicadorDeCarga } from './feedback.js';
import { ICONOS } from './iconos.js';
import { reemplazar } from './router.js';
import { confirmar as confirmarDialogo } from './dialogo.js';
import { el, icono } from './utils.js';

// Visor de la foto real entera, a pantalla completa (product-detail). Se cierra con
// "Cerrar", con Escape o tocando fuera de la foto, y al cerrarse se quita del documento.
async function abrirVisor(nombre, leerFoto) {
  let blob = null;
  try {
    blob = await leerFoto(nombre);
  } catch {
    return; // sin acceso al almacenamiento: no hay nada que enseñar
  }
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const dialogo = el('dialog', { class: 'visor-foto', 'aria-label': 'Foto del producto' },
    el('img', { src: url, alt: 'Foto del producto', class: 'visor-foto__imagen' }),
    el('button', { type: 'button', class: 'btn btn--secundario visor-foto__cerrar', text: 'Cerrar', onClick: () => dialogo.close() }));
  // Un clic en el propio <dialog> (no en la imagen ni en el botón) es un clic en el fondo.
  dialogo.addEventListener('click', (evento) => {
    if (evento.target === dialogo) dialogo.close();
  });
  dialogo.addEventListener('close', () => {
    URL.revokeObjectURL(url);
    dialogo.remove();
  });
  document.body.append(dialogo);
  dialogo.showModal();
}

// La foto en grande: la del catálogo, la real (en cuanto se lee) o el icono genérico. La
// foto real va en un recuadro 4:3 y es un botón que la abre entera en el visor.
function foto(producto, leerFoto) {
  const real = fotoDeProducto(producto)?.tipo === 'real';
  const contenedor = real
    ? el('button', { type: 'button', class: 'detalle__foto', 'aria-label': 'Ver la foto a pantalla completa' })
    : el('div', { class: 'detalle__foto' });
  pintarFoto(contenedor, producto, { obtenerFoto: leerFoto, ancho: 160, alto: 160 }).then(() => {
    contenedor.classList.toggle('detalle__foto--real', Boolean(contenedor.querySelector('img.foto-real')));
  });
  if (real) {
    contenedor.addEventListener('click', () => {
      if (contenedor.querySelector('img.foto-real')) abrirVisor(producto.foto.valor, leerFoto);
    });
  }
  return contenedor;
}

const ICONO_CATEGORIA = { Nevera: ICONOS.nevera, Congelador: ICONOS.congelador, Despensa: ICONOS.despensa };

// Un dato del Detalle con su icono a la izquierda (como en el mockup). Con `etiqueta`, el
// valor se muestra como una etiqueta de color (la categoría).
function dato(nombre, valor, iconoSvg, { comoEtiqueta = false } = {}) {
  return el('div', { class: 'detalle__dato' },
    el('dt', {}, icono(iconoSvg), el('span', { text: nombre })),
    el('dd', {}, comoEtiqueta ? el('span', { class: 'etiqueta', text: valor }) : el('span', { text: valor })));
}

// Crea la pantalla del producto `id`. Devuelve { elemento, cargado } como las demás
// pantallas; las dependencias se sustituyen en las pruebas (design.md §6).
export function crearPantallaDetalle({
  id,
  almacen: almacenInyectado = {},
  navegacion = { reemplazar },
  confirmar = confirmarDialogo,
  hoy = () => new Date(),
  // Aviso breve tras eliminar y retraso del indicador de carga (ui-feedback).
  avisar = mostrarAviso,
  retrasoCarga,
} = {}) {
  // Las pruebas sustituyen solo las operaciones que les interesan.
  const almacen = { obtenerProducto, eliminarProducto, obtenerFoto, ...almacenInyectado };
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
        avisar('Producto eliminado');
        navegacion.reemplazar('/listado');
      } catch (error) {
        console.error('No se pudo eliminar el producto:', error);
        aviso.textContent = 'No se pudo eliminar el producto. Inténtalo de nuevo.';
        aviso.hidden = false;
      }
    });

    // replaceChildren convierte en texto lo que no es un nodo: se quitan los vacíos (sin
    // notas, `producto.notas && …` es null y se vería "null").
    elemento.replaceChildren(...[
      foto(producto, almacen.obtenerFoto),
      el('h2', { class: 'detalle__nombre', text: producto.nombre }),
      el('div', { class: `detalle__caducidad urgencia--${nivelUrgencia(dias)}` },
        el('span', { class: 'detalle__fecha', text: `Caduca el ${formatearFecha(producto.fechaCaducidad)}` }),
        el('span', { class: 'badge', text: textoCaducidad(dias) })),
      el('dl', { class: 'detalle__datos' },
        producto.fechaCompra && dato('Fecha de compra', `Comprado el ${formatearFecha(producto.fechaCompra)}`, ICONOS.calendario),
        dato('Cantidad', formatearCantidad(producto.cantidad, producto.unidad), ICONOS.cantidad),
        dato('Categoría', producto.categoria, ICONO_CATEGORIA[producto.categoria] ?? ICONOS.otros, { comoEtiqueta: true })),
      producto.notas && el('section', { class: 'detalle__notas' },
        el('h3', { class: 'detalle__subtitulo', text: 'Notas' }),
        el('p', { class: 'detalle__texto', text: producto.notas })),
      aviso,
      el('div', { class: 'detalle__acciones' },
        el('a', { href: `#/producto/${encodeURIComponent(id)}/editar`, class: 'btn btn--secundario btn--bloque' },
          icono(ICONOS.editar), el('span', { text: 'Editar' })),
        eliminar),
    ].filter(Boolean));
  }

  async function cargar() {
    let producto;
    try {
      producto = await conIndicadorDeCarga(elemento, almacen.obtenerProducto(id), { retraso: retrasoCarga });
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
