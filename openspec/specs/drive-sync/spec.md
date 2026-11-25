# drive-sync Specification

## Purpose

Define cómo se sincroniza la lista de productos del dispositivo con el archivo `caducidades.json` de Google Drive. Así varias personas autorizadas y varios dispositivos comparten una misma lista, también trabajando sin conexión.

## Requirements

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

### Requirement: Crear la lista
Si no encuentra ningún `caducidades.json`, la app SHALL preguntar antes de crear uno ("No hay ninguna lista en tu Drive ni compartida contigo. ¿Crear una nueva?"). Si se acepta, MUST crear la carpeta `Caducidades` en la raíz de "Mi unidad" (o usar una existente con ese nombre) y dentro el archivo con los productos del dispositivo. Si no se acepta, no crea nada y los cambios quedan pendientes.

#### Scenario: Primera sincronización sin lista
- **WHEN** una cuenta sin ninguna lista en Drive sincroniza y acepta crearla
- **THEN** en su Drive aparece `Caducidades/caducidades.json` con los productos del dispositivo

#### Scenario: Esperar a que la compartan
- **WHEN** no hay ninguna lista y el usuario responde que no quiere crearla
- **THEN** no se crea nada en Drive y el estado sigue en cambios pendientes

### Requirement: Fusión por producto
Al sincronizar, la app SHALL descargar el archivo y fusionarlo con los productos del dispositivo, producto a producto por `id`. Si un producto solo está en un lado, se conserva. Si está en los dos, MUST ganar la versión con el `actualizado` más reciente (*last-write-wins*), tanto en las ediciones como en las bajas. El resultado MUST guardarse en el dispositivo y subirse a Drive si difiere de lo descargado.

#### Scenario: Producto nuevo en otro dispositivo
- **WHEN** otro dispositivo añadió "Queso" a la lista de Drive y este dispositivo sincroniza
- **THEN** "Queso" aparece en el Listado de este dispositivo

#### Scenario: Gana la edición más reciente
- **WHEN** "Leche" tiene cantidad 2 en el dispositivo (editada a las 10:00) y cantidad 5 en Drive (editada a las 11:00)
- **THEN** tras sincronizar, "Leche" tiene cantidad 5 en el dispositivo y en Drive

#### Scenario: Baja en otro dispositivo
- **WHEN** otro dispositivo eliminó "Pan" después de la última edición que conoce este dispositivo
- **THEN** tras sincronizar, "Pan" deja de aparecer en el Listado de este dispositivo

#### Scenario: Edición local posterior a una baja remota
- **WHEN** "Pan" se eliminó en Drive a las 10:00 y en este dispositivo se editó a las 12:00
- **THEN** tras sincronizar, "Pan" sigue existiendo con la edición de las 12:00

#### Scenario: Cambios locales subidos
- **WHEN** el dispositivo tiene un producto nuevo que no está en Drive
- **THEN** tras sincronizar, el archivo de Drive lo contiene

### Requirement: Purga de bajas antiguas
Al sincronizar, la app SHALL quitar del dispositivo y del archivo los productos marcados como eliminados cuyo `actualizado` tenga más de 90 días.

#### Scenario: Baja antigua
- **WHEN** un producto se eliminó hace 100 días y se sincroniza
- **THEN** ya no está ni en el dispositivo ni en el archivo de Drive

#### Scenario: Baja reciente
- **WHEN** un producto se eliminó hace 10 días y se sincroniza
- **THEN** sigue en el archivo marcado como eliminado

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

### Requirement: Escrituras simultáneas
Antes de subir, la app SHALL comprobar que el archivo de Drive no ha cambiado desde que lo descargó. Si ha cambiado, MUST volver a descargarlo y fusionarlo antes de subir, para no perder los cambios de otro dispositivo.

#### Scenario: Otro dispositivo sube a la vez
- **WHEN** entre la descarga y la subida otro dispositivo sube "Huevos" al archivo
- **THEN** al terminar, el archivo contiene "Huevos" y también los cambios de este dispositivo

### Requirement: Sincronización automática con token vigente
Si hay sesión, conexión y un token de acceso vigente, la app SHALL sincronizar sin intervención del usuario en estos casos:
- tras el login;
- al abrir o recargar la app;
- al volver la conexión;
- unos segundos después de cada alta, edición o baja (agrupando los cambios seguidos en una sola sincronización).

Nunca MUST haber dos sincronizaciones a la vez.

#### Scenario: Tras el login
- **WHEN** el usuario entra con Google y en Drive hay productos que no están en el dispositivo
- **THEN** sin tocar nada, esos productos aparecen en el Listado

#### Scenario: Tras un alta
- **WHEN** con token vigente el usuario guarda un producto nuevo
- **THEN** a los pocos segundos el producto está en el archivo de Drive

#### Scenario: Varios cambios seguidos
- **WHEN** el usuario guarda tres cambios en menos de dos segundos
- **THEN** se hace una sola sincronización con los tres

### Requirement: Cambios pendientes sin token o sin conexión
Sin conexión o sin token vigente, la app SHALL seguir funcionando con los datos locales. Cada alta, edición o baja MUST marcar que hay cambios pendientes, aunque se cierre la app. La marca solo se quita cuando una sincronización termina bien. Sin token vigente, la app MUST NOT abrir la ventana de Google por su cuenta: espera a que el usuario pida sincronizar.

#### Scenario: Cambios en modo avión
- **WHEN** el usuario añade un producto en modo avión
- **THEN** el producto se guarda y aparece en el Listado, y la app indica que hay cambios pendientes

#### Scenario: Reapertura al día siguiente
- **WHEN** quedaron cambios pendientes, el usuario cierra la app y la abre al día siguiente (sin token vigente)
- **THEN** la app indica que hay cambios pendientes y que hay que tocar para sincronizar, sin abrir la ventana de Google

#### Scenario: Volver la conexión con token vigente
- **WHEN** hay cambios pendientes, el token sigue vigente y vuelve la conexión
- **THEN** la app sincroniza sola y deja de indicar cambios pendientes

### Requirement: Sincronizar a petición
Cuando el usuario pide sincronizar (icono de la cabecera o "Sincronizar ahora"), la app SHALL sincronizar de inmediato. Si no hay token vigente, MUST pedir antes uno nuevo a Google (desde ese mismo toque). Si el usuario cierra la ventana de Google, no se sincroniza y los cambios siguen pendientes.

#### Scenario: Toque sin token vigente
- **WHEN** el token ha caducado y el usuario toca el icono de sincronización
- **THEN** se renueva el token y se sincroniza

#### Scenario: Renovación cancelada
- **WHEN** el usuario toca para sincronizar y cierra la ventana de Google
- **THEN** no se sincroniza y sigue indicándose que hay cambios pendientes

### Requirement: Errores de Drive
Si la sincronización falla (sin red a mitad, error de Google o token rechazado), la app SHALL conservar los datos locales y los cambios pendientes, y MUST mostrar el estado de error con un mensaje en español. Un token rechazado MUST tratarse como token no vigente.

#### Scenario: Error de red a mitad
- **WHEN** la conexión se corta mientras se sube el archivo
- **THEN** los productos del dispositivo no se pierden, siguen los cambios pendientes y se indica el error

#### Scenario: Token rechazado
- **WHEN** Google responde que el token no es válido
- **THEN** la app indica que hay que tocar para sincronizar

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
