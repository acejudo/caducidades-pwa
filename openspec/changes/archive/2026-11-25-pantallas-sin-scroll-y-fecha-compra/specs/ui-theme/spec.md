## ADDED Requirements

### Requirement: Ajustes en una sola pantalla
Ajustes SHALL caber entero, sin scroll, en una pantalla de 390×740 px: las secciones de sincronización, avisos y cuenta y el botón "Cerrar sesión", por encima de la navegación inferior. El margen inferior MUST dejar visible el último elemento sobre la navegación, sin espacio sobrante que permita desplazar la pantalla. Los controles MUST conservar el tamaño táctil mínimo.

#### Scenario: Ajustes sin scroll
- **WHEN** el usuario abre Ajustes en una pantalla de 390×740 px, con la lista sin sincronizar
- **THEN** ve todas las secciones y "Cerrar sesión" sin desplazar la pantalla, y la página no se puede desplazar

#### Scenario: Cerrar sesión por encima de la navegación
- **WHEN** se muestra Ajustes
- **THEN** "Cerrar sesión" queda entero por encima de la navegación inferior y mide al menos 44 px de alto
