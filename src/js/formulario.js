// Pantallas Nuevo producto y Editar producto (un único formulario).
// Spec: openspec/specs/product-form. No importa ui.js, auth.js ni config.js, para poder
// probarse sin config.local.js (tests/navegador/formulario.test.js).

import {
  obtenerProducto, crearProducto, actualizarProducto, eliminarProducto, guardarFoto, obtenerFoto,
} from './storage.js';
import { CATEGORIAS, UNIDADES } from './constantes.js';
import { ErrorValidacion } from './productos.js';
import { ICONOS } from './iconos.js';
import { volver, reemplazar } from './router.js';
import { confirmar as confirmarDialogo } from './dialogo.js';
import { el, icono } from './utils.js';
import { leerBorrador, guardarBorrador, descartarBorrador } from './borradores.js';
import { fotoDeProducto } from './fotos.js';
import { pintarFoto } from './fotos-reales.js';
import { mostrarAviso, conIndicadorDeCarga } from './feedback.js';

// Las pruebas lo importan desde aquí.
export { descartarBorradores } from './borradores.js';

const SIN_FOTO = Object.freeze({ tipo: 'ninguna', valor: null });

// Valores del formulario de alta (como texto, tal cual van en los controles).
const VALORES_ALTA = Object.freeze({
  nombre: '',
  fechaCompra: '',
  fechaCaducidad: '',
  cantidad: '1',
  unidad: 'ud',
  categoria: 'Nevera',
  notas: '',
});

function valoresDeProducto(producto) {
  return {
    nombre: producto.nombre,
    fechaCompra: producto.fechaCompra ?? '',
    fechaCaducidad: producto.fechaCaducidad,
    cantidad: String(producto.cantidad).replace('.', ','),
    unidad: producto.unidad,
    categoria: producto.categoria,
    notas: producto.notas ?? '',
  };
}

// Cantidad escrita (con coma o punto) como número; NaN si no es un número.
function leerCantidad(texto) {
  const limpio = texto.trim().replace(',', '.');
  return limpio === '' ? Number.NaN : Number(limpio);
}

function escribirCantidad(numero) {
  return String(Math.round(numero * 100) / 100).replace('.', ',');
}

// Botones − y +: + suma 1 (o pone 1 si no hay un número); − resta 1 y queda
// desactivado en 1 o menos (design.md §2).
function activarCantidad({ cantidad }, { restar, sumar }) {
  const actualizar = () => {
    const n = leerCantidad(cantidad.value);
    restar.disabled = !(n > 1);
  };
  const cambiar = (delta) => {
    const n = leerCantidad(cantidad.value);
    cantidad.value = escribirCantidad(Number.isFinite(n) ? n + delta : 1);
    cantidad.dispatchEvent(new Event('input', { bubbles: true }));
  };
  sumar.addEventListener('click', () => cambiar(1));
  restar.addEventListener('click', () => cambiar(-1));
  cantidad.addEventListener('input', actualizar);
  actualizar();
}

function opciones(lista, actual) {
  // Una unidad guardada que no está en la lista se añade para no perderla.
  const valores = lista.includes(actual) || !actual ? lista : [...lista, actual];
  return valores.map((valor) => el('option', { value: valor, text: valor }));
}

function campo(nombre, etiqueta, contenido, { obligatorio = false, opcional = false } = {}) {
  return el('div', { class: 'campo', 'data-campo': nombre },
    el('label', { class: 'campo__etiqueta', for: `campo-${nombre}` },
      etiqueta,
      obligatorio && el('span', { class: 'campo__obligatorio', 'aria-hidden': 'true', text: ' *' }),
      opcional && el('span', { class: 'campo__opcional', text: ' (opcional)' })),
    contenido,
    el('p', { class: 'campo__error', id: `error-${nombre}`, hidden: true }),
  );
}

// Zona de foto compacta, en una fila (product-form, "Zona de foto"): la miniatura y su
// nombre si es predeterminada, la foto real con "Tu foto", o la cámara si no hay foto que
// mostrar. Devuelve { zona, pintada }: `pintada` se resuelve cuando la foto real ya se ve.
function zonaDeFoto(href, foto, { imagen, obtenerFoto: leerFoto }) {
  const actual = fotoDeProducto({ foto });
  if (!actual) {
    const zona = el('a', { href, class: 'zona-foto' },
      el('span', { class: 'zona-foto__imagen zona-foto__imagen--camara' }, icono(ICONOS.camara)),
      el('span', { class: 'zona-foto__texto' },
        el('span', { class: 'zona-foto__nombre', text: 'Toca para elegir foto' }),
        el('span', { class: 'zona-foto__nota', text: 'Predeterminada, cámara o galería' })));
    return { zona, pintada: Promise.resolve() };
  }
  const marco = el('span', { class: 'zona-foto__imagen' });
  const pintada = pintarFoto(marco, { foto }, { imagen, obtenerFoto: leerFoto, ancho: 56, alto: 56 });
  const zona = el('a', { href, class: 'zona-foto zona-foto--con-foto' },
    marco,
    el('span', { class: 'zona-foto__texto' },
      el('span', { class: 'zona-foto__nombre', text: actual.tipo === 'real' ? 'Tu foto' : actual.nombre }),
      el('span', { class: 'zona-foto__nota', text: 'Toca para cambiar' })));
  return { zona, pintada };
}

