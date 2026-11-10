# Design

## Context

- `ui.js` registra las pantallas Nuevo (`/producto/nuevo`) y Editar (`/producto/:id/editar`), que hoy son marcadores con la zona de foto (`.zona-foto`, enlace a `#/elegir-foto`). Las dos rutas tienen cabecera con flecha de volver y no tienen barra inferior. Nuevo tiene como padre `/listado` y Editar, `/producto/:id`.
- `router.js` expone `volver()` (atrás en el historial si hay pantallas de la app detrás; si no, va a la ruta padre) y `reemplazar(path)`. El router añade de forma síncrona el elemento que devuelve `render`.
- `storage.js` ofrece `obtenerProducto`, `crearProducto`, `actualizarProducto` y `eliminarProducto`, y lanza `ErrorValidacion` (con `campos`), `ErrorNoEncontrado` y `ErrorAlmacenamiento`. `productos.js` normaliza, de modo que acepta la cantidad como texto con coma.
- `listado.js` ya marca el patrón de pantalla inyectable (`crearPantallaListado({ listar, hoy })` → `{ elemento, cargado }`), que se puede probar sin `config.local.js`.
- En `styles.css` no hay estilos de campos de formulario. `.btn--peligro` es blanco sobre `#EF4444`, con un contraste de 3,76:1.
- Mockup: `docs/design/grok_1792523919959.jpg`.

## Goals / Non-Goals

**Goals:**
- Un único módulo de formulario para alta y edición, que se pueda probar en la página del navegador con dependencias inyectadas.
- Que no se pierda lo escrito: ni por errores de validación, ni por un fallo al guardar, ni al ir a Elegir foto, ni al pulsar Cancelar por error.
- Un diálogo de confirmación reutilizable, que necesitarán el Detalle y el borrado desde el listado.

**Non-Goals:**
- Interceptar la flecha de volver o el botón Atrás del sistema con cambios sin guardar. El router no tiene "salida con confirmación", y añadirla afecta a todas las pantallas.
- Validar en vivo mientras se escribe. Se valida al guardar y se limpia el error del campo que se corrige.
- Cambiar el campo `foto`. El formulario lo conserva tal cual.

## Decisions

### 1. `src/js/formulario.js` con dependencias inyectables
`crearPantallaFormulario({ id = null, almacen = { obtenerProducto, crearProducto, actualizarProducto, eliminarProducto }, navegacion = { volver, reemplazar }, confirmar = confirmarDialogo } = {})` devuelve `{ elemento, cargado }`:
- Sin `id`, es Nuevo. Con `id`, es Editar: lee el producto y rellena los campos al terminar `cargado`.
- No importa `ui.js`, `auth.js` ni `config.js`. Importa `router.js` solo para los valores por defecto de `navegacion`, y `router.js` no tiene dependencias.
- `ui.js` registra `nuevo: () => crearPantallaFormulario().elemento` y `editar: ({ params }) => crearPantallaFormulario({ id: params.id }).elemento`.
- Las pruebas pasan un `navegacion` falso, que registra las llamadas, y un `confirmar` falso, que devuelve `true` o `false`.

### 2. Estructura y campos
`<form novalidate>` con un `.campo` por dato: etiqueta, control y `<p class="campo__error" id="error-<campo>">`, oculto si no hay error.

| Campo | Control |
|---|---|
| Nombre | `input type=text`, `autocomplete=off`, `enterkeyhint=next`, placeholder "Ej. Leche, Yogur, Pollo" |
| Fecha de compra / caducidad | `input type=date` (selector nativo de Android e iOS, valor `YYYY-MM-DD`) |
| Cantidad | `button −`, `input type=text inputmode=decimal`, `button +` |
| Unidad | `select` con `UNIDADES` |
| Categoría | `select` con `CATEGORIAS` |
| Notas | `textarea rows=3`, placeholder "Añade cualquier detalle útil…" |

