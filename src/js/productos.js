// Modelo de producto y reglas de dominio puras (sin DOM ni almacenamiento).
// Spec: openspec/specs/product-model. Importa solo de constantes.js (nunca de config.js),
// para poder probarse en Node sin config.local.js.

import { CATEGORIAS, URGENCIA, NOTAS_MAX, UNIDAD_MAX, CANTIDAD_MAX } from './constantes.js';

export const TIPOS_FOTO = Object.freeze(['predeterminada', 'real', 'ninguna']);
export const NOMBRE_MAX = 100;

// Nombre de una foto real: UUID en minúsculas y extensión .webp o .jpg (fotos-reales,
// design.md §1). Solo con este formato: un caducidades.json manipulado no puede
// apuntar a otras rutas ni archivos.
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const NOMBRE_FOTO_REAL = new RegExp(`^${UUID}\\.(webp|jpg)$`);
const ID_PRODUCTO = new RegExp(`^${UUID}$`);

// Id de producto: UUID en minúsculas, como los de crypto.randomUUID() (drive-sync,
// "Contenido no válido en Drive").
export function esIdProducto(valor) {
  return typeof valor === 'string' && ID_PRODUCTO.test(valor);
}

export function esNombreFotoReal(valor) {
  return typeof valor === 'string' && NOMBRE_FOTO_REAL.test(valor);
}

const POR_DEFECTO = Object.freeze({
  cantidad: 1,
  unidad: 'ud',
  categoria: 'Nevera',
});

export class ErrorValidacion extends Error {
  constructor(campos) {
    super('El producto no es válido');
    this.name = 'ErrorValidacion';
    this.campos = campos;
  }
}

// ---------- Normalización ----------

function texto(valor) {
  return valor == null ? '' : String(valor).trim();
}

function textoOpcional(valor) {
  return texto(valor) || null;
}

function numero(valor) {
  if (typeof valor === 'number') return valor;
  const limpio = texto(valor).replace(',', '.');
  return limpio === '' ? Number.NaN : Number(limpio);
}

function foto(valor) {
  if (valor == null) return { tipo: 'ninguna', valor: null };
  const tipo = texto(valor.tipo);
  return { tipo, valor: tipo === 'ninguna' ? null : textoOpcional(valor.valor) };
}

// Devuelve solo los campos editables de un producto, recortados y con los valores por
// defecto aplicados a los que no se indican (undefined o null). No valida.
export function normalizarProducto(datos = {}) {
  return {
    nombre: texto(datos.nombre),
    fechaCompra: textoOpcional(datos.fechaCompra),
    fechaCaducidad: texto(datos.fechaCaducidad),
    cantidad: datos.cantidad == null ? POR_DEFECTO.cantidad : numero(datos.cantidad),
    unidad: datos.unidad == null ? POR_DEFECTO.unidad : texto(datos.unidad),
    categoria: datos.categoria == null ? POR_DEFECTO.categoria : texto(datos.categoria),
    foto: foto(datos.foto),
    notas: textoOpcional(datos.notas),
  };
}

// ---------- Validación ----------

// Día local de `fecha` como YYYY-MM-DD (no el UTC de toISOString, que cerca de medianoche
// sería otro día). Lo usa el alta para rellenar la fecha de compra (product-form).
export function fechaLocal(fecha) {
  const dos = (n) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
}

// true si `valor` es una fecha YYYY-MM-DD que existe en el calendario.
export function esFechaValida(valor) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor ?? '');
  if (!partes) return false;
  const [anio, mes, dia] = partes.slice(1).map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia;
}

function listaEnEspanol(elementos) {
  return `${elementos.slice(0, -1).join(', ')} u ${elementos.at(-1)}`;
}

