import { NextRequest, NextResponse } from "next/server";
import { createTeamSession, hasTeamSession, hasValidTeamCredentials, TEAM_SESSION_COOKIE } from "../../../../lib/team-session";

export const runtime = "nodejs";

const cookieOptions = (request: NextRequest) => {
  const host = request.headers.get("host") || "";
  const isLocalHost = /^(localhost|127\.0\.0\.1)(:|$)/.test(host);

  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: !isLocalHost && (request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https"),
    path: "/",
    maxAge: 60 * 60 * 8,
  };
};

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "No se pudo validar el acceso." }, { status: 400 });
    }

    const username = body && typeof body === "object" && "username" in body && typeof body.username === "string" ? body.username : "";
    const password = body && typeof body === "object" && "password" in body && typeof body.password === "string" ? body.password : "";

    if (!hasValidTeamCredentials(username, password)) {
      return NextResponse.json({ error: "Usuario o contraseña incorrectos." }, { status: 401 });
    }

    const response = NextResponse.json({ authenticated: true });
    response.cookies.set(TEAM_SESSION_COOKIE, createTeamSession(), cookieOptions(request));
    return response;
  } catch (error) {
    console.error("Unhandled error in team session POST:", error);
    return NextResponse.json({ error: "No se pudo procesar la solicitud de inicio de sesión." }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({ authenticated: hasTeamSession(request.cookies.get(TEAM_SESSION_COOKIE)?.value) });
  } catch (error) {
    console.error("Unhandled error in team session GET:", error);
    return NextResponse.json({ authenticated: false });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const response = NextResponse.json({ authenticated: false });
    response.cookies.set(TEAM_SESSION_COOKIE, "", { ...cookieOptions(request), maxAge: 0 });
    return response;
  } catch (error) {
    console.error("Unhandled error in team session DELETE:", error);
    return NextResponse.json({ authenticated: false });
  }
}
