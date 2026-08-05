import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const CASE_CODE_PATTERN = /^AM-\d{8}-[A-F0-9]{8}$/;
const CAPABILITY_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_FILES_PER_REPORT = 5;
const BUCKET = "intake-evidence";
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif",
  "application/pdf", "text/plain", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "audio/webm", "audio/ogg", "audio/mp4", "audio/wav", "audio/mpeg",
  "audio/mp3", "audio/aac", "audio/m4a", "audio/x-m4a", "audio/3gpp", "audio/3gpp2",
]);
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif",
  "application/pdf": "pdf", "text/plain": "txt", "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "mp4", "audio/wav": "wav",
  "audio/mpeg": "mp3", "audio/mp3": "mp3", "audio/aac": "aac", "audio/m4a": "m4a", "audio/x-m4a": "m4a",
  "audio/3gpp": "3gp", "audio/3gpp2": "3g2",
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function cleanFileName(value: string): string {
  const normalized = value.normalize("NFKC").replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return (normalized || "archivo").slice(0, 240);
}

function startsWithBytes(buffer: Uint8Array, bytes: number[]): boolean {
  return bytes.every((byte, index) => buffer[index] === byte);
}

function signatureMatches(buffer: Uint8Array, type: string): boolean {
  const ascii = (start: number, end: number) => new TextDecoder("ascii").decode(buffer.slice(start, end));
  if (type === "image/jpeg") return startsWithBytes(buffer, [0xff, 0xd8, 0xff]);
  if (type === "image/png") return startsWithBytes(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (type === "image/webp") return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
  if (["image/heic", "image/heif", "audio/mp4", "audio/m4a", "audio/x-m4a", "audio/3gpp", "audio/3gpp2"].includes(type)) return buffer.length >= 12 && ascii(4, 8) === "ftyp";
  if (type === "application/pdf") return ascii(0, 5) === "%PDF-";
  if (type === "application/msword") return startsWithBytes(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  if (type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return startsWithBytes(buffer, [0x50, 0x4b, 0x03, 0x04]);
  if (type === "audio/webm") return startsWithBytes(buffer, [0x1a, 0x45, 0xdf, 0xa3]);
  if (type === "audio/ogg") return ascii(0, 4) === "OggS";
  if (type === "audio/wav") return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WAVE";
  if (["audio/mpeg", "audio/mp3"].includes(type)) return ascii(0, 3) === "ID3" || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0);
  if (type === "audio/aac") return buffer[0] === 0xff && (buffer[1] & 0xf6) === 0xf0;
  if (type === "text/plain") return !buffer.slice(0, 4096).includes(0);
  return false;
}

async function sha256Hex(buffer: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function sameToken(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

export default {
  fetch: withSupabase({ auth: "none" }, async (request, ctx) => {
    if (request.method !== "POST") return json({ error: "Método no permitido." }, 405);
    let formData: FormData;
    try { formData = await request.formData(); } catch { return json({ error: "No se pudo leer el archivo." }, 400); }

    const caseCodeValue = formData.get("caseCode");
    const capabilityTokenValue = formData.get("capabilityToken");
    const expectedHashValue = formData.get("sha256");
    const sourceChannelValue = formData.get("sourceChannel");
    const sourceMessageIdValue = formData.get("sourceMessageId");
    const fileValue = formData.get("file");
    const caseCode = typeof caseCodeValue === "string" ? caseCodeValue.trim().toUpperCase() : "";
    const capabilityToken = typeof capabilityTokenValue === "string" ? capabilityTokenValue.trim() : "";
    const expectedHash = typeof expectedHashValue === "string" ? expectedHashValue.trim().toLowerCase() : "";
    const sourceChannel = sourceChannelValue === "whatsapp_sandbox" ? "whatsapp_sandbox" : "web";
    const sourceMessageId = typeof sourceMessageIdValue === "string" ? sourceMessageIdValue.trim().slice(0, 100) : null;
    if (!CASE_CODE_PATTERN.test(caseCode) || !CAPABILITY_TOKEN_PATTERN.test(capabilityToken) || !(fileValue instanceof File)) {
      return json({ error: "Código o archivo inválido." }, 400);
    }
    if (!fileValue.size || fileValue.size > MAX_FILE_BYTES) return json({ error: "El archivo debe pesar entre 1 byte y 10 MB." }, 413);

    const cleanType = fileValue.type.split(";")[0].trim().toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(cleanType)) return json({ error: "Ese tipo de archivo no está permitido." }, 415);
    const fileBytes = new Uint8Array(await fileValue.arrayBuffer());
    if (!signatureMatches(fileBytes, cleanType)) return json({ error: "El contenido no coincide con el tipo declarado." }, 415);
    const calculatedHash = await sha256Hex(fileBytes);
    if (expectedHash && expectedHash !== calculatedHash) return json({ error: "La integridad del archivo no coincide." }, 409);

    const { data: report, error: reportError } = await ctx.supabaseAdmin
      .from("intake_reports").select("id, report_payload").eq("case_code", caseCode).maybeSingle();
    const storedToken = report?.report_payload && typeof report.report_payload === "object"
      && typeof (report.report_payload as Record<string, unknown>).evidenceUploadToken === "string"
      ? (report.report_payload as Record<string, unknown>).evidenceUploadToken as string : "";
    if (reportError || !report || !sameToken(storedToken, capabilityToken)) return json({ error: "No se encontró la comunicación o la autorización venció." }, 404);

    const { count, error: countError } = await ctx.supabaseAdmin
      .from("intake_report_attachments").select("id", { count: "exact", head: true }).eq("report_id", report.id);
    if (countError) return json({ error: "No se pudo comprobar el límite de archivos." }, 502);
    if ((count || 0) >= MAX_FILES_PER_REPORT) return json({ error: "La comunicación ya alcanzó el máximo de 5 archivos." }, 409);

    const cleanName = cleanFileName(fileValue.name);
    const extension = EXTENSIONS[cleanType] || cleanName.split(".").pop() || "bin";
    const attachmentId = crypto.randomUUID();
    const objectPath = `${report.id}/${attachmentId}.${extension}`;
    const { error: uploadError } = await ctx.supabaseAdmin.storage.from(BUCKET).upload(objectPath, fileBytes, {
      contentType: cleanType, cacheControl: "0", upsert: false,
    });
    if (uploadError) return json({ error: "No se pudo guardar el archivo." }, 502);

    const { error: metadataError } = await ctx.supabaseAdmin.from("intake_report_attachments").insert({
      id: attachmentId, report_id: report.id, bucket_id: BUCKET, object_path: objectPath,
      file_name: cleanName, mime_type: cleanType, size_bytes: fileValue.size,
      sha256_hex: calculatedHash, source_channel: sourceChannel, source_message_id: sourceMessageId,
      validation_status: "signature_validated",
    });
    if (metadataError) {
      await ctx.supabaseAdmin.storage.from(BUCKET).remove([objectPath]);
      return json({ error: "No se pudo registrar el archivo." }, 502);
    }
    return json({ attachment: { id: attachmentId, fileName: cleanName, mimeType: cleanType, sizeBytes: fileValue.size, sha256: calculatedHash } }, 201);
  }),
};
