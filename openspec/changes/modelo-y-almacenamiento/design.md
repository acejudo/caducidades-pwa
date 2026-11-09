# Design

## Context

Punto de partida (motivación en proposal.md, apartado "Why"):

- `src/js/storage.js` y `src/js/drive.js` solo tienen un comentario. No hay ningún dato guardado todavía. `auth.js` usa `localStorage` y `sessionStorage` únicamente para la sesión y el token.
- `src/js/config.js` ya exporta `URGENCIA = { rojoMaxDias: 2, naranjaMaxDias: 7 }` y `CATEGORIAS = ['Nevera', 'Congelador', 'Despensa', 'Otros']`. Reexporta además `config.local.js`, así que cualquier módulo que lo importe necesita ese archivo, igual que el resto de la app.
- `src/css/styles.css` ya define las clases `urgencia--rojo`, `urgencia--naranja` y `urgencia--verde`.
- `src/sw.js` precarga una lista explícita de archivos (`SHELL_FILES`). Si un archivo nuevo no está en la lista, no se puede usar sin conexión.
- No hay paso de *build* ni dependencias: módulos ES servidos tal cual, por lo que todo debe funcionar en Chrome Android y Safari iOS sin transpilar.
- No hay pruebas en el repositorio: los cambios anteriores se verificaron con scripts temporales en el scratchpad. Este cambio introduce TDD con pruebas versionadas.
- Los requisitos están en `specs/product-model/spec.md` y `specs/product-storage/spec.md`.

## Goals / Non-Goals

**Goals:**
- Separar las **reglas de dominio puras** (sin DOM ni almacenamiento, fáciles de probar) de la **persistencia** (asíncrona y con errores de E/S).
- Una API de almacenamiento pequeña y estable que puedan usar las pantallas de productos y, más adelante, la sincronización, sin conocer IndexedDB.
- Dejar el formato de cada producto listo para el archivo `caducidades.json` de Drive (`docs/SPEC.md` §4.2) sin transformaciones.
- Que cada escenario de las specs tenga una prueba automática en el repo, escrita antes del código, que se pueda volver a lanzar con un comando.

**Non-Goals:**
- Índices de IndexedDB, paginación o búsquedas: con decenas o pocos cientos de productos, leer todo y ordenar en memoria es instantáneo.
- Notificar cambios entre pestañas o a la UI (eventos, observables). Lo decidirá el cambio de pantallas si lo necesita.
- Exponer ya la lectura de los registros eliminados para sincronizar; la añadirá el cambio de Drive.

## Decisions

### 1. Dos módulos: `productos.js` (dominio) y `storage.js` (persistencia), y constantes sin datos sensibles
- `src/js/productos.js` (nuevo) solo contiene funciones puras y las clases de error de dominio.
- `src/js/storage.js` usa `productos.js` para preparar y validar, y se encarga de leer y escribir en IndexedDB.
- `URGENCIA` y `CATEGORIAS` se mueven a `src/js/constantes.js` (nuevo), que no importa nada. `config.js` las reexporta (`export { URGENCIA, CATEGORIAS } from './constantes.js'`), así que el resto de la app no cambia. `productos.js` y `storage.js` importan de `constantes.js` y **nunca** de `config.js`. Así no dependen de `config.local.js` (Client ID) y se pueden probar en Node y en una página de pruebas sin credenciales.
- *Alternativa descartada:* todo en `storage.js`. Mezclaría validación y E/S, y las pantallas necesitan `diasRestantes`/`nivelUrgencia` sin tocar el almacenamiento.
- *Alternativa descartada:* importar de `config.js` y generar un `config.local.js` falso para las pruebas. Ata las pruebas a un archivo con datos sensibles y podría sobrescribir el real.

### 2. API pública

