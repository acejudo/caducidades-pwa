# Design

## Context

Ver proposal.md (Why). Estado actual relevante, medido con `captura-app.mjs` a 390×844:

- **Nuevo producto mide 985 px.**
  - La zona de foto ocupa 160 px y Notas tiene `rows: 3`.
  - La fila fija (`.formulario__acciones`, *sticky*) lleva "Guardar" y "Cancelar" uno encima de otro, unos 120 px.
  - "Eliminar" ya va después del formulario, en `.formulario__peligro`.
- **Detalle:** `.detalle__foto` tiene proporción 16:10. Las fotos reales se recortan con `.foto-real` (`object-fit: cover`) y no hay forma de verlas enteras.
- **Mensajes:** no hay *toasts*. El Listado solo marca `aria-busy` mientras lee, sin texto visible, y el Detalle y Editar no indican nada.
- **Sincronizador:** publica `estado()`, con `{ enLinea, fase, pendiente, tokenVigente, ... }`, y `suscribir`. `estado-sincronizacion.js` tiene `seguirEstado(sincronizador, elemento, fn)`, que se suscribe mientras el elemento está en el documento. La instancia vive en `ui.js`, y las pantallas no pueden importarlo.
- **Aviso de caducidad:** los textos los genera `resumirUrgentes` en `productos.js` (Node).
- **Fotos predeterminadas:** los SVG están en `src/img/predeterminadas/<id>.svg`, escritos a mano, de 96×96 y con sombra elíptica.
- **Mockups (`docs/design/`):**
  - pestañas "Pronto" y "Caducadas" con el color de urgencia en el texto;
  - Detalle con icono a la izquierda de Cantidad y Categoría, y la categoría como etiqueta azul;
  - Ajustes con un bloque de Drive centrado.

## Goals / Non-Goals

**Goals:**
- Que el alta quepa a 390×844 sin scroll y que la app avise de lo que hace: guardado, eliminado, carga y cambios sin sincronizar.
- Acercar las pantallas a los mockups sin rehacerlas.
- Dejar comprobados los criterios de SPEC.md §10 y la instalación.

**Non-Goals:**
- Modo oscuro: SPEC §11 lo deja fuera.
- "Deshacer" en el aviso de eliminado.
- Cambiar los nombres de la navegación inferior a los del mockup ("Inicio / Lista").
- Usar el logo de Google Drive, que es una marca: se usa un icono genérico de nube.
- Rediseñar los iconos PWA, salvo que fallen en la instalación.
- Cualquier tema de seguridad, que va en `endurecimiento-seguridad`.

## Decisions

### 1. Aviso de sincronización

**Condición, pura y en `sincronizacion.js`:**

```
avisoPendiente(estado) = estado.enLinea && estado.pendiente && !estado.tokenVigente && estado.fase !== 'sincronizando'
```

Se prueba en Node. Con `fase === 'error'` también se muestra: el toque permite reintentar.

**Vista, en `estado-sincronizacion.js`:** `crearAvisoSincronizacion({ sincronizador })` → `{ elemento }`.
- Es un `<button class="aviso-sincronizacion">` con el icono de sincronizar y el texto "Hay cambios sin sincronizar. Toca para sincronizar".
- Usa `seguirEstado` para mostrarse u ocultarse con `hidden`.
- Al pulsarlo llama a `sincronizador.sincronizar({ aPeticion: true })`, el único camino que puede abrir la ventana de Google.
- Estilo: fondo `--color-primario-suave` y texto `--color-primario`, para diferenciarlo del aviso rojo de caducidad.

**Listado:** recibe una dependencia opcional, `sincronizador = null`. Si existe, coloca el aviso de sincronización antes del de caducidad. `ui.js` le pasa la instancia de la app (`pantallas.listado = () => crearPantallaListado({ sincronizador }).elemento`).

- **Alternativa descartada:** un aviso global en `ui.js`. No se podría probar y saldría también en otras pantallas.

### 2. Textos cortos del aviso de caducidad

