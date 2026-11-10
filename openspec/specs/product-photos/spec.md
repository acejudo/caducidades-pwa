# product-photos Specification

## Purpose

Define las fotos de los productos: el catálogo de fotos predeterminadas incluido en la app, cómo se muestra la foto de un producto en cualquier pantalla y la pantalla Elegir foto, con la que el formulario asigna o quita la foto.

## Requirements

### Requirement: Catálogo de fotos predeterminadas
La app SHALL incluir un catálogo de fotos predeterminadas, cada una con un id simple (minúsculas, sin acentos ni espacios, único) y un nombre en español. El catálogo MUST contener al menos los ids de `docs/SPEC.md` §4.4: `yogur`, `leche`, `pollo`, `queso`, `huevos`, `salmon`, `manzana`, `platano`, `tomate`, `pan`, `arroz` y `generico`.

#### Scenario: Ids de la SPEC
- **WHEN** se consulta el catálogo
- **THEN** contiene los doce ids de la SPEC, sin ids repetidos

#### Scenario: Nombres en español
- **WHEN** se consultan las fotos `salmon`, `platano` y `generico`
- **THEN** sus nombres son "Salmón", "Plátano" y "Genérico"

### Requirement: Fotos predeterminadas sin conexión
Las fotos predeterminadas SHALL ir dentro de la propia app (nunca se descargan de Drive ni de otro servicio) y MUST estar disponibles sin conexión desde la primera carga completa de la app.

#### Scenario: Abrir Elegir foto sin conexión
- **WHEN** la app ya se cargó una vez con conexión, el dispositivo pasa a modo avión y el usuario abre Elegir foto
- **THEN** se ven todas las imágenes del catálogo

### Requirement: Foto de un producto
Allí donde la app muestre la foto de un producto (Listado, Detalle y zona de foto del formulario), SHALL mostrar la imagen del catálogo si la foto es predeterminada y su id existe en el catálogo. En cualquier otro caso (sin foto, id desconocido o foto real, que aún no se muestra) MUST mostrar el icono genérico de producto, sin errores.

#### Scenario: Foto predeterminada conocida
- **WHEN** un producto tiene `foto: { tipo: "predeterminada", valor: "leche" }`
- **THEN** su tarjeta del Listado y su Detalle muestran la imagen de "Leche"

#### Scenario: Id desconocido
- **WHEN** un producto tiene `foto: { tipo: "predeterminada", valor: "kiwi" }` y "kiwi" no está en el catálogo
- **THEN** se muestra el icono genérico de producto y no aparece ningún error en la consola

#### Scenario: Foto real todavía no disponible
- **WHEN** un producto tiene `foto: { tipo: "real", valor: "abc.jpg" }`
- **THEN** se muestra el icono genérico de producto

### Requirement: Pantalla Elegir foto
Elegir foto SHALL mostrar un buscador ("Buscar producto…") y una cuadrícula de 3 columnas con todas las fotos del catálogo, cada una con su nombre debajo, y "Genérico" en último lugar. Debajo de la cuadrícula SHALL mostrar los botones "Hacer foto" y "Sin foto". La foto que tiene ahora el formulario de origen MUST verse marcada (borde de color y *check*) y anunciarse como seleccionada a los lectores de pantalla.

#### Scenario: Cuadrícula completa
- **WHEN** el usuario abre Elegir foto desde Nuevo producto
- **THEN** ve todas las fotos del catálogo con su nombre, "Genérico" al final y ninguna marcada

#### Scenario: Foto actual marcada
- **WHEN** el formulario de origen tiene la foto "Queso" y el usuario abre Elegir foto
- **THEN** "Queso" aparece marcada y ninguna otra

### Requirement: Elegir una foto
Al pulsar una foto de la cuadrícula, la app SHALL asignarla al formulario de origen (el alta o la edición de ese producto) y volver a él, conservando lo que se había escrito. La foto MUST NOT guardarse en el producto hasta que se pulse "Guardar" en el formulario.

#### Scenario: Elegir desde Nuevo producto
- **WHEN** el usuario escribe "Pollo" en Nuevo producto, pulsa la zona de foto y elige "Pollo"
- **THEN** vuelve a Nuevo producto con "Pollo" en el nombre y la imagen de "Pollo" en la zona de foto

#### Scenario: Elegir desde la edición
- **WHEN** el usuario abre Elegir foto desde Editar producto de `abc` y elige "Huevos"
- **THEN** vuelve a Editar producto de `abc` con la imagen de "Huevos" y el producto guardado aún no ha cambiado

#### Scenario: Entrada directa por URL
- **WHEN** el usuario abre directamente Elegir foto de Nuevo producto y elige "Pan"
- **THEN** se muestra Nuevo producto con la imagen de "Pan" en la zona de foto

### Requirement: Sin foto
El botón "Sin foto" SHALL quitar la foto del formulario de origen y volver a él, conservando lo escrito.

#### Scenario: Quitar la foto
- **WHEN** el formulario de origen tiene la foto "Leche" y el usuario pulsa "Sin foto"
- **THEN** vuelve al formulario, que muestra la zona de foto vacía ("Toca para elegir foto")

### Requirement: Búsqueda de fotos
El buscador SHALL filtrar la cuadrícula mientras se escribe y mostrar las fotos cuyo nombre contenga el texto, sin distinguir mayúsculas ni acentos. Con el buscador vacío MUST verse todas. Si ninguna coincide, MUST mostrar "No hay fotos que coincidan" y "Sin foto" sigue disponible.

#### Scenario: Buscar sin acento
- **WHEN** el usuario escribe "platano"
- **THEN** la cuadrícula muestra solo "Plátano"

#### Scenario: Buscar parte del nombre
- **WHEN** el usuario escribe "LE"
- **THEN** la cuadrícula muestra "Leche" y las demás fotos cuyo nombre contiene "le", y no muestra "Pan"

#### Scenario: Sin coincidencias
- **WHEN** el usuario escribe "zzz"
- **THEN** se muestra "No hay fotos que coincidan" y el botón "Sin foto" sigue visible

### Requirement: Hacer foto preparado
Elegir foto SHALL mostrar el botón "Hacer foto" desactivado, con el texto "Próximamente", hasta que existan las fotos reales. Pulsarlo MUST NOT hacer nada.

#### Scenario: Botón desactivado
- **WHEN** el usuario abre Elegir foto
- **THEN** ve "Hacer foto" desactivado con "Próximamente"
