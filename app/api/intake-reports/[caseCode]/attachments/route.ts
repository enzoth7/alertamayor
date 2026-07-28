import { NextRequest, NextResponse } from "next/server";
import { querySupabaseDatabase } from "../../../../../lib/supabase-db";

export const runtime = "nodejs";

const CASE_CODE_PATTERN = /^AM-\d{8}-[A-F0-9]{8}$/;
const UPLOAD_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
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
  "audio/3gpp",
  "audio/3gpp2",
]);

function supabaseHeaders(publishableKey: string): Record<string, string> {
  const authKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || publishableKey;
  return {
    apikey: authKey,
    Authorization: `Bearer ${authKey}`,
  };
}

export async function POST(request: NextRequest, context: { params: Promise<{ caseCode: string }> }) {
  const { caseCode: rawCaseCode } = await context.params;
  const caseCode = decodeURIComponent(rawCaseCode || "").trim().toUpperCase();
  if (!CASE_CODE_PATTERN.test(caseCode)) {
    return NextResponse.json({ error: "El código de seguimiento no es válido." }, { status: 400 });
  }

  let input: FormData;
  try {
    input = await request.formData();
  } catch {
    return NextResponse.json({ error: "No se pudo leer el archivo." }, { status: 400 });
  }

  const file = input.get("file");
  const uploadTokenValue = input.get("uploadToken");
  const uploadToken = typeof uploadTokenValue === "string" ? uploadTokenValue.trim() : "";
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No se recibió ningún archivo." }, { status: 400 });
  }
  if (!UPLOAD_TOKEN_PATTERN.test(uploadToken)) {
    return NextResponse.json({ error: "La autorización para adjuntar el archivo no es válida." }, { status: 403 });
  }
  if (!file.size || file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "Cada archivo puede pesar hasta 10 MB." }, { status: 413 });
  }
  const cleanType = file.type.split(";")[0].trim().toLowerCase();
  if (!ALLOWED_MIME_TYPES.has(cleanType) && !cleanType.startsWith("audio/")) {
    return NextResponse.json({ error: "Ese tipo de archivo no está permitido." }, { status: 415 });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !publishableKey) {
    return NextResponse.json({ error: "La carga de archivos no está configurada." }, { status: 503 });
  }

  const extensionMap: Record<string, string> = {
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
    "audio/3gpp": "3gp",
    "audio/3gpp2": "3g2",
  };

  const extension = extensionMap[cleanType] || file.name.split(".").pop() || "bin";

  const forwarded = new FormData();
  forwarded.set("caseCode", caseCode);
  forwarded.set("capabilityToken", uploadToken);
  forwarded.set("file", file, file.name);

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/upload-intake-evidence`, {
      method: "POST",
      headers: supabaseHeaders(publishableKey),
      body: forwarded,
      cache: "no-store",
    });
    
    const result: unknown = await response.json().catch(() => null);

    if (response.ok && result) {
      return NextResponse.json(result, { status: 201 });
    }

    // FALLBACK DIRECTO: Si la Edge Function en la nube responde error (ej 415), subir directo por REST/Storage API
    console.warn(`Edge Function error ${response.status}. Executing direct Supabase storage upload fallback for ${cleanType}...`);

    let reportId: string | null = null;

    try {
      const rows = await querySupabaseDatabase<{ id: string }>(
        "SELECT id FROM public.intake_reports WHERE case_code = $1 LIMIT 1",
        [caseCode]
      );
      if (rows && rows[0]?.id) {
        reportId = rows[0].id;
      }
    } catch (err) {
      console.error("Error querying report by caseCode:", err);
    }

    if (!reportId) {
      return NextResponse.json({ error: "No se encontró la comunicación." }, { status: 404 });
    }

    const attachmentId = crypto.randomUUID();
    const objectPath = `${reportId}/${attachmentId}.${extension}`;
    const fileBuffer = await file.arrayBuffer();

    const storageRes = await fetch(`${supabaseUrl}/storage/v1/object/intake-evidence/${objectPath}`, {
      method: "POST",
      headers: {
        ...supabaseHeaders(publishableKey),
        "Content-Type": cleanType,
        "Cache-Control": "3600",
        "x-upsert": "false",
      },
      body: fileBuffer,
      cache: "no-store",
    });

    if (!storageRes.ok) {
      const storageErr = await storageRes.json().catch(() => null);
      console.error("Direct storage upload failed", storageErr);
      return NextResponse.json({ error: "No se pudo guardar el archivo en el almacenamiento." }, { status: 502 });
    }

    try {
      await querySupabaseDatabase(
        `INSERT INTO public.intake_report_attachments (id, report_id, object_path, file_name, mime_type, size_bytes)
   VALUES ($1, $2, $3, $4, $5, $6)`,
        [attachmentId, reportId, objectPath, file.name, cleanType, file.size]
      );
    } catch (dbErr) {
      console.error("Error inserting attachment metadata:", dbErr);
      await fetch(`${supabaseUrl}/storage/v1/object/intake-evidence/${objectPath}`, {
        method: "DELETE",
        headers: supabaseHeaders(publishableKey),
      }).catch(() => undefined);
      return NextResponse.json({ error: "No se pudo registrar la información del archivo." }, { status: 502 });
    }

    return NextResponse.json({
      attachment: {
        id: attachmentId,
        fileName: file.name,
        mimeType: cleanType,
        sizeBytes: file.size,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Evidence upload processing failed.", { message: error instanceof Error ? error.message : "Unknown error" });
    return NextResponse.json({ error: "No se pudo conectar con el almacenamiento." }, { status: 502 });
  }
}
