# Paso 14 — importación privada revisada de Paysandú

Fecha: 2026-08-04  
Revisor confirmado: `project_owner`

## Resultado

- 7 candidatos con evidencia C importados como `needs_review`.
- 8 observaciones y 8 vínculos candidato-fuente registrados.
- 7 eventos de revisión humana registrados.
- 2 ejecuciones de fuente registradas: URL social pública y fuente oficial.
- 7 vínculos conocidos del paso 13 no fueron importados como candidatos nuevos.
- 0 candidatos marcados como elegibles para publicación.
- `public.residenciales` permaneció sin cambios: 804 antes y 804 después.

## Reconciliación

La comprobación posterior encontró los 7 candidatos existentes, sin conflictos. Repetir el preflight es seguro e idempotente.

Archivos:

- `paysandu_step14_preflight_2026-08-04.json`.
- `paysandu_step14_import_2026-08-04.json`.
- `paysandu_step14_post_apply_check_2026-08-04.json`.

## Deuda estructural

La importación utilizó el flujo privado legado `discovery_private`, porque `elepem_core` todavía no está desplegado en la base remota. No se geocodificó, no se copiaron reviews y no se publicó ningún candidato.
