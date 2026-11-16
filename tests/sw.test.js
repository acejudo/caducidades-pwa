// Pruebas de src/sw.js: se carga en un entorno simulado con node:vm (sin navegador).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const FUENTE = readFileSync(new URL('../src/sw.js', import.meta.url), 'utf8');
const BASE = 'https://ejemplo.test/caducidades-pwa/';

// En el Service Worker las URL relativas se resuelven contra su ubicación; en Node no.
class RequestSW extends Request {
  constructor(url, opciones) {
    super(new URL(url, BASE), opciones);
  }
}

// Carga sw.js con `self` y `caches` simulados y devuelve lo que pidió al instalarse.
async function instalar() {
  const oyentes = {};
  const peticiones = [];
  const self = {
    addEventListener: (tipo, fn) => { oyentes[tipo] = fn; },
    skipWaiting: async () => {},
    clients: { claim: async () => {} },
    location: { origin: 'https://ejemplo.test' },
  };
  const caches = {
    open: async () => ({ addAll: async (lista) => { peticiones.push(...lista); } }),
    keys: async () => [],
    delete: async () => true,
    match: async () => undefined,
  };
  vm.runInNewContext(FUENTE, { self, caches, Request: RequestSW, URL, fetch: () => { throw new Error('sin red'); } });
  const esperas = [];
  oyentes.install({ waitUntil: (promesa) => esperas.push(promesa) });
  await Promise.all(esperas);
  return { peticiones, shell: vm.runInNewContext(`${FUENTE}; SHELL_FILES`, { self, caches, Request, URL }) };
}

test('la instalación precarga todos los archivos del shell', async () => {
  const { peticiones, shell } = await instalar();
  const urls = peticiones.map((p) => (typeof p === 'string' ? p : `./${p.url.slice(BASE.length)}`));
  assert.equal(peticiones.length, shell.length);
  assert.ok(urls.includes('./js/listado.js'));
});

test('la precarga no usa copias antiguas de la caché HTTP', async () => {
  const { peticiones } = await instalar();
  for (const p of peticiones) {
    assert.ok(p instanceof Request, `se esperaba un Request y no ${JSON.stringify(p)}`);
    assert.equal(p.cache, 'reload', p.url);
  }
});

test('las fotos predeterminadas están en el shell', async () => {
  const { FOTOS_PREDETERMINADAS } = await import('../src/js/fotos.js');
  const { shell } = await instalar();
  for (const { id } of FOTOS_PREDETERMINADAS) {
    assert.ok(shell.includes(`./img/predeterminadas/${id}.svg`), `falta ${id}.svg en SHELL_FILES`);
  }
});

test('todos los módulos de src/js están en el shell (salvo el ejemplo de configuración)', async () => {
  const { readdirSync } = await import('node:fs');
  const { shell } = await instalar();
  const modulos = readdirSync(new URL('../src/js/', import.meta.url))
    .filter((nombre) => nombre.endsWith('.js') && nombre !== 'config.local.example.js');
  for (const nombre of modulos) {
    assert.ok(shell.includes(`./js/${nombre}`), `falta ./js/${nombre} en SHELL_FILES`);
  }
  assert.ok(shell.includes('./js/fotos-reales.js'), 'falta ./js/fotos-reales.js en SHELL_FILES');
});
