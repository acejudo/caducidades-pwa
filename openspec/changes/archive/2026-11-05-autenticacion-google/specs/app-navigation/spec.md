# Spec Delta

## MODIFIED Requirements

### Requirement: Restricción de acceso a rutas
La navegación SHALL ofrecer un punto de control que decida, antes de mostrar cada pantalla, si se permite el acceso o se redirige a otra ruta. La autenticación (capacidad `user-auth`) usa este control. La ruta a la que redirige MUST ser una que el propio control permita, para que nunca se produzca un bucle de redirecciones.

#### Scenario: Sin autenticación configurada
- **WHEN** no hay ningún control registrado y el usuario navega a cualquier ruta válida
- **THEN** la pantalla se muestra sin redirección

#### Scenario: Control que redirige
- **WHEN** hay registrado un control que niega el acceso a Listado y redirige a Login
- **THEN** navegar a Listado muestra la pantalla Login

#### Scenario: Sin bucles de redirección
- **WHEN** el control redirige a Login a un usuario sin sesión
- **THEN** se muestra Login de forma estable, sin redirecciones sucesivas

### Requirement: Recorrido completo tocando
Todas las pantallas de la sesión SHALL ser accesibles tocando, sin escribir URLs: Listado ofrece un botón flotante "+" que abre Nuevo producto y un elemento de producto de ejemplo que abre su Detalle; Detalle ofrece un botón "Editar" que abre Editar producto; Nuevo y Editar ofrecen una zona de foto que abre Elegir foto. Login se muestra solo cuando no hay sesión y se alcanza mediante "Cerrar sesión" en Ajustes.

#### Scenario: Del listado al alta
- **WHEN** el usuario pulsa el botón "+" en Listado
- **THEN** se muestra Nuevo producto

#### Scenario: Del listado a editar
- **WHEN** el usuario pulsa el producto de ejemplo en Listado y después "Editar" en Detalle
- **THEN** se muestra Editar producto con el id del producto de ejemplo

#### Scenario: Elegir foto desde el formulario
- **WHEN** el usuario pulsa la zona de foto en Nuevo producto
- **THEN** se muestra Elegir foto y, al pulsar volver, regresa a Nuevo producto

#### Scenario: App instalada sin barra de direcciones
- **WHEN** un usuario con sesión usa la app instalada a pantalla completa
- **THEN** puede llegar a las seis pantallas de la sesión solo tocando elementos de la interfaz
