// Diálogo de confirmación modal, en español y accesible (<dialog> + showModal()).
// Spec: openspec/specs/product-form ("Diálogo de confirmación").

import { el } from './utils.js';

let contador = 0;

// Muestra el diálogo y resuelve true solo si se pulsa la acción; false con la
// alternativa o con Escape. El foco empieza en la alternativa (un Enter accidental no
// ejecuta la acción) y al cerrar vuelve a quien lo tenía.
export function confirmar({ titulo, mensaje, aceptar, cancelar = 'Cancelar', peligro = false }) {
  const anterior = document.activeElement;
  const id = `dialogo-${++contador}`;

  return new Promise((resolver) => {
    const botonAceptar = el('button', {
      type: 'button',
      class: `btn btn--bloque ${peligro ? 'btn--peligro' : 'btn--primario'}`,
      text: aceptar,
    });
    const botonCancelar = el('button', { type: 'button', class: 'btn btn--bloque btn--secundario', text: cancelar });
    const dialogo = el('dialog', { class: 'dialogo', 'aria-labelledby': `${id}-titulo`, 'aria-describedby': `${id}-mensaje` },
      el('h2', { id: `${id}-titulo`, class: 'dialogo__titulo', text: titulo }),
      el('p', { id: `${id}-mensaje`, class: 'dialogo__mensaje', text: mensaje }),
      el('div', { class: 'dialogo__acciones' }, botonAceptar, botonCancelar),
    );

    let resuelto = false;
    const cerrar = (resultado) => {
      if (resuelto) return;
      resuelto = true;
      if (dialogo.open) dialogo.close();
      dialogo.remove();
      if (anterior instanceof HTMLElement && anterior.isConnected) anterior.focus();
      resolver(resultado);
    };

    botonAceptar.addEventListener('click', () => cerrar(true));
    botonCancelar.addEventListener('click', () => cerrar(false));
    // Escape dispara "cancel": se cierra sin hacer la acción.
    dialogo.addEventListener('cancel', (evento) => {
      evento.preventDefault();
      cerrar(false);
    });

    document.body.append(dialogo);
    dialogo.showModal();
    botonCancelar.focus();
  });
}
