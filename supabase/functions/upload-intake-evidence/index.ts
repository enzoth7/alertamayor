import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const CASE_CODE_PATTERN = /^AM-\d{8}-[A-F0-9]{8}$/;
const CAPABILITY_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_FILES_PER_REPORT = 5;
const BUCKET = "intake-evidence";
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/wav",
  "audio/mpeg",
  "audio/mp3",
  "audio/aac",
  "audio/m4a",
  "audio/x-m4a",
]);

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "application/pdf": "pdf",
  "text/plain": "txt",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "mp4",
  "audio/wav": "wav",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/aac": "aac",
  "audio/m4a": "m4a",
  "audio/x-m4a": "m4a",
};

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function cleanFileName(value: string): string {
  const normalized = value.normalize("NFKC").replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return (normalized || "archivo").slice(0, 240);
}

export default {
  fetch: withSupabase({ auth: "none" }, async (request, ctx) => {
    if (request.method !== "POST") return json({ error: "Método no permitido." }, 405);

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return json({ error: "No se pudo leer el archivo." }, 400);
    }

    const caseCodeValue = formData.get("caseCode");
    const capabilityTokenValue = formData.get("capabilityToken");
    const fileValue = formData.get("file");
    const caseCode = typeof caseCodeValue === "string" ? caseCodeValue.trim().toUpperCase() : "";
    const capabilityToken = typeof capabilityTokenValue === "string" ? capabilityTokenValue.trim() : "";
    if (!CASE_CODE_PATTERN.test(caseCode) || !CAPABILITY_TOKEN_PATTERN.test(capabilityToken) || !(fileValue instanceof File)) {
      return json({ error: "Código o archivo inválido." }, 400);
    }
    if (!fileValue.size || fileValue.size > MAX_FILE_BYTES) {
      return json({ error: "El archivo debe pesar entre 1 byte y 10 MB." }, 413);
    }

    const cleanType = fileValue.type.split(";")[0].trim().toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(cleanType)) {
      return json({ error: "Ese tipo de archivo no está permitido." }, 415);
    }

    const { data: report, error: reportError } = await ctx.supabaseAdmin
      .from("intake_reports")
      .select("id, report_payload")
      .eq("case_code", caseCode)
      .maybeSingle();
    const storedCapabilityToken = report?.report_payload && typeof report.report_payload === "object"
      && typeof (report.report_payload as Record<string, unknown>).evidenceUploadToken === "string"
      ? (report.report_payload as Record<string, unknown>).evidenceUploadToken as string
      : "";
    if (reportError || !report || storedCapabilityToken !== capabilityToken) {
      return json({ error: "No se encontró la comunicación o la autorización venció." }, 404);
    }

    const { count, error: countError } = await ctx.supabaseAdmin
      .from("intake_report_attachments")
      .select("id", { count: "exact", head: true })
      .eq("report_id", report.id);
    if (countError) return json({ error: "No se pudo comprobar el límite de archivos." }, 502);
    if ((count || 0) >= MAX_FILES_PER_REPORT) {
      return json({ error: "La comunicación ya alcanzó el máximo de 5 archivos." }, 409);
    }

    const cleanName = cleanFileName(fileValue.name);
    const extension = EXTENSIONS[cleanType] || cleanName.split(".").pop() || "bin";
    const attachmentId = crypto.randomUUID();
    const objectPath = `${report.id}/${attachmentId}.${extension}`;
    const { error: uploadError } = await ctx.supabaseAdmin.storage
      .from(BUCKET)
      .upload(objectPath, fileValue, {
        contentType: cleanType,
        cacheControl: "3600",
        upsert: false,
      });
    if (uploadError) {
      console.error("Evidence upload failed.", { message: uploadError.message });
      return json({ error: "No se pudo guardar el archivo." }, 502);
    }

    const { error: metadataError } = await ctx.supabaseAdmin.from("intake_report_attachments").insert({
      id: attachmentId,
      report_id: report.id,
      bucket_id: BUCKET,
      object_path: objectPath,
      file_name: cleanName,
      mime_type: fileValue.type,
      size_bytes: fileValue.size,
    });
    if (metadataError) {
      await ctx.supabaseAdmin.storage.from(BUCKET).remove([objectPath]);
      console.error("Evidence metadata insert failed.", { code: metadataError.code });
      return json({ error: "No se pudo registrar el archivo." }, 502);
    }

    return json({
      attachment: {
        id: attachmentId,
        fileName: cleanName,
        mimeType: fileValue.type,
        sizeBytes: fileValue.size,
      },
    }, 201);
  }),
};
