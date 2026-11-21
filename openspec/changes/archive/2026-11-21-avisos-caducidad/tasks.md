# Tasks

## 1. Productos urgentes y texto del aviso (`productos.js`, Node)

- [x] 1.1 Rojo: en `tests/productos.test.js`, pruebas de `resumirUrgentes` con los escenarios "Clasificación", "Solo próximos", "Solo caducados", "Caducados y próximos" y "Nada urgente", más el singular ("1 producto caduca…"), el `filtro` (`'caducadas'` si hay caducados, `'pronto'` si no), los eliminados ignorados y el límite tomado de `URGENCIA.rojoMaxDias`. Verificar que fallan con `npm test`.
- [x] 1.2 Verde: implementar `resumirUrgentes` (design §1 y §2). Verificar con `npm test` en verde.

## 2. Sin notificaciones del sistema (Node)

- [x] 2.1 Rojo y verde: prueba "Sin permisos" en `tests/avisos.test.js` (nuevo), que recorre `src/js/*.js` y comprueba que ningún módulo usa `Notification`, `requestPermission` ni `PushManager`. Verificar primero que la prueba detecta un uso, con un texto de ejemplo dentro de la propia prueba, y después que pasa con `npm test`.

## 3. Preferencia, aviso y sección de Ajustes (`avisos.js`, navegador)

- [x] 3.1 Rojo: crear `tests/navegador/avisos.test.js` y enlazarlo en `tests/navegador/index.html`. Pruebas:
  - `preferenciaAvisos` (con una clave de prueba): "Valor por defecto" (activado), "Preferencia conservada" (una instancia nueva lee lo guardado), un valor corrupto cuenta como activado, y "Almacenamiento bloqueado" (`localStorage` que lanza: sin errores, y el valor se mantiene en memoria).
  - `cerrarAviso`, `avisoCerrado` y `reiniciarAvisos`.
  - `crearAvisoCaducidad`: `actualizar(resumen)` muestra el texto y "Ver"; `actualizar(null)` lo oculta; el botón principal llama a `alElegirFiltro` con el filtro; el botón "Cerrar aviso" (`aria-label`) llama a `alCerrar`; `role="status"`; sin texto suelto.
  - `crearSeccionAvisos`: el título "Avisos", un `role="switch"` con "Avisar de lo que caduca pronto", marcado según la preferencia, y al cambiarlo llama a `activar`.

  Verificar que fallan con `npm run test:navegador`.
- [x] 3.2 Verde: implementar `src/js/avisos.js` (design §3), añadir el icono de alerta a `iconos.js` (Lucide `triangle-alert`, ISC), los estilos del aviso y del interruptor en `styles.css` (design §6) y `./js/avisos.js` en `SHELL_FILES` de `src/sw.js`. Verificar con `npm test` (incluye `tests/sw.test.js`) y `npm run test:navegador` en verde.

## 4. Aviso en el Listado (`listado.js`, navegador)

- [x] 4.1 Rojo: en `tests/navegador/listado.test.js`, con "hoy" fijo, productos en la base de datos de pruebas y `avisos` doble. Escenarios:
  - "Solo próximos", "Caducados y próximos", "Nada urgente" y "Listado vacío";
  - "Tocar el aviso: Con caducados" (filtro "Caducadas" activo) y "Tocar el aviso: Solo próximos" (filtro "Pronto" activo);
  - "Cerrar y volver al Listado" (tras cerrar, un montaje nuevo de la pantalla no lo muestra) y "Volver a abrir la app" (tras `reiniciarAvisos` vuelve);
  - "Eliminar el último urgente" (deslizando y confirmando);
  - "Al día siguiente" (`visibilitychange` con otro "hoy");
  - "Desactivar los avisos" (`activado()` falso: sin aviso);
  - el aviso oculto en el estado de error.

  Verificar que fallan.
- [x] 4.2 Verde: integrar el aviso en `crearPantallaListado` con la dependencia `avisos` (design §4). Verificar con `npm run test:navegador` en verde, incluidas todas las pruebas anteriores del Listado.

## 5. Ajustes y documentación

- [x] 5.1 Añadir `crearSeccionAvisos({ preferencia: avisosPorDefecto })` a `pantallaAjustes` en `ui.js` (design §5). Comprobar con `node scripts/captura-app.mjs --ruta ajustes` (captura en el scratchpad, sin errores en la consola) que la sección se ve entre "Sincronización" y "Cuenta".
- [x] 5.2 Actualizar `docs/SPEC.md` §5.5 (design §8) y la lista de módulos de `README.md`. Verificar releyendo que coinciden con la spec `expiry-alerts`.

## 6. Verificación final

- [x] 6.1 Ejecutar `npm test` y `npm run test:navegador` y verificar que todo está en verde.
- [x] 6.2 Recorrido con `node scripts/captura-app.mjs --ruta listado --productos <productos con caducados y próximos>`: captura del aviso a 390 px y, con `--script`, tocar el aviso (filtro activo), cerrarlo e ir a Ajustes, desactivar el interruptor y volver (sin aviso). Sin errores en la consola. Capturas en el scratchpad.
- [x] 6.3 Manual en el móvil (tras desplegar): con algún producto caducado o a punto de caducar, al abrir la app sale el aviso; tocarlo lleva al filtro; cerrarlo y navegar no lo hace volver; desactivarlo en Ajustes lo quita, y sigue desactivado tras cerrar y abrir la app. El navegador no pide permiso de notificaciones.

## Workflow follow-up

- Archivar el cambio con `/opsx:archive` cuando el usuario lo haya revisado y probado.
- Actualizar la tabla de estado de `CLAUDE.local.md`.
