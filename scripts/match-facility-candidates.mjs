import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  classifyFacilityMatch,
  normalizeText,
  rankFacilityMatches,
} from "../lib/facility-matching.mjs";

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--")) continue;
    const equals = argument.indexOf("=");
    if (equals >= 0) {
      args[argument.slice(2, equals)] = argument.slice(equals + 1);
    } else if (argv[index + 1] && !argv[index + 1].startsWith("--")) {
      args[argument.slice(2)] = argv[index + 1];
      index += 1;
    } else {
      args[argument.slice(2)] = true;
    }
  }
  return args;
}

function text(value, maxLength = 1_000) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function finiteNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function record(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function values(value) {
  return Array.isArray(value) ? value : [];
}

function firstText(valuesToCheck, maxLength = 1_000) {
  for (const value of valuesToCheck) {
    const result = text(value, maxLength);
    if (result) return result;
  }
  return "";
}

function observedValues(value) {
  return values(value)
    .map((item) => typeof item === "string" ? item : record(item).value)
    .map((item) => text(item, 500))
    .filter(Boolean);
}

function facility(value) {
  const row = record(value);
  const address = record(values(row.addresses)[0]);
  const coordinates = record(values(row.coordinates)[0]);
  const phones = values(record(row.contacts).phones);
  const emails = values(record(row.contacts).emails);
  const domains = values(record(row.contacts).domains);
  return {
    id: firstText([row.exclusion_id, row.entity_id, row.id, row.candidate_key, row.candidateKey], 300),
    name: firstText([row.canonical_name, row.observed_name, row.name], 300),
    aliases: [
      ...observedValues(row.names),
      ...observedValues(row.aliases),
      ...observedValues(row.historical_names),
    ],
    candidateKeys: values(row.candidate_keys).map((item) => text(item, 360)).filter(Boolean),
    subjectType: text(row.subject_type, 80) || null,
    department: firstText([row.department, address.department], 100),
    locality: firstText([row.locality, address.locality], 160),
    address: firstText([row.address, address.address, address.address_line], 500),
    phones: [
      ...values(row.phones),
      row.phone,
      ...phones.map((item) => record(item).value),
    ].map((item) => text(item, 100)).filter(Boolean),
    emails: [
      ...values(row.emails),
      row.email,
      ...emails.map((item) => record(item).value),
    ].map((item) => text(item, 300)).filter(Boolean),
    domains: [
      ...values(row.domains),
      row.website,
      ...domains.map((item) => record(item).value),
    ].map((item) => text(item, 500)).filter(Boolean),
    socialUrls: [
      ...values(row.social_urls),
      row.instagram_url,
      row.facebook_url,
    ].map((item) => typeof item === "string" ? text(item, 1_000) : text(record(item).url, 1_000)).filter(Boolean),
    externalIds: values(row.external_ids)
      .map((item) => `${text(record(item).provider, 80)}:${text(record(item).external_id, 360)}`)
      .filter((item) => !item.endsWith(":")),
    lat: finiteNumber(row.latitude ?? row.lat ?? coordinates.lat ?? coordinates.latitude),
    lng: finiteNumber(row.longitude ?? row.lng ?? coordinates.lng ?? coordinates.longitude),
  };
}

function candidateRows(value) {
  if (Array.isArray(value)) return value;
  const root = record(value);
  if (Array.isArray(root.candidates)) return root.candidates;
  if (Array.isArray(root.facilities)) return root.facilities;
  if (Array.isArray(root.records)) return root.records;
  if (Array.isArray(root.entries)) return root.entries;
  return [];
}

function localCandidateId(row) {
  const existing = firstText([row.candidate_key, row.candidateKey, row.id], 360);
  if (existing) return existing;
  const fingerprint = JSON.stringify([
    text(row.sourceRecordKey || row.externalId, 300),
    text(row.name, 300),
    text(row.department, 100),
    text(row.address, 500),
  ]);
  return `LOCAL-${createHash("sha256").update(fingerprint).digest("hex").slice(0, 16)}`;
}

function sourceReferences(row) {
  const origins = Array.isArray(row.origins)
    ? row.origins
    : Array.isArray(row.sources)
      ? row.sources
      : [];
  const references = origins.map((value) => {
    const origin = record(value);
    const sourceType = text(origin.sourceType || origin.source_type || origin.type || origin.source, 80);
    const externalUrl = text(origin.externalUrl || origin.external_url || origin.sourceUrl || origin.source_url || origin.url, 1_000);
    const fingerprint = `${sourceType} ${externalUrl}`.toLocaleLowerCase("es-UY");
    const sourceChannel = /\bmsp\b|\bmides\b|ministerio[-_ ](?:de[-_ ])?salud[-_ ]publica|ministerio[-_ ](?:de[-_ ])?desarrollo[-_ ]social/.test(fingerprint)
      ? "official"
      : /public_map|map_directory|maptons|openstreetmap|\bosm\b|google.*maps|maps\.google|serpapi|waze|apple.?maps|overture/.test(fingerprint)
        ? "public_maps"
        : /instagram|facebook|social/.test(fingerprint)
          ? "social_public"
          : "other_public";
    return {
      sourceChannel,
      sourceType: sourceType || null,
      sourceRecordKey: text(origin.sourceRecordKey || origin.reference_key, 300) || null,
      externalId: text(origin.externalId || origin.external_id, 300) || null,
      externalUrl: externalUrl || null,
      retrievedAt:
        text(origin.retrievedAt || origin.retrieved_at || origin.observed_at || origin.discoveredAt || row.retrievedAt || row.generated_at || row.discoveredAt, 80) ||
        null,
    };
  });

  if (references.length > 0) return references;
  return [
    {
      sourceType: text(row.sourceType || row.source, 80) || null,
      sourceRecordKey: text(row.sourceRecordKey, 300) || null,
      externalId: text(row.externalId, 300) || null,
      externalUrl: text(row.externalUrl || row.sourceUrl, 1_000) || null,
      retrievedAt: text(row.retrievedAt || row.discoveredAt, 80) || null,
    },
  ];
}

function matchedCandidate(value, existingFacilities, limit) {
  const row = record(value);
  const normalized = facility(row);
  const candidateId = localCandidateId(row);
  const inputClassification = text(row.classification, 160);
  const exclusionReference = text(row.exclusion_index_match, 500);
  const exclusionDetail = record(row.exclusion_index_match_detail);
  const detailExclusionIds = [
    ...(Array.isArray(exclusionDetail.exact_name_ids) ? exclusionDetail.exact_name_ids : []),
    ...(Array.isArray(exclusionDetail.exact_address_ids) ? exclusionDetail.exact_address_ids : []),
  ].map((value) => text(value, 300)).filter(Boolean);
  const explicitExclusionIds = [
    exclusionReference.match(/EXC-(?:CANDIDATE|OFFICIAL)-[A-Z0-9-]+/i)?.[0],
    ...detailExclusionIds,
  ].filter(Boolean);
  const alreadyKnownEntries = existingFacilities.filter((item) =>
    item.id === candidateId || item.candidateKeys.includes(candidateId));
  const comparisonPool = existingFacilities.filter((item) =>
    item.id !== candidateId && !item.candidateKeys.includes(candidateId));
  const matches = rankFacilityMatches(normalized, comparisonPool, limit);
  const explicitEntry = explicitExclusionIds
    .map((id) => existingFacilities.find((item) => item.id === id))
    .find((item) => item && item.subjectType !== "private_candidate" &&
      (!normalized.department || !item.department ||
        normalizeText(item.department) === normalizeText(normalized.department))) || null;
  const explicitExclusionId = explicitEntry?.id || null;
  const explicitMatch = explicitEntry
    ? rankFacilityMatches(normalized, [explicitEntry], 1)[0]
    : null;
  const classifiedStatus = classifyFacilityMatch(matches[0]);
  const automaticStatus = classifiedStatus === "probable_match" &&
    matches[0]?.facility.subjectType === "private_candidate"
    ? "possible_match"
    : classifiedStatus;
  const references = sourceReferences(row).map((reference, index) => ({
    ...reference,
    sourceRole: index === 0 ? "discovery_origin" : "corroboration",
  }));
  let reviewDisposition = automaticStatus === "probable_match"
    ? "probable_known_match"
    : automaticStatus === "possible_match"
      ? "possible_known_match"
      : "probable_new";
  if (["false_positive", "not_elepem", "needs_more_evidence", "address_missing", "possible_move_or_rebrand"].includes(inputClassification)) {
    reviewDisposition = inputClassification;
  } else if (inputClassification === "historical_or_moved_candidate") {
    reviewDisposition = "possible_move_or_rebrand";
  } else if (["historical_only", "social_candidate_possible_historical"].includes(inputClassification)) {
    reviewDisposition = explicitEntry || automaticStatus === "probable_match"
      ? "historical_known_match"
      : "historical_unresolved";
  } else if (inputClassification === "known_exact_match") {
    reviewDisposition = explicitEntry ? "probable_known_match" : "exclusion_index_gap";
  } else if (inputClassification === "probable_existing_official_match" && automaticStatus !== "probable_match") {
    reviewDisposition = "exclusion_index_gap";
  }
  return {
    id: candidateId,
    name: normalized.name,
    department: normalized.department || null,
    locality: normalized.locality || null,
    address: normalized.address || null,
    inputClassification: inputClassification || null,
    inputReviewStatus: text(row.review_status || row.reviewStatus, 120) || null,
    inputMapAction: text(row.map_action || row.mapAction, 200) || null,
    historicalInput: /^(historical_only|historical_or_moved|social_candidate_possible_historical)/.test(
      text(row.classification, 160),
    ),
    lat: normalized.lat,
    lng: normalized.lng,
    sourceReferences: references,
    alreadyInExclusionIndex: alreadyKnownEntries.length > 0,
    existingExclusionIds: alreadyKnownEntries.map((item) => item.id),
    explicitExclusionReference: explicitExclusionId,
    explicitReferencedMatch: explicitMatch ? {
      residencialId: explicitMatch.facility.id,
      name: explicitMatch.facility.name,
      score: explicitMatch.score,
      subjectType: explicitMatch.facility.subjectType,
    } : null,
    matchStatus: automaticStatus,
    reviewDisposition,
    suggestedResidencialId: matches[0]?.score >= 0.62 ? matches[0].facility.id : null,
    matches: matches.map((match) => ({
      residencialId: match.facility.id,
      name: match.facility.name,
      score: match.score,
      nameScore: match.nameScore,
      addressScore: match.addressScore,
      localityScore: match.localityScore,
      proximityScore: match.proximityScore,
      distanceMeters: match.distanceMeters,
      departmentConflict: match.departmentConflict,
      phoneExact: match.phoneExact,
      emailExact: match.emailExact,
      domainExact: match.domainExact,
      socialUrlExact: match.socialUrlExact,
      externalIdExact: match.externalIdExact,
      doorNumberConflict: match.doorNumberConflict,
      subjectType: match.facility.subjectType,
    })),
    requiresHumanReview: true,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.apply) {
    throw new Error("Este utilitario es solo local y no admite --apply.");
  }
  if (!args.input) {
    throw new Error("Falta --input=ruta/candidates.json.");
  }

  const inputPath = resolve(String(args.input));
  const existingPath = resolve(
    String(args.existing || "data/discovery/residenciales-live-2026-08-02.json"),
  );
  const limit = Math.min(Math.max(Number(args.limit) || 3, 1), 10);
  const [input, existing] = await Promise.all([
    readFile(inputPath, "utf8").then(JSON.parse),
    readFile(existingPath, "utf8").then(JSON.parse),
  ]);
  const existingFacilities = candidateRows(existing)
    .map(facility)
    .filter((row) => row.id && row.name);
  const candidates = candidateRows(input)
    .map((row) => matchedCandidate(row, existingFacilities, limit))
    .filter((row) => row.name);

  const result = {
    metadata: {
      generatedAt: new Date().toISOString(),
      inputFile: inputPath,
      existingFile: existingPath,
      existingCount: existingFacilities.length,
      candidateCount: candidates.length,
      localOnly: true,
      sourceRolePolicy:
        "La primera referencia del insumo se conserva como origen de descubrimiento; las siguientes son corroboraciones.",
      warning:
        "Las coincidencias son sugerencias. No acreditan que el lugar sea un ELEPEM ni autorizan su publicación.",
    },
    candidates,
  };

  if (args.out) {
    const outputPath = resolve(String(args.out));
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    console.log(`Resultado local: ${outputPath}`);
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
