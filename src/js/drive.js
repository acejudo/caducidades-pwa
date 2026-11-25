// Cliente de Google Drive API v3 con fetch, sin bibliotecas de Google (SPEC §4.2, §4.3 y
// §7). Spec: openspec/specs/drive-sync. Solo usa constantes.js (nunca config.js): se
// prueba en Node con un fetch falso (tests/drive.test.js).

import {
  DRIVE_ARCHIVO, DRIVE_CARPETA, DRIVE_CARPETA_FOTOS, FOTO_MAX_BYTES, TIPOS_FOTO_REAL, ARCHIVO_MAX_BYTES,
  FOTOS_LISTADO_MAX,
} from './constantes.js';

const API = 'https://www.googleapis.com/drive/v3/files';
const SUBIDA = 'https://www.googleapis.com/upload/drive/v3/files';
const TIPO_CARPETA = 'application/vnd.google-apps.folder';

export class ErrorRed extends Error {
  constructor(causa) {
    super('No se pudo conectar con Google Drive');
    this.name = 'ErrorRed';
    this.causa = causa;
  }
}

// Google rechaza el token (401): hay que renovarlo.
export class ErrorToken extends Error {
  constructor() {
    super('Google Drive rechazó el token de acceso');
    this.name = 'ErrorToken';
  }
}

// El archivo ya no existe o la cuenta ha dejado de tener acceso (404, o 403 en un archivo).
export class ErrorNoDisponible extends Error {
  constructor(estado) {
    super('El archivo de Drive ya no está disponible');
    this.name = 'ErrorNoDisponible';
    this.estado = estado;
  }
}

// Lo descargado como foto no es una imagen WebP o JPEG o pasa del tamaño máximo.
export class ErrorFotoNoValida extends Error {
  constructor(motivo) {
    super(`La foto de Drive no es válida: ${motivo}`);
    this.name = 'ErrorFotoNoValida';
  }
}

// caducidades.json ocupa más de ARCHIVO_MAX_BYTES (drive-sync, "Tamaño máximo del archivo").
export class ErrorArchivoGrande extends Error {
  constructor() {
    super(`El archivo de Drive ocupa más de ${ARCHIVO_MAX_BYTES} bytes`);
    this.name = 'ErrorArchivoGrande';
  }
}

export class ErrorDrive extends Error {
  constructor(estado) {
    super(`Google Drive respondió ${estado}`);
    this.name = 'ErrorDrive';
    this.estado = estado;
  }
}

const url = (base, parametros = {}) => `${base}?${new URLSearchParams(parametros)}`;

// Un valor entre comillas simples para las consultas `q` de Drive.
const literal = (valor) => `'${String(valor).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

// Cuerpo multipart/related (metadatos JSON + contenido) para las subidas de Drive. El
// contenido puede ser texto o un Blob (las fotos van sin tocar sus bytes).
function multipart(metadatos, tipo, contenido) {
  const limite = `caducidades-${Math.random().toString(36).slice(2)}`;
  const cabecera = [
    `--${limite}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadatos),
    `--${limite}`,
    `Content-Type: ${tipo}`,
    '',
    '',
  ].join('\r\n');
  const cierre = `\r\n--${limite}--\r\n`;
  return {
    tipoContenido: `multipart/related; boundary=${limite}`,
    cuerpo: typeof contenido === 'string' ? cabecera + contenido + cierre : new Blob([cabecera, contenido, cierre]),
  };
}

// Lee el cuerpo de la respuesta por partes y corta en cuanto pasa de `maximo` bytes, aunque
// Drive no indique el tamaño o indique uno menor (drive-sync, "Tamaño máximo del archivo de
// Drive" y "Descarga de fotos"). Si ya lo indica la cabecera, no se lee nada.
async function leerHasta(respuesta, maximo, crearError) {
  if (Number(respuesta.headers.get('content-length')) > maximo) {
    respuesta.body?.cancel().catch(() => {});
    throw crearError();
  }
  if (!respuesta.body) return new Uint8Array(0);
  if (typeof respuesta.body.getReader !== 'function') {
    // Navegador sin lectura por partes: se lee entero y se comprueba después.
    const entero = new Uint8Array(await respuesta.arrayBuffer());
    if (entero.byteLength > maximo) throw crearError();
    return entero;
  }
  const lector = respuesta.body.getReader();
  const trozos = [];
  let total = 0;
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    total += value.byteLength;
    if (total > maximo) {
      lector.cancel().catch(() => {});
      throw crearError();
    }
    trozos.push(value);
  }
  const datos = new Uint8Array(total);
  let posicion = 0;
  for (const trozo of trozos) {
    datos.set(trozo, posicion);
    posicion += trozo.byteLength;
  }
  return datos;
}

