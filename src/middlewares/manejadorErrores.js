import multer from 'multer';
import { ErrorApp } from '../utils/errores.js';

/** 404 para rutas de la API que no existen (en lugar de la página HTML por defecto). */
export function rutaNoEncontrada(_req, res) {
  res.status(404).json({ error: 'Esa ruta no existe' });
}

/** Manejador global: traduce cada error a un código HTTP y un JSON consistente. */
export function manejadorErrores(error, _req, res, next) {
  // Si ya se enviaron cabeceras (p. ej. falló el stream de una foto a medias), Express cierra la conexión.
  if (res.headersSent) return next(error);

  if (error instanceof ErrorApp) {
    return res.status(error.estado).json({ error: error.message, detalles: error.detalles });
  }

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: 'La foto es demasiado pesada',
        detalles: { foto: 'La foto supera el tamaño máximo permitido' },
      });
    }
    return res.status(400).json({
      error: 'No pudimos leer la foto',
      detalles: { foto: 'Adjunta una sola imagen en el campo "foto"' },
    });
  }

  // body-parser marca el JSON mal formado con este tipo.
  if (error?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido' });
  }
  if (error?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'La petición es demasiado grande' });
  }

  // Error inesperado: se registra completo en el servidor y al cliente solo le llega un mensaje genérico.
  console.error('Error no controlado:', error);
  return res.status(500).json({ error: 'Algo salió mal de nuestro lado. Inténtalo de nuevo.' });
}
