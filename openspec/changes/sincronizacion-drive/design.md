# Design

## Context

- **Autenticación (`auth.js`):** guarda la sesión en `localStorage` y el token en `sessionStorage` y en memoria (`tokenVigente()`, con un margen de 60 s). `renovarToken()` pide un token con `prompt: ''` y `login_hint`, y devuelve `null` si falla o falta el *scope*. Tanto la ventana de login como la de renovación necesitan un gesto del usuario y que Google esté ya cargado (`cargarGoogle()`), o el navegador bloquea la ventana. El *scope* actual es `DRIVE_SCOPE = .../auth/drive.file`, en `config.js`, que importa `config.local.js`.
- **Constantes de Drive:** `DRIVE_CARPETA`, `DRIVE_ARCHIVO` y `DRIVE_CARPETA_FOTOS` están en `config.js`. `drive.js` es solo un comentario.
- **Almacenamiento (`storage.js`):** IndexedDB v1 con un único almacén `productos`. `listarProductos()` filtra los eliminados. Toda escritura pasa por `nuevoProducto`, `aplicarCambios` o `marcarEliminado`, que renuevan `actualizado` (*last-write-wins* local).
- **Interfaz (`ui.js`):** pinta la cabecera (flecha de volver y título) y Ajustes (cuenta y Cerrar sesión, con un marcador). Las pantallas siguen el patrón `crear…({ dependencias }) → { elemento, cargado }` y se quitan los oyentes cuando su elemento sale del documento.
- **Google Cloud:** la app está en estado **Prueba**, con los emails autorizados como usuarios de prueba (README §Google). Ahí, un *scope* restringido como `drive` funciona sin verificar la app, con el aviso de "app no verificada".

## Goals / Non-Goals

**Goals:**
- Que la fusión sea una función pura, determinista y probada en Node, independiente de Drive y de IndexedDB.
- Que `drive.js` sea un cliente fino sobre `fetch`, con el `fetch` y el token inyectables, para probarlo sin Google.
- Un único orquestador (`sincronizador.js`) que decida cuándo sincronizar, que nunca haga dos sincronizaciones a la vez y que publique un estado al que se suscribe la interfaz.
- Que no se pierdan datos: nada se sobrescribe si el archivo de Drive no es válido, y la marca de cambios pendientes solo se quita tras subir bien.

**Non-Goals:**
- Fotos reales y la subcarpeta `fotos/`, que van a `fotos-reales`.
- Una cola de operaciones o un historial: basta con fusionar el estado completo.
- Sincronizar en segundo plano con la app cerrada (Background Sync o *push*).
- Compartir la carpeta desde la app. Se comparte a mano en Drive, porque la app solo conoce los *hashes* de los emails autorizados.
- Resolver conflictos campo a campo: gana el producto completo más reciente.

## Decisions

### 1. Constantes de Drive en `constantes.js`
`DRIVE_CARPETA`, `DRIVE_ARCHIVO`, `DRIVE_CARPETA_FOTOS` y el nuevo `DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive'` pasan a `constantes.js`, y `config.js` los reexporta. Así `drive.js`, `sincronizacion.js` y `sincronizador.js` no arrastran `config.local.js` y se pueden probar.

### 2. Lógica pura: `src/js/sincronizacion.js`
- **`leerArchivo(texto)`:**
  - Hace `JSON.parse`, exige un objeto con `version === 1` y `productos` como array y, si no, lanza `ErrorArchivoNoValido`.
  - Cada producto debe tener `id` (texto), `actualizado` (ISO válido), `eliminado` (booleano) y campos válidos según `validarProducto(normalizarProducto(p))`. Los que no cumplen se descartan y se cuentan en `descartados`.
  - Devuelve `{ productos, descartados }`, con cada producto normalizado más `id`, `eliminado` y `actualizado`.
- **`fusionar(locales, remotos)`:**
  - Une por `id` y gana el `actualizado` mayor (comparando `Date.parse`).
  - Si empatan, gana la versión eliminada y, si ninguna lo está, la remota. Así dos dispositivos con el mismo par llegan siempre al mismo resultado.
- **`purgar(lista, ahora, dias = 90)`:** quita los eliminados cuyo `actualizado` tenga más de `dias` días.
- **`crearArchivo(lista, ahora)`:** devuelve el texto `{ version: 1, ultimaActualizacion, productos }`, con los productos ordenados por `id` para que el contenido sea estable.
- **`planificar(locales, remotos, ahora)`:** devuelve `{ resultado, cambiaLocal, hayQueSubir }`, comparando el resultado con cada lado por `id` y `actualizado`. Es lo que usa el orquestador.

