// Orquestador de la sincronización con Google Drive: decide cuándo sincronizar, evita
// dos sincronizaciones a la vez, recuerda los cambios pendientes y publica el estado.
// Specs: openspec/specs/drive-sync y sync-status (design.md §5 de sincronizacion-drive).
// No importa auth.js ni config.js: `auth` se inyecta (ui.js crea la instancia de la app)
// y así se prueba sin config.local.js (tests/navegador/sincronizador.test.js).

import { listarTodos, guardarSincronizados, cambiosLocales } from './storage.js';
import { crearClienteDrive, ErrorRed, ErrorToken, ErrorNoDisponible } from './drive.js';
import { leerArchivo, crearArchivo, purgar, planificar, textoEstado, ErrorArchivoNoValido } from './sincronizacion.js';
import { confirmar as confirmarDialogo } from './dialogo.js';

const CLAVE_PREFERENCIAS = 'caducidades.sincronizacion';
const ESPERA_CAMBIOS_MS = 2000;
const INTENTOS_SUBIDA = 3;

export const MENSAJES = Object.freeze({
  red: 'No se pudo conectar con Google Drive. Comprueba la conexión.',
  drive: 'Google Drive no respondió como se esperaba. Inténtalo más tarde.',
  archivo: 'El archivo de la lista en Drive no es válido. No se ha cambiado nada.',
  permiso: 'Hace falta permitir el acceso a Google Drive.',
});

// No hay lista en Drive y no se ha creado (el usuario no quiso o no se le preguntó).
class SinLista extends Error {}

// Preferencias en localStorage { archivoId, pendiente, ultima }; si está bloqueado, en
// memoria (no debe lanzar nunca).
export function preferenciasLocales(clave = CLAVE_PREFERENCIAS) {
  let enMemoria = null;
  return {
    leer() {
      try {
        return JSON.parse(window.localStorage.getItem(clave)) ?? enMemoria;
      } catch {
        return enMemoria;
      }
    },
    escribir(datos) {
      enMemoria = { ...datos };
      try {
        window.localStorage.setItem(clave, JSON.stringify(datos));
      } catch {
        // Sin almacenamiento: vale con la memoria.
      }
    },
  };
}

function mensajeDe(error) {
  if (error instanceof ErrorRed) return MENSAJES.red;
  if (error instanceof ErrorArchivoNoValido) return MENSAJES.archivo;
  return MENSAJES.drive;
}

