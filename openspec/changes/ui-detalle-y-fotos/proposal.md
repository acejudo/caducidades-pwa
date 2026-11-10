# Proposal

## Why

Hoy, al pulsar un producto del Listado se abre un marcador vacío, y la zona de foto del formulario lleva a otro marcador. Por eso el producto no se puede consultar con calma ni tener foto, aunque el modelo ya admite `foto: { tipo: 'predeterminada', valor }` desde `modelo-y-almacenamiento`. Este cambio completa las dos pantallas que faltan del recorrido básico (SPEC §5.3 y §5.4) y da a los productos una imagen reconocible sin depender todavía de la cámara ni de Drive. También incluye el "deslizar para eliminar" del Listado (SPEC §5.1), que se aplazó en `ui-listado`.

## What Changes

- **Detalle del producto** (nueva pantalla, sustituye al marcador): foto grande, nombre, fecha de caducidad con el *badge* de días restantes en su color de urgencia, fecha de compra (si existe), cantidad, categoría y notas. Botones "Editar" y "Eliminar" (con confirmación). Tiene estados para un producto inexistente o eliminado y para un error de carga.
- **Catálogo de fotos predeterminadas**: unas 20 ilustraciones SVG planas hechas para la app (yogur, leche, queso, huevos, pollo, salmón, manzana, plátano, tomate, pan, arroz, genérico, etc.), con nombre en español e id simple (SPEC §4.4). Van incluidas en la app y en la caché del Service Worker, así que funcionan sin conexión.
- **Elegir foto** (nueva pantalla, sustituye al marcador): buscador, cuadrícula de 3 columnas con la foto actual marcada (borde y *check*), botón "Sin foto" y botón "Hacer foto" visible pero desactivado ("Próximamente") hasta `fotos-reales`. Al elegir, guarda la foto en el borrador del formulario de origen y vuelve a él.
- **Rutas de Elegir foto**: pasa de `/elegir-foto` a `/producto/nuevo/foto` y `/producto/:id/editar/foto`, para que sepa a qué formulario devolver la foto. **BREAKING** (solo afecta a URLs internas: se elimina `/elegir-foto`).
- **Formulario**: la zona de foto muestra la foto elegida y su nombre. El formulario envía `foto` al guardar, y en la edición ya **se puede cambiar la foto** (antes se conservaba siempre). El borrador incluye la foto.
- **Listado**: las tarjetas muestran la foto predeterminada del producto. Si no tiene foto o su id no está en el catálogo, se ve el icono genérico.
- **Deslizar para eliminar** en el Listado: al deslizar una tarjeta hacia la izquierda aparece "Eliminar", que pide confirmación y borra el producto.
- La cabecera del Detalle pasa a titularse "Detalle del producto", como el mockup.

## Capabilities

### New Capabilities
- `product-detail`: pantalla Detalle del producto. Qué muestra, Editar, Eliminar con confirmación y estados de producto inexistente y de error.
- `product-photos`: fotos de producto. Catálogo de fotos predeterminadas, cómo se muestra la foto de un producto (también con id desconocido), pantalla Elegir foto (búsqueda, selección, "Sin foto", "Hacer foto" preparado) y disponibilidad sin conexión.

### Modified Capabilities
- `app-navigation`: Elegir foto pasa a tener una ruta por formulario (`/producto/nuevo/foto` y `/producto/:id/editar/foto`), y su pantalla padre es el formulario de origen.
- `product-form`: la zona de foto muestra la foto elegida. Guardar envía la foto, también en la edición, que ya no la conserva siempre. El borrador incluye la foto elegida.
- `product-list`: la tarjeta muestra la foto predeterminada. Requisito nuevo: deslizar para eliminar con confirmación.

## Impact

- **Código nuevo**: `src/js/fotos.js` (catálogo y búsqueda, puro), `src/js/detalle.js`, `src/js/elegir-foto.js`, `src/js/borradores.js` (borradores compartidos entre el formulario y Elegir foto), `src/js/deslizar.js` (gesto de deslizar) y `src/img/predeterminadas/*.svg`.
- **Código modificado**: `formulario.js` (foto y uso de `borradores.js`), `listado.js` (foto y deslizar), `ui.js` (pantallas reales en lugar de marcadores), `app.js` (rutas), `styles.css` y `sw.js` (nuevos archivos en `SHELL_FILES`).
- **Pruebas**: `tests/fotos.test.js` y `tests/deslizar.test.js` (Node). En `tests/navegador/`, `detalle.test.js` y `elegir-foto.test.js`, y amplían `formulario.test.js` y `listado.test.js`.
- **Sin dependencias nuevas.** El modelo y el almacenamiento no cambian.
- **Fuera de alcance**: cámara y galería, fotos reales en IndexedDB y Drive (`fotos-reales`), y sincronización (`sincronizacion-drive`).
