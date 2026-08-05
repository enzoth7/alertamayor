import test from "node:test";
import assert from "node:assert/strict";
import { buildNationalMetrics, metricsCsv } from "../lib/national-metrics.mjs";

function fixture() {
  return {
    exclusion: { metadata: { generated_at: "2026-08-03" }, entries: [{ department: "Rocha" }, { department: null }] },
    referenceTotals: { Rocha: 43 },
    closures: [{
      metadata: { department: "Rocha", provisionalClosure: true },
      counts: { rawLeads: 22, knownMatches: 2, probableMatches: 1, verifiedNewAfterHumanReview: 3, historical: 0, withoutAddress: 2, falsePositive: 1, notElepem: 1, importedPrivate: 14, publiclyApproved: 0 },
      provenance: { byChannel: { official_sources: 9, public_maps: 3, public_social_sources: 20, other_public_sources: 6, manual_editorial: 0 }, missingProvenanceCount: 0 },
    }],
    step9Reports: [], generatedAt: "2026-08-04T00:00:00Z",
  };
}

test("genera 19 filas y mantiene nulos donde no existe investigación", () => {
  const report = buildNationalMetrics(fixture());
  assert.equal(report.departments.length, 19);
  assert.equal(report.departments.find((row) => row.department === "Rocha").probable_new, 3);
  assert.equal(report.departments.find((row) => row.department === "Salto").probable_new, null);
  assert.equal(report.metadata.missing_facilities_formula_used, false);
});

test("rechaza cualquier publicación inesperada", () => {
  const data = fixture();
  data.closures[0].counts.publiclyApproved = 1;
  assert.throws(() => buildNationalMetrics(data), /publicación no esperada/);
});

test("CSV conserva vacío para métricas desconocidas", () => {
  const csv = metricsCsv(buildNationalMetrics(fixture()));
  const salto = csv.split("\n").find((line) => line.startsWith('"Salto"'));
  assert.match(salto, /baseline_only/);
  assert.match(salto, /,,/);
});

test("una referencia histórica de una pista actual no convierte la sede en histórica", () => {
  const data = fixture();
  data.step9Reports = [{ department: "Artigas", report: { candidates: [{
    inputClassification: "current_nonprofit_candidate_with_historical_official_reference",
    matchStatus: "new_candidate", address: "Calle 1", sourceReferences: [],
  }] } }];
  const row = buildNationalMetrics(data).departments.find((item) => item.department === "Artigas");
  assert.equal(row.probable_new, 1);
  assert.equal(row.historical, 0);
});

test("incorpora más de un cierre departamental", () => {
  const data = fixture();
  data.closures.push({
    metadata: { department: "Canelones", closedAt: "2026-08-04T00:00:00Z", provisionalClosure: true },
    counts: { rawLeads: 75, knownMatches: 11, probableMatches: 0, verifiedNewAfterHumanReview: 12, historical: 0, withoutAddress: 6, falsePositive: 2, notElepem: 0, importedPrivate: 58, publiclyApproved: 0 },
    provenance: { byChannel: { official_sources: 21, public_maps: 1, public_social_sources: 11, other_public_sources: 67, manual_editorial: 0 }, missingProvenanceCount: 0 },
  });
  const report = buildNationalMetrics(data);
  assert.deepEqual(report.metadata.closed_departments, ["Canelones", "Rocha"]);
  assert.equal(report.processed_totals.reviewed_and_imported, 72);
  assert.equal(report.baseline.exclusion_index_predates_latest_closure, true);
});

test("una revalidación parcial no figura como departamento cerrado", () => {
  const data = fixture();
  data.closures[0].metadata.provisionalClosure = false;
  const report = buildNationalMetrics(data);
  const rocha = report.departments.find((row) => row.department === "Rocha");
  assert.equal(rocha.metrics_status, "step17_partial_revalidation");
  assert.equal(rocha.closed_provisionally, false);
  assert.deepEqual(report.metadata.closed_departments, []);
});
