# Tasks

## 1. Lógica pura (Node)

- [x] 1.1 Rojo: en `tests/sincronizacion.test.js`, pruebas de `avisoPendiente` para los escenarios de "Aviso de cambios sin sincronizar": "Abrir la app con cambios pendientes", "Sin cambios pendientes" y "Sin conexión"; además, oculto mientras sincroniza y visible con `fase: 'error'`. En `tests/productos.test.js`, actualizar las pruebas de `resumirUrgentes` a los textos cortos ("Solo próximos", "Solo caducados", "Caducados y próximos", y el singular y plural). Verificar que fallan con `npm test`.
- [x] 1.2 Verde: `avisoPendiente` en `sincronizacion.js` y los textos nuevos en `resumirUrgentes` (design §1 y §2). Verificar con `npm test` en verde.
- [x] 1.3 Rojo y verde: prueba en Node (`tests/calidad.test.js`) que falla si algún módulo de `src/js` pinta `error.message` o `causa.message` en la interfaz. Verificar primero que la prueba detecta un ejemplo malo dentro de la propia prueba, y después que pasa con `npm test` (corrigiendo lo que encuentre).

## 2. Avisos breves e indicador de carga (`feedback.js`, navegador)

- [x] 2.1 Rojo: crear `tests/navegador/feedback.test.js` y enlazarlo en `index.html`. Para `mostrarAviso`: muestra el texto con `role="status"`, desaparece a la duración indicada, "Dos avisos seguidos" (solo el último) y una única región. Para `conIndicadorDeCarga`: "Lectura lenta" (con un retraso de prueba aparece "Cargando…"), "Lectura rápida" (no aparece) y "Lectura fallida" (se quita al fallar). Verificar que fallan.
- [x] 2.2 Verde: implementar `src/js/feedback.js` y sus estilos (design §5), y añadirlo a `SHELL_FILES`. Verificar con `npm test` (prueba del *shell*) y `npm run test:navegador` en verde.

## 3. Aviso de sincronización (navegador)

- [x] 3.1 Rojo: en `tests/navegador/estado-sincronizacion.test.js`, `crearAvisoSincronizacion` con un sincronizador doble: muestra el texto con la condición y se oculta sin ella; "Tocar el aviso" llama a `sincronizar({ aPeticion: true })`; "Sin ventana de Google por su cuenta" (sin tocarlo, nunca llama a `sincronizar`). En `tests/navegador/listado.test.js`: con `sincronizador` el aviso va antes del de caducidad, y sin él no hay aviso. Verificar que fallan.
- [x] 3.2 Verde: `crearAvisoSincronizacion` en `estado-sincronizacion.js`, la dependencia `sincronizador` en `crearPantallaListado` y su paso desde `ui.js` (design §1), con estilos. Verificar con `npm run test:navegador` en verde.

## 4. Listado: aviso de caducidad, carga y eliminar

- [x] 4.1 Rojo: en `tests/navegador/listado.test.js`, actualizar los textos del aviso de caducidad y añadir "Cabe en dos líneas" (con los estilos de la app: 12 caducados y 10 a punto, altura de `.aviso-caducidad__texto` de como mucho dos líneas). Añadir "Lectura lenta" y "Lectura fallida" en el Listado (con `listar` lento y retraso de prueba) y "Eliminar desde el Listado" (`avisar` doble recibe "Producto eliminado"). Verificar que fallan.
- [x] 4.2 Verde: integrar `conIndicadorDeCarga` y `avisar` en `listado.js`, y ajustar el estilo del aviso para que el texto quepa en dos líneas (design §2 y §5). Verificar con `npm run test:navegador` en verde.

## 5. Formulario: alta en una pantalla y avisos

- [x] 5.1 Rojo: en `tests/navegador/formulario.test.js` (CRLF: editar con la herramienta de edición), con los estilos de la app:
  - "Alta sin scroll" (en una zona de 390×844, el borde inferior de la fila de botones queda dentro);
  - "Botones en una fila" ("Cancelar" y "Guardar" con el mismo `top`, "Guardar" a la derecha, e Intro en un campo sigue guardando);
  - "Eliminar al final de la edición";
  - la zona de foto compacta (los escenarios de "Zona de foto" siguen pasando y su altura es de 96 px como mucho);
  - "Guardar un producto" (`avisar` recibe "Producto guardado" y no lo recibe si falla al guardar);
  - "Producto eliminado" al eliminar desde la edición;
  - "Lectura lenta" en Editar.

  Verificar que fallan.
