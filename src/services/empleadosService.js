import { randomUUID } from 'node:crypto';
import { validarEmpleado } from '../utils/validarEmpleado.js';
import { detectarImagen } from '../utils/tipoImagen.js';
import { ErrorArchivo, ErrorConflicto, ErrorNoEncontrado } from '../utils/errores.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Lógica de negocio del CRUD. Recibe sus dependencias para poder probarla sin AWS.
 * @param {{ empleados: object, fotos: object, generarId?: () => string, ahora?: () => Date, registrar?: (msg: string, error: unknown) => void }} deps
 */
export function crearEmpleadosService({
  empleados,
  fotos,
  generarId = randomUUID,
  ahora = () => new Date(),
  registrar = (mensaje, error) => console.error(mensaje, error),
}) {
  const marca = () => ahora().toISOString();

  // Hacia afuera nunca se expone la clave interna de S3: solo una URL de la propia API.
  function presentar(empleado) {
    const { fotoKey, ...publico } = empleado;
    return {
      ...publico,
      fotoUrl: fotoKey
        ? `/api/empleados/${empleado.empleadoId}/foto?v=${fotoKey.split('/').pop().split('.')[0]}`
        : null,
    };
  }

  async function existente(empleadoId) {
    if (!UUID.test(empleadoId)) throw new ErrorNoEncontrado('No encontramos ese empleado');
    const empleado = await empleados.obtener(empleadoId);
    if (!empleado) throw new ErrorNoEncontrado('No encontramos ese empleado');
    return empleado;
  }

  async function exigirDniLibre(dni, empleadoId) {
    const duplicado = await empleados.buscarPorDni(dni);
    if (duplicado && duplicado.empleadoId !== empleadoId) {
      throw new ErrorConflicto('Ya hay un empleado con ese DNI', {
        dni: 'Este DNI ya está registrado',
      });
    }
  }

  // Si falla el borrado de una foto vieja no se tumba la operación: queda un objeto
  // huérfano que se registra para limpiarlo, pero el usuario ya obtuvo su resultado.
  async function borrarFotoSinFallar(clave) {
    if (!clave) return;
    try {
      await fotos.eliminar(clave);
    } catch (error) {
      registrar(`No se pudo borrar la foto huérfana ${clave}`, error);
    }
  }

  return {
    async crear(cuerpo) {
      const datos = validarEmpleado(cuerpo, { ahora: ahora() });
      await exigirDniLibre(datos.dni);
      const creado = await empleados.crear({
        empleadoId: generarId(),
        ...datos,
        creadoEn: marca(),
        actualizadoEn: marca(),
      });
      return presentar(creado);
    },

    async listar() {
      const todos = await empleados.listar();
      return todos
        .map(presentar)
        .sort(
          (a, b) =>
            a.apellidos.localeCompare(b.apellidos, 'es') ||
            a.nombres.localeCompare(b.nombres, 'es'),
        );
    },

    async obtener(empleadoId) {
      return presentar(await existente(empleadoId));
    },

    async actualizar(empleadoId, cuerpo) {
      await existente(empleadoId);
      const datos = validarEmpleado(cuerpo, { ahora: ahora() });
      await exigirDniLibre(datos.dni, empleadoId);
      const actualizado = await empleados.actualizar(empleadoId, {
        ...datos,
        actualizadoEn: marca(),
      });
      if (!actualizado) throw new ErrorNoEncontrado('No encontramos ese empleado');
      return presentar(actualizado);
    },

    async eliminar(empleadoId) {
      if (!UUID.test(empleadoId)) throw new ErrorNoEncontrado('No encontramos ese empleado');
      const eliminado = await empleados.eliminar(empleadoId);
      if (!eliminado) throw new ErrorNoEncontrado('No encontramos ese empleado');
      await borrarFotoSinFallar(eliminado.fotoKey);
    },

    async subirFoto(empleadoId, buffer) {
      const anterior = await existente(empleadoId);
      const imagen = detectarImagen(buffer);
      if (!imagen) throw new ErrorArchivo('Sube una imagen JPG, PNG o WebP', 415);

      // Cada subida usa una clave nueva: así la URL cambia y el navegador no muestra la foto vieja.
      const clave = `empleados/${empleadoId}/${generarId()}.${imagen.extension}`;
      await fotos.subir({ clave, buffer, tipo: imagen.tipo });

      const actualizado = await empleados.actualizar(empleadoId, {
        fotoKey: clave,
        actualizadoEn: marca(),
      });
      if (!actualizado) {
        // El empleado se eliminó mientras se subía la foto: no dejar el archivo suelto.
        await borrarFotoSinFallar(clave);
        throw new ErrorNoEncontrado('No encontramos ese empleado');
      }
      await borrarFotoSinFallar(anterior.fotoKey);
      return presentar(actualizado);
    },

    async quitarFoto(empleadoId) {
      const anterior = await existente(empleadoId);
      if (!anterior.fotoKey) return presentar(anterior);
      const actualizado = await empleados.actualizar(empleadoId, {
        fotoKey: null,
        actualizadoEn: marca(),
      });
      await borrarFotoSinFallar(anterior.fotoKey);
      return presentar(actualizado ?? anterior);
    },

    async obtenerFoto(empleadoId) {
      const empleado = await existente(empleadoId);
      if (!empleado.fotoKey) throw new ErrorNoEncontrado('Este empleado no tiene foto');
      const foto = await fotos.obtener(empleado.fotoKey);
      if (!foto) throw new ErrorNoEncontrado('No encontramos la foto de este empleado');
      return foto;
    },
  };
}
