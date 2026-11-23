// Pruebas de src/js/auth.js: el token ligado a la sesión, el cierre de sesión en todas
// las ventanas y la renovación con la misma cuenta. Spec: user-auth.
//
// No tocan el almacenamiento real ni Google: `usarEntornoAuth` sustituye localStorage,
// sessionStorage, Google Identity Services, la consulta del perfil y el estado de la red.
// La "otra ventana" se simula con un StorageEvent sintético sobre `window`, que es lo que
// recibe una ventana cuando otra cambia localStorage.
// auth.js importa config.js (y config.local.js): como la app, solo funciona en local.
import { prueba, antesDeCada, igual, igualProfundo } from './runner.js';

const auth = await import('../../src/js/auth.js').catch((error) => {
  console.error('No se pudo cargar auth.js', error);
  return {};
});
const { DRIVE_SCOPE } = await import('../../src/js/constantes.js');

const CLAVE_SESION = 'caducidades.sesion';
const CLAVE_TOKEN = 'caducidades.token';
const EN_UNA_HORA = () => Date.now() + 3_600_000;

// Storage en memoria con la interfaz de localStorage/sessionStorage.
function almacenFalso() {
  const datos = new Map();
  return {
    getItem: (clave) => (datos.has(clave) ? datos.get(clave) : null),
    setItem: (clave, valor) => datos.set(clave, String(valor)),
    removeItem: (clave) => datos.delete(clave),
    datos,
  };
}

// Google Identity Services falso: anota las revocaciones y entrega `respuestaToken`.
function googleFalso() {
  const g = {
    revocados: [],
    respuestaToken: { access_token: 'tok-nuevo', expires_in: 3600, scope: `openid email ${DRIVE_SCOPE}` },
    accounts: {
      oauth2: {
        revoke: (token, cb) => { g.revocados.push(token); cb?.(); },
        initTokenClient: ({ callback }) => ({ requestAccessToken: () => callback(g.respuestaToken) }),
        hasGrantedAllScopes: () => true,
      },
    },
  };
  return g;
}

let local;
let sesion;
let google;
let enLinea;
let perfil;
let dejarDeVigilar = null;

const ponerSesion = (email) => local.setItem(CLAVE_SESION, JSON.stringify({ email, nombre: email }));
const ponerToken = (datos) => sesion.setItem(CLAVE_TOKEN, JSON.stringify({
  accessToken: 'tok-a', expira: EN_UNA_HORA(), scopes: `openid ${DRIVE_SCOPE}`, email: 'a@example.com', ...datos,
}));
const tokenGuardado = () => JSON.parse(sesion.getItem(CLAVE_TOKEN));
const otraVentanaCambia = (valor) => {
  if (valor == null) local.removeItem(CLAVE_SESION);
  else local.setItem(CLAVE_SESION, JSON.stringify(valor));
  window.dispatchEvent(new StorageEvent('storage', { key: CLAVE_SESION, newValue: valor == null ? null : JSON.stringify(valor) }));
};
// La revocación va por una promesa (cargarGoogle): se espera a que termine.
const tic = () => new Promise((r) => setTimeout(r, 0));

antesDeCada(() => {
  dejarDeVigilar?.();
  dejarDeVigilar = null;
  local = almacenFalso();
  sesion = almacenFalso();
  google = googleFalso();
  enLinea = true;
  perfil = async () => ({ email: 'a@example.com', email_verified: true });
  auth.usarEntornoAuth?.({
    local, sesion, google, enLinea: () => enLinea, perfil: (token) => perfil(token),
  });
});

// ---------- Token ligado a la sesión ----------

prueba('Token de otra cuenta', () => {
  ponerSesion('b@example.com');
  ponerToken({ email: 'a@example.com' });
  igual(auth.tokenVigente(), null);
});

prueba('Token sin cuenta asociada', () => {
  ponerSesion('a@example.com');
  ponerToken({ email: undefined });
  igual(auth.tokenVigente(), null);
});

prueba('Token de la propia sesión', () => {
  ponerSesion('a@example.com');
  ponerToken({ email: 'a@example.com' });
  igual(auth.tokenVigente(), 'tok-a');
});

prueba('sin sesión no hay token vigente', () => {
  ponerToken({ email: 'a@example.com' });
  igual(auth.tokenVigente(), null);
});

// ---------- Cierre de sesión en todas las ventanas ----------

prueba('Otra ventana abierta al cerrar sesión', async () => {
  ponerSesion('a@example.com');
  ponerToken({ email: 'a@example.com', accessToken: 'tok-a-ventana2' });
  const cambios = [];
  dejarDeVigilar = auth.vigilarOtrasVentanas({ alCambiarSesion: (s) => cambios.push(s) });
  otraVentanaCambia(null);
  await tic();
  igual(sesion.getItem(CLAVE_TOKEN), null, 'borra el token de esta ventana');
  igual(auth.tokenVigente(), null);
  igualProfundo(google.revocados, ['tok-a-ventana2'], 'pide su revocación');
  igualProfundo(cambios, [null], 'avisa de que ya no hay sesión');
});

