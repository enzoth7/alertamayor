import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { manualDiscoveryPilotRecords } from "../../lib/manual-discovery-pilot.mjs";

async function document(name) {
  return JSON.parse(await readFile(new URL(`../../data/discovery/${name}`, import.meta.url), "utf8"));
}

test("manual pilot lists unlocated Artigas and Paysandu candidates without duplicating existing matches", async () => {
  const candidates = manualDiscoveryPilotRecords(await Promise.all([
    document("artigas_department_elepem_public_candidates_2026-08-02.json"),
    document("instagram_paysandu_candidates_2026-08-02.json"),
  ]));

  assert.equal(candidates.length, 17);
  assert.equal(candidates.filter((candidate) => candidate.hasCoordinates).length, 0);
  assert.equal(candidates.filter((candidate) => candidate.historical).length, 1);
  assert.equal(candidates.some((candidate) => candidate.name === "Residencia San Cono"), false);
  assert.equal(candidates.filter((candidate) => candidate.name.startsWith("Como en Casa")).length, 2);
  assert.notEqual(
    candidates.find((candidate) => candidate.name === "Como en Casa - Casa 1")?.address,
    candidates.find((candidate) => candidate.name === "Como en Casa - Casa 2")?.address,
  );
});