`resumirUrgentes` cambia solo el `texto`:

| Situación | Texto |
|---|---|
| Solo caducados | "1 producto caducado" / "6 productos caducados" |
| Solo próximos | "1 producto a punto de caducar" / "3 productos a punto de caducar" |
| Los dos | "2 productos caducados y 1 a punto de caducar" (o "y 3 a punto de caducar") |

"A punto de caducar" no lleva plural, así que no hay concordancias raras. La ayuda de Ajustes ya explica el plazo de 2 días. La prueba "Cabe en dos líneas" mide la altura del texto con los estilos cargados: el caso extremo es "12 productos caducados y 10 a punto de caducar".

### 3. Alta en una sola pantalla

Hay que ganar unos 141 px:

- **Zona de foto compacta, en fila:** `display: flex`, con una miniatura de 56×56 (radio `--radio-md`) o el icono de cámara de 24 px dentro de un círculo de 56 px, y el texto al lado ("Toca para elegir foto", o el nombre / "Tu foto" con "Toca para cambiar" debajo). Mide unos 80 px de alto (antes, 160 px) y conserva el borde discontinuo cuando no hay foto.
- **Notas con `rows: 2`.**
- **Fila fija:** `.formulario__acciones` pasa a `grid-template-columns: 1fr 1fr`, con "Cancelar" a la izquierda y "Guardar" a la derecha. El aviso de error, si lo hay, ocupa toda la fila de encima. En el DOM, "Guardar" sigue siendo el primer botón de envío, así que Intro guarda igual: se coloca a la derecha con `order` o se escribe "Cancelar" antes y se comprueba que Intro sigue guardando.
- **Espacio entre campos:** de `--espacio-4` a `--espacio-3` si aún no cabe.

La prueba de navegador "Alta sin scroll" monta el formulario con los estilos de la app dentro de una zona de 390×844. Mide que la posición inferior del último elemento (la fila de botones) quede dentro de los 844 px, contando la cabecera de la app (56 px), que en la prueba se simula con un margen. El mismo número se comprueba con `captura-app.mjs` (`scrollHeight <= innerHeight`).

### 4. Foto en el Detalle y visor

- `foto(producto)` del Detalle añade la clase `detalle__foto--real` al contenedor cuando `pintarFoto` termina con una foto real (devuelve una promesa; se mira si hay `img.foto-real`).
- CSS: `.detalle__foto--real { aspect-ratio: 4 / 3; padding: 0 }`, y la imagen a todo el recuadro con `object-fit: cover`. El resto sigue en 16:10 con la imagen centrada.
- **Visor:** con foto real, el contenedor pasa a ser un `<button aria-label="Ver la foto a pantalla completa">`. Al pulsarlo crea un `<dialog class="visor-foto">` con la misma imagen (`object-fit: contain`, `max-width: 100%`, `max-height: 100%`) y un botón "Cerrar".
- **Cierre:** con Escape, de forma nativa, y con un clic en el propio `<dialog>` fuera de la imagen (`evento.target === dialog`). Al cerrarse se quita el `<dialog>`.
- Se reutiliza el `Blob` que ya está pintado: se lee otra vez con `obtenerFoto` para no depender de la URL revocada.

### 5. Avisos breves y carga: `src/js/feedback.js`

**Avisos breves:**
- `mostrarAviso(texto, { duracion = 3000, raiz = document.body } = {})`. Crea la primera vez una región `<div class="toast" role="status" aria-live="polite">` en `raiz`; después cambia su texto y reinicia el temporizador.
- `ocultarAvisos()` es para las pruebas.
- **Posición** (cambiada tras probarla en el móvil el 2026-11-21: abajo se mezclaba con la lista y quedaba pegada al "+"): `position: fixed`, arriba, justo debajo de la cabecera (`top: calc(var(--alto-cabecera) + env(safe-area-inset-top) + var(--espacio-2))`), centrada y con su ancho natural en una línea. Es una píldora blanca con borde, sombra y un check verde (`--color-urgencia-verde-*`), y entra deslizándose desde arriba. Con `prefers-reduced-motion` no hay transición.

