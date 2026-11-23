import multer from 'multer';

/**
 * Recibe una sola imagen en el campo "foto". Se guarda en memoria (y no en disco)
 * porque se envía directo a S3; el límite de tamaño evita agotar la RAM del servidor.
 * El tipo real se valida después por contenido, no por lo que diga el cliente.
 */
export function crearSubidaFoto({ maxBytes }) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes, files: 1, fields: 0, parts: 2 },
  }).single('foto');
}
