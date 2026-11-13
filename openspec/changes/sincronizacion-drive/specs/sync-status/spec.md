# Spec Delta

## Purpose

Define cómo ve y controla el usuario la sincronización con Google Drive: el icono de estado de la cabecera, el toque para sincronizar y la sección Sincronización de Ajustes.

## ADDED Requirements

### Requirement: Estados de sincronización
La app SHALL tener en cada momento uno de estos estados de sincronización, con su texto en español:
- "Sin conexión": no hay red.
- "Cambios pendientes": hay cambios sin subir.
- "Toca para sincronizar": no hay token vigente para sincronizar sola.
- "Sincronizando…".
- "Sincronizado": la última sincronización terminó bien y no hay cambios pendientes.
- "Error al sincronizar".

#### Scenario: Sin conexión
- **WHEN** el dispositivo pierde la conexión
- **THEN** el estado pasa a "Sin conexión"

#### Scenario: Sincronizado
- **WHEN** termina bien una sincronización y no se ha hecho ningún cambio después
- **THEN** el estado es "Sincronizado"

#### Scenario: Sin token tras reabrir
- **WHEN** el usuario abre la app al día siguiente, con conexión pero sin token vigente
- **THEN** el estado es "Toca para sincronizar"

### Requirement: Icono de estado en la cabecera
La cabecera del Listado SHALL mostrar a la derecha del título un botón con un icono de sincronización que refleja el estado: girando mientras sincroniza, con una marca de aviso si hay cambios pendientes, hay que tocar o hubo un error, y tachado sin conexión. Su nombre accesible MUST incluir el texto del estado. Al pulsarlo MUST sincronizar a petición según `drive-sync`. Sin conexión o mientras sincroniza, MUST estar desactivado.

#### Scenario: Pulsar el icono
- **WHEN** el estado es "Toca para sincronizar" y el usuario pulsa el icono
- **THEN** se renueva el token, el icono gira mientras sincroniza y al terminar el estado es "Sincronizado"

#### Scenario: Nombre accesible
- **WHEN** hay cambios pendientes
- **THEN** el lector de pantalla anuncia el botón como "Sincronizar: Cambios pendientes"

#### Scenario: Sin conexión
- **WHEN** no hay conexión
- **THEN** el icono aparece tachado y desactivado

### Requirement: Sincronización en Ajustes
Ajustes SHALL mostrar una sección "Sincronización" con el estado actual, la fecha y hora de la última sincronización correcta ("Última sincronización: hoy a las 18:30", o "Nunca") y un botón "Sincronizar ahora" que sincroniza a petición. Si hubo un error, MUST mostrar también su mensaje. El botón MUST estar desactivado sin conexión o mientras sincroniza.

#### Scenario: Sincronizar desde Ajustes
- **WHEN** el usuario pulsa "Sincronizar ahora" con conexión
- **THEN** el estado pasa a "Sincronizando…" y, al terminar, a "Sincronizado" con la hora actual como última sincronización

#### Scenario: Nunca sincronizado
- **WHEN** el dispositivo aún no ha sincronizado nunca
- **THEN** Ajustes muestra "Última sincronización: Nunca"

#### Scenario: Error visible
- **WHEN** la última sincronización falló por un error de Google
- **THEN** Ajustes muestra "Error al sincronizar" y el mensaje del error, y "Sincronizar ahora" sigue disponible

### Requirement: Estado actualizado en pantalla
El icono y la sección de Ajustes SHALL actualizarse solos cuando cambia el estado (al empezar o terminar una sincronización, al perder o recuperar la conexión, al guardar un cambio), sin cambiar de pantalla.

#### Scenario: Cambio guardado
- **WHEN** el estado es "Sincronizado" y el usuario guarda una edición sin token vigente
- **THEN** al volver al Listado, el icono indica que hay que tocar para sincronizar
