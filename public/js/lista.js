import { crearCarnet } from './carnet.js';
import { formatearFecha, formatearSalario, iniciales } from './formato.js';
import { h } from './ui.js';

function avatar(empleado) {
  return h(
    'div',
    { class: 'avatar', 'data-area': empleado.area },
    empleado.fotoUrl
      ? h('img', { src: empleado.fotoUrl, alt: '', loading: 'lazy', width: 44, height: 44 })
      : iniciales(empleado.nombres, empleado.apellidos),
  );
}

export function filaEmpleado(empleado, { alEditar, alEliminar }) {
  const completo = `${empleado.nombres} ${empleado.apellidos}`;
  return h(
    'tr',
    { 'data-id': empleado.empleadoId, 'data-area': empleado.area },
    h('td', { class: 'col-foto' }, avatar(empleado)),
    h(
      'td',
      { class: 'col-nombre' },
      h('p', { class: 'fila__nombre' }, `${empleado.apellidos}, ${empleado.nombres}`),
      h('p', { class: 'fila__cargo' }, empleado.cargo),
      // Solo visible en pantallas angostas, donde la columna de área se oculta
      h('p', { class: 'fila__area-movil' }, h('span', { class: 'punto', 'aria-hidden': 'true' }), empleado.area),
    ),
    h('td', { class: 'col-area' }, h('span', { class: 'punto', 'aria-hidden': 'true' }), empleado.area),
    h('td', { class: 'col-correo' }, empleado.correo),
    h('td', { class: 'col-ingreso' }, formatearFecha(empleado.fechaIngreso)),
    h('td', { class: 'col-salario num' }, formatearSalario(empleado.salario)),
    h(
      'td',
      { class: 'fila__acciones' },
      h(
        'div',
        { class: 'fila__botones' },
        h('button', { type: 'button', class: 'boton boton--texto', 'aria-label': `Editar a ${completo}`, onclick: () => alEditar(empleado) }, 'Editar'),
        h('button', { type: 'button', class: 'boton boton--texto es-peligro', 'aria-label': `Eliminar a ${completo}`, onclick: () => alEliminar(empleado) }, 'Eliminar'),
      ),
    ),
  );
}

export function filasEsqueleto(cantidad = 5) {
  return Array.from({ length: cantidad }, () =>
    h(
      'tr',
      { class: 'fila--esqueleto', 'aria-hidden': 'true' },
      h('td', { class: 'col-foto' }, h('div', { class: 'avatar avatar--esqueleto' })),
      h('td', { class: 'col-nombre' }, h('span', { class: 'esqueleto esqueleto--largo' }), h('span', { class: 'esqueleto esqueleto--corto' })),
      h('td', { class: 'col-area' }, h('span', { class: 'esqueleto esqueleto--corto' })),
      h('td', { class: 'col-correo' }, h('span', { class: 'esqueleto esqueleto--largo' })),
      h('td', { class: 'col-ingreso' }, h('span', { class: 'esqueleto esqueleto--corto' })),
      h('td', { class: 'col-salario' }, h('span', { class: 'esqueleto esqueleto--corto' })),
      h('td', {}),
    ),
  );
}

/** Botones de filtro por área. Cada uno muestra cuántos empleados dejaría ver. */
export function botonesFiltro({ areas, conteos, total, activa, alElegir }) {
  const boton = (valor, etiqueta, cuenta) =>
    h(
      'button',
      {
        type: 'button',
        class: 'filtro',
        'data-area': valor || false,
        'aria-pressed': String(activa === valor),
        onclick: () => alElegir(valor),
      },
      valor ? h('span', { class: 'filtro__punto', 'aria-hidden': 'true' }) : false,
      etiqueta,
      h('span', { class: 'filtro__cuenta' }, cuenta),
    );

  return [
    boton('', 'Todas', total),
    ...areas
      .filter((area) => (conteos[area] ?? 0) > 0 || area === activa)
      .map((area) => boton(area, area, conteos[area] ?? 0)),
  ];
}

/** Estados que reemplazan a la tabla: vacío, sin resultados y error. */
export function estadoVacio({ titulo, texto, accion }) {
  return h(
    'div',
    { class: 'estado' },
    h('div', { class: 'estado__ilustracion' }, crearCarnet().el),
    h(
      'div',
      { class: 'estado__texto' },
      h('h2', {}, titulo),
      h('p', {}, texto),
      accion && h('button', { type: 'button', class: 'boton boton--primario', onclick: accion.alPulsar }, accion.etiqueta),
    ),
  );
}
