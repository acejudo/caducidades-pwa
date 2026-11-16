# Spec Delta

## ADDED Requirements

### Requirement: Carpeta de fotos en Drive
Las fotos reales SHALL guardarse en Drive en una subcarpeta `fotos` dentro de la carpeta que contiene el `caducidades.json` que usa el dispositivo, sea propio o compartido. Cada foto MUST guardarse con su nombre (`<uuid>.webp` o `.jpg`). La subcarpeta MUST crearse solo cuando haya que subir una foto y no exista.

#### Scenario: Primera foto en una lista compartida
- **WHEN** la cuenta B usa la lista que compartió la cuenta A, en cuya carpeta aún no hay `fotos`, y sincroniza un producto con foto real
- **THEN** aparece `Caducidades/fotos/<nombre>` dentro de la carpeta de A

#### Scenario: Sin fotos reales
- **WHEN** ningún producto tiene foto real y se sincroniza
- **THEN** no se crea la subcarpeta `fotos`

### Requirement: Subida de fotos
Al sincronizar, después de la lista, la app SHALL subir a la carpeta de fotos cada foto del dispositivo que use algún producto no eliminado y aún no esté en Drive, y marcarla como subida. Mientras quede alguna foto por subir, el estado MUST seguir en "Cambios pendientes", y se reintenta en la siguiente sincronización.

#### Scenario: Alta con foto real
- **WHEN** se crea un producto con foto real y se sincroniza con token vigente
- **THEN** la foto aparece en la carpeta de fotos de Drive y el estado pasa a "Sincronizado"

#### Scenario: Sin conexión
- **WHEN** se crea un producto con foto real en modo avión
- **THEN** el estado queda en "Cambios pendientes" y, al volver la conexión y sincronizar, la foto se sube

#### Scenario: Falla la subida
- **WHEN** la lista se sincroniza bien pero la subida de una foto falla por la red
- **THEN** el estado muestra el error de conexión, la foto sigue marcada como no subida y se vuelve a intentar en la siguiente sincronización

### Requirement: Descarga de fotos
Al sincronizar, la app SHALL descargar de la carpeta de fotos cada foto que use un producto no eliminado y no esté en el dispositivo, y guardarla como ya subida. Solo MUST aceptar imágenes WebP o JPEG de 5 MB como máximo. Si una foto no está en Drive, no es válida o falla su descarga, MUST ignorarse sin que falle la sincronización de la lista, y se vuelve a intentar en la siguiente.

#### Scenario: Foto hecha en otro dispositivo
- **WHEN** otro dispositivo añadió "Queso" con foto real y la subió, y este dispositivo sincroniza
- **THEN** "Queso" aparece en el Listado de este dispositivo con esa foto, también después sin conexión

#### Scenario: Foto aún no subida
- **WHEN** la lista trae un producto con foto real que todavía no está en la carpeta de fotos
- **THEN** la sincronización termina bien, el producto se muestra con el icono genérico y la foto se descarga en una sincronización posterior

#### Scenario: Archivo no válido
- **WHEN** el archivo de Drive con el nombre de la foto no es una imagen WebP o JPEG o pasa de 5 MB
- **THEN** no se guarda en el dispositivo y el producto se muestra con el icono genérico

### Requirement: Limpieza de fotos sin usar
Al sincronizar, la app SHALL borrar las fotos que no use ningún producto, incluidos los eliminados aún no purgados, y que se guardaron o subieron hace más de un día: las del dispositivo y las de la carpeta de fotos de Drive. En Drive MUST borrar solo las fotos que es capaz de borrar (las de su cuenta): si Drive lo rechaza, MUST ignorarse sin error.

#### Scenario: Foto cambiada
- **WHEN** hace dos días se cambió la foto real de "Leche" por otra y se sincroniza
- **THEN** la foto anterior se borra del dispositivo y de Drive

#### Scenario: Foto recién hecha en otro dispositivo
- **WHEN** en la carpeta de fotos hay una foto subida hace una hora que aún no usa ningún producto de la lista
- **THEN** no se borra

#### Scenario: Producto eliminado
- **WHEN** se elimina un producto con foto real y se sincroniza
- **THEN** su foto se conserva hasta que se purgue la baja

#### Scenario: Foto de otra cuenta
- **WHEN** hay que borrar de Drive una foto sin usar subida por otra cuenta y Drive rechaza el borrado
- **THEN** la sincronización termina bien y la foto sigue en Drive
