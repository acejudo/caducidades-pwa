# product-model Specification

## Purpose

Define qué es un producto en Caducidades (sus campos, valores por defecto y reglas de validación) y las reglas de dominio sobre su caducidad: días restantes, nivel de urgencia, texto de caducidad y orden del listado.

## Requirements

### Requirement: Campos de un producto
Un producto SHALL tener los campos de `docs/SPEC.md` §4.1: `id`, `nombre`, `fechaCompra`, `fechaCaducidad`, `cantidad`, `unidad`, `categoria`, `foto` (`tipo` y `valor`), `notas` y `actualizado`, más `eliminado` (booleano). Las fechas MUST guardarse como texto `YYYY-MM-DD` y `actualizado` como fecha y hora ISO 8601 en UTC.

#### Scenario: Producto completo
- **WHEN** se crea un producto con todos los campos rellenos
- **THEN** el producto guardado conserva cada valor y tiene además `id`, `actualizado` y `eliminado: false`

### Requirement: Valores por defecto
Al crear un producto, los campos opcionales que no se indiquen SHALL tomar estos valores: `fechaCompra: null`, `cantidad: 1`, `unidad: 'ud'`, `categoria: 'Nevera'`, `foto: { tipo: 'ninguna', valor: null }` y `notas: null`.

#### Scenario: Alta mínima
- **WHEN** se crea un producto indicando solo el nombre "Yogur" y la fecha de caducidad
- **THEN** el producto tiene cantidad 1, unidad "ud", categoría "Nevera", sin fecha de compra, sin notas y con foto de tipo "ninguna"

### Requirement: Normalización de texto
Antes de validar, los campos de texto SHALL normalizarse quitando los espacios del principio y del final. Un texto opcional (`notas`, `fechaCompra`) que quede vacío MUST guardarse como `null`.

#### Scenario: Espacios sobrantes
- **WHEN** se crea un producto con nombre "  Leche  " y notas "   "
- **THEN** el nombre guardado es "Leche" y las notas son `null`

### Requirement: Validación de un producto
Un producto MUST NOT guardarse si algún campo no es válido. El error SHALL indicar cada campo incorrecto con un mensaje en español. Reglas: `nombre` obligatorio (1 a 100 caracteres); `fechaCaducidad` obligatoria; las fechas deben ser días reales del calendario; `cantidad` número mayor que 0; `unidad` no vacía; `categoria` de la lista; `foto.tipo` válido.

#### Scenario: Faltan los obligatorios
- **WHEN** se intenta crear un producto sin nombre y sin fecha de caducidad
- **THEN** no se guarda nada y el error indica los campos `nombre` y `fechaCaducidad`, cada uno con su mensaje en español

#### Scenario: Fecha inexistente
- **WHEN** se intenta guardar un producto con fecha de caducidad "2026-02-30"
- **THEN** no se guarda y el error indica el campo `fechaCaducidad`

#### Scenario: Cantidad no válida
- **WHEN** se intenta guardar un producto con cantidad 0 o con un texto en lugar de un número
- **THEN** no se guarda y el error indica el campo `cantidad`

#### Scenario: Categoría desconocida
- **WHEN** se intenta guardar un producto con la categoría "Garaje"
- **THEN** no se guarda y el error indica el campo `categoria`

#### Scenario: Cantidad decimal
- **WHEN** se crea un producto con cantidad 0.5 y unidad "kg"
- **THEN** se guarda con cantidad 0.5

### Requirement: Identificador único
Cada producto nuevo SHALL recibir un identificador único generado por la app, que MUST NOT cambiar durante la vida del producto. El identificador no lo elige el usuario.

#### Scenario: Altas consecutivas
- **WHEN** se crean dos productos con los mismos datos
- **THEN** cada uno tiene un `id` distinto

#### Scenario: Id inmutable
- **WHEN** se edita un producto indicando un `id` diferente en los cambios
- **THEN** el producto conserva su `id` original

### Requirement: Días restantes
Los días restantes de un producto SHALL calcularse como la diferencia en días naturales entre su fecha de caducidad y la fecha de hoy en la zona horaria del dispositivo, sin depender de la hora del día ni de los cambios de horario de verano.

#### Scenario: Caduca hoy
- **WHEN** la fecha de caducidad es la de hoy, sea cual sea la hora actual
- **THEN** los días restantes son 0

#### Scenario: Caducado ayer
- **WHEN** la fecha de caducidad fue ayer
- **THEN** los días restantes son -1

#### Scenario: Cambio de hora
- **WHEN** hoy es 2026-03-28 y la fecha de caducidad es 2026-03-30 (el horario de verano empieza en medio)
- **THEN** los días restantes son 2

### Requirement: Nivel de urgencia
El nivel de urgencia SHALL ser `rojo` si los días restantes son 2 o menos (incluido caducado), `naranja` si están entre 3 y 7, y `verde` si son más de 7. Los límites MUST salir de una única configuración compartida, y los nombres de nivel coinciden con los colores de urgencia de `ui-theme`.

#### Scenario: Límites de los niveles
- **WHEN** se calcula el nivel para -3, 0, 2, 3, 7 y 8 días restantes
- **THEN** los niveles son rojo, rojo, rojo, naranja, naranja y verde respectivamente

### Requirement: Texto de caducidad
La app SHALL describir la caducidad de un producto en español: "¡Caducado!" si los días restantes son negativos, "Caduca hoy" si son 0, "Caduca mañana" si es 1 y "Caduca en N días" si son más.

#### Scenario: Textos
- **WHEN** se pide el texto para -1, 0, 1 y 5 días restantes
- **THEN** los textos son "¡Caducado!", "Caduca hoy", "Caduca mañana" y "Caduca en 5 días"

### Requirement: Orden por caducidad
Una lista de productos SHALL poder ordenarse por fecha de caducidad ascendente (los más próximos o ya caducados primero). Con la misma fecha, MUST ordenarse por nombre en orden alfabético español sin distinguir mayúsculas ni acentos, y después por `id`, para que el orden sea siempre el mismo.

#### Scenario: Orden del listado
- **WHEN** se ordenan "Queso" (2026-11-20), "atún" (2026-11-12) y "Arroz" (2026-11-12)
- **THEN** el orden es "Arroz", "atún", "Queso"
