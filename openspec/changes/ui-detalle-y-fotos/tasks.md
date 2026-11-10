# Tasks

Desarrollo con TDD (design.md §11). En cada bloque, primero van las pruebas en **rojo**, después el código mínimo hasta **verde** y por último la **refactorización** con las pruebas en verde. Cada prueba se llama como el escenario de la spec que cubre. Antes de dar un grupo por terminado: `npm test` y `npm run test:navegador` en verde. Cada archivo nuevo de `src/` se añade a `SHELL_FILES` en el mismo grupo que lo crea.

## 1. Catálogo de fotos (`fotos.js`)

- [x] 1.1 Rojo: crear `tests/fotos.test.js` con estas pruebas:
  - "Ids de la SPEC": los doce ids, sin repetidos, todos con formato `^[a-z]+$` y `generico` el último.
  - "Nombres en español": Salmón, Plátano y Genérico.
  - `buscarFoto`: conocido y desconocido.
  - `urlFoto`: termina en `/img/predeterminadas/<id>.svg`.
  - `fotoDeProducto`: "Foto predeterminada conocida", "Id desconocido", "Foto real todavía no disponible" y `ninguna`.
  - "Buscar sin acento" (`platano`), "Buscar parte del nombre" (`LE`), "Sin coincidencias" (`zzz` da una lista vacía) y texto vacío (todas).

  Verificar que `npm test` falla.
- [x] 1.2 Verde: crear `src/js/fotos.js` según design.md §1, con los 20 ids del catálogo, y añadirlo a `SHELL_FILES`. Verificar que `npm test` pasa y refactorizar con las pruebas en verde.
- [x] 1.3 Rojo: en `tests/fotos.test.js`, comprobar que cada id del catálogo tiene `src/img/predeterminadas/<id>.svg`, con `viewBox`, sin `<script>`, sin `href` externos y de menos de 4 KB. En `tests/sw.test.js`, comprobar que cada `./img/predeterminadas/<id>.svg` está en `SHELL_FILES`. Verificar que fallan.
- [x] 1.4 Verde: dibujar los 20 SVG de design.md §2 y añadirlos a `SHELL_FILES`. Verificar que `npm test` pasa. Generar en el scratchpad una hoja HTML con todas las ilustraciones en cuadrícula, capturarla y revisar que se reconocen y son coherentes entre sí. Enseñar la captura al usuario antes de seguir.

## 2. Borradores compartidos (`borradores.js`)

- [x] 2.1 Refactor con las pruebas en verde: crear `src/js/borradores.js` (design.md §3) y pasar `formulario.js` a usarlo, reexportando `descartarBorradores`. Añadirlo a `SHELL_FILES`. Verificar que las pruebas de navegador existentes del borrador siguen pasando sin cambios.

## 3. Foto en el formulario

- [x] 3.1 Rojo: en `tests/navegador/formulario.test.js`, añadir estas pruebas:
  - "Alta sin foto": cámara, "Toca para elegir foto" y enlace a `#/producto/nuevo/foto`.
  - "Edición con foto": imagen y "Yogur", con enlace a `#/producto/<id>/editar/foto`.
  - "Alta con foto": un borrador `{ foto }` previo a montar, luego guardar y comprobar `foto` en el almacenamiento.
  - "Cambiar la foto en la edición": un borrador con `ninguna`.
  - "Edición sin tocar la foto".
  - "Cancelar tras cambiar la foto": se llama a `confirmar`.
  - "Volver sin elegir conserva la foto".
  - "Borrador descartado al guardar": ahora también sin foto.

  Verificar que fallan.
- [x] 3.2 Verde: implementar `fotoActual`, la zona de foto con imagen o cámara, el envío de `foto`, el borrador `{ valores, foto }` y la comparación de cambios con la foto (design.md §3 y §7). Añadir el estilo `.zona-foto--con-foto`. Verificar que pasan y refactorizar con las pruebas en verde.

## 4. Pantalla Elegir foto y sus rutas

- [x] 4.1 Rojo: crear `tests/navegador/elegir-foto.test.js` (cargado desde `index.html`) con zona propia y una `navegacion` falsa. Pruebas:
  - "Cuadrícula completa": todas, con nombre, Genérico al final y ninguna con `aria-pressed="true"`.
  - "Foto actual marcada": un borrador con `queso`.
  - "Elegir desde Nuevo producto" y "Elegir desde la edición": el borrador conserva `valores` y recibe `foto`, `volver` se llama y el producto guardado no cambia.
  - "Entrada directa por URL": sin borrador previo, queda `{ foto }`.
  - "Quitar la foto".
  - "Buscar sin acento", "Buscar parte del nombre" y "Sin coincidencias": mensaje y "Sin foto" visible.
  - "Botón desactivado".
  - Un doble toque llama una sola vez a `volver`.

  Verificar que fallan.
- [x] 4.2 Verde: crear `src/js/elegir-foto.js` (design.md §5) y añadirlo a `SHELL_FILES`. Verificar que pasan y refactorizar con las pruebas en verde.
- [x] 4.3 Registrar en `app.js` las rutas `/producto/nuevo/foto` y `/producto/:id/editar/foto` y quitar `/elegir-foto` (design.md §4). Conectar en `ui.js` `crearPantallaElegirFoto`. Añadir los estilos de Elegir foto (design.md §9). Verificar con `scripts/captura-app.mjs` (usar `MSYS_NO_PATHCONV=1` o rutas sin barra inicial):
  - "Elegir foto de una edición" y "Ruta antigua de Elegir foto".
  - "Volver de Elegir foto tras entrar por URL".
  - Recorrido Nuevo → zona de foto → elegir "Pollo" → el formulario la muestra.
  - Captura de Elegir foto comparada con `docs/design/grok_1792523929932.jpg`.

