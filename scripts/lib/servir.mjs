// Resolución segura de rutas para los servidores locales de los scripts de desarrollo
// (probar-navegador.mjs y captura-app.mjs). Pura: se prueba en tests/scripts.test.js.
//
// Devuelve la ruta absoluta del archivo que corresponde a `pathname` dentro de `raiz`, o
// null si no se debe servir:
// - la URL está mal codificada (un `%` suelto);
// - algún segmento empieza por punto (`.git`, `.env`, `..`…) o lleva una barra invertida;
// - hay `permitidas` y el primer segmento no es una de ellas;
// - la ruta final sale de `raiz`.
// A una ruta que termina en `/` se le añade `index.html`.

import { join, normalize, sep } from 'node:path';

export function resolverArchivo({ raiz, permitidas = null, pathname }) {
  let ruta;
  try {
    ruta = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (ruta.endsWith('/')) ruta += 'index.html';
  const segmentos = ruta.split('/').filter(Boolean);
  if (segmentos.some((s) => s.startsWith('.') || s.includes('\\'))) return null;
  if (permitidas && !permitidas.includes(segmentos[0])) return null;
  const base = normalize(raiz);
  const archivo = normalize(join(base, ...segmentos));
  if (!archivo.startsWith(base.endsWith(sep) ? base : base + sep)) return null;
  return archivo;
}
