# Design

## Context

- `drive.js` → `buscarListas()` pide `files(id,createdTime,version)` con `q=name = 'caducidades.json' and trashed = false and mimeType != carpeta` y `orderBy=createdTime`.
- `sincronizador.js` → `localizar(drive, aPeticion)` toma el primer resultado, guarda su `archivoId` y lo usa sin preguntar. Solo pregunta cuando no hay ninguno ("¿Crear una lista nueva?"), y en automático como mucho una vez por sesión (`preguntadoCrear`).
- `auth.js` tiene `hashEmail(email)` (exportada) y `emailAutorizado(email)` (privada), que compara el *hash* con `EMAILS_AUTORIZADOS_SHA256` de `config.local.js`. El sincronizador no puede importar `auth.js` (arrastra `config.local.js`): recibe `auth` inyectado desde `ui.js`.
- Informe de la auditoría: `docs/security/NEEDS-VALIDATION.md` §C1 (local, fuera de git).

## Goals / Non-Goals

**Goals:**
- Que ningún archivo cuyo dueño no esté en la lista blanca pueda convertirse en la lista, aunque sea más antiguo o se renombre.
- Que usar la lista de otra persona (autorizada) sea una decisión explícita la primera vez.
- No romper a quien ya sincroniza: el archivo recordado se sigue usando.

**Non-Goals:**
- Volver a validar el dueño del archivo recordado en cada sincronización. Se eligió (o confirmó) antes; si el dueño cambiara, la amenaza exigiría que una cuenta autorizada transfiera la propiedad a otra no autorizada.
- Comprobar `sharingUser` o los permisos del archivo: basta con el dueño.
- El resto de hallazgos del informe (siguen en `pulido-final`).

## Decisions

### 1. Dueño en `buscarListas`
`fields=files(id,createdTime,version,ownedByMe,owners(emailAddress))`. Cada resultado se devuelve tal cual (`owners` puede faltar en unidades compartidas). El orden sigue siendo `createdTime`.

### 2. Autorización del dueño, inyectada
`auth.js` exporta `esEmailAutorizado(email)` (la actual `emailAutorizado`, normalizando con `trim().toLowerCase()` como en el login). `ui.js` la añade al objeto `auth` que recibe `crearSincronizador`.

Un archivo es **válido** si `ownedByMe === true`, o si tiene exactamente un dueño con email y `await auth.esEmailAutorizado(email)` es `true`. Sin dueño legible, no es válido. Alternativa descartada: aceptar `ownedByMe` y cualquier dueño "conocido": la app no conoce más emails que los *hashes*.

### 3. Elección y confirmación en `localizar`
1. `buscarListas()` y filtrar los válidos, conservando el orden. Se elige el primero.
2. Si no hay ninguno válido: el flujo actual de "¿Crear una lista nueva?".
3. Si el elegido es propio (`ownedByMe`): se recuerda y se usa.
4. Si es de otra cuenta: `confirmar({ titulo: '¿Usar la lista compartida?', mensaje: '¿Usar la lista compartida por <email>? Tus productos se juntarán con los suyos.', aceptar: 'Usar esta lista', cancelar: 'Ahora no' })`. Como con la creación, en automático se pregunta como mucho una vez por sesión de la app (`preguntadoLista`), y a petición siempre. Si se rechaza: `SinLista` (mismo efecto que hoy: nada se toca y los productos locales quedan pendientes). Si se acepta: se recuerda y se usa.

Todo esto ocurre antes de cualquier `leer`/`escribir`: un archivo no válido o no confirmado no recibe ninguna petición más allá del listado.

### 4. Estrategia de pruebas (TDD)
- **Node (`tests/drive.test.js`):** `buscarListas` pide `ownedByMe` y `owners(emailAddress)` en `fields` y devuelve esos datos.
- **Navegador (`tests/navegador/sincronizador.test.js`):** el Drive falso guarda `ownedByMe` y `owners` por archivo, y el `auth` falso tiene `esEmailAutorizado` con una lista de emails. Escenarios de la spec: "Lista de una cuenta no autorizada" (la regresión del informe: archivo ajeno más antiguo; se comprueba que no hay `leer` ni `escribir` sobre él), "Solo hay una lista ajena no autorizada", "Lista sin dueño legible", "Aceptar la lista compartida", "Rechazar la lista compartida", "Lista propia sin pregunta", "Varias listas", y que en automático solo pregunta una vez. Se adaptan las pruebas existentes de `drive-sync` al Drive falso con dueño.
- **Manual (opcional, del informe):** con dos cuentas de prueba, comprobar si `files.list` devuelve un archivo compartido por un desconocido sin abrirlo. No cambia el arreglo; solo dice si el riesgo era real.
- `auth.js` sigue sin pruebas automáticas (depende de `config.local.js`): `esEmailAutorizado` reutiliza la función ya usada en el login.

## Risks / Trade-offs

- [Una lista compartida legítima de una cuenta autorizada cuyo email no coincide con el de la lista blanca (por ejemplo, otro alias de Gmail)] → se ignoraría. El email de `owners` es el principal de la cuenta, el mismo con el que se entra; el README ya pide autorizar ese email.
- [La pareja tendrá una pregunta más la primera vez] → Es la confirmación que pide la spec; solo ocurre una vez por dispositivo.
- [El archivo recordado no se revalida] → aceptado (ver Non-Goals).

## Migration Plan

Sin migración. Tu dispositivo ya recuerda tu propia lista y no verá ninguna pregunta. Tu pareja, al sincronizar por primera vez, verá "¿Usar la lista compartida por …?".
