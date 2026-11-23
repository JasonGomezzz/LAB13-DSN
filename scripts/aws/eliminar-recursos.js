// Limpieza: borra la tabla y el bucket (con todas sus fotos) del laboratorio.
// Pide confirmación explícita para no borrar nada por accidente.
//
//   Local:     npm run aws:eliminar -- --si
//   AWS real:  AWS_ENDPOINT_URL= AWS_PROFILE=<perfil> npm run aws:eliminar -- --si
import {
  DeleteTableCommand,
  ResourceNotFoundException,
} from '@aws-sdk/client-dynamodb';
import {
  DeleteBucketCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { config } from '../../src/config/env.js';
import { dynamoBase, s3 } from '../../src/aws/clientes.js';

const destino = config.aws.endpoint ? `LocalStack (${config.aws.endpoint})` : 'AWS real';

if (!process.argv.includes('--si')) {
  console.log(
    `Esto eliminará la tabla "${config.tabla}" y el bucket "${config.bucket}" en ${destino}.\n` +
      'Vuelve a ejecutar con --si para confirmar:  npm run aws:eliminar -- --si',
  );
  process.exit(0);
}

async function vaciarYBorrarBucket() {
  let token;
  do {
    const lista = await s3.send(
      new ListObjectsV2Command({ Bucket: config.bucket, ContinuationToken: token }),
    );
    if (lista.Contents?.length) {
      await s3.send(
        new DeleteObjectsCommand({
          Bucket: config.bucket,
          Delete: { Objects: lista.Contents.map(({ Key }) => ({ Key })) },
        }),
      );
    }
    token = lista.NextContinuationToken;
  } while (token);
  await s3.send(new DeleteBucketCommand({ Bucket: config.bucket }));
}

async function intentar(etiqueta, accion) {
  try {
    await accion();
    console.log(`- ${etiqueta} eliminado`);
  } catch (error) {
    if (error instanceof ResourceNotFoundException || error.name === 'NoSuchBucket') {
      console.log(`= ${etiqueta} no existía`);
    } else {
      throw error;
    }
  }
}

try {
  console.log(`Destino: ${destino}`);
  await intentar(`Tabla "${config.tabla}"`, () =>
    dynamoBase.send(new DeleteTableCommand({ TableName: config.tabla })),
  );
  await intentar(`Bucket "${config.bucket}"`, vaciarYBorrarBucket);
  console.log('Listo.');
} catch (error) {
  console.error(`No se pudo eliminar: ${error.name}: ${error.message}`);
  process.exitCode = 1;
}
