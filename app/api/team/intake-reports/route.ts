import { NextRequest, NextResponse } from "next/server";
import { hasTeamSession, TEAM_SESSION_COOKIE } from "../../../../lib/team-session";
import { querySupabaseDatabase } from "../../../../lib/supabase-db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!hasTeamSession(request.cookies.get(TEAM_SESSION_COOKIE)?.value)) {
    return NextResponse.json({ error: "La sesión de equipo venció. Volvé a ingresar." }, { status: 401 });
  }

  try {
    const reports = await querySupabaseDatabase<{
      id: string;
      case_code: string;
      priority: string;
      department: string | null;
      report_payload: Record<string, unknown>;
      created_at: string;
    }>(`SELECT id, case_code, priority, department, report_payload, created_at
       FROM public.intake_reports
       ORDER BY created_at DESC
       LIMIT 100`);

    return NextResponse.json({ reports }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Supabase team inbox fetch failed.", { message: error instanceof Error ? error.message : "Unknown error" });
    return NextResponse.json({ error: "No se pudieron cargar las comunicaciones." }, { status: 502 });
  }
}
