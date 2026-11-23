# Evidencias de la ejecución local (LocalStack)

Generadas el 2026-11-22 21:48 contra LocalStack 3.8.1. Son salidas reales de cada comando.
No sustituyen las capturas de la consola de AWS, que se toman con la cuenta real (ver README).

## Contenedor de AWS local
```
NAME               IMAGE                         STATUS
lab13-localstack   localstack/localstack:3.8.1   Up 14 minutes (healthy)
```

## Pruebas automatizadas
```
# tests 31
# pass 31
# fail 0
```

## Tabla DynamoDB: definición
```
{
    "Tabla": "empleados",
    "Clave": [
        {
            "AttributeName": "empleadoId",
            "KeyType": "HASH"
        }
    ],
    "Facturacion": "PAY_PER_REQUEST",
    "Indices": [
        "dni-index"
    ]
}
```

## Empleados guardados en DynamoDB
```
----------------------------------------------------------------------------------------------------------------------------------------------------------------
|                                                                             Scan                                                                             |
+----------------+-------------------+-----------+----------------+--------------------------------------------------------------------------------------------+
|    apellidos   |       area        |    dni    |    nombre      |                                         fotoKey                                          |
+----------------+-------------------+-----------+----------------+--------------------------------------------------------------------------------------------+
|  Paredes Luna  |  Comercial        |  56473829 |  Camila        |  None                                                                                      |
|  Álvarez Ramos |  Finanzas         |  45871236 |  Carlos        |  empleados/1ab972c0…/….png   |
|  Torres Medina |  Recursos Humanos |  41236985 |  Valeria       |  empleados/b30b7cd5…/….png   |
|  Rojas Salazar |  Tecnología      |  10293847 |  Mateo         |  None                                                                                      |
|  Quispe Huamán|  Tecnología      |  70123456 |  Lucía María |  empleados/804f20c2…/….png   |
+----------------+-------------------+-----------+----------------+--------------------------------------------------------------------------------------------+
```

## Fotos en S3
```
2026-11-22 21:44:30    3.1 KiB empleados/1ab972c0…/….png
2026-11-22 21:44:30    3.4 KiB empleados/804f20c2…/….png
2026-11-22 21:44:30    3.2 KiB empleados/b30b7cd5…/….png
```

## Bucket privado y cifrado
```
{
    "BlockPublicAcls": true,
    "IgnorePublicAcls": true,
    "BlockPublicPolicy": true,
    "RestrictPublicBuckets": true
}
{
    "SSEAlgorithm": "AES256"
}
```