Alternativa descartada: fusionar campo a campo. Necesitaría marcas de tiempo por campo y, para dos personas, no compensa.

### 3. Cliente de Drive: `src/js/drive.js`
`crearClienteDrive({ token, fetch = globalThis.fetch })`, donde `token()` devuelve el *access token*. Usa Drive v3 con `fetch`, sin bibliotecas de Google:

| Función | Petición |
|---|---|
| `buscarListas()` | `GET /drive/v3/files?q=name='caducidades.json' and trashed=false and mimeType!='application/vnd.google-apps.folder'&orderBy=createdTime&fields=files(id,createdTime,version)`. El *corpus* por defecto (`user`) incluye "Compartido conmigo". |
| `leer(id)` | `GET /drive/v3/files/{id}?alt=media`, más la versión con `GET /drive/v3/files/{id}?fields=version`. |
| `version(id)` | `GET /drive/v3/files/{id}?fields=version` |
| `escribir(id, texto)` | `PATCH /upload/drive/v3/files/{id}?uploadType=media&fields=version` con `Content-Type: application/json`. |
| `crearLista(texto)` | Busca la carpeta `Caducidades` en la raíz (`'root' in parents`) o la crea, y después crea el archivo con `uploadType=multipart`. Devuelve `{ id, version }`. |

Errores tipados:
- `ErrorRed`: `fetch` rechazado.
- `ErrorToken`: respuesta 401.
- `ErrorNoDisponible`: 404, o 403 en un archivo concreto. El orquestador olvida el id y vuelve a buscar una vez.
- `ErrorDrive`: el resto, con su estado HTTP.

Alternativa descartada: usar `gapi.client`. Es otra biblioteca externa que cargar y cachear, y con `fetch` basta para cinco llamadas.

### 4. Almacenamiento para la sincronización (`storage.js`)
- **`listarTodos()`:** todos los productos, también los eliminados, sin ordenar.
- **`guardarSincronizados(lista, idsPurgados = [])`:** en una sola transacción, lee lo que hay guardado, lo fusiona con `lista` (`fusionar` de §2) y guarda el resultado con `put()`, sin renovar `actualizado`. Después borra con `delete()` los `idsPurgados` que sigan eliminados. Fusionar dentro de la transacción evita pisar un cambio que el usuario guarde mientras la sincronización está en curso: ese cambio es más reciente y gana. Lo usa solo el orquestador.
- **`cambiosLocales`:** un `EventTarget` exportado que emite `'cambio'` tras cada `crearProducto`, `actualizarProducto` o `eliminarProducto` que se confirma. `guardarSincronizados` no lo emite. Si llega un `'cambio'` durante una sincronización, el orquestador deja `pendiente` y repite al terminar (§5).

### 5. Orquestador: `src/js/sincronizador.js`
`crearSincronizador({ almacen, crearDrive, auth, red, preferencias, confirmar, temporizador, ahora })` devuelve `{ estado, suscribir, sincronizar, iniciar, detener }`. La app usa una instancia por defecto con las dependencias reales. Las pruebas crean la suya con dobles.

- **Preferencias:** en `localStorage`, bajo la clave `caducidades.sincronizacion`, se guarda `{ archivoId, pendiente, ultima }`, envuelto en `try/catch` como en `auth.js`. Sobreviven a cerrar la app y a cerrar sesión, porque la lista es común.
- **Estado publicado:** `{ fase, pendiente, ultima, error }`.
  - `fase` es `'inactivo'`, `'sincronizando'` o `'error'`.
  - El texto visible se deriva con la función pura `textoEstado(...)`, con esta prioridad: sin conexión, sincronizando, error, sin token ("Toca para sincronizar"), pendiente ("Cambios pendientes") y sincronizado.
- **Una sola sincronización a la vez:** si se pide otra mientras una está en curso, se anota `otraVez = true` y se repite al terminar, en lugar de solaparlas.
- **Pasos de `sincronizar({ aPeticion })`:**
  1. Si no hay sesión o no hay red, termina sin error.
  2. Si no hay token: si es a petición, llama a `auth.renovarToken()`. Si devuelve `{ ok: false }`, termina con el estado que corresponda (cancelado, o `sin-drive` con su mensaje). Si es automática, termina y el estado queda en "Toca para sincronizar".
  3. Localiza la lista: el `archivoId` guardado o `buscarListas()[0]`. Si no hay ninguna, pregunta con `confirmar()` como máximo una vez por sesión de la app. Si es a petición pregunta siempre. Si se acepta, `crearLista` con `crearArchivo(purgar(locales))`.
  4. `leer(id)` y después `leerArchivo`, y `planificar(listarTodos(), remotos, ahora)`.
  5. Si `cambiaLocal`, llama a `guardarSincronizados(resultado)`.
  6. Si `hayQueSubir`: comprueba `version(id)`. Si ha cambiado desde el paso 4, vuelve al paso 4 (hasta 3 intentos). Si no, `escribir(id, crearArchivo(resultado))`.
  7. Fin correcto: `pendiente = false` (salvo que haya habido un cambio local durante la sincronización), `ultima = ahora` y `fase = 'inactivo'`.