// `token()` devuelve el access token vigente. `fetch` se sustituye en las pruebas.
export function crearClienteDrive({ token, fetch = globalThis.fetch.bind(globalThis) }) {
  // Hace la petición y traduce los errores. `deArchivo`: un 403 significa que se ha
  // perdido el acceso a ese archivo concreto.
  async function pedir(direccion, { method = 'GET', headers = {}, body } = {}, { deArchivo = false } = {}) {
    let respuesta;
    try {
      respuesta = await fetch(direccion, { method, headers: { Authorization: `Bearer ${token()}`, ...headers }, body });
    } catch (causa) {
      throw new ErrorRed(causa);
    }
    if (respuesta.ok) return respuesta;
    if (respuesta.status === 401) throw new ErrorToken();
    if (respuesta.status === 404 || (deArchivo && respuesta.status === 403)) throw new ErrorNoDisponible(respuesta.status);
    throw new ErrorDrive(respuesta.status);
  }

  const pedirJson = async (...argumentos) => (await pedir(...argumentos)).json();

  async function version(id) {
    const datos = await pedirJson(url(`${API}/${encodeURIComponent(id)}`, { fields: 'version' }), {}, { deArchivo: true });
    return datos.version;
  }

  async function buscarCarpeta() {
    const q = `name = '${DRIVE_CARPETA}' and mimeType = '${TIPO_CARPETA}' and 'root' in parents and trashed = false`;
    const { files = [] } = await pedirJson(url(API, { q, fields: 'files(id)', orderBy: 'createdTime' }));
    return files[0]?.id ?? null;
  }

  async function crearCarpeta() {
    const { id } = await pedirJson(url(API, { fields: 'id' }), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: DRIVE_CARPETA, mimeType: TIPO_CARPETA }),
    });
    return id;
  }

  return {
    // Archivos caducidades.json propios o compartidos con la cuenta, el más antiguo primero,
    // con su dueño: el sincronizador solo acepta los de cuentas autorizadas.
    async buscarListas() {
      const q = `name = '${DRIVE_ARCHIVO}' and trashed = false and mimeType != '${TIPO_CARPETA}'`;
      const fields = 'files(id,createdTime,version,ownedByMe,owners(emailAddress),parents)';
      const { files = [] } = await pedirJson(url(API, { q, orderBy: 'createdTime', fields }));
      return files;
    },

    // La versión se lee antes que el contenido: si el archivo cambia en medio, la versión
    // anotada es la antigua y la comprobación antes de subir lo detecta (design.md §5).
    // Más de ARCHIVO_MAX_BYTES: ErrorArchivoGrande, cortando la descarga al pasar el tope.
    async leer(id) {
      const versionLeida = await version(id);
      const respuesta = await pedir(url(`${API}/${encodeURIComponent(id)}`, { alt: 'media' }), {}, { deArchivo: true });
      const datos = await leerHasta(respuesta, ARCHIVO_MAX_BYTES, () => new ErrorArchivoGrande());
      return { texto: new TextDecoder().decode(datos), version: versionLeida };
    },

    version,

    async escribir(id, texto) {
      const datos = await pedirJson(url(`${SUBIDA}/${encodeURIComponent(id)}`, { uploadType: 'media', fields: 'version' }), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: texto,
      }, { deArchivo: true });
      return datos.version;
    },

    // Crea caducidades.json dentro de la carpeta Caducidades de la raíz (la crea si no existe).
    async crearLista(texto) {
      const carpeta = (await buscarCarpeta()) ?? (await crearCarpeta());
      const metadatos = { name: DRIVE_ARCHIVO, mimeType: 'application/json', parents: [carpeta] };
      const { tipoContenido, cuerpo } = multipart(metadatos, 'application/json', texto);
      const { id, version: versionNueva } = await pedirJson(url(SUBIDA, { uploadType: 'multipart', fields: 'id,version' }), {
        method: 'POST',
        headers: { 'Content-Type': tipoContenido },
        body: cuerpo,
      });
      return { id, version: versionNueva };
    },

    // ---------- Fotos reales (fotos-reales, design.md §5) ----------

    // Carpeta que contiene un archivo (la de la lista): ahí va la subcarpeta de fotos.
    async carpetaDeLista(archivoId) {
      const { parents = [] } = await pedirJson(url(`${API}/${encodeURIComponent(archivoId)}`, { fields: 'parents' }), {}, { deArchivo: true });
      return parents[0] ?? null;
    },

    // Subcarpeta "fotos" (la más antigua) dentro de `carpetaId`, o null.
    async buscarCarpetaFotos(carpetaId) {
      const q = `name = '${DRIVE_CARPETA_FOTOS}' and mimeType = '${TIPO_CARPETA}' and ${literal(carpetaId)} in parents and trashed = false`;
      const { files = [] } = await pedirJson(url(API, { q, fields: 'files(id)', orderBy: 'createdTime' }));
      return files[0]?.id ?? null;
    },

    async crearCarpetaFotos(carpetaId) {
      const { id } = await pedirJson(url(API, { fields: 'id' }), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: DRIVE_CARPETA_FOTOS, mimeType: TIPO_CARPETA, parents: [carpetaId] }),
      });
      return id;
    },

    // Los archivos de la carpeta de fotos (fuera de la papelera), página a página y de los
    // más recientes a los más antiguos, hasta FOTOS_LISTADO_MAX (drive-sync, "Tope del
    // listado de fotos").
    async listarFotos(carpetaFotosId) {
      const q = `${literal(carpetaFotosId)} in parents and trashed = false and mimeType != '${TIPO_CARPETA}'`;
      const fotos = [];
      let pageToken = null;
      do {
        const parametros = {
          q, fields: 'nextPageToken,files(id,name,createdTime,ownedByMe)', pageSize: '1000', orderBy: 'createdTime desc',
        };
        if (pageToken) parametros.pageToken = pageToken;
        const { files = [], nextPageToken } = await pedirJson(url(API, parametros));
        fotos.push(...files);
        pageToken = nextPageToken ?? null;
      } while (pageToken && fotos.length < FOTOS_LISTADO_MAX);
      return fotos.slice(0, FOTOS_LISTADO_MAX);
    },

    // Sube la imagen tal cual con su nombre; devuelve el id del archivo.
    async subirFoto(carpetaFotosId, nombre, blob) {
      const tipo = blob.type || 'application/octet-stream';
      const { tipoContenido, cuerpo } = multipart({ name: nombre, mimeType: tipo, parents: [carpetaFotosId] }, tipo, blob);
      const { id } = await pedirJson(url(SUBIDA, { uploadType: 'multipart', fields: 'id' }), {
        method: 'POST',
        headers: { 'Content-Type': tipoContenido },
        body: cuerpo,
      });
      return id;
    },

    // Descarga una foto. Solo acepta WebP o JPEG de FOTO_MAX_BYTES como máximo, cortando la
    // descarga al pasar el tope.
    async descargarFoto(id) {
      const respuesta = await pedir(url(`${API}/${encodeURIComponent(id)}`, { alt: 'media' }), {}, { deArchivo: true });
      const tipo = (respuesta.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
      if (!TIPOS_FOTO_REAL.includes(tipo)) {
        respuesta.body?.cancel().catch(() => {});
        throw new ErrorFotoNoValida(`tipo ${tipo || 'desconocido'}`);
      }
      const datos = await leerHasta(respuesta, FOTO_MAX_BYTES, () => new ErrorFotoNoValida('demasiado grande'));
      return new Blob([datos], { type: tipo });
    },

    // A la papelera (no se borra del todo: se puede recuperar). Una foto de otra cuenta
    // suele rechazarse con 403 → ErrorNoDisponible.
    async papeleraFoto(id) {
      await pedir(url(`${API}/${encodeURIComponent(id)}`, { fields: 'id' }), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trashed: true }),
      }, { deArchivo: true });
    },
  };
}
