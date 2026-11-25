// Pruebas de las constantes compartidas (src/js/constantes.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';

const constantes = await import('../src/js/constantes.js');

test('constantes de Google Drive', () => {
  assert.equal(constantes.DRIVE_SCOPE, 'https://www.googleapis.com/auth/drive');
  assert.equal(constantes.DRIVE_CARPETA, 'Caducidades');
  assert.equal(constantes.DRIVE_ARCHIVO, 'caducidades.json');
  assert.equal(constantes.DRIVE_CARPETA_FOTOS, 'fotos');
});

test('límites de datos (endurecimiento-seguridad)', () => {
  assert.equal(constantes.NOTAS_MAX, 1000);
  assert.equal(constantes.UNIDAD_MAX, 20);
  assert.equal(constantes.PRODUCTOS_MAX, 2000);
  assert.equal(constantes.ARCHIVO_MAX_BYTES, 5 * 1024 * 1024);
  assert.equal(constantes.MARGEN_FUTURO_MS, 86_400_000);
});

test('cantidad máxima (validacion-datos-drive)', () => {
  assert.equal(constantes.CANTIDAD_MAX, 9999);
});

test('tope del listado de fotos (validacion-datos-drive)', () => {
  assert.equal(constantes.FOTOS_LISTADO_MAX, constantes.PRODUCTOS_MAX);
});
