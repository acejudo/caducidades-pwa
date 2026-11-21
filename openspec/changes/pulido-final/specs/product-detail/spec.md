# Spec Delta

## ADDED Requirements

### Requirement: Foto real en el Detalle
En el Detalle, una foto real SHALL mostrarse a todo el ancho en proporción 4:3, recortada para llenar el recuadro sin deformarse. Las fotos predeterminadas y el icono genérico se siguen mostrando centrados, sin recorte.

#### Scenario: Foto vertical
- **WHEN** se abre el Detalle de un producto con una foto real vertical
- **THEN** la foto ocupa un recuadro 4:3 a todo el ancho, sin deformarse

### Requirement: Ver la foto a pantalla completa
Al tocar una foto real en el Detalle, la app SHALL mostrarla entera, sin recortar, sobre un fondo oscuro que ocupa toda la pantalla, con un botón "Cerrar". También MUST cerrarse con Escape o tocando fuera de la foto. Las fotos predeterminadas y el icono genérico MUST NOT abrir esta vista.

#### Scenario: Abrir y cerrar la foto
- **WHEN** el usuario toca la foto real en el Detalle y después pulsa "Cerrar"
- **THEN** ve la foto entera a pantalla completa y, al cerrar, vuelve al Detalle tal como estaba

#### Scenario: Foto predeterminada
- **WHEN** el usuario toca la foto predeterminada "Leche" en el Detalle
- **THEN** no se abre ninguna vista a pantalla completa
