# Diseño: pantallas-sin-scroll-y-fecha-compra

## Contexto

La motivación está en `proposal.md`. Medidas con `scripts/captura-app.mjs`, sin zonas seguras, antes del cambio:

| Pantalla | Alto a 390×844 | Alto a 390×740 |
|---|---|---|
| Nuevo producto | 844, sin scroll | 760, justo |
| Editar producto | 844, sin scroll | 809, con scroll |
| Ajustes | 844, sin scroll | 809, con scroll |

Por qué sobra alto:
- **Editar producto** mide lo mismo que el alta más `.formulario__peligro`, con "Eliminar": 8 px de margen y 48 de botón.
- **Ajustes** termina a 713 px, pero `.app--con-nav .contenido` deja `padding-bottom` = navegación (64) + `--espacio-6` (32) = 96 px.

Estado del código:
- **La cabecera** la pinta `ui.js` (`pintarCabecera`) antes de llamar a `ruta.render`. Las pantallas devuelven solo su elemento y no pueden añadir nada a la cabecera. La acción de la cabecera que ya existe, el icono de sincronización del Listado, usa la clase `.cabecera__accion`.
- **`formulario.js`:**
  - `VALORES_ALTA.fechaCompra` es `''` y no recibe `hoy`.
  - `estadoInicial` se calcula después de construir el formulario, así que lo que venga en los valores del alta no cuenta como cambio.
  - El borrador guarda `leerValores(controles)`, incluida una `fechaCompra` vacía.
- **Ajustes** está dentro de `ui.js` (`pantallaAjustes`), que importa `auth.js`. Por eso no se puede montar en las pruebas.
- **La prueba "Alta sin scroll"** mide el `<form>` contra un `ALTO_DISPONIBLE` (844 − 56 − 47 − 16 − 34 = 691, el iPhone instalado).

## Objetivos / No objetivos

**Objetivos**
- Que Nuevo producto, Editar producto y Ajustes quepan a 390×740 sin zonas seguras, y que no se puedan desplazar.
- Que la papelera de la cabecera reutilice la lógica de eliminar que ya existe: confirmación, aviso, error y navegación.

**No objetivos**
- El Listado y el Detalle, que se desplazan por su contenido. La visualización del Listado va en otro cambio.
- Cambiar el modelo: `fechaCompra` sigue siendo opcional y `nuevoProducto` no la rellena. Solo el formulario propone la fecha de hoy.

## Decisiones

### 1. Acción de cabecera devuelta por la pantalla
- `crearPantallaFormulario` devuelve `{ elemento, cargado, accionCabecera }`.
- En la edición, `accionCabecera` es un `<button class="cabecera__accion cabecera__accion--peligro" aria-label="Eliminar producto">` con `ICONOS.eliminar`. En el alta es `null`.
- El botón se crea **una sola vez** por pantalla, con `hidden` hasta que el producto se carga. Así, si `cargar()` se repite con "Reintentar", no se duplican los *listeners*. El clic usa el `producto` de ese momento.
- En `ui.js`, las rutas pueden devolver un nodo o `{ elemento, accionCabecera }`. `mostrar` llama a `render` **antes** de `pintarCabecera` y le pasa la acción, que se añade al final de la cabecera. Las demás pantallas no cambian.
- La lógica de `activarCancelarYEliminar` se separa: Cancelar sigue igual, y Eliminar se engancha una vez a `accionCabecera`.
- Se quita `.formulario__peligro` del formulario y del CSS.
- Color: `--color-peligro` en el icono, sin fondo, con el mismo `:active` que las otras acciones de la cabecera.

*Alternativa descartada:* que el formulario escriba en `#cabecera` con `document.getElementById`. Rompería la convención de que las pantallas no tocan la estructura de `ui.js`, y las pruebas tendrían que montar una cabecera falsa.

### 2. Fecha de hoy en `productos.js`
- `fechaLocal(fecha)` devuelve `YYYY-MM-DD` con la fecha **local** del dispositivo (`getFullYear`/`getMonth`/`getDate`), no con `toISOString`, que daría el día UTC.
- Es pura y se prueba en Node, incluido el caso de cerca de medianoche con desfase horario.
- `crearPantallaFormulario` recibe `hoy = () => new Date()`, como el Listado y el Detalle. En el alta, `fechaCompra` es `fechaLocal(hoy())`.

### 3. Botón "Quitar fecha de compra"
- El campo Fecha de compra pasa a ser una fila (`.campo__fila`, flex): el `<input type="date">` con `flex: 1` y un `<button type="button" class="campo__quitar" aria-label="Quitar fecha de compra">` con `ICONOS.cerrar`, de 44×44.
- El alto de la fila es el del input, así que no añade alto.
- Al pulsarlo: `value = ''`, se lanza `input` (borrador, errores y estado del botón) y el foco pasa al input.
- El botón queda `disabled` cuando el campo está vacío. Se actualiza con los eventos `input` y `change`, y también tras aplicar el borrador.
- **El borrador no necesita cambios:** ya guarda `fechaCompra: ''`, y `aplicarValores` la repone.
- **Cancelar sin cambios:** `estadoInicial` se calcula con la fecha de hoy ya puesta, así que no salta la confirmación.

