## ADDED Requirements

### Requirement: Direcciones con codificación no válida
Una dirección cuya ruta contiene una secuencia de escape no válida (por ejemplo, un `%` que no va seguido de dos dígitos hexadecimales) SHALL tratarse como una ruta inexistente. La app MUST NOT quedarse en blanco ni lanzar un error sin capturar.

#### Scenario: Porcentaje mal formado
- **WHEN** el usuario abre `#/producto/%E0%A4%A` o `#/producto/100%`
- **THEN** se muestra Listado y la URL pasa a ser la de Listado
