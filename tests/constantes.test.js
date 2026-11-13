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
