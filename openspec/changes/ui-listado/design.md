# Design

## Context

- `src/js/ui.js` pinta todas las pantallas. La de Listado es un marcador con un producto de ejemplo fijo (`#/producto/ejemplo`) y el botón "+" (`.fab`). `ui.js` importa `auth.js`, que importa `config.js` y, por tanto, `config.local.js`. También guarda los iconos de Lucide en un objeto `ICONOS` local.
- El router (`router.js`) llama a `ruta.render({ params })` y añade **de forma síncrona** el elemento devuelto. No hay ciclo de vida de pantalla (montar/desmontar).
- `storage.js` ofrece `listarProductos()` (asíncrono, ya ordenado y sin eliminados) y lanza `ErrorAlmacenamiento`. `productos.js` ofrece `diasRestantes`, `nivelUrgencia` y `textoCaducidad`. Ninguno de los dos importa `config.js`.
- `styles.css` ya tiene `.tarjeta` (con borde izquierdo de 4 px que toma el color de `.urgencia--*`), `.badge`, `.fab` y los tokens de `ui-theme`.
- Mockup de referencia: `docs/design/grok_1792523938257.jpg` (primera pantalla). Muestra pestañas "Todas / Pronto / Caducadas", tarjetas con foto a la izquierda, nombre, "Caduca el …", insignia de días y "Cantidad: …", y el "+" abajo a la derecha.
- Las pruebas de navegador ya existen (`tests/navegador/`, mini-runner y base de datos `caducidades-pruebas`). Ver `specs/product-list/spec.md` y el delta de `app-navigation`.

## Goals / Non-Goals

**Goals:**
- Que la pantalla Listado se pueda probar en la página de pruebas del navegador **sin `config.local.js`** y con "hoy" controlado.
- Que la lógica decidible (filtros, formato de fecha y de cantidad) sea pura y se pruebe en Node.
- Reutilizar los componentes y tokens existentes, sin rehacer el sistema visual.

**Non-Goals:**
- Actualizar el listado en vivo si otra pestaña cambia los datos.
- Paginación o lista virtual: con decenas o pocos cientos de productos no hace falta.
- Animaciones o gestos (deslizar para eliminar queda fuera de alcance).

## Decisions

### 1. Pantalla en su propio módulo, con dependencias inyectables
`src/js/listado.js` exporta `crearPantallaListado({ listar = listarProductos, hoy = () => new Date() } = {})`, que devuelve `{ elemento, cargado }`:
- `elemento` es la `<section>` que se devuelve al router de inmediato, con las pestañas y una zona de contenido que se rellena al terminar la lectura (`aria-busy="true"` mientras tanto).
- `cargado` es la promesa de la primera carga. Solo la usan las pruebas, para esperar sin temporizadores.
- `listado.js` importa solo `storage.js`, `productos.js`, `formato.js`, `iconos.js` y `utils.js`: **nunca** `ui.js`, `auth.js` ni `config.js`. Así la página de pruebas puede importarlo sin credenciales.
- `ui.js` registra `listado: () => crearPantallaListado().elemento`.
- *Alternativa descartada:* seguir pintando dentro de `ui.js`. Arrastraría `auth.js` y `config.local.js` a las pruebas, y `ui.js` ya es grande.

### 2. Iconos en `src/js/iconos.js`
Se mueve el objeto `ICONOS` de `ui.js` a `iconos.js` (`export const ICONOS`) y se añaden `producto` (cubiertos, como "Genérico" del mockup de Elegir foto) y `vacio` (cesta), ambos de Lucide (ISC). `ui.js` y `listado.js` importan de ahí. No cambia ningún icono existente.

### 3. Filtros: función pura en `productos.js`
`filtrarPorEstado(lista, filtro, hoy)`, con `filtro` = `'todas' | 'pronto' | 'caducadas'`:
- `pronto`: `0 <= diasRestantes <= URGENCIA.naranjaMaxDias` (7).
- `caducadas`: `diasRestantes < 0`.
- Conserva el orden de entrada y no modifica la lista.

El límite de "Pronto" sale de `URGENCIA` para que coincida siempre con el final del naranja. Los nombres de filtro se exportan como `FILTROS` (constante congelada con clave y texto de pestaña).

