// Pantalla Elegir foto: cuadrícula de fotos predeterminadas con buscador, "Hacer foto",
// "Elegir de la galería" y "Sin foto". Spec: openspec/specs/product-photos. No importa
// ui.js, auth.js ni config.js, para poder probarse sin config.local.js
// (tests/navegador/elegir-foto.test.js).

import { FOTOS_PREDETERMINADAS, filtrarFotos, urlFoto } from './fotos.js';
import { comprimirFoto } from './fotos-reales.js';
import { leerBorrador, guardarBorrador } from './borradores.js';
import { ICONOS } from './iconos.js';
import { volver } from './router.js';
import { el, icono } from './utils.js';

const SIN_FOTO = Object.freeze({ tipo: 'ninguna', valor: null });

// Crea la pantalla. `para` es la clave del borrador del formulario de origen ('nuevo' o
// 'editar:<id>'): de ahí se lee la foto actual y ahí se deja la elegida antes de volver
// (design.md §3 y §5 de ui-detalle-y-fotos; §4 de fotos-reales). `comprimir` se sustituye
// en las pruebas. Devuelve { elemento, cargado } como las demás pantallas.
export function crearPantallaElegirFoto({ para, navegacion = { volver }, comprimir = comprimirFoto } = {}) {
  const actual = leerBorrador(para)?.foto;
  const seleccionada = actual?.tipo === 'predeterminada' ? actual.valor : null;
  // Mientras se vuelve o se prepara una foto se ignoran los demás toques: un doble toque
  // no debe asignar dos fotos ni volver dos veces (la segunda saldría del formulario).
  let ocupada = false;

  // Deja la foto en el borrador y vuelve. `imagen` es el Blob de una foto real aún no
  // guardada; con una predeterminada o "Sin foto" se quita la de antes.
  function asignar(foto, imagen = null) {
    const { imagen: _anterior, ...resto } = leerBorrador(para) ?? {};
    guardarBorrador(para, imagen ? { ...resto, foto, imagen } : { ...resto, foto });
    navegacion.volver();
  }

  function elegir(foto) {
    if (ocupada) return;
    ocupada = true;
    asignar(foto);
  }

  const estado = el('p', { class: 'fotos__estado', role: 'status', hidden: true });

  function mostrarEstado(texto, { error = false } = {}) {
    estado.textContent = texto ?? '';
    estado.hidden = !texto;
    estado.classList.toggle('fotos__estado--error', error);
  }

  async function usarArchivo(entrada) {
    const [archivo] = entrada.files ?? [];
    entrada.value = ''; // para poder elegir otra vez el mismo archivo
    if (!archivo || ocupada) return; // cancelado, o ya se está usando otra foto
    ocupada = true;
    mostrarEstado('Preparando foto…');
    try {
      const { nombre, blob } = await comprimir(archivo);
      mostrarEstado(null);
      asignar({ tipo: 'real', valor: nombre }, blob);
    } catch (error) {
      console.warn('No se pudo usar la foto:', error);
      mostrarEstado('No se pudo usar esta foto', { error: true });
      ocupada = false;
    }
  }

  // Un <input type="file"> oculto por botón: con `capture` abre la cámara; sin él, las fotos.
  function entradaDeArchivo(conCamara) {
    const entrada = el('input', {
      type: 'file',
      accept: 'image/*',
      capture: conCamara ? 'environment' : null,
      class: 'fotos__archivo', // oculto con CSS: con display:none algún Safari no lo abre
      tabindex: '-1',
      'aria-hidden': 'true',
    });
    entrada.addEventListener('change', () => usarArchivo(entrada));
    return entrada;
  }

  const camara = entradaDeArchivo(true);
  const galeria = entradaDeArchivo(false);
  const abrir = (entrada) => () => {
    if (!ocupada) entrada.click();
  };

  const casillas = new Map(FOTOS_PREDETERMINADAS.map(({ id, nombre }) => {
    const marcada = id === seleccionada;
    const boton = el('button', {
      type: 'button',
      class: `foto${marcada ? ' foto--seleccionada' : ''}`,
      'aria-pressed': String(marcada),
      onClick: () => elegir({ tipo: 'predeterminada', valor: id }),
    },
    el('img', { src: urlFoto(id), alt: '', width: 64, height: 64, class: 'foto__imagen' }),
    el('span', { class: 'foto__nombre', text: nombre }),
    marcada && el('span', { class: 'foto__check' }, icono(ICONOS.check)));
    return [id, el('li', {}, boton)];
  }));

  const sinResultados = el('p', { class: 'fotos__vacio', text: 'No hay fotos que coincidan', hidden: true });
  const buscador = el('input', {
    type: 'search',
    class: 'buscador__campo',
    placeholder: 'Buscar producto…',
    'aria-label': 'Buscar foto',
    autocomplete: 'off',
    enterkeyhint: 'search',
  });
  buscador.addEventListener('input', () => {
    const coinciden = new Set(filtrarFotos(buscador.value).map((foto) => foto.id));
    for (const [id, li] of casillas) li.hidden = !coinciden.has(id);
    sinResultados.hidden = coinciden.size > 0;
  });

  const elemento = el('section', { class: 'elegir-foto' },
    el('label', { class: 'buscador' }, icono(ICONOS.buscar), buscador),
    el('ul', { class: 'fotos' }, [...casillas.values()]),
    sinResultados,
    el('div', { class: 'fotos__acciones' },
      estado,
      el('button', { type: 'button', class: 'btn btn--primario btn--bloque', onClick: abrir(camara) },
        icono(ICONOS.camara), el('span', { text: 'Hacer foto' })),
      el('button', {
        type: 'button',
        class: 'btn btn--secundario btn--bloque',
        onClick: () => elegir({ ...SIN_FOTO }),
      }, el('span', { text: 'Sin foto' })),
      el('button', { type: 'button', class: 'btn btn--secundario btn--bloque fotos__galeria', onClick: abrir(galeria) },
        icono(ICONOS.imagen), el('span', { text: 'Elegir de la galería' })),
      camara,
      galeria,
    ),
  );

  return { elemento, cargado: Promise.resolve() };
}
