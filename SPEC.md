# Caducidades – Especificación del Proyecto

## 1. Objetivo

Aplicación web progresiva (PWA) sencilla para controlar las fechas de caducidad de los alimentos.  
Uso **privado** exclusivo para dos personas (el desarrollador y su pareja).  
No se publicará en ninguna tienda de aplicaciones.

---

## 2. Plataforma y Requisitos Técnicos

- **Tipo**: Progressive Web App (PWA)
- **Compatibilidad**: Android (Chrome) e iOS (Safari)
- **Instalable**: Sí (se puede añadir a la pantalla de inicio)
- **Funcionamiento offline**: Sí (con los datos almacenados localmente)
- **Sincronización**: Google Drive
- **Autenticación**: Google Sign-In **restringido** (solo emails autorizados)
- **Idioma de la interfaz**: Español
- **Despliegue previsto**: GitHub Pages (u otra plataforma estática con HTTPS)

---

## 3. Funcionalidades Principales

| Funcionalidad                    | Descripción                                                                 |
|----------------------------------|-----------------------------------------------------------------------------|
| Alta de producto                 | Crear un nuevo producto con todos sus datos                                 |
| Modificación de producto         | Editar cualquier campo de un producto existente                             |
| Baja de producto                 | Eliminar un producto                                                        |
| Listado                          | Mostrar todos los productos ordenados por fecha de caducidad (más próximos primero) |
| Indicadores de urgencia          | Colores visuales según proximidad a la caducidad                            |
| Fotos predeterminadas            | Galería de imágenes genéricas de productos habituales                       |
| Foto real (opcional)             | Posibilidad de hacer una foto o elegir de la galería del dispositivo        |
| Fecha de compra                  | Campo opcional                                                              |
| Sincronización                   | Sincronizar datos con Google Drive                                          |
| Modo offline                     | La app funciona sin conexión usando datos locales                           |
| **Autenticación restringida**    | Login obligatorio con Google. Solo emails autorizados pueden entrar         |

---

## 4. Modelo de Datos

### 4.1 Estructura de un Producto

```json
{
  "id": "string (uuid o timestamp)",
  "nombre": "string (obligatorio)",
  "fechaCompra": "string | null (YYYY-MM-DD, opcional)",
  "fechaCaducidad": "string (YYYY-MM-DD, obligatorio)",
  "cantidad": "number",
  "unidad": "string (ud, pack, kg, etc.)",
  "categoria": "string (Nevera | Congelador | Despensa | Otros)",
  "foto": {
    "tipo": "predeterminada | real | ninguna",
    "valor": "string (id de foto predeterminada o nombre de archivo en Drive)"
  },
  "notas": "string | null (opcional)",
  "actualizado": "string (ISO 8601 timestamp)"
}
```

### 4.2 Archivo de sincronización en Google Drive

- Nombre del archivo: `caducidades.json`
- Ubicación: Carpeta compartida llamada `Caducidades` (o similar)
- Estructura del archivo:

```json
{
  "version": 1,
  "ultimaActualizacion": "2026-10-19T18:30:00Z",
  "productos": [
    { ...producto1 },
    { ...producto2 }
  ]
}
```

### 4.3 Fotos reales (opcionales)

- Se almacenan en una subcarpeta de Google Drive: `Caducidades/fotos/`
- Nombre del archivo: `{id-del-producto}.jpg` (o .webp)
- Solo se suben cuando el usuario elige hacer una foto real

### 4.4 Fotos predeterminadas

- Van incluidas dentro de la propia aplicación (no se suben a Drive)
- Se identifican por un `id` simple (`yogur`, `leche`, `pollo`, `queso`, `huevos`, `salmon`, `manzana`, `platano`, `tomate`, `pan`, `arroz`, `generico`, etc.)

---

## 5. Pantallas de la Aplicación

### 5.0 Pantalla de Login (nueva)

- Se muestra obligatoriamente al abrir la app si no hay sesión válida
- Botón “Entrar con Google”
- Si el email no está en la lista de emails autorizados → se muestra mensaje “Acceso denegado” y se cierra la sesión
- Solo después de un login exitoso con email autorizado se muestra el resto de la aplicación

### 5.1 Listado (Pantalla principal)

- Cabecera con título “Caducidades” + icono de estado de sincronización
- Filtros rápidos: Todas | Pronto | Caducadas (o por categoría)
- Lista de productos ordenada por `fechaCaducidad` ascendente
- Cada ítem muestra:
  - Foto (predeterminada o real)
  - Nombre
  - Fecha de caducidad
  - Días restantes o “¡Caducado!”
  - Cantidad
  - Indicador de color de urgencia
- Botón flotante “+” para añadir producto
- Al pulsar un producto → va a Detalle
- Deslizar (swipe) → opción de eliminar

**Colores de urgencia:**
- Rojo: caducado o caduca en 0-2 días
- Naranja: caduca en 3-7 días
- Verde: más de 7 días

### 5.2 Nuevo Producto / Editar Producto

Campos (en este orden):

1. Zona de foto (toca para elegir predeterminada o hacer foto real)
2. Nombre (obligatorio)
3. Fecha de compra (opcional)
4. Fecha de caducidad (obligatorio)
5. Cantidad + unidad
6. Categoría (Nevera / Congelador / Despensa / Otros)
7. Notas (opcional)

Botones:
- Guardar
- Cancelar
- Eliminar (solo en modo edición)

### 5.3 Elegir Foto Predeterminada

