## ADDED Requirements

### Requirement: Acceso a Ajustes
La cabecera de Listado SHALL mostrar, a la derecha y detrás del estado de sincronización, un botón con el icono de ajustes y el nombre accesible "Ajustes", con el tamaño táctil mínimo, que abre Ajustes. Ninguna pantalla MUST mostrar una barra de navegación inferior.

#### Scenario: Abrir Ajustes desde el Listado
- **WHEN** el usuario pulsa el icono "Ajustes" en la cabecera de Listado
- **THEN** se muestra la pantalla Ajustes

#### Scenario: Sin barra inferior
- **WHEN** se muestra cualquier pantalla de la app
- **THEN** no hay barra de navegación inferior

## MODIFIED Requirements

### Requirement: Flecha de volver en pantallas secundarias
Las pantallas Nuevo producto, Detalle, Editar producto, Elegir foto y Ajustes SHALL mostrar en la cabecera una flecha de volver. Al pulsarla, la app MUST volver a la pantalla anterior de la propia app; si no hay ninguna (se entró directamente por URL), MUST ir a la pantalla padre de la ruta. La pantalla padre de Elegir foto MUST ser su formulario de origen, y la de Ajustes, Listado. Listado y Login MUST NOT mostrar la flecha.

#### Scenario: Volver tras navegar dentro de la app
- **WHEN** el usuario va de Listado a Detalle y pulsa la flecha de volver
- **THEN** se muestra Listado

#### Scenario: Volver tras entrar directamente por URL
- **WHEN** el usuario abre la app directamente en Editar producto `abc123` y pulsa la flecha de volver
- **THEN** se muestra el Detalle del producto `abc123`

#### Scenario: Volver de Elegir foto tras entrar por URL
- **WHEN** el usuario abre la app directamente en Elegir foto de Editar producto `abc123` y pulsa la flecha de volver
- **THEN** se muestra Editar producto `abc123`

#### Scenario: Volver de Ajustes
- **WHEN** el usuario abre la app directamente en Ajustes y pulsa la flecha de volver
- **THEN** se muestra Listado

#### Scenario: Sin flecha en pantallas principales
- **WHEN** se muestra Listado o Login
- **THEN** la cabecera no tiene flecha de volver

### Requirement: Recorrido completo tocando
Todas las pantallas de la sesión SHALL ser accesibles tocando, sin escribir URLs: Listado ofrece un botón flotante "Añadir" que abre Nuevo producto, un icono "Ajustes" en la cabecera que abre Ajustes y cada producto de la lista abre su Detalle; Detalle ofrece un botón "Editar" que abre Editar producto; Nuevo y Editar ofrecen una zona de foto que abre Elegir foto. Login se muestra solo cuando no hay sesión y se alcanza mediante "Cerrar sesión" en Ajustes.

#### Scenario: Del listado al alta
- **WHEN** el usuario pulsa el botón "Añadir" en Listado
- **THEN** se muestra Nuevo producto

#### Scenario: Del listado a Ajustes
- **WHEN** el usuario pulsa el icono "Ajustes" en la cabecera de Listado
- **THEN** se muestra Ajustes

#### Scenario: Del listado a editar
- **WHEN** hay al menos un producto guardado y el usuario lo pulsa en Listado y después pulsa "Editar" en Detalle
- **THEN** se muestra Editar producto con el id de ese producto

#### Scenario: Elegir foto desde el formulario
- **WHEN** el usuario pulsa la zona de foto en Nuevo producto
- **THEN** se muestra Elegir foto y, al pulsar volver, regresa a Nuevo producto

#### Scenario: App instalada sin barra de direcciones
- **WHEN** un usuario con sesión y al menos un producto guardado usa la app instalada a pantalla completa
- **THEN** puede llegar a las seis pantallas de la sesión solo tocando elementos de la interfaz

## REMOVED Requirements

### Requirement: Navegación inferior
**Reason**: La barra solo tenía dos accesos (Listado y Ajustes) y restaba alto a la lista. Listado es la pantalla de inicio y Ajustes se usa poco.
**Migration**: Ajustes se abre con el icono de la cabecera de Listado ("Acceso a Ajustes") y vuelve con la flecha ("Flecha de volver en pantallas secundarias").
