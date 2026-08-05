import { NextResponse } from "next/server";
import { isRecord, intakeText, MAX_INTAKE_REQUEST_BYTES } from "../../../../../lib/intake-report.mjs";
import { verifyN8nIntakeRequest } from "../../../../../lib/n8n-intake-auth.mjs";
import { querySupabaseDatabase, withSupabaseTransaction } from "../../../../../lib/supabase-db";

export const runtime = "nodejs";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function storageHeaders(): Record<string, string> | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return { apikey: key, Authorization: `Bearer ${key}` };
}

async function purgeSandboxReports() {
  const headers = storageHeaders();
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!headers || !supabaseUrl) throw new Error("sandbox-purge-not-configured");
  const reports = await querySupabaseDatabase<{ report_id: string }>(
    `SELECT report_id FROM public.intake_channel_links
     WHERE is_sandbox AND sandbox_purge_due_at <= now()
     ORDER BY sandbox_purge_due_at ASC LIMIT 25`,
  );
  let purged = 0;
  for (const report of reports) {
    const attachments = await querySupabaseDatabase<{ object_path: string }>(
      "SELECT object_path FROM public.intake_report_attachments WHERE report_id = $1",
      [report.report_id],
    );
    let storageFailed = false;
    for (const attachment of attachments) {
      const encodedPath = attachment.object_path.split("/").map(encodeURIComponent).join("/");
      const response = await fetch(`${supabaseUrl}/storage/v1/object/intake-evidence/${encodedPath}`, {
        method: "DELETE",
        headers,
        cache: "no-store",
      });
      if (!response.ok && response.status !== 404) storageFailed = true;
    }
    if (storageFailed) continue;
    await querySupabaseDatabase("DELETE FROM public.intake_reports WHERE id = $1", [report.report_id]);
    purged += 1;
  }
  return purged;
}

async function purgeExpiredSandboxMemory() {
  const rows = await querySupabaseDatabase<{ deleted: number }>(
    `WITH removed AS (
       DELETE FROM public.alerta_mayor_whatsapp_sandbox_memory
       WHERE created_at < now() - interval '24 hours'
       RETURNING 1
     )
     SELECT count(*)::int AS deleted FROM removed`,
  );
  return rows[0]?.deleted ?? 0;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_INTAKE_REQUEST_BYTES) return json({ error: "Solicitud demasiado extensa." }, 413);
  const auth = verifyN8nIntakeRequest({ headers: request.headers, rawBody, secret: process.env.N8N_INTAKE_HMAC_SECRET || "" });
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  let body: unknown;
  try { body = JSON.parse(rawBody); } catch { return json({ error: "JSON inválido." }, 400); }
  if (!isRecord(body)) return json({ error: "Solicitud inválida." }, 400);

  try {
    if (body.action === "list_due") {
      const rows = await querySupabaseDatabase<{
        link_id: string;
        account_id: string;
        conversation_id: string;
        message_ids: unknown;
      }>(
        `SELECT id AS link_id, external_account_id AS account_id,
                external_conversation_id AS conversation_id, external_message_ids AS message_ids
         FROM public.intake_channel_links
         WHERE retention_status IN ('pending', 'error') AND retention_due_at <= now()
         ORDER BY retention_due_at ASC LIMIT 50`,
      );
      return json({ items: rows });
    }

    if (body.action === "mark_deleted" || body.action === "mark_error") {
      const linkId = intakeText(body.linkId, 100);
      if (!/^[0-9a-f-]{36}$/i.test(linkId)) return json({ error: "Identificador inválido." }, 400);
      const status = body.action === "mark_deleted" ? "deleted" : "error";
      const errorCode = status === "error" ? intakeText(body.errorCode, 120) || "chatwoot-delete-failed" : null;
      await withSupabaseTransaction(async (client) => {
        await client.query(
          `UPDATE public.intake_channel_links
           SET retention_status = $2, retention_attempted_at = now(), retention_error_code = $3
           WHERE id = $1`,
          [linkId, status, errorCode],
        );
      });
      return json({ updated: true });
    }

    if (body.action === "purge_sandbox") {
      const purged = await purgeSandboxReports();
      const memoryRowsPurged = await purgeExpiredSandboxMemory();
      return json({ purged, memoryRowsPurged });
    }

    return json({ error: "Acción no soportada." }, 400);
  } catch (error) {
    console.error("n8n retention integration failed.", { message: error instanceof Error ? error.message : "unknown" });
    return json({ error: "No se pudo ejecutar la retención." }, 502);
  }
}
