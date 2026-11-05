# user-auth Specification

## Purpose

Restringe el uso de Caducidades a los emails autorizados mediante el inicio de sesión con Google, mantiene la sesión en el dispositivo y proporciona el token de acceso que necesitará la sincronización con Google Drive.

## Requirements

### Requirement: Login obligatorio
Sin una sesión autorizada guardada en el dispositivo, la app SHALL mostrar la pantalla de Login sea cual sea la ruta solicitada. MUST NOT mostrarse ninguna otra pantalla ni su contenido. La pantalla de Login SHALL mostrar el título "Caducidades", una instrucción breve y el botón "Entrar con Google".

#### Scenario: Primera apertura
- **WHEN** un usuario sin sesión abre la app
- **THEN** se muestra Login con el botón "Entrar con Google" y sin barra de navegación inferior

#### Scenario: Ruta interna sin sesión
- **WHEN** un usuario sin sesión abre directamente la URL de Ajustes
- **THEN** se muestra Login en lugar de Ajustes

### Requirement: Inicio de sesión con Google
Al pulsar "Entrar con Google", la app SHALL abrir el consentimiento de Google y pedir en una única autorización la identidad del usuario (email y nombre) y el *scope* `https://www.googleapis.com/auth/drive.file`. Después MUST consultar el email y el nombre del usuario a Google con el token obtenido.

#### Scenario: Consentimiento
- **WHEN** el usuario pulsa "Entrar con Google" por primera vez
- **THEN** Google muestra la selección de cuenta y el permiso de acceso a los archivos de Drive creados por la app

#### Scenario: Usuario cancela
- **WHEN** el usuario cierra la ventana de Google sin completar el inicio de sesión
- **THEN** sigue en Login, se muestra un mensaje de que no se completó el inicio de sesión y el botón vuelve a estar disponible

#### Scenario: Acceso a Drive no concedido
- **WHEN** el usuario completa el consentimiento pero desmarca el permiso de Google Drive
- **THEN** no se guarda la sesión, el token se revoca y Login muestra que hace falta permitir el acceso a Google Drive

### Requirement: Verificación contra la lista blanca
La app SHALL permitir el acceso solo si el email de Google está verificado y su hash SHA-256 (del email en minúsculas y sin espacios) coincide con uno de los hashes autorizados de la configuración. La comparación MUST hacerse sin distinguir mayúsculas.

#### Scenario: Email autorizado
- **WHEN** inicia sesión un usuario cuyo email está en la lista de autorizados
- **THEN** se guarda la sesión y se muestra Listado

#### Scenario: Mayúsculas en el email
- **WHEN** el email autorizado es `ana@gmail.com` y Google devuelve `Ana@Gmail.com`
- **THEN** el acceso se permite

### Requirement: Acceso denegado
Si el email no está autorizado o no está verificado, la app SHALL revocar el token obtenido, MUST NOT guardar ninguna sesión y SHALL mostrar en Login el mensaje "Acceso denegado" junto con el email rechazado.

#### Scenario: Email no autorizado
- **WHEN** inicia sesión una cuenta de Google que no está en la lista
- **THEN** se muestra "Acceso denegado", el token queda revocado y al recargar la app se sigue viendo Login

### Requirement: Lista de emails no legible
El código publicado de la app MUST NOT contener los emails autorizados en texto plano; solo SHALL contener sus hashes SHA-256.

#### Scenario: Inspección del código publicado
- **WHEN** alguien descarga los archivos JavaScript de la app publicada y busca los emails autorizados
- **THEN** no los encuentra; solo aparecen cadenas hexadecimales de 64 caracteres

### Requirement: Sesión recordada
Tras un login autorizado, la app SHALL guardar en el dispositivo el email y el nombre del usuario. Mientras exista esa sesión, al abrir la app MUST entrar directamente sin pedir de nuevo el login, también sin conexión y aunque el token de acceso haya caducado.

