# Tareas

## 1. Textos, secciones, búsqueda y contadores (Node)

- [ ] 1.1 Rojo: en `tests/productos.test.js` y `tests/formato.test.js`, con el nombre de cada escenario. Verificar que fallan con `npm test`.
  - "Textos relativos": `textoRelativo` con −5, −1, 0, 1 y 9.
  - "Límites de las secciones": `seccionCaducidad` con −1, 0, 7 y 8.
  - "Agrupar sin secciones vacías": `agruparPorSeccion`, con el orden de las secciones, sin las vacías y conservando el orden interno.
  - `buscarPorNombre`:
    - "PLATANO" encuentra "Plátano" y no "Pan";
    - un texto vacío o de solo espacios devuelve la lista entera, en el mismo orden;
    - no modifica la lista original.
  - "Contadores": `contarPorFiltro` con −3, −1, 0, 5 y 20 días da `{ todas: 5, caducadas: 2, pronto: 2 }`.
  - `FILTROS`: claves `todas`, `caducadas` y `pronto`, en ese orden, con los textos "Todos", "Caducados" y "Esta semana".
  - "Fecha de otro año": `formatearFechaCorta('2027-01-30', hoy 2026-11-25)` da "30 ene 2027". En el mismo año, "21 nov", y "5 ene" sin cero delante.
  - `simplificar` exportada desde `formato.js` (mayúsculas, acentos y espacios en los extremos).
- [ ] 1.2 Verde (design §1): las funciones en `productos.js` y `formato.js`, `simplificar` movida desde `fotos.js` y los textos y el orden nuevos de `FILTROS`. Verificar con `npm test` en verde, incluidas las pruebas de `filtrarFotos` y de `resumirUrgentes`.

## 2. Filas compactas y urgencia (navegador)

- [ ] 2.1 Rojo: en `tests/navegador/listado.test.js`, con `hoy` inyectado. Verificar que fallan con `npm run test:navegador`.
  - Las pruebas existentes de la tarjeta pasan a los escenarios nuevos:
    - "Tarjeta completa": "Leche entera", "En 3 días", "20 nov" y "2 ud", sin "Caduca el" ni "Cantidad:";
    - "Colores por nivel": clase `urgencia-texto--rojo|naranja|verde` en el tiempo relativo, sin `.badge` ni borde de urgencia.
  - "Cantidad de una unidad" (no hay elemento de cantidad), "Cantidad decimal" y "Fecha de otro año".
  - "Producto con foto predeterminada", "Producto sin foto" y "Nombre con marcado" siguen pasando sobre la fila.
  - "La app vuelve al día siguiente" espera "Mañana" y luego "Hoy".
  - Sin texto suelto ("null", "false", "undefined").
- [ ] 2.2 Verde (design §2): fila `.fila-producto` dentro de `.tarjeta-deslizable`, imagen de 44 px y CSS de la fila y de `urgencia-texto--*`. Las pruebas del deslizar ("Deslizar lo suficiente", "Una sola abierta", "Eliminar confirmado"…) siguen en verde sin cambiarlas. Verificar con `npm run test:navegador` en verde.

## 3. Secciones y filtros con contador (navegador)

- [ ] 3.1 Rojo: en `tests/navegador/listado.test.js`. Verificar que fallan con `npm run test:navegador`.
  - "Tres secciones": títulos, orden y contador de cada cabecera.
  - "Sección vacía oculta" y "Una sección con un filtro".
  - "Contadores": el texto de los tres filtros.
  - "Filtro Pronto", "Filtro Caducadas" y "Filtro conservado", con los nombres nuevos.
  - "Esta semana sin resultados" y "Filtro sin resultados".
  - "Una sola abierta" entre filas de dos secciones distintas.
  - En `tests/navegador/avisos.test.js`, al tocar el aviso: "Con caducados" deja activo "Caducados" y "Solo próximos" deja activo "Esta semana".
- [ ] 3.2 Verde (design §3 y §4): `pintar()` con `agruparPorSeccion`, `<section>` y `<h2>` por sección, filtros con contador y CSS de las píldoras y de las cabeceras de sección. Verificar con `npm run test:navegador` en verde.

## 4. Búsqueda (navegador)

- [ ] 4.1 Rojo: en `tests/navegador/listado.test.js`. Verificar que fallan con `npm run test:navegador`.
  - "Buscar sin acentos", "Búsqueda y filtro", "Sin coincidencias" (con el texto tal cual y sin interpretarlo como HTML) y "Contadores con búsqueda".
  - "Búsqueda vacía al volver": se monta la pantalla otra vez y el buscador está vacío.
  - "Sin productos": no se muestran ni el buscador ni los filtros.
  - El buscador tiene el nombre accesible "Buscar producto".
