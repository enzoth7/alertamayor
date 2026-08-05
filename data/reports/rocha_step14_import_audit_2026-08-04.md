# Paso 14 — importación privada revisada de Rocha

Fecha: 2026-08-04  
Revisor confirmado: `project_owner`

## Resultado

- 14 candidatos revisados importados al flujo privado.
- 3 candidatos quedaron como `verified_new`, todos con evidencia B.
- 11 candidatos quedaron como `needs_review` y no son publicables.
- 30 observaciones de fuente y 30 vínculos candidato-fuente registrados.
- 14 eventos de revisión humana registrados.
- 4 ejecuciones de fuente registradas: oficial, directorio público, URL social pública y otra fuente pública.
- 0 candidatos marcados como elegibles para publicación.
- La tabla pública `public.residenciales` permaneció sin cambios: 804 antes y 804 después.

## Reconciliación

La comprobación posterior de solo lectura encontró los 14 candidatos, sin conflictos. Repetir el dry-run no planifica duplicados ni contradice las decisiones humanas guardadas.

Archivos de evidencia:

- `rocha_step14_import_2026-08-04.json`: resultado de la transacción aplicada.
- `rocha_step14_post_apply_check_2026-08-04.json`: reconciliación posterior de solo lectura.

## Deuda estructural detectada

La base remota conectada todavía no contiene las relaciones de `elepem_core` previstas por el plan normalizado. Para no bloquear el avance ni publicar automáticamente, esta importación utilizó las tablas privadas existentes de `discovery_private`. La migración o el corte al esquema normalizado debe tratarse como una operación separada, con plan previo y verificación de compatibilidad.
