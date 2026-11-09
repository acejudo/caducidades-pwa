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
- **Flotante (+)**: Circular, azul, esquina inferior derecha

### 4.2 Cards de producto (Listado)
- Fondo blanco
- Borde o sombra suave
- Foto circular o cuadrada redondeada a la izquierda
- Nombre + fecha + días restantes
- Indicador de color de urgencia (barra lateral o badge)
- Cantidad en tamaño pequeño

### 4.3 Inputs y formularios
- Campos con fondo gris muy claro o blanco con borde
- Labels encima del campo
- Placeholder en gris
- Campos obligatorios marcados con asterisco (`*`)
- Campos opcionales indicados con “(opcional)”

### 4.4 Navegación inferior (si se usa)
- Iconos + texto
- Estado activo en azul
- Iconos: Inicio / Lista / Ajustes

---

## 5. Descripción de Pantallas

### 5.0 Login
- Centrada vertical y horizontalmente
- Título “Caducidades”
- Texto breve de instrucción
- Botón grande “Entrar con Google”
- Fondo limpio (blanco o gris muy suave)

### 5.1 Listado (Pantalla principal)
- Cabecera con título + icono de sincronización
- Filtros superiores (Todas / Pronto / Caducadas) o por categoría
- Lista vertical de productos ordenada por fecha de caducidad
- Cada producto muestra foto, nombre, fecha, días restantes y cantidad
- Colores de urgencia muy visibles
- Botón flotante “+” en la esquina inferior derecha
- Navegación inferior (opcional pero recomendable)

### 5.2 Nuevo Producto / Editar Producto
- Cabecera con flecha de volver + título
- Zona grande de foto en la parte superior (toca para elegir)
- Formulario vertical limpio:
  - Nombre
  - Fecha de compra (opcional)
  - Fecha de caducidad (*)
  - Cantidad + unidad
  - Categoría
  - Notas (opcional)
- Botones fijos abajo: “Guardar” (primario) y “Cancelar”
- En modo edición aparece también “Eliminar”

### 5.3 Elegir Foto Predeterminada
- Cabecera “Elegir foto”
- Barra de búsqueda
- Cuadrícula de 3 columnas con imágenes de productos
- Cada imagen tiene el nombre debajo
- La seleccionada se marca con borde azul y check
- Botones inferiores: “Hacer foto” y “Sin foto”

### 5.4 Detalle del Producto
- Foto grande en la parte superior
- Nombre del producto
- Fecha de caducidad destacada + badge de días restantes (con color de urgencia)
- Fecha de compra (si existe)
- Cantidad y categoría
- Notas
- Botones: “Editar” y “Eliminar”

### 5.5 Ajustes
- Sección de sincronización con Google Drive (logo + estado + botón “Sincronizar ahora”)
- Email de la cuenta conectada
- Toggle de notificaciones (opcional)
- Botón “Cerrar sesión”

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
