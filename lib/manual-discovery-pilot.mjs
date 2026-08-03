import { readFile } from "node:fs/promises";
import { join } from "node:path";

const INPUT_FILES = Object.freeze([
  "artigas_department_elepem_public_candidates_2026-08-02.json",
  "instagram_paysandu_candidates_2026-08-02.json",
]);
const GEOCODING_FILE = "manual-ide-geocoding-2026-08-02.json";
const MANUAL_CONFIRMATION_REQUIRED = new Set(["instagram:paysandu:colibri"]);

function record(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function text(value, maximum = 500) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function hasCoordinates(value) {
  const row = record(value);
  const latitude = Number(row.latitude ?? row.lat);
  const longitude = Number(row.longitude ?? row.lng ?? row.lon);
  return Number.isFinite(latitude) && latitude >= -90 && latitude <= 90
    && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
}

export function manualDiscoveryPilotRecords(documents, geocodingResults = []) {
  const exactCoordinates = new Map((Array.isArray(geocodingResults) ? geocodingResults : [])
    .filter((item) => item?.status === "exact" && Number.isFinite(item.latitude) && Number.isFinite(item.longitude))
    .map((item) => [item.candidateKey, item]));
  const rows = documents.flatMap((document, documentIndex) => {
    const input = record(document);
    const dataset = text(input.dataset, 160) || `dataset-${documentIndex + 1}`;
    const retrievedAt = text(input.generated_at, 40);
    const candidates = Array.isArray(input.records) ? input.records : [];
    return candidates.map((value) => ({ value: record(value), dataset, retrievedAt }));
  });

  return rows
    .filter(({ value }) => text(value.candidate_key, 360) && text(value.observed_name, 300))
    .filter(({ value }) => !text(value.map_action, 200).startsWith("do_not_create_new"))
    .map(({ value, dataset, retrievedAt }) => {
      const candidateKey = text(value.candidate_key, 360);
      const geocoded = exactCoordinates.get(candidateKey);
      const mayMap = !MANUAL_CONFIRMATION_REQUIRED.has(candidateKey);
      return ({
      candidateKey,
      name: text(value.observed_name, 300),
      department: text(value.department, 100) || "Sin departamento",
      locality: text(value.locality, 160) || "Sin localidad",
      address: text(value.address, 500) || null,
      coordinateStatus: text(value.coordinate_status, 160) || "sin coordenadas verificadas",
      mapAction: text(value.map_action, 200),
      reviewStatus: text(value.review_status, 120) || "needs_review",
      evidenceTier: ["A", "B", "C"].includes(value.evidence_tier) ? value.evidence_tier : "C",
      historical: text(value.classification, 160).startsWith("historical_or_moved"),
      hasCoordinates: mayMap && (hasCoordinates(value) || Boolean(geocoded)),
      latitude: mayMap && geocoded ? geocoded.latitude : null,
      longitude: mayMap && geocoded ? geocoded.longitude : null,
      geocodingSourceUrl: geocoded?.sourceUrl || null,
      dataset,
      retrievedAt,
      });
    })
    .sort((left, right) => left.department.localeCompare(right.department, "es")
      || left.locality.localeCompare(right.locality, "es")
      || left.name.localeCompare(right.name, "es"));
}

export async function loadManualDiscoveryPilot(rootDirectory) {
  const documents = await Promise.all(INPUT_FILES.map(async (file) => {
    const path = join(rootDirectory, "data", "discovery", file);
    return JSON.parse(await readFile(path, "utf8"));
  }));
  let geocodingResults = [];
  try {
    const geocoding = JSON.parse(await readFile(join(rootDirectory, "data", "discovery", GEOCODING_FILE), "utf8"));
    geocodingResults = Array.isArray(geocoding.results) ? geocoding.results : [];
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  const candidates = manualDiscoveryPilotRecords(documents, geocodingResults);
  return {
    candidates,
    summary: {
      inputFiles: INPUT_FILES.length,
      candidatesWithoutCoordinates: candidates.filter((candidate) => !candidate.hasCoordinates).length,
      candidatesWithCoordinates: candidates.filter((candidate) => candidate.hasCoordinates).length,
      historicalReviewOnly: candidates.filter((candidate) => candidate.historical).length,
    },
  };
}
