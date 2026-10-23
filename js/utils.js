// Utilidades comunes de DOM.

// Crea un elemento. `attrs` admite `class`, `text` (se asigna con textContent),
// `on<Evento>` (listeners) y cualquier otro atributo. `hijos` pueden ser nodos o textos.
export function el(tag, attrs = {}, ...hijos) {
  const nodo = document.createElement(tag);
  for (const [clave, valor] of Object.entries(attrs)) {
    if (valor == null || valor === false) continue;
    if (clave === 'text') {
      nodo.textContent = valor;
    } else if (clave.startsWith('on') && typeof valor === 'function') {
      nodo.addEventListener(clave.slice(2).toLowerCase(), valor);
    } else {
      nodo.setAttribute(clave, valor === true ? '' : valor);
    }
  }
  for (const hijo of hijos.flat()) {
    if (hijo == null || hijo === false) continue;
    nodo.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo)));
  }
  return nodo;
}

// Crea un SVG a partir de un marcado estático de confianza (iconos incluidos en la app).
export function icono(svg) {
  const plantilla = document.createElement('template');
  plantilla.innerHTML = svg.trim();
  return plantilla.content.firstChild;
}

export function vaciar(nodo) {
  nodo.replaceChildren();
}