- [x] 5.2 Verde: zona de foto en fila, Notas con `rows: 2`, botones en dos columnas, `avisar` y `conIndicadorDeCarga` en `formulario.js`, con sus estilos (design §3 y §5). Verificar con `npm run test:navegador` en verde y medir con `captura-app.mjs --ruta producto/nuevo` que `scrollHeight <= innerHeight` (captura en el scratchpad).

## 6. Detalle: foto, visor y avisos

- [x] 6.1 Rojo: en `tests/navegador/detalle.test.js`:
  - "Foto vertical" (con foto real, el contenedor lleva la clase 4:3 y la imagen `foto-real`; con una predeterminada, no);
  - "Abrir y cerrar la foto" (botón con `aria-label`, `<dialog>` abierto con la imagen; "Cerrar", Escape y clic fuera lo cierran y lo quitan, cerrando siempre el diálogo en `finally`);
  - "Foto predeterminada" (sin botón ni visor);
  - "Eliminar desde el Detalle" (`avisar` recibe "Producto eliminado");
  - "Lectura lenta" en el Detalle.

  Verificar que fallan.
- [x] 6.2 Verde: foto 4:3, visor y `avisar` y `conIndicadorDeCarga` en `detalle.js`, con estilos (design §4 y §5). Verificar con `npm run test:navegador` en verde.

## 7. Revisión visual y fotos predeterminadas

- [x] 7.1 Pestañas de color, iconos y etiqueta de categoría en el Detalle, bloque de Drive con icono de nube en Ajustes, y estados al pasar el ratón y al pulsar (design §6). Iconos nuevos en `iconos.js`. Verificar con `npm run test:navegador` en verde (las pruebas de pantalla siguen pasando y no queda texto suelto) y con capturas de Listado, Detalle y Ajustes comparadas con `docs/design/` (en el scratchpad).
- [ ] 7.2 Rehacer `platano.svg` y retocar `yogur.svg`, `leche.svg`, `mantequilla.svg` y `embutido.svg` (design §7). Verificar con una captura de Elegir foto y otra del Listado (48 px) en el scratchpad, y pasarle las capturas al usuario para que dé el visto bueno.

## 8. Cierre de calidad

- [x] 8.1 Limpieza: comentarios obsoletos, CSS sin uso (revisando la lista antes de borrar) y "(pendiente)" del README (design §8). Verificar con `npm test` y `npm run test:navegador` en verde y con capturas sin cambios visuales no buscados.
- [x] 8.2 Actualizar `.github/workflows/pages.yml` a las versiones de *actions* con Node 24 y `node-version: 24` (design §8, tabla del *workflow*), tras leer las notas de cada versión mayor. Verificar que el YAML sigue siendo válido (`node -e` con un parseo simple o revisión de la indentación) y, tras el push del usuario, que el *workflow* termina en verde **sin** el aviso "Node.js 20 is deprecated" y la app publicada carga (prueba manual en 9.3).
- [x] 8.3 Documentación: DESIGN.md §5.2 ("Cancelar" y "Guardar" en la misma fila; zona de foto compacta) y §5.4 (visor de foto). Verificar releyendo que coinciden con las specs del cambio.

## 9. Verificación final

- [x] 9.1 Ejecutar `npm test` y `npm run test:navegador` y verificar que todo está en verde.
- [x] 9.2 Recorrido con `captura-app.mjs`: alta sin scroll, aviso breve "Producto guardado", aviso de caducidad corto, Detalle con visor y Ajustes. Sin errores en la consola. Capturas en el scratchpad.
- [ ] 9.3 Manual en el móvil (tras desplegar): alta sin scroll, aviso breve al guardar y al eliminar, foto real en el Detalle y a pantalla completa, aviso "Hay cambios sin sincronizar" al día siguiente con un cambio pendiente (y que solo abre Google al tocarlo), y que las pestañas de color, los iconos y el plátano nuevo se ven bien.
- [ ] 9.4 Manual: instalar la app como PWA en Android (Chrome, "Instalar app") y en iOS (Safari, "Añadir a pantalla de inicio"), comprobar el icono y que abre sin barra del navegador, y anotar el resultado. Si el icono se ve recortado o borroso, corregirlo.
- [ ] 9.5 Comprobar uno a uno los criterios de aceptación de SPEC.md §10 (con las pruebas y lo verificado en 9.3 y 9.4) y marcarlos `[x]` en SPEC.md. Si alguno falla, anotarlo y avisar al usuario antes de seguir.

## Workflow follow-up

- Archivar el cambio con `/opsx:archive` cuando el usuario lo haya revisado y probado.
- Actualizar la tabla de estado de `CLAUDE.local.md`.
