import test from "node:test";
import assert from "node:assert/strict";
import { buildDepartmentClosure, toCsv } from "../lib/department-closure.mjs";

function fixture() {
  const source = {
    department: "Rocha",
    methodology: { localities_searched: ["Rocha"], languages: ["español"], source_families: ["fuentes oficiales"] },
    records: [{ candidate_key: "r:1", locality: "Rocha", classification: "probable_new_current", sources: [
      { source_type: "official_nonprofit_list", url: "https://example.test/a", observed_at: "2026-08-03" },
      { source_type: "facebook_public_page", url: "https://example.test/b", observed_at: "2026-08-03" },
    ] }],
    unresolved_leads_not_imported: [], coverage_gaps: [], results_summary: { records_with_verified_coordinates: 0 },
  };
  const decision = { candidateKey: "r:1", name: "Uno", locality: "Rocha", evidenceTier: "B", currentDisposition: "probable_new", humanDecision: "verified_new", recommendedAction: "verified_new", reviewedAt: "2026-08-04T00:00:00Z" };
  return {
    source,
    matching: { candidates: [{ id: "r:1" }] },
    review: { metadata: { reviewerIdentifier: "reviewer" }, decisions: [decision] },
    imported: { metadata: { remoteModel: "private" }, plan: { candidates: [{ candidateKey: "r:1" }] }, databaseApply: { publicResidencialesBefore: 10, publicResidencialesAfter: 10, insertedOrUpdatedCandidates: 1, insertedObservations: 2, publicEligibleCandidates: 0 } },
    inputHashes: {}, closedAt: "2026-08-04T00:00:00Z",
  };
}

test("cierra un departamento sin publicación y separa origen de corroboración", () => {
  const { report, unresolved } = buildDepartmentClosure(fixture());
  assert.equal(report.metadata.status, "revisado sistemáticamente");
  assert.equal(report.provenance.discoveryOriginByChannel.official_sources, 1);
  assert.equal(report.provenance.corroborationByChannel.public_social_sources, 1);
  assert.equal(report.counts.publiclyApproved, 0);
  assert.equal(unresolved.length, 0);
});

test("rechaza un cierre si cambió la tabla pública", () => {
  const data = fixture();
  data.imported.databaseApply.publicResidencialesAfter = 11;
  assert.throws(() => buildDepartmentClosure(data), /tabla pública cambió/);
});

test("genera CSV escapado", () => {
  const csv = toCsv([{ candidate_key: "r:1", name: 'Casa "Uno"' }]);
  assert.match(csv, /"Casa ""Uno"""/);
});

test("acepta cobertura territorial por subregiones", () => {
  const data = fixture();
  delete data.source.methodology.localities_searched;
  data.source.methodology.subregions = [{ name: "Costa", localities: ["Salinas", "Marindia"] }];
  data.source.coverage_review = [{ name: "Costa", summary: "Cobertura parcial." }];
  const { report } = buildDepartmentClosure(data);
  assert.deepEqual(report.coverage.localitiesSearched, ["Salinas", "Marindia"]);
  assert.equal(report.coverage.territorialReview[0].area, "Costa");
  assert.match(report.coverage.insufficientCoverage[0], /log granular/);
});

test("acepta el formato de cobertura y clasificaciones de Artigas", () => {
  const data = fixture();
  delete data.source.department;
  delete data.source.methodology;
  data.source.scope = {
    department: "Artigas",
    localities_searched: ["Artigas", "Bella Unión"],
    search_languages: ["Spanish", "Portuguese"],
    platform_focus: "public social and official sources",
    method: "targeted public-web research",
  };
  data.source.records[0].classification = "probable_existing_official_match";
  data.source.coverage_review = [
    { area: "Artigas", result: "Registro revisado.", record_keys: ["r:1"] },
    { area: "Localidades pequeñas", result: "Brecha de cobertura.", record_keys: [] },
  ];
  delete data.source.coverage_gaps;
  data.source.unresolved_leads = [{ lead: "Pista sin nombre" }];
  data.source.records[0].sources[0] = {
    type: "official_nonprofit_list",
    url: "https://example.test/a",
    observed_at: "2026-08-03",
  };
  const { report } = buildDepartmentClosure(data);
  assert.equal(report.metadata.department, "Artigas");
  assert.deepEqual(report.coverage.localitiesSearched, ["Artigas", "Bella Unión"]);
  assert.equal(report.coverage.coverageGaps[0].area, "Localidades pequeñas");
  assert.equal(report.counts.rawLeads, 2);
  assert.equal(report.counts.knownMatches, 1);
  assert.equal(report.preImportUnresolvedLeads.length, 1);
});

test("no declara revisión sistemática sin localidades documentadas", () => {
  const data = fixture();
  data.source.methodology = { source_families: ["Instagram público"] };
  const { report } = buildDepartmentClosure(data);
  assert.equal(report.metadata.status, "revalidado parcialmente");
  assert.equal(report.metadata.provisionalClosure, false);
  assert.match(report.coverage.insufficientCoverage[0], /no documenta localidades/i);
});
