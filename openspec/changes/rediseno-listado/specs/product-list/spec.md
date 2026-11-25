## ADDED Requirements

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
Listado SHALL tener un buscador "Buscar producto" que, mientras se escribe, muestra solo los productos cuyo nombre contiene el texto, sin distinguir mayúsculas ni acentos, a la vez que el filtro activo. Con el buscador vacío MUST verse todos los del filtro. Si ninguno coincide, MUST mostrar "Ningún producto coincide con «texto»", con el texto escrito tal cual. Los contadores de los filtros MUST NOT depender de la búsqueda. Sin ningún producto guardado, el buscador no se muestra. Al volver a Listado desde otra pantalla, el buscador aparece vacío.

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

## MODIFIED Requirements

### Requirement: Información de cada producto
Cada producto del listado SHALL mostrarse en una fila compacta con su foto (o un icono genérico si no hay foto disponible), su nombre en una sola línea y, debajo, el texto relativo de caducidad de `product-model` seguido de la fecha de caducidad corta en español ("21 nov" si es de este año, "30 ene 2027" si no). La cantidad con su unidad ("2 ud", "0,5 kg", con decimales con coma) MUST mostrarse a la derecha solo si no es 1 ud. La fila MUST NOT mostrar "Caduca el …" ni "Cantidad:". El nombre y las notas MUST mostrarse como texto, nunca interpretarse como HTML.

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
