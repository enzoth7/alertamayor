# Auditoría de backfill normalizado — 2026-08-03

Estado: ejecutado únicamente en `local-elepem-backfill-20260803` (127.0.0.1:55432/postgres).

El proyecto remoto se usó solo para generar un snapshot en una transacción `READ ONLY`. No se aplicó SQL ni se escribió en `itolluaivfoxnaohbsdk`.

## Entradas

| Archivo | Filas/registros | SHA-256 |
|---|---:|---|
| `data/discovery/normalized-backfill-source-2026-08-03.json` | 804 | `9b3d33058619b55d2ca72f05f1ae83a7bb22340aa0e6b0e43c75e8fdf965e1d2` |
| `Alerta_Mayor_ELEPEM_v01/data/elepem_publicos_v01.json` | 810 | `ac45072162aef9a642aee61620334505cfed75f2fa8165fe8406143660799657` |
| `Alerta_Mayor_ELEPEM_v01/data/elepem_publicos_v01.csv` | 810 | `bf103aaf633c68c0a692ee7f8350c155378872260eaba6d62043d67038986d44` |
| `Alerta_Mayor_ELEPEM_v01/data/registros_fuente_v01.csv` | 1357 | `5eb50ea9e8b927ca62749b368a1e1466b6f0e1231558ea279272cd13d5dfbefc` |
| `Alerta_Mayor_ELEPEM_v01/data/fuentes_publicas_v01.csv` | 22 | `1b8be079e4f529081eb4dac52f2c955be73c2add4d6e00f69824549175d45a10` |
| `data/discovery/osm-elepem-candidates-2026-08-02.json` | 32 | `94a0c3fb6ef3d6327cf9bab7f6c840b2888fdf0467176accbd6bf69a04fc4ce3` |
| `data/discovery/instagram_paysandu_candidates_2026-08-02.json` | 14 | `7f1a76557a16aad76c5dae4f17fb2b78ec87fc8bab7780cc30130698983659c7` |
| `data/discovery/artigas_department_elepem_public_candidates_2026-08-02.json` | 9 | `75a4acf17bf578f4c01a245cf1dcaffd0ab4aa07c3d8a4278c549f2784f2e0f2` |

## Plan calculado

```json
{
  "legacyRows": 804,
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
  "facilities": 896,
  "legacyMappings": 804,
  "sourceCatalog": 34,
  "sourceRuns": 30,
  "sourceObservations": 2236,
  "candidates": 53,
  "candidateSources": 82,
  "externalIds": 838,
  "matchSuggestions": 90,
  "conflicts": 43,
  "conflictTypes": {
    "excluded_contaminated_source": 2,
    "split_multivalue_contact": 23,
    "address_difference": 16,
    "candidate_missing_location": 2
  },
  "publicApprovedRowsPlanned": 0
}
```

## Conteos posteriores

| Relación | Filas |
|---|---:|
| candidates | 53 |
| facilities | 896 |
| external_ids | 838 |
| facility_names | 971 |
| legacy_mappings | 804 |
| public_approved | 0 |
| candidate_sources | 82 |
| facility_contacts | 524 |
| facility_geocodes | 896 |
| match_suggestions | 90 |
| facility_addresses | 896 |
| source_observations | 2236 |
| legacy_residenciales | 804 |
| administrative_events | 1485 |

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

- La ejecución comenzó con 896 sedes normalizadas.
- Ejecución repetida detectada: sí.
- Las escrituras usan claves estables y `ON CONFLICT`; no actualizan revisiones humanas ni publican candidatos.

## Rollback y reaplicación

- Rollback estructural probado en este target local: sí.
- El rollback preserva las 804 filas heredadas, candidatos, observaciones y los 30 IDs OSM originales; elimina únicamente el esquema canónico y los IDs oficiales cuya sede propietaria se retira.
- La reaplicación restaura el modelo y los enlaces al catálogo de fuentes.

## Conflictos

Se emitieron 43 filas en el CSV de conflictos. Las fusiones permitidas provienen exclusivamente de decisiones humanas ya documentadas en el repositorio. Matching por nombre solo está prohibido.

## Limitaciones

- Este informe demuestra el backfill local, no un corte de producción.
- Las sedes quedan `publication_status = private` y `review_status = needs_review`.
- Los candidatos de Paysandú y Artigas quedan en nivel C y revisión pendiente.
- El snapshot privado se conserva en `data/discovery`, ruta ignorada por Git.
