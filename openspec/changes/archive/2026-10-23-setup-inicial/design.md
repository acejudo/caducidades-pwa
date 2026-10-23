# Design

## Context

El repositorio solo tiene documentación (`SPEC.md`, `DESIGN.md`) y mockups (`design/*.jpg`). Restricciones que condicionan el enfoque (motivación en proposal.md, apartado "Why"):

- **Despliegue estático por HTTPS en un subdirectorio** de GitHub Pages (`/caducidades-pwa/`). No hay servidor que reescriba URLs.
- **JavaScript vanilla**, como recomienda `SPEC.md` §8, para un proyecto pequeño de dos usuarios.
- **Android (Chrome) e iOS (Safari)**. iOS tiene un soporte de PWA más limitado: no usa los iconos del manifest, necesita metaetiquetas propias y limpia el almacenamiento de forma más agresiva.
- **Herramientas locales**: Node 25 y Python 3.14. Se pueden usar en desarrollo, pero la app no debe depender de ellas en tiempo de ejecución.

## Goals / Non-Goals

**Goals:**
- Un *shell* instalable y que funcione sin conexión, desplegable copiando archivos tal cual, sin paso de *build*.
- Puntos de extensión claros para los cambios siguientes: el *guard* del router (login), `config.js` (Google), los módulos vacíos (`auth`, `storage`, `drive`) y un registro de pantallas en `ui.js`.
- Tokens CSS que reflejen `DESIGN.md`, para que las pantallas futuras no usen colores sueltos.

**Non-Goals:**
- Pipeline de *build*, minificación, TypeScript o *framework* de tests. Se podrán evaluar más adelante.
- Estrategias de caché para datos o fotos (las definirá el cambio de sincronización).
- Aviso al usuario cuando hay una versión nueva ("actualizar ahora"). La versión nueva se aplica en la siguiente carga.
- Modo oscuro (fuera de alcance según `SPEC.md` §11).

## Decisions

### 1. Estructura de archivos

```
caducidades-pwa/
├── index.html
├── manifest.json
├── sw.js
├── README.md
├── css/styles.css
├── js/
│   ├── app.js        # arranque: registra el SW, las rutas y el guard; monta la UI
│   ├── config.js     # constantes (nuevo respecto a SPEC §9)
│   ├── router.js     # router por hash (nuevo respecto a SPEC §9)
│   ├── ui.js         # cabecera, nav inferior y renderizadores de pantalla (marcadores)
│   ├── auth.js       # vacío: solo un comentario de propósito
│   ├── storage.js    # vacío: solo un comentario de propósito
│   ├── drive.js      # vacío: solo un comentario de propósito
│   └── utils.js      # helpers mínimos (p. ej. crear elementos DOM, escapar texto)
├── img/
│   ├── icons/        # icon.svg (origen), icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png
│   └── predeterminadas/.gitkeep
└── design/           # ya existe
```

`router.js` y `config.js` se añaden a la estructura de SPEC §9 porque son responsabilidades separadas que usarán varios módulos. Si `ui.js` crece demasiado con las pantallas reales, se dividirá en `js/pantallas/` en un cambio posterior. Ahora no hace falta.

### 2. Módulos ES nativos sin bundler
`<script type="module" src="js/app.js">` e `import` con rutas relativas (`./router.js`). Chrome y Safari modernos lo soportan.
- *Alternativa descartada:* Vite u otro *bundler*. Añade `node_modules`, un paso de *build* y configuración de `base` para GitHub Pages, algo innecesario para unos pocos archivos.
- *Alternativa descartada:* scripts globales sin módulos. Obligan a gestionar a mano el orden de carga y el espacio de nombres global.

