# Caducidades – Guía de Diseño (UI Guide)

**Versión:** 1.0  
**Fecha:** 20 de octubre de 2026  
**Estado:** Guía visual oficial del proyecto

Este documento define el estilo visual y la estructura de las pantallas de la aplicación **Caducidades**.  
Las imágenes generadas durante la fase de diseño (mockups) son la referencia visual principal.  
Cualquier implementación debe respetar este documento y las capturas de pantalla asociadas.

---

## 1. Estilo General

- **Estilo**: Moderno, limpio y minimalista
- **Inspiración**: Diseño tipo iOS / Material Design suave
- **Fondo principal**: Blanco (`#FFFFFF`)
- **Bordes**: Redondeados (8–16 px)
- **Sombras**: Suaves y sutiles
- **Espaciado**: Generoso y aireado
- **Idioma de la interfaz**: Español

### Principios de diseño
- Claridad primero: la información más importante (fecha de caducidad) debe destacar
- Poco ruido visual
- Feedback visual claro (colores de urgencia, estados de botones, etc.)
- Experiencia táctil agradable (botones grandes, zonas de toque amplias)

---

## 2. Paleta de Colores

### Colores principales
| Uso                        | Color          | Código aproximado |
|---------------------------|----------------|-------------------|
| Primario (botones, acentos) | Azul           | `#2563EB` / `#3B82F6` |
| Fondo                     | Blanco         | `#FFFFFF`         |
| Texto principal           | Negro suave    | `#111827`         |
| Texto secundario          | Gris           | `#6B7280`         |
| Bordes / divisores        | Gris claro     | `#E5E7EB`         |
| Fondo de inputs           | Gris muy claro | `#F9FAFB`         |

### Colores de urgencia (muy importantes)
| Estado                     | Color     | Uso                              |
|---------------------------|-----------|----------------------------------|
| Caducado o 0-2 días       | Rojo      | `#EF4444` o similar              |
| 3-7 días                  | Naranja   | `#F97316` o similar              |
| Más de 7 días             | Verde     | `#22C55E` o similar              |

Estos colores se usan en:
- Barra lateral o borde izquierdo de cada producto en el listado
- Badges de “Caduca en X días” / “¡Caducado!”
- Indicadores visuales en el detalle del producto

---

## 3. Tipografía

- **Fuente principal**: Sans-serif moderna del sistema  
  (San Francisco en iOS, Roboto / system-ui en Android)
- **Títulos de pantalla**: Negrita, tamaño grande
- **Nombre de producto**: Semi-bold
- **Fechas y metadatos**: Regular o medium, tamaño más pequeño
- **Botones**: Medium / Semi-bold

Jerarquía clara:
1. Título de pantalla
2. Nombre del producto
3. Fecha de caducidad / días restantes
4. Información secundaria (cantidad, categoría, notas)

---

## 4. Componentes Reutilizables

### 4.1 Botones
- **Primario**: Fondo azul, texto blanco, bordes muy redondeados, altura generosa
- **Secundario / Cancelar**: Fondo blanco o gris claro, borde sutil
- **Peligro (Eliminar)**: Fondo rojo o texto rojo
- **Flotante (“Añadir”)**: Píldora azul con icono + y texto, esquina inferior derecha

### 4.2 Filas de producto (Listado)
- Filas compactas de dos líneas (al menos 64 px), agrupadas por sección en una tarjeta blanca con borde y sombra suaves y separadores finos
- Foto cuadrada redondeada de 44 px a la izquierda
- Nombre en una línea (con puntos suspensivos si no cabe) y, debajo, tiempo relativo · fecha corta
- La urgencia la marca el color del tiempo relativo (tonos de texto rojo, naranja o verde, siempre con su texto): sin barra lateral ni badge
- Cantidad a la derecha en tamaño pequeño, solo si no es “1 ud”

### 4.3 Inputs y formularios
- Campos con fondo gris muy claro o blanco con borde
- Labels encima del campo
- Placeholder en gris
- Campos obligatorios marcados con asterisco (`*`)
- Campos opcionales indicados con “(opcional)”

### 4.4 Navegación
- Sin barra de navegación inferior: el Listado es la pantalla de inicio
- Ajustes se abre con un icono en la cabecera del Listado y las pantallas secundarias vuelven con la flecha de la cabecera

