// Cliente de Google Drive API v3 con fetch, sin bibliotecas de Google (SPEC §4.2 y §7).
// Spec: openspec/specs/drive-sync. Solo usa constantes.js (nunca config.js): se prueba
// en Node con un fetch falso (tests/drive.test.js). Las fotos reales (subcarpeta
// `fotos/`) llegarán con el cambio fotos-reales.

import { DRIVE_ARCHIVO, DRIVE_CARPETA } from './constantes.js';

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

export class ErrorDrive extends Error {
  constructor(estado) {
    super(`Google Drive respondió ${estado}`);
    this.name = 'ErrorDrive';
    this.estado = estado;
  }
}

const url = (base, parametros = {}) => `${base}?${new URLSearchParams(parametros)}`;

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
    // Archivos caducidades.json propios o compartidos con la cuenta, el más antiguo primero.
    async buscarListas() {
      const q = `name = '${DRIVE_ARCHIVO}' and trashed = false and mimeType != '${TIPO_CARPETA}'`;
      const { files = [] } = await pedirJson(url(API, { q, orderBy: 'createdTime', fields: 'files(id,createdTime,version)' }));
      return files;
    },

    // La versión se lee antes que el contenido: si el archivo cambia en medio, la versión
    // anotada es la antigua y la comprobación antes de subir lo detecta (design.md §5).
    async leer(id) {
      const versionLeida = await version(id);
      const respuesta = await pedir(url(`${API}/${encodeURIComponent(id)}`, { alt: 'media' }), {}, { deArchivo: true });
      return { texto: await respuesta.text(), version: versionLeida };
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
      const limite = `caducidades-${Math.random().toString(36).slice(2)}`;
      const metadatos = { name: DRIVE_ARCHIVO, mimeType: 'application/json', parents: [carpeta] };
      const cuerpo = [
        `--${limite}`,
        'Content-Type: application/json; charset=UTF-8',
        '',
        JSON.stringify(metadatos),
        `--${limite}`,
        'Content-Type: application/json',
        '',
        texto,
        `--${limite}--`,
        '',
      ].join('\r\n');
      const { id, version: versionNueva } = await pedirJson(url(SUBIDA, { uploadType: 'multipart', fields: 'id,version' }), {
        method: 'POST',
        headers: { 'Content-Type': `multipart/related; boundary=${limite}` },
        body: cuerpo,
      });
      return { id, version: versionNueva };
    },
  };
}
