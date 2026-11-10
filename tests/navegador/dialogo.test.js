// Pruebas de src/js/dialogo.js (diálogo de confirmación). Spec: product-form.
import { prueba, antesDeCada, igual, verdadero } from './runner.js';

const dialogo = await import('../../src/js/dialogo.js').catch((error) => {
  console.error('No se pudo cargar dialogo.js', error);
  return {};
});

const abierto = () => document.querySelector('dialog.dialogo');
const boton = (texto) => [...abierto().querySelectorAll('button')].find((b) => b.textContent.trim() === texto);
const OPCIONES = { titulo: '¿Eliminar «Leche»?', mensaje: 'Dejará de aparecer en la lista.', aceptar: 'Eliminar', peligro: true };

let disparador;
antesDeCada(() => {
  document.querySelectorAll('dialog.dialogo').forEach((d) => d.remove());
  disparador?.remove();
  disparador = document.createElement('button');
  disparador.textContent = 'Abrir';
  document.body.append(disparador);
  disparador.focus();
});

prueba('muestra título, mensaje y botones', async () => {
  const respuesta = dialogo.confirmar(OPCIONES);
  const d = abierto();
  verdadero(d?.open, 'el diálogo está abierto');
  igual(d.querySelector('.dialogo__titulo').textContent, '¿Eliminar «Leche»?');
  igual(d.querySelector('.dialogo__mensaje').textContent, 'Dejará de aparecer en la lista.');
  verdadero(boton('Eliminar') && boton('Cancelar'), 'faltan los botones');
  verdadero(boton('Eliminar').classList.contains('btn--peligro'), 'la acción es de peligro');
  boton('Cancelar').click();
  await respuesta;
});

prueba('la acción resuelve true', async () => {
  const respuesta = dialogo.confirmar(OPCIONES);
  boton('Eliminar').click();
  igual(await respuesta, true);
});

prueba('la alternativa resuelve false', async () => {
  const respuesta = dialogo.confirmar({ ...OPCIONES, cancelar: 'Seguir editando' });
  boton('Seguir editando').click();
  igual(await respuesta, false);
});

prueba('Cerrar con Escape', async () => {
  const respuesta = dialogo.confirmar(OPCIONES);
  abierto().dispatchEvent(new Event('cancel', { cancelable: true }));
  igual(await respuesta, false);
});

prueba('foco inicial en la alternativa y devuelto al cerrar', async () => {
  const respuesta = dialogo.confirmar(OPCIONES);
  igual(document.activeElement, boton('Cancelar'), 'el foco empieza en la alternativa');
  boton('Cancelar').click();
  await respuesta;
  igual(document.activeElement, disparador, 'el foco vuelve a quien lo abrió');
});

prueba('sin peligro la acción es primaria', async () => {
  const respuesta = dialogo.confirmar({ ...OPCIONES, peligro: false, aceptar: 'Descartar' });
  verdadero(boton('Descartar').classList.contains('btn--primario'));
  boton('Descartar').click();
  await respuesta;
});

prueba('el diálogo desaparece del DOM al cerrarse', async () => {
  const respuesta = dialogo.confirmar(OPCIONES);
  boton('Eliminar').click();
  await respuesta;
  igual(abierto(), null);
});
