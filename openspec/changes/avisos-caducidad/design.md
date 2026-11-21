# Design

## Context

Ver proposal.md (Why). Estado actual relevante:

- `productos.js` ya tiene `diasRestantes`, `nivelUrgencia` (con `URGENCIA.rojoMaxDias = 2` en `constantes.js`), `FILTROS` y `filtrarPorEstado`. Es puro y se prueba en Node.
- `listado.js` guarda el filtro activo en memoria del módulo (`filtroActivo`, con `reiniciarFiltro()` para las pruebas) y repinta en `pintar()`. `pintar()` se llama al cargar, al cambiar de filtro, al eliminar desde la lista y al volver a primer plano (`visibilitychange`). Tiene un `<p class="listado__aviso" role="alert">` para los errores al eliminar.
- Ajustes (`pantallaAjustes` en `ui.js`) se compone de secciones: `crearSeccionSincronizacion` (en `estado-sincronizacion.js`, probada en el navegador) y la tarjeta "Cuenta". `ui.js` no se puede probar porque importa `auth.js`.
- Las preferencias del sincronizador ya usan `localStorage` con lectura y escritura tolerantes, con la memoria como respaldo (`preferenciasLocales` en `sincronizador.js`).

## Goals / Non-Goals

**Goals:**
- Un aviso discreto pero visible, calculado igual que la urgencia de las tarjetas.
- Una preferencia por dispositivo, sin red ni permisos.
- Que todo se pueda probar: la lógica en Node, y el aviso y la sección en la página de pruebas.

**Non-Goals:**
- Notificaciones del sistema, `Notification.requestPermission`, *push* o *Periodic Background Sync*.
- Elegir el número de días del aviso: se usa el límite del nivel rojo.
- Recordar el cierre del aviso entre aperturas de la app.

## Decisions

### 1. Qué es urgente: el nivel rojo

Un producto es urgente si `diasRestantes ≤ URGENCIA.rojoMaxDias`, es decir, el mismo rojo de su tarjeta. Así el aviso cuenta justo lo que se ve en rojo en la lista.

- **Alternativa descartada:** usar el criterio del filtro "Pronto" (de 0 a 7 días). Avisaría casi siempre y dejaría de llamar la atención.

### 2. Lógica pura en `productos.js`

`resumirUrgentes(productos, hoy)` devuelve `null` si no hay nada urgente y, si lo hay, `{ caducados, proximos, texto, filtro }`. `filtro` es `'caducadas'` si `caducados > 0` y `'pronto'` si no.

Textos, con singular y plural y con `N = URGENCIA.rojoMaxDias`:

| Situación | Texto |
|---|---|
| Solo próximos | "1 producto caduca hoy o en los próximos N días" / "3 productos caducan hoy o en los próximos N días" |
| Solo caducados | "1 producto ha caducado" / "2 productos han caducado" |
| Los dos | "2 productos han caducado y 1 caduca hoy o en los próximos N días" (el segundo número, sin repetir "productos") |

Ignora los eliminados. El Listado ya recibe solo productos activos, pero así la función es correcta por sí misma.

- **Alternativa descartada:** construir el texto en el DOM. Se perdería la prueba en Node de todas las combinaciones.

### 3. Módulo nuevo `src/js/avisos.js` (navegador)

- **Preferencia:** `preferenciaAvisos(clave = 'caducidades.avisos')` → `{ activado(), activar(valor) }`. Guarda `{"activado": true|false}` en `localStorage`. Si no hay nada guardado, o el valor no se entiende, cuenta como activado. Si `localStorage` lanza un error, usa la memoria y nunca lanza (escenario "Almacenamiento bloqueado"). La instancia por defecto se comparte (`avisosPorDefecto`) entre el Listado y Ajustes, para que el cambio se vea al volver al Listado aunque no se pueda guardar.
- **Cierre en esta apertura:** una variable del módulo, `cerradoEnEstaApertura`, con `cerrarAviso()`, `avisoCerrado()` y `reiniciarAvisos()`, esta última solo para las pruebas, como `reiniciarFiltro`. Al recargar o abrir la app el módulo se evalúa de nuevo y la variable vuelve a `false` (escenario "Volver a abrir la app").
- **Aviso del Listado:** `crearAvisoCaducidad({ alElegirFiltro, alCerrar })` → `{ elemento, actualizar(resumen) }`. Es un `<div class="aviso-caducidad">` con dos botones:
  - el principal: icono de alerta, el texto del resumen y "Ver ›" al final; al pulsarlo llama a `alElegirFiltro(resumen.filtro)`;
  - el de cerrar: icono ✕ con `aria-label="Cerrar aviso"`; al pulsarlo llama a `alCerrar()`.

  `actualizar(null)` lo oculta (`hidden`). El contenedor lleva `role="status"`, para que los lectores de pantalla anuncien el aviso sin interrumpir.
