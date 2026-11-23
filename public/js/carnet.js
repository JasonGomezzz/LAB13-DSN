import { formatearFecha, iniciales } from './formato.js';
import { h } from './ui.js';

const SVG = 'http://www.w3.org/2000/svg';

/**
 * Barras derivadas de los dígitos del DNI: el mismo DNI siempre dibuja las mismas barras.
 * Es solo ilustrativo (no es un código de barras legible), pero hace que la credencial
 * cambie de verdad cuando cambia el dato.
 */
function dibujarBarras(svg, dni) {
  svg.replaceChildren();
  const digitos = /^\d{8}$/.test(dni) ? [...dni].map(Number) : Array(8).fill(0);
  let x = 0;
  digitos.forEach((d, i) => {
    for (const ancho of [1 + (d % 3), 1 + ((d + i) % 2), 1 + ((d * 3 + i) % 3)]) {
      const barra = document.createElementNS(SVG, 'rect');
      barra.setAttribute('x', x);
      barra.setAttribute('y', 0);
      barra.setAttribute('width', ancho);
      barra.setAttribute('height', 26);
      svg.append(barra);
      x += ancho + 1.5;
    }
    x += 2;
  });
  svg.setAttribute('viewBox', `0 0 ${Math.ceil(x)} 26`);
  svg.setAttribute('preserveAspectRatio', 'none');
}

/** Credencial de empleado que se actualiza en vivo. Es decorativa: el formulario ya es accesible. */
export function crearCarnet() {
  const foto = h('img', { alt: '', hidden: true });
  const iniciale = h('span', { class: 'carnet__iniciales' });
  const nombres = h('p', { class: 'carnet__nombres' });
  const apellidos = h('p', { class: 'carnet__apellidos' });
  const cargo = h('p', { class: 'carnet__cargo' });
  const dni = h('dd');
  const ingreso = h('dd');
  const barras = document.createElementNS(SVG, 'svg');
  barras.setAttribute('class', 'carnet__barras');
  const area = h('p', { class: 'carnet__area' });

  const el = h(
    'figure',
    { class: 'carnet', 'aria-hidden': 'true' },
    h('span', { class: 'carnet__ranura' }),
    h('div', { class: 'carnet__foto' }, iniciale, foto),
    h(
      'div',
      { class: 'carnet__texto' },
      nombres,
      apellidos,
      cargo,
      h('dl', { class: 'carnet__datos' }, h('div', {}, h('dt', {}, 'DNI'), dni), h('div', {}, h('dt', {}, 'Ingreso'), ingreso)),
    ),
    barras,
    area,
  );

  function actualizar({ nombres: n = '', apellidos: a = '', cargo: c = '', area: ar = '', dni: d = '', fechaIngreso = '', fotoUrl = null } = {}) {
    const vacio = (campo, texto) => campo.classList.toggle('es-vacio', !texto.trim());

    nombres.textContent = n.trim() || 'Nombres';
    vacio(nombres, n);
    apellidos.textContent = a.trim() || 'Apellidos';
    vacio(apellidos, a);
    cargo.textContent = c.trim() || 'Cargo';
    vacio(cargo, c);
    area.textContent = ar || 'Sin área';
    if (ar) el.dataset.area = ar;
    else delete el.dataset.area;

    dni.textContent = d || '········';
    ingreso.textContent = fechaIngreso ? formatearFecha(fechaIngreso) : '—';
    dibujarBarras(barras, d);

    iniciale.textContent = iniciales(n, a).replace('?', '');
    if (fotoUrl) {
      if (foto.getAttribute('src') !== fotoUrl) foto.setAttribute('src', fotoUrl);
      foto.hidden = false;
    } else {
      foto.hidden = true;
      foto.removeAttribute('src');
    }
  }

  actualizar();
  return { el, actualizar };
}
