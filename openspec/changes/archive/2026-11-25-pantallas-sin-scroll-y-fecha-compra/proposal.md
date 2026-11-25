# Proposal

## Why

En el móvil, con las barras del sistema y del navegador, el alto útil de la pantalla es menor que los 844 px que usaban las specs como referencia. Por eso Editar producto y Ajustes se desplazan un poco aunque casi todo quepa, lo que resulta molesto. Además, casi siempre se da de alta un producto el mismo día que se compra, así que la fecha de compra debería venir ya rellena con la de hoy y poder quitarse si no se conoce.

## What Changes

**Pantallas sin scroll a 390×740:**
- La referencia pasa de 390×844 a 390×740 para Nuevo producto, Editar producto y Ajustes. Las tres caben sin scroll, sin teclado y sin perder el tamaño táctil mínimo.
- Ajustes se compacta: el bloque de Google Drive pasa a una fila, hay menos separación entre bloques y desaparece el margen inferior sobrante.
- Si hace falta, el formulario reduce algún espaciado.

**Eliminar en la cabecera de Editar producto:**
- "Eliminar" deja de ir al final del formulario.
- Pasa a un icono de papelera en la cabecera, a la derecha del título "Editar producto", con el nombre accesible "Eliminar producto" y la misma confirmación de antes.
- Solo aparece cuando el producto se ha cargado: ni en el alta ni con un producto inexistente.

**Fecha de compra:**
- En Nuevo producto, la fecha de compra viene rellena con la fecha de hoy.
- Junto al campo, en la misma fila y sin añadir alto, hay un botón ✕ "Quitar fecha de compra" que la deja vacía. Después se puede volver a elegir una fecha.
- El botón también está en Editar producto, que muestra la fecha guardada o el campo vacío. Solo el alta se rellena con hoy.
- Una fecha vaciada se conserva al ir a Elegir foto y volver, y se guarda como "sin fecha de compra".
- Abrir el alta y cancelar sin tocar nada no cuenta como cambio sin guardar.

## Capabilities

### New Capabilities

### Modified Capabilities
- `product-form`:
  - "Campos del formulario": la fecha de compra viene rellena en el alta y lleva el botón para quitarla; Eliminar ya no está entre los botones del formulario.
  - "Eliminar desde la edición": Eliminar es la papelera de la cabecera.
  - "Alta en una sola pantalla": la referencia es 390×740, y vale también para la edición.
  - Requisito nuevo "Quitar la fecha de compra".
- `ui-theme`: requisito nuevo "Ajustes en una sola pantalla".

## Impact

**Código:**
- `src/js/formulario.js`:
  - dependencia `hoy` para el alta;
  - botón para quitar la fecha;
  - devuelve `accionCabecera`, el botón de papelera, y deja de pintar Eliminar al final.
- `src/js/productos.js`: fecha local de hoy en `YYYY-MM-DD`, que es lógica pura.
- `src/js/ui.js`: pinta en la cabecera la acción que devuelve la pantalla.
- `src/js/ajustes.js` (nuevo, en `SHELL_FILES`): la pantalla de Ajustes pasa a su propio módulo con dependencias inyectables, como las demás pantallas, para poder probarla.
- `src/css/styles.css`: fila de la fecha, papelera de la cabecera, Ajustes compacto y espaciados del formulario.
- `docs/SPEC.md` y `docs/DESIGN.md`: dónde va Eliminar, la fecha de compra por defecto y la referencia de 390×740.

**Pruebas:**
- En Node: `tests/productos.test.js`.
- En el navegador: `tests/navegador/formulario.test.js` y un archivo nuevo, `tests/navegador/ajustes.test.js`.

**Sin cambios** en el almacenamiento, la sincronización, la CSP ni las dependencias.
