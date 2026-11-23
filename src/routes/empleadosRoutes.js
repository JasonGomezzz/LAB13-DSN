import { Router } from 'express';

export function crearEmpleadosRoutes({ controller, subidaFoto }) {
  const router = Router();

  router.get('/', controller.listar);
  router.post('/', controller.crear);

  router.get('/:id', controller.obtener);
  router.put('/:id', controller.actualizar);
  router.delete('/:id', controller.eliminar);

  router.get('/:id/foto', controller.verFoto);
  router.put('/:id/foto', subidaFoto, controller.subirFoto);
  router.delete('/:id/foto', controller.quitarFoto);

  return router;
}
