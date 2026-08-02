import { readFile } from "node:fs/promises";
import pg from "pg";

const { Pool } = pg;
const MIGRATION_URL = new URL(
  "../supabase/migrations/20260731234544_add_residencial_discovery_candidates.sql",
  import.meta.url,
);

if (!process.argv.includes("--apply")) {
  console.log(
    "Vista previa: creará public.residencial_discovery_candidates con RLS y sin grants de Data API.",
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
  const before = await client.query(
    `select to_regclass('public.residencial_discovery_candidates') as table_name`,
  );
  if (before.rows[0].table_name) {
    console.log("La tabla de candidatos ya existe; no se aplicó nada.");
    process.exitCode = 0;
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
      c.relname as table_name,
      c.relrowsecurity as rls_enabled,
      has_table_privilege('anon', c.oid, 'select') as anon_can_select,
      has_table_privilege('authenticated', c.oid, 'select')
        as authenticated_can_select
    from pg_class as c
    join pg_namespace as n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'residencial_discovery_candidates'
  `);
  if (
    verification.rowCount !== 1 ||
    !verification.rows[0].rls_enabled ||
    verification.rows[0].anon_can_select ||
    verification.rows[0].authenticated_can_select
  ) {
    throw new Error("La verificación de RLS/grants no produjo el estado esperado.");
  }
  console.log(JSON.stringify(verification.rows[0], null, 2));
} finally {
  client.release();
  await pool.end();
}
