# Design

## Context

Punto de partida (motivación en proposal.md, apartado "Why"):

- El router (`js/router.js`) ya tiene `setGuard(fn)`: `fn(destino)` devuelve `true` o la ruta a la que redirigir, y la redirección se hace con `replaceState`, sin añadir entradas al historial. Hoy no hay ningún *guard* registrado.
- `js/auth.js` está vacío. `js/config.js` exporta `GOOGLE_CLIENT_ID = ''`, `EMAILS_AUTORIZADOS = []` y `DRIVE_SCOPE`.
- `ui.js` pinta la pantalla Login como marcador, con el título "Caducidades" en la cabecera, y Ajustes incluye el enlace provisional "Ir a Login".
- `sw.js` (`v1`) precarga una lista explícita de archivos e ignora las peticiones a otros orígenes. Por tanto, el script de Google y las llamadas a Google van siempre a la red, y así debe seguir.
- GitHub Pages publica ahora desde la rama `main`. El repo es público.

Restricciones:

- Una PWA estática no puede guardar secretos. El Client ID es público por diseño, y la protección real es que Google solo lo acepta desde los orígenes autorizados.
- En el navegador, Google Identity Services (GIS) no da *refresh tokens*. Los tokens de acceso duran unos 60 minutos y renovarlos exige un gesto del usuario, porque abre una ventana emergente.
- La app debe abrirse sin conexión (SPEC §2) aunque el login sea obligatorio.

## Goals / Non-Goals

**Goals:**
- Separar dos conceptos: **sesión**, que es la identidad autorizada recordada en el dispositivo y funciona sin conexión, y **token**, que es la credencial temporal para Drive. El acceso a la app depende solo de la sesión.
- Dejar en `auth.js` una API pequeña que el cambio de Drive pueda usar sin tocar el login: `tokenVigente()` y `renovarToken()`.
- Que ni el Client ID ni los emails estén en el repositorio, y que los emails tampoco se puedan leer en la web publicada.

**Non-Goals:**
- Llamar a la API de Drive o renovar el token de forma automática en segundo plano.
- Validar la identidad en un servidor, porque no hay backend. La lista blanca está en el cliente, como acepta SPEC §6.4.
- Usar Google One Tap o el botón oficial de Google Sign-In. Se usa un botón propio según DESIGN §5.0.

## Decisions

### 1. Token client de GIS (OAuth 2.0 implícito) en lugar de "Sign In With Google" (ID token)
`google.accounts.oauth2.initTokenClient({ client_id, scope: 'openid email profile ' + DRIVE_SCOPE, callback, error_callback })` y `requestAccessToken()` al pulsar el botón. Con el token se llama a `GET https://www.googleapis.com/oauth2/v3/userinfo` para obtener `email`, `email_verified` y `name`, tal como describe SPEC §6.2.
- *Alternativa descartada:* el ID token (JWT) de Sign In With Google más un token de Drive por separado. Implica dos flujos y dos consentimientos, y para validar el JWT en el cliente habría que comprobar su firma, cosa que no aporta seguridad sin servidor.
- Se exige que se haya concedido `drive.file` con `google.accounts.oauth2.hasGrantedAllScopes(resp, DRIVE_SCOPE)`. Si el usuario lo desmarca en el consentimiento granular, se revoca el token y Login muestra "Hace falta permitir el acceso a Google Drive". Es una variante del escenario de error del requisito "Inicio de sesión con Google".

### 2. Carga diferida del script de GIS
`auth.js` inserta `<script src="https://accounts.google.com/gsi/client">` la primera vez que se muestra Login y guarda la promesa resultante. Si en 10 s no carga o da error, la promesa se rechaza y se descarta para poder reintentar. Login muestra "No se pudo conectar con Google" y el botón "Reintentar".
- Ventaja: con una sesión guardada no se descarga nada de Google al abrir la app, lo que la hace más rápida y le permite funcionar sin conexión.
- El script no entra en la caché del SW (es de otro origen, como ya exige `pwa-shell`).

### 3. Lista blanca con hashes SHA-256
`hashEmail(email)` = SHA-256 en hexadecimal de `email.trim().toLowerCase()`, calculado con `crypto.subtle.digest`, que está disponible en contextos seguros (HTTPS y `localhost`). Se compara contra `EMAILS_AUTORIZADOS_SHA256`.
- *Trade-off:* un hash sin sal se puede atacar por diccionario si alguien sospecha cuál es el email. Aun así, evita la lectura directa y la recolección automática de emails, que era el objetivo. No se añade sal porque, al estar en el cliente, sería igual de pública.

