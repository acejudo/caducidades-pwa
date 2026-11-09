# Tasks

Desarrollo con TDD (design.md §12): en cada bloque, primero las pruebas en **rojo**, después el código mínimo hasta **verde** y por último la **refactorización** con las pruebas en verde. Cada prueba se llama como el escenario de la spec que cubre. Antes de dar un grupo por terminado: `npm test` y `npm run test:navegador` en verde.

## 1. Runner con ganchos por archivo

- [x] 1.1 Rojo: en `tests/navegador/`, un archivo temporal de pruebas que registra su propio `antesDeCada` (marca una variable) después de las pruebas de `storage.test.js`, y una prueba que comprueba que las de `storage.test.js` siguen recibiendo su gancho y las nuevas el suyo; verificar que `npm run test:navegador` falla (hoy el último gancho sustituye al anterior)
- [x] 1.2 Verde: en `runner.js`, cada `prueba` guarda el gancho vigente al registrarse (design.md §12); verificar que `npm run test:navegador` pasa y quitar el archivo temporal (las 17 pruebas de `storage.test.js` siguen en verde)

## 2. Filtro por estado (`productos.js`)

- [x] 2.1 Rojo: en `tests/productos.test.js`, pruebas "Filtro Pronto" (-1, 0, 7 y 8 días → 0 y 7), "Filtro Caducadas" (-3, -1, 0 y 5 → -3 y -1 en ese orden), `'todas'` devuelve todo, se conserva el orden de entrada, no se modifica la lista, el límite de Pronto sale de `URGENCIA.naranjaMaxDias` y `FILTROS` tiene las claves y los textos de las pestañas; verificar que `npm test` falla
- [x] 2.2 Verde: implementar `FILTROS` y `filtrarPorEstado(lista, filtro, hoy)` según design.md §3; verificar que `npm test` pasa y refactorizar con las pruebas en verde

## 3. Formato en español (`formato.js`)

- [x] 3.1 Rojo: crear `tests/formato.test.js` con pruebas de `formatearFecha` (`'2026-11-20'` → `'20 nov 2026'`, los 12 meses con la tabla de design.md §4, `'2027-01-05'` → `'5 ene 2027'` sin cero a la izquierda, independiente de `process.env.TZ`) y de `formatearCantidad` (`1, 'ud'` → `'1 ud'`, `0.5, 'kg'` → `'0,5 kg'`, `2.25` → `'2,25'`, `1.10` → `'1,1'`, `1/3` → `'0,33'`); verificar que `npm test` falla
- [x] 3.2 Verde: crear `src/js/formato.js` (puro, sin importaciones) y añadirlo a `SHELL_FILES`; verificar que `npm test` pasa y refactorizar con las pruebas en verde

## 4. Iconos en su módulo

- [x] 4.1 Mover `ICONOS` de `ui.js` a `src/js/iconos.js` y añadir los iconos `producto` (cubiertos) y `vacio` (cesta) de Lucide; `ui.js` los importa de ahí; añadir `./js/iconos.js` a `SHELL_FILES`. Es un refactor sin comportamiento nuevo: verificar que `npm test` y `npm run test:navegador` siguen en verde y que la app arranca sin errores de consola, con la barra inferior, la flecha de volver y la zona de foto iguales que antes

## 5. Pantalla Listado: lista y tarjetas (`listado.js`)

- [x] 5.1 Rojo: crear `tests/navegador/listado.test.js` (cargado desde `index.html`) con `antesDeCada` que usa `caducidades-pruebas` y la vacía, un `HOY_FIJO` y productos con fechas relativas a él; pruebas "Orden del listado", "Productos eliminados", "Tarjeta completa", "Producto sin foto", "Nombre con marcado", "Colores por nivel" (clase `urgencia--*` y texto de caducidad en cada tarjeta), "Abrir el detalle" (`href` `#/producto/<id>` con el id codificado) y "Añadir producto" (`.fab` con `href` `#/producto/nuevo`), montando `crearPantallaListado({ hoy })` y esperando a `cargado`; verificar que fallan
- [x] 5.2 Verde: crear `src/js/listado.js` con `crearPantallaListado` (design.md §1, §5 y §8: lista, tarjeta, `aria-busy`, botón "+"), sin importar `ui.js`, `auth.js` ni `config.js`, y añadirlo a `SHELL_FILES`; verificar que `npm run test:navegador` pasa
- [x] 5.3 Integrar en `ui.js` (`listado: () => crearPantallaListado().elemento`) y quitar el producto de ejemplo; añadir en `styles.css` la tarjeta con foto (`.tarjeta--producto`, `.tarjeta__foto` de 56 px, nombre en dos líneas como máximo), la lista y la insignia con los tokens `--color-urgencia-*-suave`/`-texto` de design.md §6; verificar que las pruebas siguen en verde y, a mano en el modo dispositivo de DevTools con productos creados desde la consola, que la tarjeta se parece al mockup `docs/design/grok_1792523938257.jpg`

