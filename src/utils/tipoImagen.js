// Identifica la imagen por sus primeros bytes ("magic numbers"), no por el
// Content-Type ni la extensión que declara el cliente, que son falsificables.

const FIRMAS = [
  {
    tipo: 'image/jpeg',
    extension: 'jpg',
    coincide: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    tipo: 'image/png',
    extension: 'png',
    coincide: (b) =>
      b.length > 8 &&
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((valor, i) => b[i] === valor),
  },
  {
    tipo: 'image/webp',
    extension: 'webp',
    coincide: (b) =>
      b.length > 12 &&
      b.toString('ascii', 0, 4) === 'RIFF' &&
      b.toString('ascii', 8, 12) === 'WEBP',
  },
];

/** Devuelve { tipo, extension } si el buffer es JPG, PNG o WebP; si no, null. */
export function detectarImagen(buffer) {
  if (!Buffer.isBuffer(buffer)) return null;
  const firma = FIRMAS.find((candidata) => candidata.coincide(buffer));
  return firma ? { tipo: firma.tipo, extension: firma.extension } : null;
}
