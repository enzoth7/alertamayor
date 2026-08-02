import { readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Pool } = pg;

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--")) continue;
    const [rawKey, inlineValue] = argument.slice(2).split(/=(.*)/s, 2);
    if (inlineValue !== undefined) {
      args[rawKey] = inlineValue;
    } else if (argv[index + 1] && !argv[index + 1].startsWith("--")) {
      args[rawKey] = argv[index + 1];
      index += 1;
    } else {
      args[rawKey] = true;
    }
  }
  return args;
}

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
    max: 2,
    connectionTimeoutMillis: 20_000,
  });
}

function validateCandidate(candidate) {
  if (!/^RDC-[a-f0-9]{16}$/.test(candidate.id || "")) {
    throw new Error(`ID de candidato inválido: ${candidate.id}.`);
  }
  if (!Array.isArray(candidate.sources) || candidate.sources.length === 0) {
    throw new Error(`${candidate.id}: no tiene fuentes.`);
  }
  if (!Array.isArray(candidate.origins) || candidate.origins.length === 0) {
    throw new Error(`${candidate.id}: no tiene orígenes.`);
  }
  if (
    candidate.storagePolicy === "google_place_id_only" &&
    [
      candidate.name,
      candidate.address,
      candidate.phone,
      candidate.websiteUrl,
      candidate.lat,
      candidate.lng,
    ].some((value) => value != null && value !== "")
  ) {
    throw new Error(
      `${candidate.id}: intentó persistir contenido restringido de Places.`,
    );
  }
}

