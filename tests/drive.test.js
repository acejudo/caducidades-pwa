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
    const archivos = [
      { id: 'a', createdTime: '2026-11-01T10:00:00.000Z', version: '7', ownedByMe: true, owners: [{ emailAddress: 'yo@example.com' }] },
      { id: 'b', createdTime: '2026-11-05T10:00:00.000Z', version: '2', ownedByMe: false, owners: [{ emailAddress: 'ana@example.com' }] },
    ];
    regla((p) => p.url.pathname === '/drive/v3/files', () => json({ files: archivos }));
    const listas = await cliente().buscarListas();
    assert.deepEqual(listas.map((l) => l.id), ['a', 'b']);
    assert.deepEqual(listas, archivos, 'devuelve el dueño de cada lista (lista-compartida-segura)');
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
    assert.match(p.url.searchParams.get('fields'), /ownedByMe/);
    assert.match(p.url.searchParams.get('fields'), /owners\(emailAddress\)/);
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

// ---------- Fotos reales (fotos-reales, design.md §5) ----------

describe('Cliente de Drive: fotos', () => {
  const FOTO = '3f2b8c1e-9a4d-4e6f-8b2a-1c5d7e9f0a3b.webp';
  const { ErrorFotoNoValida } = drive;

  test('buscarListas pide también la carpeta de cada lista', async () => {
    regla(() => true, () => json({ files: [] }));
    await cliente().buscarListas();
    assert.match(peticiones[0].url.searchParams.get('fields'), /parents/);
  });

  test('carpetaDeLista devuelve la carpeta del archivo', async () => {
    regla((p) => p.url.pathname === '/drive/v3/files/lista-1', () => json({ parents: ['carpeta-9'] }));
    assert.equal(await cliente().carpetaDeLista('lista-1'), 'carpeta-9');
    assert.equal(peticiones[0].url.searchParams.get('fields'), 'parents');
  });

  test('carpetaDeLista de un archivo que ya no está: ErrorNoDisponible', async () => {
    regla(() => true, () => json({}, 404));
    await assert.rejects(cliente().carpetaDeLista('lista-1'), ErrorNoDisponible);
  });

  test('buscarCarpetaFotos busca "fotos" dentro de la carpeta de la lista', async () => {
    regla(() => true, () => json({ files: [{ id: 'fotos-1' }, { id: 'fotos-2' }] }));
    assert.equal(await cliente().buscarCarpetaFotos('carpeta-9'), 'fotos-1');
    const q = peticiones[0].url.searchParams.get('q');
    assert.match(q, /name = 'fotos'/);
    assert.match(q, /'carpeta-9' in parents/);
    assert.match(q, new RegExp(`mimeType = '${CARPETA}'`));
    assert.match(q, /trashed = false/);
    assert.equal(peticiones[0].url.searchParams.get('orderBy'), 'createdTime');
  });

  test('buscarCarpetaFotos sin carpeta devuelve null', async () => {
    regla(() => true, () => json({ files: [] }));
    assert.equal(await cliente().buscarCarpetaFotos('carpeta-9'), null);
  });

  test('las comillas de un id no rompen la consulta', async () => {
    regla(() => true, () => json({ files: [] }));
    await cliente().buscarCarpetaFotos("o'Brien");
    assert.ok(peticiones[0].url.searchParams.get('q').includes("'o\\'Brien' in parents"));
  });

  test('crearCarpetaFotos crea "fotos" dentro de la carpeta de la lista', async () => {
    regla((p) => p.metodo === 'POST', () => json({ id: 'fotos-nueva' }));
    assert.equal(await cliente().crearCarpetaFotos('carpeta-9'), 'fotos-nueva');
    const [p] = peticiones;
    assert.equal(p.url.pathname, '/drive/v3/files');
    assert.deepEqual(JSON.parse(p.cuerpo), { name: 'fotos', mimeType: CARPETA, parents: ['carpeta-9'] });
  });

  test('listarFotos recorre todas las páginas', async () => {
    regla((p) => !p.url.searchParams.get('pageToken'), () => json({
      files: [{ id: '1', name: 'a.webp', createdTime: '2026-11-01T00:00:00Z', ownedByMe: true }],
      nextPageToken: 'pagina-2',
    }));
    regla((p) => p.url.searchParams.get('pageToken') === 'pagina-2', () => json({
      files: [{ id: '2', name: 'b.webp', createdTime: '2026-11-02T00:00:00Z', ownedByMe: false }],
    }));
    const fotos = await cliente().listarFotos('fotos-1');
    assert.deepEqual(fotos.map((f) => f.id), ['1', '2']);
    assert.equal(fotos[1].ownedByMe, false);
    const [p] = peticiones;
    assert.match(p.url.searchParams.get('q'), /'fotos-1' in parents/);
    assert.match(p.url.searchParams.get('q'), /trashed = false/);
    assert.match(p.url.searchParams.get('fields'), /nextPageToken/);
    assert.match(p.url.searchParams.get('fields'), /files\(id,name,createdTime,ownedByMe\)/);
    assert.equal(p.url.searchParams.get('pageSize'), '1000');
  });

  test('subirFoto manda los metadatos y los bytes de la imagen', async () => {
    regla((p) => p.metodo === 'POST', () => json({ id: 'archivo-foto' }));
    const blob = new Blob([new Uint8Array([0x52, 0x49, 0x46, 0x46, 0xff, 0x00])], { type: 'image/webp' });
    assert.equal(await cliente().subirFoto('fotos-1', FOTO, blob), 'archivo-foto');
    const [p] = peticiones;
    assert.equal(p.url.origin + p.url.pathname, 'https://www.googleapis.com/upload/drive/v3/files');
    assert.equal(p.url.searchParams.get('uploadType'), 'multipart');
    const limite = p.cabeceras['content-type'].match(/^multipart\/related; boundary=(.+)$/)?.[1];
    assert.ok(limite, 'falta el boundary');
    const bytes = new Uint8Array(await new Response(p.cuerpo).arrayBuffer());
    const texto = new TextDecoder('latin1').decode(bytes);
    const metadatos = JSON.parse(texto.split('\r\n\r\n')[1].split('\r\n')[0]);
    assert.deepEqual(metadatos, { name: FOTO, mimeType: 'image/webp', parents: ['fotos-1'] });
    assert.match(texto, /Content-Type: image\/webp/);
    const inicio = bytes.findIndex((b, i) => b === 0x52 && bytes[i + 1] === 0x49 && bytes[i + 2] === 0x46);
    assert.deepEqual([...bytes.slice(inicio, inicio + 6)], [0x52, 0x49, 0x46, 0x46, 0xff, 0x00], 'los bytes van sin cambios');
    assert.ok(texto.trimEnd().endsWith(`--${limite}--`));
  });

  test('subirFoto con el token rechazado: ErrorToken', async () => {
    regla(() => true, () => json({}, 401));
    await assert.rejects(cliente().subirFoto('fotos-1', FOTO, new Blob(['x'], { type: 'image/webp' })), ErrorToken);
  });

  test('descargarFoto devuelve la imagen', async () => {
    regla((p) => p.url.searchParams.get('alt') === 'media', () => new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'image/jpeg' } }));
    const blob = await cliente().descargarFoto('archivo-foto');
    assert.equal(blob.type, 'image/jpeg');
    assert.deepEqual([...new Uint8Array(await blob.arrayBuffer())], [1, 2, 3]);
    assert.equal(peticiones[0].url.pathname, '/drive/v3/files/archivo-foto');
  });

  test('descargarFoto rechaza lo que no es WebP ni JPEG', async () => {
    regla(() => true, () => new Response('<html>', { headers: { 'Content-Type': 'text/html' } }));
    await assert.rejects(cliente().descargarFoto('archivo-foto'), ErrorFotoNoValida);
  });

  test('descargarFoto rechaza más de 5 MB', async () => {
    const grande = new Uint8Array(5 * 1024 * 1024 + 1);
    regla(() => true, () => new Response(grande, { headers: { 'Content-Type': 'image/webp' } }));
    await assert.rejects(cliente().descargarFoto('archivo-foto'), ErrorFotoNoValida);
  });

  test('descargarFoto rechaza por la cabecera de tamaño sin leer el cuerpo', async () => {
    let leido = false;
    // highWaterMark 0: sin él, el stream llama a pull al crearse aunque nadie lea.
    const cuerpo = new ReadableStream({ pull(c) { leido = true; c.enqueue(new Uint8Array(1)); c.close(); } }, { highWaterMark: 0 });
    regla(() => true, () => new Response(cuerpo, { headers: { 'Content-Type': 'image/webp', 'Content-Length': String(6 * 1024 * 1024) } }));
    await assert.rejects(cliente().descargarFoto('archivo-foto'), ErrorFotoNoValida);
    assert.equal(leido, false);
  });

  test('descargarFoto de un archivo que ya no está: ErrorNoDisponible', async () => {
    regla(() => true, () => json({}, 404));
    await assert.rejects(cliente().descargarFoto('archivo-foto'), ErrorNoDisponible);
  });

  test('papeleraFoto manda el archivo a la papelera', async () => {
    regla((p) => p.metodo === 'PATCH', () => json({ id: 'archivo-foto' }));
    await cliente().papeleraFoto('archivo-foto');
    const [p] = peticiones;
    assert.equal(p.url.pathname, '/drive/v3/files/archivo-foto');
    assert.deepEqual(JSON.parse(p.cuerpo), { trashed: true });
  });

  test('papeleraFoto rechazada por Drive (foto de otra cuenta): ErrorNoDisponible', async () => {
    regla(() => true, () => json({}, 403));
    await assert.rejects(cliente().papeleraFoto('archivo-foto'), ErrorNoDisponible);
  });
});

