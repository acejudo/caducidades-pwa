## ADDED Requirements

### Requirement: Volver sin guardar
La flecha de volver de Nuevo producto y Editar producto SHALL volver a la pantalla anterior sin guardar. Si el usuario ha cambiado algún campo o la foto, MUST preguntar antes "¿Descartar los cambios?" y solo salir si lo confirma. Salir así MUST descartar el borrador.

#### Scenario: Volver sin cambios
- **WHEN** el usuario abre Nuevo producto y pulsa la flecha de volver sin tocar nada
- **THEN** vuelve al Listado sin ninguna pregunta, aunque la fecha de compra venga rellena

#### Scenario: Volver con cambios y seguir editando
- **WHEN** el usuario ha escrito un nombre, pulsa la flecha de volver y en la pregunta elige seguir editando
- **THEN** sigue en el formulario con el nombre escrito

#### Scenario: Volver con cambios y descartar
- **WHEN** el usuario ha escrito un nombre, pulsa la flecha de volver y confirma descartar
- **THEN** vuelve al Listado y no se guarda nada

### Requirement: Foto sugerida por el nombre
Mientras el usuario escribe el nombre, si la foto del formulario no la ha elegido él (ni en Elegir foto, ni con "Sin foto", ni es una foto real) y no es la foto que ya tenía el producto, el formulario SHALL mostrar la foto que sugiere `product-photos` para ese nombre, o ninguna si no hay sugerencia. Una foto elegida por el usuario MUST NOT sustituirse nunca por una sugerencia. Esta preferencia MUST conservarse al ir a Elegir foto y volver.

#### Scenario: Sugerencia al escribir
- **WHEN** el usuario abre Nuevo producto y escribe "Pechuga de pollo"
- **THEN** la miniatura muestra la foto "Pollo", y al guardar el producto queda con `foto: { tipo: "predeterminada", valor: "pollo" }`

#### Scenario: La sugerencia cambia con el nombre
- **WHEN** el usuario escribe "Pollo", que sugiere "Pollo", y lo cambia por "Kiwi", que no tiene sugerencia
- **THEN** la miniatura vuelve a la cámara, sin foto

#### Scenario: Foto elegida a mano
- **WHEN** el usuario elige la foto "Queso" en Elegir foto y después escribe "Leche" en el nombre
- **THEN** la miniatura sigue mostrando "Queso"

#### Scenario: Sin foto elegida a mano
- **WHEN** el usuario pulsa "Sin foto" en Elegir foto y después escribe "Leche"
- **THEN** la miniatura sigue sin foto

#### Scenario: Edición conserva su foto
- **WHEN** el usuario edita un producto con la foto "Yogur" y cambia el nombre a "Leche"
- **THEN** el producto conserva la foto "Yogur"

#### Scenario: Edición sin foto
- **WHEN** el usuario edita un producto sin foto llamado "Producto" y cambia el nombre a "Huevos"
- **THEN** la miniatura muestra la foto "Huevos"

### Requirement: Plazos rápidos de caducidad
Bajo la Fecha de caducidad, el formulario SHALL ofrecer los botones "+3 días", "+1 semana", "+2 semanas" y "+1 mes", con el tamaño táctil mínimo, que MUST rellenar la fecha sumando ese plazo a hoy; "+1 mes" va al mismo día del mes siguiente o, si no existe, a su último día. El botón cuyo plazo coincide con la fecha MUST verse marcado y anunciarse como pulsado. Junto a la etiqueta SHALL verse el texto relativo de `product-model` de la fecha ("En 7 días"), con el color de su urgencia.

#### Scenario: Una semana
- **WHEN** hoy es 2026-11-25 y el usuario pulsa "+1 semana"
- **THEN** la fecha de caducidad es 02/12/2026, "+1 semana" está marcado y se ve "En 7 días"

#### Scenario: Un mes desde el día 31
- **WHEN** hoy es 2027-01-31 y el usuario pulsa "+1 mes"
- **THEN** la fecha de caducidad es 28/02/2027

#### Scenario: Plazo y error
- **WHEN** el usuario pulsa "Guardar" sin fecha de caducidad y después pulsa "+3 días"
- **THEN** desaparece el mensaje "La fecha de caducidad es obligatoria"

#### Scenario: Fecha elegida a mano
- **WHEN** el usuario elige en el calendario una fecha que no coincide con ningún plazo
- **THEN** ningún botón de plazo está marcado y se ve el texto relativo de esa fecha

