# Auditoría de backfill normalizado — 2026-08-04

Estado: ejecutado únicamente en `local-docker-20260804` (127.0.0.1:55432/postgres).

El proyecto remoto se usó solo para generar un snapshot en una transacción `READ ONLY`. No se aplicó SQL ni se escribió en `itolluaivfoxnaohbsdk`.

## Entradas

| Archivo | Filas/registros | SHA-256 |
|---|---:|---|
| `data/discovery/normalized-backfill-source-cleaned-2026-08-04.json` | 801 | `3cc135468e7cf5c6c972341ee4c32275375de5c50da8714e11ae56dbffa940fe` |
| `../../../../Users/Enzog/AppData/Local/Temp/alertamayor-normalized-inputs-20260804/elepem_publicos_v01.json` | 810 | `d052fd0d972f2ae366fb3c3c1bbd6a284543eb7539e780e5696d36d3b233ea98` |
| `data/reference/elepem_publicos_v01.csv` | 810 | `93f8e65939b5c215a1f0811df0cf671685914fd59649999a49106394618fd973` |
| `data/reference/registros_fuente_v01.csv` | 1357 | `231914c6344d35a680117af4efa43b8edac89ce834b1152289d427446bcac717` |
| `../../../../Users/Enzog/AppData/Local/Temp/alertamayor-normalized-inputs-20260804/fuentes_publicas_v01.csv` | 22 | `a7c7100cc513c32e0097226439871cc7b9eeb44756d8fe0bebe65dcf969cc168` |
| `data/discovery/osm/descubrimiento_osm_piloto_2026-07-31/candidates.json` | 23 | `1910e6111c61dcba77c30e082ecca48ca87d50c11733cefdc0622b3ecd787fa5` |
| `../../../../Users/Enzog/AppData/Local/Temp/alertamayor-normalized-inputs-20260804/empty-paysandu.json` | 0 | `7832c3824a3705a0cb5a010ca4f61db4cf6145cb0caea6092391e7c7fb322998` |
| `../../../../Users/Enzog/AppData/Local/Temp/alertamayor-normalized-inputs-20260804/empty-artigas.json` | 0 | `7832c3824a3705a0cb5a010ca4f61db4cf6145cb0caea6092391e7c7fb322998` |

## Plan calculado

```json
{
  "legacyRows": 801,
  "officialJsonRows": 810,
  "officialCsvRows": 810,
  "officialSourceRecords": 1357,
  "officialSourceCatalogRows": 22,
  "reviewedMergeGroups": 40,
  "excludedOfficialRows": 2,
  "officialMatchMethods": {
    "exact_id": 550,
    "exact_address": 110,
    "human_review": 15,
    "unmatched": 92
  },
  "facilities": 893,
  "legacyMappings": 801,
  "sourceCatalog": 47,
  "sourceRuns": 43,
  "sourceObservations": 2451,
  "candidates": 175,
  "candidateSources": 300,
  "externalIds": 838,
  "matchSuggestions": 90,
  "conflicts": 41,
  "conflictTypes": {
    "excluded_contaminated_source": 2,
    "split_multivalue_contact": 23,
    "address_difference": 16
  },
  "publicApprovedRowsPlanned": 0
}
```

## Conteos posteriores

| Relación | Filas |
|---|---:|
| candidates | 175 |
| facilities | 893 |
| external_ids | 838 |
| facility_names | 968 |
| legacy_mappings | 801 |
| public_approved | 0 |
| candidate_sources | 300 |
| facility_contacts | 524 |
| facility_geocodes | 893 |
| match_suggestions | 90 |
| facility_addresses | 893 |
| source_observations | 2451 |
| legacy_residenciales | 801 |
| administrative_events | 1502 |

## Integridad

| Control | Resultado |
|---|---:|
| orphan_mappings | 0 |
| unmapped_legacy | 0 |
| public_candidates | 0 |
| duplicate_external_ids | 0 |
| duplicate_facility_keys | 0 |
| facilities_without_preferred_name | 0 |

## Seguridad

- Tablas normalizadas: 15.
- Tablas sin RLS habilitada y forzada: 0.
- Grants de tabla para `anon`/`authenticated`: 0.
- Vistas con `security_invoker=true`: 4 de 4.
- Filas en `facilities_public_approved`: 0.
- Candidatos con `public_eligible=true`: 0.

## Idempotencia

- La ejecución comenzó con 893 sedes normalizadas.
- Ejecución repetida detectada: sí.
- Las escrituras usan claves estables y `ON CONFLICT`; no actualizan revisiones humanas ni publican candidatos.

## Rollback y reaplicación

- Rollback estructural probado en este target local: sí.
- El rollback preserva las 801 filas heredadas, candidatos, observaciones y los IDs externos originales; elimina únicamente el esquema canónico y los IDs cuya sede canónica propietaria se retira.
- La reaplicación restaura el modelo y los enlaces al catálogo de fuentes.

## Conflictos

Se emitieron 41 filas en el CSV de conflictos. Las fusiones permitidas provienen exclusivamente de decisiones humanas ya documentadas en el repositorio. Matching por nombre solo está prohibido.

## Limitaciones

- Este informe demuestra el backfill local, no un corte de producción.
- Las sedes quedan `publication_status = private` y `review_status = needs_review`.
- Los candidatos privados conservan su nivel de evidencia y estado de revisión existente.
- El snapshot privado se conserva en `data/discovery`, ruta ignorada por Git.
