# Tareas

## 1. Fecha local de hoy (Node)

- [x] 1.1 Rojo: en `tests/productos.test.js`. Verificar que fallan con `npm test`.
  - `fechaLocal(new Date(2026, 10, 25, 12))` da `'2026-11-25'`.
  - Con una hora local cercana a medianoche (`new Date(2026, 10, 25, 0, 30)` y `new Date(2026, 10, 25, 23, 30)`) da el día local, no el UTC.
  - Mes y día de una cifra con cero delante (`2026-01-05`).
- [x] 1.2 Verde (design §2): `fechaLocal` en `productos.js`. Verificar con `npm test` en verde.

## 2. Fecha de compra rellena y botón para quitarla (navegador)

- [x] 2.1 Rojo: en `tests/navegador/formulario.test.js`, con `hoy` inyectado (25/11/2026). Verificar que fallan con `npm run test:navegador`.
  - **Ajustar las pruebas existentes al comportamiento nuevo:**
    - "Formulario de alta vacío" espera `fechaCompra` `'2026-11-25'`.
    - Las comprobaciones de que el alta guarda `fechaCompra: null` pasan a quitar antes la fecha o a esperar la de hoy, según el caso.
  - "Edición sin fecha de compra": con un producto sin fecha, el campo está vacío y el botón desactivado.
  - "Alta sin fecha de compra": quitar la fecha y guardar → el producto queda con `fechaCompra: null`. Al pulsar el botón, el foco pasa al campo.
  - "Volver a elegir una fecha": quitar la fecha, escribir `2026-11-20` → el botón vuelve a estar activo y se guarda `2026-11-20`.
  - "Fecha vaciada en el borrador": quitar la fecha, pulsar la zona de foto y volver a montar → el campo sigue vacío y el botón, desactivado.
  - "Cancelar el alta sin tocar nada": no se llama a `confirmar` y se vuelve atrás.
  - El botón tiene el nombre accesible "Quitar fecha de compra", es `type="button"` y no deja texto suelto.
- [x] 2.2 Verde (design §2 y §3): dependencia `hoy` en `crearPantallaFormulario`, fecha de hoy en el alta, fila `.campo__fila` con el botón `.campo__quitar` y su estado. Verificar con `npm run test:navegador` en verde.

## 3. Papelera en la cabecera de Editar producto (navegador)

- [x] 3.1 Rojo: en `tests/navegador/formulario.test.js`. Verificar que fallan con `npm run test:navegador`.
  - "Formulario de edición relleno": `accionCabecera` es un botón con `aria-label` "Eliminar producto" e icono, y el formulario no contiene ningún botón "Eliminar".
  - "Papelera solo en la edición": en el alta, `accionCabecera` es `null`. Con un id inexistente, el botón sigue `hidden` después de `cargado`.
  - **Mantener los nombres de las pruebas existentes y cambiar dónde se pulsa:**
    - "Eliminar confirmado" y "Eliminar cancelado" pulsan `accionCabecera`.
    - "Eliminar cancelado" comprueba además que el foco vuelve a la papelera. Para eso, monta el botón en la zona de pruebas, junto a la pantalla.
    - Las pruebas que buscaban `boton(raiz, 'Eliminar')` dentro del formulario (alta sin Eliminar, botones de la edición y el fallo al eliminar) se adaptan.
  - "Eliminar al final de la edición" pasa a comprobar que no hay ningún botón después de Notas.
  - Con "Reintentar" tras un fallo de carga, la papelera elimina una sola vez y se confirma una sola vez.
- [x] 3.2 Verde (design §1): `accionCabecera` en `formulario.js`, que deja de pintar `.formulario__peligro`; CSS de `.cabecera__accion--peligro`; y en `ui.js`, `render` antes de `pintarCabecera`, que añade la acción. Verificar con `npm test` y `npm run test:navegador` en verde.

## 4. Formulario sin scroll a 390×740 (navegador)

