# Caducidades – Guía para Claude

PWA privada para un grupo reducido de usuarios autorizados (lista blanca de emails, sin límite fijo) para controlar caducidades de alimentos. HTML, CSS y JavaScript vanilla con módulos ES: **sin dependencias de ejecución ni paso de *build***.

## Fuentes de verdad

- Funcionalidad: [docs/SPEC.md](docs/SPEC.md). Diseño visual: [docs/DESIGN.md](docs/DESIGN.md) y los mockups de `docs/design/`.
- Requisitos vigentes: `openspec/specs/`. Cambios en curso: `openspec/changes/`. Histórico: `openspec/changes/archive/`.
- Puesta en marcha, configuración de Google y despliegue: [README.md](README.md).

## Estructura

- `src/`: la app. **Es lo único que se publica** en GitHub Pages. Todo archivo nuevo de `src/` que forme parte del *shell* va también en `SHELL_FILES` de `src/sw.js`.
- `tests/`: pruebas automáticas (no se publican).
- `scripts/`: herramientas Node sin dependencias.
- `docs/`: SPEC, DESIGN y mockups.
- `src/js/config.local.js` tiene datos sensibles (Client ID y hashes de emails): está en `.gitignore` y **nunca** se commitea, se sobrescribe ni se crea con datos falsos encima del real.

## Flujo de trabajo

- Cada funcionalidad es un cambio de OpenSpec: `/opsx:propose <nombre>` → revisión del usuario → `/opsx:apply` → `/opsx:archive`. Antes de proponer, pide al usuario el prompt de la spec.
- Todos los artefactos (proposal, design, specs y tasks), la UI, los mensajes y la documentación están **en español**.
- No hagas commit ni push salvo que el usuario lo pida. Si lo pide, a menudo prefiere que le des los comandos para ejecutarlos él.

## Nada de pistas en lo que se publica

El repositorio es **público**. Todo lo versionado (artefactos de OpenSpec, README, comentarios, mensajes de *commit*) describe **qué hace la app**, nunca **dónde es débil**:
- Sí: el comportamiento y cómo se prueba (el código publicado ya lo muestra).
- No: el estado de las cuentas (verificación en dos pasos, protección de ramas, dónde están los secretos, orígenes OAuth configurados), los puntos débiles abiertos o aceptados, la valoración del origen de publicación ni los informes de auditoría. Eso va en `docs/security/` (en `.gitignore`), y los artefactos solo remiten a "las notas locales".
- Un cambio que arregla un fallo de seguridad se sube **en el mismo *push*** que el arreglo, nunca antes.
- Antes de proponer un *commit*, repasa el diff con este criterio.

## TDD (obligatorio)

Todo código nuevo con lógica se desarrolla con TDD, y las pruebas quedan versionadas en `tests/`:

1. **Rojo:** escribir las pruebas de los escenarios de la spec (el nombre de la prueba es el del escenario) y comprobar que **fallan**.
2. **Verde:** implementar lo mínimo para que pasen.
3. **Refactor:** limpiar con las pruebas en verde.

Las `tasks.md` de cada cambio se escriben en esos ciclos (tarea "Rojo" y tarea "Verde" por bloque de escenarios). No se dejan las pruebas para un grupo final.

Herramientas, todas **sin dependencias** (no añadir Jest, Vitest, Puppeteer, `fake-indexeddb`…):

- **Lógica pura** (sin DOM ni IndexedDB): `node --test` → `npm test`. Los módulos puros no deben importar `config.js` (arrastra `config.local.js`). Las constantes compartidas viven en `src/js/constantes.js`.
- **Código que necesita el navegador** (IndexedDB, DOM): página `tests/navegador/` con el mini-runner propio → `npm run test:navegador` (Chrome o Edge *headless*), o a mano con `python -m http.server 8080` desde la raíz abriendo `/tests/navegador/`. Las pruebas usan la base de datos `caducidades-pruebas`, nunca la real.
- Lo que no se puede automatizar (Service Worker real, login con Google real, móvil instalado) se deja como tarea manual explícita.

Antes de dar una tarea por terminada: `npm test` y `npm run test:navegador` en verde.

## Comprobación visual

`node scripts/captura-app.mjs --ruta listado --salida captura.png [--productos productos.json] [--esperar ".lista-productos"] [--script recorrido.js]` abre la app real a tamaño de móvil (390×844) con una **sesión simulada** y productos de prueba, ejecuta opcionalmente un recorrido y guarda una captura. Imprime `{ listo, resultado, errores }`, con los errores de la consola. No toca `config.local.js`: lo sirve modificado en memoria. Úsalo para comparar con los mockups y para recorridos tocando antes de pedir la prueba en el móvil. Guarda las capturas en el scratchpad, no en el repo. La CSP real está activa en las capturas y sus infracciones salen en `errores` como `CSP: …`. El estilo en línea de Google Sign-In (bloqueado a propósito) sale aparte, en `conocidos`. Chrome se controla por tubería, sin puerto de depuración.

## Convenciones y lecciones aprendidas

