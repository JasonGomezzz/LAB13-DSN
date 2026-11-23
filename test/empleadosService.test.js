import { test } from 'node:test';
import assert from 'node:assert/strict';
import { entorno, PNG } from '../testing/entornoEnMemoria.js';
import { ErrorConflicto, ErrorNoEncontrado, ErrorValidacion, ErrorApp } from '../src/utils/errores.js';

const cuerpo = (extra = {}) => ({
  dni: '70123456',
  nombres: 'Lucía',
  apellidos: 'Quispe',
  correo: 'lucia@empresa.com',
  cargo: 'Analista',
  area: 'Tecnología',
  salario: 4500,
  fechaIngreso: '2024-03-15',
  ...extra,
});

test('crear asigna id y fechas, y no expone fotoKey', async () => {
  const { servicio } = entorno();
  const creado = await servicio.crear(cuerpo());
  assert.match(creado.empleadoId, /^0{8}-/);
  assert.equal(creado.creadoEn, '2026-11-22T12:00:00.000Z');
  assert.equal(creado.fotoUrl, null);
  assert.ok(!('fotoKey' in creado));
});

test('crear rechaza datos inválidos y DNI repetido', async () => {
  const { servicio } = entorno();
  await assert.rejects(() => servicio.crear(cuerpo({ dni: '1' })), ErrorValidacion);
  await servicio.crear(cuerpo());
  await assert.rejects(() => servicio.crear(cuerpo({ correo: 'otro@empresa.com' })), ErrorConflicto);
});

test('listar ordena por apellidos y nombres', async () => {
  const { servicio } = entorno();
  await servicio.crear(cuerpo({ dni: '10000001', apellidos: 'Zegarra', nombres: 'Ana' }));
  await servicio.crear(cuerpo({ dni: '10000002', apellidos: 'Álvarez', nombres: 'Luis' }));
  await servicio.crear(cuerpo({ dni: '10000003', apellidos: 'Álvarez', nombres: 'Beto' }));
  const nombres = (await servicio.listar()).map((e) => e.nombres);
  assert.deepEqual(nombres, ['Beto', 'Luis', 'Ana']);
});

test('actualizar permite conservar el propio DNI pero no tomar el de otro', async () => {
  const { servicio } = entorno();
  const a = await servicio.crear(cuerpo({ dni: '10000001' }));
  await servicio.crear(cuerpo({ dni: '10000002', correo: 'b@empresa.com' }));
  const editado = await servicio.actualizar(a.empleadoId, cuerpo({ dni: '10000001', cargo: 'Líder' }));
  assert.equal(editado.cargo, 'Líder');
  await assert.rejects(
    () => servicio.actualizar(a.empleadoId, cuerpo({ dni: '10000002' })),
    ErrorConflicto,
  );
});

test('ids inexistentes o mal formados responden como no encontrados', async () => {
  const { servicio } = entorno();
  await assert.rejects(() => servicio.obtener('no-es-uuid'), ErrorNoEncontrado);
  await assert.rejects(
    () => servicio.obtener('11111111-1111-4111-8111-111111111111'),
    ErrorNoEncontrado,
  );
  await assert.rejects(() => servicio.eliminar('no-es-uuid'), ErrorNoEncontrado);
});

test('subirFoto guarda en S3, expone fotoUrl y reemplaza la foto anterior', async () => {
  const { servicio, objetos } = entorno();
  const { empleadoId } = await servicio.crear(cuerpo());

  const primera = await servicio.subirFoto(empleadoId, PNG);
  assert.match(primera.fotoUrl, new RegExp(`^/api/empleados/${empleadoId}/foto\\?v=`));
  assert.equal(objetos.size, 1);

  const segunda = await servicio.subirFoto(empleadoId, PNG);
  assert.notEqual(segunda.fotoUrl, primera.fotoUrl, 'la URL cambia para evitar caché obsoleta');
  assert.equal(objetos.size, 1, 'la foto anterior se borró de S3');
});

test('subirFoto rechaza archivos que no son imagen y no guarda nada', async () => {
  const { servicio, objetos } = entorno();
  const { empleadoId } = await servicio.crear(cuerpo());
  await assert.rejects(
    () => servicio.subirFoto(empleadoId, Buffer.from('<script>alert(1)</script>')),
    (error) => error instanceof ErrorApp && error.estado === 415,
  );
  assert.equal(objetos.size, 0);
});

test('eliminar borra también la foto de S3', async () => {
  const { servicio, objetos } = entorno();
  const { empleadoId } = await servicio.crear(cuerpo());
  await servicio.subirFoto(empleadoId, PNG);
  await servicio.eliminar(empleadoId);
  assert.equal(objetos.size, 0);
  await assert.rejects(() => servicio.obtener(empleadoId), ErrorNoEncontrado);
});

test('si se elimina el empleado mientras se sube la foto, no queda un objeto huérfano', async () => {
  const { servicio, objetos, tabla, fotos } = entorno();
  const { empleadoId } = await servicio.crear(cuerpo());
  // Simula la carrera: la fila desaparece justo después de que S3 recibe el archivo.
  const subirOriginal = fotos.subir;
  fotos.subir = async (datos) => {
    await subirOriginal(datos);
    tabla.delete(empleadoId);
  };
  await assert.rejects(() => servicio.subirFoto(empleadoId, PNG), ErrorNoEncontrado);
  assert.equal(objetos.size, 0);
});

test('obtenerFoto falla con 404 si el empleado no tiene foto', async () => {
  const { servicio } = entorno();
  const { empleadoId } = await servicio.crear(cuerpo());
  await assert.rejects(() => servicio.obtenerFoto(empleadoId), ErrorNoEncontrado);
});

test('quitarFoto deja al empleado sin foto y limpia S3', async () => {
  const { servicio, objetos, tabla } = entorno();
  const { empleadoId } = await servicio.crear(cuerpo());
  await servicio.subirFoto(empleadoId, PNG);
  const sinFoto = await servicio.quitarFoto(empleadoId);
  assert.equal(sinFoto.fotoUrl, null);
  assert.equal(objetos.size, 0);
  assert.ok(!('fotoKey' in tabla.get(empleadoId)), 'el atributo se elimina, no se guarda como null');
});
