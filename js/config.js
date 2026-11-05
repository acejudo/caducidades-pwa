// Constantes de la aplicación.

export const APP_NOMBRE = 'Caducidades';

// Datos sensibles: viven en config.local.js, fuera de git (ver config.local.example.js).
export { GOOGLE_CLIENT_ID, EMAILS_AUTORIZADOS_SHA256 } from './config.local.js';

export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
export const DRIVE_CARPETA = 'Caducidades';
export const DRIVE_ARCHIVO = 'caducidades.json';
export const DRIVE_CARPETA_FOTOS = 'fotos';

// Días restantes máximos de cada nivel; por encima de naranjaMaxDias es verde.
export const URGENCIA = Object.freeze({ rojoMaxDias: 2, naranjaMaxDias: 7 });

export const CATEGORIAS = Object.freeze(['Nevera', 'Congelador', 'Despensa', 'Otros']);
