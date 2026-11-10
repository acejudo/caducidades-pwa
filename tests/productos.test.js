// Fija la zona horaria antes de crear cualquier fecha (escenario "Cambio de hora").
process.env.TZ = 'Europe/Madrid';

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const constantes = await import('../src/js/constantes.js');
// Import tolerante: si el módulo aún no existe, cada prueba falla por separado (rojo).
const productos = await import('../src/js/productos.js').catch((error) => {
  console.error(`No se pudo cargar productos.js: ${error.message}`);
  return {};
});
const {
  normalizarProducto, validarProducto, nuevoProducto, aplicarCambios,
  diasRestantes, nivelUrgencia, textoCaducidad, ordenarPorCaducidad, marcarEliminado,
  filtrarPorEstado, FILTROS,
} = productos;

// Datos mínimos válidos para partir de ellos en cada prueba.
const MINIMO = Object.freeze({ nombre: 'Yogur', fechaCaducidad: '2026-11-20' });

describe('constantes', () => {
  test('URGENCIA define los límites de rojo y naranja', () => {
    assert.deepEqual(constantes.URGENCIA, { rojoMaxDias: 2, naranjaMaxDias: 7 });
    assert.ok(Object.isFrozen(constantes.URGENCIA));
  });

  test('UNIDADES: las del desplegable del formulario', () => {
    assert.deepEqual([...(constantes.UNIDADES ?? [])], ['ud', 'pack', 'kg', 'g', 'l', 'ml']);
    assert.ok(Object.isFrozen(constantes.UNIDADES));
  });

  test('CATEGORIAS contiene las categorías de docs/SPEC.md', () => {
    assert.deepEqual([...constantes.CATEGORIAS], ['Nevera', 'Congelador', 'Despensa', 'Otros']);
    assert.ok(Object.isFrozen(constantes.CATEGORIAS));
  });
});

