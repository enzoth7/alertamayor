# Diagrama del esquema objetivo

Estado: diseño de Paso 4, no aplicado.

## Límites y flujo

```mermaid
flowchart LR
  subgraph Public["public — vistas con grants revocados por defecto"]
    Approved["facilities_public_approved"]
    Internal["facilities_current_internal"]
    Compat["residenciales_legacy_compat"]
    Exclusion["known_facilities_exclusion_view"]
    Legacy["residenciales — intacta"]
  end

  subgraph Core["elepem_core — privado, RLS + FORCE RLS"]
    Facilities["facilities — una sede física"]
    Values["nombres · direcciones · contactos · geocódigos"]
    Admin["operadores · eventos · capacidad"]
    Reviews["revisiones A/B · audit_log"]
    Mapping["legacy_facility_map"]
  end

  subgraph Discovery["discovery_private — cola y evidencia privada"]
    Runs["source_runs · source_observations"]
    Candidates["candidates · suggestions"]
    CandidateAudit["candidate_sources · external_ids · review_events"]
  end

  Server["Servidor con rol mínimo"]
  Browser["Navegador"]
  Human["Revisión humana"]

  Runs --> Candidates
  Candidates --> Human
  Human --> Reviews
  CandidateAudit --> Facilities
  Legacy --> Mapping
  Mapping --> Facilities
  Facilities --> Values
  Facilities --> Admin
  Reviews -->|"habilita A/B"| Approved
  Facilities --> Internal
  Facilities --> Exclusion
  Candidates --> Exclusion
  Legacy --> Compat
  Approved --> Server
  Internal --> Server
  Exclusion --> Server
  Server --> Browser
  Browser -. "sin acceso directo" .-> Core
  Browser -. "sin acceso directo" .-> Discovery
```

## Relaciones principales

```mermaid
erDiagram
  SOURCE_CATALOG ||--o{ SOURCE_RUNS : clasifica
  SOURCE_CATALOG ||--o{ SOURCE_OBSERVATIONS : clasifica
  SOURCE_RUNS ||--o{ SOURCE_OBSERVATIONS : contiene
  SOURCE_OBSERVATIONS ||--o{ CANDIDATE_SOURCES : evidencia
  CANDIDATES ||--o{ CANDIDATE_SOURCES : tiene
  CANDIDATES ||--o{ MATCH_SUGGESTIONS : recibe
  CANDIDATES ||--o{ CANDIDATE_REVIEW_EVENTS : audita
  CANDIDATES o|--o{ EXTERNAL_IDS : posee_transitoriamente

  FACILITIES o|--o{ FACILITIES : fusiona_en
  FACILITIES ||--o{ FACILITY_NAMES : tiene
  FACILITIES ||--o{ FACILITY_ADDRESSES : tiene
  FACILITIES ||--o{ FACILITY_CONTACTS : tiene
  FACILITIES ||--o{ SOCIAL_ACCOUNTS : referencia
  FACILITIES ||--o{ FACILITY_GEOCODES : ubica
  FACILITY_ADDRESSES ||--o{ FACILITY_GEOCODES : geocodifica
  FACILITIES ||--o{ ADMINISTRATIVE_EVENTS : registra
  FACILITIES ||--o{ CAPACITY_OBSERVATIONS : registra
  FACILITIES ||--o{ FACILITY_REVIEWS : revisa
  FACILITIES ||--o{ FACILITY_OBSERVATION_LINKS : fundamenta
  SOURCE_OBSERVATIONS ||--o{ FACILITY_OBSERVATION_LINKS : procede_de

  ORGANIZATIONS ||--o{ FACILITY_OPERATORS : participa
  FACILITIES ||--o{ FACILITY_OPERATORS : opera

  LEGACY_RESIDENCIALES ||--|| LEGACY_FACILITY_MAP : reconcilia
  FACILITIES o|--o{ LEGACY_FACILITY_MAP : recibe
  FACILITIES o|--o{ EXTERNAL_IDS : posee
  FACILITIES o|--o{ MATCH_SUGGESTIONS : sugerida
  FACILITIES o|--o{ CANDIDATE_REVIEW_EVENTS : decidida
```

## Cardinalidades e invariantes

- Una sede tiene muchos nombres, pero como máximo uno preferido.
- Una sede puede tener muchas direcciones históricas, pero como máximo una dirección física actual.
- Una dirección puede tener varios resultados históricos, pero como máximo un geocódigo actual por sede.
- Una sede puede relacionarse con varios operadores históricos y con un operador actual por tipo de relación.
- Un ID externo tiene exactamente un propietario: candidato, fila heredada o sede canónica.
- Un ID heredado tiene una sola fila de mapping; mappings pendientes o conflictivos no apuntan a una sede.
- Una revisión y una entrada de auditoría son append-only.
- La vista pública solo selecciona una sede actual aprobada con una revisión humana A/B, nombre, dirección y geocódigo actuales.

## Contrato de compatibilidad

```mermaid
sequenceDiagram
  participant App as Aplicación actual
  participant Compat as residenciales_legacy_compat
  participant Legacy as public.residenciales
  participant Normal as facilities_public_approved

  Note over Compat,Legacy: Paso 4/5
  App->>Compat: SELECT forma heredada (21 columnas)
  Compat->>Legacy: proyección sin cambios
  Legacy-->>Compat: filas actuales
  Compat-->>App: mismo contrato

  Note over Compat,Normal: Paso 6, después de reconciliar
  App->>Compat: SELECT forma heredada
  Compat->>Normal: adaptador normalizado aprobado
  Normal-->>Compat: solo sedes publicables
  Compat-->>App: mismo contrato
```

No se redefine la vista hacia el modelo normalizado hasta que el backfill demuestre equivalencia y el usuario apruebe el corte de producción.
