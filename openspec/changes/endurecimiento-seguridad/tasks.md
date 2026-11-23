# Tareas

## 1. Límites del modelo y del archivo de Drive (Node)

- [x] 1.1 Rojo:
  - En `tests/productos.test.js`, los escenarios "Notas demasiado largas", "Notas en el límite" y "Unidad demasiado larga" (longitud medida tras recortar los espacios).
  - En `tests/constantes.test.js`, que existen `NOTAS_MAX` (1000), `UNIDAD_MAX` (20), `PRODUCTOS_MAX` (2000), `ARCHIVO_MAX_BYTES` (5 MB) y `MARGEN_FUTURO_MS` (1 día).
  - En `tests/sincronizacion.test.js`: "Demasiados productos en el archivo" (2001 lanza `ErrorArchivoNoValido`), "Baja con fecha en el futuro" (`actualizado` recortado a `ahora`, `planificar` marca `hayQueSubir` y `purgar` la quita a los 90 días), "Reloj ligeramente adelantado" (+2 h se conserva) y "Notas demasiado largas en el archivo" (se ignora ese producto).
  - Verificar que fallan con `npm test`.
- [x] 1.2 Verde (design §4):
  - Constantes en `constantes.js`.
  - Reglas de `notas` y `unidad` en `validarProducto`. `productos.js` es CRLF: editar con la herramienta de edición.
  - `leerArchivo(texto, ahora)` con el máximo de productos y el recorte del `actualizado` futuro.
  - Verificar con `npm test` en verde.
- [x] 1.3 Rojo: en `tests/drive.test.js`, con `fetch` inyectado, "Archivo demasiado grande": `leer` rechaza si `content-length` supera `ARCHIVO_MAX_BYTES` y también si no hay cabecera y el texto lo supera. Un archivo normal se sigue leyendo. Verificar que fallan.
- [x] 1.4 Verde: `ErrorArchivoGrande` y el límite en `drive.leer`. Verificar con `npm test` en verde.

## 2. Límites en el dispositivo y en la sincronización (navegador)

- [x] 2.1 Rojo:
  - En `tests/navegador/storage.test.js`: "Alta con el máximo alcanzado" (con 2000 registros, bajas incluidas, `crearProducto` lanza `ErrorLimiteProductos` y el número no cambia) y "Edición con el máximo alcanzado".
  - En `tests/navegador/formulario.test.js` (CRLF): "Mensaje en el formulario", con un almacén doble que lanza `ErrorLimiteProductos`; además, el `<textarea name="notas">` tiene `maxlength="1000"`.
  - En `tests/navegador/sincronizador.test.js`: con `drive.leer` que lanza `ErrorArchivoGrande`, la sincronización termina con `MENSAJES.archivo`, sin cambiar los productos ni llamar a `escribir`. Además, `leerArchivo` recibe `ahora()`, y un archivo con un producto de fecha futura (`corregidos > 0`) se sube aunque la fusión no cambie nada ("Baja con fecha en el futuro").
  - Verificar que fallan con `npm run test:navegador`.
- [x] 2.2 Verde (design §4):
  - `ErrorLimiteProductos` y el recuento en la transacción de `storage.crearProducto`.
  - En `formulario.js`, el mensaje de la spec y el `maxlength`.
  - En `sincronizador.js`, el tratamiento de `ErrorArchivoGrande`, el paso de `ahora()` y la subida si hay `corregidos`.
  - Verificar con `npm test` y `npm run test:navegador` en verde.

## 3. Router con codificación no válida (Node)

- [x] 3.1 Rojo: crear `tests/router.test.js` con "Porcentaje mal formado": `encontrar('/producto/%E0%A4%A')` y `encontrar('/producto/100%')` devuelven `null` sin lanzar. Además, `/producto/caf%C3%A9` sigue dando `params.id === 'café'`. Verificar que falla con `npm test`.
- [x] 3.2 Verde: `try/catch` en `encontrar` y exportarlo (design §5). `router.js` es CRLF: editar con la herramienta de edición. Verificar con `npm test` en verde y, a mano, con `captura-app.mjs --ruta "producto/%E0%A4%A"`: debe mostrar Listado sin errores.

## 4. Token ligado a la sesión y cierre en todas las ventanas (navegador)

