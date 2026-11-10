# Spec Delta

## Purpose

Define las pantallas Nuevo producto y Editar producto: un formulario único para crear y modificar productos en el almacenamiento local, con validación en español, confirmaciones antes de perder o borrar datos y vuelta al listado al terminar.

## ADDED Requirements

### Requirement: Campos del formulario
Nuevo producto y Editar producto SHALL mostrar, en este orden: zona de foto, Nombre, Fecha de compra (opcional), Fecha de caducidad (obligatoria), Cantidad con botones − y + junto a un desplegable de unidad (ud, pack, kg, g, l, ml), Categoría (Nevera, Congelador, Despensa, Otros) y Notas (opcional). Cada campo MUST tener su etiqueta visible; los obligatorios llevan `*` y los opcionales "(opcional)".

#### Scenario: Formulario de alta vacío
- **WHEN** el usuario abre Nuevo producto
- **THEN** ve los campos en ese orden, con nombre, fechas y notas vacíos, cantidad 1, unidad "ud" y categoría "Nevera", y los botones "Guardar" y "Cancelar" sin "Eliminar"

#### Scenario: Formulario de edición relleno
- **WHEN** el usuario abre Editar producto de un producto existente
- **THEN** ve todos sus datos en los campos y los botones "Guardar", "Cancelar" y "Eliminar"

#### Scenario: Unidad fuera de la lista
- **WHEN** se edita un producto guardado con una unidad que no está en la lista (por ejemplo, "bote")
- **THEN** el desplegable incluye esa unidad, la muestra seleccionada y se conserva al guardar

### Requirement: Botones de cantidad
El botón + SHALL sumar 1 a la cantidad y el botón − MUST restar 1, sin bajar de 1 (en ese punto queda desactivado). La cantidad también MUST poder escribirse a mano, con coma o punto decimal.

#### Scenario: Sumar y restar
- **WHEN** la cantidad es 1 y el usuario pulsa + dos veces y − una vez
- **THEN** la cantidad es 2

#### Scenario: Mínimo
- **WHEN** la cantidad es 1
- **THEN** el botón − está desactivado

#### Scenario: Cantidad decimal escrita
- **WHEN** el usuario escribe "0,5" en la cantidad, elige "kg" y guarda
- **THEN** el producto se guarda con cantidad 0.5 y unidad "kg"

### Requirement: Validación en el formulario
Al pulsar "Guardar" con datos no válidos según `product-model`, el formulario SHALL mostrar el mensaje en español de cada campo incorrecto junto a ese campo, marcarlo como no válido para los lectores de pantalla y mover el foco al primero. MUST NOT guardarse nada ni perderse lo escrito. El mensaje de un campo MUST desaparecer al corregirlo.

#### Scenario: Guardar sin obligatorios
- **WHEN** el usuario pulsa "Guardar" con el nombre y la fecha de caducidad vacíos
- **THEN** aparecen "El nombre es obligatorio" y "La fecha de caducidad es obligatoria" junto a sus campos, el foco va a Nombre y no se crea ningún producto

#### Scenario: Corregir un campo
- **WHEN** tras ese error el usuario escribe un nombre
- **THEN** desaparece el mensaje del nombre y sigue el de la fecha de caducidad

### Requirement: Guardar
Al pulsar "Guardar" con datos válidos, la app SHALL crear el producto (Nuevo) o actualizarlo (Editar) en el almacenamiento local, también sin conexión, y volver al Listado, donde MUST aparecer ya con los datos nuevos. Mientras guarda, el botón MUST quedar desactivado para evitar guardados duplicados. Editar MUST NOT cambiar la foto del producto.

#### Scenario: Alta correcta
- **WHEN** el usuario rellena "Yogur" con caducidad dentro de 5 días y pulsa "Guardar"
- **THEN** se crea el producto, se muestra el Listado y "Yogur" aparece en él

