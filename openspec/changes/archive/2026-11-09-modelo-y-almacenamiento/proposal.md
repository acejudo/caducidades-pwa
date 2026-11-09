# Proposal

## Why

La app ya tiene shell, navegación y login, pero todavía no guarda ningún dato: `src/js/storage.js` está vacío y no hay un modelo de producto definido. Las pantallas de productos (Listado, Nuevo/Editar, Detalle) y la sincronización con Drive dependen de una forma única y validada de crear, leer, modificar y borrar productos que funcione sin conexión (`docs/SPEC.md` §2, §4.1 y §7). Por eso esta capa va antes que la UI de productos y que Drive.

## What Changes

- **Modelo de Producto** según `docs/SPEC.md` §4.1: campos, valores por defecto, normalización y validación con mensajes en español por campo. El campo `foto` queda preparado (`{ tipo: 'ninguna', valor: null }` por defecto) pero sin funcionalidad de fotos.
- **Generación de IDs únicos** con `crypto.randomUUID()`.
- **Campo `actualizado`** (ISO 8601) que se pone en cada escritura (alta, edición y baja), base del *last-write-wins* de `docs/SPEC.md` §7.
- **Almacenamiento local en IndexedDB** (`src/js/storage.js`), disponible sin conexión, con una API CRUD asíncrona: crear, listar todos, obtener por id, actualizar y eliminar.
- **Bajas con marca de borrado**: eliminar no borra el registro, sino que lo marca con `eliminado: true` y un `actualizado` nuevo, y deja de aparecer en las lecturas. Así la futura sincronización puede propagar las bajas en lugar de resucitar productos borrados. Esto añade el campo `eliminado` al modelo de `docs/SPEC.md` §4.1.
- **Ordenación** por `fechaCaducidad` ascendente (más próximos primero), con desempate estable por nombre.
- **Funciones auxiliares de caducidad**: días restantes en días naturales de la zona horaria local, nivel de urgencia `rojo` / `naranja` / `verde` según `URGENCIA` de `config.js` (coincide con las clases CSS `urgencia--*` existentes) y texto "¡Caducado!" / "Caduca hoy" / "Caduca mañana" / "Caduca en N días".
- **Pruebas automáticas versionadas en `tests/`, escritas antes del código (TDD)**: cada escenario de las specs se convierte en una prueba que primero falla y después pasa. Quedan como batería de regresión para los cambios siguientes. Es el primer cambio con pruebas en el repo y fija la convención del proyecto.

**Fuera de alcance:** interfaz de las pantallas (siguen siendo marcadores), sincronización con Google Drive, fotos (galería, cámara y almacenamiento de imágenes) y purga de las marcas de borrado. Al cerrar sesión los productos **no** se borran del dispositivo: son una lista compartida por todas las personas autorizadas, no de cada cuenta.

## Capabilities

### New Capabilities
- `product-model`: forma de un producto y reglas de dominio que no dependen de dónde se guarde: campos y valores por defecto, validación, identificador, días restantes, nivel de urgencia, texto de caducidad y ordenación.
- `product-storage`: persistencia local de los productos sin conexión: operaciones CRUD, marca `actualizado` en cada escritura, bajas con marca de borrado y comportamiento ante errores del almacenamiento.

### Modified Capabilities
_(ninguna: `pwa-shell` ya exige que todo el JS propio esté en caché, y el nuevo módulo solo se añade a esa lista)_

## Impact

- **Código**:
  - `src/js/productos.js` (nuevo): modelo, validación y funciones puras de caducidad y ordenación.
  - `src/js/constantes.js` (nuevo): `URGENCIA` y `CATEGORIAS`, sin datos sensibles. `src/js/config.js` los reexporta, así que sus importadores no cambian.
  - `src/js/storage.js`: implementación del almacenamiento en IndexedDB.
  - `src/sw.js`: añadir `./js/productos.js` y `./js/constantes.js` a `SHELL_FILES`.
- **Pruebas** (fuera de `src/`, no se publican):
  - `tests/productos.test.js`: pruebas de `node --test`.
  - `tests/navegador/`: página de pruebas de `storage.js` con un mini-runner propio.
  - `scripts/probar-navegador.mjs`: ejecuta esa página en Chrome *headless*.
  - `package.json` (nuevo, privado y **sin dependencias**): solo los scripts `test` y `test:navegador`.
- **Documentación**: `docs/SPEC.md` §4.1 añade el campo `eliminado` y concreta los valores por defecto. El README actualiza la descripción de `storage.js`, añade `productos.js` y `constantes.js`, y gana una sección "Pruebas".
- **Navegador**: requiere IndexedDB y `crypto.randomUUID()` (Chrome Android y Safari iOS 15.4 o superior), ambos disponibles en contexto seguro (HTTPS o `localhost`).
- **Herramientas**: Node 22 o superior para `node --test`, y Chrome o Edge instalado para las pruebas de navegador automáticas.
- **Sin dependencias nuevas** ni cambios de UI visibles para el usuario.
