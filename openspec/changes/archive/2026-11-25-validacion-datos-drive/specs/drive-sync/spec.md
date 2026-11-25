## MODIFIED Requirements

### Requirement: Contenido no válido en Drive
Si el archivo de Drive no es un JSON con el formato esperado, la sincronización SHALL fallar con un error, sin cambiar nada en el dispositivo ni sobrescribir el archivo. Los productos que no cumplen el modelo de `product-model` MUST ignorarse sin impedir la sincronización del resto. También MUST ignorarse un producto cuyo `id` no sea un UUID en minúsculas o cuyo `actualizado` no sea una fecha y hora ISO 8601 completa con zona (`Z` o `±hh:mm`).

#### Scenario: Archivo dañado
- **WHEN** el contenido de `caducidades.json` no es JSON
- **THEN** la sincronización termina con error, los productos del dispositivo no cambian y el archivo de Drive no se sobrescribe

#### Scenario: Un producto no válido
- **WHEN** el archivo contiene un producto sin `fechaCaducidad` y otros válidos
- **THEN** los válidos se sincronizan y el no válido se ignora

#### Scenario: Id que no es un UUID
- **WHEN** el archivo contiene un producto con `id` "nuevo", otro con un UUID en mayúsculas y otros válidos
- **THEN** los válidos se sincronizan y esos dos se ignoran

#### Scenario: Fecha de modificación sin zona
- **WHEN** el archivo contiene un producto con `actualizado` "2026-11-10T10:00:00", otro con "2026-11-10" y otro con "10 Nov 2026 10:00 GMT", además de otros válidos
- **THEN** los válidos se sincronizan y esos tres se ignoran

#### Scenario: Fecha de modificación con desfase
- **WHEN** el archivo contiene un producto con `actualizado` "2026-11-10T11:00:00+01:00" o "2026-11-10T10:00:00Z"
- **THEN** se sincroniza con normalidad

#### Scenario: Cantidad por encima del máximo en el archivo
- **WHEN** el archivo contiene un producto con cantidad 10000 y otros válidos
- **THEN** los válidos se sincronizan y ese producto se ignora

## ADDED Requirements

### Requirement: Foto predeterminada desconocida en el archivo
Un producto del archivo cuya foto predeterminada no exista en el catálogo de `product-photos` SHALL usarse sin foto (tipo `ninguna`), en lugar de ignorarse. La versión corregida MUST subirse a Drive en esa misma sincronización, aunque la fusión no cambie nada más.

#### Scenario: Foto predeterminada que no está en el catálogo
- **WHEN** el archivo contiene "Leche" con foto predeterminada "dragon"
- **THEN** "Leche" se guarda en el dispositivo sin foto y el archivo de Drive se sube con "Leche" sin foto

#### Scenario: Foto predeterminada del catálogo
- **WHEN** el archivo contiene "Leche" con foto predeterminada "leche"
- **THEN** "Leche" se guarda con esa foto y no hace falta subir nada por ella

### Requirement: Detección de cambios en la lista
Para decidir si hay que guardar en el dispositivo o subir a Drive, la sincronización SHALL tratar como distintas dos listas que difieren en el `id`, el `actualizado` o la marca de baja de cualquier producto, sean cuales sean los caracteres de esos textos.

#### Scenario: Listas iguales
- **WHEN** la lista del dispositivo y la de Drive tienen los mismos productos con el mismo `actualizado`
- **THEN** no se guarda nada en el dispositivo ni se sube nada a Drive

#### Scenario: Textos con separadores
- **WHEN** dos listas solo se diferencian en productos cuyos textos contienen caracteres como "@" o "|", y unidos sin separar darían el mismo resultado
- **THEN** se tratan como distintas y la lista fusionada se guarda o se sube

### Requirement: Tope del listado de fotos
Al sincronizar, el listado de la carpeta de fotos de Drive SHALL detenerse al llegar a 2000 archivos, el mismo tope que el número de productos. Las fotos que queden fuera MUST tratarse en esa sincronización como si no estuvieran en Drive: no se descargan ni se borran, y la sincronización de la lista termina con normalidad.

#### Scenario: Carpeta con más fotos que el tope
- **WHEN** la carpeta de fotos tiene 2500 archivos
- **THEN** el listado se detiene tras obtener 2000, sin pedir más páginas, y la sincronización de la lista termina bien

#### Scenario: Foto fuera del tope
- **WHEN** un producto usa una foto real que no está en el dispositivo y no ha entrado en el listado
- **THEN** el producto se muestra con el icono genérico y la sincronización termina sin error
