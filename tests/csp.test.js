// Prueba de la Content-Security-Policy de src/index.html (pwa-shell, "Política de
// seguridad de contenido"; endurecimiento-seguridad, design.md §3).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../src/index.html', import.meta.url), 'utf8');
const meta = /<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]*)"\s*>/i.exec(html);

// { directiva: [fuentes] } a partir del texto de la política.
function directivas(politica) {
  return Object.fromEntries(politica.split(';').map((d) => d.trim()).filter(Boolean)
    .map((d) => { const [nombre, ...fuentes] = d.split(/\s+/); return [nombre, fuentes]; }));
}

const ESPERADAS = {
  'default-src': ["'self'"],
  'script-src': ["'self'", 'https://accounts.google.com/gsi/client'],
  'style-src': ["'self'", 'https://accounts.google.com/gsi/style'],
  'img-src': ["'self'", 'blob:'],
  'connect-src': ["'self'", 'https://www.googleapis.com', 'https://oauth2.googleapis.com', 'https://accounts.google.com/gsi/'],
  'frame-src': ['https://accounts.google.com/gsi/'],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'manifest-src': ["'self'"],
  'worker-src': ["'self'"],
};

test('Política declarada', () => {
  assert.ok(meta, 'index.html declara un <meta http-equiv="Content-Security-Policy">');
  assert.deepEqual(directivas(meta[1]), ESPERADAS);
});

test('sin unsafe-inline, unsafe-eval ni comodines', () => {
  assert.ok(meta);
  for (const prohibido of ["'unsafe-inline'", "'unsafe-eval'", '*']) {
    for (const [nombre, fuentes] of Object.entries(directivas(meta[1]))) {
      assert.ok(!fuentes.includes(prohibido), `${nombre} no incluye ${prohibido}`);
    }
  }
});

test('la política va antes del primer script', () => {
  assert.ok(meta);
  assert.ok(html.indexOf(meta[0]) < html.indexOf('<script'), 'el <meta> va antes del primer <script>');
});
