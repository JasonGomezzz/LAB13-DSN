import { api, ErrorApi } from './api.js';
import { crearCarnet } from './carnet.js';
import { fechaDeHoy } from './formato.js';
import { h } from './ui.js';

const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp'];

// nombre del campo en la API -> id del control en el HTML
const CONTROLES = {
  dni: 'f-dni',
  nombres: 'f-nombres',
  apellidos: 'f-apellidos',
  correo: 'f-correo',
  cargo: 'f-cargo',
  area: 'f-area',
  salario: 'f-salario',
  fechaIngreso: 'f-fecha',
  foto: 'f-foto',
};
const CAMPOS_DE_DATOS = ['dni', 'nombres', 'apellidos', 'correo', 'cargo', 'area', 'salario', 'fechaIngreso'];

/**
 * Panel lateral de alta y edición.
 * @param {{ areas: string[], fotoMaxMb: number, alGuardar: (empleado: object, esNuevo: boolean) => void }} opciones
 */
export function crearFormulario({ areas, fotoMaxMb, alGuardar }) {
  const $ = (id) => document.getElementById(id);
  const panel = $('panel');
  const form = $('form-empleado');
  const controles = Object.fromEntries(Object.entries(CONTROLES).map(([campo, id]) => [campo, $(id)]));
  const botonGuardar = $('boton-guardar');
  const botonQuitar = $('quitar-foto');
  const errorGeneral = $('form-error');
  const carnet = crearCarnet();
  $('carnet-montaje').append(carnet.el);

  controles.area.append(
    h('option', { value: '', disabled: true, selected: true }, 'Elige un área'),
    ...areas.map((area) => h('option', { value: area }, area)),
  );
  controles.fechaIngreso.max = fechaDeHoy();
  $('foto-ayuda').textContent = `JPG, PNG o WebP, hasta ${Number(fotoMaxMb.toFixed(2))} MB.`;

  let empleado = null; // null = alta nueva
  let archivo = null; // foto elegida y aún sin subir
  let urlPrevia = null; // URL temporal para mostrarla antes de subirla
  let quitar = false; // el usuario pidió borrar la foto actual

  const leer = () => Object.fromEntries(CAMPOS_DE_DATOS.map((campo) => [campo, controles[campo].value]));

  function fotoVisible() {
    if (urlPrevia) return urlPrevia;
    return quitar ? null : (empleado?.fotoUrl ?? null);
  }

  function refrescarVista() {
    carnet.actualizar({ ...leer(), fotoUrl: fotoVisible() });
    botonQuitar.hidden = !fotoVisible();
  }

  function soltarPrevia() {
    if (urlPrevia) URL.revokeObjectURL(urlPrevia);
    urlPrevia = null;
  }

  // ---------- errores ----------
  function limpiarErrores() {
    errorGeneral.hidden = true;
    for (const [campo, control] of Object.entries(controles)) {
      control.removeAttribute('aria-invalid');
      control.removeAttribute('aria-describedby');
      const mensaje = $(`e-${campo}`);
      mensaje.hidden = true;
      mensaje.textContent = '';
    }
  }

  function marcarError(campo, texto) {
    const control = controles[campo];
    const mensaje = $(`e-${campo}`);
    if (!control || !mensaje) return false;
    control.setAttribute('aria-invalid', 'true');
    control.setAttribute('aria-describedby', mensaje.id);
    mensaje.textContent = texto;
    mensaje.hidden = false;
    return true;
  }

  function mostrarErrores(error) {
    const mensajes = error instanceof ErrorApi && error.detalles ? Object.entries(error.detalles) : [];
    const marcados = mensajes.filter(([campo, texto]) => marcarError(campo, texto));
    if (marcados.length) {
      controles[marcados[0][0]].focus();
    } else {
      errorGeneral.textContent = error.message;
      errorGeneral.hidden = false;
      errorGeneral.focus?.();
    }
  }

  // ---------- foto ----------
  controles.foto.addEventListener('change', () => {
    const elegido = controles.foto.files?.[0];
    if (!elegido) return;
    $('e-foto').hidden = true;
    controles.foto.removeAttribute('aria-invalid');

    if (!TIPOS_FOTO.includes(elegido.type)) {
      controles.foto.value = '';
      marcarError('foto', 'Elige una imagen JPG, PNG o WebP');
      return;
    }
    if (elegido.size > fotoMaxMb * 1024 * 1024) {
      controles.foto.value = '';
      marcarError('foto', `La foto pesa demasiado: el máximo es ${Number(fotoMaxMb.toFixed(2))} MB`);
      return;
    }
    soltarPrevia();
    archivo = elegido;
    quitar = false;
    urlPrevia = URL.createObjectURL(elegido);
    refrescarVista();
  });

  botonQuitar.addEventListener('click', () => {
    soltarPrevia();
    archivo = null;
    controles.foto.value = '';
    quitar = Boolean(empleado?.fotoUrl);
    refrescarVista();
  });

  form.addEventListener('input', refrescarVista);

  // ---------- guardar ----------
  function ocupado(estado) {
    botonGuardar.disabled = estado;
    botonGuardar.textContent = estado ? 'Guardando…' : 'Guardar empleado';
    form.setAttribute('aria-busy', String(estado));
  }

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    if (botonGuardar.disabled) return;
    limpiarErrores();
    ocupado(true);

    const esNuevo = !empleado;
    let guardado;
    try {
      guardado = empleado ? await api.actualizar(empleado.empleadoId, leer()) : await api.crear(leer());
    } catch (error) {
      mostrarErrores(error);
      ocupado(false);
      return;
    }

    // Desde aquí los datos ya están guardados: si la foto falla, el panel pasa a modo edición
    // para reintentar sin crear un duplicado.
    empleado = guardado;
    try {
      if (archivo) guardado = await api.subirFoto(guardado.empleadoId, archivo);
      else if (quitar && guardado.fotoUrl) guardado = await api.quitarFoto(guardado.empleadoId);
    } catch (error) {
      empleado = guardado;
      $('panel-titulo').textContent = 'Editar empleado';
      alGuardar(guardado, esNuevo);
      errorGeneral.textContent = 'Guardamos los datos, pero la foto no se subió. Elige la foto de nuevo y guarda otra vez.';
      errorGeneral.hidden = false;
      marcarError('foto', error.message);
      ocupado(false);
      return;
    }

    ocupado(false);
    cerrar();
    alGuardar(guardado, esNuevo);
  });

  // ---------- abrir y cerrar ----------
  function cerrar() {
    if (panel.open) panel.close();
  }

  panel.addEventListener('close', () => {
    soltarPrevia();
    archivo = null;
    quitar = false;
  });

  for (const boton of panel.querySelectorAll('[data-cerrar]')) boton.addEventListener('click', cerrar);

  function abrir(existente = null) {
    empleado = existente;
    archivo = null;
    quitar = false;
    soltarPrevia();
    form.reset();
    limpiarErrores();
    controles.area.value = '';

    if (existente) {
      for (const campo of CAMPOS_DE_DATOS) controles[campo].value = existente[campo] ?? '';
    }
    $('panel-titulo').textContent = existente ? 'Editar empleado' : 'Nuevo empleado';
    refrescarVista();

    // Reinicia la animación del carnet cada vez que se abre el panel
    carnet.el.classList.remove('carnet--cuelga');
    void carnet.el.offsetWidth;
    carnet.el.classList.add('carnet--cuelga');

    panel.showModal();
    // En alta nueva el cursor va al primer campo; en edición, al nombre.
    (existente ? controles.nombres : controles.dni).focus();
  }

  return { abrir };
}
