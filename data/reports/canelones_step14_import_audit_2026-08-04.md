# Paso 14 — importación privada revisada de Canelones

Fecha: 2026-08-04  
Revisor confirmado: `project_owner`

## Resultado

- 71 decisiones humanas registradas.
- 58 candidatos importados al flujo privado.
- 12 candidatos quedaron como `verified_new`, todos con evidencia B.
- 46 candidatos quedaron como `needs_review`.
- 81 observaciones y 81 vínculos candidato-fuente registrados.
- 58 eventos de revisión humana registrados.
- 5 ejecuciones por tipo de fuente registradas.
- 0 candidatos elegibles para publicación.
- `public.residenciales` permaneció sin cambios: 804 antes y 804 después.

## Reconciliación

La comprobación posterior de solo lectura encontró los 58 candidatos, sin conflictos. Repetir el dry-run reconoce las filas existentes y no propone duplicados.

## Incidente controlado

El primer intento de transacción fue rechazado por `facility_candidates_seen_time_check`: el insumo declaraba una hora de generación posterior a la hora efectiva de revisión. PostgreSQL revirtió la transacción completa y el dry-run posterior confirmó 0 filas parciales.

El importador fue corregido para usar como `first_seen_at` la fecha más temprana entre la generación del insumo y la revisión humana. La corrección tiene una prueba específica y el segundo intento fue exitoso.

## Archivos de evidencia

- `canelones_step13_human_review_2026-08-04.json`: decisiones aceptadas.
- `canelones_step14_import_2026-08-04.json`: transacción aplicada.
- `canelones_step14_post_apply_check_2026-08-04.json`: reconciliación posterior de solo lectura.

## Límites

La importación utilizó el workflow privado legado `discovery_private`, porque el esquema normalizado `elepem_core` todavía no está desplegado en la base remota. No se geocodificó, no se vinculó Google Places y no se publicó ningún candidato.
