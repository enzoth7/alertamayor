import { querySupabaseDatabase } from "../lib/supabase-db.ts";

async function main() {
  try {
    const reports = await querySupabaseDatabase(
      "SELECT id, case_code, priority, created_at FROM public.intake_reports ORDER BY created_at DESC LIMIT 5"
    );
    console.log("=== RECENT REPORTS IN SUPABASE DB ===");
    console.log(JSON.stringify(reports, null, 2));

    const attachments = await querySupabaseDatabase(
      "SELECT id, report_id, object_path, file_name, mime_type, size_bytes, created_at FROM public.intake_report_attachments ORDER BY created_at DESC LIMIT 10"
    );
    console.log("\n=== RECENT ATTACHMENTS IN SUPABASE DB ===");
    console.log(JSON.stringify(attachments, null, 2));
  } catch (err) {
    console.error("Query failed:", err);
  }
}

main();
