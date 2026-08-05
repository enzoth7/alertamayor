import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildReviewedDepartmentImportPlan } from "../lib/reviewed-department-import.mjs";

async function document(path) {
  return JSON.parse(await readFile(new URL(`../../${path}`, import.meta.url), "utf8"));
}

test("construye un lote privado revisado sin publicación automática", async () => {
  const [sourceDocument, reviewDocument] = await Promise.all([
    document("data/discovery/rocha_chatgpt_public_candidates_2026-08-03.json"),
    document("data/reports/rocha_step13_human_review_2026-08-04.json"),
  ]);
  const plan = buildReviewedDepartmentImportPlan({
    sourceDocument,
    reviewDocument,
    inputHash: "a".repeat(64),
  });
  assert.equal(plan.summary.candidates, 14);
  assert.equal(plan.summary.verifiedNew, 3);
  assert.equal(plan.summary.needsReview, 11);
  assert.ok(plan.summary.observations > 14);
  assert.equal(plan.candidates.some((item) => item.publicEligible), false);
  assert.equal(plan.candidates.every((item) => item.humanReviewed), true);
  assert.equal(
    plan.candidates
      .flatMap((item) => item.sources)
      .filter((item) => item.sourceType === "social_public_url")
      .every((item) => item.storagePolicy === "reference_only" && item.normalizedName === null),
    true,
  );
});

test("rechaza una decisión C verificada como nueva", async () => {
  const [sourceDocument, reviewDocument] = await Promise.all([
    document("data/discovery/rocha_chatgpt_public_candidates_2026-08-03.json"),
    document("data/reports/rocha_step13_human_review_2026-08-04.json"),
  ]);
  const changed = structuredClone(reviewDocument);
  const target = changed.decisions.find((item) => item.eligibleForStep14);
  target.humanDecision = "verified_new";
  target.evidenceTier = "C";
  assert.throws(() => buildReviewedDepartmentImportPlan({
    sourceDocument,
    reviewDocument: changed,
    inputHash: "b".repeat(64),
  }), /evidencia C/);
});

test("acota first_seen cuando el insumo declara una hora posterior a la revisión", async () => {
  const [sourceDocument, reviewDocument] = await Promise.all([
    document("data/discovery/rocha_chatgpt_public_candidates_2026-08-03.json"),
    document("data/reports/rocha_step13_human_review_2026-08-04.json"),
  ]);
  const changed = structuredClone(sourceDocument);
  changed.generated_at = "2099-01-01T12:00:00Z";
  const plan = buildReviewedDepartmentImportPlan({
    sourceDocument: changed,
    reviewDocument,
    inputHash: "c".repeat(64),
  });
  assert.equal(
    plan.candidates.every((item) => new Date(item.firstSeenAt) <= new Date(item.lastSeenAt)),
    true,
  );
});

test("normaliza departamento y localidad sin convertir otros organismos en MSP/MIDES", async () => {
  const [sourceDocument, reviewDocument] = await Promise.all([
    document("data/discovery/rocha_chatgpt_public_candidates_2026-08-03.json"),
    document("data/reports/rocha_step13_human_review_2026-08-04.json"),
  ]);
  const source = structuredClone(sourceDocument);
  const eligibleKey = reviewDocument.decisions.find((item) => item.eligibleForStep14).candidateKey;
  const row = source.records.find((item) => item.candidate_key === eligibleKey);
  row.department = "DURAZNO";
  row.locality = "Santa Bernardina / Durazno";
  row.sources[0].source_type = "official_bps_resolution";
  row.sources[0].url = "https://www.bps.gub.uy/example";
  const plan = buildReviewedDepartmentImportPlan({
    sourceDocument: source,
    reviewDocument,
    inputHash: "d".repeat(64),
  });
  const candidate = plan.candidates.find((item) => item.candidateKey === eligibleKey);
  assert.equal(candidate.department, "Durazno");
  assert.equal(candidate.locality, "Durazno");
  assert.notEqual(candidate.sources[0].sourceType, "official");
});

test("separa candidatos privados de vinculaciones a instalaciones existentes", async () => {
  const [sourceDocument, reviewDocument, exclusionDocument] = await Promise.all([
    document("data/discovery/durazno/durazno_chatgpt_public_candidates_2026-08-04.json"),
    document("data/reports/durazno_step13_human_review_2026-08-04.json"),
    document("data/exclusion/known_facilities_exclusion_index_2026-08-04.json"),
  ]);
  const plan = buildReviewedDepartmentImportPlan({
    sourceDocument,
    reviewDocument,
    exclusionDocument,
    inputHash: "e".repeat(64),
  });
  assert.equal(plan.summary.candidates, 10);
  assert.equal(plan.summary.facilityMatches, 18);
  assert.equal(plan.summary.verifiedNew, 3);
  assert.equal(plan.summary.needsReview, 7);
  assert.equal(plan.facilityMatches.filter((item) => item.historical).length, 9);
  assert.equal(plan.candidates.some((item) => item.publicEligible), false);
});

test("omite el indice de exclusion como fuente publica", async () => {
  const [sourceDocument, reviewDocument, exclusionDocument] = await Promise.all([
    document("data/discovery/tacuarembo/tacuarembo_chatgpt_public_candidates_2026-08-04.json"),
    document("data/reports/tacuarembo_step13_human_review_2026-08-04.json"),
    document("data/exclusion/known_facilities_exclusion_index_2026-08-04.json"),
  ]);
  const plan = buildReviewedDepartmentImportPlan({
    sourceDocument,
    reviewDocument,
    exclusionDocument,
    inputHash: "f".repeat(64),
  });
  const observations = [...plan.candidates, ...plan.facilityMatches].flatMap((item) => item.sources);
  assert.equal(observations.some((item) => item.sourceType === "exclusion_index"), false);
  assert.equal(observations.every((item) => /^https?:\/\//.test(item.sourceUrl)), true);
  assert.equal(plan.summary.facilityMatches, 10);
});
