# Tareas

> Se aplica después de `rediseno-listado`.

## 1. Sugerencia de foto y plazos (Node)

- [ ] 1.1 Rojo: en `tests/fotos.test.js`, `tests/productos.test.js` y `tests/constantes.test.js`, con el nombre de cada escenario. Verificar que fallan con `npm test`.
  - `sugerirFoto`:
    - "Palabra dentro del nombre";
    - "Plural y mayúsculas": "TOMATES" y "Salmon ahumado";
    - "Sin coincidencias parciales": "Panceta" y "Lechuga";
    - "Nombre sin sugerencia": "Kiwi", "Genérico", vacío y solo espacios;
    - "Huevos" → `huevos` y "YOGUR griego" → `yogur`.
  - `sumarPlazo`:
    - `2026-11-25` +3 días → `2026-11-28` y +7 días → `2026-12-02`;
    - `2026-03-28` +3 días → `2026-03-31`, con el cambio de hora;
    - "Un mes desde el día 31": `2027-01-31` +1 mes → `2027-02-28` y `2028-01-31` → `2028-02-29`;
    - `2026-12-15` +1 mes → `2027-01-15`.
  - `PLAZOS`: textos y valores, en orden.
- [ ] 1.2 Verde (design §1 y §4): `sugerirFoto` en `fotos.js` (con `simplificar` de `formato.js`), `sumarPlazo` en `productos.js` y `PLAZOS` en `constantes.js`. Verificar con `npm test` en verde.

## 2. Volver sin guardar en lugar de "Cancelar" (navegador)

- [ ] 2.1 Rojo: en `tests/navegador/formulario.test.js`. Verificar que fallan con `npm run test:navegador`.
  - Las pruebas de "Cancelar" pasan a los escenarios nuevos y llaman a `antesDeVolver()` de la pantalla:
    - "Volver sin cambios" devuelve `true`, sin llamar a `confirmar`;
    - "Volver con cambios y seguir editando" devuelve `false` y conserva el nombre;
    - "Volver con cambios y descartar" devuelve `true` y descarta el borrador;
    - "Cancelar el alta sin tocar nada";
    - "Cancelar tras cambiar la foto";
    - "Cancelar con foto real".

    Estos tres conservan el nombre del escenario de la spec, aunque ahora se vuelve con la flecha.
  - "Botones en una fila": no hay ningún botón "Cancelar" y `antesDeVolver` es una función tanto en el alta como en la edición.
- [ ] 2.2 Verde (design §7):
  - En `formulario.js`, `prepararVolver` y `antesDeVolver` en el resultado, sin el botón "Cancelar".
  - En `ui.js`, la flecha llama a `antesDeVolver` si existe y solo después a `volver()`.
  - En el CSS, "Guardar" a todo el ancho.

  Verificar con `npm test` y `npm run test:navegador` en verde.

## 3. Miniatura junto al nombre y foto sugerida (navegador)

- [ ] 3.1 Rojo: en `tests/navegador/formulario.test.js`. Verificar que fallan con `npm run test:navegador`.
  - "Alta sin foto", "Edición con foto" y "Edición con foto real":
    - la miniatura está en la misma fila que Nombre (mismo `top` ±1 px) y lleva a Elegir foto;
    - su nombre accesible es el del escenario.
  - "Sugerencia al escribir" (incluido el producto guardado), "La sugerencia cambia con el nombre", "Foto elegida a mano", "Sin foto elegida a mano", "Edición conserva su foto" y "Edición sin foto".
  - La preferencia sobrevive al borrador: elegir "Queso", ir a Elegir foto, volver sin elegir y escribir "Leche" → sigue "Queso".
  - "Ir a Elegir foto y volver", "Volver sin elegir conserva la foto" y "Borrador descartado al guardar" siguen en verde.
  - En `tests/navegador/elegir-foto.test.js`: elegir cualquier opción deja el borrador con la foto marcada como elegida a mano.
- [ ] 3.2 Verde (design §2 y §3): `miniaturaDeFoto` con `repintar`, `fotoElegida` en el formulario y en el borrador, sugerencia en el `input` del nombre y el CSS de `.formulario__cabeza` y `.miniatura-foto`. Verificar con `npm run test:navegador` en verde.

## 4. Plazos rápidos y ayuda de la fecha (navegador)

- [ ] 4.1 Rojo: en `tests/navegador/formulario.test.js`, con `hoy` inyectado. Verificar que fallan con `npm run test:navegador`.
  - "Una semana", "Un mes desde el día 31", "Plazo y error" y "Fecha elegida a mano".
  - El texto relativo tiene la clase de urgencia y `aria-describedby` del campo incluye la ayuda y, con un error, también el error.
  - Los plazos son `type="button"`, miden al menos 44 px de alto con `styles.css` y no envían el formulario.
- [ ] 4.2 Verde (design §4): fila de plazos, ayuda junto a la etiqueta, `aria-pressed`, ajuste de `mostrarErrores` y `limpiarError`, y CSS. Verificar con `npm run test:navegador` en verde.

