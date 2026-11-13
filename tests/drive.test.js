// Pruebas del cliente de Google Drive (src/js/drive.js) con un fetch falso, sin Google.
// Spec: openspec/specs/drive-sync. Diseño: design.md §3 de sincronizacion-drive.
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Import tolerante: si el módulo aún no existe, cada prueba falla por separado (rojo).
const drive = await import('../src/js/drive.js').catch((error) => {
  console.error(`No se pudo cargar drive.js: ${error.message}`);
  return {};
});
const { crearClienteDrive, ErrorRed, ErrorToken, ErrorNoDisponible, ErrorDrive } = drive;

const CARPETA = 'application/vnd.google-apps.folder';

// fetch falso: anota cada petición y responde con la primera regla que coincide.
let peticiones;
let reglas;
async function fetchFalso(url, opciones = {}) {
  const peticion = {
    url: new URL(url),
    metodo: opciones.method ?? 'GET',
    cabeceras: Object.fromEntries(new Headers(opciones.headers).entries()),
    cuerpo: opciones.body ?? null,
  };
  peticiones.push(peticion);
  const regla = reglas.find((r) => r.si(peticion));
  if (!regla) throw new Error(`petición inesperada: ${peticion.metodo} ${url}`);
  return regla.responder(peticion);
}
const json = (datos, estado = 200) => new Response(JSON.stringify(datos), { status: estado, headers: { 'Content-Type': 'application/json' } });
const regla = (si, responder) => reglas.push({ si, responder });
const cliente = () => crearClienteDrive({ token: () => 'tok-123', fetch: fetchFalso });

beforeEach(() => {
  peticiones = [];
  reglas = [];
});

