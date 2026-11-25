# Proposal

## Why

La lista de Drive la pueden escribir varios dispositivos y la app la lee en cada sincronización. Hoy acepta datos que la propia app nunca genera: identificadores que no son UUID, fechas de modificación en formatos que dependen de la zona horaria del dispositivo, fotos predeterminadas que no existen en el catálogo y cantidades sin límite. Conviene que solo entre en el dispositivo lo que cumple exactamente el formato que la app escribe, para que todos los dispositivos interpreten la lista igual.

## What Changes

**Productos que llegan de Drive:**
- El `id` tiene que ser un UUID en minúsculas, como los que genera la app. Si no, el producto se ignora, como cualquier otro producto no válido.
- `actualizado` tiene que ser una fecha y hora ISO 8601 completa con zona (`Z` o `±hh:mm`). Un producto con otro formato, por ejemplo sin zona, se ignora.
- Una foto predeterminada que no existe en el catálogo no descarta el producto: se queda **sin foto** y la versión corregida se sube a Drive.

**Cantidad máxima (modelo y formulario):**
- La cantidad tiene un máximo de 9999 y sigue admitiendo decimales.
- El formulario muestra el error junto al campo al superarlo, y el botón + se desactiva al llegar a 9999.
- Los productos del archivo con más cantidad se ignoran.

**Detección de cambios:**
- Al comparar la lista local, la remota y la fusionada, dos listas distintas nunca se dan por iguales, contengan los textos que contengan.

**Listado de fotos de Drive:**
- El listado de la carpeta de fotos se corta en 2000 archivos (como `PRODUCTOS_MAX`).
- Las fotos que queden fuera se tratan en esa sincronización como si no estuvieran en Drive.
- No hay tope de fotos descargadas por sincronización.

## Capabilities

### New Capabilities

### Modified Capabilities
- `product-model`: "Validación de un producto" añade el máximo de 9999 a la cantidad.
- `product-form`: "Botones de cantidad" desactiva el + en el máximo.
- `drive-sync`:
  - "Contenido no válido en Drive" exige `id` UUID y `actualizado` ISO 8601 con zona.
  - Requisito nuevo "Foto predeterminada desconocida en el archivo".
  - Requisito nuevo "Detección de cambios en la lista".
  - Requisito nuevo "Tope del listado de fotos".

## Impact

**Código:**
- `src/js/constantes.js`: `CANTIDAD_MAX` y el tope del listado de fotos.
- `src/js/productos.js`: el máximo de cantidad en `validarProducto` y el formato de `id`.
- `src/js/sincronizacion.js`: comprobaciones de `id`, `actualizado` y foto predeterminada en la lectura, y la huella de la lista.
- `src/js/drive.js`: `listarFotos` con tope.
- `src/js/formulario.js`: botón + desactivado en el máximo.

**Pruebas:**
- En Node: `tests/productos.test.js`, `tests/sincronizacion.test.js` y `tests/drive.test.js`.
- En el navegador: la prueba del formulario en `tests/navegador/`.

**Sin cambios en dependencias, CSP ni `SHELL_FILES`:** no hay archivos nuevos en `src/`. Los archivos que escribe la app ya cumplen todas estas reglas, así que las listas existentes se siguen leyendo igual.
