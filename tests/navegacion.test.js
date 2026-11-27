// Pruebas estáticas de la navegación (app-navigation): sin barra inferior y Ajustes como
// pantalla secundaria de Listado. Leen el código: app.js importa config.js y no se puede
// cargar en Node.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const leer = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8');
const app = leer('src/js/app.js');
const ui = leer('src/js/ui.js');
const indice = leer('src/index.html');
const estilos = leer('src/css/styles.css');

// Opciones con las que se registra una ruta en app.js: registrar('/ruta', { ... }).
function opcionesDe(ruta) {
  const linea = app.split(/\r?\n/).find((l) => l.includes(`registrar('${ruta}',`));
  assert.ok(linea, `no se registra ${ruta}`);
  return linea;
}

describe('app-navigation: sin barra inferior', () => {
  test('Sin barra inferior', () => {
    assert.ok(!indice.includes('nav-inferior'), 'index.html no tiene la barra');
    assert.ok(!app.includes('mostrarNav'), 'ninguna ruta pide la barra');
    assert.ok(!/pintarNav|nav-inferior|app--con-nav/.test(ui), 'ui.js no la pinta');
    assert.ok(!/nav-inferior|app--con-nav|--alto-nav/.test(estilos), 'sin estilos de la barra');
  });

  test('Volver de Ajustes', () => {
    assert.match(opcionesDe('/ajustes'), /padre: '\/listado'/);
  });

  test('Sin flecha en pantallas principales', () => {
    assert.doesNotMatch(opcionesDe('/listado'), /padre:/);
    assert.doesNotMatch(opcionesDe('/login'), /padre:/);
  });
});
