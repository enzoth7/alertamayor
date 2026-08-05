import { NextResponse } from "next/server";
import {
  buildReportPayload,
  isRecord,
  MAX_INTAKE_REQUEST_BYTES,
  newCaseCode,
  newUploadToken,
} from "../../../lib/intake-report.mjs";

export const runtime = "nodejs";


function supabaseHeaders(publishableKey: string): Record<string, string> {
  return {
    apikey: publishableKey,
    ...(publishableKey.split(".").length === 3 ? { Authorization: `Bearer ${publishableKey}` } : {}),
  };
}

async function requestTrackingEmail(supabaseUrl: string, publishableKey: string, caseCode: string, contactEmail: string, capabilityToken: string) {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/notify-intake-code`, {
      method: "POST",
      headers: {
        ...supabaseHeaders(publishableKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ caseCode, email: contactEmail, capabilityToken }),
      cache: "no-store",
    });
    const result: unknown = await response.json().catch(() => null);
    return {
      sent: response.ok && Boolean(result && typeof result === "object" && "sent" in result && result.sent === true),
      configured: Boolean(result && typeof result === "object" && "configured" in result && result.configured === true),
    };
  } catch (error) {
    console.error("Tracking email function request failed.", { message: error instanceof Error ? error.message : "Unknown error" });
    return { sent: false, configured: false };
  }
}

export async function POST(request: Request) {
  try {
    const declaredLength = Number(request.headers.get("content-length") || 0);
    if (declaredLength > MAX_INTAKE_REQUEST_BYTES) {
      return NextResponse.json({ error: "La comunicación es demasiado extensa." }, { status: 413 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "No se pudo leer la comunicación." }, { status: 400 });
    }

    const payload = buildReportPayload(isRecord(body) ? body.report : null);
    if (!payload) {
      return NextResponse.json({ error: "Faltan datos requeridos para guardar la comunicación." }, { status: 400 });
    }

    if (JSON.stringify(payload).length > MAX_INTAKE_REQUEST_BYTES) {
      return NextResponse.json({ error: "La comunicación es demasiado extensa." }, { status: 413 });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !publishableKey) {
      console.error("Supabase is not configured for intake reports.");
      return NextResponse.json({ error: "El guardado no está configurado todavía." }, { status: 503 });
    }

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const caseCode = newCaseCode();
      const uploadToken = newUploadToken();
      let response: Response;
      try {
        response = await fetch(`${supabaseUrl}/rest/v1/intake_reports`, {
          method: "POST",
          headers: {
            ...supabaseHeaders(publishableKey),
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            case_code: caseCode,
            source: "web",
            priority: payload.preliminaryPriority,
            department: payload.location && isRecord(payload.location) ? payload.location.department : null,
            report_payload: { ...payload, evidenceUploadToken: uploadToken },
          }),
          cache: "no-store",
        });
      } catch (error) {
        console.error("Supabase intake report request failed.", { message: error instanceof Error ? error.message : "Unknown error" });
        return NextResponse.json({ error: "No se pudo conectar con la base de datos. Intentá nuevamente." }, { status: 502 });
      }

      if (response.ok) {
        const contactEmail = typeof payload.contactEmail === "string" ? payload.contactEmail : "";
        const emailNotification = contactEmail
          ? await requestTrackingEmail(supabaseUrl, publishableKey, caseCode, contactEmail, uploadToken)
          : null;
        return NextResponse.json({ caseCode, uploadToken, emailNotification }, { status: 201 });
      }

      if (response.status !== 409 || attempt === 2) {
        console.error("Supabase intake report insert failed.", { status: response.status });
        return NextResponse.json({ error: "No se pudo guardar la comunicación. Intentá nuevamente." }, { status: 502 });
      }
    }

    return NextResponse.json({ error: "No se pudo generar un código de expediente." }, { status: 503 });
  } catch (error) {
    console.error("Unhandled error in intake-reports API handler:", error);
    return NextResponse.json({ error: "Ocurrió un error inesperado al procesar la comunicación." }, { status: 500 });
  }
}