### 3. Router por hash
Rutas `#/listado`, `#/producto/nuevo`, `#/producto/:id`, `#/producto/:id/editar`, `#/elegir-foto`, `#/ajustes`, `#/login`. El router escucha `hashchange`, compara contra patrones ordenados (`nuevo` antes que `:id`) y llama al renderizador con `{ params }`.
- El *guard* es una función opcional, `setGuard(fn)`, que recibe la ruta destino y devuelve `true` o la ruta a la que redirigir. Por defecto no hay *guard*, así que todo está permitido. El cambio de login registrará el suyo en `app.js`.
- Las rutas vacías o desconocidas se redirigen con `location.replace('#/listado')`, que no añade la ruta inválida al historial.
- Cada ruta declara `{ titulo, mostrarNav, padre }`. Así `ui.js` pinta el título de la cabecera, oculta la navegación en Login y decide si muestra la flecha de volver (solo si hay `padre`).
- **Flecha de volver:** el router lleva un contador de navegaciones internas. Si es mayor que 0, la flecha hace `history.back()`; si no (entrada directa por URL o app recién abierta), hace `location.replace` a la ruta `padre`, resuelta con los mismos parámetros (`producto/:id/editar` → `producto/:id`). Padres: Nuevo y Detalle → Listado, Editar → Detalle, Elegir foto → Listado. Con el contador se evita que `history.back()` saque al usuario de la app cuando no hay historial propio.
- **Enlaces de recorrido:** son elementos `<a href="#/...">` normales (o botones que llaman a `navegar`) dentro de los marcadores: el FAB "+" en Listado, una tarjeta "Producto de ejemplo" con id fijo `ejemplo`, "Editar" en Detalle, una zona de foto en Nuevo/Editar y "Ir a Login" en Ajustes. Usan ya las clases base (`.fab`, `.btn--primario`), así que las pantallas reales los reaprovecharán. La tarjeta de ejemplo y el acceso a Login son provisionales: se quitarán en los cambios de productos y de login, respectivamente.
- *Alternativa descartada:* History API con rutas limpias (`/ajustes`). En GitHub Pages, recargar `/caducidades-pwa/ajustes` devuelve 404 si no se usa el truco de `404.html`, y complica el *fallback* del Service Worker. El hash funciona sin servidor y sin trucos.

### 4. Service Worker: precaché versionada y cache-first
- `const CACHE_VERSION = 'v1'` → caché `caducidades-shell-v1`. Lista explícita `SHELL_FILES` con rutas relativas al SW (`./`, `./index.html`, `./css/styles.css`, `./js/*.js`, `./manifest.json`, iconos).
- `install`: `cache.addAll(SHELL_FILES)` + `skipWaiting()`. `activate`: borra las cachés `caducidades-shell-*` que no sean la actual + `clients.claim()`.
- `fetch`: ignora las peticiones que no sean GET o de otro origen (no llama a `respondWith`). Para las navegaciones (`request.mode === 'navigate'`) intenta la red y, si falla, devuelve `./index.html` de la caché. Para el resto, primero la caché y luego la red.
- Se registra desde `app.js` con `navigator.serviceWorker.register('./sw.js')` si existe `'serviceWorker' in navigator`. El *scope* por defecto es el directorio del SW, es decir, el subdirectorio de GitHub Pages.
- *Alternativa descartada:* Workbox. Es demasiado para unos 15 archivos y requiere un paso de *build* o un CDN, este último incompatible con la carga sin conexión del primer arranque.
- *Alternativa descartada:* *network-first* para todo. Haría más lenta la carga con mala conexión, que es el caso típico en una cocina.

