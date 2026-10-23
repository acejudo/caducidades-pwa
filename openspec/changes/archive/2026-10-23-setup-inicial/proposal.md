# Proposal

## Why

Caducidades todavía no tiene código: solo existen `SPEC.md`, `DESIGN.md` y los mockups de `design/`. Antes de implementar el login, los productos o la sincronización con Drive hace falta una base común: la estructura de carpetas, el *shell* de la PWA (que se pueda instalar y abrir sin conexión), el sistema visual y la navegación entre pantallas. Así cada funcionalidad posterior se construye sobre la misma base y no reinventa cada una la suya.

## What Changes

- Estructura de carpetas según `SPEC.md` §9 (`css/`, `js/`, `img/predeterminadas/`), más dos módulos nuevos: `js/router.js` y `js/config.js`.
- `index.html` mínimo: contenedor de la app, cabecera, zona de contenido y navegación inferior, con las metaetiquetas que piden Android e iOS para instalar la app.
- `manifest.json` con nombre, iconos (192/512 y *maskable*), colores, `display: standalone` y rutas relativas, para que funcione publicado en un subdirectorio de GitHub Pages.
- Iconos de la app (SVG de origen y PNG exportados, incluido `apple-touch-icon`).
- `sw.js` básico: precarga los ficheros del *shell* en una caché versionada, sirve primero desde caché los recursos propios, cae en `index.html` cuando una navegación falla sin conexión y borra las cachés de versiones anteriores.
- `css/styles.css` con un reset, variables CSS de `DESIGN.md` (colores, colores de urgencia, radios, sombras, espaciado, tipografía del sistema) y los estilos base de layout, botones y navegación inferior.
- Router por *hash* (`#/listado`, `#/producto/nuevo`, `#/producto/:id`, `#/producto/:id/editar`, `#/elegir-foto`, `#/ajustes`, `#/login`) que pinta pantallas vacías con su título, gestiona las rutas desconocidas y deja preparado un punto de enganche (*guard*) para la autenticación.
- Enlaces mínimos en los marcadores para recorrer todas las pantallas tocando (sin escribir URLs): botón flotante "+", un producto de ejemplo en Listado, botón "Editar" en Detalle, zona de foto que lleva a Elegir foto, acceso provisional a Login desde Ajustes y flecha de volver en las pantallas secundarias.
- `js/config.js` con las constantes de la app: `GOOGLE_CLIENT_ID` (de momento vacío), la lista de emails autorizados (vacía), el *scope* de Drive, los nombres de archivo y carpeta en Drive y los umbrales de urgencia.
- Módulos vacíos `auth.js`, `storage.js`, `drive.js` y `utils.js` (solo con un comentario que explica qué irá en cada uno) y un `README.md` que explica cómo arrancar la app en local.

**Fuera de alcance:** autenticación, lógica de productos, Google Drive, almacenamiento local de datos y el contenido real de las pantallas.

## Capabilities

### New Capabilities
- `pwa-shell`: instalación de la app como PWA (manifest, iconos, metaetiquetas de iOS) y carga del *shell* sin conexión mediante el Service Worker.
- `app-navigation`: rutas de la app, cambio entre pantallas, ruta por defecto y rutas desconocidas, navegación inferior, flecha de volver, recorrido completo tocando y enganche para restringir el acceso.
- `ui-theme`: sistema visual base (tokens de color, colores de urgencia, tipografía, tamaños táctiles mínimos y zonas seguras de pantalla) que comparten todas las pantallas.

### Modified Capabilities
<!-- Ninguna: no existen specs previas. -->

## Impact

- **Código**: proyecto nuevo y estático en la raíz del repositorio. Sin dependencias, sin *bundler* y sin `package.json` obligatorio (JavaScript vanilla con módulos ES).
- **Despliegue**: pensado para GitHub Pages bajo un subdirectorio. Por eso todas las rutas son relativas.
- **Cambios siguientes**: el login usará el *guard* del router y `config.js`; los productos rellenarán las pantallas; la sincronización ampliará `sw.js`/`storage.js`. Cada versión publicada necesitará subir la versión de la caché del Service Worker.