- [x] 4.1 Rojo: en `tests/navegador/formulario.test.js`, `ALTO_DISPONIBLE = 740 − 56 − 16`. Verificar que fallan con `npm run test:navegador`.
  - "Alta sin scroll": el `<form>` del alta cabe.
  - "Edición sin scroll": cabe el de un producto con todos los campos rellenos, foto predeterminada y notas de dos líneas.
  - "Sin alto añadido": la fila de Fecha de compra no es más alta que el campo de Fecha de caducidad, y el botón está en la misma fila (mismo `top`, ±1 px) y mide al menos 44×44.
  - "Botones en una fila" y la zona de foto compacta siguen igual.
- [x] 4.2 Verde (design §6): reducir los espaciados del formulario en `styles.css` lo justo, sin bajar de 44 px ningún control. Verificar con `npm run test:navegador` en verde.

## 5. Ajustes en su módulo y sin scroll (navegador)

- [x] 5.1 Rojo: crear `tests/navegador/ajustes.test.js` (con su `antesDeCada`) y añadirlo a la página de pruebas. Usar imports tolerantes y dobles de la sesión, del sincronizador y de la preferencia. Verificar que fallan con `npm run test:navegador`.
  - La pantalla muestra las secciones Sincronización, Avisos y Cuenta (nombre y email de la sesión doble) y "Cerrar sesión", sin texto suelto.
  - "Cerrar sesión" llama una vez a `alCerrarSesion`.
  - "Ajustes sin scroll": montada en `<div class="app app--con-nav app--ajustes"><main class="contenido">` a 390 px de ancho y con `styles.css`, el alto del `main` más 56 no pasa de 740.
  - "Cerrar sesión por encima de la navegación": el botón mide al menos 44 px de alto, y el espacio bajo su borde inferior dentro del `main` es como mucho la navegación más `--espacio-4`.
- [x] 5.2 Verde (design §4 y §5):
  - `src/js/ajustes.js` con `crearPantallaAjustes`, que no importa `ui.js`, `auth.js` ni `config.js`.
  - `ui.js` la usa con las dependencias reales y pone `app--ajustes` en la ruta de Ajustes.
  - Se añade `./js/ajustes.js` a `SHELL_FILES`.
  - CSS compacto de Ajustes, en el orden del design §5, parando cuando la prueba pase.

  Verificar con `npm test` (incluida `sw.test.js`) y `npm run test:navegador` en verde.

## 6. Documentación y comprobación visual

- [x] 6.1 Actualizar `docs/SPEC.md` (§5.2 formulario y §10 si aplica) y `docs/DESIGN.md` (§5.2 y §5.5):
  - la fecha de compra se rellena con hoy y se puede quitar;
  - Eliminar es la papelera de la cabecera de Editar;
  - la referencia es 390×740 para Nuevo, Editar y Ajustes.
- [x] 6.2 Comprobación visual con `node scripts/captura-app.mjs --alto 740` en el scratchpad, con un recorrido que devuelva `scrollHeight` y `clientHeight`:
  - `producto/nuevo`: sin scroll, con la fecha de hoy y la ✕ en la misma fila;
  - Editar un producto completo: sin scroll, con la papelera en la cabecera;
  - `ajustes`: sin scroll.

  Revisar las capturas frente a los mockups y comprobar que no hay errores de consola ni de la CSP.

## 7. Verificación final y despliegue

- [x] 7.1 Verificación final: `npm test` y `npm run test:navegador` en verde.
- [x] 7.2 Antes del *commit*: repasar el diff con la regla de `CLAUDE.md` y comprobar que la carpeta del cambio va en el mismo *push* que el código.
- [ ] 7.3 Manual (usuario), tras desplegar y abrir y cerrar la app una vez en el móvil:
  - Nuevo producto, Editar producto y Ajustes no se desplazan.
  - La papelera de Editar pide confirmación y elimina.
  - El alta trae la fecha de hoy, la ✕ la quita y el producto se guarda sin fecha de compra.

## Seguimiento del flujo

- Archivar con `/opsx:archive` cuando todas las tareas estén hechas y actualizar la tabla de `CLAUDE.local.md`.
