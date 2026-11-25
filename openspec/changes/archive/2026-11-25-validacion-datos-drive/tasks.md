# Tareas

## 1. Ayudantes de las pruebas con UUID (sin cambio de comportamiento)

- [x] 1.1 Refactor de pruebas (design §7): en `tests/sincronizacion.test.js` y `tests/navegador/sincronizador.test.js`, `producto(id)` convierte el id corto en un UUID determinista con un ayudante `uuid(id)`. Las comprobaciones por id usan el mismo ayudante. Verificar que `npm test` y `npm run test:navegador` **siguen en verde** antes de seguir.

## 2. Cantidad máxima en el modelo (Node)

- [x] 2.1 Rojo: en `tests/productos.test.js`, con los nombres de los escenarios. Verificar que fallan con `npm test`.
  - "Cantidad en el máximo": 9999 y 9998.5 se guardan.
  - "Cantidad por encima del máximo": 10000 y 9999.5 dan error en `cantidad`, con un mensaje que contiene "9999".
  - "Cantidad no válida" y "Cantidad decimal" siguen igual.
  - `CANTIDAD_MAX` vale 9999 en `tests/constantes.test.js`.
- [x] 2.2 Verde (design §4): `CANTIDAD_MAX` en `constantes.js` y la regla en `validarProducto`. Verificar con `npm test` en verde.

## 3. Id y fecha de modificación de los productos del archivo (Node)

- [x] 3.1 Rojo: en `tests/productos.test.js` y `tests/sincronizacion.test.js`. Verificar que fallan con `npm test`.
  - `esIdProducto`: acepta un UUID en minúsculas y rechaza "nuevo", el mismo UUID en mayúsculas, uno con llaves y uno con espacios.
  - "Id que no es un UUID": `leerArchivo` descarta los dos y conserva los válidos (`descartados` vale 2).
  - "Fecha de modificación sin zona": se descartan los tres formatos del escenario.
  - "Fecha de modificación con desfase": `+01:00` y `Z` se aceptan y se conservan tal cual.
  - "Cantidad por encima del máximo en el archivo": se descarta.
  - "Baja con fecha en el futuro" y "Reloj ligeramente adelantado" siguen igual.
- [x] 3.2 Verde (design §1 y §2): `esIdProducto` en `productos.js`, compartiendo la expresión del UUID con `NOMBRE_FOTO_REAL`, y `esFechaHora` estricta en `sincronizacion.js`. Verificar con `npm test` en verde.

## 4. Foto predeterminada desconocida (Node y navegador)

- [x] 4.1 Rojo: verificar que las pruebas fallan con `npm test` y `npm run test:navegador`.
  - En `tests/sincronizacion.test.js`:
    - "Foto predeterminada que no está en el catálogo": `leerArchivo` devuelve "Leche" con foto `ninguna` y `corregidos` 1.
    - "Foto predeterminada del catálogo": la conserva y `corregidos` es 0.
    - Un producto con fecha futura y foto desconocida cuenta un solo corregido.
  - En `tests/navegador/sincronizador.test.js`, "Foto predeterminada que no está en el catálogo": con el Drive doble, tras sincronizar el dispositivo tiene "Leche" sin foto y se ha llamado a `escribir` con "Leche" sin foto, aunque no hubiera cambios locales.
- [x] 4.2 Verde (design §3): corrección en `productoDelArchivo` con `buscarFoto` de `fotos.js`. Verificar con `npm test` y `npm run test:navegador` en verde.

## 5. Detección de cambios en la lista (Node)

- [x] 5.1 Rojo: en `tests/sincronizacion.test.js`, con `planificar` y listas que ya no pasan por `leerArchivo`. Verificar que fallan con `npm test`.
  - "Listas iguales": `cambiaLocal` y `hayQueSubir` son `false`.
  - "Textos con separadores": dos listas cuyos ids y `actualizado` con "@" y "|" dan el mismo texto unidos con los separadores de ahora, pero son distintas. `hayQueSubir` (o `cambiaLocal`) es `true`.
- [x] 5.2 Verde (design §5): `huella` con `JSON.stringify` de las tuplas ordenadas. Verificar con `npm test` en verde.

## 6. Tope del listado de fotos (Node)

- [x] 6.1 Rojo: en `tests/drive.test.js`, con `fetch` inyectado. Verificar que fallan con `npm test`.
  - "Carpeta con más fotos que el tope": Drive simulado con 3 páginas de 1000 archivos, la última con `nextPageToken`. `listarFotos` devuelve 2000, ha hecho exactamente 2 peticiones y no pide la tercera.
  - Una página que pasa del tope se recorta a 2000.
  - La consulta lleva `orderBy=createdTime desc`.
  - "listarFotos recorre todas las páginas" sigue igual por debajo del tope.
  - `FOTOS_LISTADO_MAX` es igual a `PRODUCTOS_MAX` en `tests/constantes.test.js`.
- [x] 6.2 Verde (design §6): `FOTOS_LISTADO_MAX` en `constantes.js` y el tope en `listarFotos`. "Foto fuera del tope" ya lo cubre `planificarFotos` (una foto que no está en el listado no se descarga). Comprobar que la prueba de "Foto aún no subida" lo cubre o añadir su variante. Verificar con `npm test` en verde.

## 7. Máximo en el formulario (navegador)

- [x] 7.1 Rojo: en `tests/navegador/formulario.test.js`. Verificar que fallan con `npm run test:navegador`.
  - "Máximo": con 9999, y con "9998,5", el + está desactivado. Al pulsar − vuelve a activarse.
  - "Cantidad escrita por encima del máximo": escribir "10000" y pulsar "Guardar" muestra el mensaje con "9999" junto a la cantidad, el foco va a la cantidad y no se guarda nada.
  - "Sumar y restar", "Mínimo" y "Cantidad decimal escrita" siguen igual.
- [x] 7.2 Verde (design §4): en `activarCantidad` de `formulario.js`, desactivar el + con `CANTIDAD_MAX`. El mensaje ya sale de `validarProducto`. Verificar con `npm run test:navegador` en verde.
- [x] 7.3 Comprobación visual con `node scripts/captura-app.mjs` sobre el formulario de alta y un recorrido que escriba 9999: el + aparece desactivado y no hay errores de consola ni de la CSP.

## 8. Verificación final y despliegue

- [x] 8.1 Verificación final: `npm test` y `npm run test:navegador` en verde.
- [x] 8.2 Antes del *commit*:
  - Repasar `git diff --cached` con la regla de `CLAUDE.md`: los artefactos describen el comportamiento, sin pistas para un atacante ni referencias a `docs/security/`.
  - Comprobar que la carpeta del cambio va en el mismo *push* que el código.
- [x] 8.3 Manual (usuario), tras desplegar y abrir y cerrar la app una vez en el móvil:
  - Sincronizar.
  - Comprobar que el Listado tiene los mismos productos que antes, sin ninguno perdido, y con sus fotos.
  - El formulario no deja pasar de 9999.

## Seguimiento del flujo

- Archivar con `/opsx:archive` cuando todas las tareas estén hechas y actualizar la tabla de `CLAUDE.local.md`.
