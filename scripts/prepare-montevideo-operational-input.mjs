import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { repairMojibakeDeep } from "./lib/text-encoding.mjs";

function argument(flag) {
  const index = process.argv.indexOf(flag);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`Falta ${flag}`);
  return process.argv[index + 1];
}

function publicUrl(value) {
  try {
    const parsed = new URL(value);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function independenceKey(source) {
  if (source.independent_family) return String(source.independent_family).trim().toLocaleLowerCase("es-UY");
  try {
    return new URL(source.url).hostname.replace(/^www\./, "").toLocaleLowerCase("en-US");
  } catch {
    return "";
  }
}

const inputPath = resolve(argument("--input"));
const outputPath = resolve(argument("--output"));
const raw = await readFile(inputPath, "utf8");
const document = JSON.parse(raw);
let separatedInternalReferences = 0;
let downgradedToC = 0;

const records = (document.records || []).map((record) => {
  const internalProjectReferences = [];
  const sources = (record.sources || []).filter((source) => {
    if (publicUrl(source.url)) return true;
    internalProjectReferences.push({
      source_type: source.source_type || null,
      title: source.title || null,
      local_path: source.local_path || null,
      observed_at: source.observed_at || null,
      claims: source.claims || [],
      limitations: source.limitations || null,
    });
    separatedInternalReferences += 1;
    return false;
  });
  const independentPublicSources = new Set(sources.map(independenceKey).filter(Boolean)).size;
  let evidenceTier = record.evidence_tier;
  if (evidenceTier === "B" && independentPublicSources < 2) {
    evidenceTier = "C";
    downgradedToC += 1;
  }
  if (evidenceTier === "A" && !sources.some((source) => /official|msp|mides|pacp|gub\.uy/i.test(`${source.source_type || ""} ${source.url || ""}`))) {
    evidenceTier = independentPublicSources >= 2 ? "B" : "C";
    downgradedToC += 1;
  }
  return {
    ...record,
    evidence_tier: evidenceTier,
    sources,
    internal_project_references: internalProjectReferences,
  };
});

const output = {
  ...document,
  dataset: "montevideo_operational_candidates_2026-08-04",
  operational_derivation: {
    source_file: inputPath,
    source_sha256: createHash("sha256").update(raw).digest("hex"),
    separated_internal_project_references: separatedInternalReferences,
    evidence_tiers_downgraded_to_c: downgradedToC,
    policy: "Solo URLs pÃºblicas HTTP(S) se consideran fuentes importables; las rutas del Ã­ndice quedan como referencias internas no independientes.",
    automatic_publication: false,
  },
  records,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(repairMojibakeDeep(output), null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output: outputPath, records: records.length, separatedInternalReferences, downgradedToC }, null, 2));
