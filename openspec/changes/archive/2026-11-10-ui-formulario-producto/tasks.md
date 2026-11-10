# Tasks

Desarrollo con TDD (design.md §11): en cada bloque, primero las pruebas en **rojo**, después el código mínimo hasta **verde** y por último la **refactorización** con las pruebas en verde. Cada prueba se llama como el escenario de la spec que cubre. Antes de dar un grupo por terminado: `npm test` y `npm run test:navegador` en verde.

## 1. Unidades

- [x] 1.1 Rojo: en `tests/productos.test.js`, prueba de `UNIDADES` de `constantes.js` (`['ud', 'pack', 'kg', 'g', 'l', 'ml']`, congelada); verificar que `npm test` falla
- [x] 1.2 Verde: añadir `UNIDADES` a `src/js/constantes.js`; verificar que `npm test` pasa

## 2. Diálogo de confirmación (`dialogo.js`)

- [x] 2.1 Rojo: crear `tests/navegador/dialogo.test.js` (cargado desde `index.html`) con pruebas de `confirmar`: muestra título, mensaje y los dos textos de botón; la acción resuelve `true` y la alternativa `false`; "Cerrar con Escape" (despachar `cancel` en el `<dialog>`) resuelve `false`; el foco inicial va a la alternativa y, al cerrar, vuelve al elemento que lo tenía; con `peligro: true` el botón de acción lleva `.btn--peligro`; el diálogo desaparece del DOM al cerrarse. Verificar que fallan
- [x] 2.2 Verde: crear `src/js/dialogo.js` según design.md §6, sus estilos (`.dialogo` y `::backdrop`) y añadirlo a `SHELL_FILES`; verificar que `npm run test:navegador` pasa y refactorizar con las pruebas en verde

## 3. Formulario: campos y valores iniciales (`formulario.js`)

- [x] 3.1 Rojo: crear `tests/navegador/formulario.test.js` (cargado desde `index.html`) con `antesDeCada` sobre `caducidades-pruebas`, zona oculta, un `navegacion` falso que registra llamadas y un `confirmar` falso configurable. Pruebas "Formulario de alta vacío" (orden de campos por sus etiquetas, valores iniciales, `*` y "(opcional)", botones sin Eliminar), "Formulario de edición relleno" (con un producto creado con todos los campos) y "Unidad fuera de la lista"; verificar que fallan
- [x] 3.2 Verde: crear `src/js/formulario.js` con `crearPantallaFormulario` (design.md §1, §2), sin lógica de guardado todavía, e integrarlo en `ui.js` para Nuevo y Editar (sustituye los marcadores), y añadirlo a `SHELL_FILES`; verificar que `npm run test:navegador` pasa
- [x] 3.3 Estilos de design.md §9 (campos, cantidad, acciones fijas abajo, `--color-peligro: #DC2626` en `.btn--peligro`); verificar que las pruebas siguen en verde y, con una captura a tamaño móvil de Nuevo y de Editar, que se parece al mockup `docs/design/grok_1792523919959.jpg`

## 4. Botones de cantidad

- [x] 4.1 Rojo: pruebas "Sumar y restar", "Mínimo" (− desactivado con 1 y también con 0,5; se activa al subir de 1) y los `aria-label` de los botones; verificar que fallan
- [x] 4.2 Verde: implementar − y + (design.md §2); verificar que pasan y refactorizar con las pruebas en verde

## 5. Guardar y validación

- [x] 5.1 Rojo: pruebas "Alta correcta" (el producto existe en el almacenamiento y `navegacion.volver` se llamó), "Edición correcta" (mismo id, cantidad nueva, la foto no cambia y `reemplazar('/listado')`), "Cantidad decimal escrita", "Doble pulsación" (un solo producto), "Guardar sin obligatorios" (mensajes, `aria-invalid`, `aria-describedby`, foco en Nombre, nada guardado, nada navegado), "Corregir un campo" y "Fallo al guardar" (almacén falso que lanza `ErrorAlmacenamiento`: aviso, lo escrito sigue y "Guardar" vuelve a estar activo); verificar que fallan
- [x] 5.2 Verde: implementar el envío, el estado "Guardando…", los errores por campo y el aviso general, y la navegación según design.md §3 y §4; verificar que pasan y refactorizar con las pruebas en verde

