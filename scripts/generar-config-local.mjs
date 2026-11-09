#!/usr/bin/env node
// Genera src/js/config.local.js con el Client ID de Google y los hashes SHA-256 de los
// emails autorizados. Los emails en texto nunca se escriben en disco.
//
// Uso:
//   node scripts/generar-config-local.mjs --client-id "<ID>" --emails "uno@gmail.com,otra@gmail.com"
// o con las variables de entorno GOOGLE_CLIENT_ID y EMAILS_AUTORIZADOS (así lo usa el workflow).

import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DESTINO = fileURLToPath(new URL('../src/js/config.local.js', import.meta.url));
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function argumento(nombre) {
  const i = process.argv.indexOf(nombre);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function fallar(mensaje) {
  console.error(`Error: ${mensaje}`);
  process.exit(1);
}

const clientId = (argumento('--client-id') ?? process.env.GOOGLE_CLIENT_ID ?? '').trim();
const emailsTexto = argumento('--emails') ?? process.env.EMAILS_AUTORIZADOS ?? '';

if (!clientId) fallar('falta el Client ID (--client-id o GOOGLE_CLIENT_ID).');
if (!clientId.endsWith('.apps.googleusercontent.com')) {
  fallar('el Client ID debe terminar en ".apps.googleusercontent.com".');
}

const emails = emailsTexto.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
if (emails.length === 0) fallar('falta al menos un email (--emails o EMAILS_AUTORIZADOS).');
const invalidos = emails.filter((e) => !EMAIL_VALIDO.test(e));
if (invalidos.length > 0) fallar(`${invalidos.length} email(s) sin formato válido.`);

const hashes = [...new Set(emails)].map((e) => createHash('sha256').update(e, 'utf8').digest('hex'));

const contenido = `// Generado por scripts/generar-config-local.mjs. No editar ni subir a git.

export const GOOGLE_CLIENT_ID = ${JSON.stringify(clientId)};

export const EMAILS_AUTORIZADOS_SHA256 = Object.freeze([
${hashes.map((h) => `  '${h}',`).join('\n')}
]);
`;

writeFileSync(DESTINO, contenido, 'utf8');
console.log(`src/js/config.local.js generado con ${hashes.length} email(s) autorizado(s).`);
