# Tasks

## 1. Estructura del proyecto

- [x] 1.1 Crear las carpetas `css/`, `js/`, `img/icons/` e `img/predeterminadas/` (con `.gitkeep`) en la raíz; verificar con un listado que coinciden con design.md §1
- [x] 1.2 Crear `js/auth.js`, `js/storage.js` y `js/drive.js` como módulos ES vacíos, cada uno con un comentario de cabecera que indique su propósito futuro (SPEC §6 y §7); verificar que cada archivo existe y no exporta lógica
- [x] 1.3 Crear `js/config.js` con las constantes congeladas de design.md §9 (`GOOGLE_CLIENT_ID` y `EMAILS_AUTORIZADOS` vacíos, *scope* y nombres de Drive, umbrales de urgencia, categorías); verificar en la consola del navegador con `import('./js/config.js')` que los valores son correctos y que `Object.isFrozen` devuelve `true`
- [x] 1.4 Crear `js/utils.js` con helpers mínimos de DOM (crear un elemento con atributos e hijos, vaciar un contenedor) usando `textContent` y no `innerHTML` para el texto dinámico; verificar importándolo desde la consola

## 2. Sistema visual (ui-theme)

- [x] 2.1 Escribir en `css/styles.css` el reset y los tokens en `:root` (colores de DESIGN §2, urgencia rojo `#EF4444`, naranja `#F97316` y verde `#22C55E`, radios de 8–16 px, sombra suave, escala de espaciado, `--fuente-sistema`, escala tipográfica, `--tactil-min: 44px`); verificar en DevTools → Computed que `--color-primario` vale `#2563EB` y que no se pide ninguna fuente externa
- [x] 2.2 Añadir los estilos de layout (`.app`, `.cabecera`, `.contenido`, `.nav-inferior`) con `env(safe-area-inset-*)` para la cabecera y la navegación; verificar en el modo dispositivo de DevTools (iPhone con notch) que no hay solapes
- [x] 2.3 Añadir los componentes base `.btn`, `.btn--primario`, `.btn--secundario`, `.btn--peligro`, `.fab` y las utilidades de urgencia (`.urgencia--rojo|naranja|verde`) que usan los tokens; verificar con una página de prueba temporal (o en la pantalla Ajustes vacía) que el botón primario es azul, con texto blanco y 44 px o más de alto, y borrar después la página temporal

## 3. HTML, manifest e iconos (pwa-shell: instalación)

- [x] 3.1 Crear `index.html` con `lang="es"`, las metaetiquetas de design.md §5 (viewport con `viewport-fit=cover`, `theme-color`, `apple-mobile-web-app-*`), `<link rel="manifest">`, `<link rel="apple-touch-icon">`, `css/styles.css`, el contenedor `.app` (cabecera, `<main>` y `<nav>`) y `<script type="module" src="js/app.js">`; verificar que se abre sin errores en la consola con `python -m http.server 8080`
- [x] 3.2 Diseñar `img/icons/icon.svg` (fondo `#2563EB`, símbolo dentro de la zona segura del 80 %) y generar `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` y `apple-touch-icon.png` (180×180) con `npx --yes sharp-cli` (o exportándolos a mano, ver design.md §6); verificar las dimensiones de cada PNG y el recorte *maskable* en maskable.app o en DevTools
- [x] 3.3 Crear `manifest.json` con los campos de design.md §5 (`start_url: "./#/listado"`, `scope: "./"`, `lang: "es"`, `display: "standalone"` e iconos); verificar que DevTools → Application → Manifest no muestra errores ni avisos de instalabilidad

## 4. Navegación (app-navigation)

