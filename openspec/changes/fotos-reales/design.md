# Design

## Context

Ver proposal.md (Why). Estado actual relevante:

- `productos.js` ya admite `foto.tipo: "real"` con cualquier `valor` no vacío. `fotos.js` (`fotoDeProducto`) devuelve `null` para las reales, así que las pantallas pintan el icono genérico.
- `elegir-foto.js` escribe la foto elegida en el borrador del formulario (`borradores.js`, clave `'nuevo'` o `editar:<id>`) y vuelve. "Hacer foto" está desactivado.
- `storage.js` está en la versión 1, con un único almacén, `productos`. `migrar()` ya está preparado para añadir versiones con `case` encadenados.
- `drive.js` habla con Drive v3 con `fetch` inyectable. Hoy no pide `parents`, así que no sabe en qué carpeta está la lista. `crearLista` busca o crea `Caducidades` en la raíz.
- `sincronizador.js` sincroniza solo `caducidades.json`. Las fotos van detrás, en la misma ejecución, y usan su `drive` y su control de errores.
- Restricciones: sin dependencias ni *build*. Lo puro, en Node; lo que necesita el navegador, en `tests/navegador/`. Los módulos de pantalla no importan `ui.js`, `auth.js` ni `config.js`.

## Goals / Non-Goals

**Goals:**
- Hacer o elegir una foto, comprimirla y verla en todas las pantallas, también sin conexión.
- Que las fotos lleguen a los otros dispositivos y cuentas sin pasos manuales.
- No acumular fotos huérfanas, ni en el dispositivo ni en Drive.

**Non-Goals:**
- Recortar, girar o editar la foto. Se respeta la orientación EXIF, que aplica el propio navegador al decodificar.
- Varias fotos por producto.
- Descargar las fotos bajo demanda al abrir el Detalle: solo se descargan al sincronizar.
- Indicar en la interfaz el progreso de la subida de cada foto: basta con el estado general ("Cambios pendientes").

## Decisions

### 1. Nombre de la foto: UUID aleatorio, no el id del producto

`valor` es `<crypto.randomUUID()>.<webp|jpg>` y se genera al comprimir la foto.

- **Por qué:** con `{id}.jpg` (SPEC §4.3), cambiar la foto dejaría el mismo nombre, y el otro dispositivo, que ya tiene una imagen con ese nombre, no sabría que tiene que volver a descargarla. Además, en el alta todavía no existe el `id`: lo genera `nuevoProducto` al guardar. Con un nombre nuevo en cada foto, "¿la tengo?" se responde solo con el nombre, sin fechas ni versiones.
- **Alternativa descartada:** `{id}.jpg` más una marca de versión en el producto. Es más estado que mantener y no resuelve el alta.
- Se actualiza SPEC §4.3.
- **Validación (`productos.js`):** `NOMBRE_FOTO_REAL = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpg)$/`, con una función exportada `esNombreFotoReal(valor)`. Solo se exige con `tipo: "real"`. `leerArchivo` ya descarta los productos que no validan, así que un `caducidades.json` manipulado no puede inyectar rutas.

### 2. Compresión en el navegador (`src/js/fotos-reales.js`)

`comprimirFoto(archivo, { ladoMaximo = 1024 } = {})` → `{ nombre, blob, ancho, alto }`.

- Decodifica con `createImageBitmap(archivo, { imageOrientation: 'from-image' })`. Si ese método no existe o falla, prueba con `<img>` y `URL.createObjectURL`. Si los dos fallan, lanza `ErrorFoto`.
- Dibuja en un `<canvas>` escalado para que el lado mayor no pase de `ladoMaximo`, sin ampliar.
- `canvas.toBlob(…, 'image/webp', 0.8)`. Si el blob devuelto no es `image/webp` (Safari puede devolver PNG), repite con `'image/jpeg', 0.85`. La extensión del nombre sale del tipo final.
- **Alternativa descartada:** guardar el original. Una foto de móvil ocupa de 3 a 8 MB, y eso pesa en IndexedDB, en Drive y en la descarga del otro móvil. A 1024 px queda en unos 100–200 KB.