function databasePayload(candidate, meta) {
  return {
    id: candidate.id,
    sources: candidate.sources,
    origins: candidate.origins,
    google_place_ids: candidate.googlePlaceIds || [],
    name: candidate.name || null,
    department: candidate.department || null,
    locality: candidate.locality || null,
    address: candidate.address || null,
    phone: candidate.phone || null,
    website_url: candidate.websiteUrl || null,
    lat: candidate.lat,
    lng: candidate.lng,
    operational_status: candidate.operationalStatus || null,
    storage_policy: candidate.storagePolicy,
    match_status: candidate.matchStatus,
    suggested_residencial_id: candidate.suggestedResidencialId || null,
    confidence: candidate.confidence,
    match_reasons: candidate.matchReasons || [],
    alternative_matches: candidate.alternativeMatches || [],
    first_seen_at: candidate.discoveredAt,
    last_seen_at: candidate.discoveredAt,
    run_metadata: meta,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.status) {
    const pool = databasePool();
    try {
      const result = await pool.query(`
        select
          (select count(*)::integer from public.residenciales) as residenciales,
          (
            select count(*)::integer
            from public.residenciales
            where id like 'DISC-%'
          ) as discovery_publicados,
          (
            select count(*)::integer
            from public.residencial_discovery_candidates
          ) as candidatos,
          (
            select count(*)::integer
            from public.residencial_discovery_candidates
            where review_status = 'pending'
          ) as pendientes,
          (
            select count(*)::integer
            from public.residencial_discovery_candidates
            where promoted_residencial_id is not null
          ) as promovidos
      `);
      console.log(JSON.stringify(result.rows[0], null, 2));
      return;
    } finally {
      await pool.end();
    }
  }
  if (!args.file) {
    throw new Error(
      "Uso: --file=ruta/candidates.json [--apply] o --status.",
    );
  }
  const inputPath = path.resolve(args.file);
  const parsed = JSON.parse(await readFile(inputPath, "utf8"));
  if (!parsed || !Array.isArray(parsed.candidates) || !parsed.meta) {
    throw new Error("El archivo no tiene el formato { meta, candidates } esperado.");
  }
  for (const candidate of parsed.candidates) validateCandidate(candidate);
  const payload = parsed.candidates.map((candidate) =>
    databasePayload(candidate, parsed.meta),
  );
  const counts = Object.fromEntries(
    ["probable_match", "possible_match", "new_candidate"].map((status) => [
      status,
      parsed.candidates.filter((candidate) => candidate.matchStatus === status)
        .length,
    ]),
  );

  console.log(
    JSON.stringify(
      { file: inputPath, candidates: payload.length, counts, apply: Boolean(args.apply) },
      null,
      2,
    ),
  );
  if (!args.apply) {
    console.log("Validación completa. No se modificó Supabase.");
    return;
  }

  const pool = databasePool();
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await client.query(
      `
        with incoming as (
          select *
          from jsonb_to_recordset($1::jsonb) as row(
            id text,
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
            match_status text,
            suggested_residencial_id text,
            confidence numeric,
            match_reasons text[],
            alternative_matches jsonb,
            first_seen_at timestamptz,
            last_seen_at timestamptz,
            run_metadata jsonb
          )
        ), sanitized as (
          select
            incoming.*,
            residencial.id as valid_suggested_residencial_id
          from incoming
          left join public.residenciales as residencial
            on residencial.id = incoming.suggested_residencial_id
        )
        insert into public.residencial_discovery_candidates (
          id,
          sources,
          origins,
          google_place_ids,
          name,
          department,
          locality,
          address,
          phone,
          website_url,
          lat,
          lng,
          operational_status,
          storage_policy,
          match_status,
          suggested_residencial_id,
          confidence,
          match_reasons,
          alternative_matches,
          first_seen_at,
          last_seen_at,
          run_metadata
        )
        select
          id,
          sources,
          origins,
          google_place_ids,
          name,
          department,
          locality,
          address,
          phone,
          website_url,
          lat,
          lng,
          operational_status,
          storage_policy,
          match_status,
          valid_suggested_residencial_id,
          confidence,
          match_reasons,
          alternative_matches,
          first_seen_at,
          last_seen_at,
          run_metadata
        from sanitized
        on conflict (id) do update set
          sources = excluded.sources,
          origins = excluded.origins,
          google_place_ids = excluded.google_place_ids,
          name = coalesce(excluded.name, residencial_discovery_candidates.name),
          department = coalesce(
            excluded.department,
            residencial_discovery_candidates.department
          ),
          locality = coalesce(
            excluded.locality,
            residencial_discovery_candidates.locality
          ),
          address = coalesce(
            excluded.address,
            residencial_discovery_candidates.address
          ),
          phone = coalesce(excluded.phone, residencial_discovery_candidates.phone),
          website_url = coalesce(
            excluded.website_url,
            residencial_discovery_candidates.website_url
          ),
          lat = coalesce(excluded.lat, residencial_discovery_candidates.lat),
          lng = coalesce(excluded.lng, residencial_discovery_candidates.lng),
          operational_status = coalesce(
            excluded.operational_status,
            residencial_discovery_candidates.operational_status
          ),
          storage_policy = excluded.storage_policy,
          match_status = case
            when residencial_discovery_candidates.review_status = 'pending'
              then excluded.match_status
            else residencial_discovery_candidates.match_status
          end,
          suggested_residencial_id = case
            when residencial_discovery_candidates.review_status = 'pending'
              then excluded.suggested_residencial_id
            else residencial_discovery_candidates.suggested_residencial_id
          end,
          confidence = case
            when residencial_discovery_candidates.review_status = 'pending'
              then excluded.confidence
            else residencial_discovery_candidates.confidence
          end,
          match_reasons = case
            when residencial_discovery_candidates.review_status = 'pending'
              then excluded.match_reasons
            else residencial_discovery_candidates.match_reasons
          end,
          alternative_matches = excluded.alternative_matches,
          first_seen_at = least(
            residencial_discovery_candidates.first_seen_at,
            excluded.first_seen_at
          ),
          last_seen_at = greatest(
            residencial_discovery_candidates.last_seen_at,
            excluded.last_seen_at
          ),
          run_metadata = excluded.run_metadata,
          updated_at = now()
        returning id
      `,
      [JSON.stringify(payload)],
    );
    await client.query("commit");

    const summary = await client.query(`
      select
        count(*)::integer as total,
        count(*) filter (where review_status = 'pending')::integer as pending,
        count(*) filter (where match_status = 'probable_match')::integer
          as probable_matches,
        count(*) filter (where match_status = 'possible_match')::integer
          as possible_matches,
        count(*) filter (where match_status = 'new_candidate')::integer
          as new_candidates
      from public.residencial_discovery_candidates
    `);
    console.log(
      JSON.stringify(
        { upserted: result.rowCount, database: summary.rows[0] },
        null,
        2,
      ),
    );
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
