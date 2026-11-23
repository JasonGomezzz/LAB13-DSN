# Evidencias de la ejecución en AWS real

Generadas el 2026-11-22 22:25 en la región us-east-1. Son salidas reales de cada comando; el número de cuenta no se incluye.
Las capturas de la consola web (DynamoDB y S3) se guardan aparte en `docs/capturas/`.

## Tabla DynamoDB
```
{
    "Tabla": "empleados",
    "Estado": "ACTIVE",
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

## Bucket S3: acceso público bloqueado
```
{
    "BlockPublicAcls": true,
    "IgnorePublicAcls": true,
    "BlockPublicPolicy": true,
    "RestrictPublicBuckets": true
}
```

## Bucket S3: cifrado en reposo
```
{
    "SSEAlgorithm": "AES256"
}
```

## Prueba de humo de la aplicación contra estos recursos
Resultado de recorrer la API con un empleado temporal (ya eliminado):

| Paso | Resultado |
| --- | --- |
| `POST /api/empleados` | 201, item creado en DynamoDB |
| `PUT /api/empleados/:id/foto` | 200, objeto guardado en S3 (180 bytes) |
| `GET /api/empleados/:id/foto` | 200, imagen idéntica a la original (`cmp` sin diferencias) |
| `POST` con el mismo DNI | 409 |
| `DELETE /api/empleados/:id` | 204; tabla y bucket quedaron vacíos |
