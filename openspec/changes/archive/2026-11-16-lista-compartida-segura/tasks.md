# Tasks

Desarrollo con TDD (design.md §4). En cada bloque, primero van las pruebas en **rojo** y después el código mínimo hasta **verde**, refactorizando con las pruebas en verde. Antes de dar un grupo por terminado: `npm test` y `npm run test:navegador` en verde.

## 1. Dueño de cada lista en `drive.js`

- [x] 1.1 Rojo: en `tests/drive.test.js`, ampliar la prueba de `buscarListas` para exigir `ownedByMe` y `owners(emailAddress)` en `fields` y que devuelve esos datos. Verificar que falla.
- [x] 1.2 Verde: pedir esos campos en `buscarListas` (design.md §1). Verificar que `npm test` pasa.

## 2. Elegir solo listas autorizadas y confirmar las ajenas

- [x] 2.1 Rojo: en `tests/navegador/sincronizador.test.js`, dar a cada archivo del Drive falso `ownedByMe` y `owners`, y al `auth` falso `esEmailAutorizado`. Adaptar las pruebas existentes y añadir "Lista de una cuenta no autorizada" (sin `leer` ni `escribir` sobre el archivo ajeno), "Solo hay una lista ajena no autorizada", "Lista sin dueño legible", "Aceptar la lista compartida" (el mensaje incluye el email del dueño), "Rechazar la lista compartida" (no se crea ni se toca nada; pendiente), "Lista propia sin pregunta" y "en automático solo pregunta una vez por sesión". Verificar que fallan.
- [x] 2.2 Verde: filtrar y confirmar en `localizar` (design.md §2 y §3). Verificar que pasan y refactorizar con las pruebas en verde.

## 3. Conexión con la lista blanca real

- [x] 3.1 Exportar `esEmailAutorizado` en `auth.js` y pasarla al sincronizador en `ui.js`. Verificar las baterías en verde y, con `scripts/captura-app.mjs`, que `esEmailAutorizado` acepta el email de la sesión simulada y rechaza otro, sin errores en la consola.

## 4. Verificación

- [x] 4.1 Ejecutar `npm test` y `npm run test:navegador`. Verificar que están en verde.
- [ ] 4.2 Manual tras desplegar (dar al usuario los comandos): tu móvil sigue sincronizando sin ninguna pregunta nueva. Cuando la pareja instale la app, su primera sincronización pregunta "¿Usar la lista compartida por …?" con tu email, y al aceptar ve tus productos (se comprueba junto con las tareas pendientes 12.2 de `sincronizacion-drive`).
- [ ] 4.3 Opcional (del informe): con dos cuentas de prueba, comprobar en el API Explorer si `files.list` devuelve un archivo compartido por un desconocido sin abrirlo, y anotar el resultado en `docs/security/` (local).

## Workflow follow-up

- Archivar con `/opsx:archive` tras la revisión del usuario.
- Añadir la fila del cambio a la tabla de `CLAUDE.local.md` y marcar C1 como resuelto en la nota de seguridad de `pulido-final`.
