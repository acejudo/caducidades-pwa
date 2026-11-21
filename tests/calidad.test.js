// Cierre de calidad (pulido-final, design.md §8): los mensajes que ve el usuario son
// textos propios en español. Los mensajes técnicos de los errores (`error.message`) van
// solo a la consola, nunca a la interfaz.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

// Líneas que pintan algo (textContent, text:, append…) con el `.message` de un error.
const PINTA_MENSAJE_TECNICO = /(textContent\s*=|\btext\s*:|\.append\(|replaceChildren\(|el\(\s*'[a-z]+'\s*,\s*\{[^}]*text\s*:)[^\n]*\b\w+\.message\b/;

function lineasConMensajeTecnico(textos) {
  const encontradas = [];
  for (const [nombre, texto] of Object.entries(textos)) {
    texto.split(/\r?\n/).forEach((linea, i) => {
      if (PINTA_MENSAJE_TECNICO.test(linea)) encontradas.push(`${nombre}:${i + 1}`);
    });
  }
  return encontradas;
}

test('la comprobación detecta un mensaje técnico pintado', () => {
  assert.deepEqual(lineasConMensajeTecnico({
    'a.js': "aviso.textContent = error.message;\nconsole.error('fallo', error.message);",
    'b.js': "el('p', { class: 'x', text: causa.message })",
    'c.js': "aviso.textContent = 'No se pudo guardar el producto.';",
  }), ['a.js:1', 'b.js:1']);
});

test('ningún módulo pinta el mensaje técnico de un error', () => {
  const carpeta = new URL('../src/js/', import.meta.url);
  const textos = Object.fromEntries(readdirSync(carpeta)
    .filter((nombre) => nombre.endsWith('.js'))
    .map((nombre) => [nombre, readFileSync(new URL(nombre, carpeta), 'utf8')]));
  assert.deepEqual(lineasConMensajeTecnico(textos), []);
});