El mismo módulo exporta `pintarFoto(contenedor, producto, { obtenerFoto, ancho, alto })`. Pone el icono genérico y, si el producto tiene una foto real, la lee de forma asíncrona y la sustituye por un `<img>` con `URL.createObjectURL(blob)`, que se revoca en `load` o en `error` para no dejar URLs vivas. Las predeterminadas se siguen pintando como hasta ahora, con `fotoDeProducto`. `fotoDeProducto` pasa a devolver `{ tipo: 'real', nombre }` para las reales con nombre válido. Así las pantallas distinguen las tres situaciones sin tocar el DOM desde `fotos.js`, que sigue siendo puro.

### 3. Almacenamiento: versión 2 con el almacén `fotos`

- `VERSION = 2`. En `migrar()`, `case 1: bd.createObjectStore('fotos', { keyPath: 'nombre' })`, que se aplica también al crear la base de datos desde cero (0 → 1 → 2).
- El registro es `{ nombre, blob, subida: boolean, creada: ISO }`.
- `enTransaccion` pasa a recibir el nombre del almacén (por defecto `productos`).
- API nueva:
  - `guardarFoto(nombre, blob, { subida = false } = {})`.
  - `obtenerFoto(nombre)` → `Blob | null`.
  - `listarFotos()` → `[{ nombre, subida, creada }]`, sin los blobs (con un cursor, para no cargar imágenes).
  - `marcarFotoSubida(nombre)`.
  - `borrarFoto(nombre)`.
- Guardar una foto **no** emite `cambiosLocales`: ya lo emite el alta o la edición del producto que la usa.
- **Alternativa descartada:** guardar la foto como *data URL* dentro del producto. Inflaría `caducidades.json` y cada `getAll` del listado.

### 4. Formulario y borrador

- El borrador pasa a ser `{ valores?, foto?, imagen? }`. `imagen` es el `Blob` de una foto real elegida y aún no guardada, y solo vive en memoria, como el resto del borrador.
- Elegir foto: los dos botones abren un `<input type="file" accept="image/*">` oculto, con `capture="environment"` para "Hacer foto" y sin `capture` para la galería. En `change`, si no hay archivo (se canceló), no hace nada. Si hay archivo, pone "Preparando foto…" y bloquea la pantalla (reutiliza `volviendo`), comprime, guarda `{ ...borrador, foto: { tipo: 'real', valor: nombre }, imagen: blob }` y vuelve. Si la compresión falla, desbloquea y muestra "No se pudo usar esta foto".
- La compresión se inyecta (`comprimir = comprimirFoto`) para probar la pantalla sin imágenes reales.
- Formulario: `imagenActual` acompaña a `fotoActual`. La zona de foto pinta la `imagen` del borrador, o la foto guardada leída con `obtenerFoto` en la edición, con el texto "Tu foto".
- Al guardar, si `imagenActual` existe, llama primero a `almacen.guardarFoto(nombre, imagen)` y después a `crearProducto` o `actualizarProducto`. Si `guardarFoto` falla, no se guarda el producto (escenario "Fallo al guardar la foto").
- Si falla el producto después de guardar la foto, esta queda huérfana y la borra la limpieza (§6).
- **Alternativa descartada:** una transacción con los dos almacenes. Habría que cambiar las firmas de `crearProducto` y `actualizarProducto`, y la limpieza ya cubre el caso raro.
- El valor anterior de `foto` de un producto editado no se borra al guardar: lo recoge la limpieza.

### 5. Drive (`drive.js`)

