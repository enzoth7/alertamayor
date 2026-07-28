import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const TEAM_SESSION_COOKIE = "alerta-mayor-team-session";

function environmentValue(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function sameValue(left: string, right: string): boolean {
  return timingSafeEqual(digest(left), digest(right));
}

export function createTeamSession(): string {
  return createHmac("sha256", environmentValue("TEAM_SESSION_SECRET"))
    .update("alerta-mayor-team-session:v1")
    .digest("base64url");
}

export function hasTeamSession(value: string | undefined): boolean {
  if (!value) return false;

  try {
    return sameValue(value, createTeamSession());
  } catch {
    return false;
  }
}

export function hasValidTeamCredentials(username: string, password: string): boolean {
  try {
    return sameValue(username, environmentValue("TEAM_DEMO_USERNAME"))
      && sameValue(password, environmentValue("TEAM_DEMO_PASSWORD"));
  } catch {
    return false;
  }
}