- [x] 4.1 Implementar `js/router.js`: registro de rutas con patrones (`:id`), orden de coincidencia (`producto/nuevo` antes que `producto/:id`), escucha de `hashchange`, `navegar(ruta)`, `setGuard(fn)` y redirección con `location.replace('#/listado')` para las rutas vacías o desconocidas; verificar a mano que `#/producto/abc123` entrega `{ id: 'abc123' }` y que `#/no-existe` acaba en `#/listado` sin dejar una entrada extra en el historial
- [x] 4.2 Implementar en `js/ui.js` el renderizado de la cabecera (título de la ruta), la navegación inferior (Listado y Ajustes con iconos SVG de Lucide incrustados, estado activo en primario, oculta cuando `mostrarNav` es falso) y un renderizador de marcador por pantalla (Login, Listado, Nuevo, Detalle, Editar, Elegir foto, Ajustes) que muestre el título en español y, si existe, el id recibido; verificar que cada ruta pinta su título y que la navegación no aparece en `#/login`
- [x] 4.3 Implementar `js/app.js`: registra las rutas con `{ titulo, mostrarNav, render }`, monta la UI y arranca el router (sin *guard*, así que todo está permitido); verificar los escenarios de app-navigation (acceso directo, botón Atrás sin recarga, ruta por defecto, ruta inexistente, elemento activo)
- [x] 4.4 Añadir en `js/router.js` el contador de navegaciones internas y `volver(rutaActual)` (`history.back()` si hay historial propio, si no `location.replace` al `padre` resuelto con los parámetros), y en `js/ui.js` la flecha de volver en la cabecera cuando la ruta tiene `padre` (zona táctil de 44 px o más); verificar los escenarios de "Flecha de volver": Listado → Detalle → volver da Listado, abrir directamente `#/producto/abc123/editar` → volver da `#/producto/abc123`, y Listado y Ajustes sin flecha
- [x] 4.5 Añadir los enlaces de recorrido a los marcadores de `js/ui.js`: FAB "+" en Listado → `#/producto/nuevo`, tarjeta "Producto de ejemplo" → `#/producto/ejemplo`, botón "Editar" en Detalle → `#/producto/:id/editar`, zona de foto en Nuevo/Editar → `#/elegir-foto`, y "Ir a Login" (provisional) en Ajustes → `#/login`; verificar en el modo dispositivo de DevTools que se llega a las siete pantallas solo tocando y que desde Elegir foto el botón volver regresa al formulario
- [x] 4.6 Verificar el escenario "Control que redirige" registrando temporalmente desde la consola un *guard* que mande `#/listado` a `#/login`, y comprobar después que sin *guard* vuelve a permitirse todo

## 5. Service Worker (pwa-shell: sin conexión)

- [x] 5.1 Crear `sw.js` con `CACHE_VERSION` comentado arriba del todo, `SHELL_FILES` (todos los archivos de los grupos 1–4 con rutas relativas), `install` (precarga + `skipWaiting`), `activate` (borra las cachés `caducidades-shell-*` antiguas + `clients.claim`) y `fetch` (ignora lo que no sea GET o sea de otro origen, navegaciones con la red primero y *fallback* a `./index.html`, resto con la caché primero); verificar en DevTools que el SW queda *activated* y que Cache Storage contiene todos los archivos de `SHELL_FILES`
- [x] 5.2 Registrar el SW desde `js/app.js` con `navigator.serviceWorker.register('./sw.js')` si el navegador lo soporta, y mostrar el error en la consola si falla; verificar que se registra en `localhost` y que no rompe la app si no hay soporte
- [x] 5.3 Verificar los escenarios sin conexión: con DevTools en Offline, recargar en `#/listado` y en `#/ajustes` y comprobar que se pinta la app; cambiar `CACHE_VERSION` a `v2`, recargar y comprobar que solo queda `caducidades-shell-v2`; devolver después `CACHE_VERSION` a `v1`

## 6. Documentación e integración

- [x] 6.1 Escribir `README.md`: qué es la app, cómo servirla en local (`python -m http.server 8080`), la estructura de carpetas, dónde están las constantes (`js/config.js`), cómo publicar en GitHub Pages y el paso obligatorio de subir `CACHE_VERSION` y actualizar `SHELL_FILES` en cada publicación; verificar que los comandos del README funcionan tal como están escritos
- [x] 6.2 Pasar Lighthouse (móvil) sobre la app servida en local y comprobar que la auditoría de instalabilidad o PWA no muestra errores y que la consola está limpia
- [x] 6.3 Tras desplegar en HTTPS, instalar la app en Chrome para Android y en Safari para iOS y comprobar que abre a pantalla completa con su icono y su nombre, que respeta las zonas seguras y que funciona en modo avión (escenarios de pwa-shell y ui-theme). Si todavía no hay despliegue, dejar anotado que queda pendiente
  - Verificado por el usuario el 2026-10-23 en https://acejudo.github.io/caducidades-pwa/ (app instalada en el móvil).

## Workflow follow-up

- Archivar el cambio (`/opsx:archive`) cuando esté implementado y verificado, para crear las specs principales `pwa-shell`, `app-navigation` y `ui-theme`.
