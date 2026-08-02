import pg from "pg";

const { Pool } = pg;
const ALLOWED_DECISIONS = new Set(["matched", "approved_new", "rejected"]);

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
  if (!ALLOWED_DECISIONS.has(args.decision)) {
    throw new Error(
      "--decision debe ser matched, approved_new o rejected.",
    );
  }
  if (args.decision === "matched" && !args["residencial-id"]) {
    throw new Error("La decisión matched requiere --residencial-id=...");
  }
  if (!args.reviewer || !args.notes) {
    throw new Error("La revisión requiere --reviewer y --notes.");
  }

  const preview = {
    id: args.id,
    decision: args.decision,
    residencialId: args["residencial-id"] || null,
    reviewer: args.reviewer,
    notes: args.notes,
    apply: Boolean(args.apply),
  };
  console.log(JSON.stringify(preview, null, 2));
  if (!args.apply) {
    console.log("Vista previa completa. No se modificó Supabase.");
    return;
  }

  const pool = databasePool();
  try {
    const result = await pool.query(
      `
        update public.residencial_discovery_candidates as candidate
        set
          review_status = $2,
          suggested_residencial_id = case
            when $2 = 'matched' then residencial.id
            else candidate.suggested_residencial_id
          end,
          reviewed_at = now(),
          reviewed_by = $4,
          review_notes = $5,
          updated_at = now()
        from (
          select id
          from public.residenciales
          where id = $3
          union all
          select null::text
          where $2 <> 'matched'
          limit 1
        ) as residencial
        where candidate.id = $1
        returning
          candidate.id,
          candidate.review_status,
          candidate.suggested_residencial_id,
          candidate.reviewed_at
      `,
      [
        args.id,
        args.decision,
        args["residencial-id"] || null,
        args.reviewer,
        args.notes,
      ],
    );
    if (result.rowCount !== 1) {
      throw new Error(
        "No se encontró el candidato o el residencial indicado no existe.",
      );
    }
    console.log(JSON.stringify(result.rows[0], null, 2));
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
