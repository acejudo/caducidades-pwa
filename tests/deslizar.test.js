// Pruebas de la lógica pura del gesto de deslizar (src/js/deslizar.js).
// Spec: product-list ("Deslizar para mostrar Eliminar").
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Import tolerante: si el módulo aún no existe, cada prueba falla por separado (rojo).
const deslizar = await import('../src/js/deslizar.js').catch((error) => {
  console.error(`No se pudo cargar deslizar.js: ${error.message}`);
  return {};
});
const { ejeDelGesto, desplazamientoLimitado, quedaAbierta, ANCHO_ACCION } = deslizar;

describe('Gesto de deslizar', () => {
  test('el eje no se decide por debajo de 10 px', () => {
    assert.equal(ejeDelGesto(0, 0), null);
    assert.equal(ejeDelGesto(-9, 3), null);
    assert.equal(ejeDelGesto(6, -9), null);
  });

  test('Deslizar lo suficiente: un gesto sobre todo horizontal es horizontal', () => {
    assert.equal(ejeDelGesto(-12, 4), 'horizontal');
    assert.equal(ejeDelGesto(30, -20), 'horizontal');
  });

  test('Gesto vertical', () => {
    assert.equal(ejeDelGesto(4, 12), 'vertical');
    assert.equal(ejeDelGesto(-10, -10), 'vertical');
  });

  test('el desplazamiento queda entre -ancho y 0 partiendo de cerrada', () => {
    assert.equal(desplazamientoLimitado(-30, false, 88), -30);
    assert.equal(desplazamientoLimitado(-200, false, 88), -88);
    assert.equal(desplazamientoLimitado(25, false, 88), 0);
  });

  test('el desplazamiento queda entre -ancho y 0 partiendo de abierta', () => {
    assert.equal(desplazamientoLimitado(30, true, 88), -58);
    assert.equal(desplazamientoLimitado(-30, true, 88), -88);
    assert.equal(desplazamientoLimitado(200, true, 88), 0);
  });

  test('Deslizar poco: solo queda abierta pasada la mitad del botón', () => {
    assert.equal(quedaAbierta(-45, 88), true);
    assert.equal(quedaAbierta(-44, 88), false);
    assert.equal(quedaAbierta(-10, 88), false);
    assert.equal(quedaAbierta(0, 88), false);
  });

  test('ancho del botón Eliminar', () => {
    assert.equal(ANCHO_ACCION, 88);
  });
});
