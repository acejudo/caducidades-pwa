# Design

## Context

- `ui.js` mantiene como marcadores el Detalle (`/producto/:id`) y Elegir foto (`/elegir-foto`, con padre `/listado`). El router (`router.js`) admite parámetros `:nombre` pero no *query*. `volver()` retrocede en el historial si hay pantallas de la app detrás y, si no, va a la ruta padre, resolviendo sus parámetros con los de la ruta actual.
- `formulario.js` guarda los borradores en un `Map` privado (claves `'nuevo'` y `editar:<id>`). Los recupera, y los borra, al montarse. No envía `foto`: en el alta queda `ninguna` por defecto y en la edición se conserva. La zona de foto es un enlace a `#/elegir-foto`. El módulo exporta `descartarBorradores()` para las pruebas.
- `listado.js` pinta cada tarjeta como un `<a class="tarjeta">` con el icono genérico en `.tarjeta__foto`. Recibe `{ listar, hoy }`.
- El modelo (`productos.js`) valida `foto.tipo` y exige `valor` si no es `ninguna`, pero no comprueba que el id exista en ningún catálogo.
- `dialogo.js` ofrece `confirmar()`. `src/img/predeterminadas/` está vacía.
- Mockups: `docs/design/grok_1792523929932.jpg` (Elegir foto) y el tercer teléfono de `grok_1792523938257.jpg` (Detalle).

## Goals / Non-Goals

**Goals:**
- Que Detalle y Elegir foto sigan el patrón `crear…({ dependencias }) → { elemento, cargado }` y se puedan probar sin `config.local.js`.
- Una sola fuente de verdad para el catálogo de fotos, que usen Listado, Detalle, formulario, Elegir foto y el Service Worker (este último, comprobado por una prueba).
- Que el formulario no pierda ni lo escrito ni la foto al ir y volver de Elegir foto, también si se entra a Elegir foto directamente por URL.

**Non-Goals:**
- Validar en el modelo que el id de una foto predeterminada exista en el catálogo. Un id desconocido (de otro dispositivo con un catálogo más nuevo) debe guardarse y sincronizarse igual, solo que se muestra con el icono genérico.
- Sugerir una foto a partir del nombre del producto.
- Ofrecer deslizar para eliminar con teclado o lector de pantalla. Para esos casos está el "Eliminar" del Detalle (ver Riesgos).
- Recalcular los días del Detalle al volver a primer plano. El Detalle se abre de forma puntual, y el Listado ya lo hace.

## Decisions

### 1. Catálogo puro: `src/js/fotos.js`
Exporta:
- `FOTOS_PREDETERMINADAS`: lista congelada de `{ id, nombre }` en el orden de la cuadrícula, con `generico` al final.
- `buscarFoto(id)`: devuelve la entrada o `null`.
- `urlFoto(id)`: devuelve la URL del SVG, calculada con `new URL(\`../img/predeterminadas/${id}.svg\`, import.meta.url)`. Así funciona igual desde `index.html` que desde `tests/navegador/`.
- `filtrarFotos(texto)`: normaliza con `normalize('NFD')`, quita las marcas diacríticas, pasa a minúsculas y busca por `includes`. Con un texto vacío devuelve todas.
- `fotoDeProducto(producto)`: devuelve `{ id, nombre, url }` si la foto es predeterminada y está en el catálogo, y `null` en cualquier otro caso. Así cada pantalla decide entre imagen e icono con una sola llamada.

No importa nada del DOM ni de `config.js`, así que se prueba en Node.

Catálogo inicial (20): yogur, leche, queso, huevos, mantequilla, pollo, carne, salmon, embutido, manzana, platano, tomate, lechuga, zanahoria, pan, arroz, pasta, conserva, zumo y generico. Alternativa descartada: incluir sinónimos de búsqueda. Añaden datos que mantener y, con 20 fotos visibles de un vistazo, no compensan.

### 2. Ilustraciones SVG
Un archivo por foto en `src/img/predeterminadas/<id>.svg`:
- `viewBox="0 0 96 96"`, estilo plano sin contorno y una paleta común (blancos rotos, ocres, rojos y verdes suaves), sin fondo propio: el fondo lo pone la casilla.
- Sin texto, sin `<script>`, sin referencias externas y de menos de 4 KB cada uno.
- Se muestran con `<img>`, no incrustados en el DOM, para que el navegador y el Service Worker los traten como recursos estáticos.
- `alt=""` en todas las pantallas, porque el nombre del producto o de la foto siempre está escrito al lado. `width`/`height` explícitos para que no se mueva el diseño al cargar.

