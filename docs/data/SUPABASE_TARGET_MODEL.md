# Modelo objetivo normalizado de Supabase

Estado: diseño de Paso 4, preparado pero no aplicado.

Migración forward: `supabase/migrations/20260803042525_normalized_elepem_core_model.sql`.

Rollback explícito: `supabase/rollbacks/20260803042525_drop_normalized_elepem_core_model.sql`.

## Decisiones de diseño

- Supabase pasa a ser la fuente operativa de verdad después del backfill, la reconciliación y el corte aprobados.
- `elepem_core.facilities` representa una sede física. No representa una marca, una empresa ni una lista administrativa.
- Operadores y organizaciones se separan de las sedes mediante `facility_operators`.
- Nombres, direcciones, contactos, cuentas sociales, capacidades, etapas administrativas y geocodificaciones son filas individuales, fechables y con procedencia.
- `discovery_private` se reutiliza para corridas, observaciones, candidatos, sugerencias, IDs externos y revisiones. No se crean colas paralelas equivalentes.
- Los valores históricos no se sobrescriben ni se concatenan en campos canónicos.
- `public.residenciales` queda intacta. `legacy_facility_map` registra la correspondencia verificable entre cada ID antiguo y el nuevo.
- La publicación es un estado explícito y no una consecuencia automática del matching o de la importación.

## Límites de seguridad

`elepem_core` es un esquema privado. La migración:

- revoca acceso de `public`, `anon`, `authenticated` y `service_role`;
- habilita y fuerza RLS en todas sus tablas;
- no crea políticas permisivas;
- no concede acceso directo desde el navegador;
- crea vistas con `security_invoker = true`;
- revoca también el acceso a esas vistas hasta que el servidor de la aplicación tenga un contrato aprobado.

La aplicación actual usa una conexión PostgreSQL del servidor. El Paso 6 deberá limitar esa conexión a un rol de mínimo privilegio; no se debe llevar `service_role` al navegador.

Supabase anunció que las tablas nuevas de `public` dejarán de recibir permisos de Data API implícitos. El modelo usa grants y revokes explícitos y no depende de ese comportamiento por defecto.

## Tablas canónicas nuevas

| Tabla | Responsabilidad | Regla principal |
|---|---|---|
| `elepem_core.source_catalog` | Catálogo estable de fuentes, canal visible y política de conservación | Una clave por fuente; `source_channel` canónico, nivel de autoridad y política explícitos |
| `elepem_core.organizations` | Operadores, titulares y organizaciones | Separada de la sede física |
| `elepem_core.facilities` | Identidad estable de cada sede física | Una fila por sede; fusionar mediante referencia, no borrar |
| `elepem_core.facility_operators` | Relación histórica sede-organización | Una relación actual por tipo y sede |
| `elepem_core.facility_names` | Nombre canónico, observado, alias, legal e histórico | Un solo nombre preferido actual |
| `elepem_core.facility_addresses` | Direcciones físicas, postales e históricas | Una sola dirección física actual; historial preservado |
| `elepem_core.facility_contacts` | Teléfono, correo o sitio web | Un valor por fila; nunca concatenar |
| `elepem_core.facility_social_accounts` | Referencias públicas a redes sociales | Solo URL, fecha de consulta y nota humana breve |
| `elepem_core.facility_observation_links` | Procedencia entre sede y observaciones inmutables | Evidencia B exige clave de independencia |
| `elepem_core.facility_administrative_events` | Hitos MSP, MIDES, PACP u otros | Cada etapa y período se conserva por separado |
| `elepem_core.facility_capacity_observations` | Cupos informados por fecha y fuente | Una observación actual; historial preservado |
| `elepem_core.facility_geocodes` | Coordenadas IDE, manuales o heredadas | Una geocodificación actual; Google no es proveedor de coordenadas |
| `elepem_core.facility_reviews` | Decisiones humanas | Append-only; publicación solo con evidencia A o B |
| `elepem_core.audit_log` | Auditoría de mutaciones importantes | Append-only |
| `elepem_core.legacy_facility_map` | Correspondencia entre IDs antiguos y nuevos | Ningún conflicto se fusiona automáticamente |

## Tablas existentes reutilizadas

| Tabla | Uso objetivo | Extensión aditiva |
|---|---|---|
| `discovery_private.facility_source_runs` | Corridas auditables | `source_catalog_id` |
| `discovery_private.facility_source_observations` | Observaciones versionadas y procedencia | `source_catalog_id` |
| `discovery_private.facility_candidates` | Cola privada | `resolved_facility_id` |
| `discovery_private.facility_candidate_sources` | Evidencia de candidatos | Sin columnas nuevas |
| `discovery_private.facility_candidate_match_suggestions` | Top-3 explicable | `facility_id` durante transición; `residencial_id` pasa a nullable solo cuando existe `facility_id` |
| `discovery_private.facility_candidate_review_events` | Auditoría de revisión | `matched_facility_id` |
| `discovery_private.facility_external_ids` | IDs Google/OSM/IDE/oficiales | `facility_id`; propietario exclusivo entre candidato, legado o sede |

Los campos heredados `best_match_residencial_id`, `residencial_id` y `matched_residencial_id` no se eliminan en esta fase. Se mantienen hasta que la reconciliación confirme sus equivalentes canónicos.

## Vistas

