# Spec Delta

## MODIFIED Requirements

### Requirement: Rutas de pantalla
La app SHALL ofrecer una ruta direccionable en la URL para cada pantalla de `docs/SPEC.md` §5: Login, Listado, Nuevo producto, Detalle de producto (con id), Editar producto (con id), Elegir foto y Ajustes. Elegir foto MUST tener una ruta por formulario de origen: una para Nuevo producto y otra para Editar producto (con id), de modo que sepa a qué formulario devolver la foto. Al entrar en una ruta, la app MUST mostrar la pantalla correspondiente con su título en español, aunque su contenido aún sea un marcador vacío.

#### Scenario: Acceso directo a una ruta
- **WHEN** el usuario abre la app con la URL de la pantalla Ajustes
- **THEN** se muestra la pantalla Ajustes con el título "Ajustes"

#### Scenario: Ruta con parámetro
- **WHEN** el usuario navega al detalle del producto con id `abc123`
- **THEN** se muestra la pantalla Detalle y esta recibe el id `abc123`

#### Scenario: Elegir foto de una edición
- **WHEN** el usuario navega a Elegir foto de Editar producto `abc123`
- **THEN** se muestra Elegir foto con el título "Elegir foto" y esta sabe que su formulario de origen es la edición de `abc123`

#### Scenario: Ruta antigua de Elegir foto
- **WHEN** el usuario abre la ruta `/elegir-foto`
- **THEN** se trata como una ruta inexistente y se muestra Listado

### Requirement: Flecha de volver en pantallas secundarias
Las pantallas Nuevo producto, Detalle, Editar producto y Elegir foto SHALL mostrar en la cabecera una flecha de volver. Al pulsarla, la app MUST volver a la pantalla anterior de la propia app; si no hay ninguna (se entró directamente por URL), MUST ir a la pantalla padre de la ruta. La pantalla padre de Elegir foto MUST ser su formulario de origen. Listado, Ajustes y Login MUST NOT mostrar la flecha.

#### Scenario: Volver tras navegar dentro de la app
- **WHEN** el usuario va de Listado a Detalle y pulsa la flecha de volver
- **THEN** se muestra Listado

#### Scenario: Volver tras entrar directamente por URL
- **WHEN** el usuario abre la app directamente en Editar producto `abc123` y pulsa la flecha de volver
- **THEN** se muestra el Detalle del producto `abc123`

#### Scenario: Volver de Elegir foto tras entrar por URL
- **WHEN** el usuario abre la app directamente en Elegir foto de Editar producto `abc123` y pulsa la flecha de volver
- **THEN** se muestra Editar producto `abc123`

#### Scenario: Sin flecha en pantallas principales
- **WHEN** se muestra Listado o Ajustes
- **THEN** la cabecera no tiene flecha de volver
