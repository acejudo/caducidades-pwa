# Spec Delta

## MODIFIED Requirements

### Requirement: Aviso en el Listado
Si el aviso está activado y hay productos urgentes, el Listado SHALL mostrar un aviso encima de la lista que diga cuántos hay, con números y en español, en un texto corto que quepa en dos líneas a 390 px de ancho: "caducados" para los ya caducados y "a punto de caducar" para los próximos. Sin productos urgentes, el aviso MUST NOT mostrarse.

#### Scenario: Solo próximos
- **WHEN** hay 3 productos que caducan hoy, mañana y pasado mañana, y ninguno caducado
- **THEN** el aviso dice "3 productos a punto de caducar"

#### Scenario: Solo caducados
- **WHEN** hay 1 producto caducado y ninguno próximo
- **THEN** el aviso dice "1 producto caducado"

#### Scenario: Caducados y próximos
- **WHEN** hay 2 productos caducados y 1 que caduca hoy
- **THEN** el aviso dice "2 productos caducados y 1 a punto de caducar"

#### Scenario: Nada urgente
- **WHEN** todos los productos caducan dentro de 3 días o más
- **THEN** no se muestra ningún aviso

#### Scenario: Listado vacío
- **WHEN** no hay ningún producto
- **THEN** no se muestra ningún aviso, solo el estado vacío del Listado

#### Scenario: Cabe en dos líneas
- **WHEN** hay 12 productos caducados y 10 a punto de caducar y el Listado se ve a 390 px de ancho
- **THEN** el texto del aviso ocupa como mucho dos líneas
