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
Cada producto del listado SHALL mostrarse en una fila compacta con su foto (o un icono genérico), su nombre en una línea y, debajo, el texto relativo de caducidad de `product-model` y la fecha corta ("21 nov", o "30 ene 2027" si es de otro año). La cantidad con su unidad ("0,5 kg") MUST mostrarse a la derecha solo si no es 1 ud. La fila MUST NOT mostrar "Caduca el …" ni "Cantidad:". El nombre MUST mostrarse como texto, nunca como HTML.

#### Scenario: Tarjeta completa
- **WHEN** hoy es 2026-11-17 y hay un producto "Leche entera" que caduca el 2026-11-20 con cantidad 2 y unidad "ud"
- **THEN** su fila muestra "Leche entera", "En 3 días", "20 nov" y "2 ud"

#### Scenario: Cantidad de una unidad
- **WHEN** un producto tiene cantidad 1 y unidad "ud"
- **THEN** su fila no muestra ninguna cantidad

#### Scenario: Cantidad decimal
- **WHEN** un producto tiene cantidad 0.5 y unidad "kg"
- **THEN** su fila muestra "0,5 kg"

#### Scenario: Fecha de otro año
- **WHEN** hoy es 2026-11-25 y un producto caduca el 2027-01-30
- **THEN** su fila muestra "30 ene 2027"

#### Scenario: Producto con foto predeterminada
- **WHEN** un producto tiene la foto predeterminada "Leche"
- **THEN** su fila muestra la imagen de "Leche" en el lugar de la foto

#### Scenario: Producto sin foto
- **WHEN** un producto tiene foto de tipo "ninguna"
- **THEN** su fila muestra un icono genérico de producto en el lugar de la foto

#### Scenario: Nombre con marcado
- **WHEN** un producto se llama `<b>Pan</b>`
- **THEN** la fila muestra literalmente `<b>Pan</b>` y no aplica ningún formato

### Requirement: Indicador de urgencia
El texto relativo de caducidad de cada fila SHALL mostrarse con el color de texto de su nivel de urgencia de `product-model` (rojo, naranja o verde de `ui-theme`), con contraste suficiente sobre el fondo de la fila. El color MUST ir siempre con el texto, para que la urgencia no dependa solo de distinguir colores, y la fila MUST NOT llevar además borde ni etiqueta de color.

#### Scenario: Colores por nivel
- **WHEN** hay un producto que caducó hace 3 días, uno que caduca en 2 días, uno en 5 días y otro en 12 días
- **THEN** sus textos relativos son rojo, rojo, naranja y verde, y dicen "Hace 3 días", "En 2 días", "En 5 días" y "En 12 días"

### Requirement: Filtros por estado
Listado SHALL ofrecer tres filtros excluyentes, en este orden: "Todos" (por defecto), "Caducados" (fecha de caducidad anterior a hoy) y "Esta semana" (caducan hoy o en los próximos 7 días y aún no han caducado). Cada filtro MUST mostrar junto a su nombre el número de productos que cumplen su condición ("Caducados · 3"). El filtro activo MUST verse marcado y conservar el orden de la lista. Al volver a Listado desde otra pantalla MUST mantenerse el último filtro elegido.

#### Scenario: Filtro Pronto
- **WHEN** hay productos que caducan dentro de −1, 0, 7 y 8 días y el usuario elige "Esta semana"
- **THEN** se muestran solo los de 0 y 7 días

#### Scenario: Filtro Caducadas
- **WHEN** hay productos que caducan dentro de −3, −1, 0 y 5 días y el usuario elige "Caducados"
- **THEN** se muestran solo los de −3 y −1 días, en ese orden

#### Scenario: Contadores
- **WHEN** hay productos que caducan dentro de −3, −1, 0, 5 y 20 días
- **THEN** los filtros dicen "Todos · 5", "Caducados · 2" y "Esta semana · 2"

#### Scenario: Filtro conservado
- **WHEN** el usuario elige "Esta semana", abre el Detalle de un producto y vuelve a Listado
- **THEN** el filtro "Esta semana" sigue activo

### Requirement: Estados vacíos
Si no hay ningún producto guardado, Listado SHALL mostrar un mensaje que lo indique e invite a añadir uno con "Añadir". Si hay productos pero ninguno cumple el filtro activo (sin búsqueda), MUST mostrar un mensaje propio de ese filtro, distinto del anterior.

#### Scenario: Sin productos
- **WHEN** no hay ningún producto guardado
- **THEN** Listado muestra "Todavía no hay productos" con una invitación a pulsar "Añadir", sin buscador ni filtros, y el botón "Añadir" sigue visible

#### Scenario: Filtro sin resultados
- **WHEN** hay productos pero ninguno caducado y el usuario elige "Caducados"
- **THEN** Listado muestra "No hay productos caducados" en lugar de la lista

#### Scenario: Esta semana sin resultados
- **WHEN** hay productos pero ninguno caduca en los próximos 7 días y el usuario elige "Esta semana"
- **THEN** Listado muestra "No hay productos que caduquen esta semana"

