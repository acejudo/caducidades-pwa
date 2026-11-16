// Orquestador de la sincronización con Google Drive: decide cuándo sincronizar, evita
// dos sincronizaciones a la vez, recuerda los cambios pendientes y publica el estado.
// Specs: openspec/specs/drive-sync y sync-status (design.md §5 de sincronizacion-drive).
// No importa auth.js ni config.js: `auth` se inyecta (ui.js crea la instancia de la app)
// y así se prueba sin config.local.js (tests/navegador/sincronizador.test.js).

import {
  listarTodos, guardarSincronizados, cambiosLocales,
  listarFotos, guardarFoto, obtenerFoto, marcarFotoSubida, borrarFoto,
} from './storage.js';
import { crearClienteDrive, ErrorRed, ErrorToken, ErrorNoDisponible } from './drive.js';
import {
  leerArchivo, crearArchivo, purgar, planificar, planificarFotos, textoEstado, ErrorArchivoNoValido,
} from './sincronizacion.js';
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

// Preferencias en localStorage { archivoId, carpetaId, pendiente, ultima }; si está bloqueado, en
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
  almacen = {
    listarTodos, guardarSincronizados, cambiosLocales, listarFotos, guardarFoto, obtenerFoto, marcarFotoSubida, borrarFoto,
  },
  crearDrive = (token) => crearClienteDrive({ token }),
  red = { enLinea: () => navigator.onLine, objetivo: window },
  preferencias = preferenciasLocales(),
  confirmar = confirmarDialogo,
  temporizador = { programar: (fn, ms) => setTimeout(fn, ms), cancelar: (id) => clearTimeout(id) },
  ahora = () => new Date(),
} = {}) {
  // Sin datos guardados no se ha sincronizado nunca: lo local cuenta como pendiente.
  const guardadas = preferencias.leer();
  let datos = { archivoId: null, carpetaId: null, pendiente: true, ultima: null, ...guardadas };
  let fase = 'inactivo'; // 'inactivo' | 'sincronizando' | 'error'
  let error = null;
  let enCurso = null;
  let otraVez = false;
  let otraVezAPeticion = false;
  let cambioDurante = false;
  let enFaseFotos = false;
  let preguntadoCrear = false;
  let preguntadoLista = false;
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

  // Email del dueño de una lista si es una cuenta autorizada (o la propia); null si no vale.
  // Las listas sin dueño legible (unidades compartidas) o de cuentas fuera de la lista
  // blanca nunca se leen ni se escriben (lista-compartida-segura).
  async function duenoAutorizado(lista) {
    const [dueno, ...otros] = lista.owners ?? [];
    if (lista.ownedByMe === true) return dueno?.emailAddress ?? '';
    if (!dueno?.emailAddress || otros.length > 0) return null;
    return (await auth.esEmailAutorizado(dueno.emailAddress)) ? dueno.emailAddress : null;
  }

  // La lista válida más antigua, o null.
  async function elegirLista(drive) {
    for (const lista of await drive.buscarListas()) {
      const dueno = await duenoAutorizado(lista);
      if (dueno !== null) return { ...lista, dueno };
    }
    return null;
  }

  async function localizar(drive, aPeticion) {
    const lista = await elegirLista(drive);
    if (lista) {
      if (!lista.ownedByMe) {
        // Usar la lista de otra cuenta es una decisión explícita la primera vez. En
        // automático se pregunta como mucho una vez por sesión de la app.
        if (!aPeticion && preguntadoLista) throw new SinLista();
        preguntadoLista = true;
        const usar = await confirmar({
          titulo: '¿Usar la lista compartida?',
          mensaje: `¿Usar la lista compartida por ${lista.dueno}? Tus productos se juntarán con los suyos.`,
          aceptar: 'Usar esta lista',
          cancelar: 'Ahora no',
        });
        if (!usar) throw new SinLista();
      }
      guardar({ archivoId: lista.id, carpetaId: lista.parents?.[0] ?? null });
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
    guardar({ archivoId: id, carpetaId: null });
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

  // ---------- Fotos reales (fotos-reales, design.md §6) ----------

  // Carpeta de la lista (la recordada o, si no se sabe, la que dice Drive).
  async function carpetaDeLista(drive, archivoId) {
    if (datos.carpetaId) return datos.carpetaId;
    const carpetaId = await drive.carpetaDeLista(archivoId);
    guardar({ carpetaId });
    return carpetaId;
  }

  // Una operación de una sola foto que puede fallar sin parar la sincronización: el token
  // rechazado sí la para (hay que renovarlo); el resto se anota y se sigue.
  async function tolerante(descripcion, operacion) {
    try {
      await operacion();
    } catch (error) {
      if (error instanceof ErrorToken) throw error;
      console.warn(`No se pudo ${descripcion}:`, error);
    }
  }

  // Sube las fotos que faltan en Drive, descarga las que faltan en el dispositivo y borra
  // las que ya no usa nadie. Si ningún producto tiene foto real y no hay fotos guardadas,
  // no toca Drive (ni crea la carpeta de fotos).
  async function sincronizarFotos(drive, archivoId) {
    const productos = await almacen.listarTodos();
    const locales = await almacen.listarFotos();
    if (locales.length === 0 && !productos.some((p) => p.foto?.tipo === 'real')) return;

    const carpetaId = await carpetaDeLista(drive, archivoId);
    let carpetaFotos = await drive.buscarCarpetaFotos(carpetaId);
    const remotas = carpetaFotos ? await drive.listarFotos(carpetaFotos) : [];
    const plan = planificarFotos({ productos, locales, remotas, ahora: ahora() });

    for (const nombre of plan.marcarSubidas) await almacen.marcarFotoSubida(nombre);
    // Un fallo al subir corta la fase: la foto sigue pendiente y se reintenta después.
    for (const nombre of plan.subir) {
      const blob = await almacen.obtenerFoto(nombre);
      if (!blob) continue;
      carpetaFotos ??= await drive.crearCarpetaFotos(carpetaId);
      await drive.subirFoto(carpetaFotos, nombre, blob);
      await almacen.marcarFotoSubida(nombre);
    }
    for (const { nombre, id } of plan.descargar) {
      await tolerante(`descargar la foto ${nombre}`, async () => {
        await almacen.guardarFoto(nombre, await drive.descargarFoto(id), { subida: true });
      });
    }
    for (const nombre of plan.borrarLocales) {
      await tolerante(`borrar la foto local ${nombre}`, () => almacen.borrarFoto(nombre));
    }
    for (const id of plan.borrarRemotas) {
      await tolerante(`mandar a la papelera la foto ${id}`, () => drive.papeleraFoto(id));
    }
  }

  async function sincronizarCon(drive, aPeticion) {
    let id = datos.archivoId;
    for (let intento = 0; ; intento += 1) {
      try {
        id ??= await localizar(drive, aPeticion);
        await sincronizarArchivo(drive, id);
        enFaseFotos = true;
        await sincronizarFotos(drive, id);
        return;
      } catch (causa) {
        // El archivo recordado se borró o se dejó de compartir: se busca otra vez (una).
        if (!(causa instanceof ErrorNoDisponible) || intento > 0) throw causa;
        guardar({ archivoId: null, carpetaId: null });
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
    enFaseFotos = false;
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
        // La lista se sincronizó pero quedan fotos por subir: siguen pendientes.
        if (enFaseFotos) guardar({ pendiente: true });
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
