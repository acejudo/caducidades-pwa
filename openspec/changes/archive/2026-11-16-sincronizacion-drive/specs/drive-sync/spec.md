# Spec Delta

## Purpose

Define cómo se sincroniza la lista de productos del dispositivo con el archivo `caducidades.json` de Google Drive. Así varias personas autorizadas y varios dispositivos comparten una misma lista, también trabajando sin conexión.

## ADDED Requirements

### Requirement: Archivo de sincronización en Drive
La lista SHALL guardarse en Drive en un archivo `caducidades.json`, dentro de una carpeta `Caducidades`. El archivo tiene el formato de `docs/SPEC.md` §4.2: `version` 1, `ultimaActualizacion` en ISO 8601 UTC y `productos` con todos los productos, también los marcados como eliminados.

#### Scenario: Contenido del archivo
- **WHEN** se sincroniza un dispositivo con los productos "Leche" y "Pan", este último eliminado
- **THEN** el archivo de Drive contiene `version: 1`, una `ultimaActualizacion` y los dos productos con todos sus campos, "Pan" con `eliminado: true`

### Requirement: Localizar la lista
Para sincronizar, la app SHALL buscar `caducidades.json` (no en la papelera) entre los archivos de la cuenta y los compartidos con ella. Si hay varios, MUST usar el creado primero, para que todas las cuentas usen el mismo. Después MUST recordar en el dispositivo qué archivo usa, y volver a buscarlo solo si ese archivo deja de estar disponible.

#### Scenario: Lista compartida por otra cuenta
- **WHEN** la cuenta A compartió su carpeta `Caducidades` con la cuenta B y B sincroniza por primera vez
- **THEN** B usa el `caducidades.json` de A y ve sus productos

#### Scenario: Varias listas
- **WHEN** la cuenta ve dos archivos `caducidades.json`, uno creado el 1 de noviembre y otro el 5
- **THEN** usa el del 1 de noviembre

#### Scenario: Archivo recordado ya no disponible
- **WHEN** el archivo recordado se ha borrado o se ha dejado de compartir con la cuenta
- **THEN** la app vuelve a buscar la lista en lugar de fallar siempre

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
Si el archivo de Drive no es un JSON con el formato esperado, la sincronización SHALL fallar con un error, sin cambiar nada en el dispositivo ni sobrescribir el archivo. Los productos que no cumplen el modelo de `product-model` MUST ignorarse sin impedir la sincronización del resto.

#### Scenario: Archivo dañado
- **WHEN** el contenido de `caducidades.json` no es JSON
- **THEN** la sincronización termina con error, los productos del dispositivo no cambian y el archivo de Drive no se sobrescribe

#### Scenario: Un producto no válido
- **WHEN** el archivo contiene un producto sin `fechaCaducidad` y otros válidos
- **THEN** los válidos se sincronizan y el no válido se ignora

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
