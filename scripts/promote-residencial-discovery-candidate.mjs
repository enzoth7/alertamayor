import pg from "pg";

const { Pool } = pg;

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--")) continue;
    const equals = argument.indexOf("=");
    if (equals >= 0) {
      args[argument.slice(2, equals)] = argument.slice(equals + 1);
    } else if (argv[index + 1] && !argv[index + 1].startsWith("--")) {
      args[argument.slice(2)] = argv[index + 1];
      index += 1;
    } else {
      args[argument.slice(2)] = true;
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
    max: 1,
    connectionTimeoutMillis: 20_000,
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.id || !/^RDC-[a-f0-9]{16}$/.test(args.id)) {
    throw new Error("Falta --id=RDC-... válido.");
  }

  const pool = databasePool();
  const client = await pool.connect();
  try {
    const candidateResult = await client.query(
      `
        select
          id,
          sources,
          name,
          department,
          locality,
          address,
          lat,
          lng,
          storage_policy,
          review_status,
          reviewed_at,
          reviewed_by,
          promoted_residencial_id
        from public.residencial_discovery_candidates
        where id = $1
      `,
      [args.id],
    );
    if (candidateResult.rowCount !== 1) {
      throw new Error("No se encontró el candidato.");
    }
    const candidate = candidateResult.rows[0];
    if (candidate.review_status !== "approved_new") {
      throw new Error(
        "El candidato debe tener review_status=approved_new antes de publicarse.",
      );
    }
    if (candidate.promoted_residencial_id) {
      throw new Error(
        `El candidato ya fue publicado como ${candidate.promoted_residencial_id}.`,
      );
    }
    if (candidate.storage_policy === "google_place_id_only") {
      throw new Error(
        "Un place_id por sí solo no se puede publicar: agregá primero una fuente independiente verificable.",
      );
    }
    const required = ["name", "department", "address", "lat", "lng"];
    const missing = required.filter(
      (field) => candidate[field] == null || candidate[field] === "",
    );
    if (missing.length > 0) {
      throw new Error(`Faltan datos para publicar: ${missing.join(", ")}.`);
    }

    const residencialId = `DISC-${candidate.id.slice(4).toUpperCase()}`;
    const preview = {
      candidateId: candidate.id,
      residencialId,
      name: candidate.name,
      department: candidate.department,
      locality: candidate.locality || candidate.department,
      address: candidate.address,
      statusGroup: "verificar",
      color: "violeta",
      reviewedBy: candidate.reviewed_by,
      apply: Boolean(args.apply),
    };
    console.log(JSON.stringify(preview, null, 2));
    if (!args.apply) {
      console.log("Vista previa completa. No se modificó Supabase.");
      return;
    }

    await client.query("begin");
    try {
      await client.query(
        `
          insert into public.residenciales (
            id,
            name,
            department,
            locality,
            address,
            places,
            lat,
            lng,
            precision,
            precision_label,
            status_group,
            status_stage,
            status_short,
            source_label,
            msp_final,
            msp_registro_historico,
            mides_social,
            pacp,
            other_source
          )
          values (
            $1, $2, $3, $4, $5, null, $6, $7,
            'puerta',
            'Coordenadas de fuente de descubrimiento; requieren verificación territorial',
            'verificar',
            'Pendiente de verificación',
            'Candidato nuevo · no acredita habilitación ni actividad actual',
            $8,
            false, false, false, false, true
          )
        `,
        [
          residencialId,
          candidate.name,
          candidate.department,
          candidate.locality || candidate.department,
          candidate.address,
          Number(candidate.lat),
          Number(candidate.lng),
          `${candidate.sources.join(" + ")} · revisado ${new Date(candidate.reviewed_at).toISOString().slice(0, 10)}`,
        ],
      );
      await client.query(
        `
          update public.residencial_discovery_candidates
          set promoted_residencial_id = $2, updated_at = now()
          where id = $1
        `,
        [candidate.id, residencialId],
      );
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
    console.log(
      JSON.stringify(
        { promoted: candidate.id, residencialId, statusGroup: "verificar" },
        null,
        2,
      ),
    );
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
