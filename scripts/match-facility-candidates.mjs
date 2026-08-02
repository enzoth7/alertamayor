import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  classifyFacilityMatch,
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

function facility(value) {
  const row = record(value);
  return {
    id: text(row.entity_id || row.id, 300),
    name: text(row.name, 300),
    department: text(row.department, 100),
    locality: text(row.locality, 160),
    address: text(row.address, 500),
    lat: finiteNumber(row.latitude ?? row.lat),
    lng: finiteNumber(row.longitude ?? row.lng),
  };
}

function candidateRows(value) {
  if (Array.isArray(value)) return value;
  const root = record(value);
  if (Array.isArray(root.candidates)) return root.candidates;
  if (Array.isArray(root.facilities)) return root.facilities;
  return [];
}

function localCandidateId(row) {
  const existing = text(row.id, 100);
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
  const origins = Array.isArray(row.origins) ? row.origins : [];
  const references = origins.map((value) => {
    const origin = record(value);
    return {
      sourceType: text(origin.sourceType || origin.source, 80) || null,
      sourceRecordKey: text(origin.sourceRecordKey, 300) || null,
      externalId: text(origin.externalId, 300) || null,
      externalUrl: text(origin.externalUrl || origin.sourceUrl, 1_000) || null,
      retrievedAt:
        text(origin.retrievedAt || origin.discoveredAt || row.retrievedAt || row.discoveredAt, 80) ||
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
  const matches = rankFacilityMatches(normalized, existingFacilities, limit);
  return {
    id: localCandidateId(row),
    name: normalized.name,
    department: normalized.department || null,
    locality: normalized.locality || null,
    address: normalized.address || null,
    lat: normalized.lat,
    lng: normalized.lng,
    sourceReferences: sourceReferences(row),
    matchStatus: classifyFacilityMatch(matches[0]),
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
    String(args.existing || "Alerta_Mayor_ELEPEM_v01/data/elepem_publicos_v01.json"),
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