### 4. Ajustes en su propio módulo
- `src/js/ajustes.js` exporta `crearPantallaAjustes({ sesion, sincronizador, preferenciaAvisos, alCerrarSesion })`, que devuelve `{ elemento }`.
- El contenido y los textos son los de ahora. Reutiliza `crearSeccionSincronizacion` y `crearSeccionAvisos`.
- `ui.js` le pasa:
  - `sesionActual()`;
  - la instancia de `sincronizador`;
  - `avisosPorDefecto`;
  - un `alCerrarSesion` que hace `detenerSincronizacion()`, `cerrarSesion()` y `reemplazar('/login')`.
- El módulo no importa `ui.js`, `auth.js` ni `config.js`.
- Se añade a `SHELL_FILES` en `src/sw.js`. La prueba de `sw.test.js` que compara `SHELL_FILES` con `src/` lo detecta si falta.

### 5. Ajustes compacto
Hay que recortar unos 70 px. En este orden, parando cuando la prueba de alto pase:
1. **El bloque de Drive en una fila:** la nube de 24 px a la izquierda de "Google Drive", en vez de una nube de 48 px encima. Ahorra unos 50 px. El estado y "Última sincronización" siguen centrados debajo.
2. **Menos separación:** `.ajustes` usa `gap: var(--espacio-3)` en lugar de `--espacio-4`.
3. **Menos margen inferior en Ajustes:** la ruta de Ajustes pone en `.app` la clase `app--ajustes`, y `.app--ajustes .contenido` usa como `padding-bottom` la navegación más `--espacio-4`. El Listado conserva `--espacio-6`, que deja sitio al botón flotante.

### 6. Formulario a 390×740
- El formulario sin "Eliminar" mide unos 669 px y caben 740 − 56 − 16 = 668.
- Se reduce el `gap` del formulario o el `margin` de los campos lo justo para entrar con algo de margen (objetivo ≤ 656 px), sin bajar ningún control de 44 px.

### 7. Estrategia de pruebas
- **Node (`npm test`):**
  - `fechaLocal` en `tests/productos.test.js`: un día normal y una hora cercana a medianoche, donde la fecha local y la UTC difieren.
  - `sw.test.js` ya comprueba `SHELL_FILES`.
- **Navegador (`npm run test:navegador`):**
  - **`formulario.test.js`:**
    - fecha de compra de hoy con `hoy` inyectado y edición sin fecha;
    - papelera: `accionCabecera`, oculta hasta cargar, nula en el alta, oculta con id inexistente;
    - confirmar, cancelar con el foco de vuelta, y guardar sin fecha;
    - volver a elegir una fecha, borrador con la fecha vaciada y cancelar el alta sin cambios;
    - "Sin alto añadido", "Alta sin scroll" y "Edición sin scroll" con `ALTO_DISPONIBLE = 740 − 56 − 16`.
  - **`ajustes.test.js`, nuevo:** monta `crearPantallaAjustes` con dobles dentro de `<div class="app app--con-nav app--ajustes"><main class="contenido">`, a 390 px de ancho y con `styles.css`. Comprueba:
    - que el alto del `main`, con su padding, más la cabecera (56) no pasa de 740;
    - que "Cerrar sesión" mide al menos 44 px y llama a `alCerrarSesion`;
    - que no queda texto suelto.
- **Comprobación visual:** `captura-app.mjs --alto 740` en `producto/nuevo`, en la edición de un producto completo y en `ajustes`. El resultado del recorrido debe dar `scrollHeight === clientHeight`, sin errores de CSP.
- **Manual:** en el móvil del usuario, las tres pantallas sin scroll, la papelera y la fecha de compra.

## Riesgos / Contrapartidas

- **[Riesgo]** El alto útil real depende del móvil y de si la app está instalada. → Se toma 740 como referencia, acordada con el usuario, y se comprueba en su móvil.
- **[Riesgo]** La papelera de la cabecera queda más a mano que el botón de abajo. → Mantiene la confirmación con el nombre del producto y el color de peligro.
- **[Contrapartida]** `ui.js` acepta dos formas de resultado de `render`. → Es una comprobación de una línea. Las demás rutas siguen devolviendo un nodo.

## Plan de despliegue

Un solo despliegue. No hay migración de datos. Tras desplegar, el usuario abre y cierra la app una vez para que el Service Worker cargue la versión nueva, incluido `ajustes.js`.