**Pantallas**
- Cada pantalla vive en su módulo y se crea con `crear…({ dependencias })` → `{ elemento, cargado }`. `elemento` se entrega al router enseguida y `cargado` es la promesa de la primera carga, que usan las pruebas. Las dependencias (almacenamiento, navegación, `hoy`, `confirmar`) tienen valores por defecto reales y se sustituyen en las pruebas. Los módulos de pantalla no importan `ui.js`, `auth.js` ni `config.js`.
- Si hace falta un "reinicio" para las pruebas (filtro, borradores, base de datos), se exporta una función explícita (`reiniciarFiltro`, `descartarBorradores`, `usarBaseDeDatos`) que la app no usa.
- Confirmaciones con `confirmar()` de `src/js/dialogo.js`, nunca `window.confirm()`. Los textos siempre con `textContent`/`el()`, nunca `innerHTML`.
- `index.html` tiene una Content-Security-Policy (`tests/csp.test.js`): nada de scripts ni `<style>` en línea, ni atributos `style="…"` en HTML (`element.style` desde JS sí vale), ni orígenes externos nuevos sin añadirlos a la directiva concreta.
- `el()` ignora los hijos `null`/`false` (vale `cond && el(...)`), pero `append()` y `replaceChildren()` **los pintan como texto** ("false", "null"). Con ellos, filtra antes (`[...].filter(Boolean)`). Las pruebas de pantalla comprueban que no queda texto suelto.
- Contraste: el texto blanco sobre los colores de urgencia o sobre `#EF4444` no llega a 4,5:1. Usa los tokens `--color-urgencia-*-texto`/`-suave` y `--color-peligro`.

**Sincronización con Drive**
- Capas: `sincronizacion.js` (puro: fusión, purga, archivo, plan de fotos y texto del estado; Node), `drive.js` (cliente `fetch` de Drive v3, con `fetch` y token inyectables; Node), `sincronizador.js` (orquesta cuándo sincronizar y publica el estado; navegador con dobles) y `estado-sincronizacion.js` (icono de la cabecera y sección de Ajustes).
- Fotos reales: `fotos-reales.js` comprime (`comprimirFoto`) y pinta (`pintarFoto`, la usan Listado, Detalle y formulario) en el navegador. Se guardan como Blob en el almacén `fotos` de `storage.js` (v2) con un nombre `<uuid>.webp|jpg`, validado en `productos.js` (`esNombreFotoReal`). El sincronizador las sube, descarga y limpia **después** de la lista (`planificarFotos`), en la subcarpeta `fotos/` de la carpeta de la lista. El fallo de una descarga o de un borrado no para la sincronización; el de una subida, sí (y deja cambios pendientes).
- El token de Drive guarda el email de la sesión y `tokenVigente()` rechaza el de otra cuenta. `vigilarOtrasVentanas` (evento `storage`) olvida y revoca el token cuando otra ventana cierra sesión o cambia de cuenta. Las pruebas de `auth.js` (`tests/navegador/auth.test.js`) sustituyen almacenamiento, Google, perfil y red con `usarEntornoAuth`.
- El sincronizador no importa `auth.js`: recibe `auth` (`sesionActual`, `tokenVigente`, `renovarToken`, `olvidarToken`, `esEmailAutorizado`) inyectado. La instancia de la app (`sincronizador`) se crea en `ui.js`.
- Las constantes de Drive (`DRIVE_SCOPE`, `DRIVE_CARPETA`…) viven en `constantes.js`, no en `config.js`.
- Cualquier escritura nueva en `storage.js` que haga el usuario debe emitir `cambiosLocales` ('cambio'); lo que llega de Drive se guarda con `guardarSincronizados`, que no avisa y conserva `actualizado`.
- Abrir la ventana de Google (renovar el token) solo desde un gesto del usuario.

**Pruebas de navegador** (`tests/navegador/`)
- Imports tolerantes (`await import(...).catch(() => ({}))`), para que en rojo falle cada prueba por separado y no la página entera.
- `antesDeCada` se aplica a las pruebas registradas **después** de llamarlo: cada archivo declara el suyo.
- Monta las pantallas en una zona propia. Si hay que probar el **foco**, la zona va fuera de la pantalla (`position: absolute; left: -10000px`), no con `hidden`, porque un elemento oculto no recibe el foco.
- Los formularios necesitan una red de seguridad en la zona: `preventDefault` en `submit` y en los clics de enlaces. Si no, la página de pruebas navega y el script se queda sin resultado.
- Un `<dialog>` modal abierto deja inerte toda la página. Ciérralo siempre en `finally`, o una prueba que falla arrastra a las siguientes.
- Si una prueba depende de los estilos, carga `../../src/css/styles.css` en ella. El *reset* (`* { margin: 0 }`) cambia el comportamiento: por ejemplo, rompía el centrado de `<dialog>`.

**Entorno (Windows + Git Bash)**
- En Git Bash, un argumento que empieza por `/` (o `#/`) se convierte en una ruta de Windows (`C:/Program Files/Git/...`). Usa `MSYS_NO_PATHCONV=1` o escribe las rutas sin barra inicial.
- `npm test` usa el glob `"tests/*.test.js"`: con un directorio, Node 24 falla y además entraría en `tests/navegador/`.
- Algunos archivos usan finales de línea **CRLF** (`auth.js`, `config.js`, `productos.js`, `router.js`, `utils.js`, `formulario.test.js`, `runner.js`…; compruébalo con `file`). Un reemplazo por script con textos de varias líneas no encuentra nada en ellos y, si no se comprueba, falla **sin avisar**: edítalos con la herramienta de edición, o haz que el script lance un error si no encuentra el texto.
- Los *heredoc* largos en Bash a veces llegan cortados. Para scripts de más de unas líneas, escríbelos en un archivo del scratchpad y ejecútalo.

**Despliegue**
- GitHub Pages sirve con `Cache-Control: max-age=600`. Por eso el Service Worker precarga con `cache: 'reload'`. No lo quites, o tras un despliegue se pueden mezclar archivos viejos y nuevos.
- Para probar en el móvil hay que desplegar (push a `main` → workflow en verde) y abrir y cerrar la app una vez para que cargue la versión nueva. El usuario hace los commits; dale los comandos.