### 4. Configuración sensible: `config.local.js` + script generador
- `js/config.local.js` (en `.gitignore`) exporta `GOOGLE_CLIENT_ID` y `EMAILS_AUTORIZADOS_SHA256` (un array congelado de hashes).
- `js/config.js` los reexporta con `export { GOOGLE_CLIENT_ID, EMAILS_AUTORIZADOS_SHA256 } from './config.local.js';` y elimina `EMAILS_AUTORIZADOS`. El resto de módulos sigue importando solo de `config.js`.
- `js/config.local.example.js` (en el repo) tiene valores vacíos y un comentario con las instrucciones.
- `scripts/generar-config-local.mjs` (Node, sin dependencias, usa `node:crypto`) lee `--client-id` y `--emails a@x.com,b@y.com` o, si no se pasan, las variables de entorno `GOOGLE_CLIENT_ID` y `EMAILS_AUTORIZADOS`. Valida el formato, normaliza, calcula los hashes y escribe `js/config.local.js`. El mismo script sirve en local y en el despliegue, y los emails en texto nunca se escriben en disco.
- *Alternativa descartada:* poner los hashes directamente en `config.js` dentro del repo. El usuario quiere que ni siquiera los hashes ni el Client ID estén en git.
- *Consecuencia:* sin `config.local.js` la importación falla y la app no arranca. El README y el ejemplo lo explican, y `app.js` captura el error y muestra un aviso legible ("Falta js/config.local.js") en lugar de dejar la pantalla en blanco. Para eso, `app.js` hace un `import()` dinámico de los módulos que dependen de la configuración.

### 5. Despliegue con GitHub Actions
`.github/workflows/pages.yml` se lanza con un `push` a `main` o a mano (`workflow_dispatch`):
1. `actions/checkout@v4` y `actions/setup-node@v4` (Node 22).
2. `node scripts/generar-config-local.mjs`, con `env:` tomado de `secrets.GOOGLE_CLIENT_ID` y `secrets.EMAILS_AUTORIZADOS`. Si falta algún *secret*, falla y no publica.
3. Sustituye `CACHE_VERSION` en `sw.js` por los 7 primeros caracteres de `GITHUB_SHA`. Así cada despliegue invalida la caché y desaparece el riesgo de olvidarse de subir la versión.
4. `actions/configure-pages@v5`, `actions/upload-pages-artifact@v3` (`path: .`) y `actions/deploy-pages@v4`, con permisos `pages: write` e `id-token: write`, y `concurrency: pages`.
- En el repo, `CACHE_VERSION` queda como `'v2'` para el desarrollo local. El README se actualiza: en producción ya no hay que subirla a mano.
- *Alternativa descartada:* seguir publicando desde la rama con `config.local.js` commiteado, porque contradice el requisito.

### 6. Modelo de sesión y token
- **Sesión:** `localStorage['caducidades.sesion'] = { email, nombre, desde }` (ISO). Solo se escribe tras un login autorizado.
- **Token:** `sessionStorage['caducidades.token'] = { accessToken, expira }` (epoch ms, `Date.now() + expires_in*1000 - 60s` de margen). Sobrevive a una recarga, pero no a cerrar la app, como pide el requisito.
- Todo acceso al almacenamiento va dentro de `try/catch`. Si el almacenamiento falla, no se recuerda la sesión, pero el login del momento funciona.
- API de `auth.js`:
  - `sesionActual()`: devuelve `{ email, nombre }` o `null`.
  - `iniciarSesion()`: devuelve una promesa con `{ ok: true }` o `{ ok: false, motivo: 'denegado' | 'cancelado' | 'sin-drive' | 'error', email? }`.
  - `cerrarSesion()`.
  - `revalidarSesion()`: de forma asíncrona comprueba el hash contra la lista y, si ya no está, borra la sesión.
  - `tokenVigente()`: devuelve el `accessToken` o `null`.
  - `renovarToken()`: llama a `requestAccessToken({ prompt: '', login_hint: email })` y debe invocarse desde un gesto del usuario.
- La revocación (`google.accounts.oauth2.revoke(token)`) es la mejor posible: si no hay conexión o GIS no ha cargado, se ignora sin bloquear el cierre de sesión.