#### Scenario: Edición correcta
- **WHEN** el usuario cambia la cantidad de un producto a 3 y pulsa "Guardar"
- **THEN** el producto queda guardado con cantidad 3 y el mismo id, y se muestra el Listado

#### Scenario: Doble pulsación
- **WHEN** el usuario pulsa "Guardar" dos veces seguidas en un alta válida
- **THEN** se crea un único producto

#### Scenario: Fallo al guardar
- **WHEN** el almacenamiento local falla al guardar
- **THEN** el formulario sigue abierto con lo escrito, muestra "No se pudo guardar el producto. Inténtalo de nuevo." y el botón "Guardar" vuelve a estar disponible

### Requirement: Cancelar
"Cancelar" SHALL volver a la pantalla anterior sin guardar. Si el usuario ha cambiado algún campo, MUST preguntar antes "¿Descartar los cambios?" y solo salir si lo confirma.

#### Scenario: Cancelar sin cambios
- **WHEN** el usuario abre Nuevo producto y pulsa "Cancelar" sin tocar nada
- **THEN** vuelve al Listado sin ninguna pregunta

#### Scenario: Cancelar con cambios y seguir editando
- **WHEN** el usuario ha escrito un nombre, pulsa "Cancelar" y en la pregunta elige seguir editando
- **THEN** sigue en el formulario con el nombre escrito

#### Scenario: Cancelar con cambios y descartar
- **WHEN** el usuario ha escrito un nombre, pulsa "Cancelar" y confirma descartar
- **THEN** vuelve al Listado y no se guarda nada

### Requirement: Eliminar desde la edición
En Editar producto, "Eliminar" SHALL pedir confirmación indicando el nombre del producto. Si se confirma, MUST eliminar el producto según `product-storage` y volver al Listado; si no, no cambia nada.

#### Scenario: Eliminar confirmado
- **WHEN** el usuario pulsa "Eliminar" en la edición de "Leche" y confirma
- **THEN** "Leche" deja de existir en el almacenamiento y de aparecer en el Listado, que se muestra a continuación

#### Scenario: Eliminar cancelado
- **WHEN** el usuario pulsa "Eliminar" y en la confirmación elige no eliminar
- **THEN** sigue en el formulario y el producto no cambia

### Requirement: Diálogo de confirmación
Las confirmaciones SHALL mostrarse en un diálogo modal de la app, en español, con un título, un texto y dos botones (la acción y la alternativa para no hacerla). Mientras está abierto MUST impedir interactuar con la pantalla de detrás; la tecla Escape o la alternativa MUST cerrarlo sin hacer la acción, y el foco MUST volver al elemento que lo abrió.

#### Scenario: Cerrar con Escape
- **WHEN** el diálogo de eliminar está abierto y el usuario pulsa Escape
- **THEN** el diálogo se cierra, el producto no se elimina y el foco vuelve al botón "Eliminar"

### Requirement: Producto inexistente
Si se abre Editar producto de un id que no existe o está eliminado, la pantalla SHALL mostrar "Este producto no existe o se ha eliminado" con un enlace al Listado, sin formulario.

#### Scenario: Editar un id desconocido
- **WHEN** el usuario abre Editar producto con un id que no existe
- **THEN** ve el aviso y el enlace "Volver al listado"

### Requirement: Borrador al elegir foto
Al pulsar la zona de foto, el formulario SHALL guardar en memoria lo escrito y abrir Elegir foto. Al volver a ese mismo formulario (el alta, o la edición del mismo producto) MUST recuperar lo escrito. Guardar, cancelar o eliminar MUST descartar el borrador.

#### Scenario: Ir a Elegir foto y volver
- **WHEN** el usuario escribe "Pollo" en Nuevo producto, pulsa la zona de foto y después vuelve
- **THEN** el formulario muestra "Pollo" en el nombre

#### Scenario: Borrador descartado al guardar
- **WHEN** tras recuperar el borrador el usuario guarda el producto y después abre de nuevo Nuevo producto
- **THEN** el formulario aparece vacío
