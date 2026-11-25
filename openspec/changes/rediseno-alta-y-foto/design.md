# Diseño: rediseno-alta-y-foto

## Contexto

La motivación está en `proposal.md`. Este cambio se aplica **después** de `rediseno-listado`: da por hecho que ya no hay barra inferior y que la cabecera admite `accionCabecera`.

Estado actual del código:

- **`formulario.js`, `construirFormulario`:**
  - pinta en una columna `zonaDeFoto` (un enlace de fila completa a Elegir foto), Nombre, Fecha de compra (con el botón ✕), Fecha de caducidad, Cantidad (− / + y la unidad), Categoría (un `<select>` con `CATEGORIAS`) y Notas (un `<textarea>`);
  - abajo, la fila fija con el aviso, "Guardar" y "Cancelar".
- **`controles` y valores:** `controles` es un objeto de elementos con `.value`. `leerValores`, `aplicarValores` y `estadoInicial` (para saber si hay cambios) trabajan sobre él.
- **Borrador:** al tocar la zona de foto, se guarda `{ valores, foto, imagen? }` (`borradores.js`). Elegir foto escribe en el borrador la foto elegida y vuelve.
- **`activarCancelar`:** compara con `estadoInicial`, confirma "¿Descartar los cambios?", descarta el borrador y llama a `navegacion.volver()`.
- **La flecha de volver de la cabecera** (`ui.js`) llama a `volver()` sin preguntar a la pantalla.
- **`elegir-foto.js`:** buscador, `<ul class="fotos">` de 3 columnas con el catálogo ("Genérico" al final), mensaje "No hay fotos que coincidan" y, debajo, "Hacer foto", "Sin foto" y "Elegir de la galería", con dos `<input type="file">` ocultos.
- **`fotos.js`:** el catálogo de 20 fotos y `filtrarFotos`. `simplificar` ya está en `formato.js` tras `rediseno-listado`.

## Objetivos / No objetivos

**Objetivos**
- Que un alta típica sea: escribir el nombre (la foto se pone sola) → tocar un plazo → Guardar.
- Que el formulario siga cabiendo sin scroll a 390×740.
- No cambiar el modelo ni la sincronización.

**No objetivos**
- Sugerir la caducidad según el producto o el historial ("la leche te dura 7 días"). Queda como idea para otro cambio.
- Clasificar el catálogo por tipos (Lácteos, Carne…) en Elegir foto. Con 20 fotos basta el buscador.
- Cambiar el Detalle.

## Decisiones

### 1. `sugerirFoto(nombre)` en `fotos.js` (puro)
- Parte el nombre simplificado en palabras (separadas por espacios y signos).
- Para cada palabra, en orden, busca una foto del catálogo, salvo `generico`, cuyo nombre simplificado sea igual a la palabra, o a la palabra sin una `s` o `es` final (plurales: "tomates" → "tomate", "huevos" → "huevos").
- Devuelve la foto de la primera palabra que coincide, o `null`.
- Con la palabra entera se evitan falsos positivos como "panceta" → Pan o "lechuga" → Leche.

### 2. Cuándo se aplica la sugerencia
- El formulario guarda `fotoElegida`: `true` si la foto actual la eligió el usuario (en Elegir foto, incluido "Sin foto", o una foto real) o si es la que ya tenía el producto en la edición.
- En el alta empieza en `false`. En la edición empieza en `true` si el producto tiene foto y en `false` si no tiene.
- En cada `input` del nombre, si `fotoElegida` es `false`, se recalcula `sugerirFoto`:
  - si hay sugerencia, la foto actual pasa a `{ tipo: 'predeterminada', valor: id }`;
  - si no hay y la foto actual era una sugerencia, vuelve a `SIN_FOTO`;
  - la miniatura se repinta.
- **El borrador** guarda también `fotoElegida`. Elegir foto lo pone a `true` al elegir cualquier opción, y volver con la flecha sin elegir lo conserva.
- **Cambios sin guardar:** la foto sugerida cuenta como un cambio de foto, igual que ahora. En el alta no importa, porque escribir el nombre ya es un cambio.

### 3. Miniatura junto al nombre
- La primera fila del formulario es `.formulario__cabeza`, en flex: la miniatura a la izquierda y el campo Nombre a la derecha.
- La miniatura es un `<a href={hrefFoto} class="miniatura-foto" aria-label="Cambiar foto">` de 72×72. Contiene la imagen, pintada con `pintarFoto` (o la cámara si no hay foto) y una insignia circular con `ICONOS.camara` (`aria-hidden`).
- Sin foto, el `aria-label` es "Elegir foto".
- Desaparecen "Toca para elegir foto", "Predeterminada, cámara o galería", "Toca para cambiar" y el nombre de la foto.
- Un `<span class="visualmente-oculto">` dentro del enlace dice el nombre de la foto ("Foto: Leche", "Foto: tu foto"), para no perder esa información con los lectores de pantalla.
- `zonaDeFoto` se reescribe como `miniaturaDeFoto`, que devuelve `{ zona, pintada, repintar(foto, imagen) }`. Así la sugerencia la cambia sin reconstruir el formulario.

