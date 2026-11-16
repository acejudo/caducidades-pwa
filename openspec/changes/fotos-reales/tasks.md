# Tasks

## 1. Nombre de las fotos reales (`productos.js`, Node)

- [x] 1.1 Rojo: en `tests/productos.test.js`, pruebas "Nombre de foto real válido" y "Nombre de foto real no válido" (`../caducidades.json`, `foto.png`, `ABC.webp`, UUID sin extensión) y de `esNombreFotoReal`. Comprobar que `npm test` falla en ellas.
- [x] 1.2 Verde: `esNombreFotoReal` y la regla en `validarProducto` solo para `tipo: "real"` (design §1). Verificar con `npm test` en verde y comprobar que siguen pasando las pruebas de `leerArchivo` en `tests/sincronizacion.test.js`.

## 2. Foto de un producto (`fotos.js`, Node)

- [x] 2.1 Rojo: en `tests/fotos.test.js`, `fotoDeProducto` devuelve `{ tipo: 'real', nombre }` para una foto real con nombre válido y `null` con un nombre no válido; las predeterminadas siguen igual. Verificar que fallan.
- [x] 2.2 Verde: ampliar `fotoDeProducto` sin tocar el DOM. Verificar con `npm test` en verde.

## 3. Almacenamiento v2 (`storage.js`, navegador)

- [x] 3.1 Rojo: en `tests/navegador/storage.test.js`, escenarios "Dispositivo con datos de la versión 1" (crear a mano una base `caducidades-pruebas` v1 con "Leche" y "Pan" eliminado), "Guardar y leer una foto" (mismo tipo y tamaño tras reabrir con `usarBaseDeDatos`), "Foto que no existe", "Marcar como subida", y comprobar que `listarFotos` no devuelve blobs y que `guardarFoto` no emite `cambiosLocales`. Verificar que fallan con `npm run test:navegador`.
- [x] 3.2 Verde: `VERSION = 2`, `case 1` en `migrar`, `enTransaccion` con nombre de almacén y la API de fotos (design §3). Verificar con `npm run test:navegador` en verde, incluidas las pruebas anteriores de `storage`.

## 4. Compresión y pintado (`fotos-reales.js`, navegador)

- [x] 4.1 Rojo: crear `tests/navegador/fotos-reales.test.js` y enlazarlo en `tests/navegador/index.html`. Escenarios "Foto grande" (4000×3000 → 1024×768), "Foto pequeña" (600×400 sin ampliar) y "Archivo que no es una imagen" (`ErrorFoto`), con imágenes generadas con `<canvas>`. Comprobar además que el tipo es WebP o JPEG y que el nombre es `<uuid>.<ext>` y pasa `esNombreFotoReal`. Para `pintarFoto`: icono genérico sin foto, imagen `blob:` con una foto real guardada, icono genérico si `obtenerFoto` devuelve `null` o falla (sin errores en la consola). Verificar que fallan.
- [x] 4.2 Verde: `comprimirFoto` (con alternativa a JPEG) y `pintarFoto` (con URL revocada en `load` o `error`) (design §2). Añadir `./js/fotos-reales.js` a `SHELL_FILES` y subir `CACHE_VERSION` a `v3`. Verificar con `npm test` (incluye `tests/sw.test.js`) y `npm run test:navegador` en verde.

## 5. Elegir foto (`elegir-foto.js`, navegador)

- [x] 5.1 Rojo: en `tests/navegador/elegir-foto.test.js`, con la compresión como doble y el archivo simulado con `DataTransfer`. Escenarios "Botones disponibles", "Foto de la galería en Nuevo producto" (el borrador recibe `foto` real e `imagen`, y se vuelve una vez), "Cancelar la cámara" (`change` sin archivos), "Archivo que no es una imagen" (mensaje y sin volver), "Doble elección" ("Preparando foto…" e ignorar el toque en "Queso"). Comprobar que el botón de cámara tiene `capture` y el de galería no, y que con una foto real actual no se marca ninguna casilla. Verificar que fallan.
- [x] 5.2 Verde: botones e inputs ocultos, estado de preparación y error (design §4 y §7), y estilos en `src/css/styles.css`. Quitar `.fotos__proximamente`. Verificar con `npm run test:navegador` en verde y que no queda texto suelto.

## 6. Formulario con foto real (`formulario.js`, navegador)

- [x] 6.1 Rojo: en `tests/navegador/formulario.test.js`, con un almacén doble con `guardarFoto` y `obtenerFoto`. Escenarios "Edición con foto real" ("Tu foto"), "Alta con foto real" (orden: `guardarFoto` y después `crearProducto` con `foto.tipo: "real"`), "Cancelar con foto real" (no se llama a `guardarFoto` ni se cambia el producto), "Fallo al guardar la foto" (no se guarda el producto, mensaje, y se conservan lo escrito y la foto) y "Cancelar tras cambiar la foto" con una foto real. Verificar que fallan.
- [x] 6.2 Verde: `imagenActual`, zona de foto con `pintarFoto` y el guardado en dos pasos (design §4). Verificar con `npm run test:navegador` en verde.

