import { pipeline } from 'node:stream/promises';
import { ErrorArchivo } from '../utils/errores.js';

export function crearEmpleadosController(servicio) {
  return {
    async listar(_req, res) {
      res.json(await servicio.listar());
    },

    async obtener(req, res) {
      res.json(await servicio.obtener(req.params.id));
    },

    async crear(req, res) {
      const creado = await servicio.crear(req.body);
      res.status(201).location(`/api/empleados/${creado.empleadoId}`).json(creado);
    },

    async actualizar(req, res) {
      res.json(await servicio.actualizar(req.params.id, req.body));
    },

    async eliminar(req, res) {
      await servicio.eliminar(req.params.id);
      res.status(204).end();
    },

    async subirFoto(req, res) {
      if (!req.file) throw new ErrorArchivo('Adjunta una imagen en el campo "foto"');
      res.json(await servicio.subirFoto(req.params.id, req.file.buffer));
    },

    async quitarFoto(req, res) {
      res.json(await servicio.quitarFoto(req.params.id));
    },

    // La foto se sirve a través de la API: el bucket permanece privado y el navegador
    // nunca ve claves ni URLs firmadas de S3.
    async verFoto(req, res) {
      const foto = await servicio.obtenerFoto(req.params.id);
      if (req.headers['if-none-match'] && req.headers['if-none-match'] === foto.etag) {
        foto.cuerpo.destroy?.(); // liberar el socket de S3 aunque no se lea el cuerpo
        return res.status(304).end();
      }
      res.set({
        'Content-Type': foto.tipo,
        'Content-Length': foto.tamano,
        'Cache-Control': 'private, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
        ...(foto.etag && { ETag: foto.etag }),
      });
      // pipeline destruye el stream de S3 si el cliente corta la conexión.
      await pipeline(foto.cuerpo, res);
    },
  };
}
