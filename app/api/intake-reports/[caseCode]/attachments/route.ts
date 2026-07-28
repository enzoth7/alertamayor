import { NextRequest, NextResponse } from "next/server";

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
]);

function supabaseHeaders(publishableKey: string): Record<string, string> {
  return {
    apikey: publishableKey,
    ...(publishableKey.split(".").length === 3 ? { Authorization: `Bearer ${publishableKey}` } : {}),
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
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Ese tipo de archivo no está permitido." }, { status: 415 });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !publishableKey) {
    return NextResponse.json({ error: "La carga de archivos no está configurada." }, { status: 503 });
  }

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
    if (!response.ok) {
      const error = result && typeof result === "object" && "error" in result && typeof result.error === "string"
        ? result.error
        : "No se pudo guardar el archivo.";
      return NextResponse.json({ error }, { status: response.status });
    }
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Evidence Edge Function request failed.", { message: error instanceof Error ? error.message : "Unknown error" });
    return NextResponse.json({ error: "No se pudo conectar con el almacenamiento." }, { status: 502 });
  }
}
