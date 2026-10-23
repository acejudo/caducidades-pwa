# Caducidades

PWA privada para controlar las fechas de caducidad de los alimentos. Ver [SPEC.md](SPEC.md) (funcionalidad) y [DESIGN.md](DESIGN.md) (diseño).

HTML, CSS y JavaScript vanilla con módulos ES: no hay dependencias ni paso de *build*.

## Arrancar en local

```bash
python -m http.server 8080
```

Abrir <http://localhost:8080/>. El Service Worker solo funciona en `localhost` o por HTTPS. Abrir `index.html` con doble clic (`file://`) no sirve.

## Estructura

```
index.html        # shell: cabecera, contenido y navegación inferior
manifest.json     # Web App Manifest (rutas relativas para GitHub Pages)
sw.js             # Service Worker: caché del shell y modo sin conexión
css/styles.css    # reset, tokens de DESIGN.md, layout y componentes base
js/app.js         # arranque: registro de rutas y del Service Worker
js/router.js      # router por hash (#/listado, #/producto/:id…)
js/ui.js          # cabecera, navegación y pantallas
js/config.js      # constantes (Client ID de Google, emails autorizados, Drive…)
js/auth.js        # (pendiente) Google Sign-In restringido
js/storage.js     # (pendiente) almacenamiento local y sincronización
js/drive.js       # (pendiente) Google Drive API
js/utils.js       # utilidades de DOM
img/icons/        # icono de la app (icon.svg es el origen de los PNG)
img/predeterminadas/  # fotos predeterminadas de productos
design/           # mockups de referencia
```

## Constantes

Todo lo configurable está en [js/config.js](js/config.js): `GOOGLE_CLIENT_ID`, `EMAILS_AUTORIZADOS`, el *scope* y los nombres de Drive y los umbrales de urgencia.

## Iconos

Si cambia `img/icons/icon.svg`, hay que regenerar los PNG:

```bash
npx --yes sharp-cli -i img/icons/icon.svg -o img/icons/icon-192.png resize 192 192
npx --yes sharp-cli -i img/icons/icon.svg -o img/icons/icon-512.png resize 512 512
npx --yes sharp-cli -i img/icons/icon.svg -o img/icons/icon-maskable-512.png resize 512 512
npx --yes sharp-cli -i img/icons/icon.svg -o img/icons/apple-touch-icon.png resize 180 180
```

## Publicar en GitHub Pages

1. **Antes de cada publicación**, en [sw.js](sw.js):
   - Subir `CACHE_VERSION` (`'v1'` → `'v2'`…). Si no se sube, los dispositivos seguirán usando la versión anterior.
   - Añadir a `SHELL_FILES` cualquier archivo nuevo. Si un archivo de la lista no existe, el Service Worker no se instala.
2. Subir los cambios a la rama principal.
3. La primera vez: *Settings → Pages → Deploy from a branch →* rama principal, carpeta `/ (root)`.
4. Abrir `https://<usuario>.github.io/caducidades-pwa/` e instalarla:
   - **Android (Chrome):** menú ⋮ → *Instalar aplicación*.
   - **iOS (Safari):** Compartir → *Añadir a pantalla de inicio*.
