# expiry-alerts Specification

## Purpose
Define el aviso dentro de la app que, al abrir el Listado, resume los productos caducados o a punto de caducar, y la preferencia de Ajustes que lo activa. Sustituye a las notificaciones del sistema, que una PWA sin servidor no puede programar.

## Requirements

### Requirement: Productos urgentes
Un producto no eliminado SHALL considerarse urgente si sus días restantes son 2 o menos, es decir, si su nivel de urgencia es `rojo` según `product-model`. El límite MUST salir de la misma configuración compartida. Los urgentes se dividen en caducados (días restantes negativos) y próximos (de 0 a 2 días).

#### Scenario: Clasificación
- **WHEN** hay productos que caducan dentro de -3, -1, 0, 2, 3 y 10 días
- **THEN** hay 2 caducados (-3 y -1), 2 próximos (0 y 2) y los de 3 y 10 días no son urgentes

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

### Requirement: Tocar el aviso
Al tocar el aviso, el Listado SHALL activar el filtro "Caducados" si hay algún producto caducado, o "Esta semana" si no. El aviso MUST poder usarse con el teclado y anunciarse a los lectores de pantalla.

#### Scenario: Con caducados
- **WHEN** el aviso cuenta 1 caducado y 2 próximos y el usuario lo toca
- **THEN** el filtro "Caducados" queda activo y se ve el producto caducado

#### Scenario: Solo próximos
- **WHEN** el aviso cuenta solo productos próximos y el usuario lo toca
- **THEN** el filtro "Esta semana" queda activo

### Requirement: Cerrar el aviso
El aviso SHALL tener un botón para cerrarlo ("Cerrar aviso" para los lectores de pantalla). Una vez cerrado, MUST NOT volver a mostrarse al navegar por la app ni al recalcular el Listado, hasta la siguiente vez que se abra la app.

#### Scenario: Cerrar y volver al Listado
- **WHEN** el usuario cierra el aviso, abre el Detalle de un producto y vuelve al Listado
- **THEN** el aviso sigue sin mostrarse

#### Scenario: Volver a abrir la app
- **WHEN** el usuario cerró el aviso, cierra la app y la vuelve a abrir con productos urgentes
- **THEN** el aviso se muestra otra vez

### Requirement: Aviso actualizado
El aviso SHALL calcularse con los mismos productos y la misma fecha que el Listado. Si cambian, por ejemplo porque se elimina un producto desde la lista o porque la app vuelve a primer plano otro día, MUST actualizarse o desaparecer.

#### Scenario: Eliminar el último urgente
- **WHEN** el aviso cuenta 1 producto próximo y el usuario lo elimina deslizando su tarjeta
- **THEN** el aviso desaparece

#### Scenario: Al día siguiente
- **WHEN** el Listado quedó abierto sin productos urgentes y uno pasa a caducar en 2 días al volver a la app al día siguiente
- **THEN** se muestra el aviso con ese producto

### Requirement: Preferencia de avisos en Ajustes
Ajustes SHALL incluir una sección "Avisos" con un interruptor, "Avisar de lo que caduca pronto", activado por defecto. El valor MUST guardarse en el dispositivo y conservarse al cerrar la app y al cerrar sesión. No se sincroniza con Drive. Si no se puede guardar, MUST seguir funcionando con el valor elegido mientras la app esté abierta.

#### Scenario: Valor por defecto
- **WHEN** el usuario abre Ajustes por primera vez
- **THEN** el interruptor "Avisar de lo que caduca pronto" está activado

#### Scenario: Desactivar los avisos
- **WHEN** el usuario desactiva el interruptor y vuelve al Listado con productos urgentes
- **THEN** no se muestra ningún aviso

#### Scenario: Preferencia conservada
- **WHEN** el usuario desactiva el interruptor, cierra la app y la vuelve a abrir
- **THEN** el interruptor sigue desactivado y el Listado no muestra el aviso

#### Scenario: Almacenamiento bloqueado
- **WHEN** el navegador no deja guardar datos y el usuario desactiva el interruptor
- **THEN** no aparece ningún error y el Listado no muestra el aviso mientras la app siga abierta

### Requirement: Sin notificaciones del sistema
Los avisos SHALL mostrarse solo dentro de la app. La app MUST NOT pedir permiso de notificaciones ni usar notificaciones del sistema o *push*.

#### Scenario: Sin permisos
- **WHEN** el usuario usa la app con el aviso activado
- **THEN** el navegador no pide nunca permiso para mostrar notificaciones
