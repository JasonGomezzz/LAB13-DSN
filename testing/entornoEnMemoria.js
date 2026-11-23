import { Readable } from 'node:stream';
import { crearEmpleadosService } from '../src/services/empleadosService.js';

export const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(32),
]);

// Repositorios en memoria que imitan el contrato de DynamoDB y S3.
export function entorno() {
  const tabla = new Map();
  const objetos = new Map();
  let contador = 0;
  const empleados = {
    async crear(e) { tabla.set(e.empleadoId, { ...e }); return { ...e }; },
    async obtener(id) { return tabla.has(id) ? { ...tabla.get(id) } : null; },
    async listar() { return [...tabla.values()].map((e) => ({ ...e })); },
    async buscarPorDni(dni) { return [...tabla.values()].find((e) => e.dni === dni) ?? null; },
    async actualizar(id, campos) {
      if (!tabla.has(id)) return null;
      const nuevo = { ...tabla.get(id), ...campos };
      // Mismo contrato que el repositorio real: null elimina el atributo.
      for (const [campo, valor] of Object.entries(campos)) if (valor === null) delete nuevo[campo];
      tabla.set(id, nuevo);
      return { ...nuevo };
    },
    async eliminar(id) {
      const previo = tabla.get(id) ?? null;
      tabla.delete(id);
      return previo;
    },
  };
  const fotos = {
    async subir({ clave, buffer, tipo }) { objetos.set(clave, { buffer, tipo }); },
    // Mismo contrato que fotosRepository.obtener: { cuerpo (stream), tipo, tamano, etag }.
    async obtener(clave) {
      if (!objetos.has(clave)) return null;
      const { buffer, tipo } = objetos.get(clave);
      return { cuerpo: Readable.from([buffer]), tipo, tamano: buffer.length, etag: `"${clave}"` };
    },
    async eliminar(clave) { objetos.delete(clave); },
  };
  const servicio = crearEmpleadosService({
    empleados,
    fotos,
    generarId: () => `00000000-0000-4000-8000-${String(++contador).padStart(12, '0')}`,
    ahora: () => new Date('2026-11-22T12:00:00Z'),
    registrar: () => {},
  });
  return { servicio, tabla, objetos, fotos };
}
