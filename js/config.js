// Constantes de la aplicación.
// El Client ID de OAuth de una app web es público por diseño: puede ir en el repositorio.

export const APP_NOMBRE = 'Caducidades';

// Se rellenarán en el cambio de autenticación.
export const GOOGLE_CLIENT_ID = '';
export const EMAILS_AUTORIZADOS = Object.freeze([]);

export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
export const DRIVE_CARPETA = 'Caducidades';
export const DRIVE_ARCHIVO = 'caducidades.json';
export const DRIVE_CARPETA_FOTOS = 'fotos';

// Días restantes máximos de cada nivel; por encima de naranjaMaxDias es verde.
export const URGENCIA = Object.freeze({ rojoMaxDias: 2, naranjaMaxDias: 7 });

export const CATEGORIAS = Object.freeze(['Nevera', 'Congelador', 'Despensa', 'Otros']);
