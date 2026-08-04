import assert from "node:assert/strict";
import test from "node:test";
import { buildKnownFacilitiesExclusionIndex, validateKnownFacilitiesExclusionIndex } from "../lib/known-facilities-exclusion.mjs";

const officialRows = [
  { entity_id: "ELP-0001", name: "Hogar Igual", department: "Artigas", locality: "Artigas", address: "Uruguay 10", phone: "099 111 111", email: "contacto@hogar.uy", highest_stage: "authorization_final", msp_final: "true", mides_social: "false", msp_registro_historico: "false", pacp: "false", historical_certificate_count: "0", latest_public_date: "2026-06-30", latitude: "-30.4", longitude: "-56.4", geocode_method: "official", geocode_confidence: "door", source_urls: "https://example.org/oficial" },
  { entity_id: "ELP-0002", name: "Hogar Igual", department: "Artigas", locality: "Artigas", address: "Rivera 20", phone: "099 222 222", email: "contacto2@hogar.uy", highest_stage: "authorization_final", msp_final: "true", mides_social: "false", msp_registro_historico: "false", pacp: "false", historical_certificate_count: "0", latest_public_date: "2026-06-30", latitude: "-30.5", longitude: "-56.5", geocode_method: "official", geocode_confidence: "door", source_urls: "https://example.org/oficial-2" },
];
const sourceRows = [
  { record_id: "SRC-1", entity_id: "ELP-0001", source_type: "official", source_title: "Fuente", source_date: "2026-06-30", source_url: "https://example.org/oficial", department: "Artigas", locality: "Artigas", name: "Hogar Igual", address: "Uruguay 10", email: "contacto@hogar.uy", phone: "099 111 111" },
];

function build() {
  return buildKnownFacilitiesExclusionIndex({
    officialEntities: officialRows,
    sourceRecords: sourceRows,
    legacySnapshot: { metadata: { retrievedAt: "2026-08-03T00:00:00Z" }, residenciales: [{ id: "LEG-1", name: "Hogar Igual", department: "Artigas", locality: "Artigas", address: "Uruguay 10", lat: -30.4, lng: -56.4 }], candidates: [], externalIds: [] },
    facilityMappings: "legacy_residencial_id,facility_key,facility_id,mapping_status,match_method,confidence,official_entity_ids,department\nLEG-1,FAC-1,1,mapped,exact_id,1,ELP-0001,Artigas",
    backfillConflicts: "conflict_id,conflict_type,legacy_residencial_id,official_entity_id,department,detail,requires_human_review,resolution\n",
    osmDocument: { candidates: [] },
    osmReview: { candidates: [] },
    paysanduDocument: { records: [] },
    artigasDocument: { records: [] },
    pdfText: "1 Artigas Artigas Hogar Igual Uruguay 10\nDire cción\nt elefónico",
    generatedAt: "2026-08-03T00:00:00Z",
    pdfVisualReviewed: true,
  });
}

test("nunca fusiona dos sedes solo por nombre", () => {
  const { index } = build();
  const sameNameEntries = index.entries.filter((entry) => entry.canonical_name === "Hogar Igual");
  assert.equal(sameNameEntries.length, 2);
  assert.notEqual(sameNameEntries[0].addresses[0].normalized_address, sameNameEntries[1].addresses[0].normalized_address);
});

test("preserva una correspondencia explícita legado-oficial y la trazabilidad", () => {
  const { index } = build();
  const entry = index.entries.find((candidate) => candidate.exclusion_id === "EXC-OFFICIAL-ELP-0001");
  assert.deepEqual(entry.legacy_residencial_ids, ["LEG-1"]);
  assert.ok(entry.sources.length >= 1);
  assert.equal(entry.private_only, true);
});

test("marca contaminación de extracción PDF y valida IDs únicos", () => {
  const { index, conflicts } = build();
  assert.equal(index.metadata.pdf.extraction_requires_human_review, true);
  assert.equal(validateKnownFacilitiesExclusionIndex(index, conflicts).valid, true);
});

test("una pista social queda privada y no conserva su teléfono", () => {
  const { index, conflicts } = buildKnownFacilitiesExclusionIndex({
    officialEntities: [officialRows[0]],
    sourceRecords: sourceRows,
    legacySnapshot: { metadata: {}, residenciales: [], candidates: [], externalIds: [] },
    facilityMappings: "legacy_residencial_id,facility_key,facility_id,mapping_status,match_method,confidence,official_entity_ids,department\n",
    backfillConflicts: "conflict_id,conflict_type,legacy_residencial_id,official_entity_id,department,detail,requires_human_review,resolution\n",
    osmDocument: { candidates: [] },
    osmReview: { candidates: [] },
    paysanduDocument: { generated_at: "2026-08-02", records: [{ candidate_key: "instagram:test", observed_name: "Pista", department: "Paysandú", locality: "Paysandú", address: null, phones: ["099 999 999"], instagram_url: "https://www.instagram.com/test/", sources: [] }] },
    artigasDocument: { records: [] },
    pdfText: "1 Artigas Artigas Hogar Igual Uruguay 10",
    generatedAt: "2026-08-03T00:00:00Z",
  });
  const candidate = index.entries.find((entry) => entry.candidate_keys.includes("instagram:test"));
  assert.deepEqual(candidate.contacts.phones, []);
  assert.ok(conflicts.some((conflict) => conflict.conflict_type === "social_phone_not_retained_privacy_guard"));
  assert.equal(candidate.private_only, true);
});
