# Proposal

## Why

El listado ya muestra los productos guardados, pero todavía no hay forma de crearlos ni de cambiarlos desde la app: solo desde la consola. Nuevo producto y Editar producto siguen siendo marcadores (`docs/SPEC.md` §5.2, `docs/DESIGN.md` §5.2). Sin este formulario la app no sirve para su uso real, y además es necesario para hacer la prueba de persistencia en el móvil que quedó pendiente de `modelo-y-almacenamiento`.

## What Changes

- **Pantallas Nuevo producto y Editar producto reales**, con el mismo formulario y el aspecto del mockup (`docs/design/grok_1792523919959.jpg`). Los campos van en el orden de `docs/SPEC.md` §5.2:
  - zona de foto;
  - nombre (obligatorio);
  - fecha de compra (opcional);
  - fecha de caducidad (obligatoria);
  - cantidad, con botones − y +, y unidad en un desplegable (ud, pack, kg, g, l, ml);
  - categoría (Nevera / Congelador / Despensa / Otros);
  - notas (opcional).
- **Validación** con las reglas de `product-model`: los errores se muestran en español junto a cada campo, se marca el campo y el foco va al primero incorrecto. Lo escrito no se pierde.
- **Guardar** crea o actualiza el producto en el almacenamiento local, también sin conexión, y vuelve al Listado. Mientras guarda, el botón queda desactivado para no duplicar el producto.
- **Cancelar** vuelve atrás. Si hay cambios sin guardar, primero pregunta "¿Descartar los cambios?".
- **Eliminar** (solo en Editar) pide confirmación y, si se confirma, elimina el producto y vuelve al Listado.
- **Diálogo de confirmación** propio, accesible y en español, que se reutilizará en otras pantallas.
- **Editar un producto que no existe** (por ejemplo, eliminado) muestra un aviso con un enlace al Listado.
- **Zona de foto**: sigue abriendo Elegir foto, que aún es un marcador. Lo escrito se conserva como borrador y se recupera al volver.
- **Botón de peligro legible**: el rojo de "Eliminar" se oscurece a `#DC2626`, porque el texto blanco sobre `#EF4444` no llega al contraste mínimo.
- Incluye la **prueba de persistencia en el móvil** pendiente de `modelo-y-almacenamiento`: crear un producto, cerrar la app y abrirla en modo avión.

**Fuera de alcance:** el selector de fotos predeterminadas y las fotos reales (el formulario no cambia el campo `foto`), la pantalla de Detalle, la sincronización con Drive y avisar de los cambios sin guardar al salir con la flecha o el botón Atrás del sistema.

## Capabilities

### New Capabilities
- `product-form`: las pantallas Nuevo producto y Editar producto: campos y valores iniciales, validación y mensajes, guardar, cancelar con confirmación, eliminar con confirmación, producto inexistente y conservación del borrador al ir a Elegir foto.

### Modified Capabilities
_(ninguna: `app-navigation` ya exige que la zona de foto abra Elegir foto, y se mantiene; el resto de requisitos de modelo y almacenamiento no cambian)_

## Impact

- **Código**:
  - `src/js/formulario.js` (nuevo): la pantalla de formulario.
  - `src/js/dialogo.js` (nuevo): el diálogo de confirmación.
  - `src/js/constantes.js`: `UNIDADES`.
  - `src/js/ui.js`: rutas Nuevo y Editar.
  - `src/css/styles.css`: campos, errores, barra de botones, diálogo y token del rojo de peligro.
  - `src/sw.js`: los dos módulos nuevos en `SHELL_FILES`.
- **Pruebas**:
  - `tests/productos.test.js`: `UNIDADES`.
  - `tests/navegador/formulario.test.js` (nuevo).
  - `tests/navegador/dialogo.test.js` (nuevo).
- **Sin dependencias nuevas** ni cambios en el modelo de datos.
