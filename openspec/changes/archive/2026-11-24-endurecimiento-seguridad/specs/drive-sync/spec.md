## ADDED Requirements

### Requirement: Tamaño máximo del archivo de Drive
Si `caducidades.json` ocupa más de 5 MB o contiene más de 2000 productos (bajas incluidas), la app MUST tratarlo como un archivo no válido: la sincronización termina con error, los productos del dispositivo no cambian y el archivo de Drive no se sobrescribe.

#### Scenario: Archivo demasiado grande
- **WHEN** `caducidades.json` ocupa más de 5 MB
- **THEN** la sincronización termina con error, los productos del dispositivo no cambian y el archivo de Drive no se sobrescribe

#### Scenario: Demasiados productos en el archivo
- **WHEN** el archivo contiene 2001 productos
- **THEN** la sincronización termina con error, los productos del dispositivo no cambian y el archivo de Drive no se sobrescribe

### Requirement: Fechas de modificación en el futuro
Un producto del archivo cuyo `actualizado` sea posterior en más de un día a la fecha y hora del dispositivo SHALL usarse con `actualizado` igual a la fecha y hora actuales. Así la versión corregida se sube a Drive y la baja se puede purgar con normalidad.

#### Scenario: Baja con fecha en el futuro
- **WHEN** el archivo contiene una baja con `actualizado` dentro de diez años
- **THEN** se guarda en el dispositivo y se sube a Drive con `actualizado` igual a la fecha y hora de la sincronización, y se purga 90 días después

#### Scenario: Reloj ligeramente adelantado
- **WHEN** el archivo contiene un producto con `actualizado` dos horas posterior a la hora del dispositivo
- **THEN** se usa con su `actualizado` original

### Requirement: Longitudes máximas en el archivo
Los productos del archivo que no cumplen las longitudes máximas de `product-model` SHALL ignorarse como cualquier otro producto no válido.

#### Scenario: Notas demasiado largas en el archivo
- **WHEN** el archivo contiene un producto con notas de 5000 caracteres y otros válidos
- **THEN** los válidos se sincronizan y ese producto se ignora
