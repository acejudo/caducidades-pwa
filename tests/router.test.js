// Pruebas de la búsqueda de rutas del router (src/js/router.js), sin navegador: el
// módulo no toca window al cargarse. Spec: app-navigation.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const router = await import('../src/js/router.js').catch((error) => {
  console.error(`No se pudo cargar router.js: ${error.message}`);
  return {};
});

router.registrar?.('/producto/:id', {});

test('Porcentaje mal formado', () => {
  assert.equal(typeof router.encontrar, 'function', 'encontrar está exportado');
  assert.equal(router.encontrar('/producto/%E0%A4%A'), null);
  assert.equal(router.encontrar('/producto/100%'), null);
});

test('una ruta bien codificada se sigue decodificando', () => {
  assert.equal(router.encontrar('/producto/caf%C3%A9')?.params.id, 'café');
});
