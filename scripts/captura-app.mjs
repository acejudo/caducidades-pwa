#!/usr/bin/env node
// Captura la app a tamaño de móvil con una sesión simulada, para revisar pantallas y
// recorridos sin Google ni tocar datos reales. Sin dependencias: Chrome/Edge headless
// controlado por el protocolo de DevTools con el WebSocket nativo de Node 22+.
//
//   node scripts/captura-app.mjs --ruta listado --salida captura.png
//     [--productos productos.json]   productos a crear antes de abrir la app
//     [--esperar ".lista-productos"] selector que indica que la pantalla está pintada
//     [--script recorrido.js]        cuerpo de una función async que se ejecuta en la
//                                    página antes de capturar; su `return` se imprime
//     [--ancho 390 --alto 844]
//
// Imprime una línea JSON: { listo, resultado, errores }.
//
// Cómo funciona: sirve `src/` en un puerto local y en la propia carga de index.html
// guarda una sesión de `prueba@example.com`, crea los productos y arranca la app.
// `config.local.js` se sirve **modificado en memoria** con el hash de ese email añadido
// (o uno falso si no existe): el archivo real nunca se escribe. Cada ejecución usa un
// perfil de navegador temporal, así que empieza sin datos.
//
// La ruta se puede escribir sin barra inicial ("listado", "producto/nuevo"). En Git Bash
// un argumento que empieza por "/" se convierte en una ruta de Windows; el script lo
// deshace, pero sin barra se evita el problema.

import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = fileURLToPath(new URL('../src/', import.meta.url));
const EMAIL = 'prueba@example.com';
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

function argumento(nombre, porDefecto = null) {
  const i = process.argv.indexOf(`--${nombre}`);
  return i === -1 ? porDefecto : process.argv[i + 1];
}

function salir(mensaje) {
  console.error(mensaje);
  process.exit(1);
}

// Admite "listado", "/listado" o "#/listado". Si Git Bash ha convertido "/listado" en
// "C:/Program Files/Git/listado", se deshace la conversión.
const ruta = `/${argumento('ruta', 'listado')
  .replace(/\\/g, '/')
  .replace(/^#?[A-Za-z]:\/.*?\/Git(?=\/)/i, '')
  .replace(/^#?\/*/, '')}`;
const salida = argumento('salida') ?? salir('Falta --salida <archivo.png>.');
const productos = argumento('productos') ? readFileSync(argumento('productos'), 'utf8') : '[]';
const esperar = argumento('esperar', '.contenido > *');
const script = argumento('script') ? readFileSync(argumento('script'), 'utf8') : '';
const ancho = Number(argumento('ancho', 390));
const alto = Number(argumento('alto', 844));

