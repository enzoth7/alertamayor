# Paso 14 — importación privada revisada de Artigas

Fecha: 2026-08-04  
Revisor confirmado: `project_owner`

## Resultado

- 7 candidatos revisados importados al flujo privado.
- 1 candidato quedó como `verified_new` con evidencia B: Hogar de Ancianos de Artigas.
- 6 candidatos quedaron como `needs_review` con evidencia C.
- 21 observaciones de fuente y 21 vínculos candidato-fuente registrados.
- 7 eventos de revisión humana registrados.
- 4 ejecuciones de fuente registradas: oficial, directorio público, URL social pública y otra fuente pública.
- 0 candidatos marcados como elegibles para publicación.
- La tabla pública `public.residenciales` permaneció sin cambios: 804 antes y 804 después.

## Procedencia importada

Las 21 observaciones conservaron su canal y rol:

- 1 observación de fuente oficial.
- 18 observaciones de fuentes públicas de redes sociales.
- 2 observaciones de otras fuentes públicas.
- 0 observaciones de mapas públicos.
- 7 orígenes de descubrimiento y 14 corroboraciones.

## Reconciliación

La comprobación posterior de solo lectura encontró los 7 candidatos ya existentes, sin conflictos y con el lote todavía seguro e idempotente. Los dos vínculos oficiales resueltos en el paso 13 no fueron importados como candidatos nuevos.

Archivos de evidencia:

- `artigas_step14_preflight_2026-08-04.json`: comprobación previa sin escrituras.
- `artigas_step14_import_2026-08-04.json`: resultado de la transacción aplicada.
- `artigas_step14_post_apply_check_2026-08-04.json`: reconciliación posterior de solo lectura.

## Deuda estructural detectada

La base remota conectada todavía no contiene las relaciones de `elepem_core` previstas por el plan normalizado. Para no bloquear el avance ni publicar automáticamente, esta importación utilizó las tablas privadas existentes de `discovery_private`. La migración o el corte al esquema normalizado debe tratarse como una operación separada, con plan previo y verificación de compatibilidad.

No se geocodificó, no se vinculó Google Places, no se copiaron reviews y no se publicó ningún candidato.
