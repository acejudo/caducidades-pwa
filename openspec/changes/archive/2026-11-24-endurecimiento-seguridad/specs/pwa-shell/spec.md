## ADDED Requirements

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
