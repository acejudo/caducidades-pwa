// La app no arranca dentro de un marco de otra página (pwa-shell, "Solo en su propia
// ventana"). Carga la página real (src/index.html) en un iframe del mismo origen, que deja
// inspeccionar su documento.
import { prueba, igual, verdadero } from './runner.js';

const AVISO = 'Esta app solo funciona en su propia ventana.';

// Monta el iframe fuera de pantalla y espera a que la app pinte algo en #contenido.
async function cargarEnMarco() {
  const marco = document.createElement('iframe');
  Object.assign(marco.style, { position: 'absolute', left: '-10000px', width: '390px', height: '844px' });
  const cargado = new Promise((resolver) => marco.addEventListener('load', resolver, { once: true }));
  marco.src = '../../src/index.html';
  document.body.append(marco);
  await cargado;
  const doc = marco.contentDocument;
  const limite = Date.now() + 5000;
  while (!doc.getElementById('contenido')?.childElementCount && Date.now() < limite) {
    await new Promise((r) => setTimeout(r, 50));
  }
  // Un poco más, por si la app siguiera montando pantallas tras el primer contenido.
  await new Promise((r) => setTimeout(r, 300));
  return marco;
}

prueba('Cargada dentro de un marco', async () => {
  const marco = await cargarEnMarco();
  try {
    const doc = marco.contentDocument;
    const contenido = doc.getElementById('contenido');
    verdadero(contenido.textContent.includes(AVISO), `muestra el aviso; se obtuvo: "${contenido.textContent.trim().slice(0, 120)}"`);
    const enlace = [...doc.querySelectorAll('a')].find((a) => a.textContent.trim() === 'Abrir Caducidades');
    verdadero(enlace, 'hay un enlace "Abrir Caducidades"');
    igual(enlace?.getAttribute('target'), '_top', 'abre fuera del marco');
    igual(doc.querySelectorAll('button').length, 0, 'sin botones de la app ni de login');
    igual(doc.getElementById('nav-inferior'), null, 'sin barra de navegación');
    igual([...doc.scripts].some((s) => s.src.includes('accounts.google.com')), false, 'no carga Google Sign-In');
  } finally {
    marco.remove();
  }
});

prueba('Abrir desde el marco', async () => {
  const marco = await cargarEnMarco();
  try {
    const enlace = [...marco.contentDocument.querySelectorAll('a')].find((a) => a.textContent.trim() === 'Abrir Caducidades');
    verdadero(enlace, 'hay un enlace "Abrir Caducidades"');
    igual(enlace?.href, marco.contentWindow.location.href, 'lleva a la dirección de la app');
  } finally {
    marco.remove();
  }
});
