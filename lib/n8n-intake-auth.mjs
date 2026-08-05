import { createHmac } from "node:crypto";
import { sameSecret, sha256Hex } from "./intake-report.mjs";

export const INTEGRATION_TIMESTAMP_WINDOW_MS = 5 * 60 * 1_000;
const NONCE_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9:_-]{16,200}$/;

export function integrationSignature(secret, timestamp, nonce, idempotencyKey, rawBody) {
  return `sha256=${createHmac("sha256", secret)
    .update(`${timestamp}.${nonce}.${idempotencyKey}.${rawBody}`)
    .digest("hex")}`;
}

export function verifyN8nIntakeRequest({ headers, rawBody, secret, now = Date.now() }) {
  if (!secret || secret.length < 32) return { ok: false, status: 503, error: "Integración no configurada." };
  const timestamp = headers.get("x-alerta-timestamp") || "";
  const nonce = headers.get("x-alerta-nonce") || "";
  const idempotencyKey = headers.get("x-alerta-idempotency-key") || "";
  const provided = headers.get("x-alerta-signature") || "";
  const parsedTimestamp = Number(timestamp);
  if (!Number.isSafeInteger(parsedTimestamp) || Math.abs(now - parsedTimestamp) > INTEGRATION_TIMESTAMP_WINDOW_MS) {
    return { ok: false, status: 401, error: "Firma vencida." };
  }
  if (!NONCE_PATTERN.test(nonce) || !IDEMPOTENCY_PATTERN.test(idempotencyKey)) {
    return { ok: false, status: 400, error: "Identificadores de integración inválidos." };
  }
  const expected = integrationSignature(secret, timestamp, nonce, idempotencyKey, rawBody);
  if (!sameSecret(provided, expected)) return { ok: false, status: 401, error: "Firma inválida." };
  return { ok: true, timestamp: parsedTimestamp, nonce, idempotencyKey, requestHash: sha256Hex(rawBody) };
}
