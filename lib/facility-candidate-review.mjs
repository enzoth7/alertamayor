export const REVIEW_ACTIONS = Object.freeze([
  "verified_new",
  "verified_match",
  "duplicate",
  "rejected",
  "closed",
  "needs_more_evidence",
]);

export const EVIDENCE_TIERS = Object.freeze(["A", "B", "C"]);

const STATUS_BY_ACTION = Object.freeze({
  verified_new: "verified_new",
  verified_match: "verified_match",
  duplicate: "duplicate",
  rejected: "rejected",
  closed: "closed",
  needs_more_evidence: "needs_review",
});

function record(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function requiredText(value, label, maximum) {
  if (typeof value !== "string") throw new Error(`${label} es obligatorio.`);
  const result = value.trim();
  if (!result || result.length > maximum) {
    throw new Error(`${label} debe tener entre 1 y ${maximum} caracteres.`);
  }
  return result;
}

function optionalCorrection(value, label, maximum) {
  if (value === undefined || value === null) return undefined;
  return requiredText(value, label, maximum);
}

function optionalCoordinate(value, label, minimum, maximum) {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${label} no es válida.`);
  }
  return parsed;
}

export function validateCandidateReviewInput(value) {
  const input = record(value);
  const candidateId = requiredText(input.candidateId, "candidateId", 30);
  if (!/^\d+$/.test(candidateId)) throw new Error("candidateId no es válido.");

  const action = requiredText(input.action, "La decisión", 40);
  if (!REVIEW_ACTIONS.includes(action)) throw new Error("La decisión no es válida.");
  const evidenceTier = requiredText(input.evidenceTier, "El nivel de evidencia", 1);
  if (!EVIDENCE_TIERS.includes(evidenceTier)) {
    throw new Error("El nivel de evidencia no es válido.");
  }
  if (
    (action === "verified_new" || action === "verified_match") &&
    evidenceTier === "C"
  ) {
    throw new Error("Una pista de nivel C no puede verificarse como nueva o coincidente.");
  }

  const reviewNote = requiredText(input.reviewNote, "La nota de revisión", 2_000);
  if (reviewNote.length < 3) {
    throw new Error("La nota de revisión debe tener al menos 3 caracteres.");
  }
  const matchedResidencialId =
    input.matchedResidencialId === undefined || input.matchedResidencialId === null || input.matchedResidencialId === ""
      ? null
      : requiredText(input.matchedResidencialId, "El residencial vinculado", 300);
  if (action === "verified_match" && !matchedResidencialId) {
    throw new Error("Una coincidencia verificada exige seleccionar un residencial existente.");
  }
  if (action === "verified_new" && matchedResidencialId) {
    throw new Error("Un establecimiento verificado como nuevo no puede vincularse a uno existente.");
  }

  const rawCorrections = record(input.corrections);
  const name = optionalCorrection(rawCorrections.name, "El nombre corregido", 300);
  const address = optionalCorrection(rawCorrections.address, "La dirección corregida", 500);
  const latitude = optionalCoordinate(rawCorrections.latitude, "La latitud", -90, 90);
  const longitude = optionalCoordinate(rawCorrections.longitude, "La longitud", -180, 180);
  if ((latitude === undefined) !== (longitude === undefined)) {
    throw new Error("Latitud y longitud deben corregirse juntas.");
  }
  const corrections = {};
  if (name !== undefined) corrections.name = name;
  if (address !== undefined) corrections.address = address;
  if (latitude !== undefined && longitude !== undefined) {
    corrections.latitude = latitude;
    corrections.longitude = longitude;
  }

  return {
    candidateId,
    action,
    status: STATUS_BY_ACTION[action],
    evidenceTier,
    reviewNote,
    matchedResidencialId,
    corrections,
  };
}