const navegador = [
  process.env.CHROME,
  process.env.PROGRAMFILES && join(process.env.PROGRAMFILES, 'Google', 'Chrome', 'Application', 'chrome.exe'),
  process.env['PROGRAMFILES(X86)'] && join(process.env['PROGRAMFILES(X86)'], 'Google', 'Chrome', 'Application', 'chrome.exe'),
  process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe'),
  process.env['PROGRAMFILES(X86)'] && join(process.env['PROGRAMFILES(X86)'], 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean).find((r) => existsSync(r)) ?? salir('No se encontró Chrome ni Edge. Indica la ruta en la variable CHROME.');

// ---------- Servidor de src/ con sesión simulada ----------

async function configLocal() {
  const hash = createHash('sha256').update(EMAIL).digest('hex');
  const archivo = join(SRC, 'js', 'config.local.js');
  if (!existsSync(archivo)) {
    return `export const GOOGLE_CLIENT_ID = 'captura.apps.googleusercontent.com';\nexport const EMAILS_AUTORIZADOS_SHA256 = Object.freeze(['${hash}']);\n`;
  }
  return String(await readFile(archivo)).replace(/(EMAILS_AUTORIZADOS_SHA256 = Object\.freeze\(\[)/, `$1\n  '${hash}',`);
}

const servidor = createServer(async (peticion, respuesta) => {
  const url = new URL(peticion.url, 'http://localhost');
  try {
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const html = String(await readFile(join(SRC, 'index.html'))).replace(
        /<script type="module" src="js\/app.js"><\/script>/,
        `<script type="module">
          window.__errores = [];
          addEventListener('error', (e) => __errores.push(String(e.message)));
          addEventListener('unhandledrejection', (e) => __errores.push(String(e.reason)));
          localStorage.setItem('caducidades.sesion', JSON.stringify({ email: '${EMAIL}', nombre: 'Prueba', desde: new Date().toISOString() }));
          history.replaceState(null, '', '#${ruta}');
          const almacen = await import('./js/storage.js');
          for (const producto of ${productos}) await almacen.crearProducto(producto);
          await import('./js/app.js');
        </script>`);
      respuesta.writeHead(200, { 'Content-Type': TIPOS['.html'] });
      respuesta.end(html);
      return;
    }
    if (url.pathname === '/js/config.local.js') {
      respuesta.writeHead(200, { 'Content-Type': TIPOS['.js'] });
      respuesta.end(await configLocal());
      return;
    }
    const archivo = normalize(join(SRC, decodeURIComponent(url.pathname)));
    if (!archivo.startsWith(normalize(SRC + sep)) && archivo !== normalize(SRC)) throw new Error('fuera de src');
    respuesta.writeHead(200, { 'Content-Type': TIPOS[extname(archivo)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    respuesta.end(await readFile(archivo));
  } catch {
    respuesta.writeHead(404).end();
  }
});
await new Promise((resolver) => servidor.listen(0, '127.0.0.1', resolver));

// ---------- Navegador controlado por CDP ----------

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const perfil = mkdtempSync(join(tmpdir(), 'caducidades-captura-'));
const puertoCdp = 9300 + Math.floor(Math.random() * 600);
const proceso = spawn(navegador, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  `--user-data-dir=${perfil}`, `--remote-debugging-port=${puertoCdp}`, 'about:blank'], { stdio: 'ignore' });

async function terminar(codigo) {
  proceso.kill();
  servidor.close();
  await pausa(500);
  try { rmSync(perfil, { recursive: true, force: true }); } catch { /* el navegador puede tardar en soltarlo */ }
  process.exit(codigo);
}

let pagina;
for (let i = 0; i < 50 && !pagina; i++) {
  await pausa(200);
  try { pagina = (await (await fetch(`http://127.0.0.1:${puertoCdp}/json`)).json()).find((t) => t.type === 'page'); } catch { /* aún arrancando */ }
}
if (!pagina) {
  console.error('El navegador no respondió por el protocolo de DevTools.');
  await terminar(1);
}

const ws = new WebSocket(pagina.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let siguiente = 0;
const pendientes = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); pendientes.get(m.id)?.(m); });
const cdp = (method, params = {}) => new Promise((r) => { const n = ++siguiente; pendientes.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
const evaluar = async (expresion) => {
  const { result } = await cdp('Runtime.evaluate', { expression: expresion, awaitPromise: true, returnByValue: true });
  if (result?.exceptionDetails) return { error: result.exceptionDetails.exception?.description ?? result.exceptionDetails.text };
  return result?.result?.value;
};

await cdp('Emulation.setDeviceMetricsOverride', { width: ancho, height: alto, deviceScaleFactor: 2, mobile: true });
await cdp('Page.navigate', { url: `http://localhost:${servidor.address().port}/` });

let listo = false;
for (let i = 0; i < 50 && !listo; i++) {
  await pausa(200);
  listo = await evaluar(`!!document.querySelector(${JSON.stringify(esperar)})`);
}
const resultado = script ? await evaluar(`(async () => {\n${script}\n})()`) : null;
await pausa(400);
const errores = await evaluar('window.__errores ?? []');
const { result: captura } = await cdp('Page.captureScreenshot', { format: 'png' });
writeFileSync(salida, Buffer.from(captura.data, 'base64'));
console.log(JSON.stringify({ listo, resultado: resultado ?? null, errores }));
ws.close();
await terminar(listo ? 0 : 1);
