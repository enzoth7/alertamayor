# Mapa de dependencias de Supabase

Fecha: 2026-08-03

## Flujo público de residenciales

```text
app/components/*
  └─ app/hooks/useResidenciales.ts
      └─ GET /api/residenciales
          └─ app/api/residenciales/route.ts
              └─ lib/supabase-db.ts (conexión PostgreSQL de servidor)
                  └─ public.residenciales (804 filas, sin vista de aprobación)
```

Campos consumidos por el contrato público: `id`, `name`, `department`, `locality`, `address`, `places`, `lat`, `lng`, `precision`, `precision_label`, `status_group`, `status_stage`, `status_short`, `source_label`, `msp_final`, `msp_registro_historico`, `mides_social`, `pacp`, `other_source`.

Riesgo de corte: cualquier normalización que cambie nombres o semántica rompe `Facility`. El Paso 4 debe definir `residenciales_legacy_compat` antes de cambiar lecturas.

## Flujo privado de revisión

```text
app/components/team/TeamFacilityCandidateQueue.tsx
  └─ GET/POST /api/team/facility-candidates
      ├─ cookie firmada de equipo + same-origin
      ├─ discovery_private.facility_candidates
      ├─ discovery_private.facility_candidate_sources
      ├─ discovery_private.facility_source_observations
      ├─ discovery_private.facility_candidate_match_suggestions
      ├─ discovery_private.facility_candidate_review_events
      └─ public.residenciales (coincidencias existentes)
```

El POST actual bloquea publicación: siempre escribe `public_eligible=false`, exige evidencia A/B para decisiones verificadas y registra snapshot antes/después. No escribe `public.residenciales`.

## Flujos de importación y matching

| Flujo | Lecturas | Escrituras | Observación |
|---|---|---|---|
| `import-residenciales.mjs` | `app/data/facilities.json` | `public.residenciales` | Importador legacy |
| `sync-residenciales-elepem-v01.mjs` | JSON/CSV oficiales | `public.residenciales` | Reconciliación amplia legacy |
| `discover-residenciales.mjs` | `public.residenciales`, OSM/Google/Apify/SerpAPI | archivos | Google amplio incompatible con plan v2 |
| `sync-residencial-discovery-candidates.mjs` | archivos discovery + `public.residenciales` | `public.residencial_discovery_candidates` | Cola legada |
| `review-residencial-discovery-candidate.mjs` | cola legada | cola legada | Decisión legacy |
| `promote-residencial-discovery-candidate.mjs` | cola legada | cola legada + `public.residenciales` | Publicación manual legacy |
| `private-candidate-import.mjs` | OSM + `public.residenciales` | cinco tablas privadas | Impide cambios de conteo público |
| `sync-candidate-match-suggestions.mjs` | candidatos + `public.residenciales` | match suggestions | Tres coincidencias |
| `import-social-candidates.mjs` | Paysandú + Supabase + OSM cache | archivo de dry-run | No implementa apply |
| `geocode-manual-discovery-candidates.mjs` | archivo local | archivo local | IDE todavía fuera de Supabase |

## Intake y evidencias

```text
Formulario público
  ├─ POST /api/intake-reports → public.intake_reports
  │    └─ trigger → public.intake_report_events
  ├─ Edge notify-intake-code → Resend + intake_notification_log
  └─ Edge upload-intake-evidence → storage + intake_report_attachments

Equipo interno
  ├─ /api/team/intake-reports → estados y eventos
  └─ /api/team/intake-reports/attachment → lectura de Storage
```

Las Edge Functions tienen `verify_jwt=false` y usan token de capacidad. Las políticas directas públicas de Storage permiten eludir esta capa si el path es conocido; corregir en una fase de seguridad explícita.

## Matriz tabla-consumidor

| Tabla | Lectores confirmados | Escritores confirmados |
|---|---|---|
| `public.residenciales` | API pública, ruta candidata, exportadores, matching | importadores, sync oficial, promoción legacy |
| `public.residencial_discovery_candidates` | scripts legacy | sync/review/promote/load Paysandú |
| `discovery_private.facility_source_runs` | importador privado (ID/conteos) | importador privado OSM |
| `discovery_private.facility_source_observations` | ruta candidata, dry-run social, importador | importador privado OSM |
| `discovery_private.facility_candidates` | ruta candidata, dry-run social, matching | importador privado y revisión humana |
| `discovery_private.facility_candidate_sources` | ruta candidata/evidencia | importador privado OSM |
| `discovery_private.facility_external_ids` | sin lector runtime confirmado | importador privado OSM |
| `discovery_private.facility_candidate_match_suggestions` | ruta candidata | sync de matches |
| `discovery_private.facility_candidate_review_events` | ruta candidata | ruta candidata; trigger append-only |
| `public.intake_reports` | rutas Next + Edge Functions | formulario público + equipo |
| `public.intake_report_events` | status público + equipo | trigger + equipo |
| `public.intake_report_attachments` | rutas de adjuntos + equipo | Edge Function + fallback Next |
| `public.intake_notification_log` | Edge Function | Edge Function |

## Archivos y sistemas paralelos

- `app/data/facilities.json`: solo importación; no runtime.
- `Alerta_Mayor_ELEPEM_v01/data/*`: evidencia y snapshots normalizados; no runtime.
- `data/discovery/*`: entradas/salidas auditables; varias todavía no importadas.
- `ELEPEM OSINT`: aplicación FastAPI/SQLAlchemy con Postgres local y modelo alternativo (`registry_imports`, `official_registry_records`, `candidates`, `candidate_sources`, `match_comparisons`, `review_items`, `audit_events`). Next.js no lo consume.

## Puntos de corte futuros

1. Crear esquema normalizado paralelo y tabla de mapeo de IDs.
2. Backfill y reconciliar sin tocar `public.residenciales`.
3. Crear `residenciales_legacy_compat` con el contrato exacto actual.
4. Crear `facilities_public_approved` y probar conteos representativos.
5. Cambiar `/api/residenciales` detrás de un switch reversible.
6. Cambiar matching/importadores a `known_facilities_exclusion_view`.
7. Retirar dependencias de la cola legada solo después de reconciliar sus 40 filas.

