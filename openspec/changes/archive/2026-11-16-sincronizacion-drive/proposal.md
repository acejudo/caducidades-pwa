# Proposal

## Why

Hoy los productos solo viven en el dispositivo donde se crean. La SPEC (§1 y §7) plantea una lista común para varias personas autorizadas y sus dispositivos, sincronizada a través de Google Drive. Este cambio hace esa sincronización y añade lo que se necesita para usarla de verdad en el móvil:
- **Estado visible:** se ve si hay cambios pendientes, si se está sincronizando o si hubo un error.
- **Funcionamiento sin conexión:** se puede trabajar en local y sincronizar más tarde.
- **El límite del token de Google:** dura una hora y no se conserva al cerrar la app.

## What Changes

- **Permiso de Drive ampliado (BREAKING):** el *scope* pasa de `drive.file` a `https://www.googleapis.com/auth/drive`. Así otra cuenta autorizada puede usar la carpeta `Caducidades` que se le haya compartido desde Drive. Quien ya tenga sesión tendrá que aceptar el permiso nuevo una vez. Hay que añadir el *scope* en Google Cloud (tarea manual).
- **Lista en Drive:**
  - La app localiza `caducidades.json` en "Mi unidad" o en "Compartido conmigo" y recuerda cuál es.
  - Si no hay ninguno, pregunta antes de crear la carpeta `Caducidades` y el archivo, para no crear una segunda lista por error.
  - El formato del archivo es el de SPEC §4.2.
- **Sincronización bidireccional:** descarga el archivo y fusiona producto a producto con *last-write-wins* según `actualizado`, propagando las bajas (`eliminado`). Después guarda el resultado en local y lo sube si hay algo nuevo.
  - Comprueba antes de subir que nadie ha cambiado el archivo mientras tanto y, si alguien lo ha cambiado, repite la fusión.
  - Ignora los productos no válidos del archivo sin romper la sincronización.
  - Purga las marcas de borrado de más de 90 días.
- **Cuándo se sincroniza:**
  - **De forma automática, solo con un token vigente:** tras el login, al abrir o recargar la app, unos segundos después de cada alta, edición o baja, y al volver la conexión.
  - **Sin token vigente:** los cambios quedan como pendientes y hace falta un toque del usuario ("Toca para sincronizar"), porque renovar el token abre una ventana de Google.
- **Indicador de estado:** un icono en la cabecera del Listado muestra si está sin conexión, con cambios pendientes, sincronizando, sincronizado o con error. Al tocarlo, sincroniza.
- **Ajustes:** nueva sección "Sincronización" con el estado, la hora de la última sincronización y el botón "Sincronizar ahora".
- **Datos recibidos de Drive:** se guardan en local con su `actualizado` original, sin renovarlo.
- **Documentación:** se actualizan el README (*scope* en Google Cloud y cómo compartir la carpeta con otra cuenta) y la SPEC §6.1.
- **Fuera de este cambio:** las fotos reales y la subcarpeta `fotos/` van al cambio `fotos-reales`. Aquí el campo `foto` solo viaja como dato.

## Capabilities

### New Capabilities
- `drive-sync`: sincronización de la lista de productos con `caducidades.json` en Google Drive. Cubre:
  - Localizar, crear y compartir el archivo.
  - Fusión *last-write-wins*, bajas y purga de las marcas de borrado.
  - Cuándo se sincroniza: con token vigente y sin token vigente.
  - Funcionamiento sin conexión con cambios pendientes.
  - Archivo no válido y escrituras simultáneas.
- `sync-status`: cómo ve y controla el usuario la sincronización. Cubre el icono de estado de la cabecera, "Toca para sincronizar" y la sección Sincronización de Ajustes con "Sincronizar ahora".

### Modified Capabilities
- `user-auth`: el inicio de sesión pide el *scope* completo de Drive. Requisito nuevo: las sesiones que solo tienen `drive.file` deben aceptar el permiso nuevo.
- `product-storage`: la marca de tiempo de cada escritura tiene una excepción. Los productos recibidos de Drive conservan su `actualizado`.

## Impact

- **Código nuevo:**
  - `src/js/sincronizacion.js`: fusión, purga y lectura y escritura del archivo. Es puro y se prueba en Node.
  - `src/js/drive.js`: llamadas a la API de Drive con `fetch`. Ahora es un marcador vacío.
  - `src/js/sincronizador.js`: orquesta cuándo se sincroniza, el estado y los cambios pendientes.
  - Icono de estado y sección de Ajustes en `ui.js`.
- **Código modificado:**
  - `config.js` (`DRIVE_SCOPE`) y `auth.js` (ampliar el permiso).
  - `storage.js`: leer todos los productos, incluidos los eliminados; guardar los productos fusionados; avisar de los cambios locales.
  - `app.js` (arranque de la sincronización), `styles.css` y `sw.js` (`SHELL_FILES`).
- **Pruebas:**
  - `tests/sincronizacion.test.js` (Node).
  - En `tests/navegador/`: `drive.test.js` y `sincronizador.test.js`, con un `fetch` falso, y ampliar `storage.test.js`.
- **Google Cloud (manual):** añadir el *scope* `.../auth/drive` en la pantalla de consentimiento. La app sigue en estado Prueba, con los emails como usuarios de prueba. Google avisa de que la app no está verificada, igual que ahora.
- **Sin dependencias nuevas.** El modelo de producto no cambia.
