# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Ampliación del permiso de Drive
Si una sesión recordada solo tiene concedido el permiso anterior (`drive.file`), al renovar el token la app SHALL pedir a Google el permiso nuevo, mostrando el consentimiento. Si el usuario no lo concede, la sesión MUST seguir (los datos locales siguen disponibles), pero sin token vigente, y la sincronización MUST indicar que hace falta permitir el acceso a Google Drive.

#### Scenario: Sesión anterior al cambio de permiso
- **WHEN** un usuario con sesión de antes de este cambio toca para sincronizar
- **THEN** Google le pide aceptar el acceso a Google Drive y, si lo acepta, se sincroniza

#### Scenario: Permiso nuevo rechazado
- **WHEN** en ese consentimiento el usuario no concede el acceso a Drive
- **THEN** sigue viendo sus productos y el estado de sincronización indica que hace falta permitir el acceso a Google Drive
