# product-list Specification

## Purpose

Define la pantalla principal de Caducidades: muestra los productos guardados en el dispositivo ordenados por caducidad, con su urgencia bien visible, permite filtrarlos por estado y lleva al alta y al detalle.

## Requirements

### Requirement: Productos del listado
Listado SHALL mostrar los productos guardados en el dispositivo que no estén eliminados, en el orden por caducidad de `product-model` (los más próximos o ya caducados primero). La lista MUST funcionar sin conexión.

#### Scenario: Orden del listado
- **WHEN** hay guardados "Queso" (caduca en 10 días), "Leche" (en 3 días) y "Yogur" (caducado ayer)
- **THEN** Listado muestra, de arriba abajo, "Yogur", "Leche" y "Queso"

#### Scenario: Productos eliminados
- **WHEN** un producto guardado está marcado como eliminado
- **THEN** no aparece en Listado

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

### Requirement: Indicador de urgencia
Cada producto SHALL llevar un indicador con el color de su nivel de urgencia de `product-model` (rojo, naranja o verde de `ui-theme`). El texto de caducidad MUST acompañar siempre al color, para que la urgencia no dependa solo de distinguir colores.

#### Scenario: Colores por nivel
- **WHEN** hay un producto caducado, uno que caduca en 2 días, uno en 5 días y otro en 12 días
- **THEN** sus indicadores son rojo, rojo, naranja y verde, y cada uno muestra su texto de caducidad

### Requirement: Filtros por estado
Listado SHALL ofrecer tres filtros excluyentes: "Todas" (por defecto), "Pronto" (caducan hoy o en los próximos 7 días y aún no han caducado) y "Caducadas" (fecha de caducidad anterior a hoy). El filtro activo MUST verse marcado y conservar el orden de la lista. Al volver a Listado desde otra pantalla MUST mantenerse el último filtro elegido.

#### Scenario: Filtro Pronto
- **WHEN** hay productos que caducan dentro de -1, 0, 7 y 8 días y el usuario elige "Pronto"
- **THEN** se muestran solo los de 0 y 7 días

#### Scenario: Filtro Caducadas
- **WHEN** hay productos que caducan dentro de -3, -1, 0 y 5 días y el usuario elige "Caducadas"
- **THEN** se muestran solo los de -3 y -1 días, en ese orden

#### Scenario: Filtro conservado
- **WHEN** el usuario elige "Pronto", abre el Detalle de un producto y vuelve a Listado
- **THEN** el filtro "Pronto" sigue activo

### Requirement: Estados vacíos
Si no hay ningún producto guardado, Listado SHALL mostrar un mensaje que lo indique e invite a añadir uno con "+". Si hay productos pero ninguno cumple el filtro activo, MUST mostrar un mensaje propio de ese filtro, distinto del anterior.

#### Scenario: Sin productos
- **WHEN** no hay ningún producto guardado
- **THEN** Listado muestra "Todavía no hay productos" con una invitación a pulsar "+", y el botón "+" sigue visible

#### Scenario: Filtro sin resultados
- **WHEN** hay productos pero ninguno caducado y el usuario elige "Caducadas"
- **THEN** Listado muestra "No hay productos caducados" en lugar de la lista

### Requirement: Error al cargar los productos
Si los productos no se pueden leer del almacenamiento local, Listado SHALL mostrar un mensaje de error en español con un botón "Reintentar" que vuelve a intentar la lectura. El resto de la app (cabecera, navegación y botón "+") MUST seguir funcionando.

#### Scenario: Almacenamiento no disponible
- **WHEN** el almacenamiento local falla al abrir Listado
- **THEN** se muestra "No se pudieron cargar los productos" con el botón "Reintentar", y la barra de navegación sigue funcionando

#### Scenario: Reintento correcto
- **WHEN** tras el error el almacenamiento vuelve a estar disponible y el usuario pulsa "Reintentar"
- **THEN** se muestra la lista de productos

### Requirement: Navegación desde el listado
Listado SHALL tener un botón flotante "+" que abre Nuevo producto. Pulsar cualquier producto MUST abrir el Detalle de ese producto.

#### Scenario: Abrir el detalle
- **WHEN** el usuario pulsa el producto con id `abc`
- **THEN** se muestra la pantalla Detalle del producto `abc`

#### Scenario: Añadir producto
- **WHEN** el usuario pulsa el botón "+"
- **THEN** se muestra Nuevo producto

### Requirement: Días restantes actualizados
Los días restantes, la urgencia y los filtros SHALL calcularse con la fecha del día en que se muestran. Si la app vuelve a primer plano después de haber estado en segundo plano, Listado MUST recalcularlos.

#### Scenario: La app vuelve al día siguiente
- **WHEN** Listado quedó abierto con un producto que caducaba "mañana" y el usuario vuelve a la app al día siguiente
- **THEN** el producto muestra "Caduca hoy" sin tener que recargar

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
