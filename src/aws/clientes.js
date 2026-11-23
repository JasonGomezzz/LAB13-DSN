import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { config } from '../config/env.js';

// Las credenciales las resuelve el SDK (perfil de AWS CLI, variables de entorno
// o rol de la instancia EC2). Aquí nunca se escriben claves.
const opciones = {
  region: config.aws.region,
  ...(config.aws.endpoint && { endpoint: config.aws.endpoint }),
};

export const dynamoBase = new DynamoDBClient(opciones);

// El cliente "document" convierte objetos JS <-> tipos de DynamoDB.
export const dynamo = DynamoDBDocumentClient.from(dynamoBase, {
  marshallOptions: { removeUndefinedValues: true },
});

// LocalStack no resuelve buckets como subdominio, así que en local se usa path-style.
export const s3 = new S3Client({
  ...opciones,
  forcePathStyle: Boolean(config.aws.endpoint),
});