- [ ] 4.2 Verde (design §5): buscador en `listado.js`, que filtra en `input` sin releer el almacenamiento, y su CSS. Verificar con `npm run test:navegador` en verde.

## 5. Botón "Añadir" y acceso a Ajustes (navegador)

- [ ] 5.1 Rojo: en `tests/navegador/listado.test.js`. Verificar que fallan con `npm run test:navegador`.
  - "Añadir producto": el botón muestra el texto "Añadir", tiene el nombre accesible "Añadir producto" y lleva a `#/producto/nuevo`.
  - "Abrir Ajustes desde el Listado": `accionCabecera` es un enlace a `#/ajustes` con `aria-label` "Ajustes", y mide al menos 44×44 px con `styles.css` (ui-theme, "Zona táctil mínima").
  - "Almacenamiento no disponible": con error de carga, `accionCabecera` y "Añadir" siguen presentes.
  - "Última fila visible": con `styles.css`, 390 px de ancho y unos 15 productos, al desplazar hasta el final el borde inferior de la última fila queda por encima del borde superior de "Añadir".
- [ ] 5.2 Verde (design §6 y §7):
  - En `listado.js`, `accionCabecera` y el botón "Añadir" con texto.
  - El `padding-bottom` de `.listado` y el degradado.
  - El nuevo `bottom` de `.fab`.

  Verificar con `npm run test:navegador` en verde.

## 6. Sin barra inferior (navegador y Node)

- [ ] 6.1 Rojo. Verificar que fallan con `npm test` y `npm run test:navegador`.
  - `tests/navegador/ajustes.test.js`:
    - "Ajustes sin scroll" y "Cerrar sesión visible" se montan en `<div class="app"><main class="contenido">`, sin `app--con-nav`, a 390×740;
    - "Cerrar sesión" queda por encima del borde inferior y mide al menos 44 px.
  - `tests/navegador/marco.test.js`, si menciona `nav-inferior`: se ajusta.
  - Si hay pruebas de rutas en `tests/router.test.js` o en las de navegador: "Volver de Ajustes", Ajustes con `padre` `/listado`, y "Sin flecha en pantallas principales".
  - Comprobar en `tests/csp.test.js` y `tests/sw.test.js` que ninguna espera `#nav-inferior`.
- [ ] 6.2 Verde (design §7 y §8):
  - En `app.js`, sin `mostrarNav` y Ajustes con `padre: '/listado'`.
  - En `ui.js`, sin `NAV`, `pintarNav`, `$nav` ni `app--con-nav`.
  - En `index.html`, sin `<nav id="nav-inferior">`.
  - En el CSS, sin `.nav-inferior*`, `--alto-nav` ni `app--con-nav`, y `app--ajustes` ajustada o eliminada.

  Verificar con `npm test` y `npm run test:navegador` en verde.

## 7. Documentación y comprobación visual

- [ ] 7.1 Actualizar la documentación con las secciones, las filas compactas, la búsqueda, los filtros con contador, el botón "Añadir", el icono de Ajustes y que ya no hay barra inferior:
  - `docs/SPEC.md` §5.1 y §5.5;
  - `docs/DESIGN.md` §4.2 (filas en lugar de *cards*), §4.4 (sin navegación inferior), §5.1 y §5.5.
- [ ] 7.2 Comprobación visual con `node scripts/captura-app.mjs` en el scratchpad:
  - `--ruta listado` con unos 12 productos repartidos en las tres secciones, con fotos predeterminadas, una real, una cantidad de 0,5 kg y uno sin foto. Un recorrido que desplace hasta el final y devuelva las posiciones de la última fila y de "Añadir".
  - `--ruta listado` con el filtro "Caducados" y con una búsqueda sin resultados.
  - `--ruta ajustes` con `--alto 740`: sin scroll y con la flecha de volver.

  Comparar con el lienzo acordado y comprobar que no hay errores de consola ni de la CSP.

## 8. Verificación final y despliegue

- [ ] 8.1 Verificación final: `npm test` y `npm run test:navegador` en verde.
- [ ] 8.2 Antes del *commit*: repasar el diff con la regla de `CLAUDE.md` y comprobar que la carpeta del cambio va en el mismo *push* que el código.
- [ ] 8.3 Manual (usuario), tras desplegar y abrir y cerrar la app una vez en el móvil:
  - El Listado se ve por secciones, con unos 9 productos por pantalla.
  - La búsqueda y los filtros funcionan juntos.
  - Deslizar para eliminar funciona en todas las secciones.
  - "Añadir" no tapa la última fila.
  - El icono de Ajustes abre Ajustes, y la flecha y el botón Atrás del sistema vuelven al Listado.

## Seguimiento del flujo

- Archivar con `/opsx:archive` cuando todas las tareas estén hechas y actualizar la tabla de `CLAUDE.local.md`.
