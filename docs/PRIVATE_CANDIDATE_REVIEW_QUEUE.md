# Cola privada de revisión de candidatos

La cola interna está disponible en `http://localhost:3000/organizacion/residenciales`.
La ruta exige una sesión de equipo válida y el API vuelve a validar la sesión en el
servidor. Los candidatos no se muestran en `/personas/residenciales` y ninguna
decisión de la cola escribe en `public.residenciales`.

## Datos y acceso

- `discovery_private.facility_candidates` conserva el estado revisable.
- `discovery_private.facility_source_observations` conserva la observación original.
- `discovery_private.facility_candidate_match_suggestions` guarda hasta tres
  coincidencias explicables por candidato.
- `discovery_private.facility_candidate_review_events` conserva snapshots antes y
  después, nota, decisión, correcciones, fecha y el identificador del revisor.
- Las tablas nuevas tienen RLS habilitado y forzado, no tienen políticas de Data API
  y no otorgan privilegios a `anon`, `authenticated` ni `service_role`.
- El navegador solo usa `/api/team/facility-candidates`; la conexión PostgreSQL queda
  del lado servidor.

El historial es append-only mediante un trigger. Las correcciones actualizan el
registro candidato, pero no borran ni reescriben la observación fuente.

## Reglas de decisión

- Nivel A: requiere al menos una fuente oficial enlazada como `evidence_a`.
- Nivel B: requiere al menos dos fuentes públicas independientes enlazadas como
  `evidence_b`; una URL social por sí sola no cuenta.
- Nivel C: permanece como pista y no puede marcarse `verified_new` ni
  `verified_match`.
- Todas las decisiones guardan `public_eligible = false`. La eventual publicación
  debe ser otro proceso explícito, revisado y fuera de esta cola.

## Verificación local

```powershell
npm ci
npm run test:candidate-review
npm run test:matching
npm run test:osm-discovery
npx tsc --noEmit --incremental false
npm run build
npm run dev
```

Después de iniciar sesión, abrir:

```text
http://localhost:3000/organizacion/residenciales
```

## Sincronización de las sugerencias privadas

```powershell
npm run db:sync:candidate-matches -- `
  --input data/discovery/osm-candidate-review-2026-08-02.json `
  --apply
```

El comando comprueba el total de `public.residenciales` antes y después y revierte la
transacción si cambia.

## Rollback

Los SQL de rollback están en:

- `supabase/rollbacks/20260802054500_unharden_facility_candidate_review_audit.sql`
- `supabase/rollbacks/20260802053000_drop_facility_candidate_review_queue.sql`

El rollback elimina solamente el historial y las sugerencias de esta cola. No cambia
ni elimina `public.residenciales`, las observaciones, los candidatos o sus fuentes.
