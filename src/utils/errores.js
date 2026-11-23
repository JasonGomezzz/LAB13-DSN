// Errores de negocio con su código HTTP. El manejador global los traduce a respuestas.

export class ErrorApp extends Error {
  constructor(mensaje, estado = 500, detalles = undefined) {
    super(mensaje);
    this.name = this.constructor.name;
    this.estado = estado;
    this.detalles = detalles;
  }
}

export class ErrorValidacion extends ErrorApp {
  // `detalles` es un objeto { campo: "mensaje" } para marcar cada campo en la interfaz.
  constructor(detalles, mensaje = 'Revisa los campos marcados') {
    super(mensaje, 400, detalles);
  }
}

export class ErrorNoEncontrado extends ErrorApp {
  constructor(mensaje = 'No encontramos ese recurso') {
    super(mensaje, 404);
  }
}

export class ErrorConflicto extends ErrorApp {
  constructor(mensaje, detalles) {
    super(mensaje, 409, detalles);
  }
}

export class ErrorArchivo extends ErrorApp {
  constructor(mensaje, estado = 400) {
    super(mensaje, estado, { foto: mensaje });
  }
}
