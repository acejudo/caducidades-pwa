# Diseño: limites-sincronizacion-y-marco

## Contexto

La motivación está en `proposal.md`. Estado actual del código que se toca:

**`sincronizacion.js`** (puro, se prueba en Node):
- `leerArchivo` rechaza más de `PRODUCTOS_MAX` productos.
- `crearArchivo` serializa con `JSON.stringify(…, null, 2)`.

**`sincronizador.js`:**
- `sincronizarArchivo` hace `planificar` → `guardarSincronizados` (si `cambiaLocal`) → comprobación de versión → `escribir(crearArchivo(plan.resultado))`, sin mirar el tamaño del resultado.
- `localizar` crea la lista con `crearArchivo(purgar(locales))`.
- Los errores se traducen con `mensajeDe` a `MENSAJES`.
- `pendiente` solo se pone a `false` cuando la sincronización termina bien.

**`drive.js`** (se prueba en Node con `fetch` inyectado):
- `leer` y `descargarFoto` comprueban `content-length` y, si no corta, llaman a `respuesta.arrayBuffer()` y comparan `byteLength` después de leer todo.
- `tests/drive.test.js` ya construye respuestas con `ReadableStream`.

**`app.js`:** registra el Service Worker y luego importa de forma dinámica `router`, `ui` y `auth`. Ya tiene `mostrarFaltaConfiguracion()`, que pinta un aviso con las clases `marcador`, `cabecera__titulo` y `marcador__nota` sin estilos en línea.

**`index.html`:** CSP en `<meta>` y sin scripts en línea, así que la comprobación del marco tiene que ir en `app.js`.

## Objetivos / No objetivos

**Objetivos**
- No guardar ni subir nunca una lista que la propia app rechazaría al leerla.
- Que los topes de descarga limiten la memoria usada, no solo el resultado.
- Que la app no arranque dentro de un marco, sin tocar la CSP ni añadir archivos al shell.

**No objetivos**
- Cambiar los límites o contar solo los productos activos. Las bajas siguen contando, como al leer.
- Recuperar automáticamente un archivo de Drive que ya supere los límites. Sigue el flujo actual de archivo no válido.
- Cabeceras HTTP (`frame-ancestors`, `X-Frame-Options`): GitHub Pages no permite configurarlas.

## Decisiones

### 1. Comprobación pura de la lista a escribir (`sincronizacion.js`)

**Qué se añade:**
- `prepararArchivo(productos, ahora)` devuelve el texto de `crearArchivo`, o lanza `ErrorListaLlena` si `productos.length > PRODUCTOS_MAX` o si `new TextEncoder().encode(texto).byteLength > ARCHIVO_MAX_BYTES`.
- `ErrorListaLlena` se exporta desde `sincronizacion.js`.

**Por qué ahí:** es lógica pura y se prueba en Node con los mismos límites de `constantes.js` que usa la lectura.

**Alternativa descartada:** comprobar dentro de `guardarSincronizados` en `storage.js`. Solo cubre lo local, no lo que se sube, y obliga a probarlo con IndexedDB.

### 2. Dónde se llama (`sincronizador.js`)

**En `sincronizarArchivo`:**
- Después de `planificar` y **antes** de `guardarSincronizados`, se llama a `prepararArchivo(plan.resultado, ahora())`. Así, si falla no se ha tocado ni el dispositivo ni Drive.
- El texto preparado es el que se sube después, si toca subir. No se serializa dos veces.

**En `localizar`, al crear la lista:** se usa `prepararArchivo(purgar(locales), …)`. Si falla, no se llama a `crearLista`.

**Mensaje:**
- `ErrorListaLlena` se traduce con `mensajeDe` al nuevo `MENSAJES.listaLlena`: «La lista ha llegado al máximo de productos que admite la app. No se ha cambiado nada.».
- No sugiere eliminar productos, porque una baja sigue contando hasta la purga de 90 días y el consejo no ayudaría.
- El estado queda en `error` y `pendiente` no cambia (camino de error actual).

