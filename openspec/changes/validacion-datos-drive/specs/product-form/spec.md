## MODIFIED Requirements

### Requirement: Botones de cantidad
El botón + SHALL sumar 1 a la cantidad sin pasar de 9999 (queda desactivado cuando sumar 1 pasaría del máximo) y el botón − MUST restar 1, sin bajar de 1 (en ese punto queda desactivado). La cantidad también MUST poder escribirse a mano, con coma o punto decimal.

#### Scenario: Sumar y restar
- **WHEN** la cantidad es 1 y el usuario pulsa + dos veces y − una vez
- **THEN** la cantidad es 2

#### Scenario: Mínimo
- **WHEN** la cantidad es 1
- **THEN** el botón − está desactivado

#### Scenario: Máximo
- **WHEN** la cantidad es 9999, o 9998,5
- **THEN** el botón + está desactivado, y vuelve a activarse al pulsar −

#### Scenario: Cantidad decimal escrita
- **WHEN** el usuario escribe "0,5" en la cantidad, elige "kg" y guarda
- **THEN** el producto se guarda con cantidad 0.5 y unidad "kg"

#### Scenario: Cantidad escrita por encima del máximo
- **WHEN** el usuario escribe "10000" en la cantidad y pulsa "Guardar"
- **THEN** aparece junto a la cantidad el mensaje en español con el máximo, el foco va a la cantidad y no se guarda nada
