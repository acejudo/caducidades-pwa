# Tasks

## 1. Configuración sensible fuera de git

- [x] 1.1 Añadir `js/config.local.js` a `.gitignore` y crear `js/config.local.example.js` (exporta `GOOGLE_CLIENT_ID = ''` y `EMAILS_AUTORIZADOS_SHA256 = Object.freeze([])`, con un comentario que explica cómo generarlo); verificar con `git check-ignore js/config.local.js` que se ignora y con `git status` que el ejemplo sí aparece
- [x] 1.2 Crear `scripts/generar-config-local.mjs` (Node, sin dependencias): lee `--client-id`/`--emails` o las variables `GOOGLE_CLIENT_ID`/`EMAILS_AUTORIZADOS`, valida que no estén vacíos y que los emails tengan formato válido, normaliza (`trim` + minúsculas), calcula los SHA-256 con `node:crypto` y escribe `js/config.local.js`; verificar que con `--emails " Ana@Gmail.com ,b@x.com"` genera dos hashes de 64 caracteres hexadecimales, que el de `ana@gmail.com` coincide con `echo -n ana@gmail.com | sha256sum`, que el archivo no contiene ningún email y que sin argumentos sale con error y no escribe nada
- [x] 1.3 Cambiar `js/config.js` para que reexporte `GOOGLE_CLIENT_ID` y `EMAILS_AUTORIZADOS_SHA256` desde `./config.local.js` y eliminar `EMAILS_AUTORIZADOS`; verificar con `grep -r EMAILS_AUTORIZADOS\b js/` que no quedan usos del nombre antiguo y que la app carga en local con un `config.local.js` generado

## 2. Módulo de autenticación (`js/auth.js`)

- [x] 2.1 Implementar el almacenamiento de la sesión (`localStorage['caducidades.sesion']`) y del token (`sessionStorage['caducidades.token']` con `expira` y 60 s de margen), con todo el acceso dentro de `try/catch`, además de `sesionActual()` y `tokenVigente()`; verificar desde la consola que un token con `expira` pasado devuelve `null` y que, con `localStorage` bloqueado, no se lanza ningún error
- [x] 2.2 Implementar `hashEmail()` con `crypto.subtle` y `revalidarSesion()` (borra la sesión si su hash ya no está en `EMAILS_AUTORIZADOS_SHA256`); verificar en la consola que `hashEmail(' Ana@Gmail.com ')` devuelve el mismo hash que el script de la tarea 1.2
- [x] 2.3 Implementar la carga diferida de GIS (inserta el script una sola vez, con un tiempo de espera de 10 s y la promesa descartada si falla para poder reintentar); verificar en Chrome con la petición a `accounts.google.com` bloqueada (DevTools → *Request blocking*) que la promesa se rechaza a los 10 s o antes y que un segundo intento vuelve a insertar el script
- [x] 2.4 Implementar `iniciarSesion()`: `initTokenClient` con `openid email profile` más `DRIVE_SCOPE`, comprobación de `hasGrantedAllScopes`, llamada a `userinfo`, comprobación de `email_verified` y del hash, y guardado de la sesión y el token o revocación más el resultado `denegado`/`cancelado`/`sin-drive`/`error` (design.md §6); verificar con el GIS simulado del grupo 5 cada uno de los cinco resultados
- [x] 2.5 Implementar `cerrarSesion()` (revoca si hay token y GIS está cargado, sin bloquear nunca, y borra la sesión y el token) y `renovarToken()` (`prompt: ''` y `login_hint`); verificar que, sin conexión, `cerrarSesion()` deja `sesionActual() === null` sin errores

## 3. Router, Login y Ajustes