Alternativa descartada: un único *sprite* SVG. Ahorra peticiones, pero complica `<img>` y la prueba de que existen todos los archivos.

### 3. Borradores compartidos: `src/js/borradores.js`
El `Map` sale de `formulario.js` a un módulo propio, con `leerBorrador(clave)`, `guardarBorrador(clave, borrador)`, `descartarBorrador(clave)` y `descartarBorradores()`. `formulario.js` reexporta `descartarBorradores`, para no romper las pruebas existentes.

Forma del borrador: `{ valores?, foto }`. `valores` son los textos de los controles y `foto` es `{ tipo, valor }`.
- **Formulario, al pulsar la zona de foto:** guarda `{ valores, foto: fotoActual }`.
- **Formulario, al montarse:** si hay borrador, aplica `valores` (si existen) y `foto`, y lo borra (como ahora).
- **Elegir foto, al elegir:** `guardarBorrador(clave, { ...leerBorrador(clave), foto })` y `navegacion.volver()`. Si se entró por URL no hay borrador previo, y queda `{ foto }` solo.
- **Elegir foto, al montarse:** lee `leerBorrador(clave)?.foto` para marcar la actual, sin borrarlo.

Para saber si hay cambios, se compara `JSON.stringify({ valores, foto })` con lo cargado del almacenamiento (o con los valores de alta). Así, una foto elegida cuenta como cambio.

### 4. Rutas de Elegir foto
```
registrar('/producto/nuevo/foto',       { titulo: 'Elegir foto', padre: '/producto/nuevo', ... })
registrar('/producto/:id/editar/foto',  { titulo: 'Elegir foto', padre: '/producto/:id/editar', ... })
```
Las dos llaman a `crearPantallaElegirFoto({ para })`, con `para` igual a `'nuevo'` o `editar:<id>`, la misma clave del borrador. Se registran antes de `/producto/:id`, aunque las expresiones están ancladas y no chocan. `/elegir-foto` desaparece y cae en "ruta inexistente → Listado".

Alternativa descartada: añadir *query* al router (`/elegir-foto?para=…`). Toca el router, que ya tiene sus pruebas, y además el padre de la ruta no podría depender del origen.

La zona de foto del formulario enlaza a `#/producto/nuevo/foto` o a `#/producto/<id>/editar/foto`.

### 5. Pantalla Elegir foto: `src/js/elegir-foto.js`
`crearPantallaElegirFoto({ para, navegacion = { volver } })` → `{ elemento, cargado }`. `cargado` se resuelve enseguida, porque no hay lectura asíncrona.
- Estructura: `input type=search` con `aria-label="Buscar foto"` y *placeholder* "Buscar producto…", luego `<ul class="fotos">` con un `<button type="button" aria-pressed>` por foto (`<img>` + nombre) y, por último, `.fotos__acciones` con "Hacer foto" (desactivado, con la nota "Próximamente") y "Sin foto".
- La búsqueda se hace en el evento `input`, oculta con `hidden` los `<li>` que no coinciden y muestra el mensaje "No hay fotos que coincidan" si no queda ninguno.
- La seleccionada lleva `aria-pressed="true"` y la clase `foto--seleccionada` (borde `--color-primario` y un *check* en una esquina).
- Al pulsar una foto o "Sin foto", se actualiza el borrador y se llama a `navegacion.volver()`. Para que un doble toque no vuelva dos veces, se ignoran las pulsaciones mientras ya se está volviendo.

### 6. Pantalla Detalle: `src/js/detalle.js`
`crearPantallaDetalle({ id, almacen = { obtenerProducto, eliminarProducto }, navegacion = { reemplazar }, confirmar = confirmarDialogo, hoy = () => new Date() })` → `{ elemento, cargado }`.
- Estados: cargando, datos, inexistente (el mismo texto y enlace que el formulario) y error con "Reintentar".
- Estructura de los datos:
  - `.detalle__foto`: imagen o icono genérico grande sobre fondo de superficie, con relación 16:10.
  - `h2.detalle__nombre`.
  - `.detalle__caducidad`, con "Caduca el …" y `.badge` dentro de un contenedor `urgencia--<nivel>` (reutiliza los tokens del listado).
  - `<dl class="detalle__datos">` con Fecha de compra (si existe), Cantidad y Categoría.
  - Sección Notas (si existen).
  - `.detalle__acciones`: el enlace "Editar" (`btn--secundario`) y el botón "Eliminar" (`btn--peligro`).
