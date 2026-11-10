// Catálogo de fotos predeterminadas y cómo se muestra la foto de un producto.
// Spec: openspec/specs/product-photos. Puro (sin DOM ni config.js): se prueba en Node.

// Orden de la cuadrícula de Elegir foto; "Genérico" siempre al final.
export const FOTOS_PREDETERMINADAS = Object.freeze([
  ['yogur', 'Yogur'],
  ['leche', 'Leche'],
  ['queso', 'Queso'],
  ['huevos', 'Huevos'],
  ['mantequilla', 'Mantequilla'],
  ['pollo', 'Pollo'],
  ['carne', 'Carne'],
  ['salmon', 'Salmón'],
  ['embutido', 'Embutido'],
  ['manzana', 'Manzana'],
  ['platano', 'Plátano'],
  ['tomate', 'Tomate'],
  ['lechuga', 'Lechuga'],
  ['zanahoria', 'Zanahoria'],
  ['pan', 'Pan'],
  ['arroz', 'Arroz'],
  ['pasta', 'Pasta'],
  ['conserva', 'Conserva'],
  ['zumo', 'Zumo'],
  ['generico', 'Genérico'],
].map(([id, nombre]) => Object.freeze({ id, nombre })));

const POR_ID = new Map(FOTOS_PREDETERMINADAS.map((foto) => [foto.id, foto]));

export function buscarFoto(id) {
  return POR_ID.get(id) ?? null;
}

// URL del SVG, relativa a este módulo: vale igual desde index.html que desde las pruebas.
export function urlFoto(id) {
  return new URL(`../img/predeterminadas/${id}.svg`, import.meta.url).href;
}

// Minúsculas y sin acentos, para buscar sin distinguirlos.
function simplificar(texto) {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

// Fotos cuyo nombre contiene `texto` (sin distinguir mayúsculas ni acentos), en el
// orden del catálogo. Con un texto vacío, todas.
export function filtrarFotos(texto = '') {
  const buscado = simplificar(texto);
  return FOTOS_PREDETERMINADAS.filter((foto) => simplificar(foto.nombre).includes(buscado));
}

// { id, nombre, url } si el producto tiene una foto predeterminada del catálogo; null en
// cualquier otro caso (sin foto, id desconocido o foto real, que aún no se muestra).
export function fotoDeProducto(producto) {
  const { tipo, valor } = producto?.foto ?? {};
  if (tipo !== 'predeterminada') return null;
  const foto = buscarFoto(valor);
  return foto && { ...foto, url: urlFoto(foto.id) };
}
