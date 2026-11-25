## ADDED Requirements

### Requirement: Solo en su propia ventana
La app SHALL funcionar solo como página principal de su ventana o pestaña, o instalada. Si se carga dentro de un marco (`iframe`) de otra página, MUST NOT arrancar: no carga las pantallas, Google Sign-In ni la sincronización, y MUST mostrar solo un texto que explica que se abre en su propia ventana y un enlace que la abre fuera del marco. La comprobación MUST cumplir la política de seguridad de contenido, sin scripts en línea.

#### Scenario: Cargada dentro de un marco
- **WHEN** otra página carga la app dentro de un `iframe`
- **THEN** el marco muestra solo el aviso y el enlace "Abrir Caducidades", sin pantalla de login, botones de la app ni ventana de Google

#### Scenario: Abrir desde el marco
- **WHEN** en ese aviso se toca "Abrir Caducidades"
- **THEN** la app se abre en la ventana principal, fuera del marco

#### Scenario: Uso normal
- **WHEN** se abre la app en una pestaña o instalada
- **THEN** arranca como siempre y no se muestra el aviso
