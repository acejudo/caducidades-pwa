## MODIFIED Requirements

### Requirement: Archivo de sincronización en Drive
La lista SHALL guardarse en Drive en un archivo `caducidades.json`, dentro de una carpeta `Caducidades`. El archivo tiene el formato de `docs/SPEC.md` §4.2: `version` 1, `ultimaActualizacion` en ISO 8601 UTC y `productos` con todos los productos, también los marcados como eliminados. La app SHALL escribirlo en JSON compacto, sin sangría ni saltos de línea, y MUST seguir leyendo los archivos escritos con sangría.

#### Scenario: Contenido del archivo
- **WHEN** se sincroniza un dispositivo con los productos "Leche" y "Pan", este último eliminado
- **THEN** el archivo de Drive contiene `version: 1`, una `ultimaActualizacion` y los dos productos con todos sus campos, "Pan" con `eliminado: true`

#### Scenario: Archivo compacto
- **WHEN** la app sube el archivo de la lista
- **THEN** el contenido es JSON sin sangría ni saltos de línea

#### Scenario: Archivo anterior con sangría
- **WHEN** el archivo de Drive está escrito con sangría, como lo dejaban versiones anteriores de la app
- **THEN** se lee y se sincroniza con normalidad

### Requirement: Tamaño máximo del archivo de Drive
Si `caducidades.json` ocupa más de 5 MB o contiene más de 2000 productos (bajas incluidas), la app MUST tratarlo como un archivo no válido: la sincronización termina con error, los productos del dispositivo no cambian y el archivo de Drive no se sobrescribe. El tamaño MUST medirse sobre lo que se descarga: la descarga se corta en cuanto pasa de 5 MB, aunque Drive no indique el tamaño o indique uno menor.

La lista que resulta de juntar los productos del dispositivo con los de Drive MUST cumplir los mismos límites antes de guardarse o subirse: como mucho 2000 productos, bajas incluidas, y un archivo de 5 MB como máximo. Si los supera, la sincronización MUST detenerse sin cambiar los productos del dispositivo ni el archivo de Drive, conservar los cambios pendientes y mostrar el estado de error con un mensaje en español que diga que la lista ha llegado al máximo. Lo mismo vale al crear la lista en Drive.

#### Scenario: Archivo demasiado grande
- **WHEN** `caducidades.json` ocupa más de 5 MB
- **THEN** la sincronización termina con error, los productos del dispositivo no cambian y el archivo de Drive no se sobrescribe

#### Scenario: Archivo demasiado grande sin tamaño indicado
- **WHEN** Drive envía un `caducidades.json` de más de 5 MB sin indicar su tamaño
- **THEN** la descarga se corta poco después de pasar de 5 MB, la sincronización termina con error y los productos del dispositivo no cambian

#### Scenario: Demasiados productos en el archivo
- **WHEN** el archivo contiene 2001 productos
- **THEN** la sincronización termina con error, los productos del dispositivo no cambian y el archivo de Drive no se sobrescribe

#### Scenario: La lista junta pasaría del máximo
- **WHEN** el archivo de Drive tiene 2000 productos y el dispositivo tiene 10 productos más que no están en Drive
- **THEN** la sincronización termina con el error de lista llena, el dispositivo conserva sus productos y sus cambios pendientes, y el archivo de Drive no cambia

#### Scenario: La lista junta cabe
- **WHEN** el archivo de Drive tiene 1990 productos y el dispositivo tiene 10 productos más que no están en Drive
- **THEN** la sincronización termina bien y el archivo de Drive y el dispositivo quedan con 2000 productos

#### Scenario: Archivo resultante demasiado grande
- **WHEN** los productos juntos no pasan de 2000 pero el archivo que se subiría ocupa más de 5 MB
- **THEN** la sincronización termina con el error de lista llena sin cambiar el dispositivo ni Drive

#### Scenario: Crear la lista con demasiados productos
- **WHEN** no hay lista en Drive, el usuario acepta crearla y el archivo con los productos del dispositivo superaría los límites
- **THEN** no se crea el archivo y se muestra el error de lista llena

### Requirement: Descarga de fotos
Al sincronizar, la app SHALL descargar de la carpeta de fotos cada foto que use un producto no eliminado y no esté en el dispositivo, y guardarla como ya subida. Solo MUST aceptar imágenes WebP o JPEG de 5 MB como máximo. El tamaño MUST medirse sobre lo que se descarga: la descarga se corta en cuanto pasa de 5 MB, aunque Drive no indique el tamaño o indique uno menor. Si una foto no está en Drive, no es válida o falla su descarga, MUST ignorarse sin que falle la sincronización de la lista, y se vuelve a intentar en la siguiente.

#### Scenario: Foto hecha en otro dispositivo
- **WHEN** otro dispositivo añadió "Queso" con foto real y la subió, y este dispositivo sincroniza
- **THEN** "Queso" aparece en el Listado de este dispositivo con esa foto, también después sin conexión

#### Scenario: Foto aún no subida
- **WHEN** la lista trae un producto con foto real que todavía no está en la carpeta de fotos
- **THEN** la sincronización termina bien, el producto se muestra con el icono genérico y la foto se descarga en una sincronización posterior

#### Scenario: Archivo no válido
- **WHEN** el archivo de Drive con el nombre de la foto no es una imagen WebP o JPEG o pasa de 5 MB
- **THEN** no se guarda en el dispositivo y el producto se muestra con el icono genérico

#### Scenario: Foto demasiado grande sin tamaño indicado
- **WHEN** Drive envía una foto WebP de más de 5 MB sin indicar su tamaño
- **THEN** la descarga se corta poco después de pasar de 5 MB, la foto no se guarda y la sincronización de la lista termina bien