### 4. Plazos rápidos
- `PLAZOS` en `constantes.js`: `[{ texto: '+3 días', dias: 3 }, { texto: '+1 semana', dias: 7 }, { texto: '+2 semanas', dias: 14 }, { texto: '+1 mes', meses: 1 }]`.
- **`sumarPlazo(fechaISO, plazo)` en `productos.js` (puro):**
  - suma días en el calendario local, sin depender del horario de verano, con la misma técnica que `diasRestantes`;
  - con `meses`, va al mismo día del mes siguiente o, si no existe, al último día de ese mes (31 ene → 28 feb, o 29 en bisiesto).
- **Botones:** `<button type="button" class="plazo" aria-pressed>` en una fila bajo la fecha de caducidad. Al pulsar uno:
  - `fechaCaducidad.value = sumarPlazo(fechaLocal(hoy()), plazo)`;
  - se lanzan `input` y `change`, así se limpia el error de la fecha y se actualiza el borrador.
- **Estado marcado:** `aria-pressed="true"` en el plazo cuyo resultado coincide con la fecha actual. Se recalcula con `input` y `change` de la fecha.
- **Cuánto falta:** `<span class="campo__ayuda" id="ayuda-fechaCaducidad">`, junto a la etiqueta, con `textoRelativo(diasRestantes(fecha, hoy()))` en el color de su urgencia. Vacío si la fecha no es válida.
- **Accesibilidad:** el input lleva `aria-describedby` hacia esa ayuda y, si lo hay, hacia el error, separados por un espacio. `mostrarErrores` y `limpiarError` se ajustan para no pisar la ayuda.

### 5. "Dónde lo guardas"
- `<fieldset class="campo segmentado" data-campo="categoria">` con `<legend>` "Dónde lo guardas" y un `<label>` con un `<input type="radio" name="categoria" value=…>` por cada valor de `CATEGORIAS`. Se ve como un control segmentado de 4 partes iguales, con el foco visible en el `label`.
- **En `controles`**, `categoria` pasa a ser `form.elements.categoria` (`RadioNodeList`), que tiene `.value` de lectura y escritura. `leerValores`, `aplicarValores` y `estadoInicial` siguen funcionando sin cambios. `aplicarValores` deja de añadir `<option>` para la categoría, porque el modelo solo admite esos cuatro valores.
- El nombre del campo en los errores sigue siendo `categoria`. Su error se enfoca en el primer radio.

### 6. Notas plegadas
- En lugar del campo Notas hay un `<button type="button" class="campo-plegado" aria-expanded="false" aria-controls="campo-notas-zona">` con "Añadir notas" y "(opcional)".
- Al pulsarlo se muestra el campo Notas de siempre (`<textarea>`, con su etiqueta), el botón desaparece y el foco pasa al `<textarea>`.
- Se muestra ya desplegado si las notas no están vacías: en la edición de un producto con notas o en un borrador con notas.
- Que estén plegadas o no **no** cuenta como cambio.

### 7. Volver sin guardar y "Guardar" solo
- **Cambio en `ui.js`:** el resultado de `render` admite `antesDeVolver`, una función `async () => boolean`.
  - La flecha de la cabecera la llama, si la hay, y solo llama a `volver()` si devuelve `true`.
  - Si no la hay, todo sigue igual.
- **En el formulario:**
  - `activarCancelar` pasa a ser `prepararVolver`, que devuelve `antesDeVolver`.
  - Si no hay cambios, descarta el borrador y devuelve `true`.
  - Si hay cambios, abre `confirmar` ("¿Descartar los cambios?", "Descartar" / "Seguir editando"). Si se confirma, descarta el borrador y devuelve `true`; si no, devuelve `false` y el foco vuelve a la flecha.
- La pantalla devuelve `{ elemento, cargado, accionCabecera, antesDeVolver }`.
- **El botón Atrás del sistema** (`popstate`) no se intercepta, como hasta ahora con "Cancelar". En ese caso, el borrador se queda en memoria hasta que se vuelve a abrir ese formulario. Es el mismo comportamiento de hoy al ir a Elegir foto.
- **Botones:** se borra el botón "Cancelar" y `.formulario__acciones` contiene solo el aviso y "Guardar", a todo el ancho.

### 8. Alto a 390×740
- **Lo que se gana:**
  - la zona de foto deja de ser una fila propia (unos 64 px);
  - las notas plegadas ocupan una fila de 48 px en vez de 2 líneas de `<textarea>` con su etiqueta.
- **Lo que se añade:** la fila de plazos (36 px más su separación) y la ayuda de la fecha, que va en la línea de la etiqueta y no añade alto.
- **Comprobación:** la prueba existente ("Alta sin scroll", con `ALTO_DISPONIBLE = 740 − 56 − 16`) sigue siendo la referencia.
- **"Edición sin scroll"**, con notas de dos líneas y por tanto desplegadas, tiene que caber también. Si no cabe, se reduce el `gap` del formulario, sin bajar de 44 px ningún control.

