// Constantes de la aplicación.

export const APP_NOMBRE = 'Caducidades';

// Datos sensibles: viven en config.local.js, fuera de git (ver config.local.example.js).
export { GOOGLE_CLIENT_ID, EMAILS_AUTORIZADOS_SHA256 } from './config.local.js';

// Constantes sin datos sensibles: viven en constantes.js.
export {
  URGENCIA, CATEGORIAS, DRIVE_SCOPE, DRIVE_CARPETA, DRIVE_ARCHIVO, DRIVE_CARPETA_FOTOS,
} from './constantes.js';
