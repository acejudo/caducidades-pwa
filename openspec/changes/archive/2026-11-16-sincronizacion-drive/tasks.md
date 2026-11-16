# Tasks

Desarrollo con TDD (design.md §10). En cada bloque, primero van las pruebas en **rojo**, después el código mínimo hasta **verde** y por último la **refactorización** con las pruebas en verde. Cada prueba se llama como el escenario de la spec que cubre. Antes de dar un grupo por terminado: `npm test` y `npm run test:navegador` en verde. Cada archivo nuevo de `src/` se añade a `SHELL_FILES` en el grupo que lo crea.

## 1. Preparación en Google Cloud (manual, antes de desplegar)

- [x] 1.1 Pedir al usuario que añada el *scope* `https://www.googleapis.com/auth/drive` en Google Cloud (pantalla de consentimiento, Acceso a datos), que mantenga la app en estado Prueba con los emails como usuarios de prueba y que confirme que lo ha hecho.

## 2. Constantes de Drive

- [x] 2.1 Rojo: en `tests/productos.test.js` (o un `tests/constantes.test.js` nuevo), probar que `constantes.js` exporta `DRIVE_SCOPE` (`https://www.googleapis.com/auth/drive`), `DRIVE_CARPETA` (`Caducidades`), `DRIVE_ARCHIVO` (`caducidades.json`) y `DRIVE_CARPETA_FOTOS`. Verificar que `npm test` falla.
- [x] 2.2 Verde: mover las constantes a `constantes.js` y reexportarlas desde `config.js` (design.md §1). Verificar que `npm test` pasa y que `auth.js` sigue importándolas de `config.js`.

## 3. Fusión y archivo (`sincronizacion.js`, Node)

- [x] 3.1 Rojo: crear `tests/sincronizacion.test.js` con estas pruebas:
  - "Contenido del archivo" (`crearArchivo`).
  - `leerArchivo`: correcto, "Archivo dañado" (no es JSON), versión distinta de 1, sin `productos` y "Un producto no válido" (sin `fechaCaducidad`, sin `id` o con `actualizado` no válido).
  - `fusionar`: "Producto nuevo en otro dispositivo", "Gana la edición más reciente", "Baja en otro dispositivo", "Edición local posterior a una baja remota", "Cambios locales subidos" y los empates (gana la eliminada; si no, la remota).
  - `purgar`: "Baja antigua" (100 días) y "Baja reciente" (10 días).
  - `planificar`: `cambiaLocal`, `hayQueSubir` e `idsPurgados`.

  Verificar que fallan.
- [x] 3.2 Verde: crear `src/js/sincronizacion.js` (design.md §2) y añadirlo a `SHELL_FILES`. Verificar que `npm test` pasa y refactorizar con las pruebas en verde.
- [x] 3.3 Rojo: pruebas de `textoEstado` con la prioridad de design.md §5 ("Sin conexión", "Sincronizado", "Sin token tras reabrir", pendiente con y sin token, error y sincronizando). Verificar que fallan.
- [x] 3.4 Verde: implementar `textoEstado` en `sincronizacion.js`. Verificar que pasan.

## 4. Fecha de la última sincronización (`formato.js`)

- [x] 4.1 Rojo: en `tests/formato.test.js`, pruebas de `formatearMomento`: "hoy a las 18:30", "ayer a las 9:05", otra fecha ("10 nov 2026 a las 18:30") y medianoche, con la zona `Europe/Madrid`. Verificar que fallan.
- [x] 4.2 Verde: implementar `formatearMomento`. Verificar que `npm test` pasa.

## 5. Cliente de Drive (`drive.js`, Node con `fetch` falso)

