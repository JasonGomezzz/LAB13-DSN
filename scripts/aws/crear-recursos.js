// Crea (si no existen) la tabla de DynamoDB y el bucket de S3 del laboratorio.
// Es idempotente: se puede ejecutar varias veces sin duplicar ni romper nada.
//
//   Local (LocalStack):  npm run aws:crear
//   AWS real:            AWS_ENDPOINT_URL= AWS_PROFILE=<perfil> npm run aws:crear
import {
  CreateTableCommand,
  DescribeTableCommand,
  ResourceNotFoundException,
  waitUntilTableExists,
} from '@aws-sdk/client-dynamodb';
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketEncryptionCommand,
  PutPublicAccessBlockCommand,
} from '@aws-sdk/client-s3';
import { config } from '../../src/config/env.js';
import { dynamoBase, s3 } from '../../src/aws/clientes.js';

const destino = config.aws.endpoint ? `LocalStack (${config.aws.endpoint})` : 'AWS real';
console.log(`Destino: ${destino} · región ${config.aws.region}`);

async function crearTabla() {
  try {
    await dynamoBase.send(new DescribeTableCommand({ TableName: config.tabla }));
    console.log(`= Tabla "${config.tabla}" ya existe`);
    return;
  } catch (error) {
    if (!(error instanceof ResourceNotFoundException)) throw error;
  }

  await dynamoBase.send(
    new CreateTableCommand({
      TableName: config.tabla,
      BillingMode: 'PAY_PER_REQUEST', // sin capacidad reservada: se paga por uso
      AttributeDefinitions: [
        { AttributeName: 'empleadoId', AttributeType: 'S' },
        { AttributeName: 'dni', AttributeType: 'S' },
      ],
      KeySchema: [{ AttributeName: 'empleadoId', KeyType: 'HASH' }],
      // Índice para impedir DNI repetidos sin recorrer toda la tabla.
      GlobalSecondaryIndexes: [
        {
          IndexName: 'dni-index',
          KeySchema: [{ AttributeName: 'dni', KeyType: 'HASH' }],
          Projection: { ProjectionType: 'KEYS_ONLY' },
        },
      ],
    }),
  );
  await waitUntilTableExists(
    { client: dynamoBase, maxWaitTime: 60 },
    { TableName: config.tabla },
  );
  console.log(`+ Tabla "${config.tabla}" creada (clave: empleadoId, índice: dni-index)`);
}

async function crearBucket() {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: config.bucket }));
    console.log(`= Bucket "${config.bucket}" ya existe`);
  } catch (error) {
    if (error.$metadata?.httpStatusCode !== 404 && error.name !== 'NotFound') throw error;
    await s3.send(
      new CreateBucketCommand({
        Bucket: config.bucket,
        // us-east-1 es la única región que NO acepta LocationConstraint.
        ...(config.aws.region !== 'us-east-1' && {
          CreateBucketConfiguration: { LocationConstraint: config.aws.region },
        }),
      }),
    );
    console.log(`+ Bucket "${config.bucket}" creado`);
  }

  // Las fotos son privadas: solo la API puede leerlas.
  await s3.send(
    new PutPublicAccessBlockCommand({
      Bucket: config.bucket,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        IgnorePublicAcls: true,
        BlockPublicPolicy: true,
        RestrictPublicBuckets: true,
      },
    }),
  );
  await s3.send(
    new PutBucketEncryptionCommand({
      Bucket: config.bucket,
      ServerSideEncryptionConfiguration: {
        Rules: [{ ApplyServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' } }],
      },
    }),
  );
  console.log('  acceso público bloqueado y cifrado AES-256 activo');
}

try {
  await crearTabla();
  await crearBucket();
  console.log('Listo.');
} catch (error) {
  console.error(`No se pudo crear los recursos: ${error.name}: ${error.message}`);
  process.exitCode = 1;
}
