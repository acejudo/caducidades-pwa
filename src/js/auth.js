// Autenticación con Google restringida a emails autorizados (SPEC §6).
//
// Separa dos conceptos:
// - Sesión: identidad autorizada recordada en el dispositivo (localStorage). Da acceso
//   a la app, también sin conexión, hasta que el usuario cierra sesión.
// - Token: credencial temporal (~1 h) para Google Drive (sessionStorage). No sobrevive
//   a cerrar la app; se renueva con renovarToken() desde un gesto del usuario.

import { GOOGLE_CLIENT_ID, EMAILS_AUTORIZADOS_SHA256, DRIVE_SCOPE } from './config.js';

const CLAVE_SESION = 'caducidades.sesion';
const CLAVE_TOKEN = 'caducidades.token';
const GIS_URL = 'https://accounts.google.com/gsi/client';
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';
const GIS_TIMEOUT_MS = 10000;
const MARGEN_TOKEN_MS = 60000;
const SCOPES = `openid email profile ${DRIVE_SCOPE}`;
// Errores de GIS que significan que el usuario no terminó el flujo.
const CANCELACIONES = new Set(['popup_closed', 'access_denied']);

// ---------- Almacenamiento (puede estar bloqueado: nunca debe lanzar) ----------

function leer(almacen, clave) {
  try {
    const valor = almacen().getItem(clave);
    return valor ? JSON.parse(valor) : null;
  } catch {
    return null;
  }
}

function escribir(almacen, clave, valor) {
  try {
    almacen().setItem(clave, JSON.stringify(valor));
  } catch {
    // Sin almacenamiento: la sesión no se recuerda, pero el login actual funciona.
  }
}

function borrar(almacen, clave) {
  try {
    almacen().removeItem(clave);
  } catch {
    // Nada que borrar.
  }
}

const local = () => window.localStorage;
const sesionNavegador = () => window.sessionStorage;

// En memoria por si el almacenamiento está bloqueado.
let sesionEnMemoria = null;
let tokenEnMemoria = null;

export function sesionActual() {
  const sesion = leer(local, CLAVE_SESION) ?? sesionEnMemoria;
  if (!sesion || typeof sesion.email !== 'string' || !sesion.email) return null;
  return { email: sesion.email, nombre: sesion.nombre || sesion.email };
}

// Token vigente con el permiso de Drive actual. Un token de antes del cambio de permiso
// (solo drive.file) no cuenta: hay que renovarlo y aceptar el permiso nuevo.
export function tokenVigente() {
  const token = leer(sesionNavegador, CLAVE_TOKEN) ?? tokenEnMemoria;
  if (!token?.accessToken || !(Date.now() < token.expira)) return null;
  if (!String(token.scopes ?? '').split(' ').includes(DRIVE_SCOPE)) return null;
  return token.accessToken;
}

// Olvida el token (Google lo ha rechazado) sin tocar la sesión.
export function olvidarToken() {
  tokenEnMemoria = null;
  borrar(sesionNavegador, CLAVE_TOKEN);
}

function guardarSesion(email, nombre) {
  sesionEnMemoria = { email, nombre, desde: new Date().toISOString() };
  escribir(local, CLAVE_SESION, sesionEnMemoria);
}

function guardarToken(accessToken, expiresIn, scopes) {
  tokenEnMemoria = { accessToken, expira: Date.now() + Number(expiresIn) * 1000 - MARGEN_TOKEN_MS, scopes };
  escribir(sesionNavegador, CLAVE_TOKEN, tokenEnMemoria);
}

function olvidar() {
  sesionEnMemoria = null;
  tokenEnMemoria = null;
  borrar(local, CLAVE_SESION);
  borrar(sesionNavegador, CLAVE_TOKEN);
}

// ---------- Lista blanca ----------

export async function hashEmail(email) {
  const datos = new TextEncoder().encode(String(email).trim().toLowerCase());
  const resumen = await crypto.subtle.digest('SHA-256', datos);
  return [...new Uint8Array(resumen)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function emailAutorizado(email) {
  return EMAILS_AUTORIZADOS_SHA256.includes(await hashEmail(email));
}

// Borra la sesión guardada si su email ya no está en la lista de autorizados.
export async function revalidarSesion() {
  const sesion = sesionActual();
  if (sesion && !(await emailAutorizado(sesion.email))) olvidar();
}

// ---------- Google Identity Services ----------

let promesaGis = null;

// Carga el script de GIS una sola vez. Si falla, se descarta para poder reintentar.
export function cargarGoogle() {
  if (window.google?.accounts?.oauth2) return Promise.resolve(window.google);
  if (!promesaGis) {
    promesaGis = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = GIS_URL;
      script.async = true;
      let terminado = false;
      const fin = (error) => {
        if (terminado) return;
        terminado = true;
        clearTimeout(temporizador);
        if (error) {
          script.remove();
          promesaGis = null;
          reject(error);
        } else {
          resolve(window.google);
        }
      };
      const temporizador = setTimeout(() => fin(new Error('Tiempo de espera agotado al cargar Google')), GIS_TIMEOUT_MS);
      script.onload = () => fin(window.google?.accounts?.oauth2 ? null : new Error('Google no disponible'));
      script.onerror = () => fin(new Error('No se pudo cargar Google'));
      document.head.append(script);
    });
  }
  return promesaGis;
}