- La fecha de compra se escribe "Comprado el 10 nov 2026", con `formatearFecha`.
- Eliminar sigue el mismo flujo que el formulario: confirmar, eliminar y `navegacion.reemplazar('/listado')`. Si falla, muestra un aviso `role=alert`.
- El título de la ruta pasa a ser "Detalle del producto".

### 7. Foto en el formulario y en el listado
- **Formulario.** `fotoActual` se inicia con `producto.foto` (en la edición) o con `{ tipo: 'ninguna', valor: null }`. Si existe borrador, manda el suyo. La zona de foto pinta `fotoDeProducto({ foto: fotoActual })`:
  - Con foto: la imagen, el nombre y "Toca para cambiar".
  - Sin foto: la cámara y "Toca para elegir foto".

  El submit envía `{ ...valores, foto: fotoActual }`. En la edición, si no se eligió otra, `fotoActual` es la del producto, así que se conserva.
- **Listado.** En `tarjeta()`, `.tarjeta__foto` contiene `<img>` si `fotoDeProducto` devuelve algo y, si no, el icono.

### 8. Deslizar para eliminar: `src/js/deslizar.js`
Se separa en una parte pura, que se prueba en Node, y en un controlador DOM.
- **Parte pura:**
  - `ejeDelGesto(dx, dy)`: devuelve `null` hasta superar 10 px, y después `'horizontal'` si `|dx| > |dy|` o `'vertical'` en caso contrario.
  - `desplazamientoLimitado(dx, abierta, ancho)`: limita entre `-ancho` y `0`.
  - `quedaAbierta(desplazamiento, ancho)`: devuelve `true` si se ha desplazado más de la mitad del botón.

  El ancho del botón es de 88 px.
- **Controlador:** `activarDeslizar(lista, { alPulsarEliminar })` usa *pointer events* (`pointerdown/move/up/cancel`) en la lista, delegados en cada `.tarjeta-deslizable`.
  - La tarjeta lleva `touch-action: pan-y`, de modo que el navegador sigue gestionando el desplazamiento vertical. Si el eje es vertical, el controlador se desentiende.
  - Si el gesto fue horizontal o la tarjeta estaba abierta, se captura y cancela el `click` siguiente (en fase de captura), para no navegar al Detalle.
  - Guarda una única tarjeta abierta. Un `pointerdown` fuera de ella la cierra.
  - Devuelve `{ cerrarTodas, destruir }`.
- **Estructura:** `li > .tarjeta-deslizable > [button.tarjeta__eliminar, a.tarjeta]`. El botón está detrás, pegado a la derecha y con fondo `--color-peligro`. La tarjeta se mueve con `transform: translateX()` y tiene una transición solo al soltar.
- **Accesibilidad:** el botón lleva `tabindex="-1"` y `aria-hidden="true"`, porque solo se alcanza con el gesto. El Detalle ofrece la misma acción por teclado o lector de pantalla.
- **Listado:** recibe además `eliminar = eliminarProducto` y `confirmar = confirmarDialogo`. Al confirmar, elimina, quita el producto de `productos` y vuelve a pintar, lo que da el estado vacío si era el último. Si se cancela, cierra la tarjeta. Si la eliminación falla, muestra el aviso `p.listado__aviso role=alert` sobre la lista.

### 9. Estilos
Clases nuevas en `styles.css` con los tokens existentes:
- **Elegir foto:** `.buscador`; `.fotos`, una rejilla de 3 columnas con `gap` de `--espacio-3`; la casilla, cuadrada con fondo superficie y radio `--radio-md`; `.foto--seleccionada`; `.fotos__vacio`; `.fotos__acciones`, fija abajo como en el formulario.
- **Detalle:** `.detalle*`.
- **Deslizar:** `.tarjeta-deslizable` y `.tarjeta__eliminar`.
- **Zona de foto:** su variante con imagen, `.zona-foto--con-foto`.

