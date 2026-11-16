// Fotos reales en el navegador: compresión de la foto elegida y pintado de la foto de un
// producto (predeterminada, real o icono genérico). Spec: openspec/specs/product-photos.
// Necesita el DOM: se prueba en tests/navegador/fotos-reales.test.js. No importa ui.js,
// auth.js ni config.js.

import { fotoDeProducto } from './fotos.js';
import { ICONOS } from './iconos.js';
import { el, icono } from './utils.js';

export const LADO_MAXIMO = 1024;
const CALIDAD_WEBP = 0.8;
const CALIDAD_JPEG = 0.85;

export class ErrorFoto extends Error {
  constructor(causa) {
    super('No se pudo usar esta foto');
    this.name = 'ErrorFoto';
    this.causa = causa;
  }
}

// ---------- Compresión ----------

// Decodifica la imagen respetando su orientación EXIF. Si createImageBitmap no existe o
// falla, lo intenta con <img>. Devuelve { fuente, ancho, alto, cerrar }.
async function decodificar(archivo) {
  if (typeof createImageBitmap === 'function') {
    try {
      const mapa = await createImageBitmap(archivo, { imageOrientation: 'from-image' });
      return { fuente: mapa, ancho: mapa.width, alto: mapa.height, cerrar: () => mapa.close() };
    } catch {
      // Se intenta con <img>.
    }
  }
  const url = URL.createObjectURL(archivo);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { fuente: img, ancho: img.naturalWidth, alto: img.naturalHeight, cerrar: () => {} };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function aBlob(lienzo, tipo, calidad) {
  return new Promise((resolver) => lienzo.toBlob(resolver, tipo, calidad));
}

// Reduce la foto para que su lado mayor no pase de `ladoMaximo` (sin ampliarla) y la
// codifica en WebP o, si el navegador no sabe generarlo, en JPEG. Devuelve
// { nombre, blob, ancho, alto }, con un nombre nuevo `<uuid>.<webp|jpg>` (design.md §1 y
// §2). Lanza ErrorFoto si el archivo no se puede leer como imagen.
export async function comprimirFoto(archivo, { ladoMaximo = LADO_MAXIMO } = {}) {
  let imagen;
  try {
    imagen = await decodificar(archivo);
  } catch (causa) {
    throw new ErrorFoto(causa);
  }
  try {
    if (!imagen.ancho || !imagen.alto) throw new Error('La imagen no tiene medidas');
    const escala = Math.min(1, ladoMaximo / Math.max(imagen.ancho, imagen.alto));
    const ancho = Math.max(1, Math.round(imagen.ancho * escala));
    const alto = Math.max(1, Math.round(imagen.alto * escala));

    const lienzo = document.createElement('canvas');
    lienzo.width = ancho;
    lienzo.height = alto;
    lienzo.getContext('2d').drawImage(imagen.fuente, 0, 0, ancho, alto);

    let blob = await aBlob(lienzo, 'image/webp', CALIDAD_WEBP);
    // Algunos navegadores (Safari) no generan WebP y devuelven PNG: se usa JPEG.
    if (blob?.type !== 'image/webp') blob = await aBlob(lienzo, 'image/jpeg', CALIDAD_JPEG);
    if (!blob) throw new Error('No se pudo codificar la imagen');

    const extension = blob.type === 'image/webp' ? 'webp' : 'jpg';
    return { nombre: `${crypto.randomUUID()}.${extension}`, blob, ancho, alto };
  } catch (causa) {
    throw causa instanceof ErrorFoto ? causa : new ErrorFoto(causa);
  } finally {
    imagen.cerrar();
  }
}

// ---------- Pintado ----------

// <img> de una imagen en memoria. La URL se revoca en cuanto se carga (o falla), para no
// dejar URLs vivas: la imagen ya decodificada se sigue viendo.
function imagenDeBlob(blob, { ancho, alto, clase }) {
  const url = URL.createObjectURL(blob);
  // .foto-real: se recorta (object-fit: cover) para llenar el hueco de la foto.
  const img = el('img', { src: url, alt: '', width: ancho, height: alto, class: clase ? `foto-real ${clase}` : 'foto-real' });
  const revocar = () => URL.revokeObjectURL(url);
  img.addEventListener('load', revocar, { once: true });
  img.addEventListener('error', revocar, { once: true });
  return img;
}

// Pinta en `contenedor` la foto del producto (product-photos, "Foto de un producto"): la
// imagen del catálogo, la foto real (de `imagen` si se pasa, o leída con `obtenerFoto`)
// o el icono genérico. Mientras se lee la foto real se ve el icono, y se queda si la foto
// no está en el dispositivo o no se puede leer, sin errores. La promesa se resuelve
// cuando el contenido es el definitivo (la usan las pruebas).
export async function pintarFoto(contenedor, producto, {
  obtenerFoto = async () => null,
  imagen = null,
  ancho,
  alto,
  clase,
  generico = ICONOS.producto,
} = {}) {
  const foto = fotoDeProducto(producto);
  if (foto?.tipo === 'predeterminada') {
    contenedor.replaceChildren(el('img', { src: foto.url, alt: '', width: ancho, height: alto, class: clase }));
    return;
  }
  contenedor.replaceChildren(icono(generico));
  if (foto?.tipo !== 'real') return;

  let blob = imagen;
  if (!blob) {
    try {
      blob = await obtenerFoto(foto.nombre);
    } catch {
      return; // sin acceso al almacenamiento: se queda el icono
    }
  }
  if (blob) contenedor.replaceChildren(imagenDeBlob(blob, { ancho, alto, clase }));
}
