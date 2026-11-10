// Service Worker de Caducidades.
//
// CACHE_VERSION: en producción el workflow de GitHub Actions la sustituye por el SHA
// del commit, así que cada despliegue invalida la caché. En local, súbela a mano si
// necesitas forzar la actualización. Añade a SHELL_FILES cualquier archivo nuevo del
// shell: si un archivo de la lista no existe, el SW no se instala.
const CACHE_VERSION = 'v2';

const CACHE_PREFIJO = 'caducidades-shell-';
const CACHE_NOMBRE = `${CACHE_PREFIJO}${CACHE_VERSION}`;

const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/app.js',
  './js/router.js',
  './js/ui.js',
  './js/utils.js',
  './js/config.js',
  './js/constantes.js',
  './js/productos.js',
  './js/formato.js',
  './js/iconos.js',
  './js/listado.js',
  './js/dialogo.js',
  './js/formulario.js',
  './js/fotos.js',
  './js/borradores.js',
  './js/elegir-foto.js',
  './js/detalle.js',
  './js/deslizar.js',
  './js/config.local.js',
  './js/auth.js',
  './js/storage.js',
  './js/drive.js',
  './img/predeterminadas/yogur.svg',
  './img/predeterminadas/leche.svg',
  './img/predeterminadas/queso.svg',
  './img/predeterminadas/huevos.svg',
  './img/predeterminadas/mantequilla.svg',
  './img/predeterminadas/pollo.svg',
  './img/predeterminadas/carne.svg',
  './img/predeterminadas/salmon.svg',
  './img/predeterminadas/embutido.svg',
  './img/predeterminadas/manzana.svg',
  './img/predeterminadas/platano.svg',
  './img/predeterminadas/tomate.svg',
  './img/predeterminadas/lechuga.svg',
  './img/predeterminadas/zanahoria.svg',
  './img/predeterminadas/pan.svg',
  './img/predeterminadas/arroz.svg',
  './img/predeterminadas/pasta.svg',
  './img/predeterminadas/conserva.svg',
  './img/predeterminadas/zumo.svg',
  './img/predeterminadas/generico.svg',
  './img/icons/icon.svg',
  './img/icons/icon-192.png',
  './img/icons/icon-512.png',
  './img/icons/icon-maskable-512.png',
  './img/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NOMBRE)
      // cache: 'reload': siempre de la red, nunca una copia antigua de la caché HTTP
      // (GitHub Pages sirve con max-age=600). Ver design.md §13 de ui-listado.
      .then((cache) => cache.addAll(SHELL_FILES.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((nombres) => Promise.all(
        nombres
          .filter((nombre) => nombre.startsWith(CACHE_PREFIJO) && nombre !== CACHE_NOMBRE)
          .map((nombre) => caches.delete(nombre)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  // Otros orígenes (servicios de Google) y peticiones que no son GET van directas a la red.
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    // Red primero; sin conexión, el shell cacheado (las rutas van en el hash).
    event.respondWith(
      fetch(request).catch(() => caches.match('./index.html', { cacheName: CACHE_NOMBRE })),
    );
    return;
  }

  event.respondWith(
    caches.match(request, { cacheName: CACHE_NOMBRE })
      .then((cacheada) => cacheada || fetch(request)),
  );
});
