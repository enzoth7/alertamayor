import pg from "pg";

const { Pool } = pg;

export function createSupabasePool(applicationName) {
  const projectRef = process.env.SUPABASE_PROJECT_REF;
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!projectRef || !password) {
    throw new Error("Faltan SUPABASE_PROJECT_REF o SUPABASE_DB_PASSWORD.");
  }
  return new Pool({
    host: process.env.SUPABASE_DB_HOST || `db.${projectRef}.supabase.co`,
    port: Number(process.env.SUPABASE_DB_PORT || 5432),
    database: process.env.SUPABASE_DB_NAME || "postgres",
    user: process.env.SUPABASE_DB_USER || "postgres",
    password,
    ssl: {
      rejectUnauthorized:
        process.env.SUPABASE_DB_SSL_REJECT_UNAUTHORIZED === "true",
    },
    application_name: applicationName,
    max: 1,
    connectionTimeoutMillis: 20_000,
    idleTimeoutMillis: 10_000,
  });
}