## 5. "Dónde lo guardas" y notas plegadas (navegador)

- [ ] 5.1 Rojo: en `tests/navegador/formulario.test.js`. Verificar que fallan con `npm run test:navegador`.
  - "Formulario de alta vacío": el orden nuevo, "Nevera" marcada, "Añadir notas" y "Guardar" sin "Cancelar".
  - "Formulario de edición relleno": la ubicación del producto está marcada.
  - "Elegir dónde se guarda": "Congelador".
  - Las cuatro opciones son radios con su etiqueta visible, dentro de un `fieldset` con la leyenda "Dónde lo guardas", y cada una mide al menos 44 px de alto.
  - "Alta con las notas plegadas", "Desplegar las notas" (el foco pasa al `<textarea>`) y "Edición con notas".
  - Un borrador con notas vuelve desplegado.
  - Desplegar no cuenta como cambio: volver sin escribir no pregunta.
- [ ] 5.2 Verde (design §5 y §6): `fieldset` con radios y `controles.categoria = form.elements.categoria`; botón de notas plegadas con `aria-expanded`. Verificar con `npm run test:navegador` en verde.

## 6. Alto a 390×740 (navegador)

- [ ] 6.1 Rojo: en `tests/navegador/formulario.test.js`, con `ALTO_DISPONIBLE = 740 − 56 − 16`. Verificar que fallan, si fallan, con `npm run test:navegador`.
  - "Alta sin scroll" con la estructura nueva.
  - "Edición sin scroll" con notas de dos líneas desplegadas y una foto predeterminada.
  - "Sin alto añadido" de la fecha de compra sigue igual.
  - "Eliminar al final de la edición".
- [ ] 6.2 Verde (design §8): ajustar los espaciados en `styles.css` lo justo, sin bajar de 44 px ningún control. Verificar con `npm run test:navegador` en verde.

## 7. Elegir foto (navegador)

- [ ] 7.1 Rojo: en `tests/navegador/elegir-foto.test.js`. Verificar que fallan con `npm run test:navegador`.
  - "Cuadrícula completa": "Sin foto" es la primera casilla, "Genérico" la última, y con `styles.css` a 390 px hay 4 casillas por fila (mismo `top` en las cuatro primeras y distinto en la quinta).
  - "Foto actual marcada", y "Sin foto" marcada solo si el borrador dice que se eligió.
  - "Botones arriba": "Hacer foto" y "Galería" están antes del buscador en el orden del documento y en la misma fila. "Galería" tiene el nombre accesible "Elegir de la galería".
  - "Quitar la foto" y "Sin foto con búsqueda vacía".
  - Las pruebas de cámara, galería, compresión, "Preparando foto…" y "Doble elección" siguen en verde. "Sin foto" también queda bloqueada mientras se prepara.
- [ ] 7.2 Verde (design §9): orden nuevo en `elegir-foto.js`, "Sin foto" como casilla y CSS de 4 columnas. Verificar con `npm run test:navegador` en verde.

## 8. Documentación y comprobación visual

- [ ] 8.1 Actualizar la documentación:
  - `docs/SPEC.md` §5.2 y §5.3;
  - `docs/DESIGN.md` §4.3, §5.2 y §5.3: miniatura, sugerencia, plazos, "Dónde lo guardas", notas plegadas, solo "Guardar" y el orden nuevo de Elegir foto.
- [ ] 8.2 Comprobación visual con `node scripts/captura-app.mjs --alto 740` en el scratchpad:
  - `producto/nuevo` vacío;
  - `producto/nuevo` con un recorrido que escribe "Pechuga de pollo" y pulsa "+1 semana";
  - la edición de un producto completo con notas;
  - `producto/nuevo/foto`.

  En las dos primeras, el resultado debe dar `scrollHeight === clientHeight`. Comparar con el lienzo acordado y comprobar que no hay errores de consola ni de la CSP.

## 9. Verificación final y despliegue

- [ ] 9.1 Verificación final: `npm test` y `npm run test:navegador` en verde.
- [ ] 9.2 Antes del *commit*: repasar el diff con la regla de `CLAUDE.md` y comprobar que la carpeta del cambio va en el mismo *push* que el código.
- [ ] 9.3 Manual (usuario), tras desplegar y abrir y cerrar la app una vez en el móvil:
  - Al escribir el nombre se pone la ilustración.
  - Los plazos rellenan la fecha y el calendario nativo sigue funcionando.
  - "Dónde lo guardas" funciona con un toque.
  - La flecha pregunta si hay cambios.
  - "Hacer foto" y "Galería" abren la cámara y las fotos.
  - Nuevo y Editar no se desplazan.

## Seguimiento del flujo

- Archivar con `/opsx:archive` cuando todas las tareas estén hechas y actualizar la tabla de `CLAUDE.local.md`.
