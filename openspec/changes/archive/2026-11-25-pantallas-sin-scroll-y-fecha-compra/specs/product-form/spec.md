## MODIFIED Requirements

### Requirement: Campos del formulario
Nuevo producto y Editar producto SHALL mostrar, en este orden: zona de foto, Nombre, Fecha de compra (opcional), Fecha de caducidad (obligatoria), Cantidad con botones − y + junto a un desplegable de unidad (ud, pack, kg, g, l, ml), Categoría (Nevera, Congelador, Despensa, Otros) y Notas (opcional). Cada campo MUST tener su etiqueta visible; los obligatorios llevan `*` y los opcionales "(opcional)". En Nuevo producto, la fecha de compra MUST venir rellena con la fecha de hoy del dispositivo.

#### Scenario: Formulario de alta vacío
- **WHEN** el usuario abre Nuevo producto el 25 de noviembre de 2026
- **THEN** ve los campos en ese orden, con la fecha de compra 25/11/2026, el nombre, la fecha de caducidad y las notas vacíos, cantidad 1, unidad "ud" y categoría "Nevera", y los botones "Guardar" y "Cancelar" sin "Eliminar"

#### Scenario: Formulario de edición relleno
- **WHEN** el usuario abre Editar producto de un producto existente
- **THEN** ve todos sus datos en los campos, los botones "Guardar" y "Cancelar" y la papelera "Eliminar producto" en la cabecera

#### Scenario: Edición sin fecha de compra
- **WHEN** el usuario abre Editar producto de un producto guardado sin fecha de compra
- **THEN** el campo Fecha de compra está vacío; no se rellena con la fecha de hoy

#### Scenario: Unidad fuera de la lista
- **WHEN** se edita un producto guardado con una unidad que no está en la lista (por ejemplo, "bote")
- **THEN** el desplegable incluye esa unidad, la muestra seleccionada y se conserva al guardar

### Requirement: Eliminar desde la edición
En Editar producto, la cabecera SHALL mostrar a la derecha del título un botón con icono de papelera y nombre accesible "Eliminar producto", con el tamaño táctil mínimo. Solo MUST aparecer cuando el producto se ha cargado. Al pulsarlo SHALL pedir confirmación indicando el nombre del producto. Si se confirma, MUST eliminar el producto según `product-storage` y volver al Listado; si no, no cambia nada.

#### Scenario: Eliminar confirmado
- **WHEN** el usuario pulsa la papelera en la edición de "Leche" y confirma
- **THEN** "Leche" deja de existir en el almacenamiento y de aparecer en el Listado, que se muestra a continuación

#### Scenario: Eliminar cancelado
- **WHEN** el usuario pulsa la papelera y en la confirmación elige no eliminar
- **THEN** sigue en el formulario, el producto no cambia y el foco vuelve a la papelera

#### Scenario: Papelera solo en la edición
- **WHEN** el usuario abre Nuevo producto, o Editar producto de un id que no existe
- **THEN** la cabecera no muestra la papelera

### Requirement: Alta en una sola pantalla
Nuevo producto y Editar producto SHALL caber enteros, sin scroll, en una pantalla de 390×740 px: todos los campos visibles y, en una fila fija abajo, "Cancelar" (secundario, a la izquierda) y "Guardar" (primario, a la derecha). El formulario MUST NOT incluir ningún botón después de Notas. Todos los botones MUST conservar el tamaño táctil mínimo.

#### Scenario: Alta sin scroll
- **WHEN** el usuario abre Nuevo producto en una pantalla de 390×740 px, sin teclado
- **THEN** ve la zona de foto, todos los campos (Notas incluido) y los botones "Cancelar" y "Guardar" sin desplazar la pantalla

#### Scenario: Edición sin scroll
- **WHEN** el usuario abre Editar producto de un producto con todos los campos rellenos en una pantalla de 390×740 px, sin teclado
- **THEN** ve la zona de foto, todos los campos y los botones "Cancelar" y "Guardar" sin desplazar la pantalla

#### Scenario: Botones en una fila
- **WHEN** se muestra Nuevo producto o Editar producto
- **THEN** "Cancelar" y "Guardar" están en la misma fila, "Guardar" a la derecha

#### Scenario: Eliminar al final de la edición
- **WHEN** el usuario abre Editar producto
- **THEN** no hay ningún botón después del campo Notas: "Eliminar" ya no está al final del formulario, sino en la cabecera

## ADDED Requirements

### Requirement: Quitar la fecha de compra
Junto al campo Fecha de compra, en la misma fila, SHALL haber un botón con el icono ✕ y el nombre accesible "Quitar fecha de compra", con el tamaño táctil mínimo. Al pulsarlo, el campo MUST quedar vacío y el foco pasa al campo. Si el campo ya está vacío, el botón está desactivado. Guardar con la fecha vacía MUST guardar el producto sin fecha de compra.

#### Scenario: Alta sin fecha de compra
- **WHEN** el usuario abre Nuevo producto, pulsa "Quitar fecha de compra", rellena nombre y fecha de caducidad y guarda
- **THEN** el producto se guarda sin fecha de compra

#### Scenario: Volver a elegir una fecha
- **WHEN** el usuario quita la fecha de compra y después elige el 20/11/2026
- **THEN** el botón vuelve a estar activo y el producto se guarda con fecha de compra 2026-11-20

#### Scenario: Sin alto añadido
- **WHEN** se muestra el formulario
- **THEN** el botón está en la misma fila que el campo Fecha de compra y la fila no es más alta que la de Fecha de caducidad

#### Scenario: Fecha vaciada en el borrador
- **WHEN** el usuario quita la fecha de compra, va a Elegir foto y vuelve
- **THEN** la fecha de compra sigue vacía y el botón está desactivado

#### Scenario: Cancelar el alta sin tocar nada
- **WHEN** el usuario abre Nuevo producto y pulsa "Cancelar" sin cambiar nada
- **THEN** vuelve atrás sin pedir confirmación, aunque la fecha de compra venga rellena