describe('Tamaño máximo del archivo de Drive', () => {
  const { ErrorArchivoGrande } = drive;
  const MAX = 5 * 1024 * 1024;
  const conVersion = () => regla((p) => p.url.searchParams.get('fields') === 'version', () => json({ version: '1' }));

  test('Archivo demasiado grande: por la cabecera, sin leer el cuerpo', async () => {
    let leido = false;
    const cuerpo = new ReadableStream({ pull(c) { leido = true; c.enqueue(new Uint8Array(1)); c.close(); } }, { highWaterMark: 0 });
    conVersion();
    regla((p) => p.url.searchParams.get('alt') === 'media', () => new Response(cuerpo, { headers: { 'Content-Length': String(MAX + 1) } }));
    await assert.rejects(cliente().leer('abc'), (e) => ErrorArchivoGrande && e instanceof ErrorArchivoGrande);
    assert.equal(leido, false);
  });

  test('Archivo demasiado grande: sin cabecera, por lo descargado', async () => {
    conVersion();
    regla((p) => p.url.searchParams.get('alt') === 'media', () => new Response(new Uint8Array(MAX + 1)));
    await assert.rejects(cliente().leer('abc'), (e) => ErrorArchivoGrande && e instanceof ErrorArchivoGrande);
  });

  test('un archivo en el límite se lee', async () => {
    conVersion();
    const texto = `{"version":1,"productos":[]}${' '.repeat(MAX - 28)}`;
    regla((p) => p.url.searchParams.get('alt') === 'media', () => new Response(texto));
    assert.equal((await cliente().leer('abc')).texto.length, MAX);
  });
});

