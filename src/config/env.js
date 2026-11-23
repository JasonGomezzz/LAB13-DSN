// Lee y valida las variables de entorno una sola vez.
// El resto de la app importa `config` y nunca toca process.env directamente.

function requerida(nombre) {
  const valor = process.env[nombre]?.trim();
  if (!valor) {
    throw new Error(
      `Falta la variable de entorno ${nombre}. Copia .env.example a .env y complétala.`,
    );
  }
  return valor;
}

function entero(nombre, porDefecto) {
  const crudo = process.env[nombre]?.trim();
  if (!crudo) return porDefecto;
  const numero = Number(crudo);
  if (!Number.isInteger(numero) || numero <= 0) {
    throw new Error(`${nombre} debe ser un entero positivo (recibido: "${crudo}").`);
  }
  return numero;
}

export const config = Object.freeze({
  puerto: entero('PORT', 3000),
  aws: Object.freeze({
    region: process.env.AWS_REGION?.trim() || 'us-east-1',
    // Vacío en AWS real; apunta a LocalStack en desarrollo local.
    endpoint: process.env.AWS_ENDPOINT_URL?.trim() || undefined,
  }),
  tabla: requerida('DYNAMODB_TABLE'),
  bucket: requerida('S3_BUCKET'),
  fotoMaxBytes: entero('MAX_FOTO_MB', 2) * 1024 * 1024,
});