### Requirement: Error al cargar los productos
Si los productos no se pueden leer del almacenamiento local, Listado SHALL mostrar un mensaje de error en español con un botón "Reintentar" que vuelve a intentar la lectura. El resto de la app (cabecera con el acceso a Ajustes y botón "Añadir") MUST seguir funcionando.

#### Scenario: Almacenamiento no disponible
- **WHEN** el almacenamiento local falla al abrir Listado
- **THEN** se muestra "No se pudieron cargar los productos" con el botón "Reintentar", y el acceso a Ajustes y "Añadir" siguen funcionando

#### Scenario: Reintento correcto
- **WHEN** tras el error el almacenamiento vuelve a estar disponible y el usuario pulsa "Reintentar"
- **THEN** se muestra la lista de productos

### Requirement: Navegación desde el listado
Listado SHALL tener un botón flotante con el icono + y el texto "Añadir" que abre Nuevo producto. Pulsar cualquier producto MUST abrir el Detalle de ese producto.

#### Scenario: Abrir el detalle
- **WHEN** el usuario pulsa el producto con id `abc`
- **THEN** se muestra la pantalla Detalle del producto `abc`

#### Scenario: Añadir producto
- **WHEN** el usuario pulsa el botón "Añadir"
- **THEN** se muestra Nuevo producto

### Requirement: Días restantes actualizados
Los días restantes, la urgencia, las secciones, los filtros y sus contadores SHALL calcularse con la fecha del día en que se muestran. Si la app vuelve a primer plano después de haber estado en segundo plano, Listado MUST recalcularlos.

#### Scenario: La app vuelve al día siguiente
- **WHEN** Listado quedó abierto con un producto que caducaba "Mañana" y el usuario vuelve a la app al día siguiente
- **THEN** el producto muestra "Hoy" sin tener que recargar

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

### Requirement: Secciones del listado
Listado SHALL mostrar los productos visibles agrupados en las secciones de `product-model` ("Caducados", "Esta semana" y "Más adelante"), en ese orden. Cada sección MUST tener una cabecera con su título y el número de productos que contiene, y MUST NOT mostrarse si no tiene ninguno. Dentro de cada sección se conserva el orden por caducidad.

#### Scenario: Tres secciones
- **WHEN** hoy es 2026-11-25 y hay productos que caducan dentro de −20, −1, 0, 4, 9 y 60 días
- **THEN** Listado muestra "Caducados" con 2, "Esta semana" con 2 y "Más adelante" con 2, en ese orden, y cada cabecera indica su número

#### Scenario: Sección vacía oculta
- **WHEN** ningún producto ha caducado
- **THEN** no aparece la sección "Caducados"

#### Scenario: Una sección con un filtro
- **WHEN** el usuario elige el filtro "Caducados"
- **THEN** solo se ve la sección "Caducados", con su cabecera

### Requirement: Búsqueda por nombre
Listado SHALL tener un buscador "Buscar producto" que, al escribir, muestra solo los productos del filtro activo cuyo nombre contiene el texto, sin distinguir mayúsculas ni acentos; vacío, MUST mostrar todos los del filtro. Si ninguno coincide, MUST mostrar "Ningún producto coincide con «texto»", con el texto tal cual. Los contadores de los filtros MUST NOT depender de la búsqueda. Sin productos guardados no se muestra, y al volver a Listado aparece vacío.

#### Scenario: Buscar sin acentos
- **WHEN** hay "Plátano", "Pan" y "Leche" y el usuario escribe "PLATANO"
- **THEN** solo se ve "Plátano"

#### Scenario: Búsqueda y filtro
- **WHEN** hay "Leche" caducada y "Leche de avena" que caduca en 20 días, el filtro activo es "Caducados" y el usuario escribe "leche"
- **THEN** solo se ve "Leche"

#### Scenario: Sin coincidencias
- **WHEN** el usuario escribe "zzz"
- **THEN** se muestra "Ningún producto coincide con «zzz»" y el botón "Añadir" sigue visible

#### Scenario: Contadores con búsqueda
- **WHEN** hay 3 productos caducados y el usuario escribe un texto que solo coincide con uno de ellos
- **THEN** el filtro sigue mostrando "Caducados · 3"

#### Scenario: Búsqueda vacía al volver
- **WHEN** el usuario busca "leche", abre el Detalle de un producto y vuelve a Listado
- **THEN** el buscador está vacío y se ven todos los productos del filtro activo

### Requirement: Añadir sin tapar la lista
El botón "Añadir" SHALL quedar fijo abajo a la derecha, por encima de la zona segura. Al desplazar la lista hasta el final, la última fila MUST quedar entera por encima del botón.

#### Scenario: Última fila visible
- **WHEN** hay suficientes productos para desplazar la lista y el usuario llega al final, a 390 px de ancho
- **THEN** el borde inferior de la última fila queda por encima del borde superior de "Añadir"
