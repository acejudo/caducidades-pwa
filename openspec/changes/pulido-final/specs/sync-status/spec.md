# Spec Delta

## ADDED Requirements

### Requirement: Aviso de cambios sin sincronizar
Si hay cambios pendientes, no hay token vigente y hay conexión, el Listado SHALL mostrar encima de la lista el aviso "Hay cambios sin sincronizar. Toca para sincronizar". Al tocarlo MUST sincronizar a petición según `drive-sync`, que es la única forma de abrir la ventana de Google. El aviso MUST NOT mostrarse mientras se sincroniza ni cuando deja de haber cambios pendientes.

#### Scenario: Abrir la app con cambios pendientes
- **WHEN** el usuario abre la app al día siguiente, con conexión, sin token vigente y con un alta que no se llegó a subir
- **THEN** el Listado muestra "Hay cambios sin sincronizar. Toca para sincronizar"

#### Scenario: Tocar el aviso
- **WHEN** el usuario toca el aviso y la sincronización termina bien
- **THEN** se renueva el token, se sincroniza y el aviso desaparece

#### Scenario: Sin cambios pendientes
- **WHEN** no hay cambios pendientes y no hay token vigente
- **THEN** no se muestra el aviso; solo el icono de la cabecera indica "Toca para sincronizar"

#### Scenario: Sin conexión
- **WHEN** hay cambios pendientes y no hay conexión
- **THEN** no se muestra el aviso, porque no se puede sincronizar

#### Scenario: Sin ventana de Google por su cuenta
- **WHEN** se muestra el aviso y el usuario no lo toca
- **THEN** la app no abre la ventana de Google ni intenta renovar el token