// Devuelve { campo: mensaje } con cada campo incorrecto; vacío si el producto es válido.
export function validarProducto(producto) {
  const errores = {};

  if (!producto.nombre) errores.nombre = 'El nombre es obligatorio';
  else if (producto.nombre.length > NOMBRE_MAX) errores.nombre = `El nombre no puede tener más de ${NOMBRE_MAX} caracteres`;

  if (!producto.fechaCaducidad) errores.fechaCaducidad = 'La fecha de caducidad es obligatoria';
  else if (!esFechaValida(producto.fechaCaducidad)) errores.fechaCaducidad = 'La fecha de caducidad no es válida';

  if (producto.fechaCompra != null && !esFechaValida(producto.fechaCompra)) {
    errores.fechaCompra = 'La fecha de compra no es válida';
  }

  if (typeof producto.cantidad !== 'number' || !Number.isFinite(producto.cantidad) || producto.cantidad <= 0) {
    errores.cantidad = 'La cantidad debe ser un número mayor que 0';
  } else if (producto.cantidad > CANTIDAD_MAX) {
    errores.cantidad = `La cantidad no puede ser mayor que ${CANTIDAD_MAX}`;
  }

  if (!producto.unidad) errores.unidad = 'La unidad es obligatoria';
  else if (producto.unidad.length > UNIDAD_MAX) errores.unidad = `La unidad no puede tener más de ${UNIDAD_MAX} caracteres`;

  if (producto.notas != null && producto.notas.length > NOTAS_MAX) {
    errores.notas = `Las notas no pueden tener más de ${NOTAS_MAX} caracteres`;
  }

  if (!CATEGORIAS.includes(producto.categoria)) {
    errores.categoria = `La categoría debe ser una de: ${listaEnEspanol(CATEGORIAS)}`;
  }

  if (!TIPOS_FOTO.includes(producto.foto?.tipo)) errores.foto = 'El tipo de foto no es válido';
  else if (producto.foto.tipo !== 'ninguna' && !producto.foto.valor) errores.foto = 'Falta la foto elegida';
  else if (producto.foto.tipo === 'real' && !esNombreFotoReal(producto.foto.valor)) errores.foto = 'La foto no es válida';

  return errores;
}

// ---------- Alta y edición ----------

function validado(campos) {
  const errores = validarProducto(campos);
  if (Object.keys(errores).length > 0) throw new ErrorValidacion(errores);
  return campos;
}

// `actualizado` nunca retrocede: si `ahora` no es posterior al anterior (misma
// milésima o reloj atrasado), se usa el anterior + 1 ms (last-write-wins).
function marcaPosterior(anterior, ahora) {
  const minimo = anterior ? Date.parse(anterior) + 1 : -Infinity;
  return new Date(Math.max(ahora.getTime(), minimo)).toISOString();
}

// Crea un producto nuevo a partir de datos de entrada. Lanza ErrorValidacion.
// `id`, `actualizado` y `eliminado` de la entrada se ignoran.
export function nuevoProducto(datos, ahora = new Date()) {
  return {
    id: crypto.randomUUID(),
    ...validado(normalizarProducto(datos)),
    eliminado: false,
    actualizado: ahora.toISOString(),
  };
}

// Devuelve una copia de `producto` con `cambios` aplicados, validada y con un
// `actualizado` nuevo. No modifica el original. Lanza ErrorValidacion.
export function aplicarCambios(producto, cambios, ahora = new Date()) {
  const { id, actualizado, eliminado, ...editables } = producto;
  const { id: _id, actualizado: _actualizado, eliminado: _eliminado, ...nuevos } = cambios;
  return {
    id,
    ...validado(normalizarProducto({ ...editables, ...nuevos })),
    eliminado,
    actualizado: marcaPosterior(actualizado, ahora),
  };
}

// Copia de `producto` marcada como eliminada (baja con marca de borrado), con un
// `actualizado` nuevo para que la baja se propague en la sincronización.
export function marcarEliminado(producto, ahora = new Date()) {
  return { ...producto, eliminado: true, actualizado: marcaPosterior(producto.actualizado, ahora) };
}

// ---------- Caducidad y urgencia ----------

const MS_POR_DIA = 86_400_000;

// Días naturales desde hoy (fecha local del dispositivo) hasta `fechaCaducidad`
// (YYYY-MM-DD): 0 si caduca hoy, negativo si ya caducó. Se calcula con días UTC para
// que no influyan la hora actual ni los cambios de horario de verano.
export function diasRestantes(fechaCaducidad, hoy = new Date()) {
  const [anio, mes, dia] = fechaCaducidad.split('-').map(Number);
  const caducidad = Date.UTC(anio, mes - 1, dia);
  const hoyUTC = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((caducidad - hoyUTC) / MS_POR_DIA);
}

