import assert from "node:assert/strict";
import test from "node:test";
import {
  TEAM_SESSION_TTL_MS,
  createTeamSession,
  hasSameOrigin,
  hasTeamSession,
  readTeamSession,
} from "../../lib/team-session.mjs";

const previousSecret = process.env.TEAM_SESSION_SECRET;
process.env.TEAM_SESSION_SECRET = "test-only-team-session-secret";

test.after(() => {
  if (previousSecret === undefined) delete process.env.TEAM_SESSION_SECRET;
  else process.env.TEAM_SESSION_SECRET = previousSecret;
});

test("la sesión firmada conserva revisor y expira", () => {
  const now = 1_800_000_000_000;
  const token = createTeamSession("equipo-prueba", now);
  assert.deepEqual(readTeamSession(token, now + 1_000), {
    reviewer: "equipo-prueba",
    expiresAt: now + TEAM_SESSION_TTL_MS,
  });
  assert.equal(hasTeamSession(token, now + TEAM_SESSION_TTL_MS), false);
});

test("rechaza manipulación de la cookie", () => {
  const token = createTeamSession("equipo-prueba", 1_800_000_000_000);
  assert.equal(hasTeamSession(`${token}x`, 1_800_000_000_001), false);
});

test("valida mismo origen para escrituras", () => {
  assert.equal(
    hasSameOrigin("http://localhost:3000/api/team/facility-candidates", "http://localhost:3000"),
    true,
  );
  assert.equal(
    hasSameOrigin("http://localhost:3000/api/team/facility-candidates", "https://evil.example"),
    false,
  );
  assert.equal(hasSameOrigin("http://localhost:3000/api/team/facility-candidates", null), false);
});