**Dónde se llama:** las pantallas reciben `avisar = mostrarAviso` como dependencia, para sustituirla en las pruebas.
- `formulario.js`, tras guardar bien, antes de navegar: "Producto guardado". Tras eliminar: "Producto eliminado".
- `detalle.js`, tras eliminar: "Producto eliminado".
- `listado.js`, tras eliminar deslizando: "Producto eliminado".

**Indicador de carga:**
- `conIndicadorDeCarga(contenedor, promesa, { retraso = 300 })`. Si la promesa no termina en `retraso` ms, pone en el contenedor `<p class="cargando" role="status">Cargando…</p>`. Al terminar, haya ido bien o mal, lo quita, y la pantalla pinta su resultado.
- Lo usan `cargar()` del Listado, del Detalle y del formulario en edición. El retraso se inyecta en las pruebas.

### 6. Revisión visual

Cambios concretos, comparados con los mockups:

| Pantalla | Cambio |
|---|---|
| Listado | Texto de la pestaña "Pronto" en `--color-urgencia-naranja-texto` y de "Caducadas" en `--color-urgencia-rojo-texto`. La activa conserva el subrayado azul |
| Detalle | Cada dato (Cantidad, Categoría, Comprado) con un icono de Lucide a la izquierda (`package`, `refrigerator`/`archive` según la categoría, `calendar`) y la categoría como etiqueta (`--color-primario-suave`) |
| Ajustes | Bloque de sincronización con el icono `cloud` grande y centrado sobre "Google Drive", el estado y el botón, como en el mockup |
| Todas | `@media (hover: hover)`: fondo más oscuro al pasar el ratón por `.btn`, `.tarjeta--producto`, `.foto`, las pestañas y `.cabecera__accion`. `:active` donde aún falte (pestañas, `.foto`, navegación inferior) |

Los iconos nuevos van en `iconos.js`, de Lucide con licencia ISC.

### 7. Fotos predeterminadas

Se editan a mano, con el mismo lienzo de 96×96 y la misma sombra:

- **`platano.svg`:** un racimo de dos plátanos curvados, con degradado de dos amarillos, el tallo verde-marrón y las puntas oscuras, que se reconozca también a 48 px.
- **`yogur.svg` y `leche.svg`:** el envase blanco gana un contorno gris medio (`#94A3B8`) para distinguirse del fondo gris de las casillas.
- **`mantequilla.svg` y `embutido.svg`:** se escalan hasta ocupar el mismo ancho visual que las demás (unos 60–70 px de los 96).

Se revisan con una captura de Elegir foto y de una tarjeta de 48 px.

### 8. Cierre de calidad

**Mensajes de error:** se hace un inventario con `grep` de los textos que ve el usuario (`textContent`, `text:`, `MENSAJES`) y se comprueba que todos estén en español, sin textos técnicos (`Error:`, códigos HTTP, `undefined`). Se añade una prueba en Node que recorre los módulos y falla si algún texto que se pinta incluye `error.message` (los mensajes técnicos van solo a `console`). Lo que falte se corrige.

**Limpieza:**
- comentarios obsoletos: `grep` de "llegarán", "pendiente", "Próximamente", "todavía no";
- reglas CSS sin uso: un script de un solo uso compara las clases de `styles.css` con las usadas en `src/js` e `index.html` y se borran las que sobran;
- las entradas "(pendiente)" del README.

**Criterios de SPEC.md §10:** cada uno se comprueba con las pruebas existentes o a mano, y se marca `[x]` en SPEC.md. Instalarla en Android e iOS es manual.

**Workflow de despliegue (aviso "Node.js 20 is deprecated"):** el aviso no lo provoca `node-version: 22`, sino las *actions* que se ejecutan con Node 20. Versiones comprobadas el 2026-11-21 en los `action.yml` de cada repositorio:

| *Action* | Ahora | Pasa a | Se ejecuta con |
|---|---|---|---|
| `actions/checkout` | v4 | v7 | node24 |
| `actions/setup-node` | v4 | v7 | node24 |
| `actions/configure-pages` | v5 | v6 | node24 |
| `actions/upload-pages-artifact` | v3 | v5 | compuesta, con `upload-artifact@v7` (node24) |
| `actions/deploy-pages` | v4 | v5 | node24 |

- `node-version` pasa de 22 a 24, la misma versión que se usa en local para `npm test` y para `generar-config-local.mjs`.
- `upload-pages-artifact` excluye los archivos ocultos desde la v4. `src/` no tiene ninguno, así que no cambia lo que se publica.
- Antes de subirlo se revisan las notas de cada versión mayor por si cambia alguna entrada que usamos (`path` y `node-version`).
- Fijarlas por SHA y `persist-credentials: false` siguen en `endurecimiento-seguridad`: allí se fijarán estas mismas versiones.

**Iconos PWA:** se comprueba el manifest (192, 512 y *maskable*) y `apple-touch-icon`. Solo se tocan si al instalar se ven recortados o borrosos.

### 9. Estrategia de pruebas (TDD)

| Qué | Dónde |
|---|---|
| `avisoPendiente(estado)` | Node: `tests/sincronizacion.test.js` |
| Textos cortos de `resumirUrgentes` | Node: `tests/productos.test.js` (actualizar las pruebas de `expiry-alerts`) |
| Ningún texto que se pinta usa `error.message` | Node: `tests/avisos.test.js` o un `tests/calidad.test.js` nuevo |
| `crearAvisoSincronizacion` y el aviso en el Listado (con un sincronizador doble) | Navegador: `tests/navegador/estado-sincronizacion.test.js` y `listado.test.js` |
| "Cabe en dos líneas" del aviso de caducidad (con estilos) | Navegador: `tests/navegador/listado.test.js` |
| Zona de foto compacta, botones en fila y "Alta sin scroll" (con estilos) | Navegador: `tests/navegador/formulario.test.js` |
| Foto 4:3 y visor (abrir, Cerrar, Escape, clic fuera, sin visor en las predeterminadas) | Navegador: `tests/navegador/detalle.test.js` |
| `mostrarAviso` y `conIndicadorDeCarga` | Navegador: `tests/navegador/feedback.test.js` (nuevo) |
| Avisos breves tras guardar o eliminar e indicador en las pantallas (dobles `avisar` y `listar` lentos) | Navegador: formulario, detalle y listado |
| Pestañas de color, iconos del Detalle, Ajustes, estados al pasar el ratón y SVG de los productos | **Visual** con `captura-app.mjs` (no se prueba el CSS con aserciones salvo la medida del alta y del aviso) |
| Instalación en Android e iOS, iconos instalados y criterios de §10 que no estén cubiertos | **Manual** en el móvil |

## Risks / Trade-offs

- [El alta no cabe en móviles más bajos de 844 px, como el iPhone SE de 667 px] → El objetivo pactado es 390×844. En pantallas menores se hace scroll y la fila de botones sigue fija, así que "Guardar" siempre se ve.
- [Con el teclado abierto siempre habrá scroll] → Es inevitable y aceptable: la medida se toma sin teclado.
- [Los avisos breves pueden tapar contenido un momento] → Duran 3 segundos, no bloquean toques (`pointer-events: none`) y quedan por encima de la navegación.
- [Un aviso de sincronización persistente puede molestar si el usuario no quiere sincronizar] → Solo sale con cambios pendientes de verdad. Si molesta, se valora un ✕ en una revisión posterior.
- [La comprobación de CSS sin uso puede borrar clases que se añaden de forma dinámica (`urgencia--${nivel}`)] → El script lista los candidatos y se revisan a mano antes de borrar.

## Migration Plan

Sin migración de datos. Se despliega como siempre: push a `main`, *workflow* en verde y abrir y cerrar la app.