describe('product-model: normalización y validación', () => {
  test('Alta mínima', () => {
    const p = normalizarProducto({ ...MINIMO });
    assert.deepEqual(p, {
      nombre: 'Yogur',
      fechaCompra: null,
      fechaCaducidad: '2026-11-20',
      cantidad: 1,
      unidad: 'ud',
      categoria: 'Nevera',
      foto: { tipo: 'ninguna', valor: null },
      notas: null,
    });
    assert.deepEqual(validarProducto(p), {});
  });

  test('Espacios sobrantes', () => {
    const p = normalizarProducto({ ...MINIMO, nombre: '  Leche  ', notas: '   ', fechaCompra: '  ' });
    assert.equal(p.nombre, 'Leche');
    assert.equal(p.notas, null);
    assert.equal(p.fechaCompra, null);
    assert.deepEqual(validarProducto(p), {});
  });

  test('Faltan los obligatorios', () => {
    const errores = validarProducto(normalizarProducto({}));
    assert.deepEqual(Object.keys(errores).sort(), ['fechaCaducidad', 'nombre']);
    assert.equal(errores.nombre, 'El nombre es obligatorio');
    assert.equal(errores.fechaCaducidad, 'La fecha de caducidad es obligatoria');
  });

  test('Fecha inexistente', () => {
    for (const fecha of ['2026-02-30', '2026-13-01', '2026-1-5', 'mañana']) {
      const errores = validarProducto(normalizarProducto({ ...MINIMO, fechaCaducidad: fecha }));
      assert.deepEqual(Object.keys(errores), ['fechaCaducidad'], fecha);
      assert.equal(errores.fechaCaducidad, 'La fecha de caducidad no es válida');
    }
    const compra = validarProducto(normalizarProducto({ ...MINIMO, fechaCompra: '2026-02-29' }));
    assert.deepEqual(compra, { fechaCompra: 'La fecha de compra no es válida' });
  });

  test('Cantidad no válida', () => {
    for (const cantidad of [0, -1, 'abc', '', Number.NaN, Infinity]) {
      const errores = validarProducto(normalizarProducto({ ...MINIMO, cantidad }));
      assert.deepEqual(errores, { cantidad: 'La cantidad debe ser un número mayor que 0' }, String(cantidad));
    }
  });

  test('Categoría desconocida', () => {
    const errores = validarProducto(normalizarProducto({ ...MINIMO, categoria: 'Garaje' }));
    assert.deepEqual(Object.keys(errores), ['categoria']);
    assert.match(errores.categoria, /^La categoría debe ser una de: Nevera, Congelador, Despensa u Otros$/);
  });

  test('Cantidad decimal', () => {
    const p = normalizarProducto({ ...MINIMO, cantidad: 0.5, unidad: 'kg' });
    assert.equal(p.cantidad, 0.5);
    assert.equal(p.unidad, 'kg');
    assert.deepEqual(validarProducto(p), {});
  });

  test('cantidad como texto con coma o punto', () => {
    assert.equal(normalizarProducto({ ...MINIMO, cantidad: '0,5' }).cantidad, 0.5);
    assert.equal(normalizarProducto({ ...MINIMO, cantidad: ' 2.25 ' }).cantidad, 2.25);
    assert.equal(normalizarProducto({ ...MINIMO, cantidad: '3' }).cantidad, 3);
  });

  test('nombre de más de 100 caracteres', () => {
    assert.deepEqual(validarProducto(normalizarProducto({ ...MINIMO, nombre: 'a'.repeat(100) })), {});
    const errores = validarProducto(normalizarProducto({ ...MINIMO, nombre: 'a'.repeat(101) }));
    assert.deepEqual(errores, { nombre: 'El nombre no puede tener más de 100 caracteres' });
  });

  test('unidad vacía', () => {
    const errores = validarProducto(normalizarProducto({ ...MINIMO, unidad: '   ' }));
    assert.deepEqual(errores, { unidad: 'La unidad es obligatoria' });
  });

  test('campos desconocidos descartados', () => {
    const p = normalizarProducto({ ...MINIMO, color: 'rojo', __proto__x: 1 });
    assert.equal('color' in p, false);
    assert.equal('__proto__x' in p, false);
  });

  test('foto: tipo no válido y foto sin valor', () => {
    assert.deepEqual(
      validarProducto(normalizarProducto({ ...MINIMO, foto: { tipo: 'dibujo', valor: 'x' } })),
      { foto: 'El tipo de foto no es válido' },
    );
    assert.deepEqual(
      validarProducto(normalizarProducto({ ...MINIMO, foto: { tipo: 'predeterminada', valor: '  ' } })),
      { foto: 'Falta la foto elegida' },
    );
    const conFoto = normalizarProducto({ ...MINIMO, foto: { tipo: 'predeterminada', valor: ' yogur ' } });
    assert.deepEqual(conFoto.foto, { tipo: 'predeterminada', valor: 'yogur' });
    assert.deepEqual(validarProducto(conFoto), {});
    const sinFoto = normalizarProducto({ ...MINIMO, foto: { tipo: 'ninguna', valor: 'yogur' } });
    assert.deepEqual(sinFoto.foto, { tipo: 'ninguna', valor: null });
  });

  test('ErrorValidacion lleva los campos', () => {
    const error = new productos.ErrorValidacion({ nombre: 'El nombre es obligatorio' });
    assert.ok(error instanceof Error);
    assert.equal(error.name, 'ErrorValidacion');
    assert.deepEqual(error.campos, { nombre: 'El nombre es obligatorio' });
  });
});