- [x] 5.1 Rojo: crear `tests/drive.test.js`. Comprueba URL, método, cabecera `Authorization: Bearer <token>` y cuerpo de:
  - `buscarListas`: `q`, `orderBy=createdTime` y los campos.
  - `leer`: contenido y versión.
  - `version`.
  - `escribir`: `PATCH` a `/upload/` con `uploadType=media` y `Content-Type: application/json`.
  - `crearLista`: con la carpeta ya existente y sin ella; *multipart* con `parents`.

  Y los errores: 401 da `ErrorToken`, 404 y 403 de archivo dan `ErrorNoDisponible`, 500 da `ErrorDrive` con su estado, y un `fetch` rechazado da `ErrorRed`. Verificar que fallan.
- [x] 5.2 Verde: implementar `src/js/drive.js` (design.md §3). Verificar que `npm test` pasa y refactorizar con las pruebas en verde.

## 6. Almacenamiento para la sincronización (`storage.js`)

- [x] 6.1 Rojo: en `tests/navegador/storage.test.js`, añadir:
  - `listarTodos` incluye los eliminados.
  - "Producto recibido de Drive" (`guardarSincronizados` conserva `actualizado`).
  - `guardarSincronizados` no pisa un producto local más reciente y borra los `idsPurgados`.
  - "Alta avisa" (también la actualización y la baja).
  - "Escritura fallida".
  - "Guardado de la sincronización".
  - "Valor de entrada ignorado" sigue igual.

  Verificar que fallan.
- [x] 6.2 Verde: implementar `listarTodos`, `guardarSincronizados` y `cambiosLocales` (design.md §4). Verificar que pasan y refactorizar con las pruebas en verde.

## 7. Orquestador (`sincronizador.js`)

- [x] 7.1 Rojo: crear `tests/navegador/sincronizador.test.js` (cargado desde `index.html`). Dependencias:
  - Base de datos `caducidades-pruebas`.
  - Un Drive falso en memoria con la interfaz de `crearClienteDrive`: listas con `createdTime` y `version`, y fallos programables.
  - Un `auth` falso con token vigente o no y `renovarToken` configurable.
  - `red`, `preferencias` en memoria, un `confirmar` falso y un temporizador manual.

  Pruebas:
  - **Lista:** "Lista compartida por otra cuenta", "Varias listas", "Archivo recordado ya no disponible", "Primera sincronización sin lista", "Esperar a que la compartan" y que solo se pregunta una vez por sesión en automático.
  - **Fusión de punta a punta:** "Producto nuevo en otro dispositivo", "Gana la edición más reciente", "Baja en otro dispositivo" y "Cambios locales subidos".
  - **Archivo y escritura:** "Archivo dañado" (nada cambia y no se sube) y "Otro dispositivo sube a la vez" (la versión cambia y se fusiona de nuevo).
  - **Automática:** "Tras el login", "Tras un alta" (2 s con el temporizador), "Varios cambios seguidos" (una sola sincronización) y que nunca hay dos a la vez.
  - **Pendientes:** "Cambios en modo avión", "Reapertura al día siguiente" (no llama a `renovarToken`) y "Volver la conexión con token vigente".
  - **A petición:** "Toque sin token vigente" y "Renovación cancelada".
  - **Errores:** "Error de red a mitad" y "Token rechazado" (se olvida el token y el estado pasa a "Toca para sincronizar").
  - **Permiso:** "Permiso nuevo rechazado" (`renovarToken` devuelve `sin-drive`).

  Verificar que fallan.
- [x] 7.2 Verde: crear `src/js/sincronizador.js` (design.md §5) y añadirlo a `SHELL_FILES`. Verificar que pasan y refactorizar con las pruebas en verde.

## 8. Permiso de Drive y token (`auth.js`)

- [x] 8.1 Cambiar `auth.js` según design.md §6:
  - `guardarToken` guarda los *scopes*.
  - `tokenVigente` exige `DRIVE_SCOPE`.
  - `renovarToken` devuelve `{ ok, token | motivo }`.
  - Nuevo `olvidarToken`.

  `auth.js` depende de `config.local.js` y de Google, así que no tiene pruebas automáticas. Verificar que las baterías siguen en verde y, a mano en local, que el login normal funciona y que un token guardado sin el *scope* nuevo no cuenta como vigente.