### 4. Formato en español: `src/js/formato.js` (puro)
- `formatearFecha('2026-11-20')` devuelve `'20 nov 2026'`. Se parte el texto `YYYY-MM-DD` sin crear un `Date`, así que no hay problemas de zona horaria, y se usa una **tabla de meses propia** (`ene`, `feb`, `mar`, `abr`, `may`, `jun`, `jul`, `ago`, `sept`, `oct`, `nov`, `dic`).
  - *Alternativa descartada:* `Intl.DateTimeFormat('es-ES', { month: 'short' })`. Según el motor y la versión de CLDR da "sept" o "sep." (Chrome, Safari y Node difieren), y las pruebas y la interfaz tienen que ser deterministas.
- `formatearCantidad(0.5, 'kg')` devuelve `'0,5 kg'`: coma decimal y como máximo 2 decimales, sin ceros sobrantes.

### 5. Estructura de la tarjeta
Cada producto es un `<a href="#/producto/<id codificado>" class="tarjeta tarjeta--producto urgencia--<nivel>">` con:
1. Foto: `.tarjeta__foto`, cuadrada de 56 px con radio. Contiene el icono `producto` sobre fondo gris claro mientras no haya fotos (para cualquier `foto.tipo`). El cambio de fotos la sustituirá por la imagen.
2. Nombre: `.tarjeta__nombre`.
3. Línea de caducidad: "Caduca el 20 nov 2026".
4. Insignia: `.badge`, con el texto de `textoCaducidad`.
5. Cantidad: "Cantidad: 2 ud".

Todo el texto se pone con `el()` / `textContent` (nunca `innerHTML`). El id se codifica con `encodeURIComponent` en el `href`. El enlace tiene un nombre accesible completo, porque su contenido ya es texto ("Leche entera, Caduca el…").

### 6. Insignia con fondo suave y texto oscuro
El borde izquierdo usa el color exacto de `ui-theme` (`--color-urgencia-*`). La insignia, en cambio, usa un **fondo claro y texto oscuro del mismo tono**: rojo `#FEE2E2`/`#B91C1C` (5,3:1), naranja `#FFEDD5`/`#9A3412` (6,4:1) y verde `#DCFCE7`/`#166534` (6,5:1). Se definen como tokens nuevos (`--color-urgencia-*-suave` y `--color-urgencia-*-texto`).
- *Motivo:* el texto blanco sobre los colores del mockup del listado tiene un contraste de 2,3:1 (verde), 2,8:1 (naranja) y 3,8:1 (rojo), insuficiente para texto pequeño (WCAG AA pide 4,5:1). Las combinaciones elegidas lo superan con margen, y es el mismo estilo que usa el mockup del Detalle ("Caduca en 3 días" sobre rosa).
- La clase `.badge` actual (fondo sólido) no se usa en ningún otro sitio. Se cambia a este estilo.

### 7. Pestañas de filtro
`<div role="tablist" aria-label="Filtrar productos">` con tres `<button role="tab" aria-selected>` ("Todas", "Pronto", "Caducadas"), y la lista dentro de un `role="tabpanel"`. La pestaña activa se marca con texto en color primario y subrayado, como en el mockup. Son botones de al menos 44 px de alto (`--tactil-min`).
- **Filtro conservado:** el último filtro elegido se guarda en una variable del módulo `listado.js`. Sobrevive a la navegación dentro de la app (el módulo no se recarga) y vuelve a "Todas" al recargar o reabrir la app. No hace falta guardarlo en la URL ni en `localStorage`.
- Cambiar de filtro no vuelve a leer el almacenamiento: se filtra la lista ya cargada.
- `reiniciarFiltro()` vuelve a "Todas". Solo lo usan las pruebas, para empezar cada una desde el filtro por defecto (igual que `usarBaseDeDatos` en `storage.js`).
- Las tres pestañas son enfocables con Tab. No se usa el patrón de foco único con flechas (`tabindex="-1"` en las inactivas), porque exige implementar la navegación con flechas y, sin ella, las pestañas inactivas quedarían inaccesibles con teclado.

### 8. Estados de la zona de contenido
- **Cargando:** la zona queda vacía con `aria-busy="true"`. IndexedDB responde en milisegundos, así que no se muestra un indicador para evitar parpadeos.
- **Lista:** `<ul class="lista-productos">` con un `<li>` por producto.
- **Sin productos** (la lista completa está vacía): icono `vacio`, "Todavía no hay productos" y "Pulsa + para añadir el primero". Las pestañas se ocultan, porque no tiene sentido filtrar nada.
- **Filtro sin resultados:** "No hay productos que caduquen pronto" o "No hay productos caducados". Las pestañas siguen visibles.
- **Error** (`ErrorAlmacenamiento` o cualquier otro error al listar): "No se pudieron cargar los productos" y el botón secundario "Reintentar", que repite la lectura. Se registra el error con `console.error`.

