// Router por hash (#/ruta). Las rutas se comparan en el orden en que se registran,
// así que las estáticas (`producto/nuevo`) deben ir antes que las de parámetro (`producto/:id`).
//
// Cada entrada del historial guarda en `history.state.profundidad` cuántas pantallas
// de la app hay detrás de ella. Así `volver()` sabe si `history.back()` se queda
// dentro de la app o si debe ir a la ruta padre.

export const RUTA_POR_DEFECTO = '/listado';

const rutas = [];
let guard = null;
let alCambiar = () => {};
let profundidad = 0;
let actual = null;

export function registrar(patron, opciones) {
  const nombres = [];
  const fuente = patron
    .split('/')
    .map((parte) => {
      if (!parte.startsWith(':')) return parte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      nombres.push(parte.slice(1));
      return '([^/]+)';
    })
    .join('/');
  rutas.push({ patron, regex: new RegExp(`^${fuente}$`), nombres, ...opciones });
}

// `fn(destino)` recibe { ruta, path, params } y devuelve true o el path al que redirigir.
export function setGuard(fn) {
  guard = fn;
}

export function navegar(path) {
  location.hash = `#${path}`;
}

export function rutaActual() {
  return actual;
}

export function volver() {
  if (!actual) return;
  if (profundidad > 0) {
    history.back();
  } else if (actual.ruta.padre) {
    reemplazar(resolver(actual.ruta.padre, actual.params));
  }
}

export function iniciar(callback) {
  alCambiar = callback;
  profundidad = history.state?.profundidad ?? 0;
  history.replaceState({ profundidad }, '');
  window.addEventListener('hashchange', alCambiarHash);
  procesar();
}

function alCambiarHash() {
  // Entrada nueva (enlace o navegar): no trae estado. Atrás/Adelante: lo recupera.
  if (history.state?.profundidad == null) {
    profundidad += 1;
    history.replaceState({ profundidad }, '');
  } else {
    profundidad = history.state.profundidad;
  }
  procesar();
}

function procesar() {
  const path = location.hash.slice(1);
  const destino = encontrar(path);
  if (!destino) {
    reemplazar(RUTA_POR_DEFECTO);
    return;
  }
  if (guard) {
    const resultado = guard(destino);
    if (resultado !== true) {
      reemplazar(resultado);
      return;
    }
  }
  actual = destino;
  alCambiar(destino);
}

// Cambia la URL sin añadir una entrada al historial y vuelve a procesar.
function reemplazar(path) {
  history.replaceState({ profundidad }, '', `#${path}`);
  procesar();
}

function encontrar(path) {
  for (const ruta of rutas) {
    const coincidencia = ruta.regex.exec(path);
    if (!coincidencia) continue;
    const params = Object.fromEntries(
      ruta.nombres.map((nombre, i) => [nombre, decodeURIComponent(coincidencia[i + 1])]),
    );
    return { ruta, path, params };
  }
  return null;
}

function resolver(patron, params) {
  return patron.replace(/:([^/]+)/g, (_, nombre) => encodeURIComponent(params[nombre] ?? ''));
}
