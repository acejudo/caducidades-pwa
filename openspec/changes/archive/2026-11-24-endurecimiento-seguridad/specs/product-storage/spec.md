## ADDED Requirements

### Requirement: Máximo de productos
El dispositivo SHALL guardar como máximo 2000 productos, contando también los que tienen marca de borrado y aún no se han purgado. Un alta que supere el máximo MUST rechazarse con un error propio, sin guardar nada. Las ediciones y las bajas de productos existentes no se ven afectadas. En el formulario, ese rechazo SHALL mostrarse con un mensaje en español que indique el máximo.

#### Scenario: Alta con el máximo alcanzado
- **WHEN** hay 2000 productos guardados (bajas sin purgar incluidas) y se intenta crear otro
- **THEN** la operación falla con el error de máximo de productos y el número de productos no cambia

#### Scenario: Edición con el máximo alcanzado
- **WHEN** hay 2000 productos guardados y se edita o se elimina uno de ellos
- **THEN** la operación se completa con normalidad

#### Scenario: Mensaje en el formulario
- **WHEN** el usuario guarda un producto nuevo y el almacenamiento lo rechaza por el máximo de productos
- **THEN** el formulario sigue abierto con lo escrito y muestra "Has llegado al máximo de 2000 productos. Elimina alguno para añadir más."
