# Proposal

## Why

El Listado actual muestra unos cuatro productos por pantalla. Cada tarjeta ocupa cuatro líneas y repite la urgencia tres veces (borde, *badge* y color de la pestaña), así que cuando hay varios caducados todo es rojo y el color deja de destacar. Lo que más importa, cuánto le queda a cada producto, hay que deducirlo de una fecha absoluta, y "Cantidad: 1 ud" ocupa una línea entera casi siempre con el mismo valor. Además, la barra inferior solo tiene dos accesos (Listado y Ajustes) y resta alto a la lista.

El rediseño se acordó con el usuario sobre un lienzo de diseño con las pantallas propuestas.

## What Changes

**Listado agrupado:**
- La lista se divide en secciones con cabecera y contador: "Caducados", "Esta semana" y "Más adelante". Solo se muestran las secciones con productos.
- Los filtros pasan a ser "Todos", "Caducados" y "Esta semana", cada uno con el número de productos ("Caducados · 3"). Las claves internas (`todas`, `caducadas`, `pronto`) no cambian, así que el aviso de caducidad sigue llevando al filtro correcto.

**Filas compactas:**
- Cada producto ocupa una fila de dos líneas: imagen, nombre y, debajo, el tiempo relativo coloreado por urgencia ("Hace 4 días", "Hoy", "En 7 días") y la fecha corta ("21 nov").
- La cantidad solo aparece, a la derecha, si no es "1 ud".
- Desaparecen el borde de color y el *badge*: la urgencia la marca el color del tiempo relativo, que siempre va con su texto.

**Búsqueda:**
- Un buscador "Buscar producto" filtra por nombre, sin distinguir mayúsculas ni acentos, a la vez que el filtro activo.

**Navegación:**
- Desaparece la barra de navegación inferior.
- Ajustes se abre con un icono en la cabecera del Listado, junto al estado de sincronización, y tiene flecha de volver al Listado.
- El botón flotante pasa a ser "Añadir" (icono + y texto) y la lista deja hueco al final para que no tape la última fila.

**Se mantiene:**
- Deslizar una fila a la izquierda sigue mostrando "Eliminar", con la misma confirmación.
- El Detalle sigue usando "¡Caducado!", "Caduca hoy"… El texto relativo nuevo es solo para el Listado.

## Capabilities

### New Capabilities

### Modified Capabilities
- `product-model`: requisitos nuevos "Texto relativo de caducidad" y "Sección de caducidad".
- `product-list`:
  - "Información de cada producto": fila compacta, tiempo relativo, fecha corta y cantidad solo si no es 1 ud.
  - "Indicador de urgencia": el color va en el tiempo relativo.
  - "Filtros por estado": textos nuevos y contador.
  - "Estados vacíos", "Error al cargar los productos", "Navegación desde el listado" y "Días restantes actualizados": botón "Añadir", sin barra inferior y texto relativo.
  - Requisitos nuevos "Secciones del listado", "Búsqueda por nombre" y "Añadir sin tapar la lista".
- `app-navigation`:
  - Se elimina "Navegación inferior".
  - Requisito nuevo "Acceso a Ajustes".
  - "Flecha de volver en pantallas secundarias" incluye Ajustes.
  - "Recorrido completo tocando" usa "Añadir" y el icono de Ajustes.
- `ui-theme`: "Ajustes en una sola pantalla", "Ajustes en una sola pantalla" y "Respeto de zonas seguras" ya no cuentan con la barra inferior; "Tamaño táctil mínimo" se sustituye por "Zona táctil mínima", que mide el acceso a Ajustes en lugar de la barra.
- `ui-feedback`: "Aviso breve tras guardar o eliminar" nombra el botón "Añadir".
- `expiry-alerts`: "Tocar el aviso" usa los nombres nuevos de los filtros.

## Impact

**Código:**
- `src/js/productos.js`: `textoRelativo`, `seccionCaducidad`, `agruparPorSeccion`, `buscarPorNombre` y `contarPorFiltro`, todo lógica pura. Textos nuevos de `FILTROS`.
- `src/js/formato.js`: `formatearFechaCorta`, lógica pura.
- `src/js/listado.js`: secciones, filas compactas, buscador, contadores, botón "Añadir" y `accionCabecera` con el acceso a Ajustes.
- `src/js/app.js`: sin `mostrarNav`; Ajustes con `padre: '/listado'`.
- `src/js/ui.js`: se quitan `NAV` y `pintarNav`.
- `src/index.html`: se quita `<nav id="nav-inferior">`.
- `src/css/styles.css`: filas, cabeceras de sección, buscador, filtros con contador y botón "Añadir"; se quitan los estilos de la barra inferior y `app--con-nav`.
- `docs/SPEC.md` §5.1 y `docs/DESIGN.md` §4.2, §4.4, §5.1 y §5.5.

**Pruebas:**
- En Node: `tests/productos.test.js` y `tests/formato.test.js`.
- En el navegador: `tests/navegador/listado.test.js`, `tests/navegador/ajustes.test.js` y `tests/navegador/marco.test.js` (si dependen de la barra inferior).

**Sin cambios** en el modelo guardado, el almacenamiento, la sincronización, la CSP ni las dependencias.
