# Paso 12 — Matching y deduplicación de Rocha

Fecha: 2026-08-04

Insumo:
`data/discovery/rocha_chatgpt_public_candidates_2026-08-03.json`

Índice comparado:
`data/exclusion/known_facilities_exclusion_index_2026-08-03.json`

- Ejecución local en modo simulación.
- Escrituras en Supabase: 0.
- Escrituras en `public.residenciales`: 0.
- Servicios externos consultados: 0.
- Publicaciones automáticas: 0.
- Cada candidato conserva tres coincidencias sugeridas y requiere revisión
  humana.

## Resultado

| Disposición de revisión | Cantidad |
|---|---:|
| Nuevo probable | 7 |
| Necesita más evidencia | 1 |
| Sin dirección exacta | 2 |
| Posible mudanza o rebranding | 4 |
| Coincidencia conocida probable | 1 |
| Omisión detectada en el índice | 1 |
| Servicio no ELEPEM | 1 |
| Falso positivo | 1 |
| Total | 18 |

## Nuevos probables

Con evidencia B:

- Residencial Orquídeas, Rocha.
- Veneza - Residencial para Adultos Mayores, Chuy.
- Centro Residencial Bienestar Lascano, Lascano.

Con evidencia C y revisión pendiente:

- Nuevo Renacer, Rocha.
- Hotel Asistido Región Este, Rocha.
- Nuevo Residencial MaiLuz, Rocha.
- Hogar Alba, Rocha.

Estas siete pistas solo son elegibles para un `upsert` idempotente en la cola
privada. Este paso no autoriza su conversión en `facilities` ni su publicación.

## Coincidencias y omisiones

- Hogar de Ancianos del Chuy referencia explícitamente al candidato privado
  `EXC-CANDIDATE-52DB8EDE00BCA13D`. Debe enriquecerse y vincularse, no
  duplicarse.
- Hogar de Ancianos Dr. Ángel Modesto Delgado aparece en fuentes oficiales pero
  falta en las cinco entradas de Rocha del índice nacional. Se clasifica como
  brecha de cobertura del índice, no como establecimiento nuevo.

El motor no confirmó coincidencias exactas automáticamente.

## Casos ambiguos

- Residencial San Luca comparte dirección histórica con Bienvenidos.
- Carpe Diem / Rincón de Luz comparte nombre y teléfono con una referencia
  histórica de Rocha capital.
- Hogar Dulce Compañía comparte nombre y teléfono con una dirección distinta de
  2019; es una posible mudanza.
- Residencial Como En Casa reutiliza la dirección histórica de Maxime.

Estos cuatro casos permanecen separados y requieren decisión humana. No se
fusionaron por nombre, teléfono o domicilio aislado.

## Registros retenidos o excluidos

- Las Espumillas: necesita una fuente independiente de actividad reciente.
- Residencial Nuestro Camino: falta dirección exacta.
- Centro Residencial Bienestar Cebollatí: falta fuente directa y dirección
  exacta; no se asigna un centroide.
- Hogar OASIS: servicio no ELEPEM según el insumo.
- Nuestra Señora del Huerto: falso positivo ubicado en Argentina.

## Procedencia

Referencias conservadas en el archivo de matching:

- 9 referencias de fuentes oficiales.
- 3 referencias de mapas públicos.
- 19 referencias de redes sociales públicas.
- 7 referencias de otras fuentes públicas.

Los conteos son referencias, no establecimientos únicos: una sede puede estar
respaldada por varios canales simultáneamente.