## 5. Pantalla Detalle (`detalle.js`)

- [x] 5.1 Rojo: crear `tests/navegador/detalle.test.js` (cargado desde `index.html`) con `antesDeCada` sobre `caducidades-pruebas`, `navegacion` y `confirmar` falsos y un `hoy` fijo. Pruebas:
  - "Detalle completo": textos y clase `urgencia--naranja`.
  - "Sin fecha de compra ni notas".
  - "Producto caducado".
  - "Textos con marcado".
  - Foto: imagen del catálogo o icono.
  - "Abrir la edición": enlace a `#/producto/<id>/editar`.
  - "Eliminar confirmado": el producto ya no está y se llama a `reemplazar('/listado')`; el texto de la confirmación incluye el nombre.
  - "Eliminar cancelado".
  - "Fallo al eliminar".
  - "Id desconocido".
  - "Volver a un producto eliminado": el producto se elimina y luego se monta el Detalle.
  - "Reintento correcto".

  Verificar que fallan.
- [x] 5.2 Verde: crear `src/js/detalle.js` (design.md §6) y añadirlo a `SHELL_FILES`. Verificar que pasan y refactorizar con las pruebas en verde.
- [x] 5.3 Conectar en `ui.js` `crearPantallaDetalle` en lugar del marcador. Cambiar el título de la ruta a "Detalle del producto" y añadir los estilos `.detalle*` (design.md §9). Verificar que las pruebas siguen en verde, que el recorrido Listado → Detalle → Editar funciona con `scripts/captura-app.mjs` y que la captura del Detalle se parece al tercer teléfono de `docs/design/grok_1792523938257.jpg`.

## 6. Foto en el listado

- [x] 6.1 Rojo: en `tests/navegador/listado.test.js`, pruebas "Producto con foto predeterminada" (un `<img>` con la URL de `leche`) y "Id desconocido" (icono genérico, sin `<img>`). Verificar que fallan.
- [x] 6.2 Verde: usar `fotoDeProducto` en `tarjeta()` (design.md §7). Verificar que pasan, junto con "Producto sin foto" y el resto de pruebas del listado.

## 7. Gesto de deslizar: lógica pura (`deslizar.js`)

- [x] 7.1 Rojo: crear `tests/deslizar.test.js` con estas pruebas:
  - `ejeDelGesto`: `null` por debajo de 10 px, horizontal y vertical.
  - `desplazamientoLimitado`: no pasa de `-ancho` ni de `0`, partiendo de cerrada y de abierta.
  - `quedaAbierta`: justo por encima y por debajo de la mitad.

  Verificar que `npm test` falla.
- [x] 7.2 Verde: implementar las funciones puras de `src/js/deslizar.js` (design.md §8). Verificar que `npm test` pasa y refactorizar con las pruebas en verde.

## 8. Deslizar para eliminar en el listado

- [x] 8.1 Rojo: en `tests/navegador/listado.test.js` (cargando `styles.css` y con la zona fuera de pantalla, no `hidden`), simular gestos con `PointerEvent` sintéticos. Pruebas:
  - "Deslizar lo suficiente": la tarjeta queda desplazada y se ve "Eliminar".
  - "Deslizar poco".
  - "Gesto vertical".
  - "Tocar una tarjeta abierta": se cierra y el `click` se cancela, así que la URL no cambia.
  - "Una sola abierta".
  - "Eliminar confirmado".
  - "Eliminar el último producto": estado vacío.
  - "Eliminar cancelado": se cierra y sigue en la lista.
  - "Fallo al eliminar": aviso y producto en la lista.
  - El texto de la confirmación incluye el nombre.

  Usar `eliminar` y `confirmar` falsos y cerrar los diálogos en `finally`. Verificar que fallan.
- [x] 8.2 Verde: implementar `activarDeslizar` en `deslizar.js`, la nueva estructura de tarjeta y la eliminación en `listado.js` con las dependencias `eliminar` y `confirmar`, y los estilos `.tarjeta-deslizable` y `.tarjeta__eliminar` (design.md §8 y §9). Añadir `deslizar.js` a `SHELL_FILES`. Verificar que pasan todas las pruebas del listado y refactorizar con las pruebas en verde.
- [x] 8.3 Recorrido con `scripts/captura-app.mjs` y un script que deslice una tarjeta: captura con "Eliminar" visible, sin errores en la consola.

## 9. Verificación final

- [x] 9.1 Ejecutar `npm test` y `npm run test:navegador`. Verificar que están en verde.
- [x] 9.2 Capturas finales a tamaño móvil de Listado con fotos, Detalle, Elegir foto (con una foto marcada y con una búsqueda) y Nuevo con foto. Verificar que se parecen a los mockups y no tienen errores en la consola.
- [ ] 9.3 Manual en el móvil, tras desplegar (dar al usuario los comandos de commit y push):
  - Recorrido completo tocando: alta con foto, Detalle, cambiar la foto en Editar, "Sin foto" y eliminar desde el Detalle.
  - Deslizar para eliminar sin que se dispare al hacer *scroll* ni choque con el gesto "atrás" del sistema.
  - "Abrir Elegir foto sin conexión" en modo avión, con las imágenes visibles.

## Workflow follow-up

- Archivar con `/opsx:archive` tras la revisión del usuario.
- Actualizar la tabla de estado de `CLAUDE.local.md` (6 archivado, 7 siguiente).
