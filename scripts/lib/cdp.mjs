// Protocolo de DevTools por tubería (--remote-debugging-pipe): Chrome lee los mensajes
// del descriptor 3 y escribe en el 4, en JSON terminado en un carácter nulo. Así no se
// abre ningún puerto de depuración (endurecimiento-seguridad, design.md §7).

// Separa los mensajes completos de lo recibido hasta ahora. `resto` es lo que quedó sin
// terminar en la llamada anterior. Devuelve { mensajes (ya interpretados), resto }.
export function separarMensajes(resto, trozo) {
  const partes = (resto + trozo).split('\0');
  const pendiente = partes.pop();
  return { mensajes: partes.filter(Boolean).map((texto) => JSON.parse(texto)), resto: pendiente };
}

// Cliente CDP sobre la tubería de un proceso lanzado con
// stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'].
// `enviar(method, params, sessionId)` devuelve la respuesta ({ result } o { error }).
export function crearClienteCdp(proceso) {
  const entrada = proceso.stdio[3];
  const salida = proceso.stdio[4];
  const pendientes = new Map();
  let siguiente = 0;
  let resto = '';
  salida.setEncoding('utf8');
  salida.on('data', (trozo) => {
    const separado = separarMensajes(resto, trozo);
    resto = separado.resto;
    for (const mensaje of separado.mensajes) {
      const resolver = pendientes.get(mensaje.id);
      if (resolver) {
        pendientes.delete(mensaje.id);
        resolver(mensaje);
      }
    }
  });
  return {
    enviar(method, params = {}, sessionId) {
      siguiente += 1;
      const id = siguiente;
      return new Promise((resolver) => {
        pendientes.set(id, resolver);
        entrada.write(`${JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) })}\0`);
      });
    },
  };
}
