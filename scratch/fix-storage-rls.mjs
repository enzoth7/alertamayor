import { querySupabaseDatabase } from "../lib/supabase-db.ts";

async function main() {
  try {
    console.log("Aplicando politicas RLS en storage.objects para el bucket intake-evidence...");

    await querySupabaseDatabase(`
      DROP POLICY IF EXISTS "Public Upload Intake Evidence" ON storage.objects;
      CREATE POLICY "Public Upload Intake Evidence" ON storage.objects
      FOR INSERT TO public
      WITH CHECK (bucket_id = 'intake-evidence');
    `);

    await querySupabaseDatabase(`
      DROP POLICY IF EXISTS "Public Select Intake Evidence" ON storage.objects;
      CREATE POLICY "Public Select Intake Evidence" ON storage.objects
      FOR SELECT TO public
      USING (bucket_id = 'intake-evidence');
    `);

    console.log("SUCCESS: Politicas RLS creadas correctamente en Supabase Storage!");
  } catch (err) {
    console.error("Error aplicando politicas SQL en Supabase:", err);
  }
}

main();
