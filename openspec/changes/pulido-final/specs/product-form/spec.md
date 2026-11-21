# Spec Delta

## MODIFIED Requirements

### Requirement: Zona de foto
La zona de foto del formulario SHALL ser una fila compacta con la foto actual del formulario según `product-photos`: una miniatura cuadrada y su nombre si hay una foto predeterminada, la miniatura de la foto con el texto "Tu foto" si es una foto real, o un icono de cámara con "Toca para elegir foto" si no hay foto. Al pulsarla MUST abrir Elegir foto de ese formulario. Cambiar la foto MUST contar como un cambio sin guardar para "Cancelar".

#### Scenario: Alta sin foto
- **WHEN** el usuario abre Nuevo producto
- **THEN** la zona de foto muestra el icono de cámara y "Toca para elegir foto"

#### Scenario: Edición con foto
- **WHEN** el usuario abre Editar producto de un producto con la foto "Yogur"
- **THEN** la zona de foto muestra la imagen y el nombre "Yogur"

#### Scenario: Edición con foto real
- **WHEN** el usuario abre Editar producto de un producto con una foto real guardada en el dispositivo
- **THEN** la zona de foto muestra esa foto y "Tu foto"

#### Scenario: Cancelar tras cambiar la foto
- **WHEN** el usuario abre Editar producto, elige otra foto en Elegir foto y, de vuelta en el formulario, pulsa "Cancelar"
- **THEN** se pregunta "¿Descartar los cambios?"

## ADDED Requirements

### Requirement: Alta en una sola pantalla
Nuevo producto SHALL caber entero, sin scroll, en una pantalla de 390×844 px: todos los campos visibles y, en una fila fija abajo, "Cancelar" (secundario, a la izquierda) y "Guardar" (primario, a la derecha). En Editar producto, "Eliminar" MUST ir al final del formulario, debajo de Notas, y no en la fila fija. Todos los botones MUST conservar el tamaño táctil mínimo.

#### Scenario: Alta sin scroll
- **WHEN** el usuario abre Nuevo producto en una pantalla de 390×844 px, sin teclado
- **THEN** ve la zona de foto, todos los campos (Notas incluido) y los botones "Cancelar" y "Guardar" sin desplazar la pantalla

#### Scenario: Botones en una fila
- **WHEN** se muestra Nuevo producto o Editar producto
- **THEN** "Cancelar" y "Guardar" están en la misma fila, "Guardar" a la derecha

#### Scenario: Eliminar al final de la edición
- **WHEN** el usuario abre Editar producto
- **THEN** "Eliminar" aparece después del campo Notas y no en la fila de "Cancelar" y "Guardar"
