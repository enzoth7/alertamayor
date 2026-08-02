import { readFile } from "node:fs/promises";
import pg from "pg";

const { Pool } = pg;
const REPORT_URL = new URL(
  "../scratch/elepem-discovery/20260802T002858Z/candidates.json",
  import.meta.url,
);
const APPROVED_IDS = new Set([
  "RDC-ae19cf518004596d",
  "RDC-5386be09ff7ed145",
  "RDC-e7ce7eaf288aaf5f",
  "RDC-27f98b4e7fbc75c2",
  "RDC-2b8781de5f4d8738",
  "RDC-5a22bde581a8235b",
  "RDC-2df21a762fe0740b",
  "RDC-abcb9c20442b835b",
  "RDC-d31816b583a7c961",
  "RDC-755d2c42255e269b",
  "RDC-bceb498e8579a643",
  "RDC-d927562cccd65a6f",
  "RDC-9e75974987fa36f5",
  "RDC-350c40e0419ba5d3",
  "RDC-f50f63c7f0151126",
  "RDC-eea7f13cd1313782",
  "RDC-ff7e9ee3a025744e",
]);

function databasePool() {
  if (!process.env.SUPABASE_PROJECT_REF || !process.env.SUPABASE_DB_PASSWORD) {
    throw new Error("Faltan las variables de conexión de Supabase.");
  }
  return new Pool({
    host:
      process.env.SUPABASE_DB_HOST ||
      `db.${process.env.SUPABASE_PROJECT_REF}.supabase.co`,
    port: Number(process.env.SUPABASE_DB_PORT || 5432),
    database: process.env.SUPABASE_DB_NAME || "postgres",
    user: process.env.SUPABASE_DB_USER || "postgres",
    password: process.env.SUPABASE_DB_PASSWORD,
    ssl: {
      rejectUnauthorized:
        process.env.SUPABASE_DB_SSL_REJECT_UNAUTHORIZED === "true",
    },
    max: 1,
    connectionTimeoutMillis: 20_000,
  });
}

function locality(candidate) {
  const address = candidate.address || "";
  if (/guichón/i.test(address)) return "Guichón";
  if (/nuevo paysandu/i.test(address)) return "Nuevo Paysandú";
  return "Paysandú";
}

const report = JSON.parse(await readFile(REPORT_URL, "utf8"));
const candidates = report.candidates.filter((candidate) =>
  APPROVED_IDS.has(candidate.id),
);
if (candidates.length !== APPROVED_IDS.size) {
  throw new Error(
    `Se esperaban ${APPROVED_IDS.size} candidatos y se encontraron ${candidates.length}.`,
  );
}

const rows = candidates.map((candidate) => ({
  candidate_id: candidate.id,
  residencial_id: `APP-${candidate.id.slice(4).toUpperCase()}`,
  sources: candidate.sources,
  origins: candidate.origins,
  google_place_ids: candidate.googlePlaceIds,
  name: candidate.name,
  department: "Paysandú",
  locality: locality(candidate),
  address: candidate.address,
  phone: candidate.phone,
  website_url: candidate.websiteUrl,
  lat: candidate.lat,
  lng: candidate.lng,
  operational_status: candidate.operationalStatus,
  storage_policy: candidate.storagePolicy,
  confidence: candidate.confidence,
  match_reasons: candidate.matchReasons,
  alternative_matches: candidate.alternativeMatches,
  first_seen_at: candidate.discoveredAt,
  last_seen_at: candidate.discoveredAt,
  run_metadata: {
    sourceReport: "20260802T002858Z",
    reviewBasis: "Depuración territorial y tipológica del barrido SerpApi",
  },
}));

console.log(
  JSON.stringify(
    {
      apply: process.argv.includes("--apply"),
      count: rows.length,
      statusGroup: "app",
      color: "negro",
      names: rows.map((row) => row.name),
    },
    null,
    2,
  ),
);
if (!process.argv.includes("--apply")) {
  console.log("Vista previa completa. Volvé a ejecutar con --apply.");
  process.exit(0);
}

