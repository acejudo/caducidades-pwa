# Spec Delta

## ADDED Requirements

### Requirement: Zona de foto
La zona de foto del formulario SHALL mostrar la foto actual del formulario según `product-photos`: la imagen y su nombre si hay una foto predeterminada, o un icono de cámara con "Toca para elegir foto" si no hay foto. Al pulsarla MUST abrir Elegir foto de ese formulario. Cambiar la foto MUST contar como un cambio sin guardar para "Cancelar".

#### Scenario: Alta sin foto
- **WHEN** el usuario abre Nuevo producto
- **THEN** la zona de foto muestra el icono de cámara y "Toca para elegir foto"

#### Scenario: Edición con foto
- **WHEN** el usuario abre Editar producto de un producto con la foto "Yogur"
- **THEN** la zona de foto muestra la imagen y el nombre "Yogur"

#### Scenario: Cancelar tras cambiar la foto
- **WHEN** el usuario abre Editar producto, elige otra foto en Elegir foto y, de vuelta en el formulario, pulsa "Cancelar"
- **THEN** se pregunta "¿Descartar los cambios?"

## MODIFIED Requirements

### Requirement: Guardar
Al pulsar "Guardar" con datos válidos, la app SHALL crear el producto (Nuevo) o actualizarlo (Editar) en el almacenamiento local, también sin conexión, y volver al Listado, donde MUST aparecer ya con los datos nuevos. Mientras guarda, el botón MUST quedar desactivado para evitar guardados duplicados. Se MUST guardar la foto que muestra la zona de foto; en Editar, si no se eligió otra, se conserva la que tenía el producto.

#### Scenario: Alta correcta
- **WHEN** el usuario rellena "Yogur" con caducidad dentro de 5 días y pulsa "Guardar"
- **THEN** se crea el producto, se muestra el Listado y "Yogur" aparece en él

#### Scenario: Edición correcta
- **WHEN** el usuario cambia la cantidad de un producto a 3 y pulsa "Guardar"
- **THEN** el producto queda guardado con cantidad 3 y el mismo id, y se muestra el Listado

#### Scenario: Alta con foto
- **WHEN** el usuario elige la foto "Yogur" en Nuevo producto, rellena el resto y pulsa "Guardar"
- **THEN** el producto se guarda con `foto: { tipo: "predeterminada", valor: "yogur" }`

#### Scenario: Cambiar la foto en la edición
- **WHEN** el usuario edita un producto con la foto "Leche", elige "Sin foto" y pulsa "Guardar"
- **THEN** el producto se guarda con `foto: { tipo: "ninguna", valor: null }`

#### Scenario: Edición sin tocar la foto
- **WHEN** el usuario edita un producto con la foto "Leche", cambia solo el nombre y pulsa "Guardar"
- **THEN** el producto conserva la foto "Leche"

#### Scenario: Doble pulsación
- **WHEN** el usuario pulsa "Guardar" dos veces seguidas en un alta válida
- **THEN** se crea un único producto

#### Scenario: Fallo al guardar
- **WHEN** el almacenamiento local falla al guardar
- **THEN** el formulario sigue abierto con lo escrito, muestra "No se pudo guardar el producto. Inténtalo de nuevo." y el botón "Guardar" vuelve a estar disponible

### Requirement: Borrador al elegir foto
Al pulsar la zona de foto, el formulario SHALL guardar en memoria lo escrito y la foto actual, y abrir Elegir foto. Al volver a ese mismo formulario (el alta, o la edición del mismo producto) MUST recuperar lo escrito y la foto, o la foto elegida en Elegir foto si se eligió una. Guardar, cancelar o eliminar MUST descartar el borrador.

#### Scenario: Ir a Elegir foto y volver
- **WHEN** el usuario escribe "Pollo" en Nuevo producto, pulsa la zona de foto y después vuelve
- **THEN** el formulario muestra "Pollo" en el nombre

#### Scenario: Volver sin elegir conserva la foto
- **WHEN** el formulario tiene la foto "Queso", el usuario pulsa la zona de foto y vuelve con la flecha sin elegir nada
- **THEN** el formulario sigue mostrando la foto "Queso"

#### Scenario: Borrador descartado al guardar
- **WHEN** tras recuperar el borrador el usuario guarda el producto y después abre de nuevo Nuevo producto
- **THEN** el formulario aparece vacío y sin foto