`productos.js`:
- `normalizarProducto(datos)`: quita espacios, convierte textos opcionales vacíos en `null`, convierte `cantidad` a número (acepta `"2"` y `"0,5"`), aplica los valores por defecto y descarta los campos desconocidos.
- `validarProducto(producto)`: devuelve un objeto `{ campo: mensaje }`, vacío si es válido.
- `nuevoProducto(datos, ahora)`: normaliza y valida (lanza `ErrorValidacion`), y añade `id`, `eliminado: false` y `actualizado`.
- `aplicarCambios(producto, cambios, ahora)`: combina, ignora `id`, `actualizado` y `eliminado` de `cambios`, normaliza, valida y pone el nuevo `actualizado`.
- `diasRestantes(fechaCaducidad, hoy = new Date())`, `nivelUrgencia(dias)` (devuelve `'rojo' | 'naranja' | 'verde'`), `textoCaducidad(dias)`.
- `compararPorCaducidad(a, b)` y `ordenarPorCaducidad(lista)`, que devuelve una copia ordenada.
- `class ErrorValidacion extends Error { campos }`.

`storage.js` (todas asíncronas):
- `crearProducto(datos)` devuelve el producto guardado.
- `listarProductos()` devuelve los no eliminados, ya ordenados.
- `obtenerProducto(id)` devuelve el producto o `null`.
- `actualizarProducto(id, cambios)` devuelve el producto guardado o lanza `ErrorNoEncontrado` / `ErrorValidacion`.
- `eliminarProducto(id)` no devuelve nada y es idempotente.
- `class ErrorAlmacenamiento extends Error { causa }` y `class ErrorNoEncontrado extends Error { id }`.
- `usarBaseDeDatos(nombre)` (síncrona): cierra la conexión actual y hace que las siguientes operaciones usen otra base de datos. Solo la usan las pruebas, con `caducidades-pruebas`, para no tocar los datos reales del navegador (la app y las pruebas comparten origen en `localhost:8080`). La app nunca la llama.

Las pantallas distinguen los errores con `instanceof`. `ErrorValidacion.campos` permite pintar el mensaje junto a cada campo.

### 3. IndexedDB sin librería
- Base de datos `caducidades`, versión 1, almacén `productos` con `keyPath: 'id'` y sin índices.
- `onupgradeneeded` con un `switch` por versión antigua (`case 0:` crea el almacén). Así los cambios futuros, como fotos o metadatos de sincronización, se añaden como `case 1:` sin perder datos.
- La conexión se abre una sola vez y se guarda su promesa. Si la apertura falla, la promesa se descarta para poder reintentar. `onversionchange` cierra la conexión y la descarta; así otra pestaña con una versión nueva puede actualizar.
- Un pequeño envoltorio convierte `IDBRequest` en promesa. Las escrituras se dan por terminadas en `transaction.oncomplete` y no en `request.onsuccess`, que es cuando están confirmadas en disco.
- `actualizarProducto` y `eliminarProducto` leen y escriben dentro de **la misma transacción `readwrite`**, de forma atómica frente a otra pestaña.
- Cualquier fallo de IndexedDB (no disponible, `QuotaExceededError`, `InvalidStateError`, transacción abortada) se convierte en `ErrorAlmacenamiento`. Los errores de dominio (`ErrorValidacion`, `ErrorNoEncontrado`) pasan tal cual.
- En la primera apertura se llama a `navigator.storage?.persist()` como mejora posible (sin esperar ni fallar) para reducir el riesgo de que el navegador borre los datos.
- *Alternativa descartada:* `localStorage`. Es más sencillo, pero es síncrono, está limitado a unos 5 MB y obliga a reescribir todo el JSON en cada cambio. Además, el cambio de fotos querrá guardar imágenes como `Blob` en el dispositivo, y eso solo es razonable en IndexedDB.