function construirFormulario(valores, { edicion, hrefFoto, foto, imagen, obtenerFoto: leerFoto }) {
  const control = (tag, nombre, attrs = {}) => el(tag, { id: `campo-${nombre}`, name: nombre, class: 'campo__control', ...attrs });

  const nombre = control('input', 'nombre', {
    type: 'text', autocomplete: 'off', enterkeyhint: 'next', placeholder: 'Ej. Leche, Yogur, Pollo', required: true,
  });
  const fechaCompra = control('input', 'fechaCompra', { type: 'date' });
  const fechaCaducidad = control('input', 'fechaCaducidad', { type: 'date', required: true });
  const cantidad = control('input', 'cantidad', { type: 'text', inputmode: 'decimal', autocomplete: 'off', class: 'campo__control cantidad__valor' });
  const unidad = el('select', { name: 'unidad', class: 'campo__control cantidad__unidad', 'aria-label': 'Unidad' },
    opciones(UNIDADES, valores.unidad));
  const categoria = control('select', 'categoria');
  categoria.append(...opciones(CATEGORIAS, valores.categoria));
  const notas = control('textarea', 'notas', { rows: 2, placeholder: 'Añade cualquier detalle útil…' });

  const restar = el('button', { type: 'button', class: 'cantidad__boton', 'data-accion': 'restar', 'aria-label': 'Restar uno', text: '−' });
  const sumar = el('button', { type: 'button', class: 'cantidad__boton', 'data-accion': 'sumar', 'aria-label': 'Sumar uno', text: '+' });

  // En la fila fija, "Cancelar" a la izquierda y "Guardar" a la derecha (orden en el CSS).
  const guardar = el('button', { type: 'submit', class: 'btn btn--primario btn--bloque formulario__guardar', text: 'Guardar' });
  const cancelar = el('button', { type: 'button', class: 'btn btn--secundario btn--bloque formulario__cancelar', text: 'Cancelar' });
  const eliminar = edicion ? el('button', { type: 'button', class: 'btn btn--peligro btn--bloque', text: 'Eliminar' }) : null;
  const aviso = el('p', { class: 'formulario__aviso', role: 'alert', hidden: true });

  const { zona: zonaFoto, pintada } = zonaDeFoto(hrefFoto, foto, { imagen, obtenerFoto: leerFoto });

  const form = el('form', { class: 'formulario', novalidate: true },
    zonaFoto,
    campo('nombre', 'Nombre', nombre, { obligatorio: true }),
    campo('fechaCompra', 'Fecha de compra', fechaCompra, { opcional: true }),
    campo('fechaCaducidad', 'Fecha de caducidad', fechaCaducidad, { obligatorio: true }),
    campo('cantidad', 'Cantidad', el('div', { class: 'cantidad' },
      el('div', { class: 'cantidad__grupo' }, restar, cantidad, sumar), unidad)),
    campo('categoria', 'Categoría', categoria),
    campo('notas', 'Notas', notas, { opcional: true }),
    // Guardar y Cancelar quedan fijos abajo; Eliminar va después, sin fijar, para que
    // no ocupe pantalla al rellenar ni se pulse por error.
    el('div', { class: 'formulario__acciones' }, aviso, guardar, cancelar),
    eliminar && el('div', { class: 'formulario__peligro' }, eliminar),
  );

  const controles = { nombre, fechaCompra, fechaCaducidad, cantidad, unidad, categoria, notas };
  for (const [clave, c] of Object.entries(controles)) c.value = valores[clave];

  return { form, controles, botones: { restar, sumar, guardar, cancelar, eliminar }, aviso, zonaFoto, pintada };
}

// Orden de los campos en pantalla (para enfocar el primero con error). La unidad
// comparte campo con la cantidad.
const ORDEN_CAMPOS = ['nombre', 'fechaCompra', 'fechaCaducidad', 'cantidad', 'categoria', 'notas'];
const CAMPO_DE = { unidad: 'cantidad' };
const CONTROL_DE = { cantidad: 'cantidad' };

