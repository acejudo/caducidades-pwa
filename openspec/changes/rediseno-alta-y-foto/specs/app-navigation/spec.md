## ADDED Requirements

### Requirement: Volver con cambios sin guardar
Antes de que la flecha de volver de la cabecera deje una pantalla, la app SHALL dejar que esa pantalla lo confirme. Si la pantalla no lo permite (por ejemplo, el usuario decide seguir editando), la app MUST seguir en ella sin cambiar de ruta. Las pantallas que no piden confirmación vuelven directamente, como hasta ahora.

#### Scenario: Pantalla que no deja salir
- **WHEN** el usuario pulsa la flecha de volver en Nuevo producto con un nombre escrito y elige seguir editando
- **THEN** sigue en Nuevo producto y la ruta no cambia

#### Scenario: Pantalla sin confirmación
- **WHEN** el usuario pulsa la flecha de volver en Detalle
- **THEN** vuelve a la pantalla anterior sin ninguna pregunta