// Los topes se aplican a lo descargado aunque Drive no indique el tamaño o indique uno
// menor (drive-sync, "Tamaño máximo del archivo de Drive" y "Descarga de fotos"): la
// descarga se corta poco después de pasar el tope, sin leer el resto.
describe('Descargas con tope aunque no se indique el tamaño', () => {
  const { ErrorArchivoGrande, ErrorFotoNoValida } = drive;
  const MAX = 5 * 1024 * 1024;
  const TROZO = 64 * 1024;
  const conVersion = () => regla((p) => p.url.searchParams.get('fields') === 'version', () => json({ version: '1' }));

  // Cuerpo de 16 MiB en trozos de 64 KiB que cuenta los trozos entregados. Es finito para
  // que, sin el corte, la descarga termine y la prueba falle en vez de colgarse.
  function cuerpoSinFin() {
    const estado = { trozos: 0 };
    estado.cuerpo = new ReadableStream({
      pull(c) {
        if (estado.trozos * TROZO >= 16 * 1024 * 1024) { c.close(); return; }
        estado.trozos += 1;
        c.enqueue(new Uint8Array(TROZO));
      },
    }, { highWaterMark: 0 });
    return estado;
  }
  const leidoComoMucho = (estado) => assert.ok(
    estado.trozos * TROZO <= MAX + 2 * TROZO,
    `se leyeron ${estado.trozos * TROZO} bytes; como mucho el tope más un trozo`,
  );

  test('Archivo demasiado grande sin tamaño indicado', async () => {
    const estado = cuerpoSinFin();
    conVersion();
    regla((p) => p.url.searchParams.get('alt') === 'media', () => new Response(estado.cuerpo));
    await assert.rejects(cliente().leer('abc'), (e) => ErrorArchivoGrande && e instanceof ErrorArchivoGrande);
    leidoComoMucho(estado);
  });

  test('Archivo con un tamaño indicado menor que el real', async () => {
    const estado = cuerpoSinFin();
    conVersion();
    regla((p) => p.url.searchParams.get('alt') === 'media', () => new Response(estado.cuerpo, { headers: { 'Content-Length': '100' } }));
    await assert.rejects(cliente().leer('abc'), (e) => ErrorArchivoGrande && e instanceof ErrorArchivoGrande);
    leidoComoMucho(estado);
  });

  test('Foto demasiado grande sin tamaño indicado', async () => {
    const estado = cuerpoSinFin();
    regla(() => true, () => new Response(estado.cuerpo, { headers: { 'Content-Type': 'image/webp' } }));
    await assert.rejects(cliente().descargarFoto('archivo-foto'), (e) => ErrorFotoNoValida && e instanceof ErrorFotoNoValida);
    leidoComoMucho(estado);
  });

  test('Foto con un tamaño indicado menor que el real', async () => {
    const estado = cuerpoSinFin();
    regla(() => true, () => new Response(estado.cuerpo, { headers: { 'Content-Type': 'image/jpeg', 'Content-Length': '100' } }));
    await assert.rejects(cliente().descargarFoto('archivo-foto'), (e) => ErrorFotoNoValida && e instanceof ErrorFotoNoValida);
    leidoComoMucho(estado);
  });

  test('un archivo pequeño en trozos se lee entero', async () => {
    conVersion();
    const partes = ['{"version":1,', '"productos":[]}'];
    const cuerpo = new ReadableStream({ pull(c) { const p = partes.shift(); if (p) c.enqueue(new TextEncoder().encode(p)); else c.close(); } });
    regla((p) => p.url.searchParams.get('alt') === 'media', () => new Response(cuerpo));
    assert.equal((await cliente().leer('abc')).texto, '{"version":1,"productos":[]}');
  });
});

