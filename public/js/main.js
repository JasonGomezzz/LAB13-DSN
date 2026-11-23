import { api, ErrorApi } from './api.js';
import { crearFormulario } from './formulario.js';
import { botonesFiltro, estadoVacio, filaEmpleado, filasEsqueleto } from './lista.js';
import { normalizar, plural } from './formato.js';
import { avisar, h } from './ui.js';

const $ = (id) => document.getElementById(id);
const el = {
  conteo: $('conteo'),
  buscar: $('buscar'),
  filtros: $('filtros'),
  tabla: $('tabla'),
  filas: $('filas'),
  estado: $('estado'),
  nuevo: $('boton-nuevo'),
  dialogoEliminar: $('dialogo-eliminar'),
};

const estado = {
  empleados: [],
  areas: [],
  texto: '',
  area: '',
  cargando: true,
  error: null,
};

let formulario;
let destacarId = null;

const ordenar = (lista) =>
  lista.sort(
    (a, b) => a.apellidos.localeCompare(b.apellidos, 'es') || a.nombres.localeCompare(b.nombres, 'es'),
  );

function coincideTexto(empleado) {
  const palabras = normalizar(estado.texto).split(/\s+/).filter(Boolean);
  if (!palabras.length) return true;
  const pajar = normalizar(
    `${empleado.nombres} ${empleado.apellidos} ${empleado.dni} ${empleado.cargo} ${empleado.correo}`,
  );
  return palabras.every((palabra) => pajar.includes(palabra));
}

// ---------- render ----------
function render() {
  const porTexto = estado.empleados.filter(coincideTexto);
  const visibles = estado.area ? porTexto.filter((e) => e.area === estado.area) : porTexto;
  const conteos = Object.groupBy(porTexto, (e) => e.area);
  const cuentaPorArea = Object.fromEntries(Object.entries(conteos).map(([area, lista]) => [area, lista.length]));

  // Conteo en la cabecera
  if (estado.cargando) el.conteo.textContent = '';
  else if (estado.error) el.conteo.textContent = '';
  else if (visibles.length === estado.empleados.length) el.conteo.textContent = plural(visibles.length, 'empleado', 'empleados');
  else el.conteo.textContent = `${visibles.length} de ${plural(estado.empleados.length, 'empleado', 'empleados')}`;

  // Filtros
  el.filtros.replaceChildren(
    ...(estado.cargando || estado.error || !estado.empleados.length
      ? []
      : botonesFiltro({
          areas: estado.areas,
          conteos: cuentaPorArea,
          total: porTexto.length,
          activa: estado.area,
          alElegir: (area) => {
            estado.area = area;
            render();
          },
        })),
  );
  $('herramientas').hidden = !estado.cargando && !estado.error && !estado.empleados.length;

  // Cuerpo: tabla o un estado que la reemplaza
  el.estado.replaceChildren();
  el.tabla.hidden = false;

  if (estado.cargando) {
    el.filas.replaceChildren(...filasEsqueleto());
    return;
  }

  if (estado.error) {
    el.tabla.hidden = true;
    el.estado.append(
      estadoVacio({
        titulo: 'No pudimos cargar los empleados',
        texto: estado.error,
        accion: { etiqueta: 'Reintentar', alPulsar: cargar },
      }),
    );
    return;
  }

  if (!estado.empleados.length) {
    el.tabla.hidden = true;
    el.estado.append(
      estadoVacio({
        titulo: 'Aún no hay empleados',
        texto: 'Registra al primero para empezar el directorio.',
        accion: { etiqueta: 'Nuevo empleado', alPulsar: () => formulario.abrir() },
      }),
    );
    return;
  }

  if (!visibles.length) {
    el.tabla.hidden = true;
    el.estado.append(
      estadoVacio({
        titulo: 'Sin resultados',
        texto: estado.texto.trim()
          ? `Ningún empleado coincide con “${estado.texto.trim()}”. Prueba con otro nombre, DNI o cargo.`
          : 'Ningún empleado tiene esa área todavía.',
        accion: {
          etiqueta: 'Quitar filtros',
          alPulsar: () => {
            estado.texto = '';
            estado.area = '';
            el.buscar.value = '';
            render();
          },
        },
      }),
    );
    return;
  }

  el.filas.replaceChildren(
    ...visibles.map((empleado) => filaEmpleado(empleado, { alEditar: (e) => formulario.abrir(e), alEliminar: pedirEliminar })),
  );

  if (destacarId) {
    const fila = el.filas.querySelector(`tr[data-id="${destacarId}"]`);
    destacarId = null;
    if (fila) {
      fila.classList.add('fila--reciente');
      fila.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }
}

// ---------- datos ----------
async function cargar() {
  estado.cargando = true;
  estado.error = null;
  render();
  try {
    const [config, empleados] = await Promise.all([
      estado.areas.length ? null : api.configuracion(),
      api.listar(),
    ]);
    if (config) {
      estado.areas = config.areas;
      formulario ??= crearFormulario({ areas: config.areas, fotoMaxMb: config.fotoMaxMb, alGuardar });
    }
    estado.empleados = ordenar(empleados);
  } catch (error) {
    estado.error = error instanceof ErrorApi ? error.message : 'Ocurrió un error inesperado.';
  } finally {
    estado.cargando = false;
    render();
  }
}

function alGuardar(empleado, esNuevo) {
  const indice = estado.empleados.findIndex((e) => e.empleadoId === empleado.empleadoId);
  if (indice >= 0) estado.empleados[indice] = empleado;
  else estado.empleados.push(empleado);
  ordenar(estado.empleados);

  // Si el empleado guardado quedaría oculto por un filtro activo, se quitan para que se vea
  if (!coincideTexto(empleado) || (estado.area && estado.area !== empleado.area)) {
    estado.texto = '';
    estado.area = '';
    el.buscar.value = '';
  }
  destacarId = empleado.empleadoId;
  render();
  avisar(esNuevo ? 'Empleado guardado' : 'Cambios guardados');
}

// ---------- eliminar ----------
function pedirEliminar(empleado) {
  const dialogo = el.dialogoEliminar;
  const nombre = `${empleado.nombres} ${empleado.apellidos}`;
  $('eliminar-titulo').textContent = `¿Eliminar a ${nombre}?`;
  const confirmar = $('eliminar-confirmar');
  confirmar.disabled = false;
  confirmar.textContent = 'Eliminar empleado';

  confirmar.onclick = async () => {
    confirmar.disabled = true;
    confirmar.textContent = 'Eliminando…';
    try {
      await api.eliminar(empleado.empleadoId);
      estado.empleados = estado.empleados.filter((e) => e.empleadoId !== empleado.empleadoId);
      dialogo.close();
      render();
      avisar('Empleado eliminado');
    } catch (error) {
      dialogo.close();
      // Si ya no existía (otra pestaña lo borró), la lista local también se corrige
      if (error instanceof ErrorApi && error.estado === 404) {
        estado.empleados = estado.empleados.filter((e) => e.empleadoId !== empleado.empleadoId);
        render();
      }
      avisar(error.message, 'error');
    }
  };
  dialogo.showModal();
}

for (const boton of el.dialogoEliminar.querySelectorAll('[data-cerrar]')) {
  boton.addEventListener('click', () => el.dialogoEliminar.close());
}

// ---------- eventos ----------
el.buscar.addEventListener('input', () => {
  estado.texto = el.buscar.value;
  render();
});

el.nuevo.addEventListener('click', () => formulario?.abrir());

cargar();
