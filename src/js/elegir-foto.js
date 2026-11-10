// Pantalla Elegir foto: cuadrícula de fotos predeterminadas con buscador, "Sin foto" y
// "Hacer foto" (preparado, desactivado hasta las fotos reales).
// Spec: openspec/specs/product-photos. No importa ui.js, auth.js ni config.js, para
// poder probarse sin config.local.js (tests/navegador/elegir-foto.test.js).

import { FOTOS_PREDETERMINADAS, filtrarFotos, urlFoto } from './fotos.js';
import { leerBorrador, guardarBorrador } from './borradores.js';
import { ICONOS } from './iconos.js';
import { volver } from './router.js';
import { el, icono } from './utils.js';

const SIN_FOTO = Object.freeze({ tipo: 'ninguna', valor: null });

// Crea la pantalla. `para` es la clave del borrador del formulario de origen ('nuevo' o
// 'editar:<id>'): de ahí se lee la foto actual y ahí se deja la elegida antes de volver
// (design.md §3 y §5). Devuelve { elemento, cargado } como las demás pantallas.
export function crearPantallaElegirFoto({ para, navegacion = { volver } } = {}) {
  const actual = leerBorrador(para)?.foto;
  const seleccionada = actual?.tipo === 'predeterminada' ? actual.valor : null;
  let volviendo = false;

  function elegir(foto) {
    // Un doble toque no debe volver dos veces (la segunda saldría del formulario).
    if (volviendo) return;
    volviendo = true;
    guardarBorrador(para, { ...leerBorrador(para), foto });
    navegacion.volver();
  }

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
      el('button', { type: 'button', class: 'btn btn--primario btn--bloque fotos__hacer', disabled: true },
        icono(ICONOS.camara),
        el('span', { class: 'fotos__hacer-texto' },
          el('span', { text: 'Hacer foto' }),
          el('span', { class: 'fotos__proximamente', text: 'Próximamente' }))),
      el('button', {
        type: 'button',
        class: 'btn btn--secundario btn--bloque',
        onClick: () => elegir({ ...SIN_FOTO }),
      }, icono(ICONOS.imagen), el('span', { text: 'Sin foto' })),
    ),
  );

  return { elemento, cargado: Promise.resolve() };
}
