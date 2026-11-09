// Pruebas de src/js/formato.js (formato de fechas y cantidades en español).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Import tolerante: si el módulo aún no existe, cada prueba falla por separado (rojo).
const { formatearFecha, formatearCantidad } = await import('../src/js/formato.js').catch((error) => {
  console.error(`No se pudo cargar formato.js: ${error.message}`);
  return {};
});

describe('formato: fechas', () => {
  test('fecha de caducidad en español', () => {
    assert.equal(formatearFecha('2026-11-20'), '20 nov 2026');
  });

  test('los doce meses', () => {
    const meses = Array.from({ length: 12 }, (_, i) => formatearFecha(`2026-${String(i + 1).padStart(2, '0')}-15`));
    assert.deepEqual(meses, [
      '15 ene 2026', '15 feb 2026', '15 mar 2026', '15 abr 2026', '15 may 2026', '15 jun 2026',
      '15 jul 2026', '15 ago 2026', '15 sept 2026', '15 oct 2026', '15 nov 2026', '15 dic 2026',
    ]);
  });

  test('día sin cero a la izquierda', () => {
    assert.equal(formatearFecha('2027-01-05'), '5 ene 2027');
  });

  test('no depende de la zona horaria', () => {
    const anterior = process.env.TZ;
    try {
      for (const tz of ['UTC', 'Pacific/Kiritimati', 'America/Los_Angeles']) {
        process.env.TZ = tz;
        assert.equal(formatearFecha('2026-01-01'), '1 ene 2026', tz);
      }
    } finally {
      process.env.TZ = anterior;
    }
  });
});

describe('formato: cantidades', () => {
  test('entero con unidad', () => {
    assert.equal(formatearCantidad(1, 'ud'), '1 ud');
    assert.equal(formatearCantidad(12, 'pack'), '12 pack');
  });

  test('decimales con coma y sin ceros sobrantes', () => {
    assert.equal(formatearCantidad(0.5, 'kg'), '0,5 kg');
    assert.equal(formatearCantidad(2.25, 'kg'), '2,25 kg');
    assert.equal(formatearCantidad(1.10, 'l'), '1,1 l');
  });

  test('como máximo dos decimales', () => {
    assert.equal(formatearCantidad(1 / 3, 'kg'), '0,33 kg');
    assert.equal(formatearCantidad(2.999, 'kg'), '3 kg');
  });
});
