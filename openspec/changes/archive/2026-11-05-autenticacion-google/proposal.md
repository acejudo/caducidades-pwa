# Proposal

## Why

SPEC §6 exige que solo dos personas puedan usar Caducidades, pero ahora la app está abierta a cualquiera que tenga la URL: el control de acceso del router deja pasar todo y Login es un marcador vacío. Además, cuando llegue la sincronización necesitará un token de Google con el *scope* de Drive. Por eso el login va antes que los productos y que Drive.

## What Changes

- **Pantalla de Login real** (DESIGN §5.0): centrada, con el título "Caducidades", una instrucción breve y el botón "Entrar con Google". Muestra mensajes para "Acceso denegado", "Sin conexión" y los errores al iniciar sesión.
- **Integración con Google Identity Services** (flujo de token OAuth 2.0). Se pide en un solo consentimiento la identidad (`openid email profile`) y `https://www.googleapis.com/auth/drive.file`, para que el cambio de Drive no tenga que volver a pedir permiso.
- **Verificación del email** con `/oauth2/v3/userinfo` contra la lista blanca. La lista guarda **hashes SHA-256** de los emails autorizados, no los emails en texto, así que no se pueden leer en el código publicado.
- **Si el email no está autorizado**: se revoca el token, no se guarda la sesión y se muestra "Acceso denegado".
- **Sesión recordada**: tras un login válido se guardan en el dispositivo el email y el nombre. Al reabrir la app se entra directamente, también sin conexión, hasta que el usuario pulse "Cerrar sesión". El token de acceso caduca a la hora; su renovación se deja preparada para el cambio de Drive.
- **Protección de rutas**: sin una sesión autorizada, cualquier ruta lleva a Login; con sesión, Login lleva a Listado.
- **Cerrar sesión** desde Ajustes: muestra la cuenta conectada (nombre y email), revoca el token y vuelve a Login. Desaparece el acceso provisional "Ir a Login".
- **Datos sensibles fuera de git**: el Client ID y los hashes de los emails van en `js/config.local.js`, que está en `.gitignore`, y el repo solo incluye una plantilla de ejemplo. Un script genera ese archivo a partir de los emails en texto.
- **Despliegue con GitHub Actions**: un *workflow* genera `config.local.js` a partir de los *Secrets* del repositorio y publica en GitHub Pages. **BREAKING (despliegue)**: Pages deja de publicar directamente desde la rama `main`; hay que cambiar el origen a "GitHub Actions".

**Fuera de alcance:** la sincronización con Drive (incluida la renovación del token cuando se use), el CRUD de productos y el resto de pantallas.

## Capabilities

### New Capabilities
- `user-auth`: acceso restringido con Google. Incluye el login, la verificación contra la lista blanca de hashes, el acceso denegado, la sesión recordada (también sin conexión), el token de acceso para Drive y el cierre de sesión.

### Modified Capabilities
- `app-navigation`: el control de acceso deja de permitir siempre el paso, porque ahora lo usa la autenticación. Además, el recorrido tocando ya no ofrece la entrada provisional a Login desde Ajustes.

## Impact

- **Código**:
  - `js/auth.js`: implementación nueva.
  - `js/config.js`: lee los valores de `config.local.js`.
  - `js/ui.js`: pantallas Login y Ajustes.
  - `js/app.js`: registra el control de acceso.
  - `sw.js`: sube a `v2` y añade `config.local.js` a la caché.
  - `css/styles.css`: estilos del Login.
- **Archivos nuevos**: `js/config.local.example.js`, `scripts/generar-config-local.mjs` y `.github/workflows/pages.yml`. Además, `js/config.local.js` se añade a `.gitignore`.
- **Dependencia externa**: el script de Google Identity Services (`https://accounts.google.com/gsi/client`), que se carga solo en la pantalla de Login y hace falta conexión para entrar la primera vez.
- **Configuración externa** que hace el usuario:
  - Un proyecto en Google Cloud con la pantalla de consentimiento en modo "Prueba" y un Client ID web con los orígenes `https://acejudo.github.io` y `http://localhost:8080`.
  - Los Secrets `GOOGLE_CLIENT_ID` y `EMAILS_AUTORIZADOS` en GitHub.
  - Cambiar el origen de Pages a GitHub Actions.
- **Desarrollo local**: antes de arrancar la app hay que generar `js/config.local.js`; si falta, la app no carga.
