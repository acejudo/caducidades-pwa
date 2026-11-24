# Diseño: endurecimiento-seguridad

## Contexto

La motivación está en `proposal.md`. Los hallazgos vienen de `docs/security/`: perfil *quick* sobre el commit `84fa3a0`, fuera de git.

Estado actual del código que se toca:

- **`auth.js` (CRLF):**
  - La sesión vive en `localStorage` (`caducidades.sesion`), compartida por todas las ventanas. El token vive en `sessionStorage` (`caducidades.token`), uno por ventana, y en memoria.
  - `tokenVigente()` solo mira la caducidad y el *scope*.
  - `cerrarSesion()` solo actúa sobre la ventana actual y solo revoca un token sin caducar.
  - `renovarToken()` guarda el token que devuelva Google sin comprobar la cuenta (`login_hint` solo sugiere la cuenta).
  - Importa `config.js`, así que no se puede probar en Node.
- **`router.js` (CRLF):** `encontrar()` llama a `decodeURIComponent` sin capturar el error. Un `URIError` corta `procesar()` y la pantalla queda en blanco.
- **`productos.js` (CRLF):** `validarProducto` limita el `nombre` (100). `notas` y `unidad` no tienen límite.
- **`sincronizacion.js`:** `leerArchivo(texto)` valida cada producto con `validarProducto`, pero no limita el número de productos ni el `actualizado`.
- **`drive.js`:** `leer(id)` descarga el texto sin límite de tamaño. Las fotos ya se limitan a 5 MB con `content-length` y `byteLength`.
- **`index.html` (CRLF):** sin CSP.
  - No hay scripts en línea. El único `innerHTML` es el de `utils.js`, con SVG propios y sin atributos `style`.
  - `deslizar.js` usa `element.style`, que la CSP no bloquea.
  - Las fotos se pintan con URLs `blob:`.
- **`pages.yml`:** actions por etiqueta (`@v7`, `@v6`, `@v5`) y checkout con credenciales persistidas.
- **`probar-navegador.mjs`:** sirve toda la raíz del repo (también `.git`). `decodeURIComponent` sin capturar dentro de un manejador `async`: un `%` mal formado provoca un rechazo no capturado y Node termina.
- **`captura-app.mjs`:** abre Chrome con `--remote-debugging-port` (un puerto aleatorio 9300–9899 en loopback). Mientras dura la captura, cualquier proceso local puede controlar ese Chrome. Además, inyecta un `<script type="module">` **en línea** en `index.html`, que la nueva CSP bloquearía.

## Objetivos / No objetivos

**Objetivos**
- Cerrar el hallazgo confirmado con una prueba de regresión del escenario de dos ventanas.
- Que la CSP no rompa nada y que las capturas sigan funcionando con la CSP real activa.
- Acotar todo lo que llega de Drive antes de guardarlo.
- No dar pistas a un atacante en lo que se publica (§11).

**No objetivos**
- **Cambiar el *scope* de Drive o el dominio de publicación.** No forman parte de este cambio.
- **Puntos del informe que no se abordan aquí.** Están valorados en las notas locales de seguridad (`docs/security/revision-manual.md`, fuera de git), no en los artefactos versionados (§11).

## Decisiones

### 1. Token ligado al email de la sesión (`auth.js`)

- `guardarToken(accessToken, expiresIn, scopes, email)` guarda también `email` (en minúsculas). `iniciarSesion` pasa el email verificado y `renovarToken` el comprobado (§2).
- `tokenVigente()` añade una condición: `token.email === sesionActual()?.email`. Un token sin `email` (de la versión anterior) no vale, así que tras desplegar hará falta un toque para renovarlo. Es aceptable: ya pasa cada vez que se abre la app.
- **`vigilarOtrasVentanas({ alCambiarSesion })`**, exportada y llamada una vez desde `ui.js`, añade un listener de `storage` en `window`:
  - Solo actúa si `evento.key` es `caducidades.sesion` o `null` (con `null`, otra ventana ha llamado a `localStorage.clear()`).
  - Si la sesión guardada no existe o su email no es el del token de esta ventana, olvida el token de esta ventana (memoria y `sessionStorage`) y lo revoca si hay conexión. Después llama a `alCambiarSesion(sesionActual())`.
  - En `ui.js`, ese callback detiene la sincronización si ya no hay sesión y hace `reemplazar('/login')`. Si la sesión es de otra cuenta, sigue en la app sin token: la pantalla muestra "Toca para sincronizar", como al abrir.
  - Como el evento `storage` solo llega a las **otras** ventanas, la ventana que cierra sesión no se procesa dos veces.
