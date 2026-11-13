// Pruebas de la lógica pura de sincronización (src/js/sincronizacion.js).
// Spec: openspec/specs/drive-sync y sync-status.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Import tolerante: si el módulo aún no existe, cada prueba falla por separado (rojo).
const sincronizacion = await import('../src/js/sincronizacion.js').catch((error) => {
  console.error(`No se pudo cargar sincronizacion.js: ${error.message}`);
  return {};
});
const {
  leerArchivo, crearArchivo, fusionar, purgar, planificar, textoEstado, ErrorArchivoNoValido, DIAS_PURGA,
} = sincronizacion;

const AHORA = new Date('2026-11-13T12:00:00.000Z');

function producto(id, cambios = {}) {
  return {
    id,
    nombre: `Producto ${id}`,
    fechaCompra: null,
    fechaCaducidad: '2026-11-30',
    cantidad: 1,
    unidad: 'ud',
    categoria: 'Nevera',
    foto: { tipo: 'ninguna', valor: null },
    notas: null,
    eliminado: false,
    actualizado: '2026-11-10T10:00:00.000Z',
    ...cambios,
  };
}

const porId = (lista) => Object.fromEntries(lista.map((p) => [p.id, p]));
const ids = (lista) => lista.map((p) => p.id).sort();
const haceDias = (dias) => new Date(AHORA.getTime() - dias * 86_400_000).toISOString();

describe('Archivo de sincronización', () => {
  test('Contenido del archivo', () => {
    const texto = crearArchivo([producto('b', { nombre: 'Pan', eliminado: true }), producto('a', { nombre: 'Leche' })], AHORA);
    const archivo = JSON.parse(texto);
    assert.equal(archivo.version, 1);
    assert.equal(archivo.ultimaActualizacion, AHORA.toISOString());
    assert.deepEqual(archivo.productos.map((p) => p.id), ['a', 'b'], 'ordenados por id: contenido estable');
    assert.deepEqual(archivo.productos[1], producto('b', { nombre: 'Pan', eliminado: true }), 'todos los campos');
  });

  test('leerArchivo devuelve los productos de un archivo correcto', () => {
    const texto = crearArchivo([producto('a'), producto('b', { eliminado: true })], AHORA);
    const { productos, descartados } = leerArchivo(texto);
    assert.deepEqual(productos, [producto('a'), producto('b', { eliminado: true })]);
    assert.equal(descartados, 0);
  });

  test('Archivo dañado', () => {
    assert.throws(() => leerArchivo('{ esto no es JSON'), ErrorArchivoNoValido);
  });

  test('archivo con otra versión o sin productos', () => {
    assert.throws(() => leerArchivo(JSON.stringify({ version: 2, productos: [] })), ErrorArchivoNoValido);
    assert.throws(() => leerArchivo(JSON.stringify({ version: 1 })), ErrorArchivoNoValido);
    assert.throws(() => leerArchivo(JSON.stringify([producto('a')])), ErrorArchivoNoValido);
    assert.throws(() => leerArchivo('null'), ErrorArchivoNoValido);
  });

  test('Un producto no válido', () => {
    const { fechaCaducidad, ...sinFecha } = producto('x');
    const { id, ...sinId } = producto('y');
    const texto = JSON.stringify({
      version: 1,
      ultimaActualizacion: AHORA.toISOString(),
      productos: [producto('a'), sinFecha, sinId, producto('z', { actualizado: 'ayer' }), producto('w', { eliminado: 'no' }), 'basura'],
    });
    const { productos, descartados } = leerArchivo(texto);
    assert.deepEqual(ids(productos), ['a']);
    assert.equal(descartados, 5);
  });

  test('leerArchivo normaliza los textos de un producto', () => {
    const texto = JSON.stringify({ version: 1, productos: [producto('a', { nombre: '  Leche  ', notas: '' })] });
    const [p] = leerArchivo(texto).productos;
    assert.equal(p.nombre, 'Leche');
    assert.equal(p.notas, null);
    assert.equal(p.actualizado, '2026-11-10T10:00:00.000Z', 'conserva actualizado');
  });
});

