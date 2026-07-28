import { querySupabaseDatabase } from "../lib/supabase-db.ts";

async function main() {
  try {
    const policies = await querySupabaseDatabase(
      "SELECT policyname, tablename, cmd, roles FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'"
    );
    console.log("=== STORAGE RLS POLICIES IN SUPABASE ===");
    console.log(JSON.stringify(policies, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}

main();
