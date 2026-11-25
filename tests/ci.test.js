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

// deploy-pages busca el artefacto recién subido en un servicio de GitHub que a veces tarda
// segundos en verlo, y entonces falla sin desplegar nada ("Found 0 artifact(s)",
// actions/deploy-pages#451). El workflow de Pages reintenta el despliegue tras una espera.
test('Pages reintenta el despliegue si el artefacto aún no aparece', () => {
  const pages = workflows.find(({ nombre }) => nombre === 'pages.yml');
  assert.ok(pages, 'falta pages.yml');
  const { texto } = pages;
  // Pasos del job: cada uno empieza por "      - " (6 espacios).
  const pasos = texto.split(/\r?\n(?= {6}- )/);
  const despliegues = pasos.filter((p) => /uses:\s*actions\/deploy-pages@/.test(p));
  assert.ok(despliegues.length >= 3, `al menos 3 intentos de despliegue (hay ${despliegues.length})`);
  const usos = new Set(despliegues.map((p) => /uses:\s*(\S+)/.exec(p)[1]));
  assert.equal(usos.size, 1, 'todos los intentos usan la misma versión fijada');
  despliegues.slice(0, -1).forEach((p, i) => {
    assert.match(p, /continue-on-error:\s*true/, `el intento ${i + 1} no detiene el job si falla`);
  });
  assert.doesNotMatch(despliegues.at(-1), /continue-on-error/, 'el último intento sí hace fallar el job');
  despliegues.slice(1).forEach((p, i) => {
    assert.match(p, /if:\s*steps\.[\w-]+\.outcome == 'failure'/, `el intento ${i + 2} solo corre si falló el anterior`);
  });
  const esperas = pasos.filter((p) => /run:\s*sleep\s+\d+/.test(p) && /if:\s*steps\.[\w-]+\.outcome == 'failure'/.test(p));
  assert.ok(esperas.length >= despliegues.length - 1, 'una espera antes de cada reintento');
  const ids = despliegues.map((p) => /id:\s*([\w-]+)/.exec(p)?.[1]);
  for (const id of ids) assert.ok(id, 'cada intento tiene id');
  assert.match(texto, new RegExp(`url:.*${ids.map((id) => `steps\\.${id}\\.outputs\\.page_url`).join('.*')}`), 'la URL del entorno sale del intento que funcionó');
  assert.doesNotMatch(texto, /^\s+actions:\s*read\s*$/m, 'sin permisos de más');
});
