import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { crearEmpleadosController } from './controllers/empleadosController.js';
import { crearEmpleadosRoutes } from './routes/empleadosRoutes.js';
import { crearSubidaFoto } from './middlewares/subidaFoto.js';
import { manejadorErrores, rutaNoEncontrada } from './middlewares/manejadorErrores.js';
import { AREAS } from './utils/validarEmpleado.js';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Todo se sirve desde el mismo origen: sin scripts, estilos ni fuentes de terceros.
const CSP = [
  "default-src 'self'",
  "img-src 'self' data: blob:",
  "style-src 'self'",
  "script-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

/** Construye la app sin arrancarla, para poder probarla con un servicio falso. */
export function crearApp({ servicio, fotoMaxBytes }) {
  const app = express();
  app.disable('x-powered-by');

  app.use((_req, res, next) => {
    res.set({
      'Content-Security-Policy': CSP,
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'same-origin',
    });
    next();
  });

  // Fuentes servidas desde node_modules: la interfaz funciona sin internet.
  app.use(
    '/fuentes/bricolage',
    express.static(path.join(raiz, 'node_modules/@fontsource-variable/bricolage-grotesque')),
  );
  app.use(
    '/fuentes/instrument',
    express.static(path.join(raiz, 'node_modules/@fontsource-variable/instrument-sans')),
  );
  app.use(express.static(path.join(raiz, 'public')));

  app.get('/api/salud', (_req, res) => res.json({ estado: 'ok' }));

  // La interfaz lee de aquí las áreas y el límite de foto, para no duplicarlos ni desincronizarlos.
  app.get('/api/configuracion', (_req, res) =>
    res.json({ areas: AREAS, fotoMaxMb: fotoMaxBytes / 1024 / 1024 }),
  );

  const controller = crearEmpleadosController(servicio);
  const subidaFoto = crearSubidaFoto({ maxBytes: fotoMaxBytes });
  app.use(
    '/api/empleados',
    express.json({ limit: '20kb' }),
    crearEmpleadosRoutes({ controller, subidaFoto }),
  );

  app.use('/api', rutaNoEncontrada);
  app.use(manejadorErrores);
  return app;
}