- **`cerrarSesion()`** revoca cualquier `accessToken` guardado, haya caducado o no, si hay conexión. Revocar un token caducado no hace daño y cubre el caso en que el reloj del dispositivo va mal.
- **Inyección para las pruebas** (patrón `usarBaseDeDatos`): `usarEntornoAuth({ local, sesion, google, perfil, enLinea })`, que la app no usa.
  - `local` y `sesion` son objetos con la interfaz de `Storage`.
  - `google` sustituye la carga de GIS.
  - `perfil(token)` sustituye la consulta a `userinfo`.
  - Sin argumentos, vuelve a los valores reales.

  **Alternativa descartada:** sacar la lógica a un módulo puro probado en Node. La lógica es poca y está pegada al almacenamiento y a los eventos, y la prueba que importa (dos ventanas) necesita el `StorageEvent` del navegador.
- **Alternativa descartada: `BroadcastChannel`.** El evento `storage` ya existe para esto, no necesita que la otra ventana escriba nada y también se dispara si la sesión se borra a mano o desde DevTools.

### 2. Renovación con comprobación de la cuenta

- Tras obtener el token y comprobar el *scope*, `renovarToken()` llama a `pedirPerfil(token)`. Después compara `email` (normalizado) con `sesion.email`:
  - Si son distintos: revoca y devuelve `{ ok: false, motivo: 'otra-cuenta' }`.
  - Si `pedirPerfil` falla: revoca y devuelve `{ ok: false, motivo: 'error' }`.
  - En los dos casos, el token no se guarda.
- `sincronizador.js` añade `MENSAJES.otraCuenta = 'La cuenta de Google elegida no es la de la sesión. Vuelve a intentarlo con <email>.'`, con el email de `auth.sesionActual()`, y pasa a la fase `error`. Ese texto se pinta con `textContent`, como todos.
- No se vuelve a comprobar la lista blanca: la sesión ya la pasó al iniciar y `revalidarSesion` la repasa en cada apertura.

### 3. CSP en `index.html`

```
default-src 'self';
script-src 'self' https://accounts.google.com/gsi/client;
style-src 'self' https://accounts.google.com/gsi/style;
img-src 'self' blob:;
connect-src 'self' https://www.googleapis.com https://oauth2.googleapis.com https://accounts.google.com/gsi/;
frame-src https://accounts.google.com/gsi/;
object-src 'none';
base-uri 'self';
form-action 'self';
manifest-src 'self';
worker-src 'self'
```

- Sigue la política recomendada por Google para GIS (cliente, estilos, marcos y `connect-src` bajo `/gsi/`), ampliada con las APIs que usa la app:
  - `www.googleapis.com`: Drive, la subida de archivos y `userinfo`.
  - `oauth2.googleapis.com`: la revocación.
- El flujo de token de GIS abre una **ventana emergente** de `accounts.google.com`. Una ventana aparte no está sujeta a la CSP de la app. Su comunicación por `postMessage` tampoco.
- **Prueba en Node** (`tests/csp.test.js`): lee `src/index.html`, extrae el `<meta http-equiv="Content-Security-Policy">` y comprueba:
  - Cada directiva de la lista anterior.
  - Que no aparecen `'unsafe-inline'`, `'unsafe-eval'` ni `*`.
  - Que el `<meta>` va antes del primer `<script>`.
- **Prueba en el navegador real:** `captura-app.mjs` registra los eventos `securitypolicyviolation` en `errores` (§7). Un recorrido por Listado, Detalle, Formulario, Elegir foto y Ajustes debe terminar sin infracciones.
- **Estilo en línea de Google (decidido con el usuario el 2026-11-21):** el cliente de GIS inserta un `<style>` en línea de unos 8 KB con los estilos de su botón y del One Tap, que la app no usa (el token se pide con la ventana emergente). La política lo bloquea a propósito y se queda tal cual, sin `'unsafe-inline'` ni *hash*: un *hash* habría que actualizarlo cada vez que Google cambie esa hoja. `captura-app.mjs` separa esa infracción en `conocidos` para que no tape las nuevas.
- Si en la prueba manual con Google real aparece otra infracción (por ejemplo, la descarga de fotos redirigida a `*.googleusercontent.com`), se amplía la directiva concreta con el origen exacto y se anota aquí.

