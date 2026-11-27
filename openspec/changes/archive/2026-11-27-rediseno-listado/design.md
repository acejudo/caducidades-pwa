# Diseño: rediseno-listado

## Contexto

La motivación está en `proposal.md`. Estado actual del código:

- **`listado.js`** pinta, por producto, un `<li>` con `.tarjeta-deslizable`: el botón "Eliminar" detrás y un `<a class="tarjeta tarjeta--producto urgencia--…">` con foto de 48 px, nombre, "Caduca el …", `.badge` con `textoCaducidad` y "Cantidad: …". Encima van las pestañas de `FILTROS`, el aviso de sincronización, el aviso de caducidad y el aviso de error. El botón flotante es `<a class="fab" aria-label="Añadir producto">` con el icono +.
- **`deslizar.js`** (`activarDeslizar(contenido)`) trabaja sobre `.tarjeta-deslizable` dentro del contenedor y no depende del aspecto de la tarjeta.
- **`ui.js`** pinta la barra inferior (`NAV`, `pintarNav`) en las rutas con `mostrarNav` (Listado y Ajustes, en `app.js`) y pone `app--con-nav`. Ajustes usa además `app--ajustes` para ajustar su margen inferior a la barra.
- **La cabecera** ya acepta una acción por pantalla (`accionCabecera`, que hoy usa la papelera de Editar producto), detrás del botón de sincronización del Listado.
- **`fotos.js`** tiene una función privada `simplificar` (minúsculas y sin acentos) para el buscador de Elegir foto.
- **Urgencia:** `URGENCIA = { rojoMaxDias: 2, naranjaMaxDias: 7 }`. El filtro `pronto` son 0–7 días, el mismo tramo que la sección "Esta semana".

## Objetivos / No objetivos

**Objetivos**
- Ver el doble de productos por pantalla (unos 9 a 390×844 frente a 4) sin perder la urgencia.
- Que la urgencia no dependa solo del color: el tiempo relativo siempre va escrito.
- Reutilizar el deslizar, el aviso de caducidad, la acción de cabecera y la sincronización sin cambiarlos.

**No objetivos**
- El Detalle: sigue con `textoCaducidad` ("¡Caducado!", "Caduca en N días").
- Marcar productos como consumidos o tirados: requiere un estado nuevo en el modelo y en la sincronización. Irá en otro cambio.
- El formulario y Elegir foto: van en el cambio `rediseno-alta-y-foto`.

## Decisiones

### 1. Lógica pura en `productos.js` y `formato.js`
Todo lo que decide textos, secciones y filtros es puro y se prueba en Node:

- **`textoRelativo(dias)`:**
  - menos de −1 → "Hace N días";
  - −1 → "Ayer";
  - 0 → "Hoy";
  - 1 → "Mañana";
  - más de 1 → "En N días".
- **`seccionCaducidad(dias)`:** `'caducados'` si `dias < 0`, `'semana'` si `0 ≤ dias ≤ URGENCIA.naranjaMaxDias` y `'adelante'` en el resto. El límite sale de `URGENCIA`, como el filtro `pronto`.
- **`agruparPorSeccion(lista, hoy)`:** devuelve `[{ clave, titulo, productos }]` en el orden Caducados, Esta semana, Más adelante. Omite las secciones vacías y conserva el orden de entrada dentro de cada una.
- **`buscarPorNombre(lista, texto)`:** los productos cuyo nombre contiene el texto, con `simplificar`. Un texto vacío o de solo espacios devuelve la lista entera.
- **`contarPorFiltro(lista, hoy)`:** `{ todas, pronto, caducadas }`, con las mismas reglas que `filtrarPorEstado`.
- **`FILTROS`:** los textos pasan a "Todos", "Caducados" y "Esta semana", en ese orden. Las claves no cambian, así que `resumirUrgentes` y el aviso siguen apuntando a `caducadas` y `pronto`.
- **`formatearFechaCorta(fecha, hoy)`** en `formato.js`: "21 nov" si es del mismo año que `hoy` y "30 ene 2027" si no.
- **`simplificar`** se mueve de `fotos.js` a `formato.js` y se exporta. `fotos.js` la importa de allí.

*Alternativa descartada:* cambiar `textoCaducidad`. El Detalle la usa y ahí el texto largo se lee mejor.

