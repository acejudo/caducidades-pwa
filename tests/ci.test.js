// Prueba de los workflows de GitHub Actions (endurecimiento-seguridad, design.md §6):
// actions fijadas por SHA y checkout sin credenciales persistidas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const CARPETA = new URL('../.github/workflows/', import.meta.url);
const workflows = readdirSync(CARPETA).filter((n) => /\.ya?ml$/.test(n))
  .map((nombre) => ({ nombre, texto: readFileSync(new URL(nombre, CARPETA), 'utf8') }));

test('cada action está fijada a un SHA con un comentario de versión', () => {
  assert.ok(workflows.length > 0);
  for (const { nombre, texto } of workflows) {
    const usos = texto.split(/\r?\n/).filter((l) => /^\s*-?\s*uses:/.test(l));
    assert.ok(usos.length > 0, `${nombre} tiene actions`);
    for (const linea of usos) {
      assert.match(linea, /uses:\s*[\w.-]+\/[\w./-]+@[0-9a-f]{40}\s+#\s*v\d+(\.\d+){0,2}\s*$/, `${nombre}: ${linea.trim()}`);
    }
  }
});

test('el checkout no deja las credenciales en .git/config', () => {
  for (const { nombre, texto } of workflows) {
    // Bloque del paso de checkout: hasta el siguiente paso ("- " con la misma sangría).
    const inicio = /^(\s*)- uses:\s*actions\/checkout@.*$/m.exec(texto);
    if (!inicio) continue;
    const resto = texto.slice(inicio.index + inicio[0].length);
    const fin = resto.search(new RegExp(`^${inicio[1]}- `, 'm'));
    const paso = fin === -1 ? resto : resto.slice(0, fin);
    assert.match(paso, /^\s+persist-credentials:\s*false\s*$/m, nombre);
  }
});
