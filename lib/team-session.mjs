import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const TEAM_SESSION_COOKIE = "alerta-mayor-team-session";
export const TEAM_SESSION_TTL_MS = 8 * 60 * 60 * 1_000;

function environmentValue(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function digest(value) {
  return createHash("sha256").update(value).digest();
}

function sameValue(left, right) {
  return timingSafeEqual(digest(left), digest(right));
}

function signature(payload) {
  return createHmac("sha256", environmentValue("TEAM_SESSION_SECRET"))
    .update(`alerta-mayor-team-session:v2:${payload}`)
    .digest("base64url");
}

export function createTeamSession(username, now = Date.now()) {
  const reviewer = String(username ?? "").trim().slice(0, 200);
  if (!reviewer) throw new Error("Missing team session username");
  const payload = Buffer.from(
    JSON.stringify({ version: 2, reviewer, expiresAt: now + TEAM_SESSION_TTL_MS }),
    "utf8",
  ).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function readTeamSession(value, now = Date.now()) {
  if (!value || typeof value !== "string") return null;
  const [payload, providedSignature, extra] = value.split(".");
  if (!payload || !providedSignature || extra) return null;
  try {
    if (!sameValue(providedSignature, signature(payload))) return null;
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (
      parsed?.version !== 2 ||
      typeof parsed.reviewer !== "string" ||
      !parsed.reviewer.trim() ||
      parsed.reviewer.length > 200 ||
      !Number.isSafeInteger(parsed.expiresAt) ||
      parsed.expiresAt <= now
    ) {
      return null;
    }
    return { reviewer: parsed.reviewer, expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
}

export function hasTeamSession(value, now = Date.now()) {
  return readTeamSession(value, now) !== null;
}

export function hasValidTeamCredentials(username, password) {
  try {
    return (
      sameValue(username, environmentValue("TEAM_DEMO_USERNAME")) &&
      sameValue(password, environmentValue("TEAM_DEMO_PASSWORD"))
    );
  } catch {
    return false;
  }
}

export function hasSameOrigin(requestUrl, origin) {
  if (!origin) return false;
  try {
    return new URL(requestUrl).origin === new URL(origin).origin;
  } catch {
    return false;
  }
}