| Vista | Audiencia | Estado en la migración inicial |
|---|---|---|
| `public.facilities_current_internal` | Servidor y flujos internos | Proyección canónica; sin grant a clientes |
| `public.facilities_public_approved` | Endpoint servidor del mapa | Solo sedes actuales, aprobadas por persona y con evidencia A/B; sin grant anónimo directo |
| `public.residenciales_legacy_compat` | Adaptador temporal | Forma exacta de 21 columnas sobre la tabla heredada sin modificarla |
| `public.known_facilities_exclusion_view` | Matching privado | Une sedes normalizadas, filas heredadas aún no mapeadas y candidatos no descartados |

La vista pública aprobada requiere nombre preferido, dirección física actual y geocódigo actual. Una fila incompleta no aparece aunque su `publication_status` sea erróneamente marcado como `approved`.

## Reglas de identidad y publicación

1. `facility_key` es estable y no codifica el nombre ni la dirección mutable.
2. Dos direcciones físicas distintas no se fusionan por compartir nombre.
3. Los alias se almacenan en `facility_names`; no generan otra sede por sí solos.
4. Una mudanza dudosa crea conflicto para revisión. No se reemplaza la dirección previa.
5. Un candidato continúa privado aunque tenga `public_eligible = true`.
6. Para `publication_status = 'approved'` debe existir una revisión humana append-only con `outcome = 'approve_publication'` y nivel A o B.
7. Nivel A exige fuente oficial nominal; nivel B exige dos fuentes públicas independientes y coherentes. El enforcement de independencia se completa en el backfill/reviewer, no mediante inferencia de nombres.
8. Google solo puede aportar un `place_id` enlazado manualmente, URL externa, fecha e identidad revisora. No se persisten payloads, reseñas, autores, fotos ni coordenadas de Google.

## Mapeo de tablas antiguas a nuevas

| Origen | Destino | Tratamiento |
|---|---|---|
| `public.residenciales` | `facilities` + tablas de valores + `legacy_facility_map` | Backfill idempotente; una fila de mapping por ID viejo |
| `public.residencial_discovery_candidates` | `discovery_private.facility_candidates` | Reconciliar; no duplicar candidatos ya migrados |
| `discovery_private.facility_source_*` | Se conserva | Añadir enlace al catálogo de fuentes |
| `discovery_private.facility_candidates` | Se conserva | Resolver hacia `facilities` solo tras revisión |
| `discovery_private.facility_external_ids` | Se conserva | Trasladar propiedad del ID a la sede cuando corresponda |
| Archivos JSON/CSV de runtime | Observaciones + modelo canónico | Solo después de reconciliar procedencia y hashes |
| Subproyecto local `ELEPEM OSINT` | Importador/adaptador, no fuente paralela | Debe apuntar al mismo modelo o retirarse del runtime |

## Mapeo de campos heredados

| `public.residenciales` | Destino normalizado | Nota |
|---|---|---|
| `id` | `legacy_facility_map.legacy_residencial_id` y nueva `facility_key` trazable | El ID viejo nunca se descarta |
| `name` | `facility_names.name` | `name_type = canonical`, `is_preferred = true`; preservar texto observado |
| `department` | `facility_addresses.department` | No usar como única clave de identidad |
| `locality` | `facility_addresses.locality` | Preservar aunque requiera corrección posterior |
| `address` | `facility_addresses.address_line` | Crear conflicto si parece contaminada o multivaluada |
| `places` | `facility_capacity_observations.places` | Con observación de procedencia del legado |
| `lat`, `lng` | `facility_geocodes.lat`, `lng` | `provider = legacy`; no promover precisión |
| `precision`, `precision_label` | `facility_geocodes` | Se conserva la exactitud declarada |
| `status_group`, `status_stage`, `status_short` | `facility_administrative_events` y vista de compatibilidad | No colapsar etapas distintas |
| `source_label` | Observación de legado y catálogo de fuentes | Etiqueta no sustituye URL/fecha/procedencia |
| `msp_final` | Evento `authorization_final` | Crear solo si el valor es verdadero |
| `msp_registro_historico` | Evento `historical_registration` | Histórico aunque exista final posterior |
| `mides_social` | Evento `social_certificate` | Separado del MSP |
| `pacp` | Evento `provider_registry` | Separado del MSP/MIDES |
| `other_source` | Enlace a observación no administrativa | Requiere identificar la fuente real |
| `created_at`, `updated_at` | `facilities` y auditoría | Preservar cuando sean confiables |

## Datos todavía no inventados

No se agregan columnas para residentes, historias clínicas, denuncias, documentos, teléfonos personales, reseñas, autores, fotografías, seguidores ni contenido social. Tampoco se introducen coordenadas de Google, puntuaciones opacas de publicación ni una aprobación automática.

## Diccionario normativo

`docs/data/SUPABASE_COLUMN_DICTIONARY.csv` es el inventario normativo de las 219 columnas propuestas o proyectadas. Cada fila declara propósito, escritor, lector, validación, exposición, retención y origen de migración.

## Criterios de aprobación del modelo

El diseño queda listo para aplicar en prueba solo cuando:

- la migración y el rollback pasan validación SQL real en una base desechable;
- se confirma explícitamente un proyecto local/test/staging;
- existe backup/export verificable;
- el mapping cubre las 804 filas remotas actuales o documenta cada conflicto;
- los consumidores de las 21 columnas heredadas permanecen compatibles;
- las pruebas de RLS cubren anónimo, autenticado no autorizado y servidor autorizado;
- no hay candidatos publicados ni escritura sobre producción.

## Referencias técnicas

- Supabase, Secure data: https://supabase.com/docs/guides/database/secure-data
- Supabase, Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase, breaking changes: https://supabase.com/changelog?types=breaking-change
