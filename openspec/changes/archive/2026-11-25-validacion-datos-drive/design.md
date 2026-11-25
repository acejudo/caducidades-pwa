# Diseño: validacion-datos-drive

## Contexto

La motivación está en `proposal.md` y los requisitos, en las specs delta. Estado actual del código que se toca:

**`sincronizacion.js`** (puro, se prueba en Node):
- `productoDelArchivo` solo pide que `id` sea un texto no vacío y que `Date.parse(actualizado)` no dé `NaN`.
- Después normaliza con `normalizarProducto` y valida con `validarProducto`.
- `huella` une `id@actualizado@eliminado` con `|`.

**`productos.js`:**
- `validarProducto` solo exige que la cantidad sea un número finito mayor que 0.
- `NOMBRE_FOTO_REAL` ya incluye la expresión de un UUID en minúsculas.
- No puede importar `fotos.js`, porque `fotos.js` ya importa `productos.js`.

**`fotos.js`:** es puro y exporta `buscarFoto(id)`, que devuelve `null` si el id no está en el catálogo.

**`drive.js`:** `listarFotos` pide páginas de 1000 archivos hasta que no queda `nextPageToken`, sin tope.

**`formulario.js`:** `activarCantidad` desactiva el − con `!(n > 1)` y deja siempre activo el +.

**Pruebas que dependen de los ids:** los ayudantes `producto(id)` de `tests/sincronizacion.test.js` y de `tests/navegador/sincronizador.test.js` usan ids cortos (`'a'`, `'b'`…). Con la regla nueva, `leerArchivo` los descartaría.

## Objetivos / No objetivos

**Objetivos**
- Que la lectura del archivo de Drive solo acepte productos con el mismo formato que escribe la app.
- Un único tope de cantidad, compartido por el formulario y la lectura.

**No objetivos**
- Revalidar los productos que ya están guardados en el dispositivo. Los que ha escrito la app ya cumplen las reglas.
- Validar la foto predeterminada al guardar desde el formulario: Elegir foto solo ofrece las del catálogo.
- Cambiar el formato del archivo ni la regla de fusión.

## Decisiones

### 1. Formato del `id` en `productos.js`
- Se exporta `esIdProducto(valor)`, con la expresión del UUID en minúsculas que ya usa `NOMBRE_FOTO_REAL`. Las dos reglas salen de la misma constante.
- La usa `productoDelArchivo`.
- No entra en `validarProducto`, que valida los campos editables y no recibe el `id`.

*Alternativa descartada:* aceptar también mayúsculas. La app genera los ids con `crypto.randomUUID()`, que siempre da minúsculas. Admitir las dos formas permitiría dos ids distintos para el mismo producto.

### 2. Formato de `actualizado` en `sincronizacion.js`
`esFechaHora` pasa a exigir las dos cosas:
- **La forma:** `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$`.
- **Una fecha real:** `Date.parse` no da `NaN`.

Con la zona siempre presente, `Date.parse` da el mismo instante en cualquier dispositivo. El `actualizado` se guarda tal cual llega. El margen de "Fechas de modificación en el futuro" se sigue aplicando igual.

*Alternativa descartada:* normalizar a UTC (`toISOString`) al leer. Cambiaría la huella de productos que no han cambiado y obligaría a subir la lista sin motivo.

### 3. Foto predeterminada desconocida
En `productoDelArchivo`:
- Si `foto.tipo` es `predeterminada` y `buscarFoto(foto.valor)` da `null`, la foto pasa a `{ tipo: 'ninguna', valor: null }`.
- El resultado se marca `corregido: true`. Es el mismo mecanismo que usa la fecha futura: `leerArchivo` cuenta los corregidos y el sincronizador sube aunque la fusión no cambie nada.
- La corrección se hace **antes** de `validarProducto`.
- `sincronizacion.js` importa `buscarFoto` de `fotos.js`. Los dos son puros y no se crea ningún ciclo.

Si un producto tiene a la vez la fecha futura y la foto desconocida, se aplican las dos correcciones y queda un solo `corregido: true`.

