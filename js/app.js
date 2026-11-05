// Punto de entrada: registra el Service Worker, las rutas y el control de acceso.

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch((error) => {
    console.error('No se pudo registrar el Service Worker:', error);
  });
}

// Los módulos que dependen de js/config.local.js se cargan de forma dinámica para
// mostrar un aviso legible si falta ese archivo, en lugar de una pantalla en blanco.
let router, ui, auth;
try {
  [router, ui, auth] = await Promise.all([
    import('./router.js'),
    import('./ui.js'),
    import('./auth.js'),
  ]);
} catch (error) {
  console.error('No se pudo cargar la configuración:', error);
  mostrarFaltaConfiguracion();
}

if (router) arrancar();

async function arrancar() {
  const { registrar, setGuard, iniciar } = router;
  const { mostrar, pantallas } = ui;
  const { sesionActual, revalidarSesion } = auth;

  // Orden importante: las rutas estáticas antes que las de parámetro.
  registrar('/login', { titulo: 'Caducidades', mostrarNav: false, mostrarCabecera: false, render: pantallas.login });
  registrar('/listado', { titulo: 'Caducidades', mostrarNav: true, render: pantallas.listado });
  registrar('/producto/nuevo', { titulo: 'Nuevo producto', mostrarNav: false, padre: '/listado', render: pantallas.nuevo });
  registrar('/producto/:id/editar', { titulo: 'Editar producto', mostrarNav: false, padre: '/producto/:id', render: pantallas.editar });
  registrar('/producto/:id', { titulo: 'Detalle', mostrarNav: false, padre: '/listado', render: pantallas.detalle });
  registrar('/elegir-foto', { titulo: 'Elegir foto', mostrarNav: false, padre: '/listado', render: pantallas.elegirFoto });
  registrar('/ajustes', { titulo: 'Ajustes', mostrarNav: true, render: pantallas.ajustes });

  await revalidarSesion();

  // Sin sesión solo se permite Login; con sesión, Login lleva a Listado. Login nunca
  // se redirige a sí mismo, así que no puede haber bucles.
  setGuard(({ path }) => {
    if (sesionActual()) return path === '/login' ? '/listado' : true;
    return path === '/login' ? true : '/login';
  });

  iniciar(mostrar);
}

function mostrarFaltaConfiguracion() {
  const contenido = document.getElementById('contenido');
  const aviso = document.createElement('section');
  aviso.className = 'marcador';
  const titulo = document.createElement('h1');
  titulo.className = 'cabecera__titulo';
  titulo.textContent = 'Falta la configuración';
  const texto = document.createElement('p');
  texto.className = 'marcador__nota';
  texto.textContent = 'Falta js/config.local.js. Genéralo con scripts/generar-config-local.mjs (ver README.md).';
  aviso.append(titulo, texto);
  contenido.replaceChildren(aviso);
}
