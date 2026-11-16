// Pruebas del orquestador de la sincronización (src/js/sincronizador.js).
// Spec: drive-sync (y los estados de sync-status). Usan el almacenamiento real sobre la
// base de datos de pruebas y dobles de Drive, auth, red, preferencias y temporizador.
import { prueba, antesDeCada, igual, igualProfundo, verdadero } from './runner.js';

const storage = await import('../../src/js/storage.js').catch(() => ({}));
const sincronizacion = await import('../../src/js/sincronizacion.js').catch(() => ({}));
const drive = await import('../../src/js/drive.js').catch(() => ({}));
const sincronizador = await import('../../src/js/sincronizador.js').catch((error) => {
  console.error('No se pudo cargar sincronizador.js', error);
  return {};
});

const BD_PRUEBAS = 'caducidades-pruebas';
const AHORA = new Date('2026-11-13T12:00:00.000Z');

function borrarBaseDeDatos(nombre) {
  return new Promise((resolver, rechazar) => {
    const peticion = indexedDB.deleteDatabase(nombre);
    peticion.onsuccess = () => resolver();
    peticion.onerror = () => rechazar(peticion.error);
    peticion.onblocked = () => rechazar(new Error(`No se pudo borrar ${nombre}: hay una conexión abierta`));
  });
}

