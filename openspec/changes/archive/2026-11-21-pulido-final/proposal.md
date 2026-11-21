# Proposal

## Why

La app ya cumple casi toda la SPEC y se usa en el móvil, pero le falta el acabado para el uso diario:
- **Alta:** Nuevo producto obliga a hacer scroll (985 px en una pantalla de 844).
- **Aviso de caducidad:** con caducados y próximos ocupa tres líneas.
- **Sincronización:** sin token, solo la indica un punto naranja en el icono de la cabecera.
- **Confirmación y espera:** no hay confirmación visible al guardar o eliminar ni indicador mientras se carga algo.
- **Mockups:** varias pantallas se alejan de ellos (pestañas, Detalle, Ajustes).
- **Fotos predeterminadas:** el plátano no convence.
- **Cierre de calidad:** faltan comprobar los criterios de aceptación de SPEC.md §10 y la instalación como PWA.

Es el cambio 10 de la hoja de ruta. La seguridad va aparte, en `endurecimiento-seguridad`.

## What Changes

**1. Aviso de sincronización**
- Con cambios pendientes, sin token vigente y con conexión, el Listado muestra "Hay cambios sin sincronizar. Toca para sincronizar".
- Al tocarlo sincroniza a petición. La ventana de Google solo se abre desde ese toque.
- Desaparece cuando ya no hay nada pendiente.

**2. Retoques concretos**
- **Alta en una sola pantalla.** A 390×844, Nuevo producto cabe entero sin scroll:
  - "Cancelar" y "Guardar" en la misma fila fija;
  - la zona de foto pasa a ser una fila compacta: icono de cámara y "Toca para elegir foto" o, con foto, una miniatura con su nombre;
  - las Notas empiezan con dos líneas;
  - en Editar, "Eliminar" sigue al final del formulario, como ya está hoy; la spec lo deja escrito.
- **Cómo se ve la foto.**
  - En el Detalle, la foto real pasa a una proporción 4:3, que recorta menos las fotos verticales.
  - Al tocarla se ve entera a pantalla completa.
  - En el formulario se ve como miniatura cuadrada.
- **Aviso de caducidad más corto:** "2 productos caducados y 1 a punto de caducar", "6 productos caducados", "3 productos a punto de caducar". La ayuda de Ajustes sigue explicando que "a punto" son 2 días o menos.
- **Fotos predeterminadas:**
  - plátano nuevo;
  - más contraste en Yogur y Leche;
  - Mantequilla y Embutido a la escala de las demás.

**3. Revisión visual y feedback**
- **Avisos breves (*toasts*):** "Producto guardado" y "Producto eliminado" tras guardar o eliminar.
- **Indicador de carga:** "Cargando…" en el Listado, el Detalle y Editar si la lectura tarda.
- **Ajustes visuales frente a DESIGN.md y los mockups:**
  - pestañas "Pronto" y "Caducadas" con su color de urgencia;
  - en el Detalle, iconos para Cantidad y Categoría, y la categoría como etiqueta;
  - en Ajustes, la sección de Drive con icono de nube, sin el logo de Google, que es una marca;
  - estados al pasar el ratón (solo en dispositivos con puntero) y al pulsar en botones, tarjetas y casillas.
- **Iconos PWA:** se revisan (192, 512 y *maskable*) y solo se cambian si fallan en Android o iOS.

**4. Cierre de calidad**
- Repaso de los mensajes de error para que todos sean claros y en español, sin textos técnicos.
- Limpieza de código: comentarios obsoletos, CSS sin uso y "(pendiente)" en el README.
- *Workflow* de GitHub Pages: GitHub avisa de que Node.js 20 está obsoleto. Se pasan las *actions* a sus versiones que usan Node 24 y la del propio *workflow* a Node 24. Fijarlas por SHA es endurecimiento y va en `endurecimiento-seguridad`.
- Comprobación y marca de los criterios de aceptación de SPEC.md §10.
- Instalación como PWA en Android e iOS (manual).

## Capabilities

### New Capabilities
- `ui-feedback`: avisos breves tras guardar o eliminar e indicadores de carga.

### Modified Capabilities
- `sync-status`: requisito nuevo, el aviso de cambios sin sincronizar en el Listado.
- `expiry-alerts`: "Aviso en el Listado" con los textos cortos.
- `product-form`: "Zona de foto" compacta y requisito nuevo, el alta en una sola pantalla con "Cancelar" y "Guardar" en la misma fila y "Eliminar" al final de la edición.
- `product-detail`: requisitos nuevos, la foto real en 4:3 y la vista a pantalla completa.

## Impact

- **Código:**
  - `listado.js`: aviso de sincronización, indicador de carga y *toast* al eliminar.
  - `formulario.js`: zona de foto compacta, botones en fila, "Eliminar" al final y *toast*.
  - `detalle.js`: foto 4:3, vista a pantalla completa, iconos y *toast*.
  - Ajustes, en `estado-sincronizacion.js`: icono de nube.
  - `productos.js`: textos del aviso de caducidad.
  - Módulo nuevo `src/js/feedback.js` (*toasts* e indicador de carga), más el SVG de los cinco productos y `styles.css`.
  - `ui.js` conecta el aviso de sincronización con el sincronizador.
  - `sw.js`: el módulo nuevo en `SHELL_FILES`.
- **CI:** `.github/workflows/pages.yml` (versiones de las *actions* y de Node).
- **Documentación:** SPEC.md §10 marcado; README.md sin "(pendiente)"; DESIGN.md con la decisión de "Cancelar" y "Guardar" en la misma fila.
- **Dependencias:** ninguna.
