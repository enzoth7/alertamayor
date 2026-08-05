# Paso 12 — deduplicación de Canelones

Fecha: 2026-08-04  
Modo: local y de solo lectura  
Registros evaluados: 71

## Resultado

- 32 pistas clasificadas por la investigación como `probable_new_current`.
- 7 pistas requieren más evidencia.
- 6 pistas operativas carecen de dirección; existe además un falso positivo sin dirección.
- 13 casos son posibles mudanzas, cambios de nombre, cambios de operador o reutilización de domicilio.
- 11 registros fueron marcados como conocidos por la investigación y por referencias históricas, pero el índice nacional actual no proporcionó un vínculo suficientemente fuerte para resolverlos automáticamente.
- 2 registros son falsos positivos.
- 0 registros son servicios `not_elepem` en este lote.
- 0 registros son exclusivamente históricos.
- 0 fusiones automáticas y 0 puntos públicos creados.

El algoritmo encontró una sola coincidencia probable: `Residencial Santa María`, Bella Vista 2057, frente a `Solange Alejandra Amaya` (`EXC-OFFICIAL-ELP-0096`) con puntaje 0,7386 basado principalmente en dirección exacta. Debe resolverse como posible continuidad, cambio de nombre u operador; no se fusionó.

## Coincidencias conocidas e índice

Los 11 `known_exact_match` del insumo quedaron como `exclusion_index_gap` para revisión. Esto no significa que sean sedes nuevas: significa que la evidencia histórica del insumo no pudo transformarse en un vínculo canónico fuerte contra el índice disponible.

`Residencial Shangrilá` tiene una coincidencia nominal con el candidato privado `EXC-CANDIDATE-71348CAD2596D9E7`, pero el nombre por sí solo no alcanza para vincularlo automáticamente. Los otros diez casos también deben reparar el índice o resolver el ID antes de cualquier importación.

## Conflictos internos

Se detectaron cuatro señales de teléfono compartido:

- Reina de las Flores ↔ El Bienestar: `96236140` y `99676875`.
- Lo de Mamá 1 ↔ Lo de Mamá 2: `92191419`.
- Kairós 1 ↔ Kairós 2: `92315692`.

Estos teléfonos pueden indicar un operador común, dos sedes, una mudanza o reutilización del contacto. No autorizan una fusión. No se detectaron correos ni URLs sociales compartidas entre candidatos.

## Procedencia

Se conservaron 100 referencias con URL, tipo y fecha:

- 21 referencias de fuentes oficiales.
- 1 referencia de mapas públicos.
- 11 referencias de fuentes públicas de redes sociales.
- 67 referencias de otras fuentes públicas.
- 0 referencias con procedencia incompleta.

Los conteos representan observaciones, no establecimientos únicos. El origen del descubrimiento y las corroboraciones permanecen separados en el archivo de entrada y en el resultado de matching.

Por rol de la fuente:

- Origen del descubrimiento: 7 oficiales, 0 mapas públicos, 5 redes sociales públicas y 59 otras fuentes públicas.
- Corroboraciones: 14 oficiales, 1 mapa público, 6 redes sociales públicas y 8 otras fuentes públicas.

## Garantías

- Los 71 candidatos incluyen tres alternativas de match explicables.
- Todos requieren revisión humana.
- No se llamó Google, Instagram, Facebook, Overpass, IDE Uruguay ni Supabase.
- No se asignaron coordenadas.
- No se modificó `public.residenciales`.
- No se publicó ningún candidato.

Archivos:

- `canelones_step12_matching_2026-08-04.json`: candidatos y tres matches explicables.
- `canelones_step12_conflicts_2026-08-04.json`: teléfonos compartidos y conflicto de domicilio.
