// Spec: expiry-alerts, "Sin notificaciones del sistema". Los avisos son solo dentro de la
// app: ningún módulo de src/js pide permiso de notificaciones ni usa push.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const PROHIBIDO = /\b(Notification|requestPermission|PushManager|pushManager|showNotification)\b/;

// Nombres de los archivos de `textos` ({ nombre: contenido }) que usan notificaciones.
function conNotificaciones(textos) {
  return Object.entries(textos).filter(([, texto]) => PROHIBIDO.test(texto)).map(([nombre]) => nombre);
}

test('la comprobación detecta un uso de notificaciones', () => {
  assert.deepEqual(conNotificaciones({
    'a.js': 'await Notification.requestPermission();',
    'b.js': 'registro.pushManager.subscribe()',
    'c.js': 'const aviso = crearAvisoCaducidad();',
  }), ['a.js', 'b.js']);
});

test('Sin permisos', () => {
  const carpeta = new URL('../src/js/', import.meta.url);
  const textos = Object.fromEntries(readdirSync(carpeta)
    .filter((nombre) => nombre.endsWith('.js'))
    .map((nombre) => [nombre, readFileSync(new URL(nombre, carpeta), 'utf8')]));
  const sw = readFileSync(new URL('../src/sw.js', import.meta.url), 'utf8');
  assert.deepEqual(conNotificaciones({ ...textos, 'sw.js': sw }), []);
});
