import { querySupabaseDatabase } from "../lib/supabase-db.ts";

async function main() {
  try {
    const rows = await querySupabaseDatabase(
      "SELECT id, report_id, object_path, file_name, mime_type, size_bytes FROM public.intake_report_attachments WHERE id = $1 LIMIT 1",
      ["4f62577b-b64f-4b91-a380-842459609aa8"]
    );
    console.log("=== ATTACHMENT RECORD IN SUPABASE DB ===");
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}

main();
