# Caducidades

PWA privada para controlar las fechas de caducidad de los alimentos. Ver [docs/SPEC.md](docs/SPEC.md) (funcionalidad) y [docs/DESIGN.md](docs/DESIGN.md) (diseño).

HTML, CSS y JavaScript vanilla con módulos ES: no hay dependencias ni paso de *build*.

## Arrancar en local

1. Genera la configuración local (solo la primera vez, o si cambian el Client ID o los emails):

   ```bash
   node scripts/generar-config-local.mjs --client-id "<ID>.apps.googleusercontent.com" --emails "uno@gmail.com,otra@gmail.com"
   ```

   Esto crea `src/js/config.local.js` con el Client ID y los **hashes SHA-256** de los emails autorizados. El archivo está en `.gitignore`: no se sube a git. Sin él la app muestra "Falta la configuración".

2. Sirve la carpeta `src/`:

   ```bash
   python -m http.server 8080 -d src
   ```

3. Abre <http://localhost:8080/>. El Service Worker y el login solo funcionan en `localhost` o por HTTPS. Abrir `src/index.html` con doble clic (`file://`) no sirve.

Mientras desarrollas, marca *Update on reload* en DevTools → *Application → Service Workers* para no ver versiones antiguas cacheadas.

**Si regeneras `config.local.js`**, el Service Worker puede seguir sirviendo la versión anterior desde su caché (Google responde entonces `Error 401: invalid_client`). Borra la caché en DevTools → *Application → Storage → Clear site data* y recarga.

## Pruebas

El proyecto se desarrolla con TDD: primero la prueba que falla y después el código. Las pruebas están en `tests/` y no usan dependencias. No hace falta `npm install` ni `config.local.js`.

```bash
npm test                 # lógica pura (tests/*.test.js) con node --test
npm run test:navegador   # código que necesita el navegador (IndexedDB), en Chrome o Edge headless
```

- **Requisitos:** Node 22 o superior, y Chrome o Edge instalado para `test:navegador`. Si el script no encuentra el navegador, indica su ruta en la variable `CHROME` (PowerShell: `$env:CHROME = "C:\ruta\a\chrome.exe"`).
- **A mano en el navegador:** sirve la **raíz** del repo (no `src/`) con `python -m http.server 8080` y abre <http://localhost:8080/tests/navegador/>. La página muestra cada prueba y el resumen.
- Las pruebas de navegador usan la base de datos IndexedDB `caducidades-pruebas`, nunca `caducidades`, así que no tocan los productos de tu app en local.

## Datos en el dispositivo

Los productos se guardan en IndexedDB (base de datos `caducidades`), así que la app funciona sin conexión. Son una lista común a todas las personas autorizadas, y cerrar sesión no los borra. **Usa la app instalada en la pantalla de inicio**: Safari puede borrar los datos de las webs que no se visitan en 7 días, pero no los de las apps instaladas. Cuando llegue la sincronización, Drive será además la copia de seguridad.

## Estructura

Solo `src/` se publica en GitHub Pages; el resto es documentación y herramientas.

```
src/                    # la app (lo que se publica)
  index.html            # shell: cabecera, contenido y navegación inferior
  manifest.json         # Web App Manifest (rutas relativas para GitHub Pages)
  sw.js                 # Service Worker: caché del shell y modo sin conexión
  css/styles.css        # reset, tokens de DESIGN.md, layout y componentes
  js/app.js             # arranque: Service Worker, rutas y control de acceso
  js/router.js          # router por hash (#/listado, #/producto/:id…)
  js/ui.js              # cabecera, navegación y pantallas (las no implementadas son marcadores)
  js/listado.js         # pantalla Listado: tarjetas, filtros Todas/Pronto/Caducadas y estados vacíos
  js/formulario.js      # pantallas Nuevo y Editar producto: campos, validación, guardar, cancelar y eliminar
  js/dialogo.js         # diálogo de confirmación (<dialog>) reutilizable
  js/iconos.js          # iconos SVG de Lucide (licencia ISC) incrustados
  js/auth.js            # Google Sign-In restringido: sesión, token y lista blanca
  js/config.js          # configuración (Drive) y reexporta constantes y config.local.js
  js/constantes.js      # urgencia, categorías y unidades (sin datos sensibles)
  js/productos.js       # modelo de producto: validación, días restantes, urgencia, orden y filtros
  js/formato.js         # fechas ("20 nov 2026") y cantidades ("0,5 kg") en español
  js/config.local.js          # (no está en git) Client ID y hashes de los emails
  js/config.local.example.js  # plantilla de config.local.js
  js/storage.js         # almacenamiento local de productos en IndexedDB (sin conexión)
  js/drive.js           # (pendiente) Google Drive API
  js/utils.js           # utilidades de DOM
  img/icons/            # icono de la app (icon.svg es el origen de los PNG)
  img/predeterminadas/  # fotos predeterminadas de productos
docs/
  SPEC.md               # especificación funcional
  DESIGN.md             # guía de diseño
  design/               # mockups de referencia
openspec/               # specs y cambios (OpenSpec)
tests/                  # pruebas (TDD): *.test.js con node --test y navegador/ con IndexedDB
package.json            # solo los comandos npm test y npm run test:navegador (sin dependencias)
scripts/generar-config-local.mjs  # genera src/js/config.local.js
scripts/probar-navegador.mjs      # ejecuta las pruebas de navegador en Chrome/Edge headless
scripts/captura-app.mjs           # captura la app a tamaño móvil con sesión simulada (ver CLAUDE.md)
.github/workflows/pages.yml       # despliegue en GitHub Pages
```

