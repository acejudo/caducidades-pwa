// Service Worker de Caducidades.
//
// IMPORTANTE: sube CACHE_VERSION en cada publicación (v1 → v2 …) para que los
// dispositivos descarguen la versión nueva, y añade a SHELL_FILES cualquier
// archivo nuevo del shell. Si un archivo de la lista no existe, el SW no se instala.
const CACHE_VERSION = 'v1';

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
  './js/auth.js',
  './js/storage.js',
  './js/drive.js',
  './img/icons/icon.svg',
  './img/icons/icon-192.png',
  './img/icons/icon-512.png',
  './img/icons/icon-maskable-512.png',
  './img/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NOMBRE)
      .then((cache) => cache.addAll(SHELL_FILES))
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
