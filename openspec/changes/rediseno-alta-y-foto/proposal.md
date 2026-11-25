# Proposal

## Why

Para dar de alta un producto, lo que de verdad hay que decidir es la fecha de caducidad, pero en el formulario va en tercer lugar, por debajo de una zona de foto grande, y siempre obliga a abrir el calendario. La foto casi siempre es la ilustración que corresponde al nombre ("Leche" → leche), pero hay que elegirla a mano en otra pantalla. La categoría (Nevera, Congelador…) va en un desplegable aunque solo tiene cuatro opciones, y "Cancelar" repite lo que ya hace la flecha de volver.

En Elegir foto, "Hacer foto", "Elegir de la galería" y "Sin foto" quedan abajo, debajo de una cuadrícula larga de 3 columnas.

El rediseño se acordó con el usuario sobre un lienzo de diseño con las pantallas propuestas. Este cambio va después de `rediseno-listado`.

## What Changes

**Nuevo producto y Editar producto:**
- **Foto junto al nombre:** la zona de foto pasa a ser una miniatura cuadrada a la izquierda del Nombre, con una pequeña cámara para indicar que se puede cambiar. Al tocarla se abre Elegir foto, como ahora.
- **Foto sugerida por el nombre:** al escribir el nombre, si no se ha elegido foto a mano y el nombre contiene una del catálogo ("Pechuga de pollo" → Pollo, "Tomates" → Tomate), se pone esa ilustración. Nunca sustituye una foto elegida a mano ni una foto real.
- **Plazos rápidos:** bajo la fecha de caducidad, cuatro botones ("+3 días", "+1 semana", "+2 semanas" y "+1 mes") la rellenan a partir de hoy. Junto a la fecha se ve cuánto falta ("En 7 días").
- **Dónde lo guardas:** la categoría pasa a ser un selector de cuatro opciones a la vista (Nevera, Congelador, Despensa y Otros), con la etiqueta "Dónde lo guardas". El valor guardado no cambia.
- **Notas plegadas:** las notas se ocultan tras "Añadir notas". Si el producto ya tiene notas, se ven desplegadas.
- **Sin "Cancelar":** queda solo "Guardar", ancho, fijo abajo. La flecha de volver hace lo que hacía "Cancelar": si hay cambios, pregunta "¿Descartar los cambios?".
- **Se mantiene:** la fecha de compra, rellena con hoy y con su botón ✕, sigue visible. También la cantidad con − y + y la unidad.

**Elegir foto:**
- "Hacer foto" y "Galería" pasan arriba, en una fila, antes del buscador.
- "Sin foto" pasa a ser la primera casilla de la cuadrícula.
- La cuadrícula pasa a 4 columnas.

## Capabilities

### New Capabilities

### Modified Capabilities
- `product-form`:
  - "Campos del formulario": orden y controles nuevos.
  - "Zona de foto": miniatura junto al nombre.
  - "Alta en una sola pantalla": solo "Guardar".
  - "Borrador al elegir foto", "Guardar con foto real" y "Quitar la fecha de compra": volver en lugar de cancelar.
  - Requisitos nuevos "Volver sin guardar", "Foto sugerida por el nombre", "Plazos rápidos de caducidad" y "Notas plegadas".
  - Se elimina "Cancelar".
- `product-photos`:
  - "Pantalla Elegir foto": 4 columnas y "Sin foto" como primera casilla.
  - "Sin foto": la zona de foto vacía muestra la cámara.
  - "Hacer foto o elegirla de la galería": botones arriba.
  - Requisito nuevo "Sugerencia de foto por el nombre", que es la regla pura de coincidencia.
- `app-navigation`: requisito nuevo "Volver con cambios sin guardar", que permite a una pantalla decidir antes de que la flecha la deje.

## Impact

**Código:**
- `src/js/fotos.js`: `sugerirFoto(nombre)`, lógica pura.
- `src/js/productos.js`: `sumarPlazo(fecha, plazo)`, lógica pura.
- `src/js/formulario.js`: miniatura junto al nombre, sugerencia de foto, plazos rápidos, selector de ubicación, notas plegadas y `antesDeVolver` en lugar de "Cancelar".
- `src/js/borradores.js`: sin cambios de forma. El borrador guarda además si la foto se eligió a mano.
- `src/js/ui.js`: la flecha de volver llama a `antesDeVolver` de la pantalla, si lo hay.
- `src/js/elegir-foto.js`: orden nuevo, "Sin foto" en la cuadrícula y 4 columnas.
- `src/css/styles.css`: los estilos nuevos del formulario y de Elegir foto.
- `docs/SPEC.md` §5.2 y §5.3 y `docs/DESIGN.md` §4.3, §5.2 y §5.3.

**Pruebas:**
- En Node: `tests/fotos.test.js` y `tests/productos.test.js`.
- En el navegador: `tests/navegador/formulario.test.js` y `tests/navegador/elegir-foto.test.js`.

**Sin cambios** en el modelo guardado (la categoría y sus valores son los mismos), el almacenamiento, la sincronización, la CSP ni las dependencias.