## 6. Cancelar y eliminar

- [x] 6.1 Rojo: pruebas "Cancelar sin cambios" (no se llama a `confirmar`, `volver`), "Cancelar con cambios y seguir editando", "Cancelar con cambios y descartar", "Eliminar confirmado" (eliminado en el almacenamiento y `reemplazar('/listado')`), "Eliminar cancelado" y que el texto de la confirmación de eliminar incluye el nombre; verificar que fallan
- [x] 6.2 Verde: implementar la detección de cambios (design.md §5), Cancelar y Eliminar con `confirmar`; verificar que pasan y refactorizar con las pruebas en verde

## 7. Producto inexistente y borrador

- [x] 7.1 Rojo: pruebas "Editar un id desconocido" (aviso, enlace `#/listado`, sin formulario), "Editar un producto eliminado", error al cargar con "Reintentar", "Ir a Elegir foto y volver" (escribir, pulsar la zona de foto, montar de nuevo: el nombre se conserva; también en Editar sobre el mismo id), "Borrador descartado al guardar" y que un borrador de Nuevo no aparece en Editar; verificar que fallan
- [x] 7.2 Verde: implementar design.md §7 y §8; verificar que pasan y refactorizar con las pruebas en verde

## 8. Documentación

- [x] 8.1 Actualizar el README (estructura con `formulario.js` y `dialogo.js`, y `constantes.js` con unidades) y quitar de `ui.js` lo que ya no se use (`zonaFoto` si queda sin uso); verificar que lo descrito coincide con los archivos y que no quedan funciones ni iconos sin usar en `ui.js`

## 9. Verificación final

- [x] 9.1 Ejecutar `npm test` y `npm run test:navegador` (todo en verde, y cada escenario de `product-form` tiene una prueba con su nombre), `openspec validate ui-formulario-producto --strict` y, en la app real con sesión, el recorrido Listado → "+" → rellenar → Guardar → aparece en el Listado → abrir → Editar → cambiar → Guardar → Editar → Eliminar → confirmar, sin errores en la consola
- [x] 9.2 (Manual, en el PC) Crear, editar y eliminar desde la interfaz; probar el teclado (Tab por todos los campos, Enter en el diálogo no borra, Escape lo cierra), los mensajes de error y Cancelar con y sin cambios; en DevTools en *Offline*, crear un producto y comprobar que aparece en el Listado
- [x] 9.3 (Manual, en el móvil, tras desplegar) Con la app instalada: los selectores de fecha nativos, el teclado decimal en la cantidad, el diálogo de eliminar y el aspecto frente al mockup. **Prueba de persistencia pendiente de `modelo-y-almacenamiento` (tarea 10.2):** crear un producto, cerrar la app del todo, activar el modo avión, abrirla y comprobar que el producto sigue en el Listado

## 10. Corrección tras la prueba en el móvil

En el móvil, el diálogo "¿Descartar los cambios?" salía pegado arriba a la izquierda (design.md §6).

- [x] 10.1 Rojo: prueba "el diálogo sale centrado en la pantalla" en `tests/navegador/dialogo.test.js`, que carga los estilos reales de la app y mide los márgenes (fallaba: 0 px a la izquierda frente a 364 a la derecha). Verde: `margin: auto` en `.dialogo`, porque el reset `* { margin: 0 }` anulaba el centrado nativo de los `<dialog>` modales. La prueba cierra siempre el diálogo (`finally`), porque si se queda abierto deja inerte la página y hace fallar las siguientes. 73 pruebas en verde en 5 ejecuciones seguidas

## Workflow follow-up

- Archivar el cambio (`/opsx:archive`) cuando esté implementado y verificado, para crear la spec principal `product-form`.
- Al completar la 9.3, borrar la memoria "prueba-movil-pendiente" y actualizar la tabla de estado de `CLAUDE.local.md`.
