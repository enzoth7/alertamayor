export const INTEGRATION_TIMESTAMP_WINDOW_MS: number;
export function integrationSignature(secret: string, timestamp: string | number, nonce: string, idempotencyKey: string, rawBody: string): string;
export type N8nAuthResult =
  | { ok: false; status: number; error: string }
  | { ok: true; timestamp: number; nonce: string; idempotencyKey: string; requestHash: string };
export function verifyN8nIntakeRequest(input: { headers: Headers; rawBody: string; secret: string; now?: number }): N8nAuthResult;