describe('Tope del listado de fotos', () => {
  const pagina = (desde, n, siguiente) => json({
    files: Array.from({ length: n }, (_, i) => ({ id: `f${desde + i}`, name: `${desde + i}.webp`, createdTime: '2026-11-01T00:00:00Z', ownedByMe: true })),
    ...(siguiente ? { nextPageToken: siguiente } : {}),
  });

  test('Carpeta con más fotos que el tope', async () => {
    regla((p) => !p.url.searchParams.get('pageToken'), () => pagina(0, 1000, 'p2'));
    regla((p) => p.url.searchParams.get('pageToken') === 'p2', () => pagina(1000, 1000, 'p3'));
    regla((p) => p.url.searchParams.get('pageToken') === 'p3', () => pagina(2000, 500));
    const fotos = await cliente().listarFotos('fotos-1');
    assert.equal(fotos.length, 2000);
    assert.equal(peticiones.length, 2, 'no pide la tercera página');
  });

  test('una página que pasa del tope se recorta', async () => {
    regla((p) => !p.url.searchParams.get('pageToken'), () => pagina(0, 1500, 'p2'));
    regla((p) => p.url.searchParams.get('pageToken') === 'p2', () => pagina(1500, 1000));
    const fotos = await cliente().listarFotos('fotos-1');
    assert.equal(fotos.length, 2000);
    assert.equal(fotos.at(-1).id, 'f1999');
  });

  test('el listado pide primero las fotos más recientes', async () => {
    regla(() => true, () => json({ files: [] }));
    await cliente().listarFotos('fotos-1');
    assert.equal(peticiones[0].url.searchParams.get('orderBy'), 'createdTime desc');
  });
});