function producto(id, cambios = {}) {
  return {
    id,
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

// ---------- Dobles ----------

// Drive en memoria con la interfaz de crearClienteDrive. Cada archivo tiene dueño: por
// defecto, la propia cuenta (a@example.com).
const PROPIA = 'a@example.com';
function crearDriveFalso() {
  const archivos = new Map(); // id → { texto, version, createdTime, ownedByMe, owners }
  const accesos = []; // 'leer:<id>', 'escribir:<id>'... para saber qué archivos se tocan
  const fallos = {}; // método → error que lanza la próxima llamada
  const ganchos = {}; // método → función que se ejecuta tras la llamada (una vez)
  const llamadas = [];
  let contador = 0;

  const llamar = async (metodo, fn, id) => {
    llamadas.push(metodo);
    if (id !== undefined) accesos.push(`${metodo}:${id}`);
    if (fallos[metodo]) {
      const error = fallos[metodo];
      delete fallos[metodo];
      throw error;
    }
    const resultado = await fn();
    const gancho = ganchos[metodo];
    if (gancho) {
      delete ganchos[metodo];
      await gancho();
    }
    return resultado;
  };
  const archivo = (id) => {
    const a = archivos.get(id);
    if (!a) throw new drive.ErrorNoDisponible(404);
    return a;
  };

  const cliente = {
    buscarListas: () => llamar('buscarListas', () => [...archivos.entries()]
      .sort(([, a], [, b]) => a.createdTime.localeCompare(b.createdTime))
      .map(([id, a]) => ({
        id, createdTime: a.createdTime, version: String(a.version), ownedByMe: a.ownedByMe, owners: a.owners,
      }))),
    leer: (id) => llamar('leer', () => ({ texto: archivo(id).texto, version: String(archivo(id).version) }), id),
    version: (id) => llamar('version', () => String(archivo(id).version), id),
    escribir: (id, texto) => llamar('escribir', () => {
      const a = archivo(id);
      a.texto = texto;
      a.version += 1;
      return String(a.version);
    }, id),
    crearLista: (texto) => llamar('crearLista', () => {
      contador += 1;
      const id = `creada-${contador}`;
      archivos.set(id, { texto, version: 1, createdTime: AHORA.toISOString(), ownedByMe: true, owners: [{ emailAddress: PROPIA }] });
      return { id, version: '1' };
    }),
  };

  return {
    cliente,
    llamadas,
    accesos,
    tocado: (id) => accesos.some((a) => a.endsWith(`:${id}`)),
    fallar: (metodo, error) => { fallos[metodo] = error; },
    despuesDe: (metodo, fn) => { ganchos[metodo] = fn; },
    // `dueno`: email del dueño (null = sin dueño legible). Es propio si es PROPIA.
    poner(id, productos, createdTime = '2026-11-01T00:00:00.000Z', dueno = PROPIA) {
      archivos.set(id, {
        texto: sincronizacion.crearArchivo(productos, AHORA),
        version: 1,
        createdTime,
        ownedByMe: dueno === PROPIA,
        owners: dueno ? [{ emailAddress: dueno }] : undefined,
      });
    },
    productos: (id) => JSON.parse(archivos.get(id).texto).productos,
    archivos,
  };
}

function crearAuthFalso({ sesion = true, token = 'tok' } = {}) {
  const auth = {
    token,
    renovaciones: 0,
    respuestaRenovar: { ok: true },
    olvidados: 0,
    sesionActual: () => (sesion ? { email: 'a@example.com', nombre: 'A' } : null),
    tokenVigente: () => auth.token,
    renovarToken: async () => {
      auth.renovaciones += 1;
      if (auth.respuestaRenovar.ok) auth.token = 'tok-nuevo';
      return auth.respuestaRenovar;
    },
    olvidarToken: () => { auth.olvidados += 1; auth.token = null; },
    // Lista blanca: la propia cuenta y ana@example.com.
    esEmailAutorizado: async (email) => ['a@example.com', 'ana@example.com'].includes(String(email).trim().toLowerCase()),
  };
  return auth;
}

function crearTemporizadorManual() {
  let siguiente = 0;
  const pendientes = new Map();
  return {
    programar: (fn) => { siguiente += 1; pendientes.set(siguiente, fn); return siguiente; },
    cancelar: (id) => pendientes.delete(id),
    cuantos: () => pendientes.size,
    avanzar() {
      const fns = [...pendientes.values()];
      pendientes.clear();
      fns.forEach((fn) => fn());
    },
  };
}

let driveFalso;
let auth;
let red;
let prefs;
let temporizador;
let confirmaciones;
let respuestaConfirmar;
let sinc;

function crear(opciones = {}) {
  sinc = sincronizador.crearSincronizador({
    crearDrive: () => driveFalso.cliente,
    auth,
    red,
    preferencias: prefs,
    confirmar: async (datos) => { confirmaciones.push(datos); return respuestaConfirmar; },
    temporizador,
    ahora: () => AHORA,
    ...opciones,
  });
  return sinc;
}

const nombres = async () => (await storage.listarProductos()).map((p) => p.nombre).sort();
const estado = () => sinc.estado();

antesDeCada(async () => {
  sinc?.detener?.();
  storage.usarBaseDeDatos(BD_PRUEBAS);
  await borrarBaseDeDatos(BD_PRUEBAS);
  driveFalso = crearDriveFalso();
  auth = crearAuthFalso();
  let enLinea = true;
  red = { enLinea: () => enLinea, objetivo: new EventTarget(), poner: (valor) => { enLinea = valor; } };
  let datos = { archivoId: null, pendiente: false, ultima: null };
  prefs = { leer: () => ({ ...datos }), escribir: (nuevos) => { datos = { ...nuevos }; } };
  temporizador = crearTemporizadorManual();
  confirmaciones = [];
  respuestaConfirmar = true;
});

// ---------- Localizar y crear la lista ----------

prueba('Lista compartida por otra cuenta', async () => {
  driveFalso.poner('de-A', [producto('q', { nombre: 'Queso de A' })], undefined, 'ana@example.com');
  await crear().sincronizar();
  igualProfundo(await nombres(), ['Queso de A']);
  igual(prefs.leer().archivoId, 'de-A', 'recuerda el archivo');
  igual(estado().texto, 'Sincronizado');
});

prueba('Varias listas', async () => {
  driveFalso.poner('nueva', [producto('n', { nombre: 'De la nueva' })], '2026-11-05T00:00:00.000Z');
  driveFalso.poner('antigua', [producto('v', { nombre: 'De la antigua' })], '2026-11-01T00:00:00.000Z');
  await crear().sincronizar();
  igualProfundo(await nombres(), ['De la antigua']);
  igual(prefs.leer().archivoId, 'antigua');
});

prueba('el archivo recordado no se vuelve a buscar', async () => {
  driveFalso.poner('mia', [producto('a')]);
  prefs.escribir({ archivoId: 'mia', pendiente: false, ultima: null });
  await crear().sincronizar();
  igual(driveFalso.llamadas.includes('buscarListas'), false);
});

prueba('Archivo recordado ya no disponible', async () => {
  prefs.escribir({ archivoId: 'borrado', pendiente: true, ultima: null });
  driveFalso.poner('otra', [producto('o', { nombre: 'Otra lista' })]);
  await crear().sincronizar();
  igualProfundo(await nombres(), ['Otra lista']);
  igual(prefs.leer().archivoId, 'otra');
  igual(estado().texto, 'Sincronizado');
});

prueba('Primera sincronización sin lista', async () => {
  await storage.crearProducto({ nombre: 'Leche', fechaCaducidad: '2026-11-20' });
  await crear().sincronizar();
  igual(confirmaciones.length, 1, 'pregunta antes de crear');
  igual(confirmaciones[0].mensaje, 'No hay ninguna lista en tu Drive ni compartida contigo. ¿Crear una nueva?');
  const [id] = driveFalso.archivos.keys();
  igual(prefs.leer().archivoId, id);
  igualProfundo(driveFalso.productos(id).map((p) => p.nombre), ['Leche']);
  igual(estado().texto, 'Sincronizado');
});

prueba('Esperar a que la compartan', async () => {
  await storage.crearProducto({ nombre: 'Leche', fechaCaducidad: '2026-11-20' });
  respuestaConfirmar = false;
  await crear().sincronizar();
  igual(driveFalso.archivos.size, 0, 'no crea nada');
  igual(estado().pendiente, true);
  igual(estado().texto, 'Cambios pendientes');
});

prueba('en automático solo pregunta una vez por sesión de la app', async () => {
  respuestaConfirmar = false;
  crear();
  await sinc.sincronizar();
  await sinc.sincronizar();
  igual(confirmaciones.length, 1, 'la segunda automática no vuelve a preguntar');
  await sinc.sincronizar({ aPeticion: true });
  igual(confirmaciones.length, 2, 'a petición sí pregunta');
});

// ---------- Fusión de punta a punta ----------

prueba('Producto nuevo en otro dispositivo', async () => {
  await storage.guardarSincronizados([producto('a', { nombre: 'Leche' })]);
  driveFalso.poner('lista', [producto('a', { nombre: 'Leche' }), producto('q', { nombre: 'Queso' })]);
  await crear().sincronizar();
  igualProfundo(await nombres(), ['Leche', 'Queso']);
});

prueba('Gana la edición más reciente', async () => {
  await storage.guardarSincronizados([producto('l', { nombre: 'Leche', cantidad: 2, actualizado: '2026-11-13T10:00:00.000Z' })]);
  driveFalso.poner('lista', [producto('l', { nombre: 'Leche', cantidad: 5, actualizado: '2026-11-13T11:00:00.000Z' })]);
  await crear().sincronizar();
  igual((await storage.obtenerProducto('l')).cantidad, 5, 'en el dispositivo');
  igual(driveFalso.productos('lista')[0].cantidad, 5, 'en Drive');
});

prueba('Baja en otro dispositivo', async () => {
  await storage.guardarSincronizados([producto('p', { nombre: 'Pan' })]);
  driveFalso.poner('lista', [producto('p', { nombre: 'Pan', eliminado: true, actualizado: '2026-11-12T10:00:00.000Z' })]);
  await crear().sincronizar();
  igualProfundo(await nombres(), []);
});

prueba('Cambios locales subidos', async () => {
  driveFalso.poner('lista', []);
  const nuevo = await storage.crearProducto({ nombre: 'Huevos', fechaCaducidad: '2026-11-25' });
  crear();
  await sinc.sincronizar();
  igualProfundo(driveFalso.productos('lista').map((p) => p.id), [nuevo.id]);
  igual(estado().pendiente, false);
});

// ---------- Archivo y escrituras simultáneas ----------

prueba('Archivo dañado', async () => {
  await storage.guardarSincronizados([producto('a', { nombre: 'Leche' })]);
  driveFalso.archivos.set('lista', { texto: '{ dañado', version: 1, createdTime: '2026-11-01T00:00:00.000Z' });
  prefs.escribir({ archivoId: 'lista', pendiente: true, ultima: null });
  await crear().sincronizar();
  igual(driveFalso.archivos.get('lista').texto, '{ dañado', 'no se sobrescribe');
  igual(driveFalso.llamadas.includes('escribir'), false);
  igualProfundo(await nombres(), ['Leche'], 'el dispositivo no cambia');
  igual(estado().texto, 'Error al sincronizar');
  igual(estado().error, 'El archivo de la lista en Drive no es válido. No se ha cambiado nada.');
  igual(estado().pendiente, true);
});

prueba('Otro dispositivo sube a la vez', async () => {
  driveFalso.poner('lista', [producto('a')]);
  const local = await storage.crearProducto({ nombre: 'Leche', fechaCaducidad: '2026-11-20' });
  // Justo después de la primera descarga, otro dispositivo sube "Huevos".
  driveFalso.despuesDe('leer', () => {
    const a = driveFalso.archivos.get('lista');
    a.texto = sincronizacion.crearArchivo([producto('a'), producto('h', { nombre: 'Huevos' })], AHORA);
    a.version += 1;
  });
  await crear().sincronizar();
  const enDrive = driveFalso.productos('lista').map((p) => p.id).sort();
  igualProfundo(enDrive, ['a', 'h', local.id].sort());
  igualProfundo(await nombres(), ['Huevos', 'Leche', 'Producto a']);
});

// ---------- Automática ----------

prueba('Tras el login', async () => {
  driveFalso.poner('lista', [producto('q', { nombre: 'Queso' })]);
  crear();
  sinc.iniciar();
  await sinc.terminado();
  igualProfundo(await nombres(), ['Queso']);
});

prueba('Tras un alta', async () => {
  driveFalso.poner('lista', []);
  crear();
  sinc.iniciar();
  await sinc.terminado();
  const nuevo = await storage.crearProducto({ nombre: 'Yogur', fechaCaducidad: '2026-11-22' });
  igual(estado().pendiente, true, 'queda pendiente');
  igual(temporizador.cuantos(), 1, 'programa una sincronización');
  temporizador.avanzar();
  await sinc.terminado();
  igualProfundo(driveFalso.productos('lista').map((p) => p.id), [nuevo.id]);
  igual(estado().pendiente, false);
});

prueba('Varios cambios seguidos', async () => {
  driveFalso.poner('lista', []);
  crear();
  sinc.iniciar();
  await sinc.terminado();
  const escrituras = () => driveFalso.llamadas.filter((m) => m === 'escribir').length;
  const antes = escrituras();
  await storage.crearProducto({ nombre: 'Uno', fechaCaducidad: '2026-11-22' });
  await storage.crearProducto({ nombre: 'Dos', fechaCaducidad: '2026-11-22' });
  await storage.crearProducto({ nombre: 'Tres', fechaCaducidad: '2026-11-22' });
  igual(temporizador.cuantos(), 1, 'una sola espera programada');
  temporizador.avanzar();
  await sinc.terminado();
  igual(escrituras() - antes, 1, 'una sola subida');
  igual(driveFalso.productos('lista').length, 3);
});

prueba('nunca hay dos sincronizaciones a la vez', async () => {
  driveFalso.poner('lista', [producto('a')]);
  crear();
  let simultaneas = 0;
  let maximo = 0;
  const leer = driveFalso.cliente.leer;
  driveFalso.cliente.leer = async (id) => {
    simultaneas += 1;
    maximo = Math.max(maximo, simultaneas);
    await new Promise((r) => setTimeout(r, 20));
    simultaneas -= 1;
    return leer(id);
  };
  const a = sinc.sincronizar();
  const b = sinc.sincronizar();
  await Promise.all([a, b]);
  await sinc.terminado();
  igual(maximo, 1);
});

// ---------- Pendientes ----------

prueba('Cambios en modo avión', async () => {
  red.poner(false);
  crear();
  sinc.iniciar();
  await storage.crearProducto({ nombre: 'Pan', fechaCaducidad: '2026-11-15' });
  temporizador.avanzar();
  await sinc.terminado();
  igualProfundo(await nombres(), ['Pan']);
  igual(estado().pendiente, true);
  igual(prefs.leer().pendiente, true, 'sobrevive a cerrar la app');
  igual(estado().texto, 'Sin conexión');
  igual(driveFalso.llamadas.length, 0);
});

prueba('Reapertura al día siguiente', async () => {
  prefs.escribir({ archivoId: 'lista', pendiente: true, ultima: '2026-11-12T10:00:00.000Z' });
  auth.token = null;
  crear();
  sinc.iniciar();
  await sinc.terminado();
  igual(auth.renovaciones, 0, 'no abre la ventana de Google');
  igual(estado().pendiente, true);
  igual(estado().texto, 'Toca para sincronizar');
});

prueba('Volver la conexión con token vigente', async () => {
  driveFalso.poner('lista', []);
  red.poner(false);
  crear();
  sinc.iniciar();
  await storage.crearProducto({ nombre: 'Pan', fechaCaducidad: '2026-11-15' });
  red.poner(true);
  red.objetivo.dispatchEvent(new Event('online'));
  await sinc.terminado();
  igual(driveFalso.productos('lista').length, 1);
  igual(estado().pendiente, false);
  igual(estado().texto, 'Sincronizado');
});

prueba('sin sincronizar nunca, los datos locales cuentan como pendientes', () => {
  prefs = { leer: () => null, escribir: () => {} };
  crear();
  igual(estado().pendiente, true);
  igual(estado().ultima, null);
});

// ---------- A petición ----------

prueba('Toque sin token vigente', async () => {
  driveFalso.poner('lista', [producto('q', { nombre: 'Queso' })]);
  auth.token = null;
  await crear().sincronizar({ aPeticion: true });
  igual(auth.renovaciones, 1);
  igualProfundo(await nombres(), ['Queso']);
  igual(estado().texto, 'Sincronizado');
  igual(estado().ultima, AHORA.toISOString());
});

prueba('Renovación cancelada', async () => {
  prefs.escribir({ archivoId: 'lista', pendiente: true, ultima: null });
  auth.token = null;
  auth.respuestaRenovar = { ok: false, motivo: 'cancelado' };
  await crear().sincronizar({ aPeticion: true });
  igual(driveFalso.llamadas.length, 0, 'no sincroniza');
  igual(estado().pendiente, true);
  igual(estado().texto, 'Toca para sincronizar');
});

prueba('Permiso nuevo rechazado', async () => {
  auth.token = null;
  auth.respuestaRenovar = { ok: false, motivo: 'sin-drive' };
  await crear().sincronizar({ aPeticion: true });
  igual(estado().texto, 'Error al sincronizar');
  igual(estado().error, 'Hace falta permitir el acceso a Google Drive.');
});

// ---------- Errores ----------

prueba('Error de red a mitad', async () => {
  driveFalso.poner('lista', []);
  await storage.crearProducto({ nombre: 'Pan', fechaCaducidad: '2026-11-15' });
  prefs.escribir({ archivoId: 'lista', pendiente: true, ultima: null });
  driveFalso.fallar('escribir', new drive.ErrorRed(new TypeError('Failed to fetch')));
  await crear().sincronizar();
  igualProfundo(await nombres(), ['Pan'], 'no se pierde nada');
  igual(estado().pendiente, true);
  igual(estado().texto, 'Error al sincronizar');
  igual(estado().error, 'No se pudo conectar con Google Drive. Comprueba la conexión.');
});

prueba('Token rechazado', async () => {
  driveFalso.poner('lista', []);
  prefs.escribir({ archivoId: 'lista', pendiente: true, ultima: null });
  driveFalso.fallar('leer', new drive.ErrorToken());
  await crear().sincronizar();
  igual(auth.olvidados, 1, 'se olvida el token');
  igual(estado().texto, 'Toca para sincronizar');
  igual(estado().pendiente, true);
});

prueba('otros errores de Drive', async () => {
  driveFalso.fallar('buscarListas', new drive.ErrorDrive(500));
  await crear().sincronizar();
  igual(estado().error, 'Google Drive no respondió como se esperaba. Inténtalo más tarde.');
});

// ---------- Estado publicado ----------

prueba('avisa a los suscriptores al empezar y al terminar', async () => {
  driveFalso.poner('lista', []);
  crear();
  const textos = [];
  const dejar = sinc.suscribir((e) => textos.push(e.texto));
  await sinc.sincronizar();
  dejar();
  verdadero(textos.includes('Sincronizando…'), JSON.stringify(textos));
  igual(textos.at(-1), 'Sincronizado');
  await sinc.sincronizar();
  igual(textos.at(-1), 'Sincronizado', 'tras darse de baja no recibe más');
});

// ---------- Solo listas de cuentas autorizadas (lista-compartida-segura) ----------

const PREGUNTA_CREAR = 'No hay ninguna lista en tu Drive ni compartida contigo. ¿Crear una nueva?';

prueba('Lista de una cuenta no autorizada', async () => {
  // Regresión de la auditoría (C1): un archivo ajeno más antiguo que la lista propia.
  driveFalso.poner('ajena', [producto('x', { nombre: 'Plantado' })], '2026-10-01T00:00:00.000Z', 'desconocido@example.com');
  driveFalso.poner('mia', [producto('m', { nombre: 'Mío' })], '2026-11-01T00:00:00.000Z');
  const textoAjeno = driveFalso.archivos.get('ajena').texto;
  await storage.crearProducto({ nombre: 'Notas privadas', fechaCaducidad: '2026-11-20', notas: 'secreto' });
  await crear().sincronizar();
  igual(prefs.leer().archivoId, 'mia');
  igualProfundo(await nombres(), ['Mío', 'Notas privadas']);
  igual(driveFalso.tocado('ajena'), false, JSON.stringify(driveFalso.accesos));
  igual(driveFalso.archivos.get('ajena').texto, textoAjeno, 'el archivo ajeno no cambia');
  igual(confirmaciones.length, 0);
});

prueba('Solo hay una lista ajena no autorizada', async () => {
  driveFalso.poner('ajena', [producto('x', { nombre: 'Plantado' })], undefined, 'desconocido@example.com');
  respuestaConfirmar = false;
  await crear().sincronizar();
  igual(confirmaciones.length, 1);
  igual(confirmaciones[0].mensaje, PREGUNTA_CREAR, 'actúa como si no hubiera lista');
  igual(driveFalso.tocado('ajena'), false);
  igualProfundo(await nombres(), []);
});

prueba('Lista sin dueño legible', async () => {
  driveFalso.poner('compartida', [producto('x', { nombre: 'De una unidad compartida' })], undefined, null);
  respuestaConfirmar = false;
  await crear().sincronizar();
  igual(confirmaciones[0]?.mensaje, PREGUNTA_CREAR);
  igual(driveFalso.tocado('compartida'), false);
});

prueba('Aceptar la lista compartida', async () => {
  driveFalso.poner('de-ana', [producto('q', { nombre: 'Queso de Ana' })], undefined, 'ana@example.com');
  crear();
  await sinc.sincronizar();
  igual(confirmaciones.length, 1);
  verdadero(confirmaciones[0].mensaje.includes('¿Usar la lista compartida por ana@example.com?'), confirmaciones[0].mensaje);
  igualProfundo(await nombres(), ['Queso de Ana']);
  igual(prefs.leer().archivoId, 'de-ana');
  await sinc.sincronizar();
  igual(confirmaciones.length, 1, 'no vuelve a preguntar');
});

prueba('Rechazar la lista compartida', async () => {
  driveFalso.poner('de-ana', [producto('q', { nombre: 'Queso de Ana' })], undefined, 'ana@example.com');
  await storage.crearProducto({ nombre: 'Leche', fechaCaducidad: '2026-11-20' });
  respuestaConfirmar = false;
  await crear().sincronizar();
  igual(driveFalso.tocado('de-ana'), false, 'no se descarga ni se modifica');
  igual(driveFalso.archivos.size, 1, 'no se crea ninguna lista nueva');
  igual(prefs.leer().archivoId, null);
  igualProfundo(await nombres(), ['Leche']);
  igual(estado().pendiente, true);
  igual(estado().texto, 'Cambios pendientes');
});

prueba('Lista propia sin pregunta', async () => {
  driveFalso.poner('mia', [producto('m', { nombre: 'Mío' })]);
  await crear().sincronizar();
  igual(confirmaciones.length, 0);
  igualProfundo(await nombres(), ['Mío']);
});

prueba('la lista compartida en automático solo se pregunta una vez por sesión', async () => {
  driveFalso.poner('de-ana', [producto('q')], undefined, 'ana@example.com');
  respuestaConfirmar = false;
  crear();
  await sinc.sincronizar();
  await sinc.sincronizar();
  igual(confirmaciones.length, 1);
  await sinc.sincronizar({ aPeticion: true });
  igual(confirmaciones.length, 2, 'a petición sí pregunta');
});
