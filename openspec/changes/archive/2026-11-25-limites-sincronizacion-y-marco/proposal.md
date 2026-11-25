# Proposal

## Why

Los topes de la lista (2000 productos y 5 MB) solo se aplican al leer el archivo de Drive. Si lo local y lo remoto se juntan, la lista fusionada puede superarlos. Hoy esa lista se guarda y se sube, y a partir de ahí ningún dispositivo puede volver a sincronizar hasta reparar el archivo a mano. También hace falta que los topes de las descargas valgan aunque Drive no diga cuánto ocupa la respuesta.

Además, la app está pensada para usarse en su propia ventana o instalada. Dentro de un marco de otra página no debe ponerse en marcha.

## What Changes

**Lista fusionada:**
- Antes de guardar en el dispositivo o subir a Drive, la sincronización comprueba que la lista fusionada no supere `PRODUCTOS_MAX` (2000, bajas incluidas) ni que el archivo resultante supere `ARCHIVO_MAX_BYTES` (5 MB).
- Si los supera, se detiene sin cambiar nada: ni el dispositivo ni Drive. Muestra un error claro y conserva los cambios pendientes.
- La misma comprobación vale al crear la lista.

**Archivo de Drive:**
- `caducidades.json` se escribe en JSON compacto, sin sangría.
- La lectura sigue aceptando los archivos ya escritos con sangría.

**Descargas:**
- La lista y las fotos se leen por partes y la descarga se corta en cuanto supera su tope (`ARCHIVO_MAX_BYTES` o `FOTO_MAX_BYTES`).
- Vale también cuando Drive no indica el tamaño o indica uno menor que el real.
- El resultado para el usuario no cambia: archivo no válido o foto ignorada.

**Marco de otra página:**
- Si la app se carga dentro de un marco (`iframe`), no arranca.
- No carga el router, Google Sign-In ni la sincronización, y solo muestra un enlace para abrirla en su propia ventana.

## Capabilities

### New Capabilities

### Modified Capabilities
- `drive-sync`:
  - "Tamaño máximo del archivo de Drive" también se aplica a la lista que la app va a guardar y subir, y se mide sobre lo descargado aunque Drive no indique el tamaño.
  - "Archivo de sincronización en Drive" pasa a escribirse sin sangría.
  - "Descarga de fotos" corta la descarga al pasar de 5 MB aunque no se indique el tamaño.
- `pwa-shell`: nuevo requisito "Solo en su propia ventana". La app no arranca dentro de un marco de otra página.

## Impact

**Código:**
- `src/js/sincronizacion.js`: comprobación de topes de la lista a subir y `crearArchivo` sin sangría.
- `src/js/sincronizador.js`: comprobación antes de guardar y subir, al sincronizar y al crear la lista, y el mensaje nuevo.
- `src/js/drive.js`: lectura por partes con tope en `leer` y `descargarFoto`.
- `src/js/app.js`: comprobación del marco antes de cargar nada más.

**Pruebas:**
- `tests/sincronizacion.test.js` y `tests/drive.test.js` (Node).
- `tests/navegador/sincronizador.test.js`.
- Una prueba de la página dentro de un marco.

**Sin cambios en dependencias, CSP ni `SHELL_FILES`:** no hay archivos nuevos en `src/`. El formato del archivo de Drive es compatible hacia atrás.