### 2. Fila compacta
- La estructura del deslizar se mantiene: `<li>` → `.tarjeta-deslizable` → botón "Eliminar" detrás + `<a class="fila-producto">`.
- El enlace contiene:
  - la imagen, de 44 px, con `pintarFoto`;
  - un bloque con el nombre (una línea, con elipsis) y la línea de caducidad: `<span class="fila-producto__relativo urgencia-texto--{nivel}">` con `textoRelativo`, un separador " · " y la fecha corta;
  - la cantidad (`formatearCantidad`) a la derecha, solo si no es `cantidad === 1 && unidad === 'ud'`.
- **Color:** `urgencia-texto--{rojo|naranja|verde}` usa los tokens `--color-urgencia-*-texto`, que cumplen 4,5:1 sobre blanco.
- **Se quitan** el borde izquierdo, `.badge` y "Caduca el …" del Listado.
- **Lectores de pantalla:** el enlace se lee con su texto en el orden visual (nombre, tiempo relativo, fecha y cantidad). El separador es `aria-hidden`.
- **Alto:** al menos 64 px por fila, que cubre de sobra los 44 px táctiles.
- **Agrupación visual:** las filas de una sección van juntas en una tarjeta blanca con separadores finos, con el estilo de las demás tarjetas de `ui-theme`.

### 3. Secciones
- `pintar()` aplica `filtrarPorEstado` y `buscarPorNombre` y después `agruparPorSeccion`.
- Cada sección es una `<section aria-labelledby>` con un `<h2>`: el título en mayúsculas pequeñas y el contador al lado. Dentro va su `<ul class="lista-productos">`.
- **Color del título:** Caducados en rojo, Esta semana en naranja y Más adelante en gris, con los mismos tokens de texto.
- Con un filtro activo, solo hay una sección y su cabecera se mantiene, para que el usuario sepa qué está viendo.
- **El deslizar sigue igual:** `activarDeslizar` se aplica a `contenido`, que contiene todas las secciones, y "una sola abierta" funciona entre secciones.

### 4. Filtros con contador
- Los botones de filtro conservan `role="tab"` y su `id`.
- El texto es "Todos · 9": el nombre del filtro y el contador, que va en un `<span>` propio para darle otro peso visual.
- Los contadores salen de `contarPorFiltro(productos, hoy)`. Cuentan todos los productos y **no** dependen de la búsqueda.
- Se recalculan al cambiar de día, en el mismo `pintar()` que ya se llama con `visibilitychange`.
- **Estilo:** píldoras. La activa, oscura y con texto blanco; las otras, blancas con borde. Se elimina el color propio de "Pronto" y "Caducadas" en las pestañas.

### 5. Buscador
- Un `<input type="search">` con `aria-label` "Buscar producto" y un icono de lupa decorativo, encima de los filtros.
- Filtra en el evento `input`, sin releer el almacenamiento.
- Se oculta, como los filtros, cuando no hay ningún producto guardado.
- **El texto no se conserva** al salir del Listado. El filtro sí se conserva, como hasta ahora. Buscar es algo puntual, mientras que el filtro es una forma de ver la lista.
- **Sin resultados:** con búsqueda y sin coincidencias, el estado vacío dice "Ningún producto coincide con «texto»". El texto va con `textContent`, nunca como HTML.
- Sin búsqueda y con un filtro vacío, siguen los mensajes de cada filtro. El de `pronto` pasa a "No hay productos que caduquen esta semana".

### 6. Botón "Añadir"
- Sigue siendo `<a class="fab" href="#/producto/nuevo">`, ahora con el icono + y el texto visible "Añadir". El `aria-label` "Añadir producto" contiene el texto visible.
- Sin barra inferior, el botón baja a `bottom: calc(env(safe-area-inset-bottom) + var(--espacio-4))`.
- **Para que no tape la última fila**, `.listado` deja al final un `padding-bottom` igual al alto del botón más su margen inferior y `--espacio-4`.
- Un degradado del color de fondo bajo el botón suaviza el corte de la lista. Es decorativo, sin texto ni eventos (`pointer-events: none`).