const pool = databasePool();
const client = await pool.connect();
try {
  await client.query("begin");
  try {
    const inserted = await client.query(
      `
        with incoming as (
          select *
          from jsonb_to_recordset($1::jsonb) as row(
            residencial_id text,
            name text,
            department text,
            locality text,
            address text,
            lat double precision,
            lng double precision,
            candidate_id text
          )
        )
        insert into public.residenciales (
          id, name, department, locality, address, places, lat, lng,
          precision, precision_label, status_group, status_stage,
          status_short, source_label, msp_final, msp_registro_historico,
          mides_social, pacp, other_source
        )
        select
          residencial_id, name, department, locality, address, null, lat, lng,
          'puerta',
          'Coordenadas de Google Maps vía SerpApi; requieren verificación',
          'app',
          'Hallazgo de la app',
          'Encontrado por la app · pendiente de verificación',
          'SerpApi Google Maps · barrido Paysandú 2026-08-01 · ' || candidate_id,
          false, false, false, false, true
        from incoming
        on conflict (id) do update set
          name = excluded.name,
          department = excluded.department,
          locality = excluded.locality,
          address = excluded.address,
          lat = excluded.lat,
          lng = excluded.lng,
          precision = excluded.precision,
          precision_label = excluded.precision_label,
          status_group = excluded.status_group,
          status_stage = excluded.status_stage,
          status_short = excluded.status_short,
          source_label = excluded.source_label,
          other_source = excluded.other_source
        where residenciales.status_group = 'app'
        returning id
      `,
      [JSON.stringify(rows)],
    );
    if (inserted.rowCount !== rows.length) {
      throw new Error(
        `La carga pública devolvió ${inserted.rowCount} filas; se esperaban ${rows.length}.`,
      );
    }

    await client.query(
      `
        with incoming as (
          select *
          from jsonb_to_recordset($1::jsonb) as row(
            candidate_id text,
            residencial_id text,
            sources text[],
            origins jsonb,
            google_place_ids text[],
            name text,
            department text,
            locality text,
            address text,
            phone text,
            website_url text,
            lat double precision,
            lng double precision,
            operational_status text,
            storage_policy text,
            confidence numeric,
            match_reasons text[],
            alternative_matches jsonb,
            first_seen_at timestamptz,
            last_seen_at timestamptz,
            run_metadata jsonb
          )
        )
        insert into public.residencial_discovery_candidates (
          id, sources, origins, google_place_ids, name, department, locality,
          address, phone, website_url, lat, lng, operational_status,
          storage_policy, match_status, suggested_residencial_id, confidence,
          match_reasons, alternative_matches, review_status, reviewed_at,
          reviewed_by, review_notes, promoted_residencial_id, first_seen_at,
          last_seen_at, run_metadata
        )
        select
          candidate_id, sources, origins, google_place_ids, name, department,
          locality, address, phone, website_url, lat, lng, operational_status,
          storage_policy, 'new_candidate', null, confidence, match_reasons,
          alternative_matches, 'approved_new', now(), 'Carga solicitada por usuario',
          'Publicado en categoría negra app; pendiente de verificación administrativa',
          residencial_id, first_seen_at, last_seen_at, run_metadata
        from incoming
        on conflict (id) do update set
          review_status = 'approved_new',
          reviewed_at = now(),
          reviewed_by = 'Carga solicitada por usuario',
          review_notes = 'Publicado en categoría negra app; pendiente de verificación administrativa',
          promoted_residencial_id = excluded.promoted_residencial_id,
          updated_at = now()
      `,
      [JSON.stringify(rows)],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }

  const verification = await client.query(`
    select status_group, count(*)::integer as total
    from public.residenciales
    where status_group = 'app'
    group by status_group
  `);
  console.log(JSON.stringify(verification.rows[0], null, 2));
} finally {
  client.release();
  await pool.end();
}
