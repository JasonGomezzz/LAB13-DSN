import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarEmpleado } from '../src/utils/validarEmpleado.js';
import { ErrorValidacion } from '../src/utils/errores.js';

const ahora = new Date('2026-11-22T12:00:00Z');

const valido = () => ({
  dni: '70123456',
  nombres: 'Lucía María',
  apellidos: 'Quispe Huamán',
  correo: 'Lucia.Quispe@Empresa.com',
  cargo: 'Analista de datos',
  area: 'Tecnología',
  salario: '4500.456',
  fechaIngreso: '2024-03-15',
});

function errorDe(cambios) {
  try {
    validarEmpleado({ ...valido(), ...cambios }, { ahora });
  } catch (error) {
    assert.ok(error instanceof ErrorValidacion);
    return error.detalles;
  }
  assert.fail('Se esperaba un ErrorValidacion');
}

test('acepta un empleado válido y normaliza correo y salario', () => {
  const resultado = validarEmpleado(valido(), { ahora });
  assert.equal(resultado.correo, 'lucia.quispe@empresa.com');
  assert.equal(resultado.salario, 4500.46);
  assert.equal(resultado.nombres, 'Lucía María');
});

test('descarta campos que el cliente no puede definir', () => {
  const resultado = validarEmpleado(
    { ...valido(), empleadoId: 'x', fotoKey: 'otra/ruta.png', creadoEn: '2000-01-01' },
    { ahora },
  );
  assert.deepEqual(Object.keys(resultado).sort(), [
    'apellidos', 'area', 'cargo', 'correo', 'dni', 'fechaIngreso', 'nombres', 'salario',
  ]);
});

test('rechaza DNI que no tiene 8 dígitos', () => {
  assert.ok(errorDe({ dni: '1234567' }).dni);
  assert.ok(errorDe({ dni: '1234567a' }).dni);
});

test('rechaza correo inválido y área fuera de la lista', () => {
  assert.ok(errorDe({ correo: 'sin-arroba' }).correo);
  assert.ok(errorDe({ area: 'Piratería' }).area);
});

test('rechaza salario negativo, vacío o no numérico', () => {
  assert.ok(errorDe({ salario: -1 }).salario);
  assert.ok(errorDe({ salario: '' }).salario);
  assert.ok(errorDe({ salario: 'mucho' }).salario);
});

test('rechaza fechas inexistentes y futuras', () => {
  assert.ok(errorDe({ fechaIngreso: '2024-02-30' }).fechaIngreso);
  assert.ok(errorDe({ fechaIngreso: '2027-01-01' }).fechaIngreso);
});

test('acumula todos los errores en una sola respuesta', () => {
  const errores = errorDe({ dni: '1', nombres: '', cargo: '' });
  assert.deepEqual(Object.keys(errores).sort(), ['cargo', 'dni', 'nombres']);
});

test('un cuerpo ausente falla sin lanzar TypeError', () => {
  assert.throws(() => validarEmpleado(undefined, { ahora }), ErrorValidacion);
});
