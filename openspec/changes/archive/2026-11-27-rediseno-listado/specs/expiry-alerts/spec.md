## MODIFIED Requirements

### Requirement: Tocar el aviso
Al tocar el aviso, el Listado SHALL activar el filtro "Caducados" si hay algún producto caducado, o "Esta semana" si no. El aviso MUST poder usarse con el teclado y anunciarse a los lectores de pantalla.

#### Scenario: Con caducados
- **WHEN** el aviso cuenta 1 caducado y 2 próximos y el usuario lo toca
- **THEN** el filtro "Caducados" queda activo y se ve el producto caducado

#### Scenario: Solo próximos
- **WHEN** el aviso cuenta solo productos próximos y el usuario lo toca
- **THEN** el filtro "Esta semana" queda activo
