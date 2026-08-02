import assert from "node:assert/strict";
import test from "node:test";
import { validateCandidateReviewInput } from "../../lib/facility-candidate-review.mjs";

test("acepta una coincidencia A con correcciones completas", () => {
  const result = validateCandidateReviewInput({
    candidateId: "12",
    action: "verified_match",
    evidenceTier: "A",
    matchedResidencialId: "ELP-0012",
    reviewNote: "Coincidencia corroborada en fuente oficial.",
    corrections: {
      name: "Residencial Ejemplo",
      address: "Colonia 1234",
      latitude: -34.9,
      longitude: -56.18,
    },
  });
  assert.equal(result.status, "verified_match");
  assert.equal(result.corrections.latitude, -34.9);
});

test("rechaza verificar una pista C", () => {
  assert.throws(
    () => validateCandidateReviewInput({
      candidateId: "12",
      action: "verified_new",
      evidenceTier: "C",
      reviewNote: "Solo se encontró una pista comercial.",
    }),
    /nivel C/,
  );
});

test("exige match y nota para verified_match", () => {
  assert.throws(
    () => validateCandidateReviewInput({
      candidateId: "12",
      action: "verified_match",
      evidenceTier: "B",
      reviewNote: "ok",
    }),
    /al menos 3/,
  );
});

test("exige un residencial existente para verified_match", () => {
  assert.throws(() => validateCandidateReviewInput({
    candidateId: "12",
    action: "verified_match",
    evidenceTier: "A",
    reviewNote: "La fuente oficial coincide con el establecimiento.",
  }), /seleccionar un residencial existente/);
});

test("rechaza coordenadas parciales", () => {
  assert.throws(
    () => validateCandidateReviewInput({
      candidateId: "12",
      action: "needs_more_evidence",
      evidenceTier: "C",
      reviewNote: "Falta corroborar el domicilio.",
      corrections: { latitude: -34.9 },
    }),
    /juntas/,
  );
});
