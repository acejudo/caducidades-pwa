# Spec Delta

## MODIFIED Requirements

### Requirement: Localizar la lista
Para sincronizar, la app SHALL buscar `caducidades.json` (no en la papelera) entre los archivos de la cuenta y los compartidos con ella, y MUST considerar solo los que tienen como dueño una cuenta autorizada. Los demás MUST ignorarse: nunca se leen ni se escriben. Si quedan varios, MUST usar el creado primero, para que todas las cuentas usen el mismo. Después MUST recordar en el dispositivo qué archivo usa, y volver a buscarlo solo si ese archivo deja de estar disponible.

#### Scenario: Lista compartida por otra cuenta
- **WHEN** la cuenta autorizada A compartió su carpeta `Caducidades` con la cuenta B, B sincroniza por primera vez y acepta usar la lista de A
- **THEN** B usa el `caducidades.json` de A y ve sus productos

#### Scenario: Varias listas
- **WHEN** la cuenta ve dos archivos `caducidades.json` de cuentas autorizadas, uno creado el 1 de noviembre y otro el 5
- **THEN** usa el del 1 de noviembre

#### Scenario: Archivo recordado ya no disponible
- **WHEN** el archivo recordado se ha borrado o se ha dejado de compartir con la cuenta
- **THEN** la app vuelve a buscar la lista en lugar de fallar siempre

#### Scenario: Lista de una cuenta no autorizada
- **WHEN** la cuenta tiene su propia lista y además ve un `caducidades.json` más antiguo cuyo dueño no es una cuenta autorizada
- **THEN** usa su propia lista, y el archivo ajeno no se descarga ni se modifica

#### Scenario: Solo hay una lista ajena no autorizada
- **WHEN** el único `caducidades.json` visible es de una cuenta no autorizada
- **THEN** la app actúa como si no hubiera ninguna lista: pregunta antes de crear una nueva y no toca ese archivo

#### Scenario: Lista sin dueño legible
- **WHEN** un `caducidades.json` no indica ningún dueño (por ejemplo, está en una unidad compartida)
- **THEN** se ignora

## ADDED Requirements

### Requirement: Confirmar una lista de otra cuenta
Si la lista elegida no es de la propia cuenta, la app SHALL preguntar antes de usarla por primera vez, mostrando el email de su dueño ("¿Usar la lista compartida por ana@example.com?"). Si se acepta, la recuerda y no vuelve a preguntar. Si se rechaza, MUST NOT leerla ni escribirla y los cambios siguen pendientes. En automático pregunta como mucho una vez por sesión de la app; a petición, siempre.

#### Scenario: Aceptar la lista compartida
- **WHEN** la cuenta B sincroniza por primera vez y la única lista válida es de la cuenta autorizada A
- **THEN** se le pregunta "¿Usar la lista compartida por" seguido del email de A y, al aceptar, ve los productos de A

#### Scenario: Rechazar la lista compartida
- **WHEN** en esa pregunta la cuenta B elige no usarla
- **THEN** la lista de A no se descarga ni se modifica, no se crea ninguna lista nueva y el estado sigue en cambios pendientes

#### Scenario: Lista propia sin pregunta
- **WHEN** la lista elegida es de la propia cuenta
- **THEN** se usa sin preguntar
