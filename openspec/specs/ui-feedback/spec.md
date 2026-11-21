# ui-feedback Specification

## Purpose
Define cómo informa la app de lo que acaba de pasar y de lo que está haciendo: los avisos breves (*toasts*) tras guardar o eliminar y los indicadores de carga mientras se leen los datos.

## Requirements

### Requirement: Aviso breve tras guardar o eliminar
Tras guardar un producto (alta o edición), la app SHALL mostrar un aviso breve "Producto guardado"; tras eliminarlo, desde cualquier pantalla, "Producto eliminado". El aviso MUST verse arriba, justo debajo de la cabecera, como una píldora centrada con un check, sin tapar el botón "+"; anunciarse a los lectores de pantalla y desaparecer solo a los 3 segundos. Si llega otro aviso, MUST sustituir al anterior.

#### Scenario: Guardar un producto
- **WHEN** el usuario guarda "Yogur" en Nuevo producto
- **THEN** vuelve al Listado y se ve "Producto guardado" durante unos 3 segundos

#### Scenario: Eliminar desde el Listado
- **WHEN** el usuario elimina "Leche" deslizando su tarjeta y confirma
- **THEN** se ve "Producto eliminado"

#### Scenario: Eliminar desde el Detalle
- **WHEN** el usuario elimina un producto desde su Detalle y confirma
- **THEN** vuelve al Listado y se ve "Producto eliminado"

#### Scenario: Error al guardar
- **WHEN** guardar falla
- **THEN** no se muestra "Producto guardado"; se mantiene el mensaje de error del formulario

#### Scenario: Dos avisos seguidos
- **WHEN** se muestra un aviso y llega otro antes de que desaparezca
- **THEN** solo se ve el último

### Requirement: Indicador de carga
Mientras se leen los productos, el Listado, el Detalle y Editar producto SHALL mostrar "Cargando…" si la lectura tarda más de 300 ms. En lecturas más rápidas MUST NOT mostrarse, para que la pantalla no parpadee. El indicador MUST desaparecer al terminar la lectura, tanto si va bien como si falla.

#### Scenario: Lectura lenta
- **WHEN** leer los productos tarda 1 segundo al abrir el Listado
- **THEN** se ve "Cargando…" hasta que aparece la lista

#### Scenario: Lectura rápida
- **WHEN** leer los productos tarda menos de 300 ms
- **THEN** no llega a verse "Cargando…"

#### Scenario: Lectura fallida
- **WHEN** la lectura tarda y después falla
- **THEN** "Cargando…" se sustituye por el mensaje de error con "Reintentar"