### 9. Recalcular al volver a primer plano
Mientras la sección está en el documento, un listener de `visibilitychange` vuelve a pintar la lista **con un "hoy" nuevo** (sin releer el almacenamiento) cuando `document.visibilityState === 'visible'`. Solo lo hace si la carga terminó bien: la pantalla guarda un estado explícito (`cargando`, `listo` o `error`), para no mostrar un "Todavía no hay productos" falso mientras se lee ni tapar el error. Se usa un `AbortController`. El listener se quita solo la primera vez que se dispara con la sección ya fuera del documento, el mismo patrón que la pantalla de Login usa con `online`/`offline`.
- *Alternativa descartada:* un temporizador a medianoche. No se dispara de forma fiable con la app en segundo plano en iOS.

### 10. Quitar el ejemplo y navegación
Se elimina el producto de ejemplo de `ui.js`. Detalle, Editar y Elegir foto siguen siendo marcadores. Ahora se llega a ellos pulsando un producto real (delta de `app-navigation`). El "+" y su posición no cambian.

### 11. Service Worker
Se añaden `./js/listado.js`, `./js/formato.js` y `./js/iconos.js` a `SHELL_FILES`.

### 12. Estrategia de pruebas (TDD)
- **Node (`npm test`):** `filtrarPorEstado` en `tests/productos.test.js`, y `formatearFecha`/`formatearCantidad` en `tests/formato.test.js` (nuevo).
- **Runner:** hoy `antesDeCada` es un único gancho global, y el último que se registra sustituye a los anteriores. Con dos archivos de pruebas, el gancho pasa a aplicarse **a las pruebas registradas después de llamarlo** (cada prueba guarda el gancho vigente al registrarse). Así cada archivo tiene el suyo, sin cambiar `storage.test.js`.
- **Navegador (`npm run test:navegador`):** `tests/navegador/listado.test.js` (nuevo, cargado desde `index.html` junto a `storage.test.js`). Cada prueba crea productos con `storage.js` en `caducidades-pruebas`, monta `crearPantallaListado({ hoy: () => HOY_FIJO })` en un contenedor oculto, espera a `cargado` y comprueba el DOM: orden, textos, clases `urgencia--*`, `href`, pestañas y `aria-selected`, estados vacíos, error (con un `listar` falso que lanza) y reintento, recálculo al simular `visibilitychange` con otro `hoy`, y que el nombre con marcado se muestra literal.
  - Las fechas de los productos de prueba se generan relativas a `HOY_FIJO` para que las pruebas no caduquen con el tiempo.
- **Manual:** el aspecto frente al mockup (en el modo dispositivo de DevTools y en el móvil), el listado vacío en el móvil con la app instalada, la navegación tocando hasta Editar con productos reales creados desde la consola y la flecha de volver. Las pruebas automáticas no cubren cómo se ve la pantalla.

## Risks / Trade-offs

- [Hasta el cambio del alta, la única forma de ver productos en la app real es crearlos desde la consola] → Se documenta el fragmento de consola en la tarea manual. Es temporal.
- [La insignia no es idéntica al mockup del listado (fondo sólido)] → Se prioriza la legibilidad (Decisión 6) y coincide con el mockup del Detalle. Si se prefiere el fondo sólido, basta con cambiar dos tokens.
- [El filtro guardado en memoria se pierde al recargar] → Es lo esperado: al abrir la app se empieza en "Todas".
- [Un `visibilitychange` con la sección ya fuera del documento] → El listener se aborta en ese momento y no pinta nada (Decisión 9).
- [Productos con nombres muy largos] → `.tarjeta__nombre` corta con puntos suspensivos en dos líneas como máximo (`-webkit-line-clamp`), para que no rompa la tarjeta.

## Migration Plan

No hay datos que migrar. Al desplegar, el Service Worker con la nueva `CACHE_VERSION` (el SHA del commit) descarga los módulos nuevos.
- **Vuelta atrás:** revertir el commit. Los productos guardados no se tocan.
