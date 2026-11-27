// Punto de entrada: registra el Service Worker, las rutas y el control de acceso.

// Dentro de un marco de otra página la app no arranca (pwa-shell, "Solo en su propia
// ventana"): ni Service Worker, ni pantallas, ni Google Sign-In; solo un aviso con un
// enlace para abrirla fuera del marco.
if (enMarco()) {
  mostrarAviso('Caducidades', 'Esta app solo funciona en su propia ventana.', {
    texto: 'Abrir Caducidades',
    href: location.href,
  });
} else {
  await iniciarApp();
}

function enMarco() {
  try {
    return window.top !== window.self;
  } catch {
    return true;
  }
}

async function iniciarApp() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch((error) => {
      console.error('No se pudo registrar el Service Worker:', error);
    });
  }

  // Los módulos que dependen de js/config.local.js se cargan de forma dinámica para
  // mostrar un aviso legible si falta ese archivo, en lugar de una pantalla en blanco.
  let modulos;
  try {
    modulos = await Promise.all([
      import('./router.js'),
      import('./ui.js'),
      import('./auth.js'),
    ]);
  } catch (error) {
    console.error('No se pudo cargar la configuración:', error);
    mostrarAviso('Falta la configuración', 'Falta src/js/config.local.js. Genéralo con scripts/generar-config-local.mjs (ver README.md).');
    return;
  }
  await arrancar(...modulos);
}

async function arrancar(router, ui, auth) {
  const { registrar, setGuard, iniciar } = router;
  const { mostrar, pantallas, iniciarSincronizacion } = ui;
  const { sesionActual, revalidarSesion } = auth;

  // Orden importante: las rutas estáticas antes que las de parámetro.
  registrar('/login', { titulo: 'Caducidades', mostrarCabecera: false, render: pantallas.login });
  registrar('/listado', { titulo: 'Caducidades', mostrarSincronizacion: true, render: pantallas.listado });
  registrar('/producto/nuevo', { titulo: 'Nuevo producto', padre: '/listado', render: pantallas.nuevo });
  // Elegir foto tiene una ruta por formulario de origen: sabe a cuál devolver la foto y
  // ese formulario es su padre (design.md §4).
  registrar('/producto/nuevo/foto', { titulo: 'Elegir foto', padre: '/producto/nuevo', render: pantallas.elegirFoto });
  registrar('/producto/:id/editar/foto', { titulo: 'Elegir foto', padre: '/producto/:id/editar', render: pantallas.elegirFoto });
  registrar('/producto/:id/editar', { titulo: 'Editar producto', padre: '/producto/:id', render: pantallas.editar });
  registrar('/producto/:id', { titulo: 'Detalle del producto', padre: '/listado', render: pantallas.detalle });
  // Ajustes se abre desde el icono de la cabecera de Listado y vuelve a él con la flecha.
  registrar('/ajustes', { titulo: 'Ajustes', padre: '/listado', render: pantallas.ajustes });

  await revalidarSesion();

  // Sin sesión solo se permite Login; con sesión, Login lleva a Listado. Login nunca
  // se redirige a sí mismo, así que no puede haber bucles.
  setGuard(({ path }) => {
    if (sesionActual()) return path === '/login' ? '/listado' : true;
    return path === '/login' ? true : '/login';
  });

  // Con la sesión recordada, la sincronización se pone en marcha al abrir la app (solo
  // sincroniza sola si el token sigue vigente; si no, espera a un toque).
  if (sesionActual()) iniciarSincronizacion();

  iniciar(mostrar);
}

// Aviso a pantalla completa en lugar de la app, sin estilos ni scripts en línea (CSP).
function mostrarAviso(tituloTexto, textoAviso, enlace = null) {
  const contenido = document.getElementById('contenido');
  const aviso = document.createElement('section');
  aviso.className = 'marcador';
  const titulo = document.createElement('h1');
  titulo.className = 'cabecera__titulo';
  titulo.textContent = tituloTexto;
  const texto = document.createElement('p');
  texto.className = 'marcador__nota';
  texto.textContent = textoAviso;
  aviso.append(titulo, texto);
  if (enlace) {
    const a = document.createElement('a');
    a.className = 'btn btn--primario btn--bloque';
    a.href = enlace.href;
    a.target = '_top';
    a.rel = 'noopener';
    a.textContent = enlace.texto;
    aviso.append(a);
  }
  contenido.replaceChildren(aviso);
}