describe('Fusión por producto', () => {
  test('Producto nuevo en otro dispositivo', () => {
    const resultado = porId(fusionar([producto('a')], [producto('a'), producto('q', { nombre: 'Queso' })]));
    assert.deepEqual(Object.keys(resultado).sort(), ['a', 'q']);
    assert.equal(resultado.q.nombre, 'Queso');
  });

  test('Gana la edición más reciente', () => {
    const local = producto('l', { cantidad: 2, actualizado: '2026-11-13T10:00:00.000Z' });
    const remoto = producto('l', { cantidad: 5, actualizado: '2026-11-13T11:00:00.000Z' });
    assert.equal(fusionar([local], [remoto])[0].cantidad, 5);
    assert.equal(fusionar([remoto], [local])[0].cantidad, 5, 'da igual de qué lado venga');
  });

  test('Baja en otro dispositivo', () => {
    const local = producto('p', { actualizado: '2026-11-13T09:00:00.000Z' });
    const remoto = producto('p', { eliminado: true, actualizado: '2026-11-13T10:00:00.000Z' });
    assert.equal(fusionar([local], [remoto])[0].eliminado, true);
  });

  test('Edición local posterior a una baja remota', () => {
    const local = producto('p', { notas: 'abierto', actualizado: '2026-11-13T12:00:00.000Z' });
    const remoto = producto('p', { eliminado: true, actualizado: '2026-11-13T10:00:00.000Z' });
    const [resultado] = fusionar([local], [remoto]);
    assert.equal(resultado.eliminado, false);
    assert.equal(resultado.notas, 'abierto');
  });

  test('Cambios locales subidos', () => {
    assert.deepEqual(ids(fusionar([producto('nuevo'), producto('a')], [producto('a')])), ['a', 'nuevo']);
  });

  test('empate: gana la versión eliminada y, si ninguna lo está, la remota', () => {
    const mismo = '2026-11-13T10:00:00.000Z';
    const vivo = producto('e', { actualizado: mismo, notas: 'local' });
    const borrado = producto('e', { actualizado: mismo, eliminado: true });
    assert.equal(fusionar([vivo], [borrado])[0].eliminado, true);
    assert.equal(fusionar([borrado], [vivo])[0].eliminado, true);
    const remoto = producto('e', { actualizado: mismo, notas: 'remoto' });
    assert.equal(fusionar([vivo], [remoto])[0].notas, 'remoto');
  });

  test('fusionar no modifica las listas de entrada', () => {
    const locales = [producto('a')];
    const remotos = [producto('a', { cantidad: 9, actualizado: '2026-11-13T11:00:00.000Z' })];
    const copia = structuredClone(locales);
    fusionar(locales, remotos);
    assert.deepEqual(locales, copia);
  });
});

describe('Purga de bajas antiguas', () => {
  test('Baja antigua', () => {
    const lista = [producto('viejo', { eliminado: true, actualizado: haceDias(100) }), producto('a')];
    assert.deepEqual(ids(purgar(lista, AHORA)), ['a']);
  });

  test('Baja reciente', () => {
    const lista = [producto('reciente', { eliminado: true, actualizado: haceDias(10) })];
    assert.deepEqual(ids(purgar(lista, AHORA)), ['reciente']);
  });

  test('no purga productos sin eliminar aunque sean antiguos', () => {
    assert.deepEqual(ids(purgar([producto('a', { actualizado: haceDias(400) })], AHORA)), ['a']);
    assert.equal(DIAS_PURGA, 90);
  });
});

describe('Planificar una sincronización', () => {
  test('sin diferencias no cambia nada', () => {
    const plan = planificar([producto('a')], [producto('a')], AHORA);
    assert.equal(plan.cambiaLocal, false);
    assert.equal(plan.hayQueSubir, false);
    assert.deepEqual(plan.idsPurgados, []);
  });

  test('un producto nuevo en Drive cambia lo local y no obliga a subir', () => {
    const plan = planificar([producto('a')], [producto('a'), producto('q')], AHORA);
    assert.equal(plan.cambiaLocal, true);
    assert.equal(plan.hayQueSubir, false);
    assert.deepEqual(ids(plan.resultado), ['a', 'q']);
  });

  test('un producto local nuevo obliga a subir', () => {
    const plan = planificar([producto('a'), producto('n')], [producto('a')], AHORA);
    assert.equal(plan.cambiaLocal, false);
    assert.equal(plan.hayQueSubir, true);
  });

  test('una edición distinta en cada lado cambia los dos', () => {
    const plan = planificar(
      [producto('a', { actualizado: '2026-11-13T11:00:00.000Z' }), producto('b')],
      [producto('a'), producto('b', { actualizado: '2026-11-13T11:00:00.000Z' })],
      AHORA,
    );
    assert.equal(plan.cambiaLocal, true);
    assert.equal(plan.hayQueSubir, true);
  });

  test('la purga aparece en idsPurgados y en los dos lados', () => {
    const viejo = producto('v', { eliminado: true, actualizado: haceDias(100) });
    const plan = planificar([viejo, producto('a')], [viejo, producto('a')], AHORA);
    assert.deepEqual(plan.idsPurgados, ['v']);
    assert.deepEqual(ids(plan.resultado), ['a']);
    assert.equal(plan.cambiaLocal, true);
    assert.equal(plan.hayQueSubir, true);
  });
});

describe('Estados de sincronización', () => {
  const base = { enLinea: true, fase: 'inactivo', pendiente: false, tokenVigente: true, error: null };
  const texto = (cambios) => textoEstado({ ...base, ...cambios });

  test('Sin conexión', () => {
    assert.equal(texto({ enLinea: false }), 'Sin conexión');
    assert.equal(texto({ enLinea: false, fase: 'sincronizando', pendiente: true }), 'Sin conexión', 'manda sobre todo');
  });

  test('Sincronizado', () => {
    assert.equal(texto({}), 'Sincronizado');
  });

  test('Sin token tras reabrir', () => {
    assert.equal(texto({ tokenVigente: false }), 'Toca para sincronizar');
    assert.equal(texto({ tokenVigente: false, pendiente: true }), 'Toca para sincronizar');
  });

  test('cambios pendientes con token vigente', () => {
    assert.equal(texto({ pendiente: true }), 'Cambios pendientes');
  });

  test('sincronizando y error', () => {
    assert.equal(texto({ fase: 'sincronizando', tokenVigente: false }), 'Sincronizando…');
    assert.equal(texto({ fase: 'error', error: 'algo', tokenVigente: false, pendiente: true }), 'Error al sincronizar');
  });
});
