# Spec Delta

## MODIFIED Requirements

### Requirement: Recorrido completo tocando
Todas las pantallas de la sesión SHALL ser accesibles tocando, sin escribir URLs: Listado ofrece un botón flotante "+" que abre Nuevo producto y cada producto de la lista abre su Detalle; Detalle ofrece un botón "Editar" que abre Editar producto; Nuevo y Editar ofrecen una zona de foto que abre Elegir foto. Login se muestra solo cuando no hay sesión y se alcanza mediante "Cerrar sesión" en Ajustes.

#### Scenario: Del listado al alta
- **WHEN** el usuario pulsa el botón "+" en Listado
- **THEN** se muestra Nuevo producto

#### Scenario: Del listado a editar
- **WHEN** hay al menos un producto guardado y el usuario lo pulsa en Listado y después pulsa "Editar" en Detalle
- **THEN** se muestra Editar producto con el id de ese producto

#### Scenario: Elegir foto desde el formulario
- **WHEN** el usuario pulsa la zona de foto en Nuevo producto
- **THEN** se muestra Elegir foto y, al pulsar volver, regresa a Nuevo producto

#### Scenario: App instalada sin barra de direcciones
- **WHEN** un usuario con sesión y al menos un producto guardado usa la app instalada a pantalla completa
- **THEN** puede llegar a las seis pantallas de la sesión solo tocando elementos de la interfaz