### 4. Bajas con marca de borrado
`eliminarProducto(id)` guarda `{ ...producto, eliminado: true, actualizado: ahora }`. Las lecturas filtran `eliminado`. Con *last-write-wins* (`docs/SPEC.md` §7), un borrado físico haría que la copia del otro dispositivo volviera a subir el producto. Con la marca, la baja es solo una escritura más con su `actualizado`.
- Eliminar un `id` inexistente o ya eliminado no hace nada (no cambia `actualizado`), para que repetir la acción sea inocuo.
- La purga de marcas antiguas queda para el cambio de Drive, que sabrá cuándo una baja ya está sincronizada.

### 5. Los datos no dependen de la cuenta ni se borran al cerrar sesión
Los productos son una única lista compartida por todas las personas autorizadas, que también compartirán el mismo `caducidades.json` en Drive. Por eso la base de datos no se separa por usuario y "Cerrar sesión" no borra los productos del dispositivo: al volver a entrar (con cualquiera de las cuentas autorizadas) siguen ahí, también sin conexión. Esto no da acceso a nadie más, porque sin una sesión autorizada no se puede pasar de Login.
- *Alternativa descartada:* borrar los datos locales al cerrar sesión. No aporta privacidad entre las personas autorizadas, que ven los mismos productos, y obligaría a descargarlo todo de nuevo (imposible sin conexión).

### 6. Identificador
`crypto.randomUUID()`, disponible en contexto seguro (HTTPS y `localhost`) en Chrome 92+ y Safari 15.4+. No hace falta alternativa: el login ya exige contexto seguro (`crypto.subtle`).

### 7. Fechas sin problemas de zona horaria
- Las fechas `YYYY-MM-DD` se validan con una expresión regular y se comprueban creando `Date.UTC(a, m - 1, d)` y comparando de vuelta año, mes y día (rechaza `2026-02-30`).
- `diasRestantes` toma año, mes y día **locales** de `hoy`, construye ambos días con `Date.UTC` y divide la diferencia entre 86 400 000. Al trabajar en UTC no hay días de 23 o 25 horas, y el resultado no depende de la hora actual.
- *Alternativa descartada:* `new Date('2026-11-12')`. JavaScript lo interpreta como medianoche UTC, que en España es la 1:00 o las 2:00, y mezclarlo con fechas locales da errores de un día.

### 8. `actualizado` siempre creciente
`actualizado` = `new Date().toISOString()`. Si al actualizar o eliminar el valor nuevo no es estrictamente posterior al guardado (dos escrituras en el mismo milisegundo o el reloj atrasado), se usa el guardado más 1 ms. Así *last-write-wins* nunca considera más antigua una edición posterior hecha en el mismo dispositivo.

### 9. Orden
`Intl.Collator('es', { sensitivity: 'base' })` para el nombre (ignora mayúsculas y acentos) y comparación de texto para las fechas `YYYY-MM-DD`, que ordenan bien como texto. El desempate final es por `id`.

### 10. Service Worker y documentación
- Añadir `./js/productos.js` y `./js/constantes.js` a `SHELL_FILES` (`storage.js` ya está).
- `docs/SPEC.md` §4.1: añadir `eliminado` y los valores por defecto. README: descripción de `productos.js`, `constantes.js` y `storage.js`, y sección "Pruebas".

### 11. Estrategia de pruebas (TDD)
**Ciclo:** por cada bloque de escenarios de las specs, primero se escriben sus pruebas y se comprueba que **fallan** (rojo), después se implementa lo mínimo para que pasen (verde) y por último se refactoriza con las pruebas en verde. El nombre de cada prueba es el del escenario de la spec, para poder rastrearlo.

**Dominio (`productos.js`) → `node --test`:**
- `tests/productos.test.js` usa `node:test` y `node:assert/strict`, que vienen con Node. Importa `../src/js/productos.js` directamente: es posible porque el módulo es puro y no depende de `config.local.js` (Decisión 1).
- La primera línea fija `process.env.TZ = 'Europe/Madrid'` antes de crear cualquier fecha, para que el escenario "Cambio de hora" pruebe de verdad el cambio de horario de verano, en cualquier máquina.
- El "hoy" se pasa como argumento (`diasRestantes(fecha, hoy)`, `nuevoProducto(datos, ahora)`), así que no hace falta simular el reloj.

