export class ErrorApi extends Error {
  constructor(mensaje, estado = 0, detalles = undefined) {
    super(mensaje);
    this.estado = estado;
    this.detalles = detalles; // { campo: "mensaje" } cuando el servidor valida
  }
}

async function pedir(ruta, opciones) {
  let respuesta;
  try {
    respuesta = await fetch(ruta, opciones);
  } catch {
    throw new ErrorApi('No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.');
  }
  if (respuesta.status === 204) return null;

  const datos = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    throw new ErrorApi(
      datos?.error ?? 'No pudimos completar la acción. Inténtalo de nuevo.',
      respuesta.status,
      datos?.detalles,
    );
  }
  return datos;
}

const json = (metodo, cuerpo) => ({
  method: metodo,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(cuerpo),
});

export const api = {
  configuracion: () => pedir('/api/configuracion'),
  listar: () => pedir('/api/empleados'),
  crear: (datos) => pedir('/api/empleados', json('POST', datos)),
  actualizar: (id, datos) => pedir(`/api/empleados/${id}`, json('PUT', datos)),
  eliminar: (id) => pedir(`/api/empleados/${id}`, { method: 'DELETE' }),
  subirFoto(id, archivo) {
    const cuerpo = new FormData();
    cuerpo.append('foto', archivo);
    return pedir(`/api/empleados/${id}/foto`, { method: 'PUT', body: cuerpo });
  },
  quitarFoto: (id) => pedir(`/api/empleados/${id}/foto`, { method: 'DELETE' }),
};
