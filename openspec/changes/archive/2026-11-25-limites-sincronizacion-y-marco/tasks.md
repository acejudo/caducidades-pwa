# Tareas

## 1. Lista a escribir dentro de los límites y archivo compacto (Node)

- [x] 1.1 Rojo: en `tests/sincronizacion.test.js`, con los nombres de los escenarios de la spec. Verificar que fallan con `npm test`.
  - "Archivo compacto": `crearArchivo` devuelve JSON sin saltos de línea.
  - "Archivo anterior con sangría": `leerArchivo` lee un texto con sangría.
  - `prepararArchivo(productos, ahora)`:
    - Con 2000 productos (bajas incluidas) devuelve el texto de `crearArchivo`.
    - Con 2001 lanza `ErrorListaLlena`. Es "La lista junta pasaría del máximo" a nivel puro.
    - Con productos cuyo archivo pasa de `ARCHIVO_MAX_BYTES` lanza `ErrorListaLlena`. Es "Archivo resultante demasiado grande".
- [x] 1.2 Verde (design §1 y §3): `ErrorListaLlena` y `prepararArchivo` en `sincronizacion.js`, y `crearArchivo` sin sangría. Verificar con `npm test` en verde.

## 2. Descargas con tope aunque no se indique el tamaño (Node)

- [x] 2.1 Rojo: en `tests/drive.test.js`, con `fetch` inyectado y respuestas `ReadableStream` sin `content-length`. Verificar que fallan con `npm test`.
  - "Archivo demasiado grande sin tamaño indicado": `leer` lanza `ErrorArchivoGrande`, y el cuerpo, servido en trozos de 64 KiB, se ha leído como mucho hasta el tope más un trozo (contar los `pull`).
  - "Foto demasiado grande sin tamaño indicado": `descargarFoto` lanza `ErrorFotoNoValida`, con la misma cota de lectura.
  - Variante con `content-length` menor que el cuerpo real: también se corta.
  - Las pruebas actuales de lectura normal y de cabecera grande siguen igual.
- [x] 2.2 Verde (design §4): `leerHasta` en `drive.js`, usado por `leer` y `descargarFoto`. Verificar con `npm test` en verde.

## 3. La sincronización no guarda ni sube una lista que supera los límites (navegador)

- [x] 3.1 Rojo: en `tests/navegador/sincronizador.test.js`, con el Drive y el almacén dobles que ya existen. Verificar que fallan con `npm run test:navegador`.
  - "La lista junta pasaría del máximo": Drive con 2000 productos y el dispositivo con 10 más distintos y cambios pendientes. Tras sincronizar:
    - el estado es `error` con `MENSAJES.listaLlena`;
    - no se llamó a `guardarSincronizados` ni a `escribir`;
    - el dispositivo sigue con sus 10;
    - `pendiente` sigue en `true`.
  - "La lista junta cabe": con 1990 y 10, termina bien y se sube un archivo de 2000.
  - "Crear la lista con demasiados productos": sin lista en Drive, se acepta crearla y la lista local supera los límites. No se llama a `crearLista` y se muestra el error.
- [x] 3.2 Verde (design §2): `MENSAJES.listaLlena`, `mensajeDe` con `ErrorListaLlena`, `prepararArchivo` antes de `guardarSincronizados` en `sincronizarArchivo` (reutilizando el texto para `escribir`) y en la creación de la lista de `localizar`. Verificar con `npm test` y `npm run test:navegador` en verde.

## 4. La app no arranca dentro de un marco (navegador)

- [x] 4.1 Rojo: crear `tests/navegador/marco.test.js` y enlazarlo en `tests/navegador/index.html`. Montar un `iframe` fuera de pantalla con `../../src/index.html` y quitarlo siempre en `finally`. Verificar que falla con `npm run test:navegador`.
  - "Cargada dentro de un marco": al cargar, el documento del marco muestra el aviso con el texto de la spec y un enlace «Abrir Caducidades» con `target="_top"`. No hay pantalla de login, ni botones de la app, ni el script de Google Sign-In.
  - "Abrir desde el marco": el `href` del enlace es la dirección de la app.
- [x] 4.2 Verde (design §5): en `app.js`, comprobar el marco antes del registro del Service Worker y de las importaciones, y generalizar `mostrarFaltaConfiguracion` en `mostrarAviso`. Sin estilos ni scripts en línea. Verificar con `npm test` y `npm run test:navegador` en verde.
- [x] 4.3 Comprobar "Uso normal" con `node scripts/captura-app.mjs --ruta listado --salida <scratchpad>/listado.png`: la app arranca sin errores ni infracciones de la CSP (salvo el estilo de Google Sign-In, que sale en `conocidos`).

## 5. Verificación final y despliegue

- [x] 5.1 Verificación final: `npm test` y `npm run test:navegador` en verde.
- [x] 5.2 Antes del *commit*:
  - Repasar `git diff --cached` con la regla de `CLAUDE.md`: los artefactos describen el comportamiento, sin pistas para un atacante ni referencias a `docs/security/`.
  - Comprobar que la carpeta del cambio va en el mismo *push* que el código.
- [x] 5.3 Manual (usuario), tras desplegar y abrir y cerrar la app una vez en el móvil:
  - La sincronización funciona como antes.
  - Tras la primera subida, `caducidades.json` en Drive aparece en una sola línea.
- [ ] 5.4 Manual (usuario), opcional: crear en el escritorio una página local con un `iframe` a la app publicada y comprobar que solo aparece el aviso con el enlace.

## Seguimiento del flujo

- Archivar con `/opsx:archive` cuando todas las tareas estén hechas y actualizar la tabla de `CLAUDE.local.md`.
