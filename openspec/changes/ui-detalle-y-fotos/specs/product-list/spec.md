# Spec Delta

## MODIFIED Requirements

### Requirement: Información de cada producto
Cada producto del listado SHALL mostrar su foto (o un icono genérico si no hay foto disponible), su nombre, su fecha de caducidad en español ("Caduca el 20 nov 2026"), el texto de caducidad de `product-model` y la cantidad con su unidad ("Cantidad: 2 ud"; los decimales con coma, "0,5 kg"). El nombre y las notas MUST mostrarse como texto, nunca interpretarse como HTML.

#### Scenario: Tarjeta completa
- **WHEN** hoy es 2026-11-17 y hay un producto "Leche entera" que caduca el 2026-11-20 con cantidad 1 y unidad "ud"
- **THEN** su tarjeta muestra "Leche entera", "Caduca el 20 nov 2026", "Caduca en 3 días" y "Cantidad: 1 ud"

#### Scenario: Producto con foto predeterminada
- **WHEN** un producto tiene la foto predeterminada "Leche"
- **THEN** su tarjeta muestra la imagen de "Leche" en el lugar de la foto

#### Scenario: Producto sin foto
- **WHEN** un producto tiene foto de tipo "ninguna"
- **THEN** su tarjeta muestra un icono genérico de producto en el lugar de la foto

#### Scenario: Nombre con marcado
- **WHEN** un producto se llama `<b>Pan</b>`
- **THEN** la tarjeta muestra literalmente `<b>Pan</b>` y no aplica ningún formato

## ADDED Requirements

### Requirement: Deslizar para mostrar Eliminar
Deslizar una tarjeta hacia la izquierda más allá de un umbral SHALL dejarla desplazada con un botón "Eliminar" visible a su derecha. Si el desplazamiento no llega al umbral, la tarjeta MUST volver a su sitio. El desplazamiento vertical de la lista MUST seguir funcionando con normalidad. Solo una tarjeta puede estar abierta: abrir otra, deslizarla a la derecha o tocar fuera de ella la cierra.

#### Scenario: Deslizar lo suficiente
- **WHEN** el usuario desliza la tarjeta de "Leche" hacia la izquierda más allá del umbral y suelta
- **THEN** la tarjeta queda desplazada y se ve el botón "Eliminar"

#### Scenario: Deslizar poco
- **WHEN** el usuario desliza la tarjeta hacia la izquierda sin llegar al umbral y suelta
- **THEN** la tarjeta vuelve a su sitio y no se ve "Eliminar"

#### Scenario: Gesto vertical
- **WHEN** el usuario arrastra el dedo sobre una tarjeta sobre todo en vertical
- **THEN** la lista se desplaza y la tarjeta no se abre

#### Scenario: Tocar una tarjeta abierta
- **WHEN** la tarjeta de "Leche" está abierta y el usuario la toca
- **THEN** la tarjeta se cierra y no se abre el Detalle

#### Scenario: Una sola abierta
- **WHEN** la tarjeta de "Leche" está abierta y el usuario abre la de "Queso"
- **THEN** la de "Leche" se cierra

### Requirement: Eliminar desde el listado
Pulsar "Eliminar" en una tarjeta abierta SHALL pedir confirmación indicando el nombre del producto. Si se confirma, MUST eliminarlo según `product-storage` y quitarlo de la lista sin salir de Listado (con el estado vacío que corresponda). Si no, la tarjeta se cierra sin cambios. Si la eliminación falla, MUST mostrar un mensaje de error en español y conservar el producto en la lista.

#### Scenario: Eliminar confirmado
- **WHEN** el usuario abre la tarjeta de "Leche", pulsa "Eliminar" y confirma
- **THEN** "Leche" deja de existir en el almacenamiento y desaparece de la lista

#### Scenario: Eliminar el último producto
- **WHEN** solo hay un producto y el usuario lo elimina deslizando
- **THEN** Listado muestra "Todavía no hay productos"

#### Scenario: Eliminar cancelado
- **WHEN** el usuario pulsa "Eliminar" en una tarjeta abierta y en la confirmación elige no eliminar
- **THEN** la tarjeta se cierra y el producto sigue en la lista

#### Scenario: Fallo al eliminar
- **WHEN** el almacenamiento local falla al eliminar desde el listado
- **THEN** se muestra "No se pudo eliminar el producto. Inténtalo de nuevo." y el producto sigue en la lista