Contraste: el texto del botón "Eliminar" del deslizar va en blanco sobre `--color-peligro` (#DC2626, 4,83:1).

### 10. Service Worker
Se añaden a `SHELL_FILES` los JS nuevos (`fotos.js`, `borradores.js`, `elegir-foto.js`, `detalle.js` y `deslizar.js`) y los 20 SVG. Una prueba de `tests/sw.test.js` importa `FOTOS_PREDETERMINADAS` y comprueba que cada `./img/predeterminadas/<id>.svg` está en `SHELL_FILES`. Así no se puede añadir una foto al catálogo y olvidarla en la caché, y viceversa.

### 11. Estrategia de pruebas (TDD)
- **Node (`npm test`):**
  - `tests/fotos.test.js`: los ids de la SPEC, ids únicos y en formato simple, nombres con tilde, `filtrarFotos` (sin acentos, mayúsculas, parcial y vacío), `fotoDeProducto` (conocida, desconocida, real y ninguna), `urlFoto`, y que cada id tiene su `.svg` en disco con `viewBox`, sin `<script>` y por debajo de 4 KB.
  - `tests/deslizar.test.js`: las tres funciones puras.
  - `tests/sw.test.js`: la consistencia entre el catálogo y `SHELL_FILES`.
- **Página del navegador (`npm run test:navegador`):**
  - `detalle.test.js`: todos los escenarios de `product-detail`, con almacén y navegación falsos y la base `caducidades-pruebas`.
  - `elegir-foto.test.js`: cuadrícula, marcada, elegir, "Sin foto", búsqueda y "Hacer foto" desactivado. Comprueba el borrador con `leerBorrador`.
  - `formulario.test.js` (ampliado): zona de foto, guardar con foto, conservar foto en la edición, borrador con foto y Cancelar tras cambiar la foto.
  - `listado.test.js` (ampliado): tarjeta con imagen, id desconocido, deslizar con `PointerEvent` sintéticos (umbral, gesto vertical, toque en tarjeta abierta, una sola abierta) y eliminar (confirmado, último, cancelado y fallo).

  Los escenarios que dependen de cómo se ve (`transform` y posición) cargan `styles.css`.
- **Recorrido con `scripts/captura-app.mjs`:** rutas nuevas, ruta antigua y flecha de volver desde Elegir foto por URL (escenarios de `app-navigation`). También capturas de Detalle, Elegir foto y Listado con fotos, para compararlas con los mockups.
- **Manual en el móvil:** sensación del deslizar (sin que se dispare al hacer *scroll*), fotos sin conexión en modo avión y recorrido completo.

## Risks / Trade-offs

- [El deslizar puede interferir con el *scroll* o con el gesto "atrás" del borde en iOS] → `touch-action: pan-y`, bloqueo de eje a los 10 px y prueba manual en el móvil. Si molesta, se puede ignorar el gesto cuando empieza a menos de 20 px del borde izquierdo.
- [Deslizar no es accesible con teclado ni con lector de pantalla] → Es un atajo, no la única vía: "Eliminar" está en el Detalle y en Editar.
- [Las ilustraciones SVG no se parecen a las fotos realistas del mockup] → El usuario lo ha aceptado. El catálogo y las rutas no dependen del formato, así que más adelante se pueden sustituir por webp sin tocar código (salvo la extensión en `urlFoto`).
- [Un borrador puede quedar huérfano en memoria si el usuario va del formulario a Elegir foto y de ahí al Listado] → Ya pasaba antes. Solo vive mientras la app está abierta y se descarta al guardar o cancelar ese formulario.
- [Los 20 SVG engordan la instalación del Service Worker] → Menos de 4 KB cada uno (menos de 80 KB en total), con un límite que comprueba una prueba.

## Migration Plan

- Sin migración de datos: el modelo y IndexedDB no cambian.
- La ruta `/elegir-foto` desaparece. Una URL antigua guardada lleva al Listado.
- Despliegue habitual: push a `main`, workflow en verde y abrir y cerrar la app para cargar la versión nueva. El SHA del commit hace de `CACHE_VERSION`, así que los SVG se precargan en la siguiente instalación del SW.
- Vuelta atrás: revertir el commit. Los productos guardados con foto predeterminada siguen siendo válidos para la versión anterior, que simplemente no los muestra.
