# Spec Delta

## Purpose

Establece el sistema visual común de Caducidades según `DESIGN.md` (colores, colores de urgencia, tipografía, formas y tamaños táctiles) para que todas las pantallas tengan un aspecto coherente y fácil de mantener.

## ADDED Requirements

### Requirement: Tokens de diseño centralizados
Los colores, radios, sombras, espaciados y tamaños tipográficos SHALL definirse en un único lugar como valores con nombre que reutilizan todas las pantallas. Los valores MUST coincidir con `DESIGN.md` §2: primario `#2563EB`, fondo `#FFFFFF`, texto `#111827`, texto secundario `#6B7280`, bordes `#E5E7EB` y fondo de inputs `#F9FAFB`.

#### Scenario: Cambio de color primario
- **WHEN** se cambia el valor del token del color primario
- **THEN** todos los botones primarios y el elemento activo de la navegación cambian de color sin tocar otros estilos

### Requirement: Colores de urgencia
El sistema visual SHALL definir tres colores de urgencia con nombre: rojo `#EF4444` (caducado o de 0 a 2 días), naranja `#F97316` (de 3 a 7 días) y verde `#22C55E` (más de 7 días), disponibles para barras laterales, badges e indicadores.

#### Scenario: Uso del color de urgencia
- **WHEN** un elemento se marca con el nivel de urgencia "rojo"
- **THEN** su indicador se pinta en `#EF4444`

### Requirement: Tipografía del sistema
La interfaz SHALL usar la fuente sans-serif del sistema (San Francisco en iOS, Roboto en Android) sin descargar fuentes externas, con una jerarquía de tamaños y pesos para título de pantalla, nombre de producto, fecha y texto secundario.

#### Scenario: Carga sin fuentes externas
- **WHEN** la app se carga sin conexión
- **THEN** el texto se muestra con la fuente del sistema y no hay peticiones a servicios de fuentes

### Requirement: Tamaño táctil mínimo
Los botones, los elementos de la navegación y cualquier otro control interactivo MUST tener una zona táctil de al menos 44×44 px.

#### Scenario: Botón de navegación inferior
- **WHEN** se mide un acceso de la barra de navegación inferior en un móvil
- **THEN** su zona táctil mide 44 px o más de alto y de ancho

### Requirement: Respeto de zonas seguras
El diseño SHALL dejar margen en las zonas seguras del dispositivo para que la cabecera, la navegación inferior y el botón flotante no queden tapados por el notch ni por la barra de inicio cuando la app se abre instalada.

#### Scenario: iPhone con notch en modo instalado
- **WHEN** la app instalada se abre en un iPhone con notch
- **THEN** la cabecera queda por debajo del notch y la navegación inferior por encima de la barra de inicio

### Requirement: Estilo base de componentes
El sistema visual SHALL incluir estilos base para botón primario (fondo azul, texto blanco, esquinas muy redondeadas), botón secundario, botón de peligro, botón flotante circular y cabecera de pantalla, coherentes con `DESIGN.md` §4.

#### Scenario: Botón primario
- **WHEN** se pinta un botón marcado como primario
- **THEN** tiene fondo `#2563EB`, texto blanco, esquinas redondeadas y una altura de al menos 44 px