### 7. Sin barra inferior y acceso a Ajustes
- **`app.js`:** se quita `mostrarNav` de todas las rutas y Ajustes pasa a tener `padre: '/listado'`. Con eso `ui.js` le pinta la flecha de volver, y el router ya resuelve el padre al entrar por URL.
- **`ui.js`:** se borran `NAV`, `pintarNav`, `$nav` y el `toggle` de `app--con-nav`. También se quita el `toggle` de `app--ajustes` si deja de hacer falta (decisión 8).
- **`index.html`:** se quita `<nav id="nav-inferior">`. Comprobar que `tests/csp.test.js` y `sw.test.js` no dependen de él.
- **Acceso a Ajustes:** el Listado devuelve `accionCabecera`, un `<a class="cabecera__accion" href="#/ajustes" aria-label="Ajustes">` con `ICONOS.ajustes`. `ui.js` ya lo coloca detrás del botón de sincronización y el Listado pasa a devolver `{ elemento, cargado, accionCabecera }`.
- **CSS:** se borran `.nav-inferior*`, `--alto-nav` y las reglas de `app--con-nav`. El `bottom` de `.fab`, que hoy suma `--alto-nav`, pasa a apoyarse solo en la zona segura (decisión 6). Antes de borrar `--alto-nav`, buscar con `grep` cualquier otro uso.

### 8. Ajustes sin barra inferior
- `.app--ajustes .contenido` deja de sumar la barra: el `padding-bottom` queda en `env(safe-area-inset-bottom) + var(--espacio-4)`.
- Si con eso el margen coincide con el de las demás pantallas sin barra, la clase `app--ajustes` se elimina.
- La prueba "Ajustes sin scroll" sigue a 390×740 y se monta sin `app--con-nav`.

### 9. Estrategia de pruebas
- **Node (`npm test`):**
  - **`tests/productos.test.js`:**
    - `textoRelativo` con −5, −1, 0, 1 y 9;
    - `seccionCaducidad` en los límites −1, 0, 7 y 8;
    - `agruparPorSeccion`: orden, secciones vacías omitidas y orden interno conservado;
    - `buscarPorNombre` sin mayúsculas ni acentos, con texto vacío y con espacios;
    - `contarPorFiltro`;
    - textos y orden de `FILTROS`.
  - **`tests/formato.test.js`:** `formatearFechaCorta` en el mismo año, en otro año y en un día de una cifra; y `simplificar`.
  - Las pruebas de `filtrarFotos` siguen en verde tras mover `simplificar`.
- **Navegador (`npm run test:navegador`), `listado.test.js`:**
  - Se adaptan las existentes: "Tarjeta completa" pasa a ser la fila, "Colores por nivel" pasa a ser la clase del tiempo relativo, y los textos de los filtros y de los estados vacíos cambian.
  - Pruebas nuevas:
    - secciones con su contador;
    - sección única con un filtro;
    - cantidad oculta con 1 ud y visible con 0,5 kg;
    - búsqueda combinada con un filtro y búsqueda sin resultados;
    - contadores que no dependen de la búsqueda;
    - `accionCabecera` hacia Ajustes;
    - botón "Añadir" con el texto visible;
    - el deslizar entre secciones;
    - sin texto suelto.
  - **"La última fila queda por encima de Añadir":** con `styles.css`, a 390 px de ancho, al desplazar hasta el final el borde inferior de la última fila queda por encima del borde superior del botón.
- **Navegador, `ajustes.test.js`:** "Ajustes sin scroll" y "Cerrar sesión" se montan sin la barra inferior.
- **Comprobación visual:** `captura-app.mjs --ruta listado` con unos 12 productos repartidos en las tres secciones, comparando con el lienzo acordado. Además, `--ruta ajustes`, sin errores de CSP.
- **Manual, en el móvil:** desplazamiento, deslizar para eliminar, icono de Ajustes, flecha de volver y botón Atrás del sistema.

## Riesgos / Contrapartidas

- **[Riesgo]** Quien ya usaba la barra inferior para ir a Ajustes tiene que aprender el icono de la cabecera. → Es el patrón habitual y Ajustes se usa poco.
- **[Riesgo]** "Esta semana" son en realidad los próximos 8 días (de hoy a dentro de 7), no la semana del calendario. → Es el mismo tramo que el filtro "Pronto" de antes, y en la práctica se entiende como "los próximos días". Si confunde, el texto se cambia en `FILTROS` y en `agruparPorSeccion`, sin tocar la lógica.
- **[Contrapartida]** El Listado y el Detalle describen la caducidad con textos distintos ("Hace 4 días" frente a "¡Caducado!"). → El Detalle tiene sitio para el texto largo. Se puede unificar más adelante.

## Plan de despliegue

Un solo despliegue, sin migración de datos. Tras desplegar, el usuario abre y cierra la app una vez para que el Service Worker cargue la versión nueva. No hay archivos nuevos en `src/`, así que `SHELL_FILES` no cambia.