describe('Cliente de Drive', () => {
  test('buscarListas pide caducidades.json fuera de la papelera, por fecha de creación', async () => {
    regla((p) => p.url.pathname === '/drive/v3/files', () => json({
      files: [{ id: 'a', createdTime: '2026-11-01T10:00:00.000Z', version: '7' }, { id: 'b', createdTime: '2026-11-05T10:00:00.000Z', version: '2' }],
    }));
    const listas = await cliente().buscarListas();
    assert.deepEqual(listas.map((l) => l.id), ['a', 'b']);
    const [p] = peticiones;
    assert.equal(p.url.origin, 'https://www.googleapis.com');
    assert.equal(p.metodo, 'GET');
    assert.equal(p.cabeceras.authorization, 'Bearer tok-123');
    const q = p.url.searchParams.get('q');
    assert.match(q, /name = 'caducidades\.json'/);
    assert.match(q, /trashed = false/);
    assert.match(q, new RegExp(`mimeType != '${CARPETA}'`));
    assert.equal(p.url.searchParams.get('orderBy'), 'createdTime');
    assert.match(p.url.searchParams.get('fields'), /id/);
    assert.match(p.url.searchParams.get('fields'), /createdTime/);
    assert.match(p.url.searchParams.get('fields'), /version/);
  });

  test('buscarListas sin resultados devuelve una lista vacía', async () => {
    regla(() => true, () => json({}));
    assert.deepEqual(await cliente().buscarListas(), []);
  });

  test('leer devuelve el contenido y la versión', async () => {
    regla((p) => p.url.searchParams.get('alt') === 'media', () => new Response('{"version":1,"productos":[]}'));
    regla((p) => p.url.searchParams.get('fields') === 'version', () => json({ version: '42' }));
    const { texto, version } = await cliente().leer('abc');
    assert.equal(texto, '{"version":1,"productos":[]}');
    assert.equal(version, '42');
    for (const p of peticiones) {
      assert.equal(p.url.pathname, '/drive/v3/files/abc');
      assert.equal(p.cabeceras.authorization, 'Bearer tok-123');
    }
    // La versión se pide antes que el contenido: si el archivo cambia en medio, la versión
    // anotada es la antigua y la comprobación antes de subir lo detecta.
    assert.equal(peticiones[0].url.searchParams.get('fields'), 'version');
  });

  test('version', async () => {
    regla(() => true, () => json({ version: '9' }));
    assert.equal(await cliente().version('abc'), '9');
    assert.equal(peticiones[0].url.pathname, '/drive/v3/files/abc');
  });

  test('escribir sube el contenido con PATCH y devuelve la versión nueva', async () => {
    regla(() => true, () => json({ version: '43' }));
    assert.equal(await cliente().escribir('abc', '{"x":1}'), '43');
    const [p] = peticiones;
    assert.equal(p.metodo, 'PATCH');
    assert.equal(p.url.pathname, '/upload/drive/v3/files/abc');
    assert.equal(p.url.searchParams.get('uploadType'), 'media');
    assert.equal(p.url.searchParams.get('fields'), 'version');
    assert.equal(p.cabeceras['content-type'], 'application/json');
    assert.equal(p.cuerpo, '{"x":1}');
  });

  test('crearLista con la carpeta Caducidades ya existente', async () => {
    regla((p) => p.metodo === 'GET', () => json({ files: [{ id: 'carpeta-1' }] }));
    regla((p) => p.url.pathname === '/upload/drive/v3/files', () => json({ id: 'nuevo', version: '1' }));
    assert.deepEqual(await cliente().crearLista('{"version":1}'), { id: 'nuevo', version: '1' });
    const busqueda = peticiones[0].url.searchParams.get('q');
    assert.match(busqueda, /name = 'Caducidades'/);
    assert.match(busqueda, new RegExp(`mimeType = '${CARPETA}'`));
    assert.match(busqueda, /'root' in parents/);
    assert.match(busqueda, /trashed = false/);
    const subida = peticiones.at(-1);
    assert.equal(subida.metodo, 'POST');
    assert.equal(subida.url.searchParams.get('uploadType'), 'multipart');
    assert.match(subida.cabeceras['content-type'], /^multipart\/related; boundary=/);
    const metadatos = JSON.parse(subida.cuerpo.match(/\{"name".*\}/)[0]);
    assert.deepEqual(metadatos, { name: 'caducidades.json', mimeType: 'application/json', parents: ['carpeta-1'] });
    assert.match(subida.cuerpo, /\{"version":1\}/);
    assert.equal(peticiones.length, 2, 'no crea otra carpeta');
  });

  test('crearLista sin carpeta la crea primero en la raíz', async () => {
    regla((p) => p.metodo === 'GET', () => json({ files: [] }));
    regla((p) => p.metodo === 'POST' && p.url.pathname === '/drive/v3/files', () => json({ id: 'carpeta-nueva' }));
    regla((p) => p.url.pathname === '/upload/drive/v3/files', () => json({ id: 'nuevo', version: '1' }));
    await cliente().crearLista('{}');
    const creacion = peticiones.find((p) => p.metodo === 'POST' && p.url.pathname === '/drive/v3/files');
    assert.deepEqual(JSON.parse(creacion.cuerpo), { name: 'Caducidades', mimeType: CARPETA });
    assert.equal(creacion.cabeceras['content-type'], 'application/json');
    assert.match(peticiones.at(-1).cuerpo, /"parents":\["carpeta-nueva"\]/);
  });
});

describe('Errores de Drive', () => {
  test('401 es un token rechazado', async () => {
    regla(() => true, () => json({ error: {} }, 401));
    await assert.rejects(cliente().buscarListas(), ErrorToken);
  });

  test('404 y 403 de un archivo: ya no está disponible', async () => {
    regla(() => true, () => json({ error: {} }, 404));
    await assert.rejects(cliente().leer('abc'), ErrorNoDisponible);
    reglas = [];
    regla(() => true, () => json({ error: {} }, 403));
    await assert.rejects(cliente().escribir('abc', '{}'), ErrorNoDisponible);
    await assert.rejects(cliente().version('abc'), ErrorNoDisponible);
  });

  test('403 al buscar es un error de Drive', async () => {
    regla(() => true, () => json({ error: {} }, 403));
    await assert.rejects(cliente().buscarListas(), (error) => error instanceof ErrorDrive && error.estado === 403);
  });

  test('500 es un error de Drive con su estado', async () => {
    regla(() => true, () => json({ error: {} }, 500));
    await assert.rejects(cliente().version('abc'), (error) => error instanceof ErrorDrive && error.estado === 500);
  });

  test('sin red', async () => {
    const sinRed = crearClienteDrive({ token: () => 't', fetch: async () => { throw new TypeError('Failed to fetch'); } });
    await assert.rejects(sinRed.buscarListas(), ErrorRed);
  });
});