export function crearSincronizador({
  auth,
  almacen = { listarTodos, guardarSincronizados, cambiosLocales },
  crearDrive = (token) => crearClienteDrive({ token }),
  red = { enLinea: () => navigator.onLine, objetivo: window },
  preferencias = preferenciasLocales(),
  confirmar = confirmarDialogo,
  temporizador = { programar: (fn, ms) => setTimeout(fn, ms), cancelar: (id) => clearTimeout(id) },
  ahora = () => new Date(),
} = {}) {
  // Sin datos guardados no se ha sincronizado nunca: lo local cuenta como pendiente.
  const guardadas = preferencias.leer();
  let datos = { archivoId: null, pendiente: true, ultima: null, ...guardadas };
  let fase = 'inactivo'; // 'inactivo' | 'sincronizando' | 'error'
  let error = null;
  let enCurso = null;
  let otraVez = false;
  let otraVezAPeticion = false;
  let cambioDurante = false;
  let preguntadoCrear = false;
  let espera = null;
  const suscriptores = new Set();

  function guardar(cambios) {
    datos = { ...datos, ...cambios };
    preferencias.escribir(datos);
  }

  function estado() {
    const base = {
      enLinea: red.enLinea(),
      fase,
      pendiente: datos.pendiente,
      tokenVigente: Boolean(auth.tokenVigente()),
      ultima: datos.ultima,
      error,
    };
    return { ...base, texto: textoEstado(base) };
  }

  function notificar() {
    const actual = estado();
    for (const fn of [...suscriptores]) fn(actual);
  }

  function suscribir(fn) {
    suscriptores.add(fn);
    return () => suscriptores.delete(fn);
  }

  // ---------- Pasos de una sincronización ----------

  async function localizar(drive, aPeticion) {
    const [lista] = await drive.buscarListas();
    if (lista) {
      guardar({ archivoId: lista.id });
      return lista.id;
    }
    // En automático se pregunta como mucho una vez por sesión de la app.
    if (!aPeticion && preguntadoCrear) throw new SinLista();
    preguntadoCrear = true;
    const crear = await confirmar({
      titulo: '¿Crear una lista nueva?',
      mensaje: 'No hay ninguna lista en tu Drive ni compartida contigo. ¿Crear una nueva?',
      aceptar: 'Crear lista',
      cancelar: 'Ahora no',
    });
    if (!crear) throw new SinLista();
    const locales = await almacen.listarTodos();
    const { id } = await drive.crearLista(crearArchivo(purgar(locales, ahora()), ahora()));
    guardar({ archivoId: id });
    return id;
  }

  // Descarga, fusiona, guarda en local y sube si hace falta. Si el archivo cambia entre la
  // descarga y la subida, vuelve a empezar (escrituras simultáneas).
  async function sincronizarArchivo(drive, id) {
    for (let intento = 0; intento < INTENTOS_SUBIDA; intento += 1) {
      const { texto, version } = await drive.leer(id);
      const { productos: remotos } = leerArchivo(texto);
      const plan = planificar(await almacen.listarTodos(), remotos, ahora());
      if (plan.cambiaLocal) await almacen.guardarSincronizados(plan.resultado, plan.idsPurgados);
      if (!plan.hayQueSubir) return;
      if ((await drive.version(id)) !== version) continue;
      await drive.escribir(id, crearArchivo(plan.resultado, ahora()));
      return;
    }
    throw new Error('El archivo de Drive cambia continuamente');
  }

  async function sincronizarCon(drive, aPeticion) {
    let id = datos.archivoId;
    for (let intento = 0; ; intento += 1) {
      try {
        id ??= await localizar(drive, aPeticion);
        await sincronizarArchivo(drive, id);
        return;
      } catch (causa) {
        // El archivo recordado se borró o se dejó de compartir: se busca otra vez (una).
        if (!(causa instanceof ErrorNoDisponible) || intento > 0) throw causa;
        guardar({ archivoId: null });
        id = null;
      }
    }
  }

  async function ejecutar({ aPeticion = false } = {}) {
    if (!auth.sesionActual() || !red.enLinea()) {
      notificar();
      return;
    }
    if (!auth.tokenVigente()) {
      // Sin token solo se renueva a petición: abre la ventana de Google (gesto del usuario).
      if (!aPeticion) {
        notificar();
        return;
      }
      const renovacion = await auth.renovarToken();
      if (!renovacion?.ok) {
        if (renovacion?.motivo === 'sin-drive') {
          fase = 'error';
          error = MENSAJES.permiso;
        } else if (renovacion?.motivo === 'error') {
          fase = 'error';
          error = MENSAJES.red;
        }
        notificar();
        return;
      }
    }

    fase = 'sincronizando';
    error = null;
    cambioDurante = false;
    notificar();
    try {
      await sincronizarCon(crearDrive(() => auth.tokenVigente()), aPeticion);
      fase = 'inactivo';
      guardar({ pendiente: cambioDurante, ultima: ahora().toISOString() });
    } catch (causa) {
      if (causa instanceof SinLista) {
        fase = 'inactivo';
        // Lo que hay en el dispositivo no está en ninguna lista de Drive.
        if ((await almacen.listarTodos().catch(() => [])).length > 0) guardar({ pendiente: true });
      } else if (causa instanceof ErrorToken) {
        auth.olvidarToken();
        fase = 'inactivo';
      } else {
        console.error('No se pudo sincronizar con Google Drive:', causa);
        fase = 'error';
        error = mensajeDe(causa);
      }
    }
    notificar();
  }

  // Nunca dos a la vez: si se pide otra durante una, se repite al terminar.
  function sincronizar(opciones = {}) {
    if (enCurso) {
      otraVez = true;
      otraVezAPeticion ||= Boolean(opciones.aPeticion);
      return enCurso;
    }
    enCurso = (async () => {
      let actual = opciones;
      do {
        otraVez = false;
        await ejecutar(actual);
        actual = { aPeticion: otraVezAPeticion };
        otraVezAPeticion = false;
      } while (otraVez);
    })().finally(() => {
      enCurso = null;
    });
    return enCurso;
  }

  // ---------- Disparadores automáticos ----------

  function alCambiarLocal() {
    guardar({ pendiente: true });
    if (enCurso) cambioDurante = true;
    if (espera !== null) temporizador.cancelar(espera);
    // Varios cambios seguidos: una sola sincronización cuando dejan de llegar.
    espera = temporizador.programar(() => {
      espera = null;
      sincronizar();
    }, ESPERA_CAMBIOS_MS);
    notificar();
  }

  const alVolverRed = () => sincronizar();
  const alPerderRed = () => notificar();

  function iniciar() {
    almacen.cambiosLocales.addEventListener('cambio', alCambiarLocal);
    red.objetivo.addEventListener('online', alVolverRed);
    red.objetivo.addEventListener('offline', alPerderRed);
    return sincronizar();
  }

  function detener() {
    almacen.cambiosLocales.removeEventListener('cambio', alCambiarLocal);
    red.objetivo.removeEventListener('online', alVolverRed);
    red.objetivo.removeEventListener('offline', alPerderRed);
    if (espera !== null) temporizador.cancelar(espera);
    espera = null;
  }

  // Promesa de la sincronización en curso (o resuelta si no hay ninguna).
  const terminado = () => enCurso ?? Promise.resolve();

  return { estado, suscribir, sincronizar, iniciar, detener, terminado };
}