function leerValores(controles) {
  return Object.fromEntries(Object.entries(controles).map(([clave, c]) => [clave, c.value]));
}

function limpiarError(form, controles, campo) {
  const contenedor = form.querySelector(`.campo[data-campo="${campo}"]`);
  contenedor?.classList.remove('campo--error');
  const error = form.querySelector(`#error-${campo}`);
  if (error) {
    error.hidden = true;
    error.textContent = '';
  }
  const c = controles[CONTROL_DE[campo] ?? campo];
  c?.removeAttribute('aria-invalid');
  c?.removeAttribute('aria-describedby');
}

// Pinta los errores de validación junto a cada campo y enfoca el primero.
function mostrarErrores(form, controles, campos, aviso) {
  const porCampo = {};
  for (const [clave, mensaje] of Object.entries(campos)) {
    const campo = CAMPO_DE[clave] ?? clave;
    if (!ORDEN_CAMPOS.includes(campo)) {
      aviso.textContent = mensaje; // p. ej. la foto, que no tiene control visible
      aviso.hidden = false;
      continue;
    }
    porCampo[campo] = porCampo[campo] ? `${porCampo[campo]} ${mensaje}` : mensaje;
  }
  for (const [campo, mensaje] of Object.entries(porCampo)) {
    form.querySelector(`.campo[data-campo="${campo}"]`).classList.add('campo--error');
    const error = form.querySelector(`#error-${campo}`);
    error.textContent = mensaje;
    error.hidden = false;
    const c = controles[CONTROL_DE[campo] ?? campo];
    c.setAttribute('aria-invalid', 'true');
    c.setAttribute('aria-describedby', `error-${campo}`);
  }
  const primero = ORDEN_CAMPOS.find((campo) => porCampo[campo]);
  if (primero) controles[CONTROL_DE[primero] ?? primero].focus();
}