describe('product-model: identificador y marca de tiempo', () => {
  const AHORA = new Date('2026-11-09T10:00:00.000Z');
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  const COMPLETO = Object.freeze({
    nombre: 'Salmón',
    fechaCompra: '2026-11-08',
    fechaCaducidad: '2026-11-12',
    cantidad: 2,
    unidad: 'pack',
    categoria: 'Congelador',
    foto: { tipo: 'predeterminada', valor: 'salmon' },
    notas: 'Para el viernes',
  });

  test('Producto completo', () => {
    const p = nuevoProducto({ ...COMPLETO }, AHORA);
    assert.match(p.id, UUID);
    assert.deepEqual(p, { ...COMPLETO, id: p.id, eliminado: false, actualizado: '2026-11-09T10:00:00.000Z' });
  });

  test('alta no válida lanza ErrorValidacion con los campos', () => {
    assert.throws(() => nuevoProducto({ nombre: ' ' }, AHORA), (error) => {
      assert.ok(error instanceof productos.ErrorValidacion);
      assert.deepEqual(Object.keys(error.campos).sort(), ['fechaCaducidad', 'nombre']);
      return true;
    });
  });

  test('Altas consecutivas', () => {
    const a = nuevoProducto({ ...MINIMO }, AHORA);
    const b = nuevoProducto({ ...MINIMO }, AHORA);
    assert.notEqual(a.id, b.id);
  });

  test('Id inmutable', () => {
    const p = nuevoProducto({ ...MINIMO }, AHORA);
    const editado = aplicarCambios(p, { id: 'otro-id', cantidad: 2 }, new Date('2026-11-10T00:00:00Z'));
    assert.equal(editado.id, p.id);
    assert.equal(editado.cantidad, 2);
  });

  test('Valor de entrada ignorado: actualizado', () => {
    const viejo = '2000-01-01T00:00:00.000Z';
    const p = nuevoProducto({ ...MINIMO, actualizado: viejo }, AHORA);
    assert.equal(p.actualizado, AHORA.toISOString());
    const despues = new Date('2026-11-10T08:30:00.000Z');
    const editado = aplicarCambios(p, { actualizado: viejo, notas: 'abierto' }, despues);
    assert.equal(editado.actualizado, despues.toISOString());
  });

  test('eliminado de entrada se ignora', () => {
    const p = nuevoProducto({ ...MINIMO, eliminado: true }, AHORA);
    assert.equal(p.eliminado, false);
    assert.equal(aplicarCambios(p, { eliminado: true }, AHORA).eliminado, false);
  });

  test('actualizado siempre creciente', () => {
    const p = nuevoProducto({ ...MINIMO }, AHORA);
    const mismoInstante = aplicarCambios(p, { cantidad: 2 }, AHORA);
    assert.equal(mismoInstante.actualizado, '2026-11-09T10:00:00.001Z');
    const relojAtrasado = aplicarCambios(mismoInstante, { cantidad: 3 }, new Date('2026-11-01T00:00:00Z'));
    assert.equal(relojAtrasado.actualizado, '2026-11-09T10:00:00.002Z');
  });

  test('aplicarCambios conserva lo no indicado y no modifica el original', () => {
    const p = nuevoProducto({ ...COMPLETO }, AHORA);
    const copia = structuredClone(p);
    const editado = aplicarCambios(p, { cantidad: 3 }, new Date('2026-11-10T00:00:00Z'));
    assert.deepEqual({ ...editado, cantidad: 2, actualizado: p.actualizado }, p);
    assert.deepEqual(p, copia);
  });

  test('marcarEliminado conserva los datos y pone un actualizado posterior', () => {
    const p = nuevoProducto({ ...MINIMO }, AHORA);
    const baja = marcarEliminado(p, new Date('2026-11-09T12:00:00.000Z'));
    assert.deepEqual(baja, { ...p, eliminado: true, actualizado: '2026-11-09T12:00:00.000Z' });
    assert.equal(p.eliminado, false, 'no modifica el original');
    assert.equal(marcarEliminado(p, AHORA).actualizado, '2026-11-09T10:00:00.001Z');
  });

  test('edición no válida lanza ErrorValidacion', () => {
    const p = nuevoProducto({ ...MINIMO }, AHORA);
    assert.throws(() => aplicarCambios(p, { nombre: '' }, AHORA), productos.ErrorValidacion);
  });
});

