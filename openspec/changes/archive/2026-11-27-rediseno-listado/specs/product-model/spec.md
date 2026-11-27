## ADDED Requirements

### Requirement: Texto relativo de caducidad
La app SHALL poder describir la caducidad de un producto en español con un texto relativo corto: "Hace N días" si los días restantes son menos de −1, "Ayer" si son −1, "Hoy" si son 0, "Mañana" si es 1 y "En N días" si son más de 1. Este texto MUST NOT sustituir al texto de caducidad, que sigue usándose donde ya se usaba.

#### Scenario: Textos relativos
- **WHEN** se pide el texto relativo para −5, −1, 0, 1 y 9 días restantes
- **THEN** los textos son "Hace 5 días", "Ayer", "Hoy", "Mañana" y "En 9 días"

### Requirement: Sección de caducidad
Cada producto SHALL pertenecer a una sección según sus días restantes: "Caducados" si son negativos, "Esta semana" si están entre 0 y el límite del nivel naranja (7, de la misma configuración compartida que la urgencia) y "Más adelante" si son más. Una lista de productos MUST poder agruparse en esas secciones, en ese orden, omitiendo las vacías y conservando el orden de los productos dentro de cada una.

#### Scenario: Límites de las secciones
- **WHEN** se calcula la sección para −1, 0, 7 y 8 días restantes
- **THEN** las secciones son "Caducados", "Esta semana", "Esta semana" y "Más adelante"

#### Scenario: Agrupar sin secciones vacías
- **WHEN** se agrupan, ya ordenados, "Yogur" (−2 días), "Leche" (3 días) y "Queso" (5 días)
- **THEN** resultan dos secciones: "Caducados" con "Yogur" y "Esta semana" con "Leche" y "Queso", en ese orden, sin "Más adelante"
