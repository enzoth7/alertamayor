import { createHash } from "node:crypto";
import {
  classifyFacilityMatch,
  normalizeAddress,
  normalizePhone,
  normalizeText,
  rankFacilityMatches,
} from "../../lib/facility-matching.mjs";
import { matchingFacilityRelation } from "../../lib/elepem-data-source.mjs";

const EXPECTED_OFFICIAL_MATCHES = new Set([
  "residencia san cono",
  "carpe diem",
  "hogar de ancianos enrique chaplin",
  "casa provenza",
]);

const NO_MAP_WITHOUT_CONFIRMATION = new Set([
  "instagram:paysandu:bellanova",
  "instagram:paysandu:casa-betel",
  "instagram:paysandu:colibri",
]);

function record(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function text(value, maximum = 1_000) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function texts(value) {
  return (Array.isArray(value) ? value : []).map((item) => text(item, 300)).filter(Boolean);
}

function url(value) {
  const candidate = text(value, 1_000);
  try {
    const parsed = new URL(candidate);
    return ["https:", "http:"].includes(parsed.protocol) ? parsed.toString() : "";
  } catch {
    return "";
  }
}

function instagramUrl(value) {
  const parsed = url(value);
  if (!parsed) return "";
  const host = new URL(parsed).hostname.toLowerCase();
  return host === "instagram.com" || host.endsWith(".instagram.com") ? parsed : "";
}

function coordinate(value, minimum, maximum) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

function candidatePhones(value) {
  return texts(value).map(normalizePhone).filter(Boolean);
}

function matchableTarget(value, fallbackId) {
  const row = record(value);
  return {
    id: text(row.id || row.candidate_key || row.source_record_key || fallbackId, 360),
    name: text(row.name || row.normalized_name, 300),
    aliases: texts(row.aliases),
    department: text(row.department || row.normalized_department, 100),
    locality: text(row.locality || row.normalized_locality, 160),
    address: text(row.address || row.normalized_address, 500),
    phone: text(row.phone, 120),
    lat: coordinate(row.latitude ?? row.lat, -90, 90),
    lng: coordinate(row.longitude ?? row.lng, -180, 180),
  };
}

function matchCandidate(recordValue, targets, targetType) {
  const phones = candidatePhones(recordValue.phones);
  const candidate = {
    name: recordValue.observedName,
    aliases: recordValue.aliases,
    department: recordValue.department,
    locality: recordValue.locality,
    address: recordValue.address,
    lat: recordValue.latitude,
    lng: recordValue.longitude,
  };
  const variants = phones.length ? phones : [""];
  const merged = new Map();
  for (const phone of variants) {
    for (const item of rankFacilityMatches({ ...candidate, phone }, targets, 3)) {
      const previous = merged.get(item.facility.id);
      if (!previous || item.score > previous.score) merged.set(item.facility.id, item);
    }
  }
  return [...merged.values()]
    .sort((left, right) => right.score - left.score || left.facility.id.localeCompare(right.facility.id))
    .slice(0, 3)
    .map((item) => ({
      targetType,
      targetId: item.facility.id,
      name: item.facility.name,
      department: item.facility.department || null,
      locality: item.facility.locality || null,
      address: item.facility.address || null,
      score: item.score,
      classification: classifyFacilityMatch(item),
      components: {
        exactNormalizedPhone: item.phoneExact,
        phoneConflict: item.phoneConflict,
        departmentMatch: item.departmentMatch,
        departmentConflict: item.departmentConflict,
        streetSimilarity: item.streetScore,
        streetContainment: item.streetContainment,
        doorNumberMatch: item.doorNumberMatch,
        doorNumberConflict: item.doorNumberConflict,
        nameSimilarity: item.nameScore,
        aliasMatch: item.aliasMatch,
        geographicDistanceMeters: item.distanceMeters,
      },
    }));
}

function sourcePlan(row) {
  const source = row.sources.find((item) => item.type === "instagram_public_profile") || {};
  const observedAt = text(source.observed_at, 20) || row.datasetDate;
  return {
    sourceType: "social_public_url",
    sourceRecordKey: row.candidateKey,
    sourceUrl: row.instagramUrl,
    retrievedAt: observedAt,
    sourceDate: observedAt || null,
    sourceLicense: null,
    storagePolicy: "reference_only",
    rawMetadataStoragePermitted: false,
    rawMetadata: null,
    humanNote: text(row.notes, 500) || "URL pública curada manualmente; requiere revisión humana.",
    recordHash: row.recordHash,
  };
}

function validateOne(value, datasetDate, index) {
  const source = record(value);
  const issues = [];
  const candidateKey = text(source.candidate_key, 360);
  const observedName = text(source.observed_name, 300);
  const department = text(source.department, 100);
  const locality = text(source.locality, 160);
  const address = text(source.address, 500) || null;
  const profileUrl = instagramUrl(source.instagram_url);
  const sources = Array.isArray(source.sources) ? source.sources.map(record) : [];
  const sourceProfile = sources.find((item) => item.type === "instagram_public_profile");
  const phones = texts(source.phones);
  const aliases = texts(source.aliases);
  const latitude = coordinate(source.latitude, -90, 90);
  const longitude = coordinate(source.longitude, -180, 180);

  if (!candidateKey) issues.push("candidate_key ausente o inválido");
  if (!observedName) issues.push("observed_name ausente");
  if (!department) issues.push("department ausente");
  if (!locality) issues.push("locality ausente");
  if (!profileUrl) issues.push("instagram_url debe ser una URL pública de Instagram https");
  if (!sourceProfile) issues.push("falta una fuente instagram_public_profile");
  if (source.do_not_publish_automatically !== true) issues.push("do_not_publish_automatically debe ser true");
  if ((latitude === null) !== (longitude === null)) issues.push("las coordenadas deben incluir latitud y longitud juntas");
  if (source.evidence_tier && !["A", "B", "C"].includes(source.evidence_tier)) issues.push("evidence_tier inválido");

  const hashPayload = {
    candidateKey,
    observedName,
    department,
    locality,
    address,
    phones,
    instagramUrl: profileUrl,
    sources: sources.map((item) => ({ type: text(item.type, 80), url: url(item.url), observedAt: text(item.observed_at, 20) })),
  };
  return {
    index,
    candidateKey,
    observedName,
    aliases,
    department,
    locality,
    address,
    phones,
    instagramUrl: profileUrl,
    sources,
    classification: text(source.classification, 100),
    evidenceTier: ["A", "B", "C"].includes(source.evidence_tier) ? source.evidence_tier : "C",
    reviewStatus: text(source.review_status, 80) || "needs_review",
    coordinateStatus: text(source.coordinate_status, 100),
    mapAction: text(source.map_action, 120),
    notes: text(source.notes, 500),
    datasetDate,
    latitude,
    longitude,
    recordHash: createHash("sha256").update(JSON.stringify(hashPayload)).digest("hex"),
    issues,
  };
}

export function validateSocialCandidateDataset(input) {
  const document = record(input);
  const records = Array.isArray(document.records) ? document.records : [];
  const datasetDate = text(document.generated_at, 40);
  const documentIssues = [];
  if (!text(document.dataset, 160)) documentIssues.push("dataset ausente");
  if (!datasetDate) documentIssues.push("generated_at ausente");
  if (!Array.isArray(document.records)) documentIssues.push("records debe ser un array");
  if (Number.isInteger(document.record_count) && document.record_count !== records.length) {
    documentIssues.push("record_count no coincide con records.length");
  }
  const parsed = records.map((row, index) => validateOne(row, datasetDate, index));
  const duplicateKeys = parsed
    .filter((row) => row.candidateKey)
    .filter((row, index, all) => all.findIndex((item) => item.candidateKey === row.candidateKey) !== index)
    .map((row) => row.candidateKey);
  if (duplicateKeys.length) documentIssues.push(`candidate_key duplicado: ${[...new Set(duplicateKeys)].join(", ")}`);
  const duplicatePhysicalAddresses = parsed
    .filter((row) => row.address)
    .reduce((result, row) => {
      const key = `${normalizeText(row.department)}|${normalizeText(row.locality)}|${normalizeAddress(row.address, row)}`;
      const group = result.get(key) || [];
      group.push(row.candidateKey);
      result.set(key, group);
      return result;
    }, new Map());
  const addressCollisions = [...duplicatePhysicalAddresses.values()].filter((keys) => keys.length > 1);
  return {
    dataset: text(document.dataset, 160),
    generatedAt: datasetDate,
    validRecords: parsed.filter((row) => row.issues.length === 0),
    malformedRecords: parsed.filter((row) => row.issues.length > 0).map((row) => ({
      index: row.index,
      candidateKey: row.candidateKey || null,
      issues: row.issues,
    })),
    documentIssues,
    addressCollisions,
  };
}

export function buildSocialCandidateDryRun({ input, publicFacilities = [], privateCandidates = [], sourceObservations = [], osmCandidates = [] }) {
  const validation = validateSocialCandidateDataset(input);
  const publicTargets = publicFacilities.map((row, index) => matchableTarget(row, `public-${index}`)).filter((row) => row.id && row.name);
  const privateTargets = privateCandidates.map((row, index) => matchableTarget(row, `candidate-${index}`)).filter((row) => row.id && row.name);
  const observationTargets = sourceObservations.map((row, index) => matchableTarget(row, `observation-${index}`)).filter((row) => row.id && row.name);
  const osmTargets = osmCandidates.map((row, index) => matchableTarget(row, `osm-${index}`)).filter((row) => row.id && row.name);

  const records = validation.validRecords.map((row) => {
    const publicMatches = matchCandidate(row, publicTargets, "public_residenciales");
    const privateMatches = matchCandidate(row, privateTargets, "facility_candidates");
    const observationMatches = matchCandidate(row, observationTargets, "facility_source_observations");
    const osmMatches = matchCandidate(row, osmTargets, "osm_cached_candidates");
    const bestPublic = publicMatches[0] || null;
    const expectedOfficial = EXPECTED_OFFICIAL_MATCHES.has(normalizeText(row.observedName));
    const exactOfficial = bestPublic?.classification === "probable_match";
    const duplicatePrivate = [...privateMatches, ...observationMatches, ...osmMatches]
      .find((match) => match.classification === "probable_match") || null;
    const mapBlocked = NO_MAP_WITHOUT_CONFIRMATION.has(row.candidateKey) || row.latitude === null || row.longitude === null;
    const requiresAddressConfirmation = row.candidateKey === "instagram:paysandu:colibri";
    const action = exactOfficial
      ? "link_social_source_to_existing_official"
      : duplicatePrivate
        ? "link_social_source_to_existing_private_candidate"
        : "create_private_candidate_needs_review";
    return {
      candidateKey: row.candidateKey,
      observed: {
        name: row.observedName,
        address: row.address,
        phones: row.phones,
        department: row.department,
        locality: row.locality,
        retrievedAt: row.datasetDate,
        instagramUrl: row.instagramUrl,
      },
      validationIssues: row.issues,
      expectedOfficialMatch: expectedOfficial,
      publicMatches,
      exactOfficialMatch: exactOfficial ? bestPublic : null,
      probableOfficialMatch: !exactOfficial && bestPublic?.classification !== "new_candidate" ? bestPublic : null,
      privateMatches,
      observationMatches,
      osmMatches,
      addressConflict: Boolean(bestPublic?.components?.doorNumberConflict) || validation.addressCollisions.some((keys) => keys.includes(row.candidateKey)),
      phoneConflict: Boolean(bestPublic?.components?.phoneConflict),
      lacksCoordinates: row.latitude === null || row.longitude === null,
      requiresManualAddressConfirmation: requiresAddressConfirmation,
      mapEligibleAfterReview: !mapBlocked && !requiresAddressConfirmation,
      proposedAction: action,
      proposedStatus: exactOfficial ? null : "needs_review",
      proposedEvidenceTier: "C",
      sourceObservation: sourcePlan(row),
    };
  });

  const exactMatches = records.filter((row) => row.exactOfficialMatch);
  const probableMatches = records.filter((row) => row.probableOfficialMatch);
  const unmatched = records.filter((row) => !row.exactOfficialMatch && !row.probableOfficialMatch && !row.privateMatches.some((match) => match.classification === "probable_match"));
  const applyPlan = {
    sourceObservations: records.map((row) => row.sourceObservation),
    candidateUpserts: records.filter((row) => row.proposedAction === "create_private_candidate_needs_review").map((row) => ({
      candidateKey: row.candidateKey,
      status: "needs_review",
      evidenceTier: "C",
      publicEligible: false,
      coordinates: null,
      mapEligibleAfterReview: row.mapEligibleAfterReview,
    })),
    existingOfficialLinks: exactMatches.map((row) => ({
      residencialId: row.exactOfficialMatch.targetId,
      provider: "other",
      externalId: row.candidateKey,
      externalUrl: row.observed.instagramUrl,
      linkMethod: "source_observation",
    })),
  };
  return {
    metadata: {
      schemaVersion: 1,
      sourceDataset: validation.dataset,
      generatedAt: new Date().toISOString(),
      dryRun: true,
      noInstagramRequests: true,
      noPublicResidencialesWrites: true,
      socialStoragePolicy: "reference_only",
      comparisonTargetCounts: {
        publicFacilities: publicTargets.length,
        privateCandidates: privateTargets.length,
        sourceObservations: observationTargets.length,
        cachedOsmCandidates: osmTargets.length,
      },
      phoneComparisonCoverage: {
        publicFacilitiesWithPhone: publicTargets.filter((row) => normalizePhone(row.phone)).length,
        privateCandidatesWithPhone: privateTargets.filter((row) => normalizePhone(row.phone)).length,
        sourceObservationsWithPhone: observationTargets.filter((row) => normalizePhone(row.phone)).length,
        cachedOsmCandidatesWithPhone: osmTargets.filter((row) => normalizePhone(row.phone)).length,
      },
      warning: "Los datos sociales son pistas C; el informe no verifica, publica ni modifica registros oficiales.",
    },
    validation: {
      documentIssues: validation.documentIssues,
      malformedRecords: validation.malformedRecords,
      duplicatePhysicalAddressGroups: validation.addressCollisions,
    },
    summary: {
      inputRecords: Array.isArray(record(input).records) ? record(input).records.length : 0,
      validRecords: records.length,
      exactMatches: exactMatches.length,
      probableMatches: probableMatches.length,
      unmatched: unmatched.length,
      addressConflicts: records.filter((row) => row.addressConflict).length,
      phoneConflicts: records.filter((row) => row.phoneConflict).length,
      lackingCoordinates: records.filter((row) => row.lacksCoordinates).length,
      mapEligibleNow: records.filter((row) => row.mapEligibleAfterReview).length,
      wouldCreatePrivateCandidates: applyPlan.candidateUpserts.length,
      wouldLinkExistingOfficialRecords: applyPlan.existingOfficialLinks.length,
    },
    records,
    applyPlan,
  };
}

export function socialDryRunReadSql(dataSource = "legacy") {
  const publicFacilities = dataSource === "normalized"
    ? `select
         exclusion.subject_id as id,
         exclusion.name,
         exclusion.department,
         exclusion.locality,
         exclusion.address,
         facility.lat,
         facility.lng
       from ${matchingFacilityRelation(dataSource)} as exclusion
       join public.facilities_current_internal as facility
         on facility.facility_key = exclusion.subject_id
       where exclusion.subject_type = 'normalized_facility'
       order by exclusion.subject_id`
    : `select id, name, department, locality, address, lat, lng
       from ${matchingFacilityRelation(dataSource)}
       order by id`;

  return Object.freeze({
    publicFacilities,
    privateCandidates: `select id::text, candidate_key, normalized_name, normalized_department, normalized_locality, normalized_address, lat, lng from discovery_private.facility_candidates order by id`,
    sourceObservations: `select id::text, source_record_key, normalized_name, normalized_department, normalized_locality, normalized_address, lat, lng from discovery_private.facility_source_observations where source_type = 'openstreetmap' order by id`,
  });
}

export const SOCIAL_DRY_RUN_READ_SQL = socialDryRunReadSql("legacy");