### Requirement: Notas plegadas
En lugar del campo Notas, el formulario SHALL mostrar un botón "Añadir notas (opcional)". Al pulsarlo MUST mostrarse el campo Notas y pasar el foco a él. Si las notas no están vacías (la edición de un producto con notas, o un borrador con notas), el campo MUST verse ya desplegado. Plegar o desplegar no cuenta como un cambio sin guardar.

#### Scenario: Alta con las notas plegadas
- **WHEN** el usuario abre Nuevo producto
- **THEN** ve "Añadir notas" y no el campo Notas

#### Scenario: Desplegar las notas
- **WHEN** el usuario pulsa "Añadir notas", escribe "Abrir y agitar" y guarda
- **THEN** el producto se guarda con esas notas

#### Scenario: Edición con notas
- **WHEN** el usuario edita un producto con notas
- **THEN** el campo Notas se ve desplegado con su texto

## MODIFIED Requirements

### Requirement: Campos del formulario
Nuevo producto y Editar producto SHALL mostrar, en este orden:
- en una misma fila, la miniatura de la foto y el campo Nombre;
- Fecha de compra (opcional), con su botón para quitarla;
- Fecha de caducidad (obligatoria), con los plazos rápidos;
- "Dónde lo guardas": un selector de cuatro opciones siempre a la vista (Nevera, Congelador, Despensa y Otros), que se guarda en la categoría del producto;
- Cantidad, con botones − y + junto a un desplegable de unidad (ud, pack, kg, g, l, ml);
- las notas plegadas.

Cada campo MUST tener su etiqueta visible; los obligatorios llevan `*` y los opcionales "(opcional)". En Nuevo producto, la fecha de compra MUST venir rellena con la fecha de hoy del dispositivo.

#### Scenario: Formulario de alta vacío
- **WHEN** el usuario abre Nuevo producto el 25 de noviembre de 2026
- **THEN** ve los campos en ese orden, con la fecha de compra 25/11/2026, el nombre y la fecha de caducidad vacíos, cantidad 1, unidad "ud", "Nevera" seleccionada, "Añadir notas" y el botón "Guardar", sin "Cancelar" ni "Eliminar"

#### Scenario: Formulario de edición relleno
- **WHEN** el usuario abre Editar producto de un producto existente
- **THEN** ve todos sus datos en los campos, su ubicación seleccionada, el botón "Guardar" y la papelera "Eliminar producto" en la cabecera

#### Scenario: Edición sin fecha de compra
- **WHEN** el usuario abre Editar producto de un producto guardado sin fecha de compra
- **THEN** el campo Fecha de compra está vacío; no se rellena con la fecha de hoy

#### Scenario: Unidad fuera de la lista
- **WHEN** se edita un producto guardado con una unidad que no está en la lista (por ejemplo, "bote")
- **THEN** el desplegable incluye esa unidad, la muestra seleccionada y se conserva al guardar

#### Scenario: Elegir dónde se guarda
- **WHEN** el usuario toca "Congelador" en Nuevo producto, rellena el resto y guarda
- **THEN** el producto se guarda con la categoría "Congelador"

### Requirement: Zona de foto
La zona de foto del formulario SHALL ser una miniatura cuadrada a la izquierda del campo Nombre, con una pequeña insignia de cámara. Muestra la foto actual del formulario según `product-photos`: la imagen del catálogo, la foto real o, si no hay foto, un icono de cámara. Su nombre accesible MUST indicar la acción ("Elegir foto" sin foto, "Cambiar foto" con foto) e incluir el nombre de la foto actual ("Leche", "tu foto"). Al pulsarla MUST abrir Elegir foto de ese formulario. Cambiar la foto MUST contar como un cambio sin guardar al volver.

#### Scenario: Alta sin foto
- **WHEN** el usuario abre Nuevo producto
- **THEN** la miniatura muestra el icono de cámara y su nombre accesible empieza por "Elegir foto"

#### Scenario: Edición con foto
- **WHEN** el usuario abre Editar producto de un producto con la foto "Yogur"
- **THEN** la miniatura muestra la imagen de "Yogur" y su nombre accesible incluye "Yogur"

#### Scenario: Edición con foto real
- **WHEN** el usuario abre Editar producto de un producto con una foto real guardada en el dispositivo
- **THEN** la miniatura muestra esa foto y su nombre accesible incluye "tu foto"

#### Scenario: Cancelar tras cambiar la foto
- **WHEN** el usuario abre Editar producto, elige otra foto en Elegir foto y, de vuelta en el formulario, pulsa la flecha de volver
- **THEN** se pregunta "¿Descartar los cambios?"

