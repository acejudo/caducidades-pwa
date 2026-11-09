# Proposal

## Why

Ya existen el modelo y el almacenamiento local de productos (`product-model`, `product-storage`), pero la pantalla principal sigue siendo un marcador con un producto de ejemplo fijo. Listado es la pantalla que más se usa (`docs/SPEC.md` §5.1, `docs/DESIGN.md` §5.1): es donde se ve de un vistazo qué hay que consumir primero. Va antes que el alta y el detalle porque fija cómo se presentan los productos y su urgencia.

## What Changes

- **Pantalla Listado real** a partir de los productos guardados en el dispositivo (`listarProductos`), ordenados por fecha de caducidad, con el aspecto del mockup de `docs/design/`.
- **Tarjeta de producto**: foto (por ahora un icono genérico, porque aún no hay fotos), nombre, fecha de caducidad ("Caduca el 20 nov 2026"), insignia con los días restantes ("Caduca en 3 días", "¡Caducado!"…), cantidad ("Cantidad: 2 ud") y borde izquierdo con el color de urgencia (rojo, naranja o verde).
- **Filtros por estado** en pestañas: **Todas**, **Pronto** (caducan hoy o en los próximos 7 días y aún no han caducado) y **Caducadas** (fecha ya pasada). El filtro elegido se mantiene al volver del Detalle.
- **Botón flotante "+"** que abre Nuevo producto (sigue siendo un marcador).
- **Pulsar un producto** abre su Detalle (`#/producto/<id>`), que sigue siendo un marcador.
- **Estados vacíos**: sin ningún producto ("Todavía no hay productos", con una invitación a pulsar "+"), y sin productos en el filtro elegido (mensaje propio de Pronto y de Caducadas).
- **Error al leer el almacenamiento**: mensaje y botón "Reintentar", sin dejar la pantalla en blanco.
- **Días restantes al día**: al volver a la app (por ejemplo, al día siguiente) el listado se recalcula.
- Se **quita el producto de ejemplo** del listado. El recorrido tocando hasta Detalle y Editar pasa a hacerse con productos reales.

**Fuera de alcance:** formulario de alta y edición, selector de fotos y fotos reales, eliminar desde el listado (deslizar, `docs/SPEC.md` §5.1; irá con el Detalle o después), filtro por categoría, icono y estado de sincronización en la cabecera, y sincronización con Drive.

## Capabilities

### New Capabilities
- `product-list`: la pantalla Listado: qué productos muestra y en qué orden, qué información y qué indicador de urgencia lleva cada uno, los filtros por estado, los estados vacíos y de error, y la navegación al alta y al detalle.

### Modified Capabilities
- `app-navigation`: el requisito "Recorrido completo tocando" deja de depender de un producto de ejemplo fijo en Listado. Detalle y Editar se alcanzan pulsando un producto real de la lista.

## Impact

- **Código**:
  - `src/js/listado.js` (nuevo): la pantalla Listado.
  - `src/js/formato.js` (nuevo): formato de fechas y cantidades en español.
  - `src/js/iconos.js` (nuevo): los iconos que hoy están dentro de `ui.js`.
  - `src/js/productos.js`: filtro por estado.
  - `src/js/ui.js`: usa la pantalla nueva y los iconos del módulo nuevo.
  - `src/css/styles.css`: pestañas, tarjeta con foto, insignia y estados vacíos.
  - `src/sw.js`: añadir los tres módulos nuevos a `SHELL_FILES`.
- **Pruebas**: `tests/productos.test.js`, `tests/formato.test.js` (nuevo) y `tests/navegador/listado.test.js` (nuevo).
- **Sin dependencias nuevas.** No cambia el modelo de datos ni el almacenamiento.