- **Errores:**
  - `ErrorToken` se trata como token no vigente: se borra el token en memoria con `auth.olvidarToken()` y el estado pasa a "Toca para sincronizar".
  - `ErrorNoDisponible` borra el `archivoId` y reintenta una vez desde el paso 3.
  - El resto pone `fase = 'error'`, con un mensaje en español, y conserva `pendiente`.
- **`iniciar()`:** escucha `cambiosLocales` (pone `pendiente = true` y programa una sincronización automática a 2 s, reiniciando la espera con cada cambio) y los eventos `online` y `offline` de `window` (al volver la conexión, sincronización automática). También lanza una sincronización automática al arrancar. `app.js` lo llama tras el *guard*, solo con sesión. Tras el login, `ui.js` llama a `sincronizar()`.

### 6. Permiso de Drive (`auth.js`)
- `SCOPES` usa el nuevo `DRIVE_SCOPE`, porque `config.js` lo reexporta desde `constantes.js`.
- `guardarToken` guarda también los *scopes* concedidos (`respuesta.scope`), y `tokenVigente()` exige que incluyan `DRIVE_SCOPE`. Un token de antes del cambio, con `drive.file`, que siga en `sessionStorage` deja de valer.
- `renovarToken()` pasa a devolver `{ ok: true, token }` o `{ ok: false, motivo: 'cancelado' | 'sin-drive' | 'error' }`. Con `prompt: ''`, Google enseña el consentimiento solo si falta un *scope*, así que la primera renovación tras el cambio pide el permiso nuevo. No hay otros usos de `renovarToken`.
- Nuevo `olvidarToken()` para el caso del token rechazado (401).
- **Ventana bloqueada:** con el estado "Toca para sincronizar" y conexión, la interfaz llama a `cargarGoogle()` por adelantado, igual que Login. Así el toque abre la ventana sin esperar.

### 7. Interfaz
- **Módulo nuevo `src/js/estado-sincronizacion.js`**, sin importar `ui.js`, `auth.js` ni `config.js`:
  - `crearBotonSincronizacion({ sincronizador })` devuelve `{ elemento }`. Es un `<button class="cabecera__accion">` con el icono `refresh-cw` de Lucide, la clase `sync--girando` mientras sincroniza (animación CSS, desactivada con `prefers-reduced-motion`), `refresh-cw-off` sin conexión y un punto de aviso (`.sync__aviso`) si hay pendientes, error o hay que tocar. Lleva `aria-label="Sincronizar: <estado>"` y `disabled` sin conexión o mientras sincroniza. Se suscribe al estado y se da de baja la primera vez que recibe una notificación con su elemento fuera del documento, como el Listado.
  - `crearSeccionSincronizacion({ sincronizador, ahora })` devuelve `{ elemento }`. Es una tarjeta con el título "Sincronización", el texto del estado, "Última sincronización: …" (con `formatearMomento`), el mensaje de error si lo hay y el botón "Sincronizar ahora".
- **`ui.js`:**
  - La ruta del Listado se registra con `mostrarSincronizacion: true`, y `pintarCabecera` añade el botón a la derecha del título.
  - `pantallaAjustes` antepone la sección de sincronización a la de cuenta y quita el marcador.
  - Tras un login correcto llama a `sincronizador.sincronizar()`, porque el token está recién obtenido.
- **`formato.js`:** `formatearMomento(iso, ahora)` devuelve "hoy a las 18:30", "ayer a las 9:05" o "10 nov 2026 a las 18:30". Es pura y se prueba en Node.
- **Mensajes de error:**

| Causa | Mensaje |
|---|---|
| Red | "No se pudo conectar con Google Drive. Comprueba la conexión." |
| Drive | "Google Drive no respondió como se esperaba. Inténtalo más tarde." |
| Archivo no válido | "El archivo de la lista en Drive no es válido. No se ha cambiado nada." |
| Permiso (`sin-drive`) | "Hace falta permitir el acceso a Google Drive." |

### 8. Service Worker
Se añaden a `SHELL_FILES` `sincronizacion.js`, `sincronizador.js` y `estado-sincronizacion.js` (`drive.js` ya está). Las peticiones a `googleapis.com` ya van fuera de la caché (`pwa-shell`, "Peticiones externas fuera de la caché").