## 9. Interfaz del estado (`estado-sincronizacion.js`)

- [x] 9.1 Rojo: crear `tests/navegador/estado-sincronizacion.test.js` (cargado desde `index.html`) con un sincronizador falso que publica estados. Pruebas:
  - **Botón:** "Pulsar el icono" (llama a `sincronizar({ aPeticion: true })`), "Nombre accesible" ("Sincronizar: Cambios pendientes"), "Sin conexión" (tachado y desactivado), desactivado mientras sincroniza y la clase de giro.
  - **Sección:** "Sincronizar desde Ajustes", "Nunca sincronizado" y "Error visible".
  - **Actualización:** "Cambio guardado" (se actualiza solo) y que se da de baja con el elemento fuera del documento.

  Verificar que fallan.
- [x] 9.2 Verde: crear `src/js/estado-sincronizacion.js` (design.md §7), los iconos `refresh-cw` y `refresh-cw-off` en `iconos.js` y los estilos (`.cabecera__accion`, `.sync--girando` con `prefers-reduced-motion`, `.sync__aviso` y la tarjeta de Ajustes). Añadirlo a `SHELL_FILES`. Verificar que pasan y refactorizar con las pruebas en verde.

## 10. Integración en la app

- [x] 10.1 Conectar el sincronizador por defecto con sus dependencias reales:
  - En `app.js`, `iniciar()` con sesión, tras el *guard*.
  - En `ui.js`: el botón en la cabecera del Listado (`mostrarSincronizacion`), la sección en Ajustes en lugar del marcador, `sincronizar()` tras un login correcto y la precarga de Google con el estado "Toca para sincronizar".
  - Al cerrar sesión, `detener()`.

  Verificar las baterías en verde y, con `scripts/captura-app.mjs` (sin Google real, Drive inaccesible), que el Listado muestra el icono con "Toca para sincronizar" y que Ajustes muestra la sección, sin errores en la consola salvo los esperados de red. Comparar con el mockup de Ajustes (`docs/design/grok_1792523938257.jpg`).

## 11. Documentación

- [x] 11.1 Actualizar el README (§Google: *scope* `drive` en lugar de `drive.file`; nueva sección "Compartir la lista con otra cuenta", con el caso de una segunda lista creada por error) y `docs/SPEC.md` §6.1. Verificar que los pasos del README coinciden con el comportamiento de "Crear la lista" y "Localizar la lista".

## 12. Verificación final

- [x] 12.1 Ejecutar `npm test` y `npm run test:navegador`. Verificar que están en verde.
- [ ] 12.2 Manual con Google real, tras desplegar (dar al usuario los comandos de commit y push):
  - Con la sesión anterior, "Toca para sincronizar" pide el permiso nuevo ("Sesión anterior al cambio de permiso").
  - Se crea `Caducidades/caducidades.json` en el Drive de la primera cuenta.
  - Compartir la carpeta con la segunda cuenta y, desde su dispositivo, ver los mismos productos.
  - Editar en un dispositivo y ver el cambio en el otro tras sincronizar.
  - Eliminar en uno y desaparece en el otro.
- [ ] 12.3 Manual en el móvil:
  - Añadir un producto en modo avión ("Cambios pendientes"), desactivar el modo avión y ver que se sincroniza solo si el token sigue vigente.
  - Cerrar la app, abrirla al día siguiente ("Toca para sincronizar") y sincronizar con un toque.

## Workflow follow-up

- Archivar con `/opsx:archive` tras la revisión del usuario.
- Actualizar la tabla de estado de `CLAUDE.local.md` (7 archivado, 8 siguiente) y la nota de la 8: con el *scope* `drive`, las fotos de la otra cuenta son accesibles.