## 6. Filtros en la pantalla

- [x] 6.1 Rojo: pruebas de pantalla "Filtro Pronto", "Filtro Caducadas" y "Filtro conservado" (elegir "Pronto", montar de nuevo la pantalla y comprobar que sigue activo), y de accesibilidad de las pestañas (`role="tab"`, solo la activa con `aria-selected="true"`, "Todas" por defecto); verificar que fallan
- [x] 6.2 Verde: pestañas de design.md §7 (filtro en una variable del módulo, sin releer el almacenamiento) y sus estilos (activa en color primario y subrayada, al menos 44 px); verificar que `npm run test:navegador` pasa y refactorizar con las pruebas en verde

## 7. Estados vacíos y de error

- [x] 7.1 Rojo: pruebas "Sin productos" (mensaje, invitación a "+", pestañas ocultas y "+" visible), "Filtro sin resultados" (mensajes de Pronto y de Caducadas, distintos del de sin productos), "Almacenamiento no disponible" (con un `listar` falso que lanza `ErrorAlmacenamiento`: mensaje, botón "Reintentar" y "+" visible) y "Reintento correcto" (el `listar` falso funciona en el segundo intento); verificar que fallan
- [x] 7.2 Verde: estados de design.md §8 con sus estilos (icono `vacio`, texto secundario centrado, botón secundario); verificar que `npm run test:navegador` pasa y refactorizar con las pruebas en verde

## 8. Días restantes actualizados

- [x] 8.1 Rojo: prueba "La app vuelve al día siguiente": montar con un `hoy` controlable, avanzar un día, despachar `visibilitychange` con `visibilityState` simulado como `'visible'` y comprobar "Caduca hoy" sin releer el almacenamiento (el `listar` falso cuenta las llamadas); además, que con la sección fuera del documento el evento no pinta nada y no deja el listener registrado; verificar que fallan
- [x] 8.2 Verde: listener de `visibilitychange` con `AbortController` según design.md §9; verificar que `npm run test:navegador` pasa y refactorizar con las pruebas en verde

## 9. Documentación

- [x] 9.1 Actualizar el README (estructura con `listado.js`, `formato.js` e `iconos.js`) y la sección de iconos si menciona `ui.js`; verificar que lo descrito coincide con los archivos

## 10. Verificación final

- [x] 10.1 Ejecutar `npm test` y `npm run test:navegador` (todo en verde, y cada escenario de `product-list` tiene una prueba con su nombre), `openspec validate ui-listado --strict`, y comprobar que la app arranca sin errores en la consola
- [x] 10.2 (Manual, en el PC) Con la app en `localhost` y productos creados desde la consola (`const s = await import('./js/storage.js'); await s.crearProducto({ nombre: 'Leche entera', fechaCaducidad: '<fecha>' })` con fechas pasadas, de hoy, de 3, 6 y 12 días): comprobar el aspecto frente al mockup, las tres pestañas, los colores, el recorrido tocando Listado → producto → Detalle → "Editar" → Editar, la flecha de volver y que el filtro se conserva; después, en DevTools en *Offline*, recargar y comprobar que el listado se sigue viendo
- [x] 10.3 (Manual, en el móvil, tras desplegar) Con la app instalada en Android o iOS: el listado vacío se ve bien ("Todavía no hay productos", "+" accesible, sin solaparse con la barra inferior ni con el notch) y abre sin conexión

## 11. Service Worker sin copias antiguas de la caché HTTP

Añadido durante la verificación en el móvil (design.md §13): tras desplegar, el móvil seguía mostrando el producto de ejemplo.

- [x] 11.1 Rojo: crear `tests/sw.test.js`, que carga `src/sw.js` en Node con `node:vm` y un entorno simulado (`self`, `caches`, `Request`), lanza `install` y comprueba que se piden todos los archivos de `SHELL_FILES` y que cada petición lleva `cache: 'reload'`; verificar que `npm test` falla
- [x] 11.2 Verde: en `src/sw.js`, precargar con `cache.addAll(SHELL_FILES.map((url) => new Request(url, { cache: 'reload' })))`; verificar que `npm test` pasa, y tras desplegar, que el móvil muestra la versión nueva al reabrir la app (se comprueba en la 10.3)

## Workflow follow-up

- Archivar el cambio (`/opsx:archive`) cuando esté implementado y verificado, para crear la spec principal `product-list` y actualizar `app-navigation`.
- La comprobación de persistencia en el móvil pendiente del cambio `modelo-y-almacenamiento` (tarea 10.2) se hará en el cambio del formulario de alta.