### 4. `CANTIDAD_MAX` en `constantes.js`
- `CANTIDAD_MAX = 9999`.
- En `validarProducto`, si la cantidad es válida pero mayor que el máximo, el mensaje es "La cantidad no puede ser mayor que 9999", construido con la constante.
- El mensaje actual ("debe ser un número mayor que 0") sigue para los demás casos.
- `formulario.js` importa la constante. El + se desactiva cuando `Number.isFinite(n) && n + 1 > CANTIDAD_MAX`. Con un texto no válido sigue activo, porque al pulsarlo pone 1, como ahora.

### 5. Huella con `JSON.stringify`
`huella` escribe cada producto como la tupla JSON `[id, actualizado, eliminado]`, ordena esos textos y los une en un array JSON. El escapado de JSON hace imposible que dos listas distintas den el mismo texto.

*Alternativa descartada:* escapar los separadores a mano. Sería más código y más fácil equivocarse.

### 6. Tope en `listarFotos`
- `FOTOS_LISTADO_MAX = PRODUCTOS_MAX` en `constantes.js`.
- `listarFotos` deja de pedir páginas cuando ya tiene el tope, y recorta a ese número si la última página lo pasa.
- `pageSize` sigue en 1000.
- La consulta pide `orderBy: 'createdTime desc'`: si se llega al tope, entran las fotos más recientes, que son las que más probablemente faltan en algún dispositivo.

En la práctica, la carpeta no llega a 2000 fotos, porque la lista tiene como mucho 2000 productos y las fotos sin usar se limpian.

### 7. Ayudantes de las pruebas
`producto(id)` pasa a convertir el id corto en un UUID determinista. Por ejemplo, `uuid('a')` da `00000000-0000-4000-8000-0000000000a1`, a partir del código del carácter en hexadecimal. Así las pruebas existentes siguen legibles.

Las comparaciones por id (`ids(...)`, `porId`) usan el mismo ayudante. Este cambio va en la primera tarea Rojo, que debe dejar en verde todas las pruebas existentes y en rojo solo las nuevas.

### 8. Estrategia de pruebas
- **Node (`npm test`):**
  - `tests/productos.test.js`: cantidad máxima y `esIdProducto`.
  - `tests/sincronizacion.test.js`: id UUID, `actualizado` con zona, foto predeterminada desconocida y huella.
  - `tests/drive.test.js`: tope del listado, sin pedir más páginas, y `orderBy`.
- **Navegador (`npm run test:navegador`):**
  - `tests/navegador/formulario.test.js`: el + desactivado en el máximo y el error al guardar 10000.
  - `tests/navegador/sincronizador.test.js`: subida de la versión corregida cuando la foto predeterminada es desconocida, con el Drive doble.
- **Manual:** sincronizar en el móvil tras desplegar y comprobar que la lista real se sigue leyendo entera, sin productos perdidos.

## Riesgos / Contrapartidas

- **[Riesgo]** Un archivo real con productos que no cumplan las reglas nuevas los perdería en los dispositivos que aún no los tengan. → La app siempre ha escrito UUID en minúsculas, `actualizado` con `toISOString()` y fotos del catálogo, así que no debería haber ninguno. La comprobación manual tras desplegar lo confirma.
- **[Riesgo]** Un producto con id no válido que ya estuviera en el dispositivo se seguiría subiendo, y la lectura lo ignoraría siempre, así que cada sincronización volvería a subir. → No existe ninguno por la misma razón. Queda fuera del alcance (ver No objetivos).
- **[Contrapartida]** Con más de 2000 fotos en la carpeta, una foto pendiente que ya esté en Drive pero fuera del listado se subiría otra vez. → El duplicado es inofensivo: se usa el primero por nombre y la limpieza lo borra cuando deja de usarse.

## Plan de despliegue

Un solo despliegue. Es compatible con los archivos existentes y no hay migración de datos. Si hiciera falta volver atrás, basta con revertir el commit: el formato del archivo no cambia.
