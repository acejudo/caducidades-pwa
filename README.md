# Caducidades

PWA privada para controlar las fechas de caducidad de los alimentos. Ver [SPEC.md](SPEC.md) (funcionalidad) y [DESIGN.md](DESIGN.md) (diseño).

HTML, CSS y JavaScript vanilla con módulos ES: no hay dependencias ni paso de *build*.

## Arrancar en local

1. Genera la configuración local (solo la primera vez, o si cambian el Client ID o los emails):

   ```bash
   node scripts/generar-config-local.mjs --client-id "<ID>.apps.googleusercontent.com" --emails "uno@gmail.com,otra@gmail.com"
   ```

   Esto crea `js/config.local.js` con el Client ID y los **hashes SHA-256** de los emails autorizados. El archivo está en `.gitignore`: no se sube a git. Sin él la app muestra "Falta la configuración".

2. Sirve la carpeta:

   ```bash
   python -m http.server 8080
   ```

3. Abre <http://localhost:8080/>. El Service Worker y el login solo funcionan en `localhost` o por HTTPS. Abrir `index.html` con doble clic (`file://`) no sirve.

Mientras desarrollas, marca *Update on reload* en DevTools → *Application → Service Workers* para no ver versiones antiguas cacheadas.

**Si regeneras `config.local.js`**, el Service Worker puede seguir sirviendo la versión anterior desde su caché (Google responde entonces `Error 401: invalid_client`). Borra la caché en DevTools → *Application → Storage → Clear site data* y recarga.

## Estructura

```
index.html        # shell: cabecera, contenido y navegación inferior
manifest.json     # Web App Manifest (rutas relativas para GitHub Pages)
sw.js             # Service Worker: caché del shell y modo sin conexión
css/styles.css    # reset, tokens de DESIGN.md, layout y componentes
js/app.js         # arranque: Service Worker, rutas y control de acceso
js/router.js      # router por hash (#/listado, #/producto/:id…)
js/ui.js          # cabecera, navegación y pantallas
js/auth.js        # Google Sign-In restringido: sesión, token y lista blanca
js/config.js      # constantes (Drive, urgencia, categorías…)
js/config.local.js          # (no está en git) Client ID y hashes de los emails
js/config.local.example.js  # plantilla de config.local.js
js/storage.js     # (pendiente) almacenamiento local y sincronización
js/drive.js       # (pendiente) Google Drive API
js/utils.js       # utilidades de DOM
scripts/generar-config-local.mjs  # genera js/config.local.js
.github/workflows/pages.yml       # despliegue en GitHub Pages
img/icons/        # icono de la app (icon.svg es el origen de los PNG)
img/predeterminadas/  # fotos predeterminadas de productos
design/           # mockups de referencia
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

Para añadir o quitar una persona: actualiza los usuarios de prueba en Google, el Secret `EMAILS_AUTORIZADOS` y tu `config.local.js`. Si un email deja de estar autorizado, su sesión guardada se borra la próxima vez que abra la app.

## Iconos

Si cambia `img/icons/icon.svg`, hay que regenerar los PNG:

```bash
npx --yes sharp-cli -i img/icons/icon.svg -o img/icons/icon-192.png resize 192 192
npx --yes sharp-cli -i img/icons/icon.svg -o img/icons/icon-512.png resize 512 512
npx --yes sharp-cli -i img/icons/icon.svg -o img/icons/icon-maskable-512.png resize 512 512
npx --yes sharp-cli -i img/icons/icon.svg -o img/icons/apple-touch-icon.png resize 180 180
```

## Publicar en GitHub Pages

La publicación la hace el workflow [.github/workflows/pages.yml](.github/workflows/pages.yml) en cada push a `main`. El workflow genera `js/config.local.js` a partir de los Secrets y pone en `CACHE_VERSION` el SHA del commit, así que **ya no hay que subir la versión a mano**.

Configuración inicial (una sola vez):

1. En el repo, *Settings → Secrets and variables → Actions → New repository secret*:
   - `GOOGLE_CLIENT_ID`: el ID de cliente.
   - `EMAILS_AUTORIZADOS`: los emails separados por coma (`uno@gmail.com,otra@gmail.com`).
2. *Settings → Pages → Build and deployment → Source:* **GitHub Actions**.
3. Haz push a `main` (o lanza el workflow a mano en *Actions*). Si falta un Secret, el workflow falla y no publica.

Antes de cada publicación, añade a `SHELL_FILES` de [sw.js](sw.js) cualquier archivo nuevo del shell.

Después abre `https://acejudo.github.io/caducidades-pwa/` e instálala:

- **Android (Chrome):** menú ⋮ → *Instalar aplicación*.
- **iOS (Safari):** Compartir → *Añadir a pantalla de inicio*.
