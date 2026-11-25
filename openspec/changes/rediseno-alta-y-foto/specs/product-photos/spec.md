## ADDED Requirements

### Requirement: Sugerencia de foto por el nombre
La app SHALL poder sugerir una foto del catálogo a partir del nombre de un producto. Una palabra del nombre coincide con una foto si, sin distinguir mayúsculas ni acentos, es igual al nombre de la foto o lo es tras quitarle una "s" o "es" final. La sugerencia MUST ser la foto de la primera palabra que coincide, en el orden del nombre, y MUST NOT ser nunca "Genérico". Si ninguna palabra coincide, no hay sugerencia. Las coincidencias parciales dentro de una palabra MUST NOT contar.

#### Scenario: Palabra dentro del nombre
- **WHEN** se pide la sugerencia para "Pechuga de pollo"
- **THEN** es la foto "Pollo"

#### Scenario: Plural y mayúsculas
- **WHEN** se pide la sugerencia para "TOMATES" y para "Salmon ahumado"
- **THEN** son las fotos "Tomate" y "Salmón"

#### Scenario: Sin coincidencias parciales
- **WHEN** se pide la sugerencia para "Panceta" y para "Lechuga"
- **THEN** "Panceta" no tiene sugerencia y "Lechuga" sugiere "Lechuga", no "Leche"

#### Scenario: Nombre sin sugerencia
- **WHEN** se pide la sugerencia para "Kiwi", para "Genérico" o para un nombre vacío
- **THEN** no hay sugerencia

## MODIFIED Requirements

### Requirement: Pantalla Elegir foto
Elegir foto SHALL mostrar, de arriba abajo:
- una fila con los botones "Hacer foto" y "Galería";
- un buscador ("Buscar producto…");
- una cuadrícula de 4 columnas que empieza con la casilla "Sin foto" y sigue con todas las fotos del catálogo, cada una con su nombre debajo, y "Genérico" en último lugar.

La foto que tiene ahora el formulario de origen MUST verse marcada (borde de color y *check*) y anunciarse como seleccionada a los lectores de pantalla. "Sin foto" se marca solo si el usuario la eligió antes.

#### Scenario: Cuadrícula completa
- **WHEN** el usuario abre Elegir foto desde Nuevo producto
- **THEN** ve "Sin foto" en la primera casilla, todas las fotos del catálogo con su nombre, "Genérico" al final, cuatro casillas por fila y ninguna marcada

#### Scenario: Foto actual marcada
- **WHEN** el formulario de origen tiene la foto "Queso" y el usuario abre Elegir foto
- **THEN** "Queso" aparece marcada y ninguna otra

#### Scenario: Botones arriba
- **WHEN** el usuario abre Elegir foto
- **THEN** "Hacer foto" y "Galería" están en una fila por encima del buscador

### Requirement: Sin foto
La casilla "Sin foto" SHALL quitar la foto del formulario de origen y volver a él, conservando lo escrito. MUST verse siempre, también cuando el buscador no encuentra ninguna foto.

#### Scenario: Quitar la foto
- **WHEN** el formulario de origen tiene la foto "Leche" y el usuario pulsa "Sin foto"
- **THEN** vuelve al formulario, cuya miniatura muestra el icono de cámara, sin foto

#### Scenario: Sin foto con búsqueda vacía
- **WHEN** el usuario escribe "zzz" en el buscador
- **THEN** se ve "No hay fotos que coincidan" y la casilla "Sin foto" sigue visible

### Requirement: Hacer foto o elegirla de la galería
Elegir foto SHALL ofrecer, arriba y en una misma fila, "Hacer foto", que abre la cámara del dispositivo, y "Galería" (nombre accesible "Elegir de la galería"), que abre las fotos del dispositivo. Al elegir una imagen, la app MUST asignarla como foto real al formulario de origen y volver a él, conservando lo que se había escrito, sin guardarla en el producto hasta "Guardar".

#### Scenario: Foto de la galería en Nuevo producto
- **WHEN** el usuario escribe "Pollo" en Nuevo producto, abre Elegir foto, pulsa "Galería" y elige una imagen
- **THEN** vuelve a Nuevo producto con "Pollo" en el nombre y la imagen elegida en la miniatura

#### Scenario: Cancelar la cámara
- **WHEN** el usuario pulsa "Hacer foto" y cierra la cámara sin hacer ninguna foto
- **THEN** sigue en Elegir foto y la foto del formulario no cambia

#### Scenario: Botones disponibles
- **WHEN** el usuario abre Elegir foto
- **THEN** ve "Hacer foto", "Galería" y la casilla "Sin foto" activos