- `buscarListas` pide también `parents`. El sincronizador recuerda `carpetaId` (la carpeta de la lista) junto a `archivoId`. Si falta, por ejemplo en un dispositivo que ya sincronizaba antes de este cambio, la pide con `files.get(archivoId, fields=parents)`.
- Métodos nuevos:
  - `buscarCarpetaFotos(carpetaId)` → `id | null`: busca una carpeta `fotos` hija, no en la papelera, la más antigua.
  - `crearCarpetaFotos(carpetaId)` → `id`.
  - `listarFotos(carpetaFotosId)` → `[{ id, name, createdTime, ownedByMe }]`, con paginación (`pageSize=1000` y `nextPageToken`).
  - `subirFoto(carpetaFotosId, nombre, blob)` → `id`: subida *multipart* con el cuerpo como `Blob([cabecera, blob, cierre])`.
  - `descargarFoto(id)` → `Blob`: comprueba `Content-Type` y tamaño (cabecera `Content-Length` y `blob.size`) y lanza `ErrorFotoNoValida` si no es WebP o JPEG o pasa de 5 MB.
  - `papeleraFoto(id)`: `PATCH { trashed: true }`. Se usa la papelera y no `DELETE`, para poder recuperar un borrado por error.
- La constante `DRIVE_CARPETA_FOTOS` ya existe en `constantes.js`. Se añade `FOTO_MAX_BYTES = 5 * 1024 * 1024`.

### 6. Sincronización de fotos

**Plan puro (`sincronizacion.js`):** `planificarFotos({ productos, locales, remotas, ahora })`, donde `productos` es el resultado fusionado, `locales` sale de `listarFotos()` del almacén y `remotas` de `listarFotos()` de Drive. Devuelve:

- `subir`: nombres usados por productos no eliminados, guardados en local, que no están en remoto. También los marcados `subida: false` que ya están en remoto, que solo hay que marcar.
- `descargar`: nombres usados por productos no eliminados que no están en local y sí en remoto.
- `borrarLocales`: nombres sin ningún producto que los use (también entre los eliminados) y `creada` de hace más de un día.
- `borrarRemotas`: ids sin uso, con `createdTime` de hace más de un día y `ownedByMe`. Las ajenas ni se intentan; si Drive rechaza alguna, se ignora.

**Orquestación (`sincronizador.js`):** `sincronizarFotos(drive, carpetaId)` después de `sincronizarArchivo`, en la misma ejecución:

1. Si ningún producto tiene foto real, no hay fotos locales y no existe la carpeta `fotos`, no hace nada: no se crea la carpeta (escenario "Sin fotos reales").
2. Busca la carpeta de fotos y lista las remotas, o `[]` si no existe.
3. Sube las pendientes, creando antes la carpeta si hace falta, y marca cada una como subida al terminar. Un error de red, de token o de Drive al subir corta la fase y se trata como los errores de la lista (mensaje y estado de error).
4. Descarga las que faltan, una a una. `ErrorFotoNoValida`, `ErrorNoDisponible` y los errores de red de una foto concreta se registran en la consola y se saltan: no deben impedir que la lista sincronice ni bloquear las demás fotos.
5. Limpieza: borra en local y manda a la papelera en remoto, ignorando los errores de cada foto.

`pendiente` al terminar pasa a ser `cambioDurante || quedanFotosPorSubir`. Las descargas pendientes no cuentan como cambios pendientes del dispositivo.

El almacén inyectado en el sincronizador crece con `listarFotos`, `guardarFoto`, `obtenerFoto`, `marcarFotoSubida` y `borrarFoto`.

### 7. Interfaz

- **Elegir foto:** "Hacer foto" (primario, icono cámara), "Elegir de la galería" (secundario, icono imagen) y "Sin foto" (secundario). Se quita `.fotos__proximamente`. "Preparando foto…" y "No se pudo usar esta foto" van en un `<p role="status">` (o `role="alert"` para el error). Si la foto actual del formulario es real, no se marca ninguna casilla de la cuadrícula.
- **Formulario, Listado y Detalle:** usan `pintarFoto`. Las fotos reales se recortan con `object-fit: cover` en los mismos huecos que las predeterminadas (48 px en la tarjeta, 160 px en el Detalle y 96 px en el formulario), con `alt=""` porque el nombre del producto va al lado.
- Los textos se ponen con `textContent` y `el()`; las imágenes solo con `src` de `blob:`.

