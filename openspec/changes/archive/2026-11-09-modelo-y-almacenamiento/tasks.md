# Tasks

Desarrollo con TDD (design.md §11): en cada bloque, primero las pruebas en **rojo**, después el código mínimo hasta **verde** y por último la **refactorización** con las pruebas en verde. Cada prueba se llama como el escenario de la spec que cubre.

## 1. Infraestructura de pruebas

- [x] 1.1 Crear `package.json` en la raíz (`"private": true`, `"type": "module"`, sin dependencias, scripts `test` = `node --test "tests/*.test.js"` y `test:navegador` = `node scripts/probar-navegador.mjs`) y `tests/productos.test.js` con `process.env.TZ = 'Europe/Madrid'` en la primera línea y una prueba trivial; verificar que `npm test` termina en verde y que `git status` no muestra `node_modules` ni ningún *lockfile*
- [x] 1.2 Crear el mini-runner `tests/navegador/runner.js` (`prueba`, `antesDeCada`, aserciones `igual`, `igualProfundo`, `verdadero` y `rechaza`, resumen en `<output id="resultado" data-estado>`) y `tests/navegador/index.html`, que lo carga con `storage.test.js` (por ahora con una prueba trivial); verificar abriéndola en `http://localhost:8080/tests/navegador/` (servidor en la raíz) que muestra "1 prueba, 0 fallos", y que una prueba que falla a propósito muestra el fallo con su mensaje
- [x] 1.3 Crear `scripts/probar-navegador.mjs` (design.md §11: servidor `node:http` de la raíz en un puerto libre, Chrome o Edge *headless* con perfil temporal, resultado enviado por la página con `POST /__resultado`, código de salida 0 o 1, variable `CHROME` y mensaje claro si no encuentra el navegador o si no aparece el resultado); verificar que `npm run test:navegador` sale con 0 con la prueba trivial y con 1 con la prueba que falla a propósito (y quitarla después)
- [x] 1.4 Añadir al README la sección "Pruebas" (`npm test`, `npm run test:navegador`, cómo abrir la página a mano, requisitos de Node 22+ y Chrome/Edge, y que las pruebas usan la base de datos `caducidades-pruebas`); verificar que los comandos funcionan tal como están escritos

## 2. Constantes sin datos sensibles

- [x] 2.1 Rojo: en `tests/productos.test.js`, prueba que importa `../src/js/constantes.js` y comprueba `URGENCIA` y `CATEGORIAS`; verificar que `npm test` falla porque el módulo no existe
- [x] 2.2 Verde: crear `src/js/constantes.js` con `URGENCIA` y `CATEGORIAS` (movidos desde `config.js`), cambiar `config.js` para que los reexporte y añadir `./js/constantes.js` a `SHELL_FILES` en `src/sw.js`; verificar que `npm test` pasa, que `grep -rn "URGENCIA\|CATEGORIAS" src/js` solo los define en `constantes.js` y que la app sigue arrancando en local (login y navegación) sin errores en la consola

## 3. Modelo: normalización y validación (`src/js/productos.js`)

- [x] 3.1 Rojo: pruebas de los escenarios "Alta mínima", "Espacios sobrantes", "Faltan los obligatorios", "Fecha inexistente", "Cantidad no válida", "Categoría desconocida" y "Cantidad decimal" de `product-model`, más casos límite de design.md §2 (cantidad `"0,5"`, nombre de 101 caracteres, campos desconocidos descartados, `foto.tipo` no válido); verificar que `npm test` falla en todas
- [x] 3.2 Verde: crear `src/js/productos.js` (importa solo de `./constantes.js`) con `ErrorValidacion`, `normalizarProducto` y `validarProducto` según design.md §2 y §7; verificar que `npm test` pasa
- [x] 3.3 Refactor con las pruebas en verde (nombres, mensajes duplicados, funciones auxiliares de fechas) y añadir `./js/productos.js` a `SHELL_FILES` en `src/sw.js`; verificar que `npm test` sigue en verde y en DevTools (*Application → Cache Storage*) que `productos.js` y `constantes.js` están en la caché tras recargar

## 4. Modelo: identificador y marca de tiempo

- [x] 4.1 Rojo: pruebas de "Producto completo", "Altas consecutivas", "Id inmutable", del `actualizado` de entrada ignorado (en `nuevoProducto` y en `aplicarCambios`), de que `eliminado` de entrada se ignora y de que, con el mismo `ahora`, el segundo `actualizado` es 1 ms posterior (design.md §8); verificar que fallan
- [x] 4.2 Verde: implementar `nuevoProducto(datos, ahora)` y `aplicarCambios(producto, cambios, ahora)`; verificar que `npm test` pasa y refactorizar con las pruebas en verde

## 5. Modelo: caducidad, urgencia y orden