## 7. Listado y Detalle con foto real (navegador)

- [x] 7.1 Rojo: en `tests/navegador/listado.test.js` y `tests/navegador/detalle.test.js`, escenarios "Foto real en el dispositivo" (`<img>` con `src` `blob:`) y "Foto real todavía no disponible" (icono genérico, sin errores), con un almacén doble con `obtenerFoto`. Verificar que fallan.
- [x] 7.2 Verde: usar `pintarFoto` en `listado.js` y `detalle.js`, con `object-fit: cover` en los huecos de foto. Verificar con `npm run test:navegador` en verde.
- [x] 7.3 Comprobar visualmente con `node scripts/captura-app.mjs --ruta listado` (productos de prueba con foto predeterminada y sin foto) que el listado no ha cambiado, guardando la captura en el scratchpad.

## 8. Plan de fotos (`sincronizacion.js`, Node)

- [x] 8.1 Rojo: en `tests/sincronizacion.test.js`, pruebas de `planificarFotos`. Subir una foto local no subida de un producto activo; no subir la de un producto eliminado; marcar sin subir la que ya está en remoto. Descargar la que falta en local; no descargar la de un eliminado. "Foto cambiada" (borrar la antigua con más de un día en local y en remoto). "Foto recién hecha en otro dispositivo" (menos de un día, no se borra). "Producto eliminado" (se conserva su foto). No borrar remotas ajenas (`ownedByMe: false`). Verificar que fallan.
- [x] 8.2 Verde: implementar `planificarFotos` (design §6). Verificar con `npm test` en verde.

## 9. Cliente de Drive para fotos (`drive.js`, Node)

- [x] 9.1 Rojo: en `tests/drive.test.js`, con `fetch` falso. `buscarListas` pide `parents`; `carpetaDeLista(archivoId)`; `buscarCarpetaFotos` y `crearCarpetaFotos` con la consulta correcta (padre, nombre, tipo carpeta y `trashed = false`); `listarFotos` recorre dos páginas; `subirFoto` manda un *multipart* con los metadatos (`name`, `parents`) y los bytes del blob; `descargarFoto` acepta WebP o JPEG y lanza `ErrorFotoNoValida` con otro tipo o más de 5 MB; `papeleraFoto` hace `PATCH { trashed: true }`; 401 → `ErrorToken`. Verificar que fallan.
- [x] 9.2 Verde: métodos nuevos y `FOTO_MAX_BYTES` en `constantes.js` (design §5). Verificar con `npm test` en verde.

## 10. Fase de fotos del sincronizador (`sincronizador.js`, navegador)

- [x] 10.1 Rojo: en `tests/navegador/sincronizador.test.js`, con dobles de Drive y de almacén. Escenarios "Primera foto en una lista compartida" (crea `fotos` en la carpeta de la lista y sube), "Sin fotos reales" (no crea la carpeta), "Alta con foto real" (queda "Sincronizado" y la foto marcada como subida), "Sin conexión" (pendiente y sube al volver), "Falla la subida" (error de conexión y sigue pendiente), "Foto hecha en otro dispositivo" (se guarda como subida), "Foto aún no subida" y "Archivo no válido" (la sincronización termina bien), "Foto de otra cuenta" (rechazo ignorado), y obtención de `carpetaId` cuando el dispositivo solo recordaba `archivoId`. Verificar que fallan.
- [x] 10.2 Verde: `sincronizarFotos` y `carpetaId` en las preferencias, con `pendiente` según las fotos por subir (design §6). Ampliar el almacén por defecto. Verificar con `npm run test:navegador` en verde, incluidas las pruebas anteriores del sincronizador.

## 11. Documentación

- [x] 11.1 Actualizar `docs/SPEC.md` §4.3 (nombre `<uuid>.webp|jpg`, WebP o JPEG, 1024 px) y la línea de capas de sincronización de `CLAUDE.md` (fase de fotos y `fotos-reales.js`). Verificar releyendo que coinciden con design §1, §2 y §6.

## 12. Verificación final

- [x] 12.1 Ejecutar `npm test` y `npm run test:navegador` y verificar que todo está en verde.
- [x] 12.2 Recorrido con `node scripts/captura-app.mjs` por Elegir foto (sin "Próximamente", tres botones) y por el formulario y el detalle de un producto con foto predeterminada, sin errores en la consola. Capturas en el scratchpad.
- [ ] 12.3 Manual en el móvil (tras desplegar): hacer una foto con la cámara y otra de la galería, guardar, cerrar la app y volver a abrirla en modo avión. Las fotos se ven en el listado y el detalle.
- [ ] 12.4 Manual: tras sincronizar, la foto aparece en `Caducidades/fotos/` del Drive y pesa unos cientos de KB como mucho.
- [ ] 12.5 Manual, con la pareja: la foto hecha en un móvil se ve en el otro tras sincronizar; al cambiarla, llega la nueva; en iOS funcionan "Hacer foto" y "Elegir de la galería".

## Workflow follow-up

- Archivar el cambio con `/opsx:archive` cuando el usuario lo haya revisado y probado.
- Actualizar la tabla de estado de `CLAUDE.local.md`.
