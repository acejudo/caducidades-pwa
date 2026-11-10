// Deslizar para eliminar en el Listado (design.md §8). Spec: openspec/specs/product-list.
// Las funciones puras deciden el gesto y se prueban en Node (tests/deslizar.test.js); el
// controlador que usa el DOM solo lo toca cuando se llama.

// Ancho del botón Eliminar que queda a la vista al abrir una tarjeta (px).
export const ANCHO_ACCION = 88;

// Hasta este desplazamiento (px) no se decide si el gesto es horizontal o vertical.
const UMBRAL_EJE = 10;

// 'horizontal' | 'vertical', o null si aún no se ha movido lo bastante para saberlo.
export function ejeDelGesto(dx, dy) {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < UMBRAL_EJE) return null;
  return Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
}

// Desplazamiento de la tarjeta (de -ancho a 0) tras mover el dedo `dx` px, partiendo de
// cerrada (0) o abierta (-ancho).
export function desplazamientoLimitado(dx, abierta, ancho) {
  const inicio = abierta ? -ancho : 0;
  return Math.min(0, Math.max(-ancho, inicio + dx));
}

// Al soltar, la tarjeta queda abierta si se ha desplazado más de la mitad del botón.
export function quedaAbierta(desplazamiento, ancho) {
  return -desplazamiento > ancho / 2;
}

// ---------- Controlador (DOM) ----------

// Activa el gesto en las `.tarjeta-deslizable` que haya dentro de `contenedor`, aunque
// se vuelvan a pintar: escucha por delegación. Cada una contiene un `.tarjeta` (lo que se
// mueve) y un `.tarjeta__eliminar` (detrás, a la derecha). Devuelve { cerrar }.
export function activarDeslizar(contenedor) {
  let abierta = null; // .tarjeta-deslizable abierta
  let gesto = null; // { item, x0, y0, eje, estabaAbierta, desplazamiento }
  let clicACancelar = null; // .tarjeta cuyo próximo clic no debe abrir el Detalle

  const tarjetaDe = (item) => item.querySelector('.tarjeta');

  function colocar(item, desplazamiento, { arrastrando = false } = {}) {
    const tarjeta = tarjetaDe(item);
    item.classList.toggle('tarjeta-deslizable--arrastrando', arrastrando);
    tarjeta.style.transform = desplazamiento ? `translateX(${desplazamiento}px)` : '';
  }

  // Un toque fuera de la tarjeta abierta la cierra.
  function alTocarFuera(evento) {
    if (abierta && !abierta.contains(evento.target)) cerrar();
  }

  function abrir(item) {
    if (abierta && abierta !== item) cerrar();
    abierta = item;
    item.classList.add('tarjeta-deslizable--abierta');
    colocar(item, -ANCHO_ACCION);
    document.addEventListener('pointerdown', alTocarFuera, true);
  }

  function cerrar(item = abierta) {
    if (!item) return;
    item.classList.remove('tarjeta-deslizable--abierta');
    colocar(item, 0);
    if (item === abierta) {
      abierta = null;
      document.removeEventListener('pointerdown', alTocarFuera, true);
    }
  }

  contenedor.addEventListener('pointerdown', (evento) => {
    clicACancelar = null;
    if (abierta && !abierta.isConnected) cerrar(); // la lista se volvió a pintar
    const item = evento.target.closest('.tarjeta-deslizable');
    if (!item || !evento.isPrimary || evento.target.closest('.tarjeta__eliminar')) return;
    gesto = {
      item,
      x0: evento.clientX,
      y0: evento.clientY,
      eje: null,
      estabaAbierta: item === abierta,
      desplazamiento: item === abierta ? -ANCHO_ACCION : 0,
    };
  });

  contenedor.addEventListener('pointermove', (evento) => {
    if (!gesto || !evento.isPrimary) return;
    const dx = evento.clientX - gesto.x0;
    gesto.eje ??= ejeDelGesto(dx, evento.clientY - gesto.y0);
    if (gesto.eje !== 'horizontal') return; // vertical: lo desplaza el navegador (pan-y)
    gesto.desplazamiento = desplazamientoLimitado(dx, gesto.estabaAbierta, ANCHO_ACCION);
    colocar(gesto.item, gesto.desplazamiento, { arrastrando: true });
  });

  contenedor.addEventListener('pointerup', (evento) => {
    if (!gesto || !evento.isPrimary) return;
    const { item, eje, estabaAbierta, desplazamiento } = gesto;
    gesto = null;
    if (eje === 'horizontal') {
      clicACancelar = tarjetaDe(item);
      if (quedaAbierta(desplazamiento, ANCHO_ACCION)) abrir(item);
      else cerrar(item);
    } else if (eje === null && estabaAbierta) {
      // Tocar la tarjeta abierta la cierra sin abrir el Detalle.
      clicACancelar = tarjetaDe(item);
      cerrar(item);
    }
  });

  contenedor.addEventListener('pointercancel', () => {
    if (!gesto) return;
    const { item, estabaAbierta } = gesto;
    gesto = null;
    if (estabaAbierta) abrir(item);
    else cerrar(item);
  });

  // En fase de captura, antes de que llegue al enlace: sin navegación por defecto, no
  // abre el Detalle.
  contenedor.addEventListener('click', (evento) => {
    const tarjeta = evento.target.closest('.tarjeta');
    if (tarjeta && tarjeta === clicACancelar) evento.preventDefault();
    clicACancelar = null;
  }, true);

  return { cerrar: () => cerrar() };
}