- **Sección de Ajustes:** `crearSeccionAvisos({ preferencia })` → `{ elemento }`. Es una tarjeta con el título "Avisos", un `<label>` con `<input type="checkbox" role="switch">` y el texto "Avisar de lo que caduca pronto", y una ayuda: "Al abrir la app, el listado avisa de los productos caducados o que caducan en los próximos 2 días." Al cambiar, llama a `preferencia.activar(input.checked)`.

### 4. Integración en el Listado

`crearPantallaListado` recibe una dependencia nueva, `avisos = { activado, cerrado, cerrar }`, con los valores reales de `avisos.js` por defecto y sustituible en las pruebas. El aviso va entre las pestañas y el contenido.

En `pintar()`, después de calcular `ahora`:

```
resumen = avisos.activado() && !avisos.cerrado() ? resumirUrgentes(productos, ahora) : null
aviso.actualizar(resumen)
```

Así el aviso se actualiza en todos los casos en que ya se repinta la lista: al cargar, al eliminar y en `visibilitychange`. En el estado de error se oculta.

- `alElegirFiltro(filtro)` llama al `elegirFiltro` existente.
- `alCerrar()` llama a `avisos.cerrar()` y vuelve a pintar.

### 5. Ajustes (`ui.js`)

`pantallaAjustes` añade `crearSeccionAvisos({ preferencia: avisosPorDefecto })` entre la sección de sincronización y la de cuenta. Es solo composición: la lógica está probada en `avisos.js`.

### 6. Estilos

- **`.aviso-caducidad`:** fondo `--color-urgencia-rojo-suave`, texto `--color-urgencia-rojo-texto` (contraste AA, como manda `CLAUDE.md`), radio `--radio-md` y una fila con el botón principal flexible y el ✕ a la derecha. Ambos botones de al menos 44 px de alto.
- **Interruptor:** el `checkbox` nativo con `appearance: none`, dibujado como un *switch* con `--color-primario` cuando está activado. Conserva el foco visible.

### 7. Service Worker

`./js/avisos.js` va en `SHELL_FILES`. La versión de la caché la pone el *workflow* (el commit) al desplegar. La prueba de `tests/sw.test.js` que exige que todos los módulos estén en el *shell* ya cubre que no se olvide.

### 8. Documentación

`docs/SPEC.md` §5.5: "Opción de notificaciones locales" pasa a "Aviso de caducidad al abrir la app (activable)". §9 ya excluye las notificaciones *push* avanzadas.

### 9. Estrategia de pruebas (TDD)

| Qué | Dónde |
|---|---|
| `resumirUrgentes`: clasificación, los textos (singular y plural, solo caducados, solo próximos, los dos), `filtro`, sin urgentes → `null`, eliminados ignorados, límite tomado de `URGENCIA` | Node: `tests/productos.test.js` |
| `preferenciaAvisos`: activado por defecto, guardar y leer, valor corrupto, `localStorage` que lanza | Navegador: `tests/navegador/avisos.test.js` (nuevo) |
| `crearAvisoCaducidad` y `crearSeccionAvisos`: texto, botones, `aria-label`, `role="switch"`, `checked` y cambio | Navegador: `tests/navegador/avisos.test.js` |
| El aviso en el Listado: los escenarios de la spec, con productos en la base de datos de pruebas, un "hoy" fijo y `avisos` doble | Navegador: `tests/navegador/listado.test.js` |
| No se pide permiso de notificaciones: ningún módulo de `src/` usa `Notification` ni `PushManager` | Node: búsqueda en `src/js` en `tests/productos.test.js` o un `tests/avisos.test.js` |
| Aspecto en el móvil, lectura con el lector de pantalla y reapertura de la app | **Manual** en el móvil |

## Risks / Trade-offs

- [El aviso se repite cada vez que se abre la app mientras haya caducados] → Es lo que se busca. Si molesta, se cierra en esa apertura o se desactiva en Ajustes.
- [En iOS, la "apertura" de una PWA que sigue en memoria no recarga el módulo, así que un aviso cerrado puede no volver hasta que el sistema cierre la app] → Se acepta: no hay un evento fiable de "abrir" y el aviso sigue disponible desactivando y activando el interruptor o recargando. Se comprueba a mano.
- [El texto del aviso es largo en pantallas estrechas] → Se permite que ocupe dos líneas; el botón ✕ no se encoge. Se revisa con `captura-app.mjs` a 390 px.

## Migration Plan

No hay migración: la preferencia nueva no existe en ningún dispositivo y cuenta como activada. Para volver atrás basta con revertir el código; la clave `caducidades.avisos` se quedaría sin uso, sin efectos.