### 4. Límites de datos

Las constantes viven en `constantes.js`, para que las compartan los módulos puros:

| Constante | Valor | Dónde se aplica |
|---|---|---|
| `NOTAS_MAX` | 1000 | `validarProducto` (alta, edición y archivo de Drive) |
| `UNIDAD_MAX` | 20 | `validarProducto` |
| `PRODUCTOS_MAX` | 2000 | `storage.crearProducto` y `leerArchivo` |
| `ARCHIVO_MAX_BYTES` | 5 MB | `drive.leer` |
| `MARGEN_FUTURO_MS` | 1 día | `leerArchivo` |

- **Notas y unidad:** como errores de validación. El formulario ya pinta los errores por campo (`mostrarErrores`). Además, `<textarea name="notas">` lleva `maxlength="1000"`, que no cambia nada visible y evita llegar al error. La unidad es un `<select>` y no lo necesita.
- **Máximo de productos:**
  - En `storage.crearProducto`, dentro de la misma transacción, se cuentan los registros del almacén (`count()`, bajas incluidas). Si se alcanza el máximo, se lanza un nuevo `ErrorLimiteProductos`.
  - El formulario lo distingue del error genérico y muestra el mensaje de la spec en el mismo aviso.
  - Las bajas cuentan porque también van al archivo. Así un dispositivo nunca genera un archivo que otro rechazaría.
- **Archivo de Drive:**
  - `leerArchivo(texto, ahora)` lanza `ErrorArchivoNoValido` si `productos.length > PRODUCTOS_MAX`. Se rechaza en lugar de recortar: recortar y después subir haría desaparecer productos del archivo.
  - Un `actualizado` posterior a `ahora + MARGEN_FUTURO_MS` se sustituye por `ahora.toISOString()`, y `leerArchivo` devuelve cuántos ha corregido (`corregidos`). `planificar` recibe los remotos ya corregidos y no vería la diferencia con Drive, así que el sincronizador sube el archivo cuando `plan.hayQueSubir || corregidos > 0`. Se recorta en lugar de descartar para conservar la intención (una baja sigue siendo baja), y el margen de un día tolera relojes algo adelantados.
  - El sincronizador pasa `ahora()` a `leerArchivo`.
- **Tamaño del archivo:**
  - `drive.leer` rechaza con `ErrorArchivoGrande` si `content-length` supera el límite y, si no viene esa cabecera, comprueba la longitud del texto descargado.
  - El sincronizador trata `ErrorArchivoGrande` como `ErrorArchivoNoValido`: mensaje `MENSAJES.archivo` y sin sobrescribir.

### 5. Router

- `encontrar(path)` envuelve el `decodeURIComponent` en `try/catch`. Si falla, esa ruta no coincide y, al final, devuelve `null`. `procesar()` ya redirige a `RUTA_POR_DEFECTO` con `reemplazar`, que no deja la ruta inválida en el historial.
- Se exporta `encontrar` para probarlo en Node: el módulo no toca `window` al cargarse. La prueba registra `producto/:id` y comprueba que `encontrar('/producto/%E0%A4%A')` devuelve `null` sin lanzar, y que una ruta bien codificada sigue decodificándose.

### 6. CI (`pages.yml`)

- Cada `uses:` pasa a `owner/action@<SHA de 40 caracteres> # vX.Y.Z`, con el SHA de la misma versión mayor que ya se usa (Node 24).
  - El SHA se obtiene del *tag* exacto con `git ls-remote https://github.com/actions/<action> refs/tags/vX.Y.Z` o `gh api`, comprobando que es un *commit* y no un *tag* anotado (si es anotado, se usa el `^{}`).
  - El comentario con la versión permite actualizarlas a mano o con Dependabot más adelante.
- `actions/checkout` con `persist-credentials: false`: el workflow no hace `git push`, así que el token no necesita quedarse en `.git/config`.
- Prueba en Node (`tests/ci.test.js`): lee el YAML como texto y comprueba que cada línea `uses:` termina en un SHA de 40 hexadecimales y que hay `persist-credentials: false`.

### 7. Scripts de desarrollo

