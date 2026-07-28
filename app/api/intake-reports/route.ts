import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 32_768;

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, maxLength = 240): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function textList(value: unknown, maxItems = 24, maxLength = 240): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => text(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function optionalText(value: unknown, maxLength = 240): string | null {
  const normalized = text(value, maxLength);
  return normalized || null;
}

function buildReportPayload(value: unknown): JsonRecord | null {
  if (!isRecord(value)) return null;

  const setting = text(value.setting);
  const reporter = text(value.reporter);
  const location = isRecord(value.location) ? value.location : {};
  const facility = isRecord(value.facility) ? value.facility : {};
  const preliminaryPriority = text(value.preliminaryPriority, 32);
  const department = text(location.department, 100);
  const locationReference = text(location.reference, 500);
  const selectedConcerns = textList(value.concerns);
  const narrative = text(value.narrative, 6_000);
  const risks = textList(value.risks);
  const privacy = text(value.privacy, 80);

  if (!setting || !reporter || !department || !locationReference || !selectedConcerns.length || !narrative || !risks.length || !privacy) return null;

  return {
    version: 1,
    submittedAt: new Date().toISOString(),
    source: "web",
    setting,
    reporter,
    channel: optionalText(value.channel),
    ageRange: optionalText(value.ageRange),
    dependency: optionalText(value.dependency),
    livingWith: optionalText(value.livingWith),
    needs: textList(value.needs),
    otherNeed: optionalText(value.otherNeed, 500),
    requestAssessment: value.requestAssessment === true,
    location: {
      department,
      reference: locationReference,
      privateAddress: optionalText(location.privateAddress, 500),
      unknownArea: optionalText(location.unknownArea, 300),
      unknownAddress: optionalText(location.unknownAddress, 500),
      unknownNote: optionalText(location.unknownNote, 1_000),
    },
    facility: {
      id: optionalText(facility.id, 100),
      name: optionalText(facility.name, 300),
      address: optionalText(facility.address, 500),
      locality: optionalText(facility.locality, 200),
      department: optionalText(facility.department, 100),
      searchStatus: optionalText(facility.searchStatus, 200),
    },
    concerns: selectedConcerns,
    allegedRelation: optionalText(value.allegedRelation),
    narrative,
    risks,
    privacy,
    contactMethod: optionalText(value.contactMethod, 120),
    safeContact: optionalText(value.safeContact, 1_000),
    noEarlyContact: value.noEarlyContact === true,
    preliminaryPriority: ["Alta", "Media", "Baja"].includes(preliminaryPriority) ? preliminaryPriority : "Baja",
    suggestedRoute: textList(value.suggestedRoute, 12),
  };
}

function newCaseCode(): string {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `AM-${date}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_REQUEST_BYTES) {
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

  if (JSON.stringify(payload).length > MAX_REQUEST_BYTES) {
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
    let response: Response;
    try {
      response = await fetch(`${supabaseUrl}/rest/v1/intake_reports`, {
        method: "POST",
        headers: {
          apikey: publishableKey,
          Authorization: `Bearer ${publishableKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          case_code: caseCode,
          source: "web",
          priority: payload.preliminaryPriority,
          department: payload.location && isRecord(payload.location) ? payload.location.department : null,
          report_payload: payload,
        }),
        cache: "no-store",
      });
    } catch (error) {
      console.error("Supabase intake report request failed.", { message: error instanceof Error ? error.message : "Unknown error" });
      return NextResponse.json({ error: "No se pudo conectar con la base de datos. Intentá nuevamente." }, { status: 502 });
    }

    if (response.ok) {
      return NextResponse.json({ caseCode }, { status: 201 });
    }

    if (response.status !== 409 || attempt === 2) {
      console.error("Supabase intake report insert failed.", { status: response.status });
      return NextResponse.json({ error: "No se pudo guardar la comunicación. Intentá nuevamente." }, { status: 502 });
    }
  }

  return NextResponse.json({ error: "No se pudo generar un código de expediente." }, { status: 503 });
}