### 9. Elegir foto
- **Orden:**
  - fila `.fotos__fuentes` con "Hacer foto" (con `ICONOS.camara`) y "Galería" (con `ICONOS.imagen`, `aria-label` "Elegir de la galería"), de ancho mitad y mitad;
  - el buscador;
  - la cuadrícula;
  - "No hay fotos que coincidan" y el estado "Preparando foto…".
- **"Sin foto"** pasa a ser el primer `<li>` de la cuadrícula: un `<button class="foto foto--ninguna">` con un icono de "sin imagen" y el texto "Sin foto". No se filtra con el buscador, así que siempre está.
- Si la foto actual es "ninguna" y el formulario ya tenía una foto elegida a mano, "Sin foto" aparece marcada. En el alta recién abierta no se marca ninguna.
- **Cuadrícula:** `grid-template-columns: repeat(4, minmax(0, 1fr))`, imágenes de 56 px y casillas de al menos 88 px de alto.
- **"Preparando foto…":** sigue bloqueando todas las casillas y los dos botones, "Sin foto" incluido.

### 10. Estrategia de pruebas
- **Node (`npm test`):**
  - **`tests/fotos.test.js`, `sugerirFoto`:**
    - "Pechuga de pollo" → `pollo`;
    - "Tomates" → `tomate`;
    - "YOGUR griego" → `yogur`;
    - "Salmon ahumado" sin acento → `salmon`;
    - "Panceta" → `null`;
    - "Lechuga" → `lechuga` (no `leche`);
    - "Genérico" → `null`;
    - nombre vacío → `null`.
  - **`tests/productos.test.js`, `sumarPlazo`:**
    - +3 y +7 días;
    - cambio de hora el 2026-03-28 +3;
    - +1 mes el 31 ene 2027 → 28 feb y el 31 ene 2028 → 29 feb;
    - +1 mes el 15 dic → 15 ene del año siguiente.
  - **`tests/constantes.test.js`:** `PLAZOS`.
- **Navegador (`npm run test:navegador`):**
  - **`formulario.test.js`:**
    - las pruebas de "Cancelar" pasan a usar `antesDeVolver`;
    - "Formulario de alta vacío" con el orden y los controles nuevos;
    - sugerencia: aplicar, quitar, no pisar una elección manual, la edición con foto y el borrador;
    - plazos: rellenan, marcan `aria-pressed` y limpian el error;
    - ayuda "En N días";
    - ubicación: lee y escribe, error y foco;
    - notas plegadas y desplegadas, en la edición y en el borrador;
    - "Alta sin scroll", "Edición sin scroll" y "Botones en una fila";
    - sin texto suelto.
  - **`elegir-foto.test.js`:**
    - "Cuadrícula completa" con "Sin foto" la primera y "Genérico" la última;
    - 4 columnas con `styles.css`;
    - botones arriba, antes del buscador;
    - "Sin foto" visible con una búsqueda sin resultados;
    - "Sin foto" marcada solo si se eligió;
    - las pruebas de cámara, galería y compresión siguen igual.
  - **Pruebas de la flecha:** como `ui.js` importa `auth.js`, el cambio de `mostrar` se prueba de forma indirecta. `formulario.test.js` comprueba `antesDeVolver`, y la comprobación visual recorre la flecha con cambios.
- **Comprobación visual:** `captura-app.mjs --alto 740` en `producto/nuevo` (vacío; con "Pechuga de pollo" escrito y "+1 semana" pulsado), en la edición de un producto con notas y en `producto/nuevo/foto`, sin errores de CSP.
- **Manual, en el móvil:**
  - selector de fecha nativo tras usar un plazo;
  - teclado sobre el nombre con la miniatura;
  - flecha con cambios;
  - cámara y galería desde la fila de arriba.

## Riesgos / Contrapartidas

- **[Riesgo]** La sugerencia elige una foto que el usuario no quería ("Leche de avena" → Leche). → Se ve en la miniatura al momento y se cambia con un toque. Después ya no se vuelve a sugerir encima.
- **[Riesgo]** Sin "Cancelar", algún usuario no sabe cómo salir sin guardar. → La flecha es el patrón del sistema y conserva la confirmación.
- **[Riesgo]** "Edición sin scroll" con notas largas desplegadas puede no caber. → El `<textarea>` mantiene 2 filas visibles y se desplaza por dentro. La prueba lo vigila.
- **[Contrapartida]** "+1 mes" no son siempre 30 días. → Es lo que la gente espera de "un mes", y la fecha resultante se ve antes de guardar.

## Plan de despliegue

Se despliega después de `rediseno-listado`, en uno o en dos despliegues. No hay migración de datos ni archivos nuevos en `src/`. Tras desplegar, el usuario abre y cierra la app una vez.