- **`scripts/lib/servir.mjs` (nuevo, puro, probado en Node):** `resolverArchivo({ raiz, permitidas, pathname })` devuelve la ruta absoluta o `null`.
  - Devuelve `null` si la decodificación falla, si algún segmento empieza por `.` (`.git`, `.claude`, `.env`…), si la ruta sale de `raiz` o si el primer segmento no está en `permitidas`.
  - `probar-navegador.mjs` lo usa con `permitidas: ['src', 'tests']`: un `null` (también una URL mal formada) responde 404. Además, todo el manejador va en `try/catch`.
  - En los dos servidores, el archivo se lee antes de escribir la cabecera 200: antes, uno inexistente provocaba `ERR_HTTP_HEADERS_SENT` y tiraba `captura-app.mjs`.
  - `captura-app.mjs` lo usa con `raiz: src/` (sin restricción de primer segmento).
- **`captura-app.mjs` con `--remote-debugging-pipe`:**
  - Chrome lee los mensajes CDP del descriptor 3 y escribe en el 4, en JSON terminado en `\0`. Node lo abre con `spawn(..., { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] })`.
  - Así no se abre ningún puerto: el canal solo existe entre los dos procesos.
  - El troceado de mensajes va en `scripts/lib/cdp.mjs` como función pura `separarMensajes(resto, trozo)` → `{ mensajes, resto }`, probada en Node.
  - **Alternativa descartada:** mantener el puerto con `--remote-debugging-port=0`. El puerto seguiría abierto a otros procesos locales mientras dura la captura.
- **Captura con la CSP activa:** el script de sesión simulada se sirve como `/__captura.js` (externo, mismo origen) y se cambia el `<script type="module" src="js/app.js">` por `<script type="module" src="__captura.js">`. Las rutas, los productos y el email van en el propio archivo generado. `__captura.js` registra además `securitypolicyviolation` en `window.__errores`.
- **Cierre garantizado:** `terminar()` se llama también si algo lanza (`try/finally` alrededor del recorrido) y con `SIGINT`, para no dejar Chrome abierto.
- Los dos servidores siguen en `127.0.0.1`. Se añade un comentario que lo explica, para que nadie lo cambie a `0.0.0.0`.

### 8. `.gitignore` y gitleaks

- Se añaden `.env*`, `*.pem` y `*.key`. También se corrige el comentario de `docs/security/` ("se revisan en pulido-final"), que ya no es cierto.
- gitleaks no se puede ejecutar sin una dependencia, así que lo hace el usuario a mano sobre un clon completo, con el binario oficial o Docker. El comando va en la tarea.

### 9. Sección "Seguridad" del README

Solo contenido genérico, que no revele el estado de las cuentas ni los puntos débiles abiertos (§11):
- Qué protege la CSP y cómo ampliarla si una API de Google nueva lo necesita (añadir el origen exacto a la directiva concreta, nunca `*` ni `'unsafe-inline'`).
- Cómo retirar el acceso de la app a la cuenta: myaccount.google.com/permissions.
- Recomendaciones generales para quien despliegue su propia copia: verificación en dos pasos, orígenes autorizados mínimos, app OAuth en estado Prueba, secretos en el entorno de despliegue y rama principal protegida. Se redactan como consejos, sin decir si están hechos.

### 10. Revisión manual y nueva auditoría

- La revisión de la configuración de cuentas, la valoración del origen de publicación, gitleaks y la nueva auditoría con la skill de Cloudflare se hacen con el usuario a partir de las notas locales (`docs/security/revision-manual.md`, fuera de git). Sus resultados se anotan allí, no en el repositorio.

### 11. Qué se versiona y qué no

El repositorio es público. Los artefactos versionados (proposal, design, specs, tasks, README, comentarios y mensajes de *commit*) describen **qué hace la app**, no **dónde es débil**:
- Sí: el comportamiento nuevo (CSP, límites, token ligado a la sesión) y cómo se prueba. El código publicado ya lo muestra.
- No: el estado de las cuentas (verificación en dos pasos, protección de ramas, ubicación de los secretos, orígenes configurados), los puntos débiles que siguen abiertos o se aceptan, la valoración del origen de publicación ni los informes de auditoría. Todo eso va en `docs/security/` (fuera de git).
- Los artefactos de este cambio se suben **en el mismo *push*** que los arreglos, nunca antes: hasta entonces describen fallos que siguen en producción.
- Antes de cada *commit* de este cambio se repasa el diff buscando pistas de este tipo (tarea 9.7).

