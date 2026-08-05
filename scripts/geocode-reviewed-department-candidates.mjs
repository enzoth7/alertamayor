import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { ideQueryUrl, selectStrictIdeResult } from "./lib/ide-geocoding.mjs";
import { repairMojibakeDeep } from "./lib/text-encoding.mjs";

const USER_AGENT = "AlertaMayorDiscovery/1.0 (controlled IDE Uruguay geocoding; contacto: equipo@alertamayor.local)";

function argument(flag) {
  const index = process.argv.indexOf(flag);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`Falta ${flag}`);
  return process.argv[index + 1];
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`IDE respondiÃ³ HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

const sourcePaths = argument("--sources").split(",").map((value) => resolve(value.trim()));
const reviewPaths = argument("--reviews").split(",").map((value) => resolve(value.trim()));
const outputPath = resolve(argument("--output"));
if (sourcePaths.length !== reviewPaths.length) throw new Error("--sources y --reviews deben tener la misma cantidad de archivos.");
if (!process.argv.includes("--live") || !process.argv.includes("--acknowledge-ide")) {
  throw new Error("Se requieren --live y --acknowledge-ide.");
}

const candidates = [];
for (let index = 0; index < sourcePaths.length; index += 1) {
  const [source, review] = await Promise.all([
    readFile(sourcePaths[index], "utf8").then(JSON.parse),
    readFile(reviewPaths[index], "utf8").then(JSON.parse),
  ]);
  const records = new Map((source.records || []).map((record) => [record.candidate_key, record]));
  for (const decision of review.decisions || []) {
    if (decision.humanDecision !== "verified_new" || decision.eligibleForStep14 !== true) continue;
    const record = records.get(decision.candidateKey);
    if (!record?.address) continue;
    candidates.push({
      candidateKey: decision.candidateKey,
      name: record.observed_name,
      department: record.department,
      locality: record.locality,
      address: record.address,
      evidenceTier: decision.evidenceTier,
      reviewedBy: decision.reviewerIdentifier,
      reviewedAt: decision.reviewedAt,
    });
  }
}

const unique = [...new Map(candidates.map((candidate) => [candidate.candidateKey, candidate])).values()];
const results = [];
for (const candidate of unique) {
  const sourceUrl = ideQueryUrl(candidate);
  try {
    const response = await fetchJson(sourceUrl);
    const match = selectStrictIdeResult(response, candidate);
    results.push({
      ...candidate,
      sourceType: "ide_uy",
      sourceUrl,
      retrievedAt: new Date().toISOString(),
      sourceLicense: "IDE Uruguay API",
      status: match ? "strict_exact_pending_human_coordinate_review" : "needs_review",
      latitude: match?.puntoY ?? null,
      longitude: match?.puntoX ?? null,
      humanCoordinateReviewStatus: "pending",
      responseError: match ? null : "No hubo coincidencia estricta de puerta, localidad y departamento.",
    });
  } catch (error) {
    results.push({
      ...candidate,
      sourceType: "ide_uy",
      sourceUrl,
      retrievedAt: new Date().toISOString(),
      sourceLicense: "IDE Uruguay API",
      status: "error",
      latitude: null,
      longitude: null,
      humanCoordinateReviewStatus: "pending",
      responseError: error instanceof Error ? error.message : "Error desconocido",
    });
  }
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 300));
}

const report = {
  metadata: {
    generatedAt: new Date().toISOString(),
    source: "IDE Uruguay",
    sourceBaseUrl: "https://direcciones.ide.uy",
    scope: "Solo candidatos verified_new con evidencia A/B y direcciÃ³n independiente.",
    humanCoordinateReviewRequired: true,
    supabaseWrites: 0,
    publicResidencialesWrites: 0,
    automaticPublication: false,
  },
  summary: {
    queried: results.length,
    strictExactPendingHumanReview: results.filter((item) => item.status === "strict_exact_pending_human_coordinate_review").length,
    needsReview: results.filter((item) => item.status === "needs_review").length,
    errors: results.filter((item) => item.status === "error").length,
  },
  results,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(repairMojibakeDeep(report), null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output: outputPath, ...report.summary, supabaseWrites: 0, publicWrites: 0 }, null, 2));
