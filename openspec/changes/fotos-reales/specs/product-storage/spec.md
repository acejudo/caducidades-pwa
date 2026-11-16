# Spec Delta

## ADDED Requirements

### Requirement: Fotos reales en el dispositivo
El almacenamiento local SHALL guardar cada foto real como imagen binaria con su nombre, si ya está en Drive y cuándo se guardó, y MUST permitir leerla por nombre, listarlas sin cargar las imágenes y borrarla, también sin conexión. Las fotos MUST conservarse al cerrar la app y al cerrar sesión, como los productos.

#### Scenario: Guardar y leer una foto
- **WHEN** se guarda una foto con nombre `<uuid>.webp` y se cierra y se vuelve a abrir la app
- **THEN** al leer ese nombre se obtiene la misma imagen, con el mismo tipo y tamaño

#### Scenario: Foto que no existe
- **WHEN** se lee una foto que no está guardada
- **THEN** el resultado es vacío, sin error

#### Scenario: Marcar como subida
- **WHEN** una foto guardada como no subida se marca como subida
- **THEN** al listar las fotos aparece como subida y la imagen no ha cambiado

### Requirement: Migración a la versión 2
Al abrir una base de datos de la versión 1, la app SHALL actualizarla a la versión 2 añadiendo el almacén de fotos, y MUST conservar todos los productos que había, también los eliminados.

#### Scenario: Dispositivo con datos de la versión 1
- **WHEN** el dispositivo tiene una base de datos de la versión 1 con los productos "Leche" y "Pan" (este último eliminado) y se abre la app nueva
- **THEN** se siguen leyendo "Leche" y el registro eliminado de "Pan", y se pueden guardar fotos
