// Pruebas de src/js/fotos-reales.js: compresión de las fotos reales y pintado de la foto
// de un producto. Specs: product-photos ("Compresión de las fotos reales" y "Foto de un
// producto"). Las imágenes de prueba se generan con un <canvas>.
import { prueba, igual, verdadero, rechaza } from './runner.js';

const modulo = await import('../../src/js/fotos-reales.js').catch((error) => {
  console.error('No se pudo cargar fotos-reales.js', error);
  return {};
});
const { esNombreFotoReal } = await import('../../src/js/productos.js').catch(() => ({}));

const FOTO = '3f2b8c1e-9a4d-4e6f-8b2a-1c5d7e9f0a3b.webp';

// Una imagen PNG de ancho×alto como File, como la que da el <input type="file">.
function imagenDePrueba(ancho, alto) {
  const lienzo = document.createElement('canvas');
  lienzo.width = ancho;
  lienzo.height = alto;
  const contexto = lienzo.getContext('2d');
  contexto.fillStyle = '#0EA5E9';
  contexto.fillRect(0, 0, ancho, alto);
  contexto.fillStyle = '#F97316';
  contexto.fillRect(0, 0, ancho / 2, alto / 2);
  return new Promise((resolver) => lienzo.toBlob((blob) => resolver(new File([blob], 'foto.png', { type: 'image/png' })), 'image/png'));
}

async function medidas(blob) {
  const mapa = await createImageBitmap(blob);
  const resultado = { ancho: mapa.width, alto: mapa.height };
  mapa.close();
  return resultado;
}

prueba('Foto grande', async () => {
  const resultado = await modulo.comprimirFoto(await imagenDePrueba(4000, 3000));
  const { ancho, alto } = await medidas(resultado.blob);
  igual(ancho, 1024, 'ancho');
  igual(alto, 768, 'alto');
  igual(resultado.ancho, 1024);
  igual(resultado.alto, 768);
  verdadero(['image/webp', 'image/jpeg'].includes(resultado.blob.type), `tipo ${resultado.blob.type}`);
});

prueba('Foto grande en vertical', async () => {
  const resultado = await modulo.comprimirFoto(await imagenDePrueba(1500, 3000));
  const { ancho, alto } = await medidas(resultado.blob);
  igual(ancho, 512, 'ancho');
  igual(alto, 1024, 'alto');
});

prueba('Foto pequeña', async () => {
  const resultado = await modulo.comprimirFoto(await imagenDePrueba(600, 400));
  const { ancho, alto } = await medidas(resultado.blob);
  igual(ancho, 600, 'ancho');
  igual(alto, 400, 'alto');
});

prueba('el nombre de la foto es <uuid>.<ext> según el tipo', async () => {
  const resultado = await modulo.comprimirFoto(await imagenDePrueba(100, 100));
  verdadero(esNombreFotoReal(resultado.nombre), `nombre ${resultado.nombre}`);
  const extension = resultado.blob.type === 'image/webp' ? '.webp' : '.jpg';
  verdadero(resultado.nombre.endsWith(extension), `extensión de ${resultado.nombre}`);
  const otra = await modulo.comprimirFoto(await imagenDePrueba(100, 100));
  verdadero(otra.nombre !== resultado.nombre, 'cada foto tiene un nombre nuevo');
});

prueba('Archivo que no es una imagen', async () => {
  const archivo = new File(['esto no es una imagen'], 'nota.txt', { type: 'text/plain' });
  await rechaza(modulo.comprimirFoto(archivo), modulo.ErrorFoto);
});

// ---------- pintarFoto ----------

function contenedor() {
  return document.createElement('span');
}

prueba('pintarFoto: sin foto, icono genérico', async () => {
  const c = contenedor();
  await modulo.pintarFoto(c, { foto: { tipo: 'ninguna', valor: null } }, { obtenerFoto: async () => null });
  igual(c.querySelector('img'), null);
  verdadero(c.querySelector('svg'), 'falta el icono genérico');
});

prueba('pintarFoto: foto predeterminada', async () => {
  const c = contenedor();
  await modulo.pintarFoto(c, { foto: { tipo: 'predeterminada', valor: 'leche' } }, { ancho: 48, alto: 48 });
  const img = c.querySelector('img');
  verdadero(img?.src.endsWith('/img/predeterminadas/leche.svg'), 'falta la imagen de Leche');
  igual(img.getAttribute('width'), '48');
  igual(img.getAttribute('alt'), '');
});

prueba('pintarFoto: foto real en el dispositivo', async () => {
  const c = contenedor();
  const blob = (await modulo.comprimirFoto(await imagenDePrueba(50, 50))).blob;
  const pedidas = [];
  await modulo.pintarFoto(c, { foto: { tipo: 'real', valor: FOTO } }, {
    obtenerFoto: async (nombre) => { pedidas.push(nombre); return blob; },
    ancho: 160,
    alto: 160,
  });
  igual(pedidas.join(), FOTO);
  const img = c.querySelector('img');
  verdadero(img?.src.startsWith('blob:'), `src ${img?.src}`);
  igual(img.getAttribute('alt'), '');
  igual(c.querySelector('svg'), null, 'el icono genérico se sustituye');
});

prueba('pintarFoto: imagen en memoria (borrador del formulario)', async () => {
  const c = contenedor();
  const blob = (await modulo.comprimirFoto(await imagenDePrueba(50, 50))).blob;
  await modulo.pintarFoto(c, { foto: { tipo: 'real', valor: FOTO } }, {
    imagen: blob,
    obtenerFoto: async () => { throw new Error('no debería leer del almacenamiento'); },
  });
  verdadero(c.querySelector('img')?.src.startsWith('blob:'), 'falta la imagen');
});

async function sinErroresEnConsola(fn) {
  const errores = [];
  const original = console.error;
  console.error = (...args) => errores.push(args);
  try {
    await fn();
  } finally {
    console.error = original;
  }
  igual(errores.length, 0, 'hubo errores en la consola');
}

prueba('pintarFoto: foto real todavía no disponible', async () => {
  await sinErroresEnConsola(async () => {
    const c = contenedor();
    await modulo.pintarFoto(c, { foto: { tipo: 'real', valor: FOTO } }, { obtenerFoto: async () => null });
    igual(c.querySelector('img'), null);
    verdadero(c.querySelector('svg'), 'falta el icono genérico');
  });
});

prueba('pintarFoto: falla la lectura de la foto', async () => {
  await sinErroresEnConsola(async () => {
    const c = contenedor();
    await modulo.pintarFoto(c, { foto: { tipo: 'real', valor: FOTO } }, {
      obtenerFoto: async () => { throw new Error('IndexedDB bloqueado'); },
    });
    igual(c.querySelector('img'), null);
    verdadero(c.querySelector('svg'), 'falta el icono genérico');
  });
});
