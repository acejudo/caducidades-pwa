# app-navigation Specification

## Purpose

Define cómo se navega entre las pantallas de Caducidades: qué rutas existen, cuál se muestra por defecto, qué ocurre con las rutas desconocidas y cómo se podrá restringir el acceso a pantallas cuando exista la autenticación.

## Requirements

### Requirement: Rutas de pantalla
La app SHALL ofrecer una ruta direccionable en la URL para cada pantalla de `docs/SPEC.md` §5: Login, Listado, Nuevo producto, Detalle de producto (con id), Editar producto (con id), Elegir foto y Ajustes. Al entrar en una ruta, la app MUST mostrar la pantalla correspondiente con su título en español, aunque su contenido aún sea un marcador vacío.

#### Scenario: Acceso directo a una ruta
- **WHEN** el usuario abre la app con la URL de la pantalla Ajustes
- **THEN** se muestra la pantalla Ajustes con el título "Ajustes"

#### Scenario: Ruta con parámetro
- **WHEN** el usuario navega al detalle del producto con id `abc123`
- **THEN** se muestra la pantalla Detalle y esta recibe el id `abc123`

### Requirement: Navegación sin recarga e historial
Cambiar de pantalla MUST NOT recargar la página. Los botones Atrás y Adelante del navegador o del sistema SHALL recorrer las pantallas visitadas.

#### Scenario: Botón atrás
- **WHEN** el usuario va de Listado a Ajustes y pulsa el botón Atrás del dispositivo
- **THEN** vuelve a mostrarse Listado sin recargar la página

### Requirement: Ruta por defecto y rutas desconocidas
Si la URL no indica ruta, la app SHALL mostrar Listado. Si la ruta no existe, la app SHALL redirigir a Listado sin dejar la ruta inválida en el historial.

#### Scenario: Apertura sin ruta
- **WHEN** el usuario abre la URL raíz de la app
- **THEN** se muestra la pantalla Listado

#### Scenario: Ruta inexistente
- **WHEN** el usuario abre una ruta que no existe
- **THEN** se muestra Listado y la URL pasa a ser la de Listado

### Requirement: Navegación inferior
La app SHALL mostrar una barra de navegación inferior con accesos a Listado y Ajustes (icono y texto), con el elemento de la pantalla actual resaltado en el color primario. La barra MUST NOT mostrarse en la pantalla de Login.

#### Scenario: Elemento activo
- **WHEN** se muestra la pantalla Ajustes
- **THEN** el acceso "Ajustes" de la barra inferior aparece en estado activo y "Listado" no

#### Scenario: Barra oculta en Login
- **WHEN** se muestra la pantalla Login
- **THEN** la barra de navegación inferior no es visible

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

### Requirement: Flecha de volver en pantallas secundarias
Las pantallas Nuevo producto, Detalle, Editar producto y Elegir foto SHALL mostrar en la cabecera una flecha de volver. Al pulsarla, la app MUST volver a la pantalla anterior de la propia app; si no hay ninguna (se entró directamente por URL), MUST ir a la pantalla padre de la ruta. Listado, Ajustes y Login MUST NOT mostrar la flecha.

#### Scenario: Volver tras navegar dentro de la app
- **WHEN** el usuario va de Listado a Detalle y pulsa la flecha de volver
- **THEN** se muestra Listado

#### Scenario: Volver tras entrar directamente por URL
- **WHEN** el usuario abre la app directamente en Editar producto `abc123` y pulsa la flecha de volver
- **THEN** se muestra el Detalle del producto `abc123`

#### Scenario: Sin flecha en pantallas principales
- **WHEN** se muestra Listado o Ajustes
- **THEN** la cabecera no tiene flecha de volver

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
