/**
 * Crea un elemento. Los hijos de tipo texto se insertan como nodos de texto
 * (nunca como HTML), de modo que un nombre con "<script>" se muestra tal cual.
 */
export function h(etiqueta, atributos = {}, ...hijos) {
  const el = document.createElement(etiqueta);
  for (const [nombre, valor] of Object.entries(atributos)) {
    if (valor === false || valor == null) continue;
    if (nombre === 'class') el.className = valor;
    else if (nombre.startsWith('on') && typeof valor === 'function') {
      el.addEventListener(nombre.slice(2), valor);
    } else el.setAttribute(nombre, valor === true ? '' : valor);
  }
  for (const hijo of hijos.flat()) {
    if (hijo == null || hijo === false) continue;
    el.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo)));
  }
  return el;
}

/** Aviso efímero. El contenedor tiene role="status", así que lo anuncia un lector de pantalla. */
export function avisar(mensaje, tipo = 'ok') {
  const contenedor = document.getElementById('avisos');
  const aviso = h('p', { class: tipo === 'error' ? 'aviso aviso--error' : 'aviso' }, mensaje);
  contenedor.append(aviso);
  setTimeout(() => aviso.remove(), tipo === 'error' ? 7000 : 3800);
}