prueba('Otra cuenta inicia sesión en otra ventana', async () => {
  ponerSesion('a@example.com');
  ponerToken({ email: 'a@example.com', accessToken: 'tok-a-ventana2' });
  const cambios = [];
  dejarDeVigilar = auth.vigilarOtrasVentanas({ alCambiarSesion: (s) => cambios.push(s?.email) });
  otraVentanaCambia({ email: 'b@example.com', nombre: 'B' });
  await tic();
  igual(sesion.getItem(CLAVE_TOKEN), null, 'no conserva el token de A');
  igual(auth.tokenVigente(), null);
  igualProfundo(google.revocados, ['tok-a-ventana2']);
  igualProfundo(cambios, ['b@example.com']);
});

prueba('sin conexión, la otra ventana borra su token sin revocarlo', async () => {
  ponerSesion('a@example.com');
  ponerToken({ accessToken: 'tok-a-ventana2' });
  enLinea = false;
  dejarDeVigilar = auth.vigilarOtrasVentanas({ alCambiarSesion: () => {} });
  otraVentanaCambia(null);
  await tic();
  igual(sesion.getItem(CLAVE_TOKEN), null);
  igualProfundo(google.revocados, []);
});

prueba('un cambio de otra clave no hace nada', async () => {
  ponerSesion('a@example.com');
  ponerToken({ accessToken: 'tok-a' });
  const cambios = [];
  dejarDeVigilar = auth.vigilarOtrasVentanas({ alCambiarSesion: (s) => cambios.push(s) });
  window.dispatchEvent(new StorageEvent('storage', { key: 'caducidades.avisos', newValue: 'x' }));
  await tic();
  igual(auth.tokenVigente(), 'tok-a');
  igualProfundo(google.revocados, []);
  igualProfundo(cambios, []);
});

prueba('la misma sesión guardada otra vez conserva el token', async () => {
  ponerSesion('a@example.com');
  ponerToken({ accessToken: 'tok-a' });
  dejarDeVigilar = auth.vigilarOtrasVentanas({ alCambiarSesion: () => {} });
  otraVentanaCambia({ email: 'a@example.com', nombre: 'A' });
  await tic();
  igual(auth.tokenVigente(), 'tok-a');
  igualProfundo(google.revocados, []);
});

prueba('Token caducado al cerrar sesión', async () => {
  ponerSesion('a@example.com');
  ponerToken({ accessToken: 'tok-caducado', expira: Date.now() - 1000 });
  auth.cerrarSesion();
  await tic();
  igual(local.getItem(CLAVE_SESION), null, 'borra la sesión');
  igual(sesion.getItem(CLAVE_TOKEN), null, 'borra el token');
  igualProfundo(google.revocados, ['tok-caducado'], 'lo revoca aunque haya caducado');
});

prueba('cerrar sesión sin conexión no intenta revocar', async () => {
  ponerSesion('a@example.com');
  ponerToken({ accessToken: 'tok-a' });
  enLinea = false;
  auth.cerrarSesion();
  await tic();
  igual(local.getItem(CLAVE_SESION), null);
  igualProfundo(google.revocados, []);
});

// ---------- Renovación con la misma cuenta ----------

prueba('Se elige otra cuenta al renovar', async () => {
  ponerSesion('a@example.com');
  google.respuestaToken = { access_token: 'tok-de-b', expires_in: 3600, scope: `openid email ${DRIVE_SCOPE}` };
  perfil = async () => ({ email: 'B@example.com', email_verified: true });
  const resultado = await auth.renovarToken();
  await tic();
  igualProfundo(resultado, { ok: false, motivo: 'otra-cuenta' });
  igual(sesion.getItem(CLAVE_TOKEN), null, 'no se guarda');
  igual(auth.tokenVigente(), null);
  igualProfundo(google.revocados, ['tok-de-b'], 'se revoca');
  igual(auth.sesionActual()?.email, 'a@example.com', 'la sesión no cambia');
});

prueba('No se puede comprobar la cuenta', async () => {
  ponerSesion('a@example.com');
  perfil = async () => { throw new Error('userinfo 500'); };
  const resultado = await auth.renovarToken();
  await tic();
  igualProfundo(resultado, { ok: false, motivo: 'error' });
  igual(sesion.getItem(CLAVE_TOKEN), null);
  igualProfundo(google.revocados, ['tok-nuevo']);
});

prueba('Renovación con la cuenta de la sesión', async () => {
  ponerSesion('a@example.com');
  perfil = async () => ({ email: ' A@Example.com ', email_verified: true });
  const resultado = await auth.renovarToken();
  igual(resultado.ok, true);
  igual(tokenGuardado().email, 'a@example.com', 'el token guarda la cuenta');
  igual(auth.tokenVigente(), 'tok-nuevo');
  igualProfundo(google.revocados, []);
});
