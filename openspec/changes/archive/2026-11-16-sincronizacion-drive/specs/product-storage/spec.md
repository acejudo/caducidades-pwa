# Spec Delta

## MODIFIED Requirements

### Requirement: Marca de tiempo en cada escritura
Toda escritura (alta, actualización y baja) SHALL poner en `actualizado` la fecha y hora actuales del dispositivo en ISO 8601 UTC. El valor de `actualizado` MUST NOT poder fijarse desde los datos de entrada. La única excepción son los productos que llegan de la sincronización con Drive (`drive-sync`): se guardan con el `actualizado` que traen, para que la fusión *last-write-wins* siga siendo correcta.

#### Scenario: Valor de entrada ignorado
- **WHEN** se crea o actualiza un producto indicando `actualizado: "2000-01-01T00:00:00.000Z"`
- **THEN** el producto guardado tiene como `actualizado` la fecha y hora de la operación

#### Scenario: Producto recibido de Drive
- **WHEN** la sincronización guarda en el dispositivo un producto de Drive con `actualizado: "2026-11-01T10:00:00.000Z"`
- **THEN** el producto guardado conserva ese `actualizado`

## ADDED Requirements

### Requirement: Aviso de cambios locales
Cada alta, actualización y baja que se guarde bien SHALL avisar de que hay un cambio local, para que la sincronización lo marque como pendiente. Guardar los productos recibidos de la sincronización MUST NOT avisar.

#### Scenario: Alta avisa
- **WHEN** se crea un producto
- **THEN** se recibe un aviso de cambio local

#### Scenario: Escritura fallida
- **WHEN** una actualización falla por validación
- **THEN** no se recibe ningún aviso

#### Scenario: Guardado de la sincronización
- **WHEN** la sincronización guarda los productos fusionados
- **THEN** no se recibe ningún aviso de cambio local
