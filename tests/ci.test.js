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

// GitHub puede tardar unos segundos en listar un artefacto recién subido, y deploy-pages
// falla al instante si no lo encuentra ("Found 0 artifact(s)"): el workflow de Pages espera
// a que el artefacto aparezca antes de desplegar.
test('Pages espera a que el artefacto esté disponible antes de desplegar', () => {
  const pages = workflows.find(({ nombre }) => nombre === 'pages.yml');
  assert.ok(pages, 'falta pages.yml');
  const { texto } = pages;
  const subida = texto.search(/uses:\s*actions\/upload-pages-artifact@/);
  const despliegue = texto.search(/uses:\s*actions\/deploy-pages@/);
  assert.ok(subida > 0 && despliegue > subida, 'subida antes del despliegue');
  const entre = texto.slice(subida, despliegue);
  assert.match(entre, /actions\/runs\/\$\{?GITHUB_RUN_ID\}?\/artifacts/, 'consulta los artefactos de esta ejecución');
  assert.match(entre, /github-pages/, 'busca el artefacto github-pages');
  assert.match(entre, /sleep\s+\d+/, 'reintenta con una espera');
  assert.match(entre, /exit 1/, 'falla con un mensaje si no aparece');
  assert.match(texto, /^permissions:[\s\S]*?^\s+actions:\s*read\s*$/m, 'permiso para leer los artefactos');
});