describe('product-model: caducidad, urgencia y orden', () => {
  // new Date(año, mes0, día, h, min) es hora LOCAL (Europe/Madrid por process.env.TZ).
  const local = (anio, mes, dia, h = 12, min = 0) => new Date(anio, mes - 1, dia, h, min);

  test('la zona horaria de las pruebas tiene horario de verano', () => {
    assert.equal(local(2026, 3, 28).getTimezoneOffset(), -60);
    assert.equal(local(2026, 3, 30).getTimezoneOffset(), -120);
  });

  test('Caduca hoy', () => {
    assert.equal(diasRestantes('2026-11-09', local(2026, 11, 9, 0, 5)), 0);
    assert.equal(diasRestantes('2026-11-09', local(2026, 11, 9, 23, 55)), 0);
  });

  test('Caducado ayer', () => {
    assert.equal(diasRestantes('2026-11-08', local(2026, 11, 9, 0, 5)), -1);
    assert.equal(diasRestantes('2026-11-08', local(2026, 11, 9, 23, 55)), -1);
  });

  test('Cambio de hora', () => {
    assert.equal(diasRestantes('2026-03-30', local(2026, 3, 28)), 2);
    assert.equal(diasRestantes('2026-03-30', local(2026, 3, 28, 23, 59)), 2);
    assert.equal(diasRestantes('2026-10-26', local(2026, 10, 24, 0, 1)), 2); // fin del horario de verano
  });

  test('días restantes a largo plazo y entre años', () => {
    assert.equal(diasRestantes('2027-01-01', local(2026, 12, 31, 23, 0)), 1);
    assert.equal(diasRestantes('2027-11-09', local(2026, 11, 9)), 365);
  });

  test('Límites de los niveles', () => {
    assert.deepEqual([-3, 0, 2, 3, 7, 8].map(nivelUrgencia), ['rojo', 'rojo', 'rojo', 'naranja', 'naranja', 'verde']);
  });

  test('Textos', () => {
    assert.deepEqual(
      [-1, 0, 1, 5].map(textoCaducidad),
      ['¡Caducado!', 'Caduca hoy', 'Caduca mañana', 'Caduca en 5 días'],
    );
    assert.equal(textoCaducidad(-30), '¡Caducado!');
  });

  test('Orden del listado', () => {
    const lista = [
      { id: '1', nombre: 'Queso', fechaCaducidad: '2026-11-20' },
      { id: '2', nombre: 'atún', fechaCaducidad: '2026-11-12' },
      { id: '3', nombre: 'Arroz', fechaCaducidad: '2026-11-12' },
    ];
    const copia = structuredClone(lista);
    assert.deepEqual(ordenarPorCaducidad(lista).map((p) => p.nombre), ['Arroz', 'atún', 'Queso']);
    assert.deepEqual(lista, copia, 'la lista original no cambia');
  });

  test('caducados primero y orden sin acentos ni mayúsculas', () => {
    const lista = [
      { id: '1', nombre: 'Zumo', fechaCaducidad: '2026-12-01' },
      { id: '2', nombre: 'Ñoquis', fechaCaducidad: '2026-11-01' },
      { id: '3', nombre: 'Óleo', fechaCaducidad: '2026-11-01' },
      { id: '4', nombre: 'nata', fechaCaducidad: '2026-11-01' },
    ];
    assert.deepEqual(ordenarPorCaducidad(lista).map((p) => p.nombre), ['nata', 'Ñoquis', 'Óleo', 'Zumo']);
  });

  test('con fecha y nombre iguales desempata por id', () => {
    const lista = [
      { id: 'b', nombre: 'Leche', fechaCaducidad: '2026-11-12' },
      { id: 'a', nombre: 'leche', fechaCaducidad: '2026-11-12' },
    ];
    assert.deepEqual(ordenarPorCaducidad(lista).map((p) => p.id), ['a', 'b']);
    assert.deepEqual(ordenarPorCaducidad(lista.toReversed()).map((p) => p.id), ['a', 'b']);
  });
});

describe('product-list: filtros por estado', () => {
  const HOY = new Date(2026, 10, 17, 9, 30); // 17 nov 2026, hora local
  // Fecha YYYY-MM-DD a `dias` de HOY.
  const dentroDe = (dias) => {
    const d = new Date(2026, 10, 17 + dias);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const conDias = (...dias) => dias.map((n) => ({ id: `p${n}`, nombre: `En ${n}`, fechaCaducidad: dentroDe(n) }));
  const nombres = (lista) => lista.map((p) => p.nombre);

  test('Filtro Pronto', () => {
    const lista = conDias(-1, 0, 7, 8);
    assert.deepEqual(nombres(filtrarPorEstado(lista, 'pronto', HOY)), ['En 0', 'En 7']);
  });

  test('Filtro Caducadas', () => {
    const lista = conDias(-3, -1, 0, 5);
    assert.deepEqual(nombres(filtrarPorEstado(lista, 'caducadas', HOY)), ['En -3', 'En -1']);
  });

  test('todas devuelve todo, en el mismo orden y sin modificar la lista', () => {
    const lista = conDias(5, -2, 0);
    const copia = structuredClone(lista);
    assert.deepEqual(nombres(filtrarPorEstado(lista, 'todas', HOY)), ['En 5', 'En -2', 'En 0']);
    assert.deepEqual(nombres(filtrarPorEstado(lista, 'pronto', HOY)), ['En 5', 'En 0']);
    assert.deepEqual(lista, copia);
    assert.notEqual(filtrarPorEstado(lista, 'todas', HOY), lista, 'devuelve una lista nueva');
  });

  test('el límite de Pronto es el final del naranja', () => {
    const limite = constantes.URGENCIA.naranjaMaxDias;
    const lista = conDias(limite, limite + 1);
    assert.deepEqual(nombres(filtrarPorEstado(lista, 'pronto', HOY)), [`En ${limite}`]);
  });

  test('FILTROS: claves y textos de las pestañas', () => {
    assert.deepEqual(FILTROS.map((f) => [f.clave, f.texto]), [
      ['todas', 'Todas'], ['pronto', 'Pronto'], ['caducadas', 'Caducadas'],
    ]);
    assert.ok(Object.isFrozen(FILTROS));
  });
});