**Persistencia (`storage.js`) → página de pruebas en el navegador:**
- IndexedDB solo existe en el navegador. Se descarta `fake-indexeddb` en Node porque sería la primera dependencia del proyecto y no probaría el IndexedDB real de Chrome o Safari.
- `tests/navegador/index.html` carga `runner.js` (mini-runner propio de unas 50 líneas: `prueba(nombre, fn)`, `antesDeCada(fn)`, aserciones básicas y resumen pintado en la página) y `storage.test.js`.
- `antesDeCada` llama a `usarBaseDeDatos('caducidades-pruebas')` y borra esa base de datos, para que cada prueba empiece limpia sin tocar la base de datos real.
- "Navegador sin almacenamiento" se prueba sustituyendo temporalmente `indexedDB.open` por una función que falla. "Reapertura" se prueba cerrando la conexión (`usarBaseDeDatos` con el mismo nombre) y volviendo a leer.
- El runner deja el resultado en el DOM (`<output id="resultado" data-estado="ok|fallo">N pruebas, M fallos</output>`), legible por una persona y por un script.
- **A mano:** `python -m http.server 8080` desde la raíz del repo y abrir `http://localhost:8080/tests/navegador/`.
- **Automático:** `npm run test:navegador` ejecuta `scripts/probar-navegador.mjs` (Node, sin dependencias). Sirve la raíz del repo con `node:http` en un puerto libre, lanza Chrome o Edge *headless* con `--dump-dom` y `--virtual-time-budget`, lee `#resultado` y sale con código 0 o 1. La ruta del navegador se toma de la variable `CHROME` o de las rutas habituales de Windows, macOS y Linux.

**`package.json`** (raíz, `"private": true`, `"type": "module"`, **sin dependencias**): scripts `test` (`node --test tests/`) y `test:navegador`. Solo sirve como atajo de comandos. No forma parte de lo publicado, porque Pages solo publica `src/`.

**Lo que no se automatiza:** que el Service Worker cachee los archivos nuevos y el uso real en el móvil instalado se comprueban a mano (tareas finales).

## Risks / Trade-offs

- [Safari borra el almacenamiento de las webs que no se usan en 7 días] → No afecta a la app instalada en la pantalla de inicio, que es el uso previsto. Además se pide almacenamiento persistente y, cuando llegue Drive, la nube es la copia de seguridad. Se documenta en el README que hay que usarla instalada.
- [Las marcas de borrado se acumulan] → Cada una ocupa menos de 1 KB. La purga se diseñará con Drive.
- [La validación está solo en el cliente] → No hay servidor. El cambio de Drive deberá validar con `validarProducto` los productos que descargue antes de guardarlos.
- [Reloj del dispositivo incorrecto] → Afecta a *last-write-wins* entre dispositivos. Es aceptable para un grupo reducido de personas (SPEC §7). Dentro del mismo dispositivo lo mitiga la Decisión 8.
- [Las pruebas de navegador automáticas dependen de tener Chrome o Edge instalado] → La misma página se puede abrir a mano en cualquier navegador. El script indica cómo fijar la ruta con `CHROME` si no lo encuentra.
- [`--dump-dom` termina antes de que acaben las pruebas asíncronas] → `--virtual-time-budget` da tiempo suficiente. Si el resultado no aparece, el script lo trata como fallo, nunca como éxito.
- [Una prueba del navegador olvida volver a la base de datos de pruebas y toca la real] → `antesDeCada` fija siempre `caducidades-pruebas`, y la página de pruebas nunca carga `app.js`.

## Migration Plan

No hay datos previos: la base de datos se crea en la primera llamada. No hace falta ninguna migración.
- **Vuelta atrás:** revertir el commit. La base de datos `caducidades` queda sin usar en el navegador y es inofensiva. Se puede borrar desde DevTools.