- `novalidate` evita las burbujas del navegador, que salen en el idioma del sistema y con estilo distinto según la plataforma. Los mensajes son los de `validarProducto`, en español y por campo.
- **Cantidad como texto con `inputmode=decimal`**, y no `type=number`. Con `type=number`, "0,5" se interpreta de forma distinta según el idioma del sistema y Safari puede devolver un valor vacío. `normalizarProducto` ya acepta coma y punto.
- **Botones − y +:** + suma 1. − resta 1 y queda desactivado cuando la cantidad es menor o igual que 1, para no dejar 0,5 → −0,5. Llevan `aria-label` "Restar uno" / "Sumar uno".
- **Unidades:** `UNIDADES = ['ud', 'pack', 'kg', 'g', 'l', 'ml']` en `constantes.js`. Si un producto guardado tiene otra unidad, se añade como opción extra para no perderla.
- Los obligatorios llevan `*` (con `aria-hidden` y `required`/`aria-required` en el control) y los opcionales "(opcional)", según DESIGN §4.3.

### 3. Validación y errores
Al enviar, se leen los campos a un objeto `datos` y se llama a `crearProducto` o `actualizarProducto`. La validación la hace el modelo, no el formulario: así una sola regla vale para la UI y para la futura sincronización.
- Con `ErrorValidacion`: por cada campo de `error.campos` se pinta el mensaje, se pone `aria-invalid="true"` y `aria-describedby` hacia el mensaje, y se enfoca el primero según el orden del formulario. `foto` no tiene control visible: su error, que en la práctica no ocurre, iría al aviso general.
- Al editar un campo (`input`/`change`) se quitan su mensaje y su `aria-invalid`.
- Con `ErrorAlmacenamiento` u otro error: aviso general `role="alert"` encima de los botones, "No se pudo guardar el producto. Inténtalo de nuevo.", y se reactiva "Guardar".
- **Guardando:** "Guardar" queda desactivado con el texto "Guardando…" desde el envío hasta la respuesta. Así no se crean duplicados por una doble pulsación.

### 4. Navegación tras cada acción
- **Guardar (alta):** `navegacion.volver()`. El alta se abre desde el "+" del Listado, así que vuelve a él sin dejar una entrada duplicada en el historial. Si se entró por URL, `volver()` va a la ruta padre, `/listado`.
- **Guardar (edición) y Eliminar:** `navegacion.reemplazar('/listado')`. Se decidió volver al Listado y no al Detalle, y reemplazar la entrada evita que Atrás reabra el formulario.
- **Cancelar:** `navegacion.volver()`, después de confirmar si hay cambios.
- El Listado se pinta de nuevo al mostrarse (lee el almacenamiento), así que ya trae el producto nuevo o cambiado.

### 5. Cambios sin guardar
Al terminar `cargado` se guarda una "foto" de los valores iniciales (`JSON.stringify` de los datos del formulario). "Hay cambios" significa que los valores actuales son distintos de esa foto. Solo lo usa Cancelar (Decisión 4).

### 6. Diálogo de confirmación: `src/js/dialogo.js`
`confirmar({ titulo, mensaje, aceptar, cancelar = 'Cancelar', peligro = false })` devuelve `Promise<boolean>`:
- Usa `<dialog>` con `showModal()` (Chrome y Safari 15.4+), que ya da el fondo modal, la inercia de lo que hay detrás, Escape (evento `cancel`) y el foco dentro del diálogo.
- Se crea al llamarlo, se añade a `document.body` y se elimina al cerrarse. Resuelve `true` solo con el botón de acción. El foco inicial va al botón **alternativo**, para que un Enter accidental no borre nada, y al cerrar vuelve al elemento que tenía el foco antes.
- Textos: con `peligro: true`, el botón de acción es `.btn--peligro`.
  - Eliminar: "¿Eliminar «<nombre>»?" / "Dejará de aparecer en la lista." / "Eliminar" / "Cancelar".
  - Descartar: "¿Descartar los cambios?" / "Lo que has escrito no se guardará." / "Descartar" / "Seguir editando".
- *Alternativa descartada:* `window.confirm()`. No se puede dar estilo, muestra el dominio en el título y en el modo instalado de iOS tiene un aspecto poco integrado.

### 7. Borrador al ir a Elegir foto
`const borradores = new Map()` en el módulo, con clave `'nuevo'` o `editar:<id>`:
- Al pulsar la zona de foto (que sigue siendo un enlace a `#/elegir-foto`, como pide `app-navigation`) se guardan los valores actuales en el mapa.
- Al montar el formulario, si hay borrador para su clave, se aplica sobre los valores iniciales (en Editar, después de leer el producto) y se borra del mapa. La foto de los valores iniciales sigue siendo la del producto guardado, así que el borrador recuperado cuenta como "cambios" para Cancelar.
- Guardar, Cancelar y Eliminar borran el borrador de su clave.
- Vive en memoria: desaparece al recargar o cerrar la app. Es suficiente para ir a Elegir foto y volver. El cambio 6 lo reutilizará para devolver la foto elegida.