- [x] 4.1 Rojo: crear `tests/navegador/auth.test.js` y enlazarlo en `tests/navegador/index.html`. Usa `usarEntornoAuth` con `Storage` dobles, `google` y `perfil` dobles, y lo restaura en `finally`.
  - "Token de otra cuenta", "Token sin cuenta asociada" y "Token de la propia sesión".
  - "Otra ventana abierta al cerrar sesión": simular la ventana 2 con un `StorageEvent('storage', { key: 'caducidades.sesion', newValue: null })`. Su token se borra, se revoca y se llama a `alCambiarSesion(null)`.
  - "Otra cuenta inicia sesión en otra ventana": evento con la sesión de B. El token de A se olvida y `tokenVigente()` devuelve `null`.
  - Un evento de otra clave no hace nada.
  - "Token caducado al cerrar sesión": `cerrarSesion` revoca también un token caducado si hay conexión, y no lo intenta sin conexión.
  - Verificar que fallan con `npm run test:navegador`.
- [x] 4.2 Verde (design §1). `auth.js` es CRLF: editar con la herramienta de edición.
  - `email` en `guardarToken` y la comprobación en `tokenVigente`.
  - `vigilarOtrasVentanas` y la revocación de cualquier token en `cerrarSesion`.
  - `usarEntornoAuth`, que la app no usa.
  - Verificar con `npm run test:navegador` en verde.
- [x] 4.3 Conectar `vigilarOtrasVentanas` en `ui.js`: sin sesión, detiene la sincronización y hace `reemplazar('/login')`. Verificar con `npm test` y `npm run test:navegador` en verde. La comprobación con dos ventanas reales es la tarea 9.3.

## 5. Renovación con la misma cuenta (navegador)

- [x] 5.1 Rojo:
  - En `tests/navegador/auth.test.js`: "Se elige otra cuenta al renovar" (revoca, no guarda y devuelve `motivo: 'otra-cuenta'`, sin tocar la sesión), "No se puede comprobar la cuenta" (`perfil` falla: revoca, no guarda y devuelve `motivo: 'error'`) y "Renovación con la cuenta de la sesión" (guarda el token con el email).
  - En `tests/navegador/sincronizador.test.js`: con `renovarToken` → `{ ok: false, motivo: 'otra-cuenta' }`, la fase pasa a `error` con el mensaje de cuenta distinta y el email de la sesión, sin sincronizar.
  - Verificar que fallan.
- [x] 5.2 Verde (design §2): comprobación con `pedirPerfil` en `renovarToken` y `MENSAJES.otraCuenta` en `sincronizador.js`. Verificar con `npm run test:navegador` en verde.

## 6. Content-Security-Policy

- [x] 6.1 Rojo: crear `tests/csp.test.js` con "Política declarada". Lee `src/index.html` y comprueba:
  - Cada directiva de design §3.
  - Que no aparecen `'unsafe-inline'`, `'unsafe-eval'` ni `*`.
  - Que el `<meta>` va antes del primer `<script>`.

  Verificar que falla con `npm test`.
- [x] 6.2 Verde: añadir el `<meta http-equiv="Content-Security-Policy">` a `src/index.html` (CRLF: herramienta de edición). Verificar con `npm test` en verde.
- [x] 6.3 Adaptar `captura-app.mjs` a la CSP (design §7): el script de sesión simulada se sirve como `/__captura.js` y registra `securitypolicyviolation` en `__errores` (y el estilo en línea de Google Sign-In, esperado, en `conocidos`, design §3). Verificar con un recorrido por Listado, Detalle, Formulario, Elegir foto (con una foto real de prueba) y Ajustes que `errores` queda vacío y que las capturas se ven bien.

## 7. Scripts de desarrollo

- [x] 7.1 Rojo: crear `tests/scripts.test.js`.
  - Para `resolverArchivo` de `scripts/lib/servir.mjs`: niega `/.git/config`, `/src/.env`, `/../x`, `/%2e%2e/x` y un primer segmento fuera de `permitidas`; devuelve `null` con `%E0%A4%A`; acepta `/tests/navegador/` (→ `index.html`) y `/src/js/app.js`.
  - Para `separarMensajes` de `scripts/lib/cdp.mjs`: un mensaje en dos trozos, dos mensajes en un trozo y un resto sin `\0`.
  - Verificar que fallan con `npm test`.
- [x] 7.2 Verde: implementar `scripts/lib/servir.mjs` y `scripts/lib/cdp.mjs`. Usarlos en `probar-navegador.mjs` (solo `src` y `tests`, 404 también con URL mal formada y manejador en `try/catch`) y en `captura-app.mjs` (`--remote-debugging-pipe`, sin puerto, y `terminar()` garantizado con `try/finally` y `SIGINT`). Los dos servidores en `127.0.0.1`, con un comentario. Verificar:
  - `npm test`.
  - `npm run test:navegador` en verde.
  - Peticiones a `/.git/config` y a `/%E0%A4%A` contra el servidor de pruebas: 404, sin que el proceso termine.
  - Que durante una captura no hay ningún puerto de depuración escuchando (`netstat -ano` en Windows).

