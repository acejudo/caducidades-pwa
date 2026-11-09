# product-storage Specification

## Purpose

Guarda los productos en el propio dispositivo para que la app funcione sin conexión, ofrece las operaciones de alta, lectura, edición y baja, y deja en cada producto la información (`actualizado` y marca de borrado) que necesitará la sincronización con Google Drive.

## Requirements

### Requirement: Persistencia local sin conexión
Los productos SHALL guardarse en el almacenamiento persistente del navegador del dispositivo. MUST seguir disponibles al recargar, al cerrar y volver a abrir la app y sin conexión, sin depender de ningún servidor.

#### Scenario: Reapertura
- **WHEN** el usuario crea un producto, cierra la app y la vuelve a abrir
- **THEN** el producto sigue disponible con los mismos datos

#### Scenario: Sin conexión
- **WHEN** el dispositivo está en modo avión y se crea, edita o elimina un producto
- **THEN** la operación se completa y se refleja en las lecturas posteriores

### Requirement: Alta de producto
Crear un producto SHALL validarlo según `product-model`, asignarle un `id` nuevo, `eliminado: false` y `actualizado` con la fecha y hora actuales, guardarlo y devolver el producto guardado. Si no es válido, MUST rechazarse con el error de validación y no guardarse nada.

#### Scenario: Alta válida
- **WHEN** se crea un producto válido
- **THEN** se devuelve con su `id` y `actualizado`, y al leerlo por ese `id` se obtienen los mismos datos

#### Scenario: Alta no válida
- **WHEN** se intenta crear un producto sin nombre
- **THEN** la operación falla con el error de validación del campo `nombre` y el número de productos no cambia

### Requirement: Lectura de todos los productos
Leer todos los productos SHALL devolver los productos no eliminados ordenados según el orden por caducidad de `product-model`. Si no hay ninguno, MUST devolver una lista vacía.

#### Scenario: Lista ordenada
- **WHEN** hay cuatro productos guardados con distintas fechas de caducidad y uno de ellos está eliminado
- **THEN** se devuelven los tres no eliminados, del más próximo al más lejano

#### Scenario: Sin productos
- **WHEN** no se ha guardado ningún producto
- **THEN** se devuelve una lista vacía, sin error

### Requirement: Lectura de un producto por id
Leer un producto por su `id` SHALL devolver ese producto. Si no existe o está eliminado, MUST devolver un resultado vacío en lugar de un error.

#### Scenario: Producto existente
- **WHEN** se lee un producto por el `id` devuelto al crearlo
- **THEN** se obtiene ese producto

#### Scenario: Id desconocido o eliminado
- **WHEN** se lee un `id` que no existe o que corresponde a un producto eliminado
- **THEN** el resultado está vacío

### Requirement: Actualización de producto
Actualizar un producto SHALL aplicar los cambios indicados sobre el producto guardado, validarlo completo según `product-model`, poner un `actualizado` nuevo y devolver el producto resultante. MUST rechazarse sin cambiar nada si el producto no existe, está eliminado o el resultado no es válido.

#### Scenario: Edición parcial
- **WHEN** se actualiza solo la cantidad de un producto a 3
- **THEN** la cantidad pasa a 3, el resto de campos no cambia y `actualizado` es posterior al anterior

#### Scenario: Edición no válida
- **WHEN** se actualiza un producto con el nombre vacío
- **THEN** la operación falla con el error de validación y el producto guardado no cambia

#### Scenario: Producto inexistente
- **WHEN** se intenta actualizar un `id` que no existe o que está eliminado
- **THEN** la operación falla indicando que el producto no existe

### Requirement: Baja con marca de borrado
Eliminar un producto SHALL marcarlo como eliminado y poner un `actualizado` nuevo, conservando el registro para la sincronización. Desde ese momento MUST NOT aparecer en ninguna lectura ni poder actualizarse. Eliminar un `id` que no existe o ya eliminado MUST NOT producir error ni cambios.

#### Scenario: Eliminar
- **WHEN** se elimina un producto existente
- **THEN** deja de aparecer en la lista y en la lectura por `id`, y su registro interno queda con `eliminado: true` y un `actualizado` nuevo

#### Scenario: Eliminar dos veces
- **WHEN** se elimina un producto que ya estaba eliminado
- **THEN** la operación termina sin error y su `actualizado` no cambia

### Requirement: Marca de tiempo en cada escritura
Toda escritura (alta, actualización y baja) SHALL poner en `actualizado` la fecha y hora actuales del dispositivo en ISO 8601 UTC. El valor de `actualizado` MUST NOT poder fijarse desde los datos de entrada.

#### Scenario: Valor de entrada ignorado
- **WHEN** se crea o actualiza un producto indicando `actualizado: "2000-01-01T00:00:00.000Z"`
- **THEN** el producto guardado tiene como `actualizado` la fecha y hora de la operación

### Requirement: Almacenamiento no disponible
Si el almacenamiento local no está disponible o falla (por ejemplo, bloqueado por el navegador o sin espacio), las operaciones SHALL fallar con un error identificable como de almacenamiento, distinto del de validación, sin bloquear el resto de la app.

#### Scenario: Navegador sin almacenamiento
- **WHEN** el navegador no permite usar el almacenamiento local y se intenta leer la lista de productos
- **THEN** la operación falla con un error de almacenamiento y la app sigue respondiendo

### Requirement: Datos compartidos y conservados al cerrar sesión
Los productos del dispositivo SHALL ser una única lista común a todas las personas autorizadas, sin separarse por cuenta. Cerrar sesión MUST NOT borrar los productos guardados en el dispositivo.

#### Scenario: Cerrar sesión y volver a entrar
- **WHEN** hay productos guardados, el usuario cierra sesión y vuelve a entrar con la misma cuenta o con otra cuenta autorizada
- **THEN** se ven los mismos productos que antes de cerrar sesión, también sin conexión