### 5. Manifest e iOS
- `manifest.json`: `name: "Caducidades"`, `short_name: "Caducidades"`, `lang: "es"`, `start_url: "./#/listado"`, `scope: "./"`, `display: "standalone"`, `background_color` y `theme_color` `#FFFFFF` (cabecera blanca según DESIGN §1) e iconos 192, 512 y 512 *maskable*.
- `index.html`: `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`, `theme-color`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-title`, `apple-mobile-web-app-status-bar-style: default` y `<link rel="apple-touch-icon" href="img/icons/apple-touch-icon.png">`.

### 6. Iconos
Un único `img/icons/icon.svg` como origen: fondo azul primario con un símbolo simple (calendario o reloj) dentro de la zona segura del 80 %, para que el *maskable* no se recorte. Los PNG se generan una sola vez en desarrollo con `npx --yes sharp-cli` y se guardan en el repo. No queda ninguna dependencia en `package.json`.
- *Alternativa:* si `sharp-cli` falla en Windows, exportar el SVG desde el navegador (canvas) o desde cualquier editor gráfico. Lo que importa es tener los PNG, no la herramienta.

### 7. CSS: un único archivo con tokens en `:root`
Orden dentro de `styles.css`: reset moderno breve → tokens (`--color-primario`, `--color-urgencia-rojo|naranja|verde`, `--radio-sm|md|lg`, `--sombra-suave`, `--espacio-1..6`, `--fuente-sistema`, `--texto-*`, `--tactil-min: 44px`) → layout (`.app`, `.cabecera`, `.contenido`, `.nav-inferior` con `env(safe-area-inset-*)`) → componentes base (`.btn`, `.btn--primario`, `.btn--secundario`, `.btn--peligro`, `.fab`) → utilidades mínimas.
- La fuente es `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`. Sin Google Fonts: funciona sin conexión y es más rápida.
- Los nombres de los tokens van en español, igual que el modelo de datos de SPEC.
- *Alternativa descartada:* Tailwind u otro *framework* CSS. Requiere *build* o CDN y no aporta mucho a un tema tan pequeño.

### 8. Iconos de interfaz
Se incrustan como SVG en `ui.js` los pocos iconos que se necesitan ahora (lista y ajustes en la navegación), copiados de Lucide (licencia ISC). Se descarta cargar la librería de Lucide: sería una dependencia o un CDN más para dos iconos.

### 9. `config.js`
Exporta constantes inmutables (`Object.freeze`): `APP_NOMBRE`, `GOOGLE_CLIENT_ID = ''`, `EMAILS_AUTORIZADOS = []`, `DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file'`, `DRIVE_CARPETA = 'Caducidades'`, `DRIVE_ARCHIVO = 'caducidades.json'`, `DRIVE_CARPETA_FOTOS = 'fotos'`, `URGENCIA = { rojoMaxDias: 2, naranjaMaxDias: 7 }`, `CATEGORIAS`. El Client ID de OAuth de una app web es público por diseño, así que puede ir en el repo. Los emails reales se rellenarán en el cambio de login.

### 10. Verificación
No hay *framework* de tests en este cambio. La verificación es manual y está guiada por los escenarios de las specs: servir la app en local (`python -m http.server 8080`, que cuenta como contexto seguro en `localhost`), DevTools → Application (Manifest, Service Workers, Cache Storage), modo sin conexión y Lighthouse (categoría PWA o auditoría de instalabilidad). La instalación en un iPhone real se prueba tras desplegar en HTTPS.

## Risks / Trade-offs

- [Olvidar subir `CACHE_VERSION` al publicar] → Los usuarios siguen con la versión antigua. → Mitigación: el README documenta el paso de publicación, y `CACHE_VERSION` va arriba del todo en `sw.js` con un comentario.
- [`skipWaiting` + `clients.claim` mezcla recursos de dos versiones en una sesión abierta] → Raro con tan pocos archivos y dos usuarios. → Mitigación: se acepta. Si aparece el problema, se añadirá el aviso "Nueva versión disponible".
- [Un archivo de `SHELL_FILES` con un 404 hace fallar `addAll` y el SW no se instala] → Mitigación: una tarea de verificación revisa en DevTools que el SW queda *activated*. La lista de archivos se mantiene a mano junto a la estructura.
- [iOS puede borrar la caché del SW si la app no se usa durante semanas] → Afecta sobre todo a los datos futuros, no al *shell*. Se tendrá en cuenta en el cambio de almacenamiento.
- [Las URLs con hash quedan algo menos limpias] → No importa en una app privada e instalada, donde la barra de direcciones no se ve.

## Migration Plan

No hay nada que migrar: es el primer código del proyecto. Despliegue: activar GitHub Pages sobre la rama principal (raíz) y abrir la URL HTTPS. Para volver atrás basta con revertir el commit. Si un SW defectuoso se queda instalado, se publica uno con una `CACHE_VERSION` nueva o se borra desde DevTools.

## Open Questions

- El diseño definitivo del icono (símbolo y tono exacto) se puede ajustar después sin afectar al resto. Este cambio usa un icono provisional coherente con el color primario.
