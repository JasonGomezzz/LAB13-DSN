import { ErrorValidacion } from './errores.js';

export const AREAS = Object.freeze([
  'Tecnología',
  'Recursos Humanos',
  'Finanzas',
  'Operaciones',
  'Comercial',
  'Marketing',
  'Legal',
]);

const NOMBRE = /^[\p{L}][\p{L} .'’-]*$/u;
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

function texto(valor) {
  return typeof valor === 'string' ? valor.trim().replace(/\s+/g, ' ') : '';
}

function fechaValida(cadena) {
  if (!FECHA.test(cadena)) return false;
  const fecha = new Date(`${cadena}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().startsWith(cadena);
}

function hoyISO(ahora = new Date()) {
  return ahora.toISOString().slice(0, 10);
}

/**
 * Valida el cuerpo de un empleado y devuelve solo los campos permitidos
 * (lista blanca): un cliente no puede colar empleadoId, fotoKey ni fechas de auditoría.
 * Lanza ErrorValidacion con un mensaje por campo.
 */
export function validarEmpleado(cuerpo, { ahora = new Date() } = {}) {
  const entrada = cuerpo && typeof cuerpo === 'object' ? cuerpo : {};
  const errores = {};

  const dni = texto(entrada.dni);
  if (!/^\d{8}$/.test(dni)) errores.dni = 'El DNI debe tener 8 dígitos';

  const nombres = texto(entrada.nombres);
  if (nombres.length < 2 || nombres.length > 60 || !NOMBRE.test(nombres)) {
    errores.nombres = 'Escribe los nombres (2 a 60 letras)';
  }

  const apellidos = texto(entrada.apellidos);
  if (apellidos.length < 2 || apellidos.length > 60 || !NOMBRE.test(apellidos)) {
    errores.apellidos = 'Escribe los apellidos (2 a 60 letras)';
  }

  const correo = texto(entrada.correo).toLowerCase();
  if (correo.length > 120 || !CORREO.test(correo)) {
    errores.correo = 'Escribe un correo válido, por ejemplo nombre@empresa.com';
  }

  const cargo = texto(entrada.cargo);
  if (cargo.length < 2 || cargo.length > 60) {
    errores.cargo = 'Escribe el cargo (2 a 60 caracteres)';
  }

  const area = texto(entrada.area);
  if (!AREAS.includes(area)) errores.area = 'Elige un área de la lista';

  const salario = Number(entrada.salario);
  if (
    entrada.salario === '' ||
    entrada.salario === null ||
    entrada.salario === undefined ||
    !Number.isFinite(salario) ||
    salario < 0 ||
    salario > 1_000_000
  ) {
    errores.salario = 'El salario debe ser un monto entre 0 y 1 000 000';
  }

  const fechaIngreso = texto(entrada.fechaIngreso);
  if (!fechaValida(fechaIngreso)) {
    errores.fechaIngreso = 'Elige una fecha válida';
  } else if (fechaIngreso > hoyISO(ahora)) {
    errores.fechaIngreso = 'La fecha de ingreso no puede ser futura';
  }

  if (Object.keys(errores).length) throw new ErrorValidacion(errores);

  return {
    dni,
    nombres,
    apellidos,
    correo,
    cargo,
    area,
    salario: Math.round(salario * 100) / 100,
    fechaIngreso,
  };
}
