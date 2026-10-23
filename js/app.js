// Punto de entrada: registra las rutas, arranca el router y el Service Worker.

import { registrar, iniciar } from './router.js';
import { mostrar, pantallas } from './ui.js';

// Orden importante: las rutas estáticas antes que las de parámetro.
registrar('/login', { titulo: 'Caducidades', mostrarNav: false, render: pantallas.login });
registrar('/listado', { titulo: 'Caducidades', mostrarNav: true, render: pantallas.listado });
registrar('/producto/nuevo', { titulo: 'Nuevo producto', mostrarNav: false, padre: '/listado', render: pantallas.nuevo });
registrar('/producto/:id/editar', { titulo: 'Editar producto', mostrarNav: false, padre: '/producto/:id', render: pantallas.editar });
registrar('/producto/:id', { titulo: 'Detalle', mostrarNav: false, padre: '/listado', render: pantallas.detalle });
registrar('/elegir-foto', { titulo: 'Elegir foto', mostrarNav: false, padre: '/listado', render: pantallas.elegirFoto });
registrar('/ajustes', { titulo: 'Ajustes', mostrarNav: true, render: pantallas.ajustes });

iniciar(mostrar);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch((error) => {
    console.error('No se pudo registrar el Service Worker:', error);
  });
}
