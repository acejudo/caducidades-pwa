# Proposal

## Why

Al buscar la lista en Drive, la app usa el `caducidades.json` más antiguo que ve, **sin mirar quién es su dueño** ni preguntar. Después lo descarga (importa sus productos) y le sube la lista entera del dispositivo, notas incluidas. Con el permiso `drive`, un archivo con ese nombre que una cuenta ajena comparta con la del usuario podría acabar siendo "la lista". Es el hallazgo C1 de la auditoría de seguridad local (`docs/security/`, fuera de git). El usuario ha pedido arreglarlo ahora, antes de `fotos-reales`, porque la lista compartida ya está en uso.

## What Changes

- Al buscar listas, la app pide también el dueño de cada archivo.
- **Solo vale una lista cuyo dueño sea una cuenta autorizada** (la de la lista blanca, comparando el *hash* de su email). Las demás (de cuentas no autorizadas o sin dueño legible, como las de unidades compartidas) se ignoran: nunca se leen ni se escriben.
- Entre las válidas, se sigue usando la creada primero.
- Si la lista elegida **no es de la propia cuenta**, la app pregunta antes de usarla, mostrando el email de su dueño: "¿Usar la lista compartida por ana@…?". Si se rechaza, no se usa y los cambios siguen pendientes, como cuando no hay ninguna lista. En automático pregunta como mucho una vez por sesión de la app; a petición, siempre.
- El archivo que el dispositivo ya recuerda se sigue usando. Si deja de estar disponible, se vuelve a buscar con estas reglas.
- **Fuera de este cambio:** el hallazgo confirmado de cerrar sesión con dos ventanas y el resto del endurecimiento del informe siguen en `pulido-final`.

## Capabilities

### New Capabilities
<!-- Ninguna. -->

### Modified Capabilities
- `drive-sync`: "Localizar la lista" solo admite listas de cuentas autorizadas. Requisito nuevo: confirmar antes de usar una lista de otra cuenta.

## Impact

- **Código:**
  - `src/js/drive.js`: `buscarListas` pide `owners(emailAddress)` y `ownedByMe`.
  - `src/js/auth.js`: exporta `esEmailAutorizado(email)`.
  - `src/js/sincronizador.js`: `localizar` filtra por dueño autorizado y confirma las listas ajenas. Recibe `esEmailAutorizado` dentro de `auth`, inyectado como hasta ahora.
  - `src/js/ui.js`: pasa la función nueva al sincronizador.
- **Pruebas:** amplían `tests/drive.test.js` (Node) y `tests/navegador/sincronizador.test.js`, incluido el escenario del informe como regresión.
- **Sin dependencias nuevas.** Sin cambios de datos ni de Google Cloud.