// Crea la pantalla. Sin `id` es Nuevo producto; con `id`, Editar producto.
// Devuelve { elemento, cargado } como el Listado. Las dependencias se pueden sustituir
// en las pruebas (design.md §1).
export function crearPantallaFormulario({
  id = null,
  almacen: almacenInyectado = {},
  navegacion = { volver, reemplazar },
  confirmar = confirmarDialogo,
  // Aviso breve tras guardar o eliminar y retraso del indicador de carga (ui-feedback).
  avisar = mostrarAviso,
  retrasoCarga,
} = {}) {
  // Las pruebas sustituyen solo las operaciones que les interesan.
  const almacen = {
    obtenerProducto, crearProducto, actualizarProducto, eliminarProducto, guardarFoto, obtenerFoto,
    ...almacenInyectado,
  };
  const elemento = el('section', { class: 'formulario-pantalla' });
  const edicion = id !== null;

  const clave = edicion ? `editar:${id}` : 'nuevo';
  const hrefFoto = edicion ? `#/producto/${encodeURIComponent(id)}/editar/foto` : '#/producto/nuevo/foto';
  let producto = null;
  let fotoActual = SIN_FOTO;
  // Blob de una foto real elegida en Elegir foto y aún no guardada (design.md §4).
  let imagenActual = null;
  let estadoInicial = '';

  function pintarEstado(titulo, accion) {
    elemento.replaceChildren(el('div', { class: 'formulario__estado', role: 'alert' },
      el('p', { class: 'formulario__estado-titulo', text: titulo }),
      accion));
  }

  async function cargar() {
    let valores = { ...VALORES_ALTA };
    if (edicion) {
      try {
        producto = await conIndicadorDeCarga(elemento, almacen.obtenerProducto(id), { retraso: retrasoCarga });
      } catch (error) {
        console.error('No se pudo cargar el producto:', error);
        pintarEstado('No se pudo cargar el producto',
          el('button', { type: 'button', class: 'btn btn--secundario', text: 'Reintentar', onClick: cargar }));
        return;
      }
      if (!producto) {
        pintarEstado('Este producto no existe o se ha eliminado',
          el('a', { href: '#/listado', class: 'btn btn--secundario', text: 'Volver al listado' }));
        return;
      }
      valores = valoresDeProducto(producto);
    }
    // La foto guardada (o ninguna en el alta), salvo que el borrador traiga otra: la
    // de antes de ir a Elegir foto o la elegida allí (design.md §3).
    const fotoGuardada = producto?.foto ?? SIN_FOTO;
    const borrador = leerBorrador(clave);
    descartarBorrador(clave);
    fotoActual = borrador?.foto ?? fotoGuardada;
    imagenActual = borrador?.foto ? (borrador.imagen ?? null) : null;
    const partes = construirFormulario(valores, {
      edicion, hrefFoto, foto: fotoActual, imagen: imagenActual, obtenerFoto: almacen.obtenerFoto,
    });
    // Lo que se compara para saber si hay cambios sin guardar (design.md §5): los
    // valores y la foto guardados, así un borrador recuperado cuenta como cambios.
    estadoInicial = JSON.stringify({ valores: leerValores(partes.controles), foto: fotoGuardada });
    aplicarValores(partes.controles, borrador?.valores);
    activarCantidad(partes.controles, partes.botones);
    activarGuardado(partes);
    activarCancelarYEliminar(partes);
    // Ir a Elegir foto guarda lo escrito para recuperarlo al volver (design.md §7).
    partes.zonaFoto.addEventListener('click', () => guardarBorrador(clave, {
      valores: leerValores(partes.controles),
      foto: fotoActual,
      ...(imagenActual && { imagen: imagenActual }),
    }));
    elemento.replaceChildren(partes.form);
    await partes.pintada;
  }

  function aplicarValores(controles, valores = {}) {
    for (const [campo, valor] of Object.entries(valores)) {
      if (!controles[campo]) continue;
      if (controles[campo].tagName === 'SELECT' && ![...controles[campo].options].some((o) => o.value === valor)) {
        controles[campo].append(el('option', { value: valor, text: valor }));
      }
      controles[campo].value = valor;
    }
  }

  function activarCancelarYEliminar({ controles, botones, aviso }) {
    const hayCambios = () => JSON.stringify({ valores: leerValores(controles), foto: fotoActual }) !== estadoInicial;

    botones.cancelar.addEventListener('click', async () => {
      if (hayCambios()) {
        const descartar = await confirmar({
          titulo: '¿Descartar los cambios?',
          mensaje: 'Lo que has escrito no se guardará.',
          aceptar: 'Descartar',
          cancelar: 'Seguir editando',
        });
        if (!descartar) return;
      }
      descartarBorrador(clave);
      navegacion.volver();
    });

    botones.eliminar?.addEventListener('click', async () => {
      const eliminarlo = await confirmar({
        titulo: `¿Eliminar «${producto.nombre}»?`,
        mensaje: 'Dejará de aparecer en la lista.',
        aceptar: 'Eliminar',
        peligro: true,
      });
      if (!eliminarlo) return;
      try {
        await almacen.eliminarProducto(id);
        descartarBorrador(clave);
        avisar('Producto eliminado');
        navegacion.reemplazar('/listado');
      } catch (error) {
        console.error('No se pudo eliminar el producto:', error);
        aviso.textContent = 'No se pudo eliminar el producto. Inténtalo de nuevo.';
        aviso.hidden = false;
      }
    });
  }

  function activarGuardado({ form, controles, botones, aviso }) {
    let guardando = false;

    // Al corregir un campo desaparece su error.
    form.addEventListener('input', (evento) => {
      const campo = evento.target.closest('.campo')?.dataset.campo;
      if (campo) limpiarError(form, controles, campo);
    });

    form.addEventListener('submit', async (evento) => {
      evento.preventDefault();
      if (guardando) return;
      guardando = true;
      botones.guardar.disabled = true;
      botones.guardar.textContent = 'Guardando…';
      aviso.hidden = true;
      ORDEN_CAMPOS.forEach((campo) => limpiarError(form, controles, campo));

      // La foto es la de la zona de foto: en la edición, la guardada si no se eligió otra.
      const datos = { ...leerValores(controles), foto: fotoActual };
      try {
        // Una foto real nueva se guarda antes que el producto: si falla, no se guarda nada.
        // Si después falla el producto, la foto queda sin usar y la borra la limpieza.
        if (imagenActual && fotoActual.tipo === 'real') await almacen.guardarFoto(fotoActual.valor, imagenActual);
        if (edicion) {
          await almacen.actualizarProducto(id, datos);
        } else {
          await almacen.crearProducto(datos);
        }
        descartarBorrador(clave);
        avisar('Producto guardado');
        if (edicion) navegacion.reemplazar('/listado');
        else navegacion.volver();
      } catch (error) {
        if (error instanceof ErrorValidacion) {
          mostrarErrores(form, controles, error.campos, aviso);
        } else {
          console.error('No se pudo guardar el producto:', error);
          aviso.textContent = 'No se pudo guardar el producto. Inténtalo de nuevo.';
          aviso.hidden = false;
        }
        guardando = false;
        botones.guardar.disabled = false;
        botones.guardar.textContent = 'Guardar';
      }
    });
  }

  return { elemento, cargado: cargar() };
}