## Autenticación

- Solo pueden entrar los emails autorizados. La app guarda sus hashes SHA-256, nunca los emails en texto.
- Tras un login válido, la sesión (email y nombre) se recuerda en el dispositivo y la app abre directamente, también sin conexión, hasta pulsar **Cerrar sesión** en Ajustes.
- El token de Google Drive dura ~1 hora y no se guarda al cerrar la app.

### Configurar Google Cloud (una sola vez)

Con tu cuenta personal en <https://console.cloud.google.com/>:

1. Crea el proyecto `Caducidades` y habilita **Google Drive API** (*APIs y servicios → Biblioteca*).
2. **Google Auth Platform**:
   - *Branding*: nombre `Caducidades` y tu email de asistencia.
   - *Público*: tipo **Externo**, estado **Prueba**. Añade los emails autorizados como **usuarios de prueba**.
   - *Acceso a datos*: permisos `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile` y `.../auth/drive.file`.
   - *Clientes → Crear cliente → Aplicación web*, con estos **orígenes de JavaScript autorizados** (sin URIs de redirección):
     - `https://acejudo.github.io`
     - `http://localhost:8080`
3. Copia el **ID de cliente**.

Para añadir o quitar una persona: actualiza los usuarios de prueba en Google, el Secret `EMAILS_AUTORIZADOS` y tu `src/js/config.local.js`. Si un email deja de estar autorizado, su sesión guardada se borra la próxima vez que abra la app.

## Iconos

Si cambia `src/img/icons/icon.svg`, hay que regenerar los PNG:

```bash
npx --yes sharp-cli -i src/img/icons/icon.svg -o src/img/icons/icon-192.png resize 192 192
npx --yes sharp-cli -i src/img/icons/icon.svg -o src/img/icons/icon-512.png resize 512 512
npx --yes sharp-cli -i src/img/icons/icon.svg -o src/img/icons/icon-maskable-512.png resize 512 512
npx --yes sharp-cli -i src/img/icons/icon.svg -o src/img/icons/apple-touch-icon.png resize 180 180
```

## Publicar en GitHub Pages

La publicación la hace el workflow [.github/workflows/pages.yml](.github/workflows/pages.yml) en cada push a `main`. El workflow genera `src/js/config.local.js` a partir de los Secrets y pone en `CACHE_VERSION` el SHA del commit, así que **ya no hay que subir la versión a mano**.

Configuración inicial (una sola vez):

1. En el repo, *Settings → Secrets and variables → Actions → New repository secret*:
   - `GOOGLE_CLIENT_ID`: el ID de cliente.
   - `EMAILS_AUTORIZADOS`: los emails separados por coma (`uno@gmail.com,otra@gmail.com`).
2. *Settings → Pages → Build and deployment → Source:* **GitHub Actions**.
3. Haz push a `main` (o lanza el workflow a mano en *Actions*). Si falta un Secret, el workflow falla y no publica.

Antes de cada publicación, añade a `SHELL_FILES` de [src/sw.js](src/sw.js) cualquier archivo nuevo del shell.

Después abre `https://acejudo.github.io/caducidades-pwa/` e instálala:

- **Android (Chrome):** menú ⋮ → *Instalar aplicación*.
- **iOS (Safari):** Compartir → *Añadir a pantalla de inicio*.
