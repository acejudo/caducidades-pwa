// Mini-runner de pruebas para el navegador, sin dependencias.
// Uso: registrar pruebas con `prueba(nombre, fn)` y lanzar `ejecutar()`. El resultado
// queda en <output id="resultado" data-estado="ok|fallo">, legible por personas y por
// scripts/probar-navegador.mjs.

const TIEMPO_MAXIMO_MS = 5000;

const pruebas = [];
let ganchoAntesDeCada = null;

export function prueba(nombre, fn) {
  pruebas.push({ nombre, fn });
}

export function antesDeCada(fn) {
  ganchoAntesDeCada = fn;
}

// ---------- Aserciones ----------

export class ErrorAsercion extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = 'ErrorAsercion';
  }
}

function mostrar(valor) {
  try {
    return JSON.stringify(valor);
  } catch {
    return String(valor);
  }
}

export function igual(real, esperado, mensaje = '') {
  if (!Object.is(real, esperado)) {
    throw new ErrorAsercion(`${mensaje ? `${mensaje}: ` : ''}se esperaba ${mostrar(esperado)} y se obtuvo ${mostrar(real)}`);
  }
}

function sonIguales(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const clavesA = Object.keys(a);
  const clavesB = Object.keys(b);
  if (clavesA.length !== clavesB.length) return false;
  return clavesA.every((clave) => Object.hasOwn(b, clave) && sonIguales(a[clave], b[clave]));
}

export function igualProfundo(real, esperado, mensaje = '') {
  if (!sonIguales(real, esperado)) {
    throw new ErrorAsercion(`${mensaje ? `${mensaje}: ` : ''}se esperaba ${mostrar(esperado)} y se obtuvo ${mostrar(real)}`);
  }
}

export function verdadero(valor, mensaje = 'se esperaba un valor verdadero') {
  if (!valor) throw new ErrorAsercion(mensaje);
}

// Comprueba que `promesaOFuncion` se rechaza (opcionalmente con una clase de error) y
// devuelve el error para poder hacer más comprobaciones sobre él.
export async function rechaza(promesaOFuncion, ClaseError = null, mensaje = '') {
  let error = null;
  try {
    await (typeof promesaOFuncion === 'function' ? promesaOFuncion() : promesaOFuncion);
  } catch (e) {
    error = e;
  }
  const prefijo = mensaje ? `${mensaje}: ` : '';
  if (!error) throw new ErrorAsercion(`${prefijo}se esperaba un error y no hubo ninguno`);
  if (ClaseError && !(error instanceof ClaseError)) {
    throw new ErrorAsercion(`${prefijo}se esperaba ${ClaseError.name} y se obtuvo ${error?.name}: ${error?.message}`);
  }
  return error;
}

// ---------- Ejecución ----------

function conTiempoMaximo(promesa) {
  let temporizador;
  const limite = new Promise((_, rechazar) => {
    temporizador = setTimeout(() => rechazar(new Error(`superó ${TIEMPO_MAXIMO_MS} ms`)), TIEMPO_MAXIMO_MS);
  });
  return Promise.race([promesa, limite]).finally(() => clearTimeout(temporizador));
}

function plural(n, singular, pluralTexto) {
  return `${n} ${n === 1 ? singular : pluralTexto}`;
}

export async function ejecutar() {
  const lista = document.getElementById('lista');
  const resultado = document.getElementById('resultado');
  let fallos = 0;

  for (const { nombre, fn } of pruebas) {
    const fila = document.createElement('li');
    try {
      if (ganchoAntesDeCada) await conTiempoMaximo(Promise.resolve().then(ganchoAntesDeCada));
      await conTiempoMaximo(Promise.resolve().then(fn));
      fila.className = 'ok';
      fila.textContent = `✔ ${nombre}`;
    } catch (error) {
      fallos += 1;
      fila.className = 'fallo';
      fila.textContent = `✖ ${nombre} — ${error?.message ?? error}`;
      console.error(`✖ ${nombre}`, error);
    }
    lista.append(fila);
  }

  resultado.dataset.estado = fallos === 0 ? 'ok' : 'fallo';
  resultado.textContent = `${plural(pruebas.length, 'prueba', 'pruebas')}, ${plural(fallos, 'fallo', 'fallos')}`;
}
