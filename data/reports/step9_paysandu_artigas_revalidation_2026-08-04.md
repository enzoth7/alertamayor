# Paso 9 — Revalidación de Paysandú y Artigas

Fecha: 2026-08-04

Ejecución local en modo simulación contra
`data/exclusion/known_facilities_exclusion_index_2026-08-03.json`.

- Escrituras en Supabase: 0.
- Escrituras en `public.residenciales`: 0.
- Publicaciones automáticas: 0.
- Servicios externos consultados: 0.
- Cada resultado conserva hasta tres coincidencias sugeridas y requiere revisión
  humana.

## Resumen

| Departamento | Registros | Coincidencias probables | Nuevos probables | Sin dirección exacta | Históricos o posible mudanza |
|---|---:|---:|---:|---:|---:|
| Paysandú | 14 | 3 | 11 | 2 | 1 |
| Artigas | 9 | 2 | 7 | 0 | 1 |
| Total | 23 | 5 | 18 | 2 | 2 |

Los 23 `candidate_key` ya aparecen en el índice de exclusión. Por tanto, una
importación posterior debe ser idempotente: actualizar o conservar la pista
privada existente, nunca crear una segunda pista por el mismo identificador.

## Coincidencias probables para revisión humana

Paysandú:

- Residencia San Cono.
- Hogar de Ancianos Enrique Chaplin.
- Casa Provenza.

Artigas:

- Hogar Don Martín.
- Hogar del Adulto Mayor Élida Moreira de Zambiazo.

El motor no declara coincidencias exactas automáticamente. Estas cinco pistas
deben vincularse o rechazarse mediante revisión humana antes de cualquier
importación canónica.

## Cola privada propuesta

- 18 pistas clasificadas como nuevos probables quedarían destinadas a una
  operación idempotente sobre la cola privada si no existieran ya en Supabase.
- 5 pistas quedan retenidas como coincidencias probables con una sede conocida.
- 2 pistas sin dirección exacta no son geocodificables todavía.
- 2 pistas marcadas por el insumo como históricas o posible mudanza permanecen
  solo para revisión; no deben generar puntos públicos.
- No se detectaron teléfonos compartidos fuertes ni conflictos de puerta que
  justifiquen una fusión automática.

El archivo de Artigas además conserva, fuera del conjunto de candidatos, cuatro
falsos positivos, cuatro servicios no ELEPEM, dos eventos históricos no
candidatos y una pista no resuelta. Esos registros permanecen como evidencia de
cobertura y exclusión; no se importan como sedes.

## Procedencia observada

Las referencias de entrada quedaron clasificadas con los canales acordados:

- `official_sources`: documentos o páginas de organismos identificados.
- `public_social_sources`: Instagram, Facebook y otras redes públicas.
- `other_public_sources`: medios, directorios y otras páginas públicas.

No se atribuyó ninguna review, estrella o comentario a Google Maps y no se
realizaron consultas externas durante este paso.
