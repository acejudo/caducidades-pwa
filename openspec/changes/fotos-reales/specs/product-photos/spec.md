# Spec Delta

## MODIFIED Requirements

### Requirement: Foto de un producto
Allí donde la app muestre la foto de un producto (Listado, Detalle y zona de foto del formulario), SHALL mostrar la imagen del catálogo si la foto es predeterminada y su id existe en el catálogo, y la foto real si es de tipo `real` y está guardada en el dispositivo. En cualquier otro caso (sin foto, id desconocido o foto real que aún no está en el dispositivo) MUST mostrar el icono genérico de producto, sin errores.

#### Scenario: Foto predeterminada conocida
- **WHEN** un producto tiene `foto: { tipo: "predeterminada", valor: "leche" }`
- **THEN** su tarjeta del Listado y su Detalle muestran la imagen de "Leche"

#### Scenario: Id desconocido
- **WHEN** un producto tiene `foto: { tipo: "predeterminada", valor: "kiwi" }` y "kiwi" no está en el catálogo
- **THEN** se muestra el icono genérico de producto y no aparece ningún error en la consola

#### Scenario: Foto real en el dispositivo
- **WHEN** un producto tiene una foto real que está guardada en el dispositivo
- **THEN** su tarjeta del Listado y su Detalle muestran esa foto

#### Scenario: Foto real todavía no disponible
- **WHEN** un producto tiene una foto real que aún no se ha descargado al dispositivo
- **THEN** se muestra el icono genérico de producto y no aparece ningún error en la consola

## ADDED Requirements

### Requirement: Hacer foto o elegirla de la galería
Elegir foto SHALL ofrecer, debajo de la cuadrícula, "Hacer foto", que abre la cámara del dispositivo; "Elegir de la galería", que abre las fotos del dispositivo; y "Sin foto". Al elegir una imagen, la app MUST asignarla como foto real al formulario de origen y volver a él, conservando lo que se había escrito, sin guardarla en el producto hasta "Guardar".

#### Scenario: Foto de la galería en Nuevo producto
- **WHEN** el usuario escribe "Pollo" en Nuevo producto, abre Elegir foto, pulsa "Elegir de la galería" y elige una imagen
- **THEN** vuelve a Nuevo producto con "Pollo" en el nombre y la imagen elegida en la zona de foto

#### Scenario: Cancelar la cámara
- **WHEN** el usuario pulsa "Hacer foto" y cierra la cámara sin hacer ninguna foto
- **THEN** sigue en Elegir foto y la foto del formulario no cambia

#### Scenario: Botones disponibles
- **WHEN** el usuario abre Elegir foto
- **THEN** ve "Hacer foto", "Elegir de la galería" y "Sin foto" activos, y ya no aparece "Próximamente"

### Requirement: Compresión de las fotos reales
Antes de usar una foto real, la app SHALL reducirla para que su lado mayor no pase de 1024 px (sin ampliar las pequeñas ni deformarlas) y guardarla en WebP, o en JPEG si el navegador no puede generar WebP. Si la imagen no se puede leer, MUST mostrar "No se pudo usar esta foto", seguir en Elegir foto y no cambiar la foto del formulario.

#### Scenario: Foto grande
- **WHEN** el usuario elige una imagen de 4000×3000 px
- **THEN** la foto asignada mide 1024×768 px y es WebP o JPEG

#### Scenario: Foto pequeña
- **WHEN** el usuario elige una imagen de 600×400 px
- **THEN** la foto asignada mide 600×400 px

#### Scenario: Archivo que no es una imagen
- **WHEN** el usuario elige un archivo que no se puede leer como imagen
- **THEN** se muestra "No se pudo usar esta foto", sigue en Elegir foto y la foto del formulario no cambia

### Requirement: Mientras se prepara la foto
Mientras se comprime una foto, Elegir foto SHALL indicar "Preparando foto…" y MUST ignorar otros toques en las fotos y los botones, para no asignar dos fotos ni volver dos veces.

#### Scenario: Doble elección
- **WHEN** el usuario elige una imagen de la galería y, mientras se prepara, pulsa la foto "Queso"
- **THEN** el formulario recibe solo la imagen de la galería y se vuelve una sola vez

## REMOVED Requirements

### Requirement: Hacer foto preparado
**Reason**: Las fotos reales ya existen: "Hacer foto" funciona y deja de estar desactivado.
**Migration**: Lo sustituyen "Hacer foto o elegirla de la galería" y "Compresión de las fotos reales".