### 8. Producto inexistente
En Editar, si `obtenerProducto(id)` devuelve `null`, la pantalla pinta solo "Este producto no existe o se ha eliminado" y un enlace "Volver al listado" (`#/listado`). Si falla el almacenamiento, "No se pudo cargar el producto" con "Reintentar", igual que el Listado.

### 9. Estilos
- `.campo`, `.campo__etiqueta`, `.campo__opcional` (gris) y `.campo__obligatorio` (`*` en `--color-urgencia-rojo-texto`).
- Los controles con fondo `--color-fondo-input`, borde `--color-borde`, radio `--radio-sm` y alto mínimo `--tactil-min`. El foco con borde primario.
- `.campo--error`: borde y mensaje en `--color-urgencia-rojo-texto` (`#B91C1C`, 6,5:1 sobre blanco).
- `.cantidad`: grupo `− [1] +` y, al lado, el `select` de unidad, como en el mockup.
- `.formulario__acciones`: Guardar (primario) y Cancelar (secundario) a ancho completo. Va al final del formulario, pegada abajo con `position: sticky` y fondo blanco, para que esté siempre a mano (DESIGN §5.2 "Botones fijos abajo").
- **Eliminar va fuera de la barra fija**, justo debajo (`.formulario__peligro`). Con tres botones fijos, la barra ocupaba casi un cuarto de pantalla al rellenar la edición, y así es más difícil pulsar Eliminar por error. Se vio en la captura de la tarea 3.3.
- **`.btn--peligro`** pasa a un token nuevo `--color-peligro: #DC2626`, con 4,8:1 frente a los 3,76:1 de `#EF4444` con texto blanco. El rojo de urgencia de las tarjetas no cambia.
- Diálogo: `.dialogo` centrado con radio `--radio-lg`, ancho máximo de 400 px, botones apilados y `::backdrop` semitransparente.

### 10. Service Worker
`./js/formulario.js` y `./js/dialogo.js` en `SHELL_FILES`.

### 11. Estrategia de pruebas (TDD)
- **Node (`npm test`):** `UNIDADES` en `tests/productos.test.js`, con la forma y el `freeze`.
- **Navegador (`npm run test:navegador`):**
  - `tests/navegador/dialogo.test.js`: título y textos, `true` con la acción, `false` con la alternativa y con Escape (despachando `cancel`), el foco inicial en la alternativa, el foco devuelto y que el diálogo se elimina del DOM al cerrar.
  - `tests/navegador/formulario.test.js`: monta `crearPantallaFormulario` en la zona oculta con el almacenamiento real sobre `caducidades-pruebas`, un `navegacion` falso que registra las llamadas y un `confirmar` falso. Cubre cada escenario de `product-form` rellenando campos (con eventos `input`), pulsando botones y comprobando el DOM, el almacenamiento y las llamadas de navegación.
- **Manual:** el aspecto frente al mockup, los selectores de fecha nativos en Android e iOS, el teclado decimal en el móvil, el diálogo en el móvil y la **prueba de persistencia pendiente** (crear un producto en el móvil, cerrar la app y abrirla en modo avión).

## Risks / Trade-offs

- [Salir con la flecha o con Atrás del sistema descarta los cambios sin preguntar] → Se acepta en este cambio (Non-Goals). Cancelar sí pregunta.
- [`input type=date` se ve distinto en cada plataforma y no admite placeholder] → Es el selector que el usuario conoce en su móvil. Se acepta frente a programar un calendario propio.
- [El borrador se pierde si se recarga estando en Elegir foto] → Se acepta. El borrador solo cubre el ir y volver.
- [Alta abierta por URL directa: `volver()` va a `/listado` por la ruta padre] → Es el comportamiento deseado.
- [El rojo de "Eliminar" cambia respecto al tono del mockup] → El cambio es mínimo (de `#EF4444` a `#DC2626`) y mejora la legibilidad. No afecta a los colores de urgencia.

## Migration Plan

No hay migración de datos. Al desplegar, el Service Worker (precarga con `cache: 'reload'`) descarga los módulos nuevos.
- **Vuelta atrás:** revertir el commit. Los productos creados con el formulario siguen siendo válidos para el Listado.
