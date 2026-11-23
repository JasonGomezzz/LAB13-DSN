import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { crearApp } from '../src/app.js';
import { entorno, PNG } from '../testing/entornoEnMemoria.js';

const LIMITE = 1024; // 1 KB para probar el rechazo de fotos pesadas sin generar megas
let servidor;
let base;
let memoria;

before(async () => {
  memoria = entorno();
  const app = crearApp({ servicio: memoria.servicio, fotoMaxBytes: LIMITE });
  await new Promise((listo) => {
    servidor = app.listen(0, '127.0.0.1', listo);
  });
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(() => new Promise((listo) => servidor.close(listo)));

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

const json = (metodo, ruta, datos) =>
  fetch(base + ruta, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });

function formularioFoto(contenido, nombre = 'foto.png', tipo = 'image/png') {
  const datos = new FormData();
  datos.append('foto', new Blob([contenido], { type: tipo }), nombre);
  return datos;
}

test('flujo completo: crear, leer, editar, subir foto, ver foto y eliminar', async () => {
  const creado = await json('POST', '/api/empleados', cuerpo());
  assert.equal(creado.status, 201);
  const empleado = await creado.json();
  assert.equal(creado.headers.get('location'), `/api/empleados/${empleado.empleadoId}`);

  const lista = await (await fetch(`${base}/api/empleados`)).json();
  assert.equal(lista.length, 1);

  const editado = await json('PUT', `/api/empleados/${empleado.empleadoId}`, cuerpo({ cargo: 'Líder' }));
  assert.equal((await editado.json()).cargo, 'Líder');

  const subida = await fetch(`${base}/api/empleados/${empleado.empleadoId}/foto`, {
    method: 'PUT',
    body: formularioFoto(PNG),
  });
  assert.equal(subida.status, 200);
  const conFoto = await subida.json();
  assert.ok(conFoto.fotoUrl);

  const foto = await fetch(base + conFoto.fotoUrl);
  assert.equal(foto.status, 200);
  assert.equal(foto.headers.get('content-type'), 'image/png');
  assert.equal(foto.headers.get('x-content-type-options'), 'nosniff');
  assert.deepEqual(Buffer.from(await foto.arrayBuffer()), PNG);

  const borrado = await fetch(`${base}/api/empleados/${empleado.empleadoId}`, { method: 'DELETE' });
  assert.equal(borrado.status, 204);
  assert.equal(memoria.objetos.size, 0, 'la foto también se eliminó de S3');
  assert.equal((await fetch(`${base}/api/empleados/${empleado.empleadoId}`)).status, 404);
});

test('POST con datos inválidos responde 400 con un mensaje por campo', async () => {
  const respuesta = await json('POST', '/api/empleados', cuerpo({ dni: '12', correo: 'x' }));
  assert.equal(respuesta.status, 400);
  const { detalles } = await respuesta.json();
  assert.ok(detalles.dni && detalles.correo);
});

test('POST con DNI repetido responde 409', async () => {
  const dni = '99999999';
  assert.equal((await json('POST', '/api/empleados', cuerpo({ dni }))).status, 201);
  const repetido = await json('POST', '/api/empleados', cuerpo({ dni, correo: 'otro@empresa.com' }));
  assert.equal(repetido.status, 409);
  assert.ok((await repetido.json()).detalles.dni);
});

test('JSON mal formado responde 400, no 500', async () => {
  const respuesta = await fetch(`${base}/api/empleados`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"dni": ',
  });
  assert.equal(respuesta.status, 400);
});

test('un id inexistente responde 404 en todas las rutas', async () => {
  const id = '11111111-1111-4111-8111-111111111111';
  for (const [metodo, ruta] of [
    ['GET', `/api/empleados/${id}`],
    ['GET', `/api/empleados/${id}/foto`],
    ['DELETE', `/api/empleados/${id}`],
  ]) {
    assert.equal((await fetch(base + ruta, { method: metodo })).status, 404, `${metodo} ${ruta}`);
  }
  assert.equal((await json('PUT', `/api/empleados/${id}`, cuerpo())).status, 404);
});

test('la subida de foto rechaza archivos pesados (413), falsos (415) y ausentes (400)', async () => {
  const { empleadoId } = await (
    await json('POST', '/api/empleados', cuerpo({ dni: '88888888', correo: 'f@empresa.com' }))
  ).json();
  const ruta = `${base}/api/empleados/${empleadoId}/foto`;

  const pesada = await fetch(ruta, { method: 'PUT', body: formularioFoto(Buffer.concat([PNG, Buffer.alloc(LIMITE)])) });
  assert.equal(pesada.status, 413);

  const falsa = await fetch(ruta, {
    method: 'PUT',
    body: formularioFoto(Buffer.from('<script>alert(1)</script>'), 'evil.png', 'image/png'),
  });
  assert.equal(falsa.status, 415, 'el Content-Type declarado no basta: se valida el contenido');

  const vacia = await fetch(ruta, { method: 'PUT', body: new FormData() });
  assert.equal(vacia.status, 400);
  assert.equal(memoria.objetos.size, 0);
});

test('las respuestas llevan CSP y nunca exponen fotoKey ni X-Powered-By', async () => {
  const respuesta = await fetch(`${base}/api/empleados`);
  assert.match(respuesta.headers.get('content-security-policy'), /default-src 'self'/);
  assert.equal(respuesta.headers.get('x-powered-by'), null);
  assert.ok(!JSON.stringify(await respuesta.json()).includes('fotoKey'));
});

test('rutas de API desconocidas devuelven JSON 404', async () => {
  const respuesta = await fetch(`${base}/api/nada`);
  assert.equal(respuesta.status, 404);
  assert.match(respuesta.headers.get('content-type'), /json/);
});

test('GET /api/configuracion entrega las áreas y el límite de foto', async () => {
  const respuesta = await fetch(`${base}/api/configuracion`);
  assert.equal(respuesta.status, 200);
  const { areas, fotoMaxMb } = await respuesta.json();
  assert.ok(areas.includes('Tecnología') && areas.length >= 2);
  assert.equal(fotoMaxMb, LIMITE / 1024 / 1024);
});
