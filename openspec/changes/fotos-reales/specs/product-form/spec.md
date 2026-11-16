# Spec Delta

## MODIFIED Requirements

### Requirement: Zona de foto
La zona de foto del formulario SHALL mostrar la foto actual del formulario según `product-photos`: la imagen y su nombre si hay una foto predeterminada, la foto con el texto "Tu foto" si es una foto real, o un icono de cámara con "Toca para elegir foto" si no hay foto. Al pulsarla MUST abrir Elegir foto de ese formulario. Cambiar la foto MUST contar como un cambio sin guardar para "Cancelar".

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

### Requirement: Guardar con foto real
Al guardar un producto con una foto real recién elegida, la app SHALL guardar la foto en el dispositivo y después el producto con `foto: { tipo: "real", valor: <nombre de la foto> }`. Si no se puede guardar la foto, MUST NOT guardarse el producto y MUST mostrarse "No se pudo guardar el producto. Inténtalo de nuevo.". Descartar el formulario MUST NOT dejar la foto como foto de ningún producto.

#### Scenario: Alta con foto real
- **WHEN** el usuario elige una imagen de la galería en Nuevo producto, rellena el resto y pulsa "Guardar"
- **THEN** el producto se guarda con una foto de tipo "real" y el Listado lo muestra con esa foto, también sin conexión

#### Scenario: Cancelar con foto real
- **WHEN** el usuario elige una imagen de la galería en Editar producto y pulsa "Cancelar" y "Descartar"
- **THEN** el producto conserva la foto que tenía

#### Scenario: Fallo al guardar la foto
- **WHEN** el usuario guarda un producto con foto real y el almacenamiento de fotos falla
- **THEN** el producto no se guarda, se muestra "No se pudo guardar el producto. Inténtalo de nuevo." y el formulario conserva lo escrito y la foto