### 8. Service Worker

`./js/fotos-reales.js` se añade a `SHELL_FILES` y `CACHE_VERSION` pasa a `v3`. Las fotos reales no pasan por el SW: viven en IndexedDB.

### 9. Estrategia de pruebas (TDD)

| Qué | Dónde |
|---|---|
| `esNombreFotoReal` y la validación del producto con foto real | Node: `tests/productos.test.js` |
| `fotoDeProducto` con fotos reales | Node: `tests/fotos.test.js` |
| `planificarFotos` (subir, descargar, borrar locales y remotas, márgenes de un día, eliminados) | Node: `tests/sincronizacion.test.js` |
| `drive.js`: carpeta de fotos, listado paginado, subida *multipart* binaria, descarga con validación de tipo y tamaño, papelera | Node con `fetch` falso: `tests/drive.test.js` |
| `storage.js` v2: migración desde una base v1 creada a mano, API de fotos | Navegador: `tests/navegador/storage.test.js` (base `caducidades-pruebas`) |
| `comprimirFoto`: tamaño final, sin ampliar, tipo WebP o JPEG, archivo no válido. Las imágenes de prueba se generan con un `<canvas>` | Navegador: `tests/navegador/fotos-reales.test.js` (nuevo) |
| Elegir foto: botones, cancelar, doble elección, error. El archivo se simula asignando `input.files` con un `DataTransfer`, y la compresión es un doble | Navegador: `tests/navegador/elegir-foto.test.js` |
| Formulario, Listado y Detalle con foto real (almacén doble) | Navegador: sus archivos de prueba |
| Fase de fotos del sincronizador (doble de Drive y de almacén) | Navegador: `tests/navegador/sincronizador.test.js` |
| SW con el módulo nuevo | Node: `tests/sw.test.js` (ya comprueba que `SHELL_FILES` existe) |
| Cámara real, galería real en Android e iOS, foto vista en el otro móvil, borrado en Drive por la otra cuenta | **Manual** en el móvil |

## Risks / Trade-offs

- [`canvas.toBlob` en WebP no existe en algunos Safari] → Se comprueba el tipo devuelto y se usa JPEG en su lugar.
- [Memoria en móviles al decodificar fotos de 12–50 MP] → `createImageBitmap` con `resizeWidth`/`resizeHeight` cuando el navegador lo admite. Si falla, se muestra el error en lugar de colgar la app. Se prueba a mano en el móvil.
- [La segunda cuenta no puede crear `fotos/` si solo tiene permiso de lectura] → El error de Drive se muestra como cualquier otro. Ya hace falta permiso de edición para escribir en `caducidades.json`.
- [Fotos huérfanas en Drive de una cuenta que deja de usar la app] → Solo se pueden mandar a la papelera las propias. Queda como limitación aceptada: son pocos KB.
- [Una carrera entre guardar la foto y guardar el producto deja una foto huérfana] → La limpieza local la borra pasado un día. Se ha elegido no hacer una transacción doble (§4).
- [Espacio en IndexedDB] → A 1024 px, unas 200 fotos ocupan del orden de 30 MB, muy por debajo de la cuota habitual. Ya se pide `navigator.storage.persist()`.
- [Una sincronización más lenta con muchas descargas la primera vez] → Las descargas son secuenciales. Es aceptable para una lista doméstica.

## Migration Plan

1. Al desplegar, el SW nuevo (`v3`) precarga el shell con `fotos-reales.js`. La primera apertura con la versión nueva migra IndexedDB de la v1 a la v2, conservando los productos.
2. Los dispositivos que ya sincronizaban no tienen `carpetaId`: lo piden la primera vez a partir del archivo recordado.
3. Vuelta atrás: el código antiguo abre la base con la versión 1 y fallaría con `VersionError` sobre una base v2. No se plantea volver atrás; si hiciera falta, la versión antigua tendría que abrir sin número de versión. Se acepta: la base local se puede reconstruir sincronizando con Drive.