## 8. Repositorio y CI

- [x] 8.1 Rojo: crear `tests/ci.test.js`. Cada `uses:` de `.github/workflows/*.yml` va fijado a un SHA de 40 hexadecimales con un comentario de versión, y el checkout lleva `persist-credentials: false`. Verificar que falla con `npm test`.
- [x] 8.2 Verde: obtener el SHA de cada action en la versión que ya se usa (`git ls-remote` o `gh api`, resolviendo los *tags* anotados con `^{}`, design §6), editar `pages.yml` y quitar el comentario que remitía a este cambio. Verificar con `npm test` en verde.
- [x] 8.3 `.gitignore`: añadir `.env*`, `*.pem` y `*.key`, y corregir el comentario de `docs/security/`. Verificar con `git check-ignore -v .env prueba.pem prueba.key` que los tres quedan ignorados.
- [ ] 8.4 Manual (usuario), tras el *push*: el workflow queda en verde con los SHAs y la app publicada funciona.
- [ ] 8.5 Manual (usuario): configuración del repositorio en GitHub según la sección 1 de las notas locales (`docs/security/revision-manual.md`, fuera de git). Verificar que un despliegue posterior sigue en verde y anotar el resultado en esas notas.
- [ ] 8.6 Manual (usuario): pasar gitleaks sobre un clon completo con los comandos de la sección 4 de las notas locales. Verificar que no hay hallazgos o que se han revisado (y rotado el secreto si era real). Anotar el resultado en las notas locales.

## 9. Documentación, revisión manual y verificación final

- [x] 9.1 Añadir la sección "Seguridad" al `README.md` con el contenido genérico de design §9: la CSP y cómo ampliarla, cómo retirar el acceso de la app y las recomendaciones para quien despliegue su copia, redactadas como consejos y sin decir si están hechas. Verificar que los enlaces funcionan y que la sección no revela el estado de las cuentas ni puntos débiles abiertos (design §11).
- [ ] 9.2 Manual, con el usuario: repasar las secciones 1 y 2 de las notas locales (`docs/security/revision-manual.md`) y anotar allí cada comprobación y la decisión sobre el origen de publicación, con la fecha. No anotar nada de esto en archivos versionados.
- [ ] 9.3 Manual (usuario), con la app publicada:
  - En el escritorio, dos ventanas con sesión. Sincronizar en la segunda y cerrar sesión en la primera: la segunda pasa a Login. Al iniciar sesión otra vez, la segunda no sincroniza hasta un toque nuevo.
  - En el móvil: login, sincronizar una lista con fotos (subida y descarga), abrir sin conexión y cerrar sesión, todo sin más infracciones de la CSP que el estilo en línea de Google Sign-In (design §3). Mirarlo en la consola de Chrome con depuración remota, o en DevTools del escritorio para lo que no depende del móvil.
- [x] 9.4 Manual (usuario), antes de desplegar: comprobar en la app real que ningún producto supera los límites nuevos (notas de más de 1000 caracteres o unidad de más de 20), por ejemplo desde la consola de DevTools del escritorio con la sesión real.
- [x] 9.5 Verificación final: `npm test` y `npm run test:navegador` en verde, y el recorrido de `captura-app.mjs` sin errores ni infracciones de la CSP.
- [ ] 9.6 Manual (usuario), tras desplegar los arreglos: volver a ejecutar la auditoría con la skill <https://github.com/cloudflare/security-audit-skill> sobre el commit desplegado, según la sección 5 de las notas locales. Dejar el informe nuevo en `docs/security/` (fuera de git) y revisarlo juntos. Los arreglos triviales van aquí; el resto, en un cambio nuevo.
- [ ] 9.7 Antes de cada *commit* de este cambio, repasar el diff (`git diff --cached`) buscando pistas para un atacante, según design §11: estado de las cuentas, puntos débiles abiertos o aceptados, contenido de `docs/security/`. Verificar también con `git status` que no entra nada de `docs/security/` y que la carpeta del cambio va en el mismo *push* que los arreglos.

## Seguimiento del flujo

- Recordatorio: las comprobaciones pendientes con la pareja (sincronizacion-drive 12.2/12.3, lista-compartida-segura 4.2, fotos-reales 12.5) y la instalación en iOS (pulido-final 9.4) siguen abiertas y no forman parte de este cambio.
- No subir esta carpeta del cambio antes que los arreglos: va en el mismo *push* (design §11).
- Archivar con `/opsx:archive` cuando las tareas estén hechas (las manuales que dependan de terceros pueden quedar sin marcar con una nota, como en cambios anteriores) y actualizar la tabla de `CLAUDE.local.md`.
