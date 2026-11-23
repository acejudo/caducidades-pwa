// Pruebas de las utilidades puras de los scripts de desarrollo (scripts/lib/). Solo se
// importa scripts/lib/: los scripts completos arrancan servidores y navegadores.
// endurecimiento-seguridad, design.md §7.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const servir = await import('../scripts/lib/servir.mjs').catch(() => ({}));
const cdp = await import('../scripts/lib/cdp.mjs').catch(() => ({}));

const RAIZ = join(tmpdir(), 'repo-falso');
const resolver = (pathname, permitidas = ['src', 'tests']) => servir.resolverArchivo?.({ raiz: RAIZ, permitidas, pathname });

describe('resolverArchivo', () => {
  test('niega .git, archivos con punto y salidas de la raíz', () => {
    assert.equal(typeof servir.resolverArchivo, 'function');
    for (const ruta of ['/.git/config', '/src/.env', '/tests/.claude/x', '/../x', '/%2e%2e/x', '/src/..%5c..%5cx', '/src\\..\\..\\x']) {
      assert.equal(resolver(ruta), null, ruta);
    }
  });

  test('niega lo que no está en las carpetas permitidas', () => {
    assert.equal(resolver('/docs/security/REPORT.md'), null);
    assert.equal(resolver('/package.json'), null);
    assert.equal(resolver('/'), null);
  });

  test('una URL mal codificada no lanza: null', () => {
    assert.equal(resolver('/src/%E0%A4%A'), null);
  });

  test('acepta src y tests, y añade index.html a las carpetas', () => {
    assert.equal(resolver('/tests/navegador/'), join(RAIZ, 'tests', 'navegador', 'index.html'));
    assert.equal(resolver('/src/js/app.js'), join(RAIZ, 'src', 'js', 'app.js'));
    assert.equal(resolver('/src/img/caf%C3%A9.svg'), join(RAIZ, 'src', 'img', 'café.svg'));
  });

  test('sin carpetas permitidas, sirve toda la raíz (salvo lo que empieza por punto)', () => {
    assert.equal(resolver('/js/app.js', null), join(RAIZ, 'js', 'app.js'));
    assert.equal(resolver('/', null), join(RAIZ, 'index.html'));
    assert.equal(resolver('/.well-known/x', null), null);
  });
});

describe('separarMensajes (CDP por tubería)', () => {
  test('un mensaje partido en dos trozos', () => {
    assert.equal(typeof cdp.separarMensajes, 'function');
    const primero = cdp.separarMensajes('', '{"id":1,"res');
    assert.deepEqual(primero.mensajes, []);
    const segundo = cdp.separarMensajes(primero.resto, 'ult":{}}\0');
    assert.deepEqual(segundo.mensajes, [{ id: 1, result: {} }]);
    assert.equal(segundo.resto, '');
  });

  test('dos mensajes en un trozo y un resto sin terminar', () => {
    const { mensajes, resto } = cdp.separarMensajes('', '{"id":1}\0{"id":2}\0{"id"');
    assert.deepEqual(mensajes, [{ id: 1 }, { id: 2 }]);
    assert.equal(resto, '{"id"');
  });
});