- [x] 3.1 Exponer `reemplazar(path)` en `js/router.js` y añadir la opción de ruta `mostrarCabecera` (por defecto `true`) en `ui.js`; verificar que el resto de rutas siguen mostrando su cabecera y que la flecha de volver funciona como antes
- [x] 3.2 En `js/app.js`, cargar de forma dinámica los módulos que dependen de la configuración, mostrar el aviso "Falta js/config.local.js" si no existe, ejecutar `await revalidarSesion()` y registrar el *guard* de design.md §7 antes de `iniciar()`; verificar que sin sesión `#/ajustes` muestra Login, que con sesión `#/login` muestra Listado, y que al renombrar temporalmente `config.local.js` aparece el aviso en lugar de una pantalla en blanco
- [x] 3.3 Implementar la pantalla Login (`.login` centrada según DESIGN §5.0, sin cabecera ni barra inferior): título, instrucción, botón primario "Entrar con Google" (con el estado "Conectando…"), zona de mensaje `role="alert"` para "Acceso denegado" con el email, "No se completó el inicio de sesión", "Hace falta permitir el acceso a Google Drive" y "No se pudo conectar con Google" con "Reintentar", y aviso sin conexión con el botón desactivado que reacciona a `online`/`offline`; añadir los estilos `.login` en `css/styles.css` con los tokens existentes; verificar cada estado en el modo dispositivo de DevTools y que el botón mide al menos 48 px de alto
- [x] 3.4 Al iniciar sesión correctamente, reemplazar la URL por `#/listado` (Atrás no vuelve a Login). En Ajustes, quitar "Ir a Login" y añadir el bloque "Cuenta" (nombre y email con `textContent`) y el botón "Cerrar sesión" (`.btn--peligro`), que llama a `cerrarSesion()` y después a `location.replace('#/login')`; verificar los escenarios "Cerrar sesión" y "Atrás tras cerrar sesión" de `user-auth`

## 4. Service Worker y despliegue

- [x] 4.1 En `sw.js`, poner `CACHE_VERSION = 'v2'` y añadir `./js/config.local.js` a `SHELL_FILES`; verificar en DevTools que el SW `v2` se activa, que borra `caducidades-shell-v1` y que la app con sesión abre en modo Offline
- [x] 4.2 Crear `.github/workflows/pages.yml` según design.md §5 (checkout, setup-node 22, generar `config.local.js` desde los *secrets*, sustituir `CACHE_VERSION` por el SHA corto, configure/upload/deploy de Pages, permisos y `concurrency`); verificar el YAML con `npx --yes @action-validator/cli .github/workflows/pages.yml` (o equivalente) y que el paso de generación falla si falta un *secret*
- [x] 4.3 Actualizar `README.md`: cómo generar `config.local.js` en local (comando exacto del script), configuración de Google Cloud (pantalla de consentimiento en "Prueba", *test users*, Client ID web y orígenes `https://acejudo.github.io` y `http://localhost:8080`), *secrets* de GitHub, cambio de Pages a "GitHub Actions", y que `CACHE_VERSION` ya no se sube a mano en producción; verificar que los comandos del README funcionan tal como están escritos

## 5. Verificación

- [x] 5.1 Escribir en el scratchpad una verificación con Chrome *headless* que intercepte `accounts.google.com/gsi/client` (GIS simulado configurable) y `oauth2/v3/userinfo`, y que compruebe los escenarios de `user-auth` y los modificados de `app-navigation`: login obligatorio, autorizado, mayúsculas, denegado (se revoca y no queda sesión), cancelado, sin `drive.file`, fallo de carga con reintento, sin conexión con el botón desactivado y su reactivación, sesión recordada tras recargar y en Offline, revalidación con un email retirado, Login inaccesible con sesión, token vigente tras recargar y `null` al caducar, cerrar sesión (con y sin conexión), Atrás tras cerrar sesión, sin bucles de redirección y recorrido completo tocando; ejecutarlo y que todo pase
- [x] 5.2 Comprobar que ningún archivo del repositorio ni del *shell* publicado contiene los emails en texto: `git grep -i "@gmail.com"` solo debe encontrar documentación genérica, y un `grep` sobre los archivos que sirve el *workflow* no debe encontrar los emails reales
- [ ] 5.3 (Requiere al usuario) Configurar Google Cloud y los *secrets* de GitHub, cambiar Pages a "GitHub Actions", hacer push y comprobar que el *workflow* termina en verde
- [ ] 5.4 (Requiere al usuario) Probar con Google real en `localhost` y en la URL publicada, en Android y en iOS con la app instalada: login con los dos emails autorizados, "Acceso denegado" con otra cuenta, reapertura en modo avión con la sesión recordada y "Cerrar sesión". Si en iOS standalone la ventana de Google no devuelve el control, anotarlo y evaluar `ux_mode: 'redirect'` (design.md, *Risks*)

## Workflow follow-up

- Archivar el cambio (`/opsx:archive`) cuando esté implementado y verificado, para crear la spec principal `user-auth` y actualizar `app-navigation`.