### 3. Archivo compacto

`crearArchivo` usa `JSON.stringify(objeto)` sin espacios. Así el archivo ocupa menos y se aleja del tope. La lectura (`JSON.parse`) acepta los dos formatos, de modo que no hace falta migración.

### 4. Lectura por partes con tope (`drive.js`)

**Qué se añade:**
- Una función interna `leerHasta(respuesta, maximo, error)`:
  - se mantiene la comprobación previa de `content-length`;
  - lee `respuesta.body` con `getReader()` y acumula los trozos;
  - si el total pasa de `maximo`, cancela el lector y lanza `error()`;
  - al terminar, une los trozos en un `Uint8Array`;
  - sin cuerpo (`body === null`), devuelve vacío.
- La usan:
  - `leer`, con `ARCHIVO_MAX_BYTES` y `ErrorArchivoGrande`;
  - `descargarFoto`, con `FOTO_MAX_BYTES` y `ErrorFotoNoValida('demasiado grande')`.

**Por qué:** funciona igual en Node 24 y en los navegadores. Corta en el primer trozo que supera el tope, así que como mucho se lee el tope más un trozo.

**Alternativa descartada:** confiar en `content-length`. Puede faltar, o indicar el tamaño comprimido.

### 5. Sin arrancar dentro de un marco (`app.js`)

**Dónde:** al principio de `app.js`, antes de registrar el Service Worker y de las importaciones dinámicas.

**Qué hace:**
- Si `window.top !== window.self`, se pinta el aviso y no se hace nada más.
- Comparar `window.top` con `window.self` está permitido aunque el padre sea de otro origen.

**El aviso:**
- Se generaliza `mostrarFaltaConfiguracion` en una función `mostrarAviso(titulo, texto, enlace)`, que usan los dos casos.
- Para el marco: título «Caducidades», texto «Esta app solo funciona en su propia ventana.» y un enlace «Abrir Caducidades» con `href` igual a la dirección de la app, `target="_top"` y `rel="noopener"`.
- Todo con `createElement` y `textContent`, sin estilos en línea, así que cumple la CSP.

**Por qué en `app.js` y no en un módulo nuevo:**
- `app.js` es el único punto de arranque.
- No añade archivos a `SHELL_FILES`.
- Se prueba de punta a punta cargando la página real dentro de un `iframe` en la página de pruebas, que es del mismo origen y permite inspeccionar su documento.

**Alternativas descartadas:**
- Ocultar el contenido con CSS: los botones seguirían funcionando.
- Redirigir el marco a `top.location`: un iframe con `sandbox` lo impide, y es más intrusivo que un enlace.

## Riesgos / Contrapartidas

- **[Lista llena sin forma de liberar sitio]** Si se llega de verdad al tope, eliminar productos no libera sitio hasta la purga, porque las bajas cuentan.
  → El uso real está muy lejos de 2000. El mensaje no da un consejo falso. Si llegara a pasar, se revisaría en un cambio nuevo, por ejemplo contando solo los activos.
- **[El enlace del aviso no funciona en un iframe con `sandbox` sin permiso de navegación]**
  → La app sigue sin arrancar, que es lo importante. El usuario puede abrirla escribiendo la dirección.
- **[`body` sin `getReader`]** Algún navegador muy antiguo podría no exponerlo.
  → Los navegadores objetivo (Chrome Android e iOS 16.4+) lo tienen. Si faltara, se usa `arrayBuffer()` con la comprobación posterior actual.
- **[Archivos de Drive con sangría existentes]**
  → Se siguen leyendo. Se reescriben compactos en la siguiente subida.

## Plan de despliegue

- Sin migración.
- Los arreglos, la carpeta del cambio y las specs van en el mismo *push*.
- Tras desplegar: abrir y cerrar la app una vez en el móvil para que cargue la versión nueva, y comprobar que sincroniza.
