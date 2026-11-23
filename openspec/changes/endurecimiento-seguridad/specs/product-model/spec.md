## MODIFIED Requirements

### Requirement: Validación de un producto
Un producto MUST NOT guardarse si algún campo no es válido. El error SHALL indicar cada campo incorrecto con un mensaje en español. Reglas:
- `nombre` obligatorio, de 1 a 100 caracteres.
- `fechaCaducidad` obligatoria.
- Las fechas deben ser días reales del calendario.
- `cantidad`: número mayor que 0.
- `unidad` no vacía y de 20 caracteres como máximo.
- `categoria` de la lista.
- `notas`, si se indican, de 1000 caracteres como máximo.
- `foto.tipo` válido.
- Si `foto.tipo` es `real`, `foto.valor` MUST ser un nombre de foto válido: un UUID en minúsculas seguido de `.webp` o `.jpg`.

Las longitudes se miden después de recortar los espacios sobrantes.

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

#### Scenario: Nombre de foto real válido
- **WHEN** se crea un producto con `foto: { tipo: "real", valor: "3f2b8c1e-9a4d-4e6f-8b2a-1c5d7e9f0a3b.webp" }`
- **THEN** se guarda con esa foto

#### Scenario: Nombre de foto real no válido
- **WHEN** se intenta guardar un producto con foto real de valor "../caducidades.json", "foto.png" o "ABC.webp"
- **THEN** no se guarda y el error indica el campo `foto`

#### Scenario: Notas demasiado largas
- **WHEN** se intenta guardar un producto con unas notas de 1001 caracteres
- **THEN** no se guarda y el error indica el campo `notas` con un mensaje en español que dice el máximo

#### Scenario: Notas en el límite
- **WHEN** se crea un producto con unas notas de 1000 caracteres
- **THEN** se guarda con esas notas

#### Scenario: Unidad demasiado larga
- **WHEN** se intenta guardar un producto con una unidad de 21 caracteres
- **THEN** no se guarda y el error indica el campo `unidad`
