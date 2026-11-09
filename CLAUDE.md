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

> Nota: la infraestructura de pruebas (`package.json`, `tests/` y `scripts/probar-navegador.mjs`) la introduce el cambio `modelo-y-almacenamiento`. Hasta que se aplique, esos comandos no existen.
