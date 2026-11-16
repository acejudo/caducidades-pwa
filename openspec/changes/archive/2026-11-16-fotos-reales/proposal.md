# Proposal

## Why

Hoy solo se pueden usar las fotos predeterminadas: "Hacer foto" sale desactivado con "Próximamente" y el modelo admite `foto.tipo: "real"`, pero ninguna pantalla la muestra. `docs/SPEC.md` (§3 y §4.3) pide poder hacer una foto o elegirla de la galería y guardarla en `Caducidades/fotos/` para que llegue a los otros dispositivos. Ahora es posible: la sincronización con Drive ya funciona (`sincronizacion-drive`), y con el permiso `drive` la otra cuenta ve las fotos de la carpeta compartida sin Picker.

## What Changes

- **Elegir foto:** "Hacer foto" se activa y abre la cámara. Un botón nuevo, "Elegir de la galería", abre las fotos del dispositivo. La foto elegida se reduce y se comprime (WebP, o JPEG si el navegador no sabe generar WebP) antes de usarla. Si no se puede leer, se avisa con "No se pudo usar esta foto" y se sigue en Elegir foto.
- **Formulario:** la zona de foto muestra la foto real elegida. Al pulsar "Guardar", la foto se guarda en el dispositivo junto con el producto; "Cancelar" la descarta.
- **Listado y Detalle:** muestran la foto real si está en el dispositivo. Si todavía no ha llegado de Drive, muestran el icono genérico, como hasta ahora.
- **Almacenamiento local:** la base de datos pasa a la versión 2 con un almacén nuevo para las fotos, guardadas como imagen (Blob) y no como texto. Los productos que ya existen se conservan.
- **Sincronización:** después de sincronizar la lista, la app sube a `Caducidades/fotos/` las fotos que aún no están en Drive y descarga las que le faltan. La subcarpeta `fotos/` se crea, si no existe, en la carpeta que contiene el `caducidades.json` que se está usando, sea propio o compartido. Si una foto no se ha podido subir, siguen marcados los "Cambios pendientes".
- **Limpieza:** se borran, en el dispositivo y en Drive, las fotos que ya no usa ningún producto, incluidos los eliminados que aún no se han purgado. Solo se borran pasado un margen de un día, para no borrar una foto recién hecha que otro dispositivo aún no ha anotado en la lista. En Drive solo se pueden borrar las fotos que subió la propia cuenta; de las demás se encarga la cuenta que las subió.
- **Nombre de las fotos:** cada foto real recibe un nombre aleatorio nuevo (`<uuid>.webp` o `.jpg`), en vez de `{id-del-producto}.jpg` como dice SPEC §4.3. Así, cambiar la foto de un producto crea un archivo distinto que el otro dispositivo detecta como nuevo, y la foto del alta se puede guardar antes de que exista el `id` del producto. Hay que actualizar SPEC §4.3.
- **Seguridad:** el modelo solo acepta como `foto.valor` real un nombre con ese formato. Así un `caducidades.json` manipulado no puede apuntar a otras rutas ni archivos, y las fotos que vienen de Drive solo se aceptan si son imágenes WebP o JPEG de 5 MB como máximo.

## Capabilities

### New Capabilities
<!-- Ninguna: se amplían las capacidades existentes. -->

### Modified Capabilities
- `product-photos`: "Foto de un producto" muestra también las fotos reales. "Hacer foto preparado" se sustituye por los requisitos nuevos para hacer la foto o elegirla de la galería y para comprimirla.
- `product-form`: la "Zona de foto" muestra la foto real, y "Guardar" guarda la foto en el dispositivo.
- `product-model`: "Validación de un producto" exige el formato del nombre de las fotos reales.
- `product-storage`: requisitos nuevos para guardar las fotos reales en el dispositivo y para migrar los datos a la versión 2 sin perderlos.
- `drive-sync`: requisitos nuevos para subir y descargar las fotos de `Caducidades/fotos/` y limpiar las que ya no se usan.

## Impact

- **Código:**
  - `src/js/storage.js`: versión 2 de la base de datos y API de fotos (guardar, leer, listar y borrar).
  - `src/js/productos.js`: validación del nombre de las fotos reales.
  - `src/js/fotos.js`: `fotoDeProducto` distingue las fotos reales.
  - `src/js/sincronizacion.js`: plan puro de qué fotos subir, descargar o borrar.
  - `src/js/drive.js`: subcarpeta de fotos y subida, listado, descarga y borrado de archivos binarios.
  - `src/js/sincronizador.js`: fase de fotos después de la de la lista.
  - Pantallas `elegir-foto.js`, `formulario.js`, `listado.js` y `detalle.js`.
  - Módulo nuevo `src/js/fotos-reales.js` (compresión y pintado de la foto en el navegador), que va también en `SHELL_FILES` de `src/sw.js`, con una versión nueva de la caché.
- **Documentación:** `docs/SPEC.md` §4.3 (nombre del archivo) y `README.md` si hace falta.
- **Drive:** la segunda cuenta necesita permiso de edición en la carpeta compartida para crear `fotos/` y subir fotos. Ya lo tiene para escribir en `caducidades.json`.
- **Dependencias:** ninguna nueva.
