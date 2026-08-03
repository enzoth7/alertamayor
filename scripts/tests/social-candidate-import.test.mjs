import assert from "node:assert/strict";
import test from "node:test";
import { buildSocialCandidateDryRun, validateSocialCandidateDataset } from "../lib/social-candidate-import.mjs";

const input = {
  dataset: "social-test",
  generated_at: "2026-08-02T00:00:00-03:00",
  record_count: 3,
  records: [
    { candidate_key: "instagram:paysandu:como-uno", observed_name: "Como en Casa - Casa 1", instagram_url: "https://www.instagram.com/como/", department: "Paysandú", locality: "Paysandú", address: "Uruguay 1896", phones: ["098 251 284"], evidence_tier: "C", sources: [{ type: "instagram_public_profile", url: "https://www.instagram.com/como/", observed_at: "2026-08-02" }], do_not_publish_automatically: true },
    { candidate_key: "instagram:paysandu:como-dos", observed_name: "Como en Casa - Casa 2", instagram_url: "https://www.instagram.com/como/", department: "Paysandú", locality: "Paysandú", address: "Bulevar Artigas 1237", phones: ["098 251 284"], evidence_tier: "C", sources: [{ type: "instagram_public_profile", url: "https://www.instagram.com/como/", observed_at: "2026-08-02" }], do_not_publish_automatically: true },
    { candidate_key: "instagram:paysandu:bellanova", observed_name: "Residencia Bellanova", instagram_url: "https://www.instagram.com/bellanova/", department: "Paysandú", locality: "Paysandú", address: null, phones: ["092 396 264"], evidence_tier: "C", sources: [{ type: "instagram_public_profile", url: "https://www.instagram.com/bellanova/", observed_at: "2026-08-02" }], do_not_publish_automatically: true },
  ],
};

test("mantiene las dos direcciones de Como en Casa como establecimientos distintos", () => {
  const result = validateSocialCandidateDataset(input);
  assert.equal(result.validRecords.length, 3);
  assert.deepEqual(result.addressCollisions, []);
});

test("crea solo un enlace hipotético para una coincidencia oficial fuerte", () => {
  const report = buildSocialCandidateDryRun({
    input: { ...input, records: [input.records[0]] },
    publicFacilities: [{ id: "ELP-1", name: "Como en Casa - Casa 1", department: "Paysandú", locality: "Paysandú", address: "Uruguay 1896", lat: -32.3, lng: -58.0 }],
  });
  assert.equal(report.summary.exactMatches, 1);
  assert.equal(report.applyPlan.existingOfficialLinks[0].residencialId, "ELP-1");
  assert.equal(report.applyPlan.candidateUpserts.length, 0);
});

test("Bellanova queda en cola privada sin coordenadas ni punto de mapa", () => {
  const report = buildSocialCandidateDryRun({ input: { ...input, records: [input.records[2]] } });
  assert.equal(report.records[0].lacksCoordinates, true);
  assert.equal(report.records[0].mapEligibleAfterReview, false);
  assert.equal(report.records[0].proposedStatus, "needs_review");
  assert.equal(report.records[0].sourceObservation.storagePolicy, "reference_only");
});

test("Colibrí requiere confirmación manual de dirección antes de mapear", () => {
  const colibri = { ...input.records[0], candidate_key: "instagram:paysandu:colibri", observed_name: "Residencial Colibrí", address: "Avenida Italia 2334" };
  const report = buildSocialCandidateDryRun({ input: { ...input, records: [colibri] } });
  assert.equal(report.records[0].requiresManualAddressConfirmation, true);
  assert.equal(report.records[0].mapEligibleAfterReview, false);
});

test("informa registros malformados sin intentar importarlos", () => {
  const invalid = { ...input.records[0], instagram_url: "javascript:alert(1)", do_not_publish_automatically: false };
  const result = validateSocialCandidateDataset({ ...input, records: [invalid] });
  assert.equal(result.validRecords.length, 0);
  assert.match(result.malformedRecords[0].issues.join(" "), /instagram_url/);
});
