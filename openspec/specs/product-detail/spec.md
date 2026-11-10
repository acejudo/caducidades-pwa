# product-detail Specification

## Purpose

Define la pantalla Detalle del producto: muestra todos los datos de un producto guardado, con su foto y su urgencia, y permite editarlo o eliminarlo con confirmación.

## Requirements

### Requirement: Datos del detalle
Detalle SHALL mostrar, de arriba abajo: la foto del producto en grande, el nombre, la fecha de caducidad en español ("Caduca el 20 nov 2026") con el texto de caducidad de `product-model` en el color de su nivel de urgencia, la fecha de compra (solo si existe), la cantidad con su unidad, la categoría y las notas (solo si existen). Los textos MUST mostrarse como texto, nunca interpretarse como HTML.

#### Scenario: Detalle completo
- **WHEN** hoy es 2026-11-17 y se abre el Detalle de "Leche entera", que caduca el 2026-11-20, comprada el 2026-11-10, con cantidad 1 "ud", categoría "Nevera" y notas "Abrir y agitar"
- **THEN** se ven "Leche entera", "Caduca el 20 nov 2026", "Caduca en 3 días" en naranja, "Comprado el 10 nov 2026", "1 ud", "Nevera" y "Abrir y agitar"

#### Scenario: Sin fecha de compra ni notas
- **WHEN** se abre el Detalle de un producto sin fecha de compra y sin notas
- **THEN** no aparecen ni la fila de fecha de compra ni la sección de notas

#### Scenario: Producto caducado
- **WHEN** se abre el Detalle de un producto que caducó ayer
- **THEN** se ve "¡Caducado!" con el color rojo de urgencia

#### Scenario: Textos con marcado
- **WHEN** un producto se llama `<b>Pan</b>` y sus notas son `<i>tostar</i>`
- **THEN** el Detalle muestra literalmente `<b>Pan</b>` y `<i>tostar</i>`, sin aplicar ningún formato

### Requirement: Editar desde el detalle
Detalle SHALL ofrecer un botón "Editar" que abre Editar producto del mismo producto.

#### Scenario: Abrir la edición
- **WHEN** el usuario pulsa "Editar" en el Detalle del producto `abc`
- **THEN** se muestra Editar producto del producto `abc`

### Requirement: Eliminar desde el detalle
Detalle SHALL ofrecer un botón "Eliminar" que pide confirmación indicando el nombre del producto. Si se confirma, MUST eliminar el producto según `product-storage` y mostrar el Listado; si no, no cambia nada. Si la eliminación falla, MUST seguir en el Detalle con un mensaje de error en español.

#### Scenario: Eliminar confirmado
- **WHEN** el usuario pulsa "Eliminar" en el Detalle de "Leche" y confirma
- **THEN** "Leche" deja de existir en el almacenamiento y se muestra el Listado sin ella

#### Scenario: Eliminar cancelado
- **WHEN** el usuario pulsa "Eliminar" y en la confirmación elige no eliminar
- **THEN** sigue en el Detalle y el producto no cambia

#### Scenario: Fallo al eliminar
- **WHEN** el almacenamiento local falla al eliminar
- **THEN** el Detalle sigue abierto y muestra "No se pudo eliminar el producto. Inténtalo de nuevo."

### Requirement: Detalle de un producto inexistente
Si se abre el Detalle de un id que no existe o está eliminado (por ejemplo, al volver con Atrás tras eliminarlo), la pantalla SHALL mostrar "Este producto no existe o se ha eliminado" con un enlace al Listado, sin datos ni botones de Editar o Eliminar.

#### Scenario: Id desconocido
- **WHEN** el usuario abre el Detalle de un id que no existe
- **THEN** ve el aviso y el enlace "Volver al listado"

#### Scenario: Volver a un producto eliminado
- **WHEN** el usuario elimina un producto desde Editar producto y pulsa Atrás hasta su Detalle
- **THEN** el Detalle muestra "Este producto no existe o se ha eliminado"

### Requirement: Error al cargar el detalle
Si el producto no se puede leer del almacenamiento local, Detalle SHALL mostrar "No se pudo cargar el producto" con un botón "Reintentar" que vuelve a intentar la lectura.

#### Scenario: Reintento correcto
- **WHEN** el almacenamiento falla al abrir el Detalle, después vuelve a estar disponible y el usuario pulsa "Reintentar"
- **THEN** se muestran los datos del producto
