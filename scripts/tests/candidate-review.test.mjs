import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCandidateReview,
  privateCandidateRows,
} from "../lib/candidate-review.mjs";
import {
  candidateUpsertSql,
  PRIVATE_IMPORT_SQL,
  assertPrivateImportSql,
} from "../lib/private-candidate-import.mjs";

const retrievedAt = "2026-08-02T12:00:00.000Z";
const input = {
  metadata: {
    sourceType: "openstreetmap",
    endpoint: "https://overpass-api.de/api/interpreter",
    retrievedAt,
    sourceLicense: "ODbL 1.0",
    attribution: "© OpenStreetMap contributors",
    querySha256: "a".repeat(64),
    candidateOnly: true,
    writesPublicResidenciales: false,
  },
  candidates: [
    {
      sourceType: "openstreetmap",
      sourceRecordKey: "node/100",
      externalId: "node/100",
      externalUrl: "https://www.openstreetmap.org/node/100",
      sourceLicense: "ODbL 1.0",
      attribution: "© OpenStreetMap contributors",
      retrievedAt,
      name: "Residencial Exacto",
      department: "Montevideo",
      locality: "Montevideo",
      address: "Colonia 1000",
      latitude: -34.9,
      longitude: -56.18,
      originalTags: { social_facility: "nursing_home" },
    },
  ],
};
const existing = {
  metadata: {
    sourceTable: "public.residenciales",
    readOnly: true,
  },
  facilities: [
    {
      id: "ELP-1",
      name: "Residencial Exacto",
      department: "Montevideo",
      locality: "Montevideo",
      address: "Calle Colonia 1000",
      latitude: -34.90001,
      longitude: -56.18001,
    },
    {
      id: "ELP-2",
      name: "Otra Casa",
      department: "Montevideo",
      locality: "Montevideo",
      address: "Rivera 2000",
      latitude: -34.88,
      longitude: -56.16,
    },
    {
      id: "ELP-3",
      name: "Tercera Casa",
      department: "Canelones",
      locality: "La Paz",
      address: "Artigas 300",
      latitude: -34.76,
      longitude: -56.22,
    },
    {
      id: "ELP-4",
      name: "Cuarta Casa",
      department: "Maldonado",
      locality: "Maldonado",
      address: "Sarandí 400",
      latitude: -34.9,
      longitude: -54.95,
    },
  ],
};

test("genera tres alternativas explicables y nunca publica", () => {
  const review = buildCandidateReview(input, existing, { generatedAt: retrievedAt });
  assert.equal(review.candidates.length, 1);
  assert.equal(review.candidates[0].matches.length, 3);
  assert.equal(review.candidates[0].matches[0].residencialId, "ELP-1");
  assert.equal(review.candidates[0].requiresHumanReview, true);
  assert.equal(review.metadata.writesPublicResidenciales, false);
  assert.equal(
    review.candidates[0].matches[0].components.doorNumberMatch,
    true,
  );
});

test("prepara solo estados privados no verificados y evidencia C implícita", () => {
  const review = buildCandidateReview(input, existing, { generatedAt: retrievedAt });
  const rows = privateCandidateRows(input, review);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].candidateKey, "openstreetmap:node/100");
  assert.equal(rows[0].candidateStatus, "possible_match");
  assert.match(rows[0].recordHash, /^[a-f0-9]{64}$/);
});

test("el SQL de apply no contiene escrituras a public", () => {
  assert.doesNotThrow(() => assertPrivateImportSql());
  for (const sql of PRIVATE_IMPORT_SQL) {
    assert.doesNotMatch(sql, /\b(?:insert\s+into|update|delete\s+from)\s+public\./i);
  }
});

test("el importador normalizado resuelve coincidencias desde el índice de exclusión", () => {
  const sql = candidateUpsertSql("normalized");
  assert.match(sql, /known_facilities_exclusion_view/);
  assert.match(sql, /resolved_facility_id/);
  assert.doesNotMatch(sql, /insert\s+into\s+public\./i);
});