### 9. Documentación
- **README §Google:**
  - Añadir el *scope* `.../auth/drive` en Acceso a datos (sustituye a `drive.file`).
  - Nueva sección "Compartir la lista": la primera cuenta sincroniza y crea `Caducidades`, la comparte en Drive con la otra cuenta como Editor y, después, la otra cuenta toca para sincronizar.
- **SPEC §6.1:** el nuevo *scope*, con la razón.

### 10. Estrategia de pruebas (TDD)
- **Node (`npm test`):**
  - `tests/sincronizacion.test.js`: `leerArchivo` (formato, versión, productos no válidos descartados), `fusionar` (cada escenario de "Fusión por producto", empates), `purgar` (90 días), `crearArchivo` (formato SPEC §4.2) y `planificar` (`cambiaLocal`, `hayQueSubir`). Incluye `textoEstado` con su prioridad.
  - `tests/drive.test.js`: el cliente con un `fetch` falso. Comprueba URL, método, cabecera `Authorization`, `q` de la búsqueda, cuerpo *multipart* y errores 401, 403, 404, 500 y de red.
  - `tests/formato.test.js`: `formatearMomento`.
- **Página del navegador (`npm run test:navegador`):**
  - `storage.test.js` (ampliado): `listarTodos`, `guardarSincronizados` (conserva `actualizado` y fusiona con un cambio concurrente) y `cambiosLocales` ("Alta avisa", "Escritura fallida", "Guardado de la sincronización").
  - `sincronizador.test.js`: la base `caducidades-pruebas`, un Drive falso en memoria (con la misma interfaz que `crearClienteDrive`), un `auth` falso, `red`, `preferencias` y un temporizador manual. Cubre todos los escenarios de `drive-sync` que no dependen de Google real: crear la lista y negarse, varias listas, archivo recordado no disponible, simultáneas, automática y agrupación, pendientes, a petición, renovación cancelada, errores y token rechazado.
  - `estado-sincronizacion.test.js`: el botón y la sección con un sincronizador falso. Cubre los estados, el nombre accesible, que esté desactivado y que se actualice solo.
- **Manual (Google real y móvil):**
  - Añadir el *scope* en Google Cloud.
  - Re-consentir con una sesión anterior.
  - Primera sincronización con creación de la lista.
  - Compartir con la segunda cuenta y ver los mismos productos.
  - Editar en los dos dispositivos.
  - Modo avión y vuelta de la conexión.
  - Reabrir al día siguiente ("Toca para sincronizar").

## Risks / Trade-offs

- **[El *scope* `drive` da a la app acceso a todo el Drive de cada cuenta]** → Es una decisión del usuario para la lista compartida. El código solo consulta `caducidades.json` y la carpeta `Caducidades`. Con la app en estado Prueba no hace falta la verificación de Google, pero aparece el aviso de "app no verificada", que ya sale hoy.
- **[La comprobación de versión deja una pequeña ventana entre `version()` y `escribir()`]** → Drive v3 no admite `If-Match`. Para dos personas la probabilidad es mínima. Si ocurre, el siguiente cambio vuelve a fusionar, y solo se perdería una edición hecha en esa misma fracción de segundo.
- **[Un dispositivo sin sincronizar más de 90 días puede resucitar un producto borrado en otro]** → Su copia sin borrar se subiría después de la purga. Es aceptable para el uso previsto, y el plazo es una constante (`DIAS_PURGA`).
- **[Los relojes de los dispositivos pueden ir desajustados]** → *Last-write-wins* depende de ellos, y la SPEC lo asume. Unos minutos de diferencia solo importan si se edita lo mismo casi a la vez.
- **[Si la otra cuenta sincroniza antes de que le compartan la carpeta, se crea una segunda lista]** → Por eso se pregunta antes de crear. Si aun así se crea, al compartir después la primera cuenta gana la lista más antigua. La otra hay que borrarla a mano, y el README lo explica.
- **[El navegador puede bloquear la ventana de Google]** → Se precarga Google cuando el estado es "Toca para sincronizar" y se llama a `renovarToken()` directamente desde el `click`.

## Migration Plan

- Sin migración de IndexedDB: el esquema v1 no cambia.
- **Antes de desplegar**, el usuario añade el *scope* `drive` en Google Cloud. Si no lo hace, Google rechaza el permiso y el login muestra "Hace falta permitir el acceso a Google Drive".
- Tras desplegar, las sesiones existentes siguen y ven sus datos. El primer "Toca para sincronizar" pide el permiso nuevo.
- Vuelta atrás: revertir el commit. Un `caducidades.json` ya creado en Drive no molesta a la versión anterior. En Google Cloud se puede volver a `drive.file`.
