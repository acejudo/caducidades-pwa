## ADDED Requirements

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