function pedirToken(google, opciones = {}) {
  return new Promise((resolve) => {
    const cliente = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPES,
      callback: resolve,
      error_callback: (error) => resolve({ error: error?.type || 'error' }),
    });
    cliente.requestAccessToken(opciones);
  });
}

function revocar(google, accessToken) {
  try {
    google.accounts.oauth2.revoke(accessToken, () => {});
  } catch {
    // La revocación es la mejor posible: nunca bloquea.
  }
}

async function pedirPerfil(accessToken) {
  const respuesta = await fetch(USERINFO_URL, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!respuesta.ok) throw new Error(`userinfo ${respuesta.status}`);
  return respuesta.json();
}

// Debe llamarse desde un gesto del usuario (abre la ventana de Google).
// Resultado: { ok: true } o { ok: false, motivo: 'denegado' | 'cancelado' | 'sin-drive' | 'error', email? }
export async function iniciarSesion() {
  let google;
  try {
    google = await cargarGoogle();
  } catch {
    return { ok: false, motivo: 'error' };
  }

  const respuesta = await pedirToken(google);
  if (respuesta.error) {
    return { ok: false, motivo: CANCELACIONES.has(respuesta.error) ? 'cancelado' : 'error' };
  }

  const accessToken = respuesta.access_token;
  if (!google.accounts.oauth2.hasGrantedAllScopes(respuesta, DRIVE_SCOPE)) {
    revocar(google, accessToken);
    return { ok: false, motivo: 'sin-drive' };
  }

  let perfil;
  try {
    perfil = await pedirPerfil(accessToken);
  } catch {
    revocar(google, accessToken);
    return { ok: false, motivo: 'error' };
  }

  const email = String(perfil.email ?? '').trim().toLowerCase();
  const verificado = perfil.email_verified === true || perfil.email_verified === 'true';
  if (!email || !verificado || !(await emailAutorizado(email))) {
    revocar(google, accessToken);
    olvidar();
    return { ok: false, motivo: 'denegado', email };
  }

  guardarSesion(email, perfil.name || email);
  guardarToken(accessToken, respuesta.expires_in, respuesta.scope ?? SCOPES);
  return { ok: true };
}

// Pide un token nuevo sin repetir el consentimiento ya dado. Si falta un permiso (por
// ejemplo, el de Drive ampliado), Google muestra el consentimiento de ese permiso
// (user-auth, "Ampliación del permiso de Drive"). Debe llamarse desde un gesto del usuario
// y con Google ya cargado (cargarGoogle()) para que no se bloquee la ventana.
// Resultado: { ok: true, token } o { ok: false, motivo: 'cancelado' | 'sin-drive' | 'error' }.
export async function renovarToken() {
  const sesion = sesionActual();
  if (!sesion) return { ok: false, motivo: 'error' };
  let google;
  try {
    google = await cargarGoogle();
  } catch {
    return { ok: false, motivo: 'error' };
  }
  const respuesta = await pedirToken(google, { prompt: '', login_hint: sesion.email });
  if (respuesta.error) {
    return { ok: false, motivo: CANCELACIONES.has(respuesta.error) ? 'cancelado' : 'error' };
  }
  if (!google.accounts.oauth2.hasGrantedAllScopes(respuesta, DRIVE_SCOPE)) {
    revocar(google, respuesta.access_token);
    return { ok: false, motivo: 'sin-drive' };
  }
  guardarToken(respuesta.access_token, respuesta.expires_in, respuesta.scope ?? SCOPES);
  return { ok: true, token: respuesta.access_token };
}

// Borra la sesión y el token al momento; la revocación en Google va aparte y sin esperar.
// Se revoca el token guardado aunque sea de un permiso anterior.
export function cerrarSesion() {
  const guardado = leer(sesionNavegador, CLAVE_TOKEN) ?? tokenEnMemoria;
  const accessToken = guardado?.accessToken && Date.now() < guardado.expira ? guardado.accessToken : null;
  olvidar();
  if (accessToken && navigator.onLine) {
    cargarGoogle().then((google) => revocar(google, accessToken)).catch(() => {});
  }
}
