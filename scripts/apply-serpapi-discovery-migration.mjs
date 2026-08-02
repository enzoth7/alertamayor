import { readFile } from "node:fs/promises";
import pg from "pg";

const { Pool } = pg;
const MIGRATION_URL = new URL(
  "../supabase/migrations/20260801120000_add_serpapi_discovery_source.sql",
  import.meta.url,
);

if (!process.argv.includes("--apply")) {
  console.log(
    "Vista previa: permitirá 'serpapi' en la cola privada de descubrimiento; no cambia RLS ni grants.",
  );
  console.log("Volvé a ejecutar con --apply para aplicar la migración.");
  process.exit(0);
}

if (!process.env.SUPABASE_PROJECT_REF || !process.env.SUPABASE_DB_PASSWORD) {
  throw new Error("Faltan las variables de conexión de Supabase.");
}

const pool = new Pool({
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

const client = await pool.connect();
try {
  const current = await client.query(`
    select pg_get_constraintdef(oid) as definition
    from pg_constraint
    where conrelid = 'public.residencial_discovery_candidates'::regclass
      and conname = 'residencial_discovery_candidates_sources_check'
  `);
  if (current.rows[0]?.definition.includes("serpapi")) {
    console.log("La restricción ya permite SerpApi; no se aplicó nada.");
  } else {
    const sql = await readFile(MIGRATION_URL, "utf8");
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  }

  const verification = await client.query(`
    select
      pg_get_constraintdef(pc.oid) as sources_constraint,
      c.relrowsecurity as rls_enabled,
      has_table_privilege('anon', c.oid, 'select') as anon_can_select,
      has_table_privilege('authenticated', c.oid, 'select')
        as authenticated_can_select
    from pg_class as c
    join pg_namespace as n on n.oid = c.relnamespace
    join pg_constraint as pc
      on pc.conrelid = c.oid
      and pc.conname = 'residencial_discovery_candidates_sources_check'
    where n.nspname = 'public'
      and c.relname = 'residencial_discovery_candidates'
  `);
  const row = verification.rows[0];
  if (
    verification.rowCount !== 1 ||
    !row.sources_constraint.includes("serpapi") ||
    !row.rls_enabled ||
    row.anon_can_select ||
    row.authenticated_can_select
  ) {
    throw new Error("La verificación de restricción/RLS/grants falló.");
  }
  console.log(JSON.stringify(row, null, 2));
} finally {
  client.release();
  await pool.end();
}
