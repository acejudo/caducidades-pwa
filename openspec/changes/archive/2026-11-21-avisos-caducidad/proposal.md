# Proposal

## Why

`docs/SPEC.md` §5.5 y `docs/DESIGN.md` §5.5 piden en Ajustes una opción de "notificaciones locales (recordatorios de caducidad)". Una PWA sin servidor de *push* no puede avisar a una hora con la app cerrada, y en iPhone las notificaciones solo funcionan con la app instalada. El usuario ha decidido (2026-11-16) no usar notificaciones del sistema y avisar **dentro de la app**: al abrirla, que se vea enseguida qué está caducado o a punto de caducar, sin tener que buscarlo en la lista.

El resto de lo que pedía el antiguo cambio `ajustes-y-offline` ya está hecho: Ajustes con la cuenta y "Cerrar sesión", el estado de la sincronización y "Sincronizar ahora" (`sincronizacion-drive`), y el funcionamiento sin conexión.

## What Changes

- **Aviso de caducidad en el Listado.** Si hay productos **urgentes**, el Listado muestra arriba un aviso. Son urgentes los ya caducados y los que caducan hoy o en los próximos 2 días: el nivel rojo de `product-model`, con el mismo límite compartido. Ejemplos de texto: "3 productos caducan hoy o en los próximos 2 días" o "1 producto ha caducado y 2 caducan hoy o en los próximos 2 días".
- **Tocar el aviso** activa el filtro correspondiente: "Caducadas" si hay alguno caducado y "Pronto" si no.
- **Cerrar el aviso** con su botón ✕. No vuelve a salir hasta la siguiente vez que se abra la app.
- El aviso se recalcula con la lista: desaparece si ya no queda nada urgente (por ejemplo, tras eliminar esos productos) y se actualiza al volver a la app otro día.
- **Ajustes:** una sección nueva, "Avisos", con un interruptor, "Avisar de lo que caduca pronto". Viene activado de serie y se guarda en el dispositivo. Desactivado, el Listado no muestra el aviso.
- No pide permisos y funciona igual en Android, iPhone y escritorio, instalada o no.
- **Fuera de alcance:** notificaciones del sistema, *push* y avisos programados. `docs/SPEC.md` §5.5 se actualiza para reflejarlo.

## Capabilities

### New Capabilities
- `expiry-alerts`: el aviso de productos urgentes en el Listado (cuándo sale, su texto, a dónde lleva y cómo se cierra) y la preferencia de Ajustes que lo activa o desactiva.

### Modified Capabilities
<!-- Ninguna: el Listado conserva sus requisitos actuales (filtros, tarjetas, estados vacíos); el aviso se define en expiry-alerts. -->

## Impact

- **Código:**
  - `src/js/productos.js`: resumen puro de los productos urgentes (cuántos, texto y filtro de destino).
  - Módulo nuevo `src/js/avisos.js`: preferencia guardada, estado "cerrado en esta apertura", el aviso del Listado y la sección de Ajustes.
  - `src/js/listado.js`: pinta el aviso y lo enlaza con los filtros.
  - `src/js/ui.js`: añade la sección "Avisos" a Ajustes.
  - `src/css/styles.css`: estilos del aviso y del interruptor.
  - `src/sw.js`: `avisos.js` en `SHELL_FILES` y versión nueva de la caché.
- **Datos:** una clave nueva en `localStorage`, `caducidades.avisos`. No toca IndexedDB ni Drive: es una preferencia de cada dispositivo y no se sincroniza.
- **Documentación:** `docs/SPEC.md` §5.5 (aviso dentro de la app en vez de notificaciones locales).
- **Dependencias:** ninguna.
