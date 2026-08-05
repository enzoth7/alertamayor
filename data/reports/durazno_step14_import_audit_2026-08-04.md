# Durazno — preflight de importación privada

Fecha local: 2026-08-04  
Proyecto verificado: `itolluaivfoxnaohbsdk`  
Modo: transacción remota `READ ONLY`  
Aplicación ejecutada: no

## Conteos del insumo

| Concepto | Cantidad |
|---|---:|
| Registros leídos | 32 |
| Registros válidos | 32 |
| Duplicados internos exactos | 0 |
| Conflictos internos por teléfono compartido | 1 par |
| Coincidencias con instalaciones conocidas | 18 |
| Candidatos privados nuevos | 10 |
| Nuevos verificados con evidencia B | 3 |
| Casos separados que necesitan revisión | 7 |
| Con coordenadas | 0 |
| Sin coordenadas | 32 |
| Descartados | 4 |

Los descartes son tres servicios clasificados por el insumo como `not_elepem`
y un falso positivo correspondiente a La Paloma, Rocha. Permanecen en el
reporte auditable y no generan escrituras.

## Estado remoto antes de aplicar

| Tabla o conjunto | Conteo actual |
|---|---:|
| `public.residenciales` | 801 |
| `discovery_private.facility_candidates` | 175 |
| `discovery_private.facility_source_observations` | 2.451 |

Estos conteos de tablas no sustituyen los KPI consolidados de la aplicación.

Las 18 coincidencias resolvieron exactamente una instalación canónica cada
una; conflictos de resolución: 0. Los 10 `candidate_key` no existen todavía;
conflictos con revisiones humanas previas: 0.

## Operaciones idempotentes propuestas

| Operación | Cantidad prevista |
|---|---:|
| Upsert de corridas de fuente | 6 |
| Inserción de observaciones nuevas | 49 |
| Upsert de candidatos privados | 10 |
| Relaciones candidato–observación | 22 |
| Eventos de revisión de candidatos | 10 |
| Relaciones instalación–observación | 27 |
| Instalaciones existentes enriquecidas | 18 |
| Eventos de auditoría de instalación | 18 |
| Publicaciones automáticas | 0 |

Si se aplicara sobre este mismo estado, los conteos esperados serían 185
candidatos privados y 2.500 observaciones. `public.residenciales` debe seguir
en 801; cualquier variación provoca rollback de toda la transacción.

## Procedencia de las 49 observaciones propuestas

| Canal permitido | Cantidad |
|---|---:|
| `official` — exclusivamente MSP/MIDES | 21 |
| `public_maps` | 1 |
| `social_public` | 7 |
| `other_public` | 20 |

IDE Uruguay no figura como fuente de hallazgo. No se incorporan coordenadas de
Google ni contenido, reseñas, autores o fotografías de Google.

## Forma de los upserts

No se requiere una migración de esquema. El flujo reutiliza las tablas
normalizadas y privadas existentes con estas claves de idempotencia:

```sql
insert into discovery_private.facility_source_runs (...)
values (...)
on conflict (run_key) do update ...;

insert into discovery_private.facility_source_observations (...)
values (...)
on conflict (source_type, source_record_key, record_hash) do nothing;

insert into discovery_private.facility_candidates (..., public_eligible)
values (..., false)
on conflict (candidate_key) do update ...
where not facility_candidates.human_reviewed
   or (
     facility_candidates.status = excluded.status
     and facility_candidates.evidence_tier = excluded.evidence_tier
     and facility_candidates.reviewed_by = excluded.reviewed_by
     and facility_candidates.public_eligible = false
   );

insert into discovery_private.facility_candidate_sources (...)
values (...)
on conflict (candidate_id, observation_id) do nothing;

insert into elepem_core.facility_observation_links (...)
values (...)
on conflict (facility_id, observation_id) do nothing;

insert into elepem_core.audit_log (..., request_id)
select ...
where not exists (select 1 from elepem_core.audit_log where request_id = ...);
```

La operación se ejecutará en una única transacción. Antes del `commit` se
verifican los diez candidatos, `public_eligible = false` y la invariancia del
conteo de `public.residenciales`.

## Puerta de aprobación

El preflight resultó `safeToApply: true`. No se ejecutó `--apply`. La escritura
definitiva requiere confirmación explícita posterior a este reporte.
