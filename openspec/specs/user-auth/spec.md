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
Al pulsar "Entrar con Google", la app SHALL abrir el consentimiento de Google y pedir en una única autorización la identidad del usuario (email y nombre) y el *scope* `https://www.googleapis.com/auth/drive`, que permite usar una carpeta compartida por otra cuenta. Después MUST consultar el email y el nombre del usuario a Google con el token obtenido.

#### Scenario: Consentimiento
- **WHEN** el usuario pulsa "Entrar con Google" por primera vez
- **THEN** Google muestra la selección de cuenta y el permiso de acceso a los archivos de Google Drive

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

### Requirement: Ampliación del permiso de Drive
Si una sesión recordada solo tiene concedido el permiso anterior (`drive.file`), al renovar el token la app SHALL pedir a Google el permiso nuevo, mostrando el consentimiento. Si el usuario no lo concede, la sesión MUST seguir (los datos locales siguen disponibles), pero sin token vigente, y la sincronización MUST indicar que hace falta permitir el acceso a Google Drive.

#### Scenario: Sesión anterior al cambio de permiso
- **WHEN** un usuario con sesión de antes de este cambio toca para sincronizar
- **THEN** Google le pide aceptar el acceso a Google Drive y, si lo acepta, se sincroniza

#### Scenario: Permiso nuevo rechazado
- **WHEN** en ese consentimiento el usuario no concede el acceso a Drive
- **THEN** sigue viendo sus productos y el estado de sincronización indica que hace falta permitir el acceso a Google Drive

### Requirement: Token ligado a la sesión
Cada token de acceso SHALL quedar asociado al email de la sesión para la que se obtuvo. La app MUST NOT usar un token cuyo email no sea el de la sesión actual ni un token sin email asociado: en esos casos se considera que no hay token vigente.

#### Scenario: Token de otra cuenta
- **WHEN** la ventana tiene un token obtenido para la cuenta A y la sesión del dispositivo pasa a ser la de la cuenta B
- **THEN** la app informa de que no hay token vigente y no envía ninguna petición a Drive con el token de A

#### Scenario: Token sin cuenta asociada
- **WHEN** la ventana tiene un token guardado por una versión anterior de la app, sin email asociado
- **THEN** la app informa de que no hay token vigente hasta que se renueve

#### Scenario: Token de la propia sesión
- **WHEN** la ventana tiene un token vigente obtenido para la cuenta de la sesión actual
- **THEN** la app lo usa con normalidad

### Requirement: Renovación con la misma cuenta
Al renovar el token, la app SHALL comprobar con Google que la cuenta del token nuevo es la de la sesión. Si es otra cuenta o no se puede comprobar, MUST revocar el token nuevo, no guardarlo y dar la renovación por fallida, sin cambiar la sesión.

#### Scenario: Se elige otra cuenta al renovar
- **WHEN** con la sesión de la cuenta A el usuario toca sincronizar y en la ventana de Google elige la cuenta B
- **THEN** el token de B se revoca y no se guarda, la sesión sigue siendo la de A, no se sincroniza y se muestra un error que indica que la cuenta elegida no es la de la sesión

#### Scenario: No se puede comprobar la cuenta
- **WHEN** al renovar, Google entrega un token pero la consulta de la cuenta falla
- **THEN** el token se revoca y no se guarda, y la sincronización muestra el error de conexión

#### Scenario: Renovación con la cuenta de la sesión
- **WHEN** al renovar, el token nuevo es de la cuenta de la sesión
- **THEN** se guarda y la sincronización continúa

### Requirement: Cierre de sesión en todas las ventanas
Cerrar sesión SHALL borrar y revocar el token de todas las ventanas abiertas de la app en el dispositivo, no solo el de la ventana donde se pulsa. Cada ventana MUST olvidar su token en cuanto la sesión del dispositivo desaparece o pasa a ser de otra cuenta, y MUST revocarlo en Google si hay conexión. Al cerrar sesión, la app MUST pedir la revocación de cualquier token guardado, aunque ya haya caducado.

#### Scenario: Otra ventana abierta al cerrar sesión
- **WHEN** hay dos ventanas de la app con sesión de la cuenta A, cada una con su token, y se pulsa "Cerrar sesión" en una
- **THEN** la otra ventana borra su token, pide su revocación si hay conexión, deja de sincronizar y muestra Login

#### Scenario: Otra cuenta inicia sesión en otra ventana
- **WHEN** tras cerrar sesión la cuenta A, la cuenta B inicia sesión en una ventana y en otra ventana quedaba un token de A
- **THEN** esa ventana no conserva el token de A y sus sincronizaciones no usan nunca el token de A

#### Scenario: Token caducado al cerrar sesión
- **WHEN** el usuario cierra sesión con conexión y el token guardado ya ha caducado
- **THEN** la sesión y el token se borran y la app pide igualmente a Google la revocación de ese token
