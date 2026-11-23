import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { dynamo } from '../aws/clientes.js';
import { config } from '../config/env.js';

const TableName = config.tabla;

export const empleadosRepository = {
  /** Inserta un empleado nuevo. Falla si el empleadoId ya existe. */
  async crear(empleado) {
    await dynamo.send(
      new PutCommand({
        TableName,
        Item: empleado,
        ConditionExpression: 'attribute_not_exists(empleadoId)',
      }),
    );
    return empleado;
  },

  async obtener(empleadoId) {
    const { Item } = await dynamo.send(new GetCommand({ TableName, Key: { empleadoId } }));
    return Item ?? null;
  },

  /** Recorre todas las páginas del Scan (DynamoDB devuelve como máximo 1 MB por llamada). */
  async listar() {
    const items = [];
    let ExclusiveStartKey;
    do {
      const pagina = await dynamo.send(new ScanCommand({ TableName, ExclusiveStartKey }));
      items.push(...(pagina.Items ?? []));
      ExclusiveStartKey = pagina.LastEvaluatedKey;
    } while (ExclusiveStartKey);
    return items;
  },

  /** Busca por DNI usando el índice secundario global (sin escanear la tabla). */
  async buscarPorDni(dni) {
    const { Items } = await dynamo.send(
      new QueryCommand({
        TableName,
        IndexName: 'dni-index',
        KeyConditionExpression: 'dni = :dni',
        ExpressionAttributeValues: { ':dni': dni },
        Limit: 1,
      }),
    );
    return Items?.[0] ?? null;
  },

  /**
   * Actualiza solo los campos indicados. Devuelve el empleado actualizado,
   * o null si el empleadoId no existe (no crea registros nuevos por accidente).
   */
  async actualizar(empleadoId, campos) {
    const nombres = Object.keys(campos);
    try {
      const { Attributes } = await dynamo.send(
        new UpdateCommand({
          TableName,
          Key: { empleadoId },
          ConditionExpression: 'attribute_exists(empleadoId)',
          UpdateExpression: `SET ${nombres.map((_, i) => `#c${i} = :v${i}`).join(', ')}`,
          ExpressionAttributeNames: Object.fromEntries(nombres.map((n, i) => [`#c${i}`, n])),
          ExpressionAttributeValues: Object.fromEntries(
            nombres.map((n, i) => [`:v${i}`, campos[n]]),
          ),
          ReturnValues: 'ALL_NEW',
        }),
      );
      return Attributes;
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') return null;
      throw error;
    }
  },

  /** Elimina y devuelve el registro borrado (null si no existía). */
  async eliminar(empleadoId) {
    const { Attributes } = await dynamo.send(
      new DeleteCommand({ TableName, Key: { empleadoId }, ReturnValues: 'ALL_OLD' }),
    );
    return Attributes ?? null;
  },
};