### 7. Integración con el router y la UI
- `app.js`, antes de `iniciar()`, hace `await revalidarSesion()` y registra:
  `setGuard(({ path }) => sesionActual() ? (path === '/login' ? '/listado' : true) : (path === '/login' ? true : '/login'))`.
  Login siempre se permite sin sesión y nunca redirige a sí mismo, por lo que no puede haber bucles.
- Tras un login correcto, `navegar('/listado')` con reemplazo (`replaceState` más el procesado del router), para que Atrás no vuelva a Login. Al cerrar sesión, `location.replace('#/login')`. Las entradas antiguas del historial (Listado, Ajustes…) quedan protegidas por el *guard*: si se pulsa Atrás, se redirige a Login. Para esto el router expone `reemplazar(path)`, que hoy es interno.
- La ruta Login pasa a `{ mostrarNav: false, mostrarCabecera: false }`. `ui.js` oculta la cabecera y la pantalla pinta su propio bloque centrado (`.login`): título "Caducidades", instrucción, botón primario grande "Entrar con Google" y una zona de mensaje (`role="alert"`).
- El estado del botón tiene en cuenta `navigator.onLine` y los eventos `online`/`offline` mientras Login está montada. Si no hay conexión: aviso más botón desactivado. Mientras está en curso: botón desactivado con el texto "Conectando…".
- Ajustes muestra un bloque "Cuenta" con el nombre y el email (como texto, nunca como HTML) y el botón "Cerrar sesión" (`.btn--peligro`). Se elimina el enlace "Ir a Login".

### 8. Service Worker
`CACHE_VERSION = 'v2'` y se añade `./js/config.local.js` a `SHELL_FILES`, para que la configuración también esté disponible sin conexión. `config.local.example.js` y `scripts/` no forman parte del *shell*.

### 9. Verificación
- **Automática, en Chrome *headless*** (con un script en el scratchpad, como en `setup-inicial`). Se interceptan `accounts.google.com/gsi/client` y `googleapis.com/oauth2/v3/userinfo` con un GIS simulado, para probar sin Google real: login autorizado, denegado, cancelado, sin `drive.file`, sin conexión, fallo de carga, sesión recordada, revalidación, cierre de sesión y Atrás.
- **Del script generador:** comprobar que el hash coincide con el que calcula el navegador para el mismo email con mayúsculas y espacios.
- **Manual con Google real:** en `localhost` y, tras desplegar, en Android e iOS con la app instalada.

## Risks / Trade-offs

- [En iOS, con la app instalada (standalone), la ventana de Google se abre en una vista de Safari y en algunas versiones no devuelve el control a la PWA] → Hay que probarlo de forma explícita en el iPhone (tarea de verificación). Si falla, el plan B es cambiar el modo del token client a `ux_mode: 'redirect'`, lo que exige gestionar el retorno en la URL. Se decidiría en ese momento.
- [La pantalla de consentimiento en modo "Prueba" muestra el aviso "Google no ha verificado esta app"] → Es aceptable para dos usuarios, que deben estar dados de alta como *test users*.
- [Sin `config.local.js` la app no arranca en local] → Se muestra un aviso explícito y el README lo documenta.
- [Una sesión recordada en un móvil perdido da acceso a la app] → Es aceptable en uso privado (SPEC §6.4). Mientras el token esté caducado, ese acceso no permite usar Drive, y se puede revocar la app desde la cuenta de Google.
- [Hash sin sal atacable por diccionario] → Se acepta (Decisión 3).
- [El primer despliegue con Actions falla si no se ha cambiado el origen de Pages ni creado los *secrets*] → Hay una tarea de configuración previa con los pasos exactos.

## Migration Plan

1. Configurar Google Cloud (proyecto, pantalla de consentimiento en "Prueba" con los dos *test users* y Client ID web con los orígenes `https://acejudo.github.io` y `http://localhost:8080`).
2. Generar `js/config.local.js` en local y probar.
3. Crear los *secrets* `GOOGLE_CLIENT_ID` y `EMAILS_AUTORIZADOS` en GitHub y cambiar *Settings → Pages → Source* a "GitHub Actions".
4. Hacer push. El *workflow* publica y el SW nuevo sustituye al `v1` en los dispositivos.
- **Vuelta atrás:** revertir el commit y volver a poner Pages en "Deploy from a branch". Los usuarios con sesión guardada no se ven afectados, porque la versión anterior ignora esa clave.

## Open Questions

- Si en iOS standalone hace falta `ux_mode: 'redirect'` se sabrá al probar en el iPhone. El resto del diseño no cambia.
