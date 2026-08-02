import { createHash } from "node:crypto";
import {
  classifyFacilityMatch,
  normalizeText,
  rankFacilityMatches,
} from "../../lib/facility-matching.mjs";

function record(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function text(value, maximum = 1_000) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function finiteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function splitAliases(...values) {
  const aliases = values.flatMap((value) =>
    Array.isArray(value) ? value : typeof value === "string" ? value.split(";") : [],
  );
  return [...new Set(aliases.map((value) => text(value, 300)).filter(Boolean))];
}

export function candidateRows(value) {
  if (Array.isArray(value)) return value;
  const root = record(value);
  if (Array.isArray(root.candidates)) return root.candidates;
  return [];
}

export function existingRows(value) {
  if (Array.isArray(value)) return value;
  const root = record(value);
  if (Array.isArray(root.facilities)) return root.facilities;
  return [];
}

export function matchableFacility(value, { candidate = false } = {}) {
  const row = record(value);
  const tags = record(row.originalTags);
  return {
    id: text(row.entity_id || row.id || row.sourceRecordKey || row.externalId, 300),
    name: text(row.name, 300),
    aliases: splitAliases(
      row.aliases,
      candidate ? tags.alt_name : null,
      candidate ? tags.old_name : null,
      candidate ? tags.short_name : null,
    ),
    department: text(row.department, 100),
    locality: text(row.locality, 160),
    address: text(row.address, 500),
    phone: text(row.phone, 120),
    lat: finiteNumber(row.latitude ?? row.lat),
    lng: finiteNumber(row.longitude ?? row.lng),
  };
}

export function localCandidateKey(value) {
  const row = record(value);
  const sourceRecordKey = text(row.sourceRecordKey || row.externalId, 300);
  if (sourceRecordKey) return `openstreetmap:${sourceRecordKey}`;
  const fingerprint = JSON.stringify([
    text(row.name, 300),
    text(row.department, 100),
    text(row.address, 500),
    finiteNumber(row.latitude ?? row.lat),
    finiteNumber(row.longitude ?? row.lng),
  ]);
  return `openstreetmap:local-${createHash("sha256")
    .update(fingerprint)
    .digest("hex")
    .slice(0, 24)}`;
}

function sourceReference(value) {
  const row = record(value);
  return {
    sourceType: text(row.sourceType, 80) || "openstreetmap",
    sourceRecordKey: text(row.sourceRecordKey, 300) || null,
    externalId: text(row.externalId, 300) || null,
    externalUrl: text(row.externalUrl, 1_000) || null,
    sourceLicense: text(row.sourceLicense, 160) || null,
    attribution: text(row.attribution, 200) || null,
    retrievedAt: text(row.retrievedAt, 80) || null,
  };
}

function explainMatch(match) {
  return {
    residencialId: match.facility.id,
    name: match.facility.name,
    department: match.facility.department || null,
    locality: match.facility.locality || null,
    address: match.facility.address || null,
    score: match.score,
    components: {
      exactNormalizedPhone: match.phoneExact,
      phoneConflict: match.phoneConflict,
      departmentMatch: match.departmentMatch,
      departmentConflict: match.departmentConflict,
      localitySimilarity: match.localityScore,
      streetSimilarity: match.streetScore,
      doorNumberMatch: match.doorNumberMatch,
      doorNumberConflict: match.doorNumberConflict,
      nameSimilarity: match.nameScore,
      aliasMatch: match.aliasMatch,
      genericName: match.genericName,
      geographicDistanceMeters: match.distanceMeters,
      geographicProximityScore: match.proximityScore,
      strongIdentitySignal: match.hasStrongIdentity,
    },
  };
}

export function matchCandidate(value, facilities, limit = 3) {
  const row = record(value);
  const candidate = matchableFacility(row, { candidate: true });
  const matches = rankFacilityMatches(candidate, facilities, limit);
  const bestMatch = matches[0];
  const matchStatus = classifyFacilityMatch(bestMatch);
  return {
    candidateKey: localCandidateKey(row),
    name: candidate.name || null,
    aliases: candidate.aliases,
    department: candidate.department || null,
    locality: candidate.locality || null,
    address: candidate.address || null,
    phone: candidate.phone || null,
    website: text(row.website, 1_000) || null,
    latitude: candidate.lat,
    longitude: candidate.lng,
    source: sourceReference(row),
    matchStatus,
    suggestedResidencialId:
      matchStatus === "new_candidate" ? null : bestMatch?.facility.id || null,
    bestMatchScore: bestMatch?.score ?? null,
    matches: matches.map(explainMatch),
    requiresHumanReview: true,
    reviewDecision: "pending",
  };
}

export function validateDiscoveryDocuments(input, existing) {
  const inputMetadata = record(record(input).metadata);
  const existingMetadata = record(record(existing).metadata);
  const candidates = candidateRows(input);
  const facilities = existingRows(existing);
  if (inputMetadata.sourceType !== "openstreetmap") {
    throw new Error("El input no declara sourceType=openstreetmap.");
  }
  if (inputMetadata.attribution !== "© OpenStreetMap contributors") {
    throw new Error("El input no conserva la atribución requerida de OSM.");
  }
  if (!inputMetadata.candidateOnly || inputMetadata.writesPublicResidenciales !== false) {
    throw new Error("El input no está marcado como candidate-only.");
  }
  if (existingMetadata.sourceTable !== "public.residenciales" || !existingMetadata.readOnly) {
    throw new Error("El archivo existing no es una exportación de solo lectura.");
  }
  if (candidates.length === 0) throw new Error("El input no contiene candidatos.");
  if (facilities.length === 0) throw new Error("El archivo existing no contiene residenciales.");
  return { inputMetadata, existingMetadata, candidates, facilities };
}

export function buildCandidateReview(input, existing, { generatedAt = new Date().toISOString(), limit = 3 } = {}) {
  const validated = validateDiscoveryDocuments(input, existing);
  const facilities = validated.facilities
    .map((value) => matchableFacility(value))
    .filter((facility) => facility.id && facility.name);
  const candidates = validated.candidates.map((value) =>
    matchCandidate(value, facilities, limit),
  );
  const counts = Object.fromEntries(
    ["probable_match", "possible_match", "new_candidate"].map((status) => [
      status,
      candidates.filter((candidate) => candidate.matchStatus === status).length,
    ]),
  );
  return {
    metadata: {
      schemaVersion: 1,
      generatedAt,
      candidateCount: candidates.length,
      existingCount: facilities.length,
      matchLimit: limit,
      counts,
      dryRunByDefault: true,
      requiresHumanReview: true,
      writesPublicResidenciales: false,
      warning:
        "Las coincidencias son sugerencias explicables; no verifican ni publican establecimientos.",
    },
    candidates,
  };
}

export function normalizedObservation(value) {
  const row = record(value);
  const sourceRecordKey = text(row.sourceRecordKey || row.externalId, 300);
  const normalized = {
    sourceRecordKey,
    sourceUrl: text(row.externalUrl, 1_000),
    retrievedAt: text(row.retrievedAt, 80),
    sourceLicense: text(row.sourceLicense, 160) || null,
    normalizedName: normalizeText(row.name) || null,
    normalizedDepartment: normalizeText(row.department) || null,
    normalizedLocality: normalizeText(row.locality) || null,
    normalizedAddress: normalizeText(row.address) || null,
    lat: finiteNumber(row.latitude ?? row.lat),
    lng: finiteNumber(row.longitude ?? row.lng),
  };
  const hashInput = {
    ...normalized,
    operator: text(row.operator, 300) || null,
    phone: text(row.phone, 120) || null,
    website: text(row.website, 1_000) || null,
    originalTags: record(row.originalTags),
  };
  return {
    ...normalized,
    recordHash: createHash("sha256")
      .update(JSON.stringify(hashInput))
      .digest("hex"),
  };
}

export function privateCandidateRows(input, review) {
  const originals = new Map(
    candidateRows(input).map((row) => [localCandidateKey(row), row]),
  );
  return review.candidates.map((candidate) => {
    const original = originals.get(candidate.candidateKey);
    const observation = normalizedObservation(original);
    return {
      ...observation,
      candidateKey: candidate.candidateKey,
      candidateName: observation.normalizedName,
      candidateDepartment: observation.normalizedDepartment,
      candidateLocality: observation.normalizedLocality,
      candidateAddress: observation.normalizedAddress,
      candidateStatus:
        candidate.matchStatus === "new_candidate" ? "needs_review" : "possible_match",
      bestMatchResidencialId: candidate.suggestedResidencialId,
      bestMatchScore: candidate.bestMatchScore,
      externalId: text(record(original).externalId || observation.sourceRecordKey, 300),
      externalUrl: observation.sourceUrl,
    };
  });
}
