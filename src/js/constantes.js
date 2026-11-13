// Constantes de dominio sin datos sensibles. Los módulos puros (productos.js, storage.js)
// importan de aquí y nunca de config.js, que arrastra config.local.js.

// Días restantes máximos de cada nivel; por encima de naranjaMaxDias es verde.
export const URGENCIA = Object.freeze({ rojoMaxDias: 2, naranjaMaxDias: 7 });

export const CATEGORIAS = Object.freeze(['Nevera', 'Congelador', 'Despensa', 'Otros']);

// Unidades del desplegable del formulario ("ud" por defecto, como en el modelo).
export const UNIDADES = Object.freeze(['ud', 'pack', 'kg', 'g', 'l', 'ml']);

// Google Drive (SPEC §4.2 y §6.1). El scope completo permite usar una carpeta
// "Caducidades" compartida por otra cuenta (drive-sync, design.md §1).
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';
export const DRIVE_CARPETA = 'Caducidades';
export const DRIVE_ARCHIVO = 'caducidades.json';
export const DRIVE_CARPETA_FOTOS = 'fotos';