#### Scenario: Reapertura
- **WHEN** un usuario autorizado cierra la app y la vuelve a abrir al día siguiente
- **THEN** se muestra Listado sin pasar por Login

#### Scenario: Reapertura sin conexión
- **WHEN** un usuario autorizado abre la app instalada en modo avión
- **THEN** se muestra Listado

### Requirement: Revalidación de la sesión guardada
Al arrancar, la app SHALL comprobar que el email de la sesión guardada sigue en la lista de autorizados. Si ya no lo está, MUST borrar la sesión y mostrar Login.

#### Scenario: Email retirado de la lista
- **WHEN** se publica una versión cuya lista de autorizados ya no incluye el email de una sesión guardada, y ese usuario abre la app
- **THEN** la sesión se borra y se muestra Login

### Requirement: Login inaccesible con sesión
Con una sesión autorizada, la ruta de Login SHALL redirigir a Listado.

#### Scenario: Abrir Login con sesión
- **WHEN** un usuario con sesión abre la URL de Login
- **THEN** se muestra Listado

### Requirement: Login sin conexión
Si no hay sesión y el dispositivo no tiene conexión, la pantalla de Login SHALL indicar que se necesita conexión para entrar y MUST desactivar el botón "Entrar con Google" hasta que vuelva la conexión.

#### Scenario: Primera apertura en modo avión
- **WHEN** un usuario sin sesión abre la app sin conexión
- **THEN** Login muestra un aviso de que hace falta conexión y el botón está desactivado

#### Scenario: Vuelve la conexión
- **WHEN** estando en Login sin conexión, el dispositivo recupera la conexión
- **THEN** el aviso desaparece y el botón se activa sin recargar

### Requirement: Token de acceso disponible
Tras un login autorizado, la app SHALL conservar el token de acceso y su caducidad durante la sesión del navegador. MUST NOT persistirlo tras cerrar la app. Debe poder consultarse si hay un token vigente y pedir uno nuevo, sin repetir el consentimiento, a partir de una acción del usuario.

#### Scenario: Token vigente tras recargar
- **WHEN** un usuario autorizado recarga la app antes de que pase una hora desde el login
- **THEN** sigue habiendo un token vigente con el *scope* de Drive

#### Scenario: Token caducado
- **WHEN** ha pasado más de una hora desde el login o se ha cerrado y reabierto la app
- **THEN** la app sigue mostrando la sesión, pero informa de que no hay token vigente hasta que se renueve

### Requirement: Cuenta y cierre de sesión en Ajustes
Ajustes SHALL mostrar el nombre y el email de la cuenta conectada y un botón "Cerrar sesión". Al pulsarlo, la app MUST borrar la sesión y el token del dispositivo, revocar el token en Google si hay conexión y mostrar Login, sin que el botón Atrás devuelva a las pantallas de la sesión.

#### Scenario: Cerrar sesión
- **WHEN** el usuario pulsa "Cerrar sesión" en Ajustes
- **THEN** se muestra Login y, al recargar la app, sigue en Login

#### Scenario: Atrás tras cerrar sesión
- **WHEN** después de cerrar sesión el usuario pulsa el botón Atrás del dispositivo
- **THEN** sigue viéndose Login

#### Scenario: Cerrar sesión sin conexión
- **WHEN** el usuario cierra sesión en modo avión
- **THEN** la sesión se borra del dispositivo y se muestra Login, aunque el token no se haya podido revocar en Google

### Requirement: Fallo al cargar Google
Si los servicios de Google no se pueden cargar (bloqueados o sin respuesta), Login SHALL mostrar un mensaje de error comprensible en español y permitir reintentar.

#### Scenario: Script de Google bloqueado
- **WHEN** un bloqueador impide cargar los servicios de Google y el usuario pulsa "Entrar con Google"
- **THEN** se muestra un mensaje de que no se pudo conectar con Google y un modo de reintentar
