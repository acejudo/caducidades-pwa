## MODIFIED Requirements

### Requirement: Aviso breve tras guardar o eliminar
Tras guardar un producto (alta o edición), la app SHALL mostrar un aviso breve "Producto guardado"; tras eliminarlo, desde cualquier pantalla, "Producto eliminado". El aviso MUST verse arriba, justo debajo de la cabecera, como una píldora centrada con un check, sin tapar el botón "Añadir"; anunciarse a los lectores de pantalla y desaparecer solo a los 3 segundos. Si llega otro aviso, MUST sustituir al anterior.

#### Scenario: Guardar un producto
- **WHEN** el usuario guarda "Yogur" en Nuevo producto
- **THEN** vuelve al Listado y se ve "Producto guardado" durante unos 3 segundos

#### Scenario: Eliminar desde el Listado
- **WHEN** el usuario elimina "Leche" deslizando su fila y confirma
- **THEN** se ve "Producto eliminado"

#### Scenario: Eliminar desde el Detalle
- **WHEN** el usuario elimina un producto desde su Detalle y confirma
- **THEN** vuelve al Listado y se ve "Producto eliminado"

#### Scenario: Error al guardar
- **WHEN** guardar falla
- **THEN** no se muestra "Producto guardado"; se mantiene el mensaje de error del formulario

#### Scenario: Dos avisos seguidos
- **WHEN** se muestra un aviso y llega otro antes de que desaparezca
- **THEN** solo se ve el último
