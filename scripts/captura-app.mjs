#!/usr/bin/env node
// Captura la app a tamaño de móvil con una sesión simulada, para revisar pantallas y
// recorridos sin Google ni tocar datos reales. Sin dependencias: Chrome/Edge headless
// controlado por el protocolo de DevTools por tubería (--remote-debugging-pipe), sin
// abrir ningún puerto de depuración.
//
//   node scripts/captura-app.mjs --ruta listado --salida captura.png
//     [--productos productos.json]   productos a crear antes de abrir la app
//     [--esperar ".lista-productos"] selector que indica que la pantalla está pintada
//     [--script recorrido.js]        cuerpo de una función async que se ejecuta en la
//                                    página antes de capturar; su `return` se imprime
//     [--ancho 390 --alto 844]
//
// Imprime una línea JSON: { listo, resultado, errores, conocidos }. `conocidos` son las
// infracciones de la CSP esperadas (el estilo en línea de Google Sign-In).
//
// Cómo funciona: sirve `src/` en un puerto local y cambia el script de index.html por
// `__captura.js`, que guarda una sesión de `prueba@example.com`, crea los productos y
// arranca la app. La Content-Security-Policy real sigue activa: sus infracciones salen
// en `errores`.
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
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolverArchivo } from './lib/servir.mjs';
import { crearClienteCdp } from './lib/cdp.mjs';

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
      const original = String(await readFile(join(SRC, 'index.html')));
      const html = original.replace('<script type="module" src="js/app.js"></script>', '<script type="module" src="__captura.js"></script>');
      if (html === original) throw new Error('index.html ya no carga js/app.js como se esperaba');
      respuesta.writeHead(200, { 'Content-Type': TIPOS['.html'], 'Cache-Control': 'no-store' });
      respuesta.end(html);
      return;
    }
    // Script de arranque con la sesión simulada. Es un archivo aparte (no un script en
    // línea) para que la Content-Security-Policy real siga activa en las capturas.
    if (url.pathname === '/__captura.js') {
      respuesta.writeHead(200, { 'Content-Type': TIPOS['.js'], 'Cache-Control': 'no-store' });
      respuesta.end(`window.__errores = [];
addEventListener('error', (e) => __errores.push(String(e.message)));
addEventListener('unhandledrejection', (e) => __errores.push(String(e.reason)));
// El cliente de Google Sign-In inserta un <style> en línea para sus botones, que la app no
// usa: la CSP lo bloquea a propósito. Se anota aparte para que no tape infracciones nuevas.
window.__conocidos = [];
addEventListener('securitypolicyviolation', (e) => {
  const texto = 'CSP: ' + e.violatedDirective + ' bloquea ' + e.blockedURI;
  const deGoogle = e.violatedDirective.startsWith('style-src') && e.blockedURI === 'inline'
    && String(e.sourceFile).startsWith('https://accounts.google.com/gsi/');
  (deGoogle ? __conocidos : __errores).push(texto);
});
localStorage.setItem('caducidades.sesion', JSON.stringify({ email: ${JSON.stringify(EMAIL)}, nombre: 'Prueba', desde: new Date().toISOString() }));
history.replaceState(null, '', ${JSON.stringify(`#${ruta}`)});
const almacen = await import('./js/storage.js');
for (const producto of ${productos}) await almacen.crearProducto(producto);
await import('./js/app.js');
`);
      return;
    }
    if (url.pathname === '/js/config.local.js') {
      const contenido = await configLocal();
      respuesta.writeHead(200, { 'Content-Type': TIPOS['.js'] });
      respuesta.end(contenido);
      return;
    }
    const archivo = resolverArchivo({ raiz: SRC, pathname: url.pathname });
    if (!archivo) throw new Error('ruta no permitida');
    // Se lee antes de escribir la cabecera: si no existe, la respuesta es un 404.
    const contenido = await readFile(archivo);
    respuesta.writeHead(200, { 'Content-Type': TIPOS[extname(archivo)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    respuesta.end(contenido);
  } catch {
    // Nunca tira el servidor: un error solo afecta a esta petición.
    if (!respuesta.headersSent) respuesta.writeHead(404);
    respuesta.end();
  }
});
// Solo loopback: el servidor no debe ser accesible desde la red. No cambiar a 0.0.0.0.
await new Promise((resolver) => servidor.listen(0, '127.0.0.1', resolver));

// ---------- Navegador controlado por CDP ----------

// Por tubería (--remote-debugging-pipe) y no por un puerto de depuración: así ningún otro
// proceso local puede conectarse a este Chrome mientras dura la captura.
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const perfil = mkdtempSync(join(tmpdir(), 'caducidades-captura-'));
const proceso = spawn(navegador, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  `--user-data-dir=${perfil}`, '--remote-debugging-pipe', 'about:blank'], { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] });
// Si Chrome se cierra, escribir en la tubería falla: se trata como fin de la captura.
proceso.stdio[3].on('error', () => {});

let terminando = false;
async function terminar(codigo) {
  if (terminando) return;
  terminando = true;
  proceso.kill();
  servidor.close();
  await pausa(500);
  try { rmSync(perfil, { recursive: true, force: true }); } catch { /* el navegador puede tardar en soltarlo */ }
  process.exit(codigo);
}
// Chrome no se queda abierto aunque se interrumpa el script o algo se cuelgue.
process.on('SIGINT', () => terminar(130));
setTimeout(() => {
  console.error('La captura tardó demasiado.');
  terminar(1);
}, 90_000).unref();

const cliente = crearClienteCdp(proceso);
let codigo = 1;
try {
  let pagina;
  for (let i = 0; i < 50 && !pagina; i++) {
    const { result } = await cliente.enviar('Target.getTargets');
    pagina = result?.targetInfos?.find((t) => t.type === 'page');
    if (!pagina) await pausa(200);
  }
  if (!pagina) throw new Error('El navegador no respondió por el protocolo de DevTools.');
  const { result: { sessionId } } = await cliente.enviar('Target.attachToTarget', { targetId: pagina.targetId, flatten: true });
  const cdp = (method, params = {}) => cliente.enviar(method, params, sessionId);
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
  const conocidos = await evaluar('window.__conocidos ?? []');
  const { result: captura } = await cdp('Page.captureScreenshot', { format: 'png' });
  writeFileSync(salida, Buffer.from(captura.data, 'base64'));
  console.log(JSON.stringify({ listo, resultado: resultado ?? null, errores, conocidos }));
  codigo = listo ? 0 : 1;
} catch (error) {
  console.error(error.message);
} finally {
  await terminar(codigo);
}
