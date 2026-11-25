# pwa-shell Specification

## Purpose

Permite instalar Caducidades como aplicación en la pantalla de inicio de Android (Chrome) e iOS (Safari) y abrir su interfaz base sin conexión, sobre la que se construyen el resto de funcionalidades.

## Requirements

### Requirement: Manifest de aplicación web
La app SHALL publicar un Web App Manifest enlazado desde la página principal con nombre "Caducidades", nombre corto, idioma `es`, `display: standalone`, color de tema y de fondo de `docs/DESIGN.md`, e iconos de 192×192 y 512×512 px (uno *maskable*). `start_url` y `scope` MUST ser relativos para que la app funcione publicada en un subdirectorio.

#### Scenario: Chrome Android reconoce la app como instalable
- **WHEN** un usuario abre la app servida por HTTPS en Chrome para Android
- **THEN** el navegador ofrece "Instalar aplicación" / "Añadir a pantalla de inicio" y la auditoría de instalabilidad de DevTools no muestra errores

#### Scenario: Publicación en subdirectorio
- **WHEN** la app se sirve desde `https://<usuario>.github.io/caducidades-pwa/`
- **THEN** el manifest, los iconos y la URL de inicio se resuelven dentro de ese subdirectorio y la app instalada abre en él

### Requirement: Soporte de instalación en iOS
La página principal SHALL incluir un `apple-touch-icon` de 180×180 px, el título de la app para la pantalla de inicio de iOS y una configuración de viewport que respete las zonas seguras de la pantalla (notch, barra de inicio).

#### Scenario: Añadir a pantalla de inicio en Safari iOS
- **WHEN** un usuario elige "Añadir a pantalla de inicio" en Safari para iOS
- **THEN** aparece el icono de la app con el nombre "Caducidades" y, al abrirla, se muestra a pantalla completa sin la interfaz de Safari

### Requirement: Shell disponible sin conexión
La app SHALL registrar un Service Worker que guarde en caché todos los recursos propios del *shell* (HTML, CSS, JS, manifest, iconos) en la primera visita. Después, la app MUST abrirse y permitir navegar entre sus pantallas sin conexión.

#### Scenario: Apertura sin conexión
- **WHEN** el usuario ha abierto la app al menos una vez con conexión y después la abre en modo avión
- **THEN** la app carga y muestra su pantalla inicial sin errores de red

#### Scenario: Recarga de una ruta interna sin conexión
- **WHEN** el usuario, sin conexión, recarga la app estando en una pantalla interna
- **THEN** se muestra la app (no la página de error del navegador) y se pinta esa misma pantalla

### Requirement: Actualización del shell entre versiones
Cada versión publicada SHALL usar una caché identificada por versión. Al activarse una versión nueva del Service Worker, la app MUST borrar las cachés de versiones anteriores y servir los recursos de la nueva versión desde la siguiente carga.

#### Scenario: Publicación de una nueva versión
- **WHEN** se publica una versión con un identificador de caché distinto y el usuario abre la app con conexión
- **THEN** a partir de la siguiente carga la app sirve los recursos nuevos y la caché antigua ya no existe

### Requirement: Peticiones externas fuera de la caché
El Service Worker MUST NOT guardar en caché ni interceptar las peticiones a otros orígenes (por ejemplo, los servicios de Google) ni las peticiones que no sean GET.

#### Scenario: Petición a un servicio externo
- **WHEN** la app hace una petición a un dominio distinto del suyo
- **THEN** la petición va directamente a la red y su respuesta no se guarda en la caché del shell

### Requirement: Política de seguridad de contenido
La página principal SHALL declarar una *Content-Security-Policy* que limite los scripts a la propia app y al cliente de Google Sign-In, y las conexiones a la propia app, las APIs de Google y Google Sign-In. MUST NOT permitir scripts en línea (`'unsafe-inline'`) ni `eval` (`'unsafe-eval'`). Con la política activa, el login, la sincronización, el cierre de sesión y el funcionamiento sin conexión MUST seguir funcionando.

#### Scenario: Política declarada
- **WHEN** se inspecciona la página principal publicada
- **THEN** declara una política con `script-src 'self' https://accounts.google.com/gsi/client`, `connect-src` limitado a `'self'`, `https://www.googleapis.com`, `https://oauth2.googleapis.com` y `https://accounts.google.com/gsi/`, `img-src 'self' blob:`, `object-src 'none'` y `base-uri 'self'`, sin `'unsafe-inline'` ni `'unsafe-eval'` en ninguna directiva

#### Scenario: Script de otro origen bloqueado
- **WHEN** algo intenta cargar en la app un script de un origen que no es la propia app ni Google Sign-In
- **THEN** el navegador lo bloquea

#### Scenario: Estilos en línea de Google Sign-In
- **WHEN** el cliente de Google Sign-In inserta los estilos en línea de sus botones, que la app no usa
- **THEN** la política los bloquea y el login sigue funcionando con la ventana de Google

#### Scenario: App completa con la política
- **WHEN** con la app publicada el usuario inicia sesión, sincroniza una lista con fotos, abre la app sin conexión y cierra sesión
- **THEN** todo funciona como antes y la consola no muestra más infracciones de la política que el estilo en línea de Google Sign-In

### Requirement: Solo en su propia ventana
La app SHALL funcionar solo como página principal de su ventana o pestaña, o instalada. Si se carga dentro de un marco (`iframe`) de otra página, MUST NOT arrancar: no carga las pantallas, Google Sign-In ni la sincronización, y MUST mostrar solo un texto que explica que se abre en su propia ventana y un enlace que la abre fuera del marco. La comprobación MUST cumplir la política de seguridad de contenido, sin scripts en línea.

#### Scenario: Cargada dentro de un marco
- **WHEN** otra página carga la app dentro de un `iframe`
- **THEN** el marco muestra solo el aviso y el enlace "Abrir Caducidades", sin pantalla de login, botones de la app ni ventana de Google

#### Scenario: Abrir desde el marco
- **WHEN** en ese aviso se toca "Abrir Caducidades"
- **THEN** la app se abre en la ventana principal, fuera del marco

#### Scenario: Uso normal
- **WHEN** se abre la app en una pestaña o instalada
- **THEN** arranca como siempre y no se muestra el aviso