### 12. Estrategia de pruebas

| Qué | Dónde |
|---|---|
| Longitudes de `notas` y `unidad` | Node: `tests/productos.test.js` |
| Máximo de productos, `actualizado` futuro y número de productos en `leerArchivo` | Node: `tests/sincronizacion.test.js` |
| Tamaño del archivo en `drive.leer` | Node: `tests/drive.test.js` (`fetch` inyectado) |
| Router con `%` mal formado | Node: `tests/router.test.js` (nuevo) |
| CSP declarada | Node: `tests/csp.test.js` (nuevo) |
| Actions por SHA y `persist-credentials` | Node: `tests/ci.test.js` (nuevo) |
| `resolverArchivo` y `separarMensajes` | Node: `tests/scripts.test.js` (nuevo) |
| Token ligado, dos ventanas, revocación y renovación con otra cuenta | Navegador: `tests/navegador/auth.test.js` (nuevo), con `usarEntornoAuth` y `StorageEvent` sintéticos |
| Error `otra-cuenta` en el sincronizador | Navegador: `tests/navegador/sincronizador.test.js` |
| Máximo de productos en `storage` | Navegador: `tests/navegador/storage.test.js` |
| Mensaje del máximo de productos en el formulario | Navegador: `tests/navegador/formulario.test.js` |
| Recorrido sin infracciones de la CSP | Semiautomático: `captura-app.mjs` con un recorrido |
| Dos ventanas reales, login, sincronización con fotos, cierre de sesión y *offline* con Google real y CSP | Manual, tras desplegar |
| CI en verde con SHAs; revisión de cuentas; gitleaks; nueva auditoría | Manual |

- `auth.test.js` importa `auth.js`, que arrastra `config.local.js`: funciona en local, igual que la app.
- `scripts.test.js` importa solo `scripts/lib/`, nunca los scripts completos, porque arrancan servidores y navegadores al importarse.

## Riesgos / Compromisos

- **[La CSP rompe el login o la sincronización en producción]** → Se usa la política recomendada por Google para GIS y se prueba en local con `captura-app.mjs`. La verificación manual tras el despliegue va antes de dar el cambio por terminado. Si falla, se revierte el `<meta>` (un *commit*) y se ajusta.
- **[`--remote-debugging-pipe` no funciona con Edge o en Windows]** → Chrome y Edge lo admiten desde hace años (Puppeteer lo usa con `pipe: true`) y Node admite descriptores extra en Windows. Si fallara, el script lo dice claramente y se valora volver al puerto con `--remote-debugging-port=0`.
- **[Hay datos reales que superan los nuevos límites]** → Es poco probable: las notas son cortas y la unidad sale de una lista. Antes de desplegar, una tarea comprueba con la consola de la app instalada que ningún producto supera los límites. Si alguno los superase, se acortaría a mano.
- **[Token sin `email` tras desplegar]** → El primer uso tras la actualización pide un toque para renovar, como cada día. No hace falta migración.
- **[Revocar al cerrar sesión con el reloj mal]** → Ahora se revoca siempre que haya un token, así que este caso queda cubierto.
- **[Un SHA fijado deja de recibir arreglos de seguridad de la action]** → El comentario con la versión facilita actualizarlo. Activar Dependabot para actions es opcional y se deja anotado.
- **[Límite de 2000 productos]** → Una casa no se acerca a esa cifra. El mensaje explica qué hacer y las bajas se purgan a los 90 días.

## Plan de despliegue

1. Antes del *push*: `npm test`, `npm run test:navegador`, el recorrido de `captura-app.mjs` sin infracciones y el repaso del diff (§11). Los artefactos de OpenSpec van en el mismo *push* que los arreglos.
2. El usuario hace *push* a `main`. El workflow, ya con SHAs, debe quedar en verde.
3. Abrir y cerrar la app instalada para que cargue la versión nueva. Hacer la verificación manual: login, sincronizar, foto, *offline*, cerrar sesión y dos ventanas en el escritorio.
4. **Vuelta atrás:** revertir el *commit*. No hay migración de datos: el campo `email` del token es opcional para versiones anteriores, y los límites no cambian ningún dato guardado.