### Requirement: Borrador al elegir foto
Al pulsar la zona de foto, el formulario SHALL guardar en memoria lo escrito, la foto actual y si la eligió el usuario, y abrir Elegir foto. Al volver a ese mismo formulario (el alta, o la edición del mismo producto) MUST recuperar lo escrito y la foto, o la foto elegida en Elegir foto si se eligió una. Guardar, volver descartando o eliminar MUST descartar el borrador.

#### Scenario: Ir a Elegir foto y volver
- **WHEN** el usuario escribe "Pollo" en Nuevo producto, pulsa la zona de foto y después vuelve
- **THEN** el formulario muestra "Pollo" en el nombre

#### Scenario: Volver sin elegir conserva la foto
- **WHEN** el formulario tiene la foto "Queso", el usuario pulsa la zona de foto y vuelve con la flecha sin elegir nada
- **THEN** el formulario sigue mostrando la foto "Queso"

#### Scenario: Borrador descartado al guardar
- **WHEN** tras recuperar el borrador el usuario guarda el producto y después abre de nuevo Nuevo producto
- **THEN** el formulario aparece vacío y sin foto

### Requirement: Guardar con foto real
Al guardar un producto con una foto real recién elegida, la app SHALL guardar la foto en el dispositivo y después el producto con `foto: { tipo: "real", valor: <nombre de la foto> }`. Si no se puede guardar la foto, MUST NOT guardarse el producto y MUST mostrarse "No se pudo guardar el producto. Inténtalo de nuevo.". Descartar el formulario MUST NOT dejar la foto como foto de ningún producto.

#### Scenario: Alta con foto real
- **WHEN** el usuario elige una imagen de la galería en Nuevo producto, rellena el resto y pulsa "Guardar"
- **THEN** el producto se guarda con una foto de tipo "real" y el Listado lo muestra con esa foto, también sin conexión

#### Scenario: Cancelar con foto real
- **WHEN** el usuario elige una imagen de la galería en Editar producto, pulsa la flecha de volver y confirma descartar
- **THEN** el producto conserva la foto que tenía

#### Scenario: Fallo al guardar la foto
- **WHEN** el usuario guarda un producto con foto real y el almacenamiento de fotos falla
- **THEN** el producto no se guarda, se muestra "No se pudo guardar el producto. Inténtalo de nuevo." y el formulario conserva lo escrito y la foto

### Requirement: Alta en una sola pantalla
Nuevo producto y Editar producto SHALL caber enteros, sin scroll, en una pantalla de 390×740 px: todos los campos visibles (con las notas plegadas o, si tienen texto, desplegadas) y, fijo abajo, el botón "Guardar" a todo el ancho. El formulario MUST NOT incluir ningún otro botón de acción ("Cancelar", "Eliminar") ni ningún botón después de "Guardar". Todos los controles MUST conservar el tamaño táctil mínimo.

#### Scenario: Alta sin scroll
- **WHEN** el usuario abre Nuevo producto en una pantalla de 390×740 px, sin teclado
- **THEN** ve la miniatura, todos los campos, los plazos, "Añadir notas" y "Guardar" sin desplazar la pantalla

#### Scenario: Edición sin scroll
- **WHEN** el usuario abre Editar producto de un producto con todos los campos rellenos, incluidas notas de dos líneas, en una pantalla de 390×740 px, sin teclado
- **THEN** ve la miniatura, todos los campos, las notas desplegadas y "Guardar" sin desplazar la pantalla

#### Scenario: Botones en una fila
- **WHEN** se muestra Nuevo producto o Editar producto
- **THEN** la fila fija de abajo solo tiene "Guardar", que ocupa todo su ancho, y no hay botón "Cancelar"

#### Scenario: Eliminar al final de la edición
- **WHEN** el usuario abre Editar producto
- **THEN** no hay ningún botón "Eliminar" en el formulario: está en la cabecera

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
- **WHEN** el usuario abre Nuevo producto y pulsa la flecha de volver sin cambiar nada
- **THEN** vuelve atrás sin pedir confirmación, aunque la fecha de compra venga rellena

## REMOVED Requirements

### Requirement: Cancelar
**Reason**: El botón "Cancelar" repetía la flecha de volver de la cabecera y ocupaba media fila junto a "Guardar".
**Migration**: Lo sustituye "Volver sin guardar": la flecha de volver hace la misma comprobación de cambios con la misma pregunta.
