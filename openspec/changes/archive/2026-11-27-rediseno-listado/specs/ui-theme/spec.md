## ADDED Requirements

### Requirement: Zona táctil mínima
Los botones, los accesos de la cabecera y cualquier otro control interactivo MUST tener una zona táctil de al menos 44×44 px.

#### Scenario: Acceso a Ajustes de la cabecera
- **WHEN** se mide el icono "Ajustes" de la cabecera de Listado en un móvil
- **THEN** su zona táctil mide 44 px o más de alto y de ancho


## MODIFIED Requirements

### Requirement: Ajustes en una sola pantalla
Ajustes SHALL caber entero, sin scroll, en una pantalla de 390×740 px: las secciones de sincronización, avisos y cuenta y el botón "Cerrar sesión", por encima de la zona segura inferior. El margen inferior MUST dejar visible el último elemento, sin espacio sobrante que permita desplazar la pantalla. Los controles MUST conservar el tamaño táctil mínimo.

#### Scenario: Ajustes sin scroll
- **WHEN** el usuario abre Ajustes en una pantalla de 390×740 px, con la lista sin sincronizar
- **THEN** ve todas las secciones y "Cerrar sesión" sin desplazar la pantalla, y la página no se puede desplazar

#### Scenario: Cerrar sesión por encima de la navegación
- **WHEN** se muestra Ajustes
- **THEN** "Cerrar sesión" queda entero por encima de la zona segura inferior y mide al menos 44 px de alto

### Requirement: Respeto de zonas seguras
El diseño SHALL dejar margen en las zonas seguras del dispositivo para que la cabecera y el botón flotante "Añadir" no queden tapados por el notch ni por la barra de inicio cuando la app se abre instalada.

#### Scenario: iPhone con notch en modo instalado
- **WHEN** la app instalada se abre en un iPhone con notch
- **THEN** la cabecera queda por debajo del notch y el botón "Añadir" por encima de la barra de inicio

## REMOVED Requirements

### Requirement: Tamaño táctil mínimo
**Reason**: Su escenario medía la barra de navegación inferior, que desaparece.
**Migration**: Lo sustituye "Zona táctil mínima", con la misma regla de 44×44 px para todos los controles y el escenario del acceso a Ajustes de la cabecera.
