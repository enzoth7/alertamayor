import { readFile } from "node:fs/promises";
import pg from "pg";

const { Pool } = pg;
const TARGET_PROJECT_REF = "itolluaivfoxnaohbsdk";
const MIGRATION_URLS = [
  new URL(
    "../supabase/migrations/20260731183000_add_residencial_source_memberships.sql",
    import.meta.url,
  ),
  new URL(
    "../supabase/migrations/20260731190000_add_residencial_other_source.sql",
    import.meta.url,
  ),
];
const EXPECTED_COLUMNS = [
  "msp_final",
  "msp_registro_historico",
  "mides_social",
  "pacp",
  "other_source",
];

if (process.env.SUPABASE_PROJECT_REF !== TARGET_PROJECT_REF) {
  throw new Error(
    `La conexión configurada no corresponde al proyecto ${TARGET_PROJECT_REF}.`,
  );
}
if (!process.env.SUPABASE_DB_PASSWORD) {
  throw new Error("Falta SUPABASE_DB_PASSWORD.");
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
  connectionTimeoutMillis: 15_000,
});

const migrations = await Promise.all(
  MIGRATION_URLS.map(async (url) => ({
    name: url.pathname.split("/").at(-1),
    sql: await readFile(url, "utf8"),
  })),
);
const client = await pool.connect();

try {
  await client.query("begin");
  for (const migration of migrations) {
    await client.query(migration.sql);
  }
  const result = await client.query(
    `
      select column_name, data_type, is_nullable, column_default
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'residenciales'
        and column_name = any($1::text[])
      order by column_name
    `,
    [EXPECTED_COLUMNS],
  );
  const foundColumns = result.rows.map((row) => row.column_name);
  if (
    foundColumns.length !== EXPECTED_COLUMNS.length ||
    EXPECTED_COLUMNS.some((column) => !foundColumns.includes(column)) ||
    result.rows.some(
      (row) =>
        row.data_type !== "boolean" ||
        row.is_nullable !== "NO" ||
        !String(row.column_default).includes("false"),
    )
  ) {
    throw new Error(
      `Las columnas no tienen el esquema esperado: ${JSON.stringify(result.rows)}.`,
    );
  }
  await client.query("commit");
  console.log(
    JSON.stringify(
      {
        project: TARGET_PROJECT_REF,
        migrations: migrations.map((migration) => migration.name),
        columns: foundColumns,
        applied: true,
      },
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
