import { Pool } from "pg";

let pool: Pool | undefined;

function getDatabasePool(): Pool {
  if (pool) return pool;

  const projectRef = process.env.SUPABASE_PROJECT_REF;
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!projectRef || !password) throw new Error("Supabase database connection is not configured.");

  pool = new Pool({
    host: process.env.SUPABASE_DB_HOST || `db.${projectRef}.supabase.co`,
    port: Number(process.env.SUPABASE_DB_PORT || 5432),
    database: process.env.SUPABASE_DB_NAME || "postgres",
    user: process.env.SUPABASE_DB_USER || "postgres",
    password,
    // Supabase's managed pooler requires TLS; its connection string uses sslmode=require.
    ssl: { rejectUnauthorized: process.env.SUPABASE_DB_SSL_REJECT_UNAUTHORIZED === "true" },
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });

  return pool;
}

export async function querySupabaseDatabase<T extends Record<string, unknown>>(text: string, values: unknown[] = []): Promise<T[]> {
  const result = await getDatabasePool().query<T>(text, values);
  return result.rows;
}