- Cabecera: “Elegir foto”
- Barra de búsqueda
- Cuadrícula de imágenes predeterminadas con nombre debajo
- Botones inferiores:
  - “Hacer foto”
  - “Sin foto”
- La foto seleccionada se marca visualmente

### 5.4 Detalle del Producto

- Foto grande
- Nombre
- Fecha de caducidad + días restantes
- Fecha de compra (si existe)
- Cantidad y categoría
- Notas
- Botones: Editar | Eliminar

### 5.5 Ajustes

- Estado de sincronización con Google Drive
- Cuenta de Google conectada (email)
- Botón “Sincronizar ahora”
- Opción de notificaciones locales (recordatorios de caducidad)
- Botón **Cerrar sesión**

---

## 6. Autenticación y Seguridad

### 6.1 Google Sign-In restringido

- Login **obligatorio** con Google Identity Services
- Scope necesario: `https://www.googleapis.com/auth/drive.file`
- Lista blanca de emails autorizados (hardcodeada en el código):
  - Solo los dos emails definidos podrán acceder
  - Si un usuario inicia sesión con un email no autorizado → se muestra “Acceso denegado” y se cierra la sesión automáticamente

### 6.2 Flujo de autenticación

1. Al abrir la app se muestra la pantalla de Login
2. El usuario pulsa “Entrar con Google”
3. Se obtiene el token de acceso
4. Se consulta el email del usuario (`/oauth2/v3/userinfo`)
5. Se comprueba si el email está en la lista de permitidos
6. Si está permitido → se guarda la sesión y se muestra la aplicación
7. Si no está permitido → mensaje de acceso denegado + logout

### 6.3 Cerrar sesión

- Desde la pantalla de Ajustes
- Revoca el token y vuelve a la pantalla de Login

### 6.4 Notas de seguridad

- Al ser una PWA estática, la lista de emails está en el cliente (no es seguridad militar)
- La verificación real la realiza Google (cifrada)
- Es suficiente y adecuada para un uso privado de dos personas
- La URL de la app puede ser pública, pero sin uno de los emails autorizados no se puede usar

---

## 7. Sincronización con Google Drive

### Flujo básico

1. Tras el login exitoso → intentar sincronizar (descargar `caducidades.json`)
2. Se guarda una copia local (localStorage o IndexedDB)
3. Cualquier cambio (alta/edición/baja) se guarda primero en local y luego se sube a Drive
4. Si no hay conexión → se trabaja solo en local y se sincroniza cuando vuelva la conexión

### Resolución de conflictos

- Se usa el campo `actualizado` (timestamp)
- En caso de conflicto, gana la versión con la fecha de actualización más reciente
- Estrategia simple (last-write-wins) suficiente al ser solo dos usuarios

---

## 8. Tecnologías Recomendadas

| Capa                  | Tecnología recomendada                          | Alternativa          |
|-----------------------|-------------------------------------------------|----------------------|
| Frontend              | HTML + CSS + JavaScript vanilla                 | React / Vue / Svelte |
| Almacenamiento local  | IndexedDB o localStorage                        | -                    |
| Autenticación         | Google Identity Services                        | -                    |
| Sincronización        | Google Drive API                                | -                    |
| PWA                   | Service Worker + Web App Manifest               | -                    |
| Iconos / UI           | Lucide Icons o similar                          | -                    |
| Fechas                | date-fns o native Date                          | -                    |

---

## 9. Estructura de Carpetas Sugerida (proyecto)

```
caducidades-pwa/
├── index.html
├── manifest.json
├── sw.js                    # Service Worker
├── css/
│   └── styles.css
├── js/
│   ├── app.js
│   ├── auth.js              # Google Sign-In restringido
│   ├── storage.js           # Local + sincronización
│   ├── drive.js             # Google Drive API
│   ├── ui.js
│   └── utils.js
├── img/
│   └── predeterminadas/     # Fotos predeterminadas
├── SPEC.md                  # Este archivo
└── README.md
```

---

## 10. Criterios de Aceptación (Definition of Done)

- [ ] Se muestra pantalla de Login obligatoria
- [ ] Solo los emails autorizados pueden acceder
- [ ] Emails no autorizados reciben “Acceso denegado”
- [ ] Se puede añadir, editar y eliminar productos
- [ ] El listado se ordena correctamente por fecha de caducidad
- [ ] Los colores de urgencia se muestran bien
- [ ] Se pueden elegir fotos predeterminadas
- [ ] La fecha de compra es opcional
- [ ] La app funciona sin conexión
- [ ] La sincronización con Google Drive funciona en ambos sentidos
- [ ] Se puede cerrar sesión
- [ ] Se puede instalar como PWA en Android e iOS
- [ ] La interfaz está completamente en español

---

## 11. Fuera de Alcance (No se implementará en la primera versión)

- Notificaciones push avanzadas
- Escáner de códigos de barras
- Múltiples usuarios con roles/permisos complejos
- Historial de productos eliminados
- Exportar a Excel/CSV
- Modo oscuro (se puede añadir después)
- Contraseña adicional del lado del cliente (opcional a futuro)

---

**Versión del documento:** 1.1  
**Fecha:** 20 de octubre de 2026  
**Estado:** Listo para empezar el desarrollo  
**Cambios en esta versión:**  
- Añadida autenticación obligatoria con Google Sign-In restringido a emails autorizados  
- Nueva pantalla de Login  
- Actualizados criterios de aceptación y estructura de carpetas
