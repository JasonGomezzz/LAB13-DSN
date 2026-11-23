import { config } from './config/env.js';
import { empleadosRepository } from './repositories/empleadosRepository.js';
import { fotosRepository } from './repositories/fotosRepository.js';
import { crearEmpleadosService } from './services/empleadosService.js';
import { crearApp } from './app.js';

const servicio = crearEmpleadosService({
  empleados: empleadosRepository,
  fotos: fotosRepository,
});

const app = crearApp({ servicio, fotoMaxBytes: config.fotoMaxBytes });

const servidor = app.listen(config.puerto, () => {
  const destino = config.aws.endpoint ?? `AWS ${config.aws.region}`;
  console.log(`Empleados escuchando en http://localhost:${config.puerto} · datos en ${destino}`);
});

// Cierre ordenado: deja terminar las peticiones en curso antes de salir.
for (const señal of ['SIGINT', 'SIGTERM']) {
  process.on(señal, () => {
    console.log(`\n${señal} recibido, cerrando…`);
    servidor.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  });
}
