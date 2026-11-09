#!/usr/bin/env node
// Ejecuta las pruebas de navegador (tests/navegador/) en Chrome o Edge headless, sin
// dependencias.
//
// 1. Sirve la raíz del repo con node:http en un puerto libre de localhost.
// 2. Abre tests/navegador/?informar=1 en el navegador headless con un perfil temporal.
// 3. La página envía su resultado por POST a /__resultado; el script lo muestra y sale
//    con código 0 (todo en verde) o 1 (algún fallo, sin resultado o sin navegador).
//
// Uso: npm run test:navegador
// Si no encuentra el navegador, indica su ruta en la variable de entorno CHROME.

import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const TIEMPO_MAXIMO_MS = 60_000;

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

function rutasNavegador() {
  const { PROGRAMFILES, LOCALAPPDATA } = process.env;
  const programFilesX86 = process.env['PROGRAMFILES(X86)'];
  return [
    process.env.CHROME,
    PROGRAMFILES && join(PROGRAMFILES, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    programFilesX86 && join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    LOCALAPPDATA && join(LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    programFilesX86 && join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    PROGRAMFILES && join(PROGRAMFILES, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/microsoft-edge',
  ].filter(Boolean);
}

function salir(codigo, mensaje) {
  if (mensaje) (codigo === 0 ? console.log : console.error)(mensaje);
  process.exit(codigo);
}

const navegador = rutasNavegador().find((ruta) => existsSync(ruta));
if (!navegador) {
  salir(1, 'No se encontró Chrome ni Edge. Indica la ruta del navegador en la variable CHROME, por ejemplo:\n'
    + '  PowerShell: $env:CHROME = "C:\\ruta\\a\\chrome.exe"; npm run test:navegador\n'
    + '  bash:       CHROME=/ruta/a/chrome npm run test:navegador');
}

let alRecibirResultado;
const resultadoRecibido = new Promise((resolver) => { alRecibirResultado = resolver; });

const servidor = createServer(async (peticion, respuesta) => {
  const url = new URL(peticion.url, 'http://localhost');

  if (peticion.method === 'POST' && url.pathname === '/__resultado') {
    let cuerpo = '';
    for await (const trozo of peticion) cuerpo += trozo;
    respuesta.writeHead(204).end();
    try {
      alRecibirResultado(JSON.parse(cuerpo));
    } catch {
      alRecibirResultado({ estado: 'fallo', resumen: 'Resultado ilegible', filas: [] });
    }
    return;
  }

  let ruta = decodeURIComponent(url.pathname);
  if (ruta.endsWith('/')) ruta += 'index.html';
  const archivo = normalize(join(RAIZ, ruta));
  if (!archivo.startsWith(normalize(RAIZ + sep)) && archivo !== normalize(RAIZ)) {
    respuesta.writeHead(403).end();
    return;
  }
  try {
    const contenido = await readFile(archivo);
    respuesta.writeHead(200, {
      'Content-Type': TIPOS[extname(archivo)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    respuesta.end(contenido);
  } catch {
    respuesta.writeHead(404).end();
  }
});

await new Promise((resolver) => servidor.listen(0, '127.0.0.1', resolver));
// localhost (y no 127.0.0.1) para que el origen sea un contexto seguro igual que en desarrollo.
const direccion = `http://localhost:${servidor.address().port}/tests/navegador/?informar=1`;

const perfil = mkdtempSync(join(tmpdir(), 'caducidades-pruebas-'));
const proceso = spawn(navegador, [
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-extensions',
  `--user-data-dir=${perfil}`,
  direccion,
], { stdio: 'ignore' });

let errorNavegador = null;
proceso.on('error', (error) => { errorNavegador = error; alRecibirResultado(null); });

const temporizador = setTimeout(() => alRecibirResultado(null), TIEMPO_MAXIMO_MS);
const resultado = await resultadoRecibido;
clearTimeout(temporizador);

proceso.kill();
servidor.close();
await new Promise((resolver) => setTimeout(resolver, 500));
try { rmSync(perfil, { recursive: true, force: true }); } catch { /* el navegador puede tardar en soltarlo */ }

if (errorNavegador) salir(1, `No se pudo lanzar ${navegador}: ${errorNavegador.message}`);
if (!resultado) {
  salir(1, `Las pruebas no enviaron ningún resultado en ${TIEMPO_MAXIMO_MS / 1000} s. Abre ${direccion.replace('?informar=1', '')} a mano para ver qué pasa.`);
}

for (const fila of resultado.filas ?? []) console.log(fila);
console.log('');
salir(resultado.estado === 'ok' ? 0 : 1, `${resultado.estado === 'ok' ? '✔' : '✖'} ${resultado.resumen}`);
