// Plantilla de src/js/config.local.js (ese archivo no se sube a git).
//
// No lo edites a mano: genéralo con
//   node scripts/generar-config-local.mjs --client-id "<ID>.apps.googleusercontent.com" --emails "uno@gmail.com,otra@gmail.com"
// En el despliegue lo genera el workflow de GitHub Actions a partir de los Secrets.

export const GOOGLE_CLIENT_ID = '';

// SHA-256 (hex) de cada email autorizado, normalizado con trim() y minúsculas.
export const EMAILS_AUTORIZADOS_SHA256 = Object.freeze([]);