- [x] 5.1 Rojo: pruebas de "Caduca hoy" (a las 00:05 y a las 23:55), "Caducado ayer", "Cambio de hora", "Límites de los niveles", "Textos" y "Orden del listado", más que `ordenarPorCaducidad` no modifica la lista original y que con fecha y nombre iguales desempata por `id`; verificar que fallan
- [x] 5.2 Verde: implementar `diasRestantes`, `nivelUrgencia` (límites de `URGENCIA`), `textoCaducidad`, `compararPorCaducidad` y `ordenarPorCaducidad` según design.md §7 y §9; verificar que `npm test` pasa y refactorizar con las pruebas en verde

## 6. Almacenamiento: apertura y errores (`src/js/storage.js`)

- [x] 6.1 Rojo: en `tests/navegador/storage.test.js`, `antesDeCada` con `usarBaseDeDatos('caducidades-pruebas')` y borrado de esa base de datos; pruebas de "Sin productos", de que tras la primera operación existe el almacén `productos` y de "Navegador sin almacenamiento" (con `indexedDB.open` sustituido por una función que falla se obtiene `ErrorAlmacenamiento`; con `indexedDB` restaurado, la siguiente llamada funciona); verificar que `npm run test:navegador` falla
- [x] 6.2 Verde: implementar la apertura de IndexedDB según design.md §3 (versión 1, `switch` por versión, conexión única con reintento, `onversionchange`, `navigator.storage?.persist()`), el envoltorio de promesas, `ErrorAlmacenamiento`, `usarBaseDeDatos` y un `listarProductos` mínimo; verificar que `npm run test:navegador` pasa

## 7. Almacenamiento: CRUD

- [x] 7.1 Rojo: pruebas de "Alta válida", "Alta no válida" (el número de productos no cambia), "Producto existente", "Id desconocido o eliminado" y "Lista ordenada" de `product-storage`; verificar que fallan
- [x] 7.2 Verde: implementar `crearProducto`, `obtenerProducto` y `listarProductos` completo (filtra los eliminados y ordena); verificar que `npm run test:navegador` pasa
- [x] 7.3 Rojo: pruebas de "Edición parcial", "Edición no válida", "Producto inexistente", "Eliminar" (comprobando el registro interno directamente en IndexedDB con `eliminado: true`), "Eliminar dos veces" y "Valor de entrada ignorado" (alta y edición); verificar que fallan
- [x] 7.4 Verde: implementar `actualizarProducto` (misma transacción `readwrite`, `ErrorNoEncontrado`) y `eliminarProducto` (marca de borrado e idempotente); verificar que `npm run test:navegador` pasa y refactorizar `storage.js` con las pruebas en verde

## 8. Persistencia y datos compartidos

- [x] 8.1 Rojo → verde: pruebas de "Reapertura" (crear, cerrar la conexión con `usarBaseDeDatos` y volver a leer) y "Cerrar sesión y volver a entrar" (con una sesión simulada en `localStorage`, `cerrarSesion()` de `auth.js` no toca la base de datos; si importar `auth.js` en la página de pruebas exige `config.local.js`, comprobar en su lugar que `auth.js` no importa `storage.js` ni borra IndexedDB). Corregir el código solo si alguna falla; verificar que `npm run test:navegador` pasa
- [x] 8.2 Comprobar a mano en Chrome con DevTools en *Offline* que crear, editar y eliminar desde la consola (`await import('./js/storage.js')`) funciona ("Sin conexión") y que los productos siguen tras recargar

## 9. Documentación del modelo

- [x] 9.1 Actualizar `docs/SPEC.md` §4.1 (campo `eliminado` y valores por defecto: `cantidad` 1, `unidad` "ud", `categoria` "Nevera", `foto` de tipo "ninguna" y opcionales a `null`) y el README (estructura con `constantes.js`, `productos.js` y `storage.js` como almacenamiento local en IndexedDB, `tests/` y `package.json`, y nota de que los datos se conservan mejor con la app instalada); verificar que el modelo descrito coincide con lo que comprueba la prueba "Producto completo"

## 10. Verificación final

- [x] 10.1 Ejecutar `npm test` y `npm run test:navegador` (todo en verde, y cada escenario de `product-model` y `product-storage` tiene una prueba con su nombre), `openspec validate modelo-y-almacenamiento --strict` en verde, y comprobar que la app sigue arrancando con login y navegación como antes, sin errores en la consola
- [ ] 10.2 (Requiere al usuario) En el móvil con la app instalada y tras desplegar: crear un producto desde la consola remota (o con una pantalla de prueba temporal), cerrar la app, abrirla en modo avión y comprobar que el producto sigue ahí
  - Pendiente a propósito al archivar (2026-11-09): sin pantallas solo se puede hacer con consola remota. Se verificará en el cambio de pantallas de productos (crear desde el móvil, cerrar la app y abrirla en modo avión). La persistencia y el modo sin conexión ya están cubiertos por las pruebas de navegador y por la tarea 8.2.

## Workflow follow-up

- Archivar el cambio (`/opsx:archive`) cuando esté implementado y verificado, para crear las specs principales `product-model` y `product-storage`.