---

## 5. Descripción de Pantallas

### 5.0 Login
- Centrada vertical y horizontalmente
- Título “Caducidades”
- Texto breve de instrucción
- Botón grande “Entrar con Google”
- Fondo limpio (blanco o gris muy suave)

### 5.1 Listado (Pantalla principal)
- Cabecera con título + icono de sincronización + icono de Ajustes
- Buscador “Buscar producto”
- Filtros en píldoras con contador (Todos · N / Caducados · N / Esta semana · N): la activa, oscura con texto blanco
- Secciones “Caducados”, “Esta semana” y “Más adelante”, con el título en mayúsculas pequeñas de su color y el contador
- Filas compactas (ver 4.2): unos 9 productos por pantalla a 390×844
- Botón flotante “Añadir” en la esquina inferior derecha, con un degradado del fondo debajo que suaviza el corte de la lista

### 5.2 Nuevo Producto / Editar Producto
- Cabecera con flecha de volver + título; en modo edición, icono de papelera (Eliminar) a la derecha
- Zona de foto compacta en la parte superior: una fila con la miniatura (o un icono de cámara) y "Toca para elegir foto"; con foto, su nombre o "Tu foto" y "Toca para cambiar"
- Formulario vertical limpio:
  - Nombre
  - Fecha de compra (opcional), con la fecha de hoy en el alta y un botón ✕ en la misma fila para vaciarla
  - Fecha de caducidad (*)
  - Cantidad + unidad
  - Categoría
  - Notas (opcional)
- Botones fijos abajo, en una misma fila: “Cancelar” (secundario, a la izquierda) y “Guardar” (primario, a la derecha)
- En un móvil de 390×740 el alta y la edición caben enteras sin hacer scroll

### 5.3 Elegir Foto Predeterminada
- Cabecera “Elegir foto”
- Barra de búsqueda
- Cuadrícula de 3 columnas con imágenes de productos
- Cada imagen tiene el nombre debajo
- La seleccionada se marca con borde azul y check
- Botones inferiores: “Hacer foto” y “Sin foto” en una fila, y “Elegir de la galería” debajo

### 5.4 Detalle del Producto
- Foto grande en la parte superior. Una foto real se muestra a todo el ancho en 4:3 y, al tocarla, se ve entera a pantalla completa sobre fondo oscuro, con una ✕ para cerrar en la esquina superior derecha
- Nombre del producto
- Fecha de caducidad destacada + badge de días restantes (con color de urgencia)
- Fecha de compra (si existe)
- Cantidad y categoría
- Notas
- Botones: “Editar” y “Eliminar”

### 5.5 Ajustes
- Sección de sincronización con Google Drive (nube y nombre del servicio en una fila + estado + botón “Sincronizar ahora”)
- Email de la cuenta conectada
- Toggle de notificaciones (opcional)
- Botón “Cerrar sesión”
- Flecha de volver al Listado en la cabecera
- En un móvil de 390×740 cabe entero sin hacer scroll, con “Cerrar sesión” justo encima de la zona segura inferior

---

## 6. Referencias Visuales

Las siguientes imágenes generadas durante el diseño son la **referencia oficial** de cómo deben verse las pantallas:

1. **Collage de las 4 pantallas principales** (Listado, Nuevo producto, Detalle, Ajustes)
2. **Pantalla “Elegir foto”** (cuadrícula de fotos predeterminadas)
3. **Pantalla “Nuevo producto”** actualizada (con fecha de compra opcional)

Se recomienda guardar estas imágenes en una carpeta `design/` dentro del proyecto:

```
design/
├── 01-listado-y-pantallas.png
├── 02-elegir-foto.png
├── 03-nuevo-producto.png
└── README.md (opcional)
```

---

## 7. Indicaciones para la implementación (IA / desarrollo)

- Respeta los colores de urgencia exactamente como se definen
- Mantén el estilo limpio y con mucho espacio en blanco
- Los botones primarios deben ser azules y muy visibles
- La información de caducidad debe ser lo primero que se lea en cada producto
- En móvil, los elementos táctiles deben tener un tamaño mínimo cómodo (aprox. 44–48 px)
- La pantalla de Login es la primera que se muestra si no hay sesión válida

---

**Fin del documento de diseño**
