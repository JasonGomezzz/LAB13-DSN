import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectarImagen } from '../src/utils/tipoImagen.js';

const relleno = Buffer.alloc(16);

test('reconoce JPG, PNG y WebP por su firma', () => {
  const jpg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), relleno]);
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), relleno]);
  const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), relleno]);

  assert.deepEqual(detectarImagen(jpg), { tipo: 'image/jpeg', extension: 'jpg' });
  assert.deepEqual(detectarImagen(png), { tipo: 'image/png', extension: 'png' });
  assert.deepEqual(detectarImagen(webp), { tipo: 'image/webp', extension: 'webp' });
});

test('rechaza archivos que no son imágenes permitidas', () => {
  assert.equal(detectarImagen(Buffer.from('<svg onload="alert(1)"></svg>')), null);
  assert.equal(detectarImagen(Buffer.from('GIF89a' + 'x'.repeat(20))), null);
  assert.equal(detectarImagen(Buffer.from('%PDF-1.7 ' + 'x'.repeat(20))), null);
});

test('rechaza buffers vacíos o valores que no son buffer', () => {
  assert.equal(detectarImagen(Buffer.alloc(0)), null);
  assert.equal(detectarImagen(null), null);
  assert.equal(detectarImagen('texto'), null);
});