// 'rojo' | 'naranja' | 'verde', igual que las clases CSS urgencia--*.
export function nivelUrgencia(dias) {
  if (dias <= URGENCIA.rojoMaxDias) return 'rojo';
  if (dias <= URGENCIA.naranjaMaxDias) return 'naranja';
  return 'verde';
}

export function textoCaducidad(dias) {
  if (dias < 0) return '¡Caducado!';
  if (dias === 0) return 'Caduca hoy';
  if (dias === 1) return 'Caduca mañana';
  return `Caduca en ${dias} días`;
}

// ---------- Orden ----------

const colador = new Intl.Collator('es', { sensitivity: 'base' });

// Fecha de caducidad ascendente; después nombre (sin mayúsculas ni acentos) y por
// último id, para que el orden sea siempre el mismo.
export function compararPorCaducidad(a, b) {
  if (a.fechaCaducidad !== b.fechaCaducidad) return a.fechaCaducidad < b.fechaCaducidad ? -1 : 1;
  const porNombre = colador.compare(a.nombre, b.nombre);
  if (porNombre !== 0) return porNombre;
  if (a.id === b.id) return 0;
  return a.id < b.id ? -1 : 1;
}

// Devuelve una copia ordenada; no modifica la lista original.
export function ordenarPorCaducidad(lista) {
  return [...lista].sort(compararPorCaducidad);
}

// ---------- Filtros del listado ----------

// Pestañas del listado, en orden. "Pronto" llega hasta el final del naranja.
export const FILTROS = Object.freeze([
  Object.freeze({ clave: 'todas', texto: 'Todas' }),
  Object.freeze({ clave: 'pronto', texto: 'Pronto' }),
  Object.freeze({ clave: 'caducadas', texto: 'Caducadas' }),
]);

const CUMPLE_FILTRO = {
  todas: () => true,
  pronto: (dias) => dias >= 0 && dias <= URGENCIA.naranjaMaxDias,
  caducadas: (dias) => dias < 0,
};

// Productos de `lista` que cumplen `filtro` ('todas' | 'pronto' | 'caducadas') en la
// fecha `hoy`. Conserva el orden y devuelve siempre una lista nueva.
export function filtrarPorEstado(lista, filtro, hoy = new Date()) {
  const cumple = CUMPLE_FILTRO[filtro] ?? CUMPLE_FILTRO.todas;
  return lista.filter((producto) => cumple(diasRestantes(producto.fechaCaducidad, hoy)));
}

// ---------- Productos urgentes (expiry-alerts) ----------

const productosTexto = (n) => `${n} ${n === 1 ? 'producto' : 'productos'}`;
const caducados = (n) => (n === 1 ? 'caducado' : 'caducados');
const A_PUNTO = 'a punto de caducar';

// Resumen de los productos urgentes (nivel rojo: caducados o que caducan en
// URGENCIA.rojoMaxDias días o menos) para el aviso del Listado, o null si no hay ninguno.
// { caducados, proximos, texto, filtro }: `filtro` es el de destino al tocar el aviso.
export function resumirUrgentes(lista, hoy = new Date()) {
  let vencidos = 0;
  let proximos = 0;
  for (const producto of lista) {
    if (producto.eliminado) continue;
    const dias = diasRestantes(producto.fechaCaducidad, hoy);
    if (dias < 0) vencidos += 1;
    else if (dias <= URGENCIA.rojoMaxDias) proximos += 1;
  }
  if (vencidos === 0 && proximos === 0) return null;

  // Textos cortos para que el aviso quepa en dos líneas (pulido-final, design.md §2). "A
  // punto de caducar" son los próximos URGENCIA.rojoMaxDias días (lo explica Ajustes).
  let texto;
  if (vencidos === 0) texto = `${productosTexto(proximos)} ${A_PUNTO}`;
  else if (proximos === 0) texto = `${productosTexto(vencidos)} ${caducados(vencidos)}`;
  else texto = `${productosTexto(vencidos)} ${caducados(vencidos)} y ${proximos} ${A_PUNTO}`;

  return { caducados: vencidos, proximos, texto, filtro: vencidos > 0 ? 'caducadas' : 'pronto' };
}
