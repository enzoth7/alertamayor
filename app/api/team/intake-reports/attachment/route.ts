import { NextRequest, NextResponse } from "next/server";
import { hasTeamSession, TEAM_SESSION_COOKIE } from "../../../../../lib/team-session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!hasTeamSession(request.cookies.get(TEAM_SESSION_COOKIE)?.value)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");
  if (!path) return NextResponse.json({ error: "Path no proporcionado." }, { status: 400 });

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !publishableKey) {
    return NextResponse.json({ error: "Supabase no configurado." }, { status: 503 });
  }

  try {
    const fileRes = await fetch(`${supabaseUrl}/storage/v1/object/intake-evidence/${path}`, {
      headers: {
        apikey: publishableKey,
        ...(publishableKey.split(".").length === 3 ? { Authorization: `Bearer ${publishableKey}` } : {}),
      },
      cache: "no-store",
    });

    if (!fileRes.ok) {
      return NextResponse.json({ error: "No se pudo obtener el archivo." }, { status: fileRes.status });
    }

    const contentType = fileRes.headers.get("content-type") || "application/octet-stream";
    const arrayBuffer = await fileRes.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error al descargar" }, { status: 500 });
  }
}
