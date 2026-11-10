// Pruebas del catálogo de fotos predeterminadas (src/js/fotos.js) y de sus SVG.
// Spec: openspec/specs/product-photos.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';

// Import tolerante: si el módulo aún no existe, cada prueba falla por separado (rojo).
const fotos = await import('../src/js/fotos.js').catch((error) => {
  console.error(`No se pudo cargar fotos.js: ${error.message}`);
  return {};
});
const { FOTOS_PREDETERMINADAS, buscarFoto, urlFoto, filtrarFotos, fotoDeProducto } = fotos;

const IDS_SPEC = ['yogur', 'leche', 'pollo', 'queso', 'huevos', 'salmon', 'manzana', 'platano', 'tomate', 'pan', 'arroz', 'generico'];

const ids = (lista) => lista.map((foto) => foto.id);

describe('Catálogo de fotos predeterminadas', () => {
  test('Ids de la SPEC', () => {
    const todos = ids(FOTOS_PREDETERMINADAS);
    for (const id of IDS_SPEC) assert.ok(todos.includes(id), `falta ${id}`);
    assert.equal(new Set(todos).size, todos.length, 'hay ids repetidos');
    for (const id of todos) assert.match(id, /^[a-z]+$/);
    assert.equal(todos.at(-1), 'generico');
    assert.ok(Object.isFrozen(FOTOS_PREDETERMINADAS));
  });

  test('Nombres en español', () => {
    assert.equal(buscarFoto('salmon').nombre, 'Salmón');
    assert.equal(buscarFoto('platano').nombre, 'Plátano');
    assert.equal(buscarFoto('generico').nombre, 'Genérico');
  });

  test('buscarFoto devuelve null con un id desconocido', () => {
    assert.equal(buscarFoto('kiwi'), null);
    assert.equal(buscarFoto(null), null);
  });

  test('urlFoto apunta al SVG de la foto', () => {
    assert.match(urlFoto('leche'), /\/img\/predeterminadas\/leche\.svg$/);
  });
});

describe('Foto de un producto', () => {
  test('Foto predeterminada conocida', () => {
    const foto = fotoDeProducto({ foto: { tipo: 'predeterminada', valor: 'leche' } });
    assert.equal(foto.id, 'leche');
    assert.equal(foto.nombre, 'Leche');
    assert.equal(foto.url, urlFoto('leche'));
  });

  test('Id desconocido', () => {
    assert.equal(fotoDeProducto({ foto: { tipo: 'predeterminada', valor: 'kiwi' } }), null);
  });

  test('Foto real todavía no disponible', () => {
    assert.equal(fotoDeProducto({ foto: { tipo: 'real', valor: 'abc.jpg' } }), null);
  });

  test('Sin foto', () => {
    assert.equal(fotoDeProducto({ foto: { tipo: 'ninguna', valor: null } }), null);
    assert.equal(fotoDeProducto({}), null);
  });
});

describe('Búsqueda de fotos', () => {
  test('Buscar sin acento', () => {
    assert.deepEqual(ids(filtrarFotos('platano')), ['platano']);
  });

  test('Buscar parte del nombre', () => {
    const resultado = ids(filtrarFotos('LE'));
    assert.ok(resultado.includes('leche'));
    assert.ok(!resultado.includes('pan'));
    for (const id of resultado) assert.match(buscarFoto(id).nombre.toLowerCase(), /le/);
  });

  test('Sin coincidencias', () => {
    assert.deepEqual(filtrarFotos('zzz'), []);
  });

  test('Buscador vacío muestra todas', () => {
    assert.deepEqual(ids(filtrarFotos('')), ids(FOTOS_PREDETERMINADAS));
    assert.deepEqual(ids(filtrarFotos('   ')), ids(FOTOS_PREDETERMINADAS));
  });
});

describe('Archivos de las fotos predeterminadas', () => {
  test('cada foto del catálogo tiene un SVG ligero y sin contenido activo', () => {
    for (const { id } of FOTOS_PREDETERMINADAS) {
      const ruta = new URL(`../src/img/predeterminadas/${id}.svg`, import.meta.url);
      assert.ok(existsSync(ruta), `falta ${id}.svg`);
      const svg = readFileSync(ruta, 'utf8');
      assert.match(svg, /<svg[^>]*viewBox="0 0 96 96"/, `${id}.svg sin viewBox`);
      assert.doesNotMatch(svg, /<script|\son\w+=/i, `${id}.svg con contenido activo`);
      assert.doesNotMatch(svg, /href=|url\(/i, `${id}.svg con referencias`);
      assert.ok(statSync(ruta).size < 4096, `${id}.svg pesa 4 KB o más`);
    }
  });
});
