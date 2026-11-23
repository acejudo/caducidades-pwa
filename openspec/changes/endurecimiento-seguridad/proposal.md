# Propuesta: endurecimiento-seguridad

## Por qué

La app pide un token de Google con acceso a **todo el Drive** del usuario, así que cualquier fallo de sesión o código ajeno ejecutado en su origen tiene un impacto alto. La auditoría externa (`docs/security/`, perfil *quick*, commit `84fa3a0`) confirmó un hallazgo (el token sobrevive al cierre de sesión en otras ventanas) y dejó una lista de endurecimientos. Es el último cambio antes de dar la app por terminada: hay que cerrarlos ahora, en la app, en el repositorio y en los scripts de desarrollo.

Solo seguridad: nada visual ni de usabilidad, salvo los mensajes imprescindibles de los nuevos rechazos.

## Qué cambia

**App (`src/`)**
- **Cierre de sesión en todas las ventanas** (hallazgo confirmado): el token guarda el email de la sesión que lo obtuvo; `tokenVigente()` rechaza el de otra sesión; cada ventana escucha el evento `storage` de `caducidades.sesion` y, si la sesión desaparece o cambia de cuenta, olvida y revoca su propio token; al cerrar sesión se revoca el token aunque haya caducado.
- **Renovación con la misma cuenta:** `renovarToken()` vuelve a comprobar con `userinfo` que el email del token nuevo es el de la sesión. Si no lo es, revoca el token y no lo guarda.
- **Content-Security-Policy** en `index.html` (`<meta>`): scripts solo de la propia app y de Google Sign-In; `connect-src` limitado a `googleapis.com` y a lo que use Google Sign-In; sin `unsafe-inline` ni `unsafe-eval`.
- **Límites de datos:**
  - Longitud máxima de `notas` (1000) y `unidad` (20), además del `nombre` (100), que ya existe.
  - Máximo de productos (2000 registros, bajas incluidas) en el dispositivo y en el archivo de Drive.
  - Tamaño máximo del `caducidades.json` descargado (5 MB).
  - Un `actualizado` remoto con más de un día en el futuro se recorta a la hora actual, para que una baja con una fecha muy lejana se pueda purgar.
- **Router:** un `%` mal formado en la dirección lleva a Listado en lugar de dejar la app en blanco.

**Repositorio y CI**
- Actions fijadas por SHA (las versiones con Node 24 de `pulido-final`) y `persist-credentials: false` en el checkout.
- `.gitignore` con `.env*`, `*.pem` y `*.key`.
- Tareas manuales del usuario sobre la configuración del repositorio y gitleaks sobre un clon completo (detalle en las notas locales).

**Scripts de desarrollo**
- `probar-navegador.mjs` solo sirve `src/` y `tests/`: nunca `.git`, ni ningún otro archivo o carpeta que empiece por punto. Una dirección mal codificada devuelve un error en lugar de tirar el servidor.
- `captura-app.mjs` controla Chrome por una tubería (`--remote-debugging-pipe`) en lugar de un puerto de depuración. Además, sirve su script de sesión simulada como archivo, para que la CSP real siga activa en las capturas.
- Los dos servidores siguen escuchando solo en *loopback*.

**Revisión, documentación y nueva auditoría**
- Revisión manual con el usuario de la configuración de las cuentas y del origen de publicación. La lista y sus resultados están en notas locales (`docs/security/`, fuera de git), no en el repositorio.
- Sección "Seguridad" del README con contenido genérico: qué protege la CSP, cómo retirar el acceso de la app y recomendaciones para quien despliegue su copia.
- **Nueva auditoría:** al terminar los arreglos, se vuelve a ejecutar la auditoría con la skill de Cloudflare (<https://github.com/cloudflare/security-audit-skill>), sobre el commit con los arreglos.
- **Nada de pistas en lo publicado:** el repositorio es público. Los artefactos versionados describen qué hace la app, no dónde es débil ni cómo están configuradas las cuentas. Se suben en el mismo *push* que los arreglos.

## Capacidades

### Capacidades nuevas
- Ninguna.

### Capacidades modificadas
- `user-auth`: el token queda ligado a la sesión, la renovación exige la misma cuenta y el cierre de sesión llega a todas las ventanas.
- `product-model`: longitudes máximas de `notas` y `unidad`.
- `product-storage`: máximo de productos en el dispositivo.
- `drive-sync`: límites del archivo de Drive (tamaño, número de productos y `actualizado` en el futuro).
- `app-navigation`: una dirección con codificación no válida no rompe la app.
- `pwa-shell`: política de seguridad de contenido.

## Impacto

- **Código de la app:**
  - `src/js/auth.js` (CRLF) y `src/js/ui.js`: escucha de otras ventanas.
  - `src/js/sincronizador.js`: mensaje de cuenta distinta.
  - `src/js/productos.js` (CRLF), `src/js/sincronizacion.js`, `src/js/storage.js`, `src/js/drive.js` y `src/js/constantes.js`.
  - `src/js/formulario.js`: mensaje del máximo de productos y `maxlength` de las notas.
  - `src/js/router.js` (CRLF) y `src/index.html` (CRLF).
- **Repositorio y scripts:**
  - `.github/workflows/pages.yml` y `.gitignore`.
  - `scripts/probar-navegador.mjs` y `scripts/captura-app.mjs`.
  - `scripts/lib/` (nuevo): utilidades puras compartidas por los dos scripts.
  - `README.md`: sección de seguridad genérica.
  - `CLAUDE.md`: norma de no dar pistas en lo que se publica.
- **Pruebas:**
  - Nuevas en Node: CSP, router, límites y utilidades de los scripts.
  - Nuevas en el navegador: `auth.test.js`, que necesita `config.local.js` en local, como el resto de la app.
- Sin dependencias nuevas. No hay archivos nuevos en el *shell* (`SHELL_FILES` no cambia).
- **Riesgo:** una CSP demasiado estricta rompería el login o la sincronización sin que lo detecten las pruebas automáticas. Por eso hay una verificación manual con Google real tras desplegar.
