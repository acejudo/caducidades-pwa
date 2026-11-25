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
  prepararArchivo, ErrorListaLlena,
} = sincronizacion;
const { PRODUCTOS_MAX, ARCHIVO_MAX_BYTES } = await import('../src/js/constantes.js');
import { uuid, corto } from './uuid-prueba.js';

const AHORA = new Date('2026-11-13T12:00:00.000Z');

function producto(id, cambios = {}) {
  return {
    id: uuid(id),
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

const porId = (lista) => Object.fromEntries(lista.map((p) => [corto(p.id), p]));
const ids = (lista) => lista.map((p) => corto(p.id)).sort();
const haceDias = (dias) => new Date(AHORA.getTime() - dias * 86_400_000).toISOString();

describe('Archivo de sincronización', () => {
  test('Contenido del archivo', () => {
    const texto = crearArchivo([producto('b', { nombre: 'Pan', eliminado: true }), producto('a', { nombre: 'Leche' })], AHORA);
    const archivo = JSON.parse(texto);
    assert.equal(archivo.version, 1);
    assert.equal(archivo.ultimaActualizacion, AHORA.toISOString());
    assert.deepEqual(archivo.productos.map((p) => corto(p.id)), ['a', 'b'], 'ordenados por id: contenido estable');
    assert.deepEqual(archivo.productos[1], producto('b', { nombre: 'Pan', eliminado: true }), 'todos los campos');
  });

  test('leerArchivo devuelve los productos de un archivo correcto', () => {
    const texto = crearArchivo([producto('a'), producto('b', { eliminado: true })], AHORA);
    const { productos, descartados } = leerArchivo(texto);
    assert.deepEqual(productos, [producto('a'), producto('b', { eliminado: true })]);
    assert.equal(descartados, 0);
  });

  test('Archivo compacto', () => {
    const texto = crearArchivo([producto('a'), producto('b')], AHORA);
    assert.ok(!texto.includes('\n'), 'sin saltos de línea');
    assert.equal(texto, JSON.stringify(JSON.parse(texto)), 'sin sangría ni espacios de formato');
  });

  test('Archivo anterior con sangría', () => {
    const texto = JSON.stringify({ version: 1, ultimaActualizacion: AHORA.toISOString(), productos: [producto('a')] }, null, 2);
    assert.deepEqual(leerArchivo(texto, AHORA).productos, [producto('a')]);
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
    assert.deepEqual(plan.idsPurgados.map(corto), ['v']);
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

// ---------- Fotos reales (fotos-reales) ----------

describe('Plan de fotos', () => {
  const F1 = '11111111-1111-4111-8111-111111111111.webp';
  const F2 = '22222222-2222-4222-8222-222222222222.jpg';
  const F3 = '33333333-3333-4333-8333-333333333333.webp';
  const conFoto = (id, nombre, cambios = {}) => producto(id, { foto: { tipo: 'real', valor: nombre }, ...cambios });
  const local = (nombre, cambios = {}) => ({ nombre, subida: false, creada: haceDias(3), ...cambios });
  const remota = (nombre, cambios = {}) => ({ id: `drive-${nombre}`, name: nombre, createdTime: haceDias(3), ownedByMe: true, ...cambios });
  const plan = (datos) => sincronizacion.planificarFotos({ ahora: AHORA, locales: [], remotas: [], ...datos });

  test('subir una foto local no subida de un producto activo', () => {
    const p = plan({ productos: [conFoto('a', F1)], locales: [local(F1)] });
    assert.deepEqual(p.subir, [F1]);
    assert.deepEqual(p.marcarSubidas, []);
  });

  test('no subir la foto de un producto eliminado', () => {
    const p = plan({ productos: [conFoto('a', F1, { eliminado: true })], locales: [local(F1)] });
    assert.deepEqual(p.subir, []);
    assert.deepEqual(p.borrarLocales, [], 'se conserva hasta la purga');
  });

  test('una foto no subida que ya está en Drive solo se marca', () => {
    const p = plan({ productos: [conFoto('a', F1)], locales: [local(F1)], remotas: [remota(F1)] });
    assert.deepEqual(p.subir, []);
    assert.deepEqual(p.marcarSubidas, [F1]);
  });

  test('una foto ya subida no se vuelve a subir', () => {
    const p = plan({ productos: [conFoto('a', F1)], locales: [local(F1, { subida: true })] });
    assert.deepEqual(p.subir, []);
  });

  test('Foto hecha en otro dispositivo: descargar la que falta en local', () => {
    const p = plan({ productos: [conFoto('a', F1)], remotas: [remota(F1)] });
    assert.deepEqual(p.descargar, [{ nombre: F1, id: `drive-${F1}` }]);
  });

  test('no descargar la foto de un producto eliminado', () => {
    const p = plan({ productos: [conFoto('a', F1, { eliminado: true })], remotas: [remota(F1)] });
    assert.deepEqual(p.descargar, []);
  });

  test('Foto aún no subida: no hay nada que descargar', () => {
    const p = plan({ productos: [conFoto('a', F1)] });
    assert.deepEqual(p.descargar, []);
  });

  test('Foto fuera del tope: ni se descarga ni se borra', () => {
    // F1 la usa un producto y F2 ya no se usa, pero ninguna ha entrado en el listado.
    const p = plan({ productos: [conFoto('a', F1)], remotas: [] });
    assert.deepEqual(p.descargar, []);
    assert.deepEqual(p.borrarRemotas, []);
  });

  test('Foto cambiada: se borra la antigua en local y en Drive', () => {
    const p = plan({
      productos: [conFoto('a', F2)],
      locales: [local(F1, { subida: true, creada: haceDias(2) }), local(F2, { subida: true })],
      remotas: [remota(F1, { createdTime: haceDias(2) }), remota(F2)],
    });
    assert.deepEqual(p.borrarLocales, [F1]);
    assert.deepEqual(p.borrarRemotas, [`drive-${F1}`]);
  });

  test('Foto recién hecha en otro dispositivo: no se borra', () => {
    const p = plan({
      productos: [],
      locales: [local(F1, { creada: new Date(AHORA.getTime() - 3_600_000).toISOString() })],
      remotas: [remota(F1, { createdTime: new Date(AHORA.getTime() - 3_600_000).toISOString() })],
    });
    assert.deepEqual(p.borrarLocales, []);
    assert.deepEqual(p.borrarRemotas, []);
  });

  test('Producto eliminado: se conserva su foto', () => {
    const p = plan({
      productos: [conFoto('a', F1, { eliminado: true })],
      locales: [local(F1, { subida: true })],
      remotas: [remota(F1)],
    });
    assert.deepEqual(p.borrarLocales, []);
    assert.deepEqual(p.borrarRemotas, []);
  });

  test('no se intenta borrar una foto sin usar de otra cuenta', () => {
    const p = plan({ productos: [], remotas: [remota(F1, { ownedByMe: false })] });
    assert.deepEqual(p.borrarRemotas, []);
  });

  test('los archivos de Drive con otro nombre no se tocan', () => {
    const p = plan({ productos: [], remotas: [remota('notas.txt'), remota('../caducidades.json')] });
    assert.deepEqual(p.borrarRemotas, []);
    assert.deepEqual(p.descargar, []);
  });

  test('una foto con nombre no válido en un producto no se pide ni se sube', () => {
    const p = plan({ productos: [producto('a', { foto: { tipo: 'real', valor: 'x.png' } })], remotas: [remota('x.png')] });
    assert.deepEqual(p.descargar, []);
    assert.deepEqual(p.subir, []);
  });

  test('fotos predeterminadas y productos sin foto no generan trabajo', () => {
    const p = plan({ productos: [producto('a'), producto('b', { foto: { tipo: 'predeterminada', valor: 'leche' } })] });
    assert.deepEqual(p, { subir: [], marcarSubidas: [], descargar: [], borrarLocales: [], borrarRemotas: [] });
  });

  test('varias fotos: listas ordenadas por nombre', () => {
    const p = plan({ productos: [conFoto('a', F3), conFoto('b', F1)], locales: [local(F3), local(F1)] });
    assert.deepEqual(p.subir, [F1, F3]);
  });
});

// ---------- Aviso de cambios sin sincronizar (pulido-final) ----------

describe('Aviso de cambios sin sincronizar', () => {
  const base = { enLinea: true, fase: 'inactivo', pendiente: true, tokenVigente: false };
  const aviso = (cambios = {}) => sincronizacion.avisoPendiente({ ...base, ...cambios });

  test('Abrir la app con cambios pendientes', () => {
    assert.equal(aviso(), true);
  });

  test('Sin cambios pendientes', () => {
    assert.equal(aviso({ pendiente: false }), false);
  });

  test('Sin conexión', () => {
    assert.equal(aviso({ enLinea: false }), false);
  });

  test('con token vigente sincroniza sola: sin aviso', () => {
    assert.equal(aviso({ tokenVigente: true }), false);
  });

  test('oculto mientras sincroniza', () => {
    assert.equal(aviso({ fase: 'sincronizando' }), false);
  });

  test('visible tras un error, para reintentar', () => {
    assert.equal(aviso({ fase: 'error' }), true);
  });
});

describe('Límites del archivo de Drive', () => {
  const archivoCon = (productos) => JSON.stringify({ version: 1, ultimaActualizacion: AHORA.toISOString(), productos });
  const enElFuturo = (ms) => new Date(AHORA.getTime() + ms).toISOString();

  test('Demasiados productos en el archivo', () => {
    const muchos = Array.from({ length: 2001 }, (_, i) => producto(`p${i}`));
    assert.throws(() => leerArchivo(archivoCon(muchos), AHORA), ErrorArchivoNoValido);
    const justos = muchos.slice(0, 2000);
    assert.equal(leerArchivo(archivoCon(justos), AHORA).productos.length, 2000);
  });

  test('Baja con fecha en el futuro', () => {
    const futura = producto('a', { eliminado: true, actualizado: enElFuturo(10 * 365 * 86_400_000) });
    const [p] = leerArchivo(archivoCon([futura]), AHORA).productos;
    assert.equal(p.actualizado, AHORA.toISOString(), 'recortado a la hora de la sincronización');
    assert.equal(p.eliminado, true);
    assert.equal(leerArchivo(archivoCon([futura]), AHORA).corregidos, 1, 'avisa de que hay que subir la versión corregida');
    const despues = new Date(AHORA.getTime() + 91 * 86_400_000);
    assert.deepEqual(purgar([p], despues), [], 'se purga a los 90 días');
  });

  test('Reloj ligeramente adelantado', () => {
    const adelantado = enElFuturo(2 * 3_600_000);
    const [p] = leerArchivo(archivoCon([producto('a', { actualizado: adelantado })]), AHORA).productos;
    assert.equal(p.actualizado, adelantado);
    assert.equal(leerArchivo(archivoCon([producto('a', { actualizado: adelantado })]), AHORA).corregidos, 0);
  });

  test('Notas demasiado largas en el archivo', () => {
    const { productos, descartados } = leerArchivo(archivoCon([producto('a'), producto('b', { notas: 'n'.repeat(5000) })]), AHORA);
    assert.deepEqual(ids(productos), ['a']);
    assert.equal(descartados, 1);
  });
});

// Límites de la lista que se va a guardar y subir (drive-sync, "Tamaño máximo del
// archivo de Drive"). Comprobación pura antes de escribir.
describe('Lista a escribir dentro de los límites', () => {
  const muchos = (n, cambios = {}) => Array.from({ length: n }, (_, i) => producto(`p${String(i).padStart(5, '0')}`, cambios));

  test('La lista junta cabe: con el máximo de productos devuelve el archivo', () => {
    const lista = [...muchos(PRODUCTOS_MAX - 1), producto('baja', { eliminado: true })];
    const texto = prepararArchivo(lista, AHORA);
    assert.equal(texto, crearArchivo(lista, AHORA));
    assert.equal(JSON.parse(texto).productos.length, PRODUCTOS_MAX);
  });

  test('La lista junta pasaría del máximo', () => {
    assert.throws(() => prepararArchivo(muchos(PRODUCTOS_MAX + 1), AHORA), (e) => ErrorListaLlena && e instanceof ErrorListaLlena);
  });

  test('Las bajas cuentan para el máximo', () => {
    const lista = [...muchos(PRODUCTOS_MAX), producto('baja', { eliminado: true })];
    assert.throws(() => prepararArchivo(lista, AHORA), (e) => ErrorListaLlena && e instanceof ErrorListaLlena);
  });

  test('Archivo resultante demasiado grande', () => {
    // Pocos productos, pero el texto supera ARCHIVO_MAX_BYTES (los bytes cuentan en UTF-8).
    const notas = 'ñ'.repeat(Math.ceil(ARCHIVO_MAX_BYTES / 4));
    const lista = [producto('a', { notas }), producto('b', { notas }), producto('c', { notas })];
    assert.throws(() => prepararArchivo(lista, AHORA), (e) => ErrorListaLlena && e instanceof ErrorListaLlena);
  });
});

describe('Contenido no válido en Drive: formato estricto', () => {
  const archivo = (productos) => JSON.stringify({ version: 1, ultimaActualizacion: AHORA.toISOString(), productos });

  test('Id que no es un UUID', () => {
    const texto = archivo([
      producto('a'),
      { ...producto('n'), id: 'nuevo' },
      { ...producto('m'), id: uuid('m').toUpperCase() },
      producto('b'),
    ]);
    const { productos, descartados } = leerArchivo(texto, AHORA);
    assert.deepEqual(ids(productos), ['a', 'b']);
    assert.equal(descartados, 2);
  });

  test('Fecha de modificación sin zona', () => {
    const texto = archivo([
      producto('a'),
      producto('x', { actualizado: '2026-11-10T10:00:00' }),
      producto('y', { actualizado: '2026-11-10' }),
      producto('z', { actualizado: '10 Nov 2026 10:00 GMT' }),
    ]);
    const { productos, descartados } = leerArchivo(texto, AHORA);
    assert.deepEqual(ids(productos), ['a']);
    assert.equal(descartados, 3);
  });

  test('Fecha de modificación con desfase', () => {
    const texto = archivo([
      producto('a', { actualizado: '2026-11-10T11:00:00+01:00' }),
      producto('b', { actualizado: '2026-11-10T10:00:00Z' }),
    ]);
    const { productos, descartados } = leerArchivo(texto, AHORA);
    assert.equal(descartados, 0);
    assert.equal(porId(productos).a.actualizado, '2026-11-10T11:00:00+01:00', 'se conserva tal cual');
    assert.equal(porId(productos).b.actualizado, '2026-11-10T10:00:00Z');
  });

  test('fecha de modificación con forma correcta pero inexistente', () => {
    const { descartados } = leerArchivo(archivo([producto('a', { actualizado: '2026-13-40T10:00:00Z' })]), AHORA);
    assert.equal(descartados, 1);
  });

  test('Cantidad por encima del máximo en el archivo', () => {
    const { productos, descartados } = leerArchivo(archivo([producto('a'), producto('c', { cantidad: 10000 })]), AHORA);
    assert.deepEqual(ids(productos), ['a']);
    assert.equal(descartados, 1);
  });
});

describe('Foto predeterminada desconocida en el archivo', () => {
  const archivo = (productos) => JSON.stringify({ version: 1, ultimaActualizacion: AHORA.toISOString(), productos });
  const predeterminada = (valor) => ({ tipo: 'predeterminada', valor });

  test('Foto predeterminada que no está en el catálogo', () => {
    const { productos, descartados, corregidos } = leerArchivo(
      archivo([producto('l', { nombre: 'Leche', foto: predeterminada('dragon') })]), AHORA);
    assert.equal(descartados, 0, 'no se descarta');
    assert.deepEqual(productos[0].foto, { tipo: 'ninguna', valor: null });
    assert.equal(productos[0].nombre, 'Leche');
    assert.equal(corregidos, 1, 'hay que subir la versión corregida');
  });

  test('Foto predeterminada del catálogo', () => {
    const { productos, corregidos } = leerArchivo(
      archivo([producto('l', { nombre: 'Leche', foto: predeterminada('leche') })]), AHORA);
    assert.deepEqual(productos[0].foto, predeterminada('leche'));
    assert.equal(corregidos, 0);
  });

  test('fecha futura y foto desconocida cuentan un solo corregido', () => {
    const futura = new Date(AHORA.getTime() + 10 * 86_400_000).toISOString();
    const { productos, corregidos } = leerArchivo(
      archivo([producto('l', { actualizado: futura, foto: predeterminada('dragon') })]), AHORA);
    assert.equal(corregidos, 1);
    assert.equal(productos[0].actualizado, AHORA.toISOString());
    assert.deepEqual(productos[0].foto, { tipo: 'ninguna', valor: null });
  });
});

describe('Detección de cambios en la lista', () => {
  test('Listas iguales', () => {
    const plan = planificar([producto('a'), producto('b')], [producto('b'), producto('a')], AHORA);
    assert.equal(plan.cambiaLocal, false);
    assert.equal(plan.hayQueSubir, false);
  });

  test('Textos con separadores', () => {
    // planificar recibe listas ya leídas; aquí los textos no pasan por leerArchivo.
    const t = '2026-11-10T10:00:00.000Z';
    const viejo = haceDias(100);
    const locales = [
      { ...producto('a'), id: 'a', actualizado: t },
      { ...producto('b'), id: 'b', eliminado: true, actualizado: viejo },
    ];
    // Unida con "@" y "|", esta versión da el mismo texto que las dos locales.
    const remotos = [{ ...producto('a'), id: 'a', eliminado: true, actualizado: `${t}@false|b@${viejo}` }];
    const plan = planificar(locales, remotos, AHORA);
    assert.deepEqual(plan.resultado.map((p) => p.id), ['a'], 'gana la remota y la baja antigua se purga');
    assert.equal(plan.cambiaLocal, true, 'la lista del dispositivo cambia');
  });
});
