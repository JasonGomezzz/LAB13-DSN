import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { s3 } from '../aws/clientes.js';
import { config } from '../config/env.js';

const Bucket = config.bucket;

export const fotosRepository = {
  /** Guarda la imagen en S3 con cifrado en reposo. La clave la decide el servicio. */
  async subir({ clave, buffer, tipo }) {
    await s3.send(
      new PutObjectCommand({
        Bucket,
        Key: clave,
        Body: buffer,
        ContentType: tipo,
        ServerSideEncryption: 'AES256',
        // La clave incluye un id único por subida, así que el contenido nunca cambia.
        CacheControl: 'private, max-age=31536000, immutable',
      }),
    );
  },

  /** Devuelve { cuerpo (stream), tipo, tamano, etag } o null si el objeto no existe. */
  async obtener(clave) {
    try {
      const respuesta = await s3.send(new GetObjectCommand({ Bucket, Key: clave }));
      return {
        cuerpo: respuesta.Body,
        tipo: respuesta.ContentType,
        tamano: respuesta.ContentLength,
        etag: respuesta.ETag,
      };
    } catch (error) {
      if (error.name === 'NoSuchKey') return null;
      throw error;
    }
  },

  /** Borrar una clave inexistente no falla en S3, por lo que es seguro reintentar. */
  async eliminar(clave) {
    await s3.send(new DeleteObjectCommand({ Bucket, Key: clave }));
  },
};
