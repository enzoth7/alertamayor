import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBackfillPlan,
  normalizeText,
  parseCsv,
} from "../lib/normalized-elepem-backfill.mjs";

function remoteSnapshot(residenciales) {
  return {
    metadata: {
      projectRef: "local-test-project",
      retrievedAt: "2026-08-03T12:00:00Z",
    },
    residenciales,
    sourceRuns: [],
    sourceObservations: [],
    candidates: [],
    candidateSources: [],
    externalIds: [],
    matchSuggestions: [],
  };
}

function legacy(overrides = {}) {
  return {
    id: "TEST-001",
    name: "Residencial Árbol",
    department: "Montevideo",
    locality: "Montevideo",
    address: "Calle Uno 123",
    places: 10,
    lat: -34.9,
    lng: -56.1,
    precision: "puerta",
    precision_label: "Fixture",
    status_group: "registro",
    status_stage: "fixture",
    status_short: "Fixture",
    source_label: "Fixture",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
    msp_final: false,
    msp_registro_historico: true,
    mides_social: false,
    pacp: false,
    other_source: false,
    ...overrides,
  };
}

function official(overrides = {}) {
  return {
    entity_id: "TEST-001",
    name: "Residencial Árbol",
    department: "Montevideo",
    locality: "Montevideo",
    address: "Calle Uno 123",
    capacity: 10,
    phone: "2400 0000|2400 0001",
    email: "contacto@example.test",
    legal_name: "Operador de prueba",
    rut: "fixture-only",
    msp_final: false,
    mides_social: false,
    msp_registro_historico: true,
    pacp: false,
    latitude: -34.9,
    longitude: -56.1,
    geocode_method: "ide_uy",
    geocode_confidence: 0.9,
    latest_public_date: "2025-01-01",
    ...overrides,
  };
}

function build({ legacyRows, officialRows, researchRecords = [] }) {
  return buildBackfillPlan({
    remoteSnapshot: remoteSnapshot(legacyRows),
    officialEntities: officialRows,
    officialCsvRows: officialRows.map((row) => ({ entity_id: row.entity_id })),
    sourceRecordRows: officialRows.map((row, index) => ({
      record_id: `SOURCE-${index + 1}`,
      entity_id: row.entity_id,
      source_type: "msp_certificado_registro_historico",
      source_title: "Fuente oficial de prueba",
      source_date: "2025-01-01",
      source_url: "https://example.test/official",
      department: row.department,
      locality: row.locality,
      name: row.name,
      address: row.address,
    })),
    sourceCatalogRows: [
      {
        source_id: "TEST-SOURCE",
        title: "Fuente oficial de prueba",
        institution: "Fixture",
        url: "https://example.test/official",
      },
    ],
    osmDocument: { candidates: [] },
    paysanduDocument: { generated_at: "2026-08-02T12:00:00Z", records: researchRecords },
    artigasDocument: { generated_at: "2026-08-02T12:00:00Z", records: [] },
    generatedAt: "2026-08-03T12:00:00Z",
  });
}

test("parseCsv supports quoted commas, escaped quotes and newlines", () => {
  const rows = parseCsv('id,name,note\n1,"Casa, Uno","línea 1\nlínea 2"\n2,"A ""B""",ok\n');
  assert.deepEqual(rows, [
    { id: "1", name: "Casa, Uno", note: "línea 1\nlínea 2" },
    { id: "2", name: 'A "B"', note: "ok" },
  ]);
});

test("normalization is accent-insensitive but preserves observed text elsewhere", () => {
  assert.equal(normalizeText("  Árbol & Compañía  "), "arbol compania");
});

test("backfill maps exact IDs, separates contacts and never plans publication", () => {
  const plan = build({ legacyRows: [legacy()], officialRows: [official()] });
  assert.equal(plan.summary.facilities, 1);
  assert.equal(plan.summary.legacyMappings, 1);
  assert.equal(plan.summary.officialMatchMethods.exact_id, 1);
  assert.equal(plan.contacts.filter((row) => row.contactType === "phone").length, 2);
  assert.equal(plan.summary.conflictTypes.split_multivalue_contact, 1);
  assert.equal(plan.facilities[0].publicationStatus, "private");
  assert.equal(plan.facilities[0].reviewStatus, "needs_review");
  assert.equal(plan.summary.publicApprovedRowsPlanned, 0);
  assert.ok(plan.sourceCatalog.every((row) => row.sourceChannel));
  assert.equal(
    plan.sourceCatalog.find((row) => row.sourceType === "official")?.sourceChannel,
    "official_sources",
  );
});

test("legacy Google Maps discoveries are normalized as public maps", () => {
  const plan = build({
    legacyRows: [
      legacy({
        id: "APP-001",
        status_group: "app",
        source_label: "SerpApi Google Maps · barrido Paysandú 2026-08-01 · RDC-001",
        msp_registro_historico: false,
        other_source: true,
      }),
    ],
    officialRows: [],
  });
  const observation = plan.observations.find(
    (row) => row.sourceRecordKey === "public.residenciales:APP-001",
  );
  const catalog = plan.sourceCatalog.find(
    (row) => row.sourceKey === observation?.sourceCatalogKey,
  );
  assert.equal(catalog?.sourceChannel, "public_maps");
  assert.equal(observation?.sourceType, "public_directory");
});

test("name equality alone never merges different physical addresses", () => {
  const plan = build({
    legacyRows: [legacy({ id: "LEGACY-001", address: "Calle A 1" })],
    officialRows: [official({ entity_id: "OFFICIAL-001", address: "Calle B 2" })],
  });
  assert.equal(plan.summary.facilities, 2);
  assert.equal(plan.summary.officialMatchMethods.unmatched, 1);
});

test("social research stores only URL metadata and keeps candidate at tier C", () => {
  const plan = build({
    legacyRows: [legacy()],
    officialRows: [official()],
    researchRecords: [
      {
        candidate_key: "RESEARCH-001",
        observed_name: "Pista de prueba",
        department: "Paysandú",
        locality: "Paysandú",
        address: "Calle Dos 20",
        sources: [
          {
            type: "instagram_public_profile",
            url: "https://www.instagram.com/example.test/",
            observed_at: "2026-08-02T12:00:00Z",
            claims: ["contenido que no debe persistirse"],
          },
        ],
      },
    ],
  });
  const candidate = plan.candidates.find((row) => row.candidateKey === "RESEARCH-001");
  const social = plan.observations.find((row) => row.sourceType === "social_public_url");
  assert.equal(candidate.evidenceTier, "C");
  assert.equal(candidate.publicEligible, false);
  assert.equal(social.normalizedName, null);
  assert.equal(social.normalizedAddress, null);
  assert.equal(social.storagePolicy, "reference_only");
  const socialCatalog = plan.sourceCatalog.find(
    (row) => row.sourceKey === social.sourceCatalogKey,
  );
  assert.equal(socialCatalog.sourceChannel, "public_social_sources");
  assert.ok(!JSON.stringify(social).includes("contenido que no debe persistirse"));
});
