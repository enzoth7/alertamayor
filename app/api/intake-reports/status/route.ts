import { NextRequest, NextResponse } from "next/server";
import { querySupabaseDatabase } from "../../../../lib/supabase-db";

export const runtime = "nodejs";

const CASE_CODE_PATTERN = /^AM-\d{8}-[A-F0-9]{8}$/;

export async function GET(request: NextRequest) {
  try {
    const code = (request.nextUrl.searchParams.get("code") || "").trim().toUpperCase();

    if (code === "DEM-2401") {
      return NextResponse.json({
        caseCode: code,
        receivedAt: "2026-07-28T12:40:00.000Z",
        currentStatus: "in_review",
        events: [
          {
            status: "received",
            title: "Comunicación recibida",
            description: "La comunicación quedó registrada y está disponible para la revisión inicial.",
            createdAt: "2026-07-28T12:40:00.000Z",
          },
          {
            status: "in_review",
            title: "Revisión inicial completada",
            description: "El equipo revisó la información y definió el próximo paso.",
            createdAt: "2026-07-28T15:10:00.000Z",
          },
        ],
        demo: true,
      }, { headers: { "Cache-Control": "no-store" } });
    }

    if (!CASE_CODE_PATTERN.test(code)) {
      return NextResponse.json({ error: "El código no tiene el formato esperado." }, { status: 400 });
    }

    const rows = await querySupabaseDatabase<{ id: string; case_code: string; created_at: string; current_status: string }>(
      `SELECT id, case_code, created_at, current_status
       FROM public.intake_reports
       WHERE upper(case_code) = $1
       LIMIT 1`,
      [code],
    );
    const report = rows[0];
    if (!report) return NextResponse.json({ error: "No se encontró una comunicación con ese código." }, { status: 404 });

    const events = await querySupabaseDatabase<{
      status: string;
      public_title: string;
      public_description: string;
      created_at: string;
    }>(
      `SELECT status, public_title, public_description, created_at
       FROM public.intake_report_events
       WHERE report_id = $1
       ORDER BY created_at ASC, id ASC`,
      [report.id],
    );

    return NextResponse.json({
      caseCode: report.case_code,
      receivedAt: report.created_at,
      currentStatus: report.current_status,
      events: events.map((event) => ({
        status: event.status,
        title: event.public_title,
        description: event.public_description,
        createdAt: event.created_at,
      })),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Public intake status lookup failed.", { message: error instanceof Error ? error.message : "Unknown error" });
    return NextResponse.json({ error: "No se pudo consultar el estado. Intentá nuevamente." }, { status: 502 });
  }
}
