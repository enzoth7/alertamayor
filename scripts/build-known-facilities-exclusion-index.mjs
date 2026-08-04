import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildKnownFacilitiesExclusionIndex,
  conflictsToCsv,
  validateKnownFacilitiesExclusionIndex,
} from "./lib/known-facilities-exclusion.mjs";
import { parseArgs, uruguayDateStamp } from "./lib/discovery-files.mjs";

const PROJECT_ROOT = fileURLToPath(new URL("..", import.meta.url));
const EXCLUSION_DIRECTORY = resolve(PROJECT_ROOT, "data", "exclusion");

const DEFAULTS = Object.freeze({
  officialEntities: "data/reference/elepem_publicos_v01.csv",
  sourceRecords: "data/reference/registros_fuente_v01.csv",
  officialPdf: "data/reference/ELEPEM_HABILITADOS_JUNIO_2026.pdf",
  legacySnapshot: "data/discovery/normalized-backfill-source-2026-08-03.json",
  facilityMappings: "data/migration/facility_id_mapping_2026-08-03.csv",
  backfillConflicts: "data/migration/supabase_backfill_conflicts_2026-08-03.csv",
  osmDocument: "data/discovery/osm-elepem-candidates-2026-08-02.json",
  osmReview: "data/discovery/osm-candidate-review-2026-08-02.json",
  paysandu: "data/discovery/instagram_paysandu_candidates_2026-08-02.json",
  artigas: "data/discovery/artigas_department_elepem_public_candidates_2026-08-02.json",
});

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function safeInputPath(value) {
  const path = resolve(PROJECT_ROOT, String(value));
  const relativePath = relative(PROJECT_ROOT, path);
  if (!relativePath || relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new Error(`Insumo fuera del workspace: ${value}`);
  }
  return path;
}

function outputPath(value, extension) {
  const path = resolve(PROJECT_ROOT, String(value));
  const relativePath = relative(EXCLUSION_DIRECTORY, path);
  if (!relativePath || relativePath.startsWith("..") || isAbsolute(relativePath) || !path.endsWith(extension)) {
    throw new Error(`Salida inválida: debe ser ${extension} dentro de data/exclusion/.`);
  }
  return path;
}

async function readInput(path, type) {
  const resolved = safeInputPath(path);
  const [content, details] = await Promise.all([readFile(resolved, type === "pdf" ? undefined : "utf8"), stat(resolved)]);
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
  return {
    path: resolved,
    relativePath: relative(PROJECT_ROOT, resolved).replaceAll("\\", "/"),
    value: type === "json" ? JSON.parse(content) : type === "pdf" ? null : content,
    sha256: sha256(buffer),
    bytes: details.size,
    modifiedAt: details.mtime.toISOString(),
  };
}

function extractPdfText(pdfPath, pythonBinary) {
  const extractor = String(pythonBinary || process.env.PDF_PYTHON_BIN || "python");
  const script = [
    "from pypdf import PdfReader",
    "import sys",
    "reader = PdfReader(sys.argv[1])",
    "print('\\n'.join((page.extract_text() or '') for page in reader.pages))",
  ].join("; ");
  try {
    return execFileSync(extractor, ["-c", script, pdfPath], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 30_000,
      windowsHide: true,
    });
  } catch (error) {
    throw new Error(`No se pudo extraer texto del PDF con ${extractor}. Configure --pdf-python-bin con Python+pypdf. ${error instanceof Error ? error.message : ""}`);
  }
}

async function writeAtomically(path, content) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  try {
    await writeFile(temporary, content, "utf8");
    await rm(path, { force: true });
    await rename(temporary, path);
  } finally {
    await rm(temporary, { force: true });
  }
}

function auditMarkdown({ index, validation, conflicts, inputs }) {
  const departments = Object.entries(validation.counts.departments).sort(([left], [right]) => left.localeCompare(right, "es-UY"));
  const conflictTypes = Object.entries(conflicts.reduce((summary, conflict) => {
    summary[conflict.conflict_type] = (summary[conflict.conflict_type] || 0) + 1;
    return summary;
  }, {})).sort(([left], [right]) => left.localeCompare(right));
  return `# Auditoría del índice nacional de exclusión\n\n` +
    `Generado: ${index.metadata.generated_at}\n\n` +
    `- Alcance: provisional, privado y sin publicación automática.\n` +
    `- Fuente operativa: snapshot de Supabase de solo lectura más mapping legado→canónico; esta ejecución no afirma ser una exportación literal de la vista normalizada.\n` +
    `- Política de merge: IDs y decisiones revisadas explícitas; nunca nombre solo.\n` +
    `- Entradas: ${inputs.length}; cada una tiene hash SHA-256 y fecha de modificación.\n` +
    `- PDF: ${index.metadata.pdf.numbered_line_candidates} candidatos de línea numerada en la extracción, ${index.metadata.pdf.extraction_contamination_signals.length} señales de contaminación de extracción, revisión visual: ${index.metadata.pdf.visual_reviewed ? "sí" : "no"}.\n` +
    `- Contactos sociales: teléfonos no retenidos hasta clasificación humana de contacto institucional.\n\n` +
    `## Conteos\n\n` +
    `| Métrica | Cantidad |\n|---|---:|\n` +
    `| Entradas | ${validation.counts.entries} |\n` +
    `| Sedes conocidas | ${validation.counts.known_facilities} |\n` +
    `| Candidatos privados | ${validation.counts.private_candidates} |\n` +
    `| Conflictos | ${validation.counts.conflicts} |\n\n` +
    `## Por departamento\n\n| Departamento | Entradas |\n|---|---:|\n${departments.map(([department, count]) => `| ${department} | ${count} |`).join("\n")}\n\n` +
    `## Conflictos\n\n| Tipo | Cantidad |\n|---|---:|\n${conflictTypes.map(([type, count]) => `| ${type} | ${count} |`).join("\n")}\n\n` +
    `## Validación\n\n` +
    `${validation.valid ? "JSON válido, IDs únicos, procedencia presente y sin candidatos publicados." : `Errores: ${validation.errors.join("; ")}`}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const date = String(args.date || uruguayDateStamp());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("--date debe usar AAAA-MM-DD.");
  const inputs = await Promise.all([
    readInput(args["official-entities"] || DEFAULTS.officialEntities, "csv"),
    readInput(args["source-records"] || DEFAULTS.sourceRecords, "csv"),
    readInput(args["official-pdf"] || DEFAULTS.officialPdf, "pdf"),
    readInput(args["legacy-snapshot"] || DEFAULTS.legacySnapshot, "json"),
    readInput(args["facility-mappings"] || DEFAULTS.facilityMappings, "csv"),
    readInput(args["backfill-conflicts"] || DEFAULTS.backfillConflicts, "csv"),
    readInput(args.osm || DEFAULTS.osmDocument, "json"),
    readInput(args["osm-review"] || DEFAULTS.osmReview, "json"),
    readInput(args.paysandu || DEFAULTS.paysandu, "json"),
    readInput(args.artigas || DEFAULTS.artigas, "json"),
  ]);
  const [officialEntities, sourceRecords, officialPdf, legacySnapshot, facilityMappings, backfillConflicts, osmDocument, osmReview, paysandu, artigas] = inputs;
  const pdfText = extractPdfText(officialPdf.path, args["pdf-python-bin"]);
  const inputManifest = inputs.map((input) => ({
    path: input.relativePath,
    sha256: input.sha256,
    bytes: input.bytes,
    modified_at: input.modifiedAt,
  }));
  const { index, conflicts } = buildKnownFacilitiesExclusionIndex({
    officialEntities: officialEntities.value,
    sourceRecords: sourceRecords.value,
    legacySnapshot: legacySnapshot.value,
    facilityMappings: facilityMappings.value,
    backfillConflicts: backfillConflicts.value,
    osmDocument: osmDocument.value,
    osmReview: osmReview.value,
    paysanduDocument: paysandu.value,
    artigasDocument: artigas.value,
    pdfText,
    generatedAt: new Date().toISOString(),
    inputManifest,
    pdfVisualReviewed: args["pdf-visual-reviewed"] === true,
  });
  const validation = validateKnownFacilitiesExclusionIndex(index, conflicts);
  if (!validation.valid) throw new Error(`Índice inválido: ${validation.errors.join("; ")}`);
  const indexPath = outputPath(args.output || `data/exclusion/known_facilities_exclusion_index_${date}.json`, ".json");
  const conflictPath = outputPath(args.conflicts || `data/exclusion/known_facilities_exclusion_conflicts_${date}.csv`, ".csv");
  const auditPath = outputPath(args.audit || `data/exclusion/known_facilities_exclusion_audit_${date}.md`, ".md");
  await Promise.all([
    writeAtomically(indexPath, `${JSON.stringify(index, null, 2)}\n`),
    writeAtomically(conflictPath, conflictsToCsv(conflicts)),
    writeAtomically(auditPath, auditMarkdown({ index, validation, conflicts, inputs: inputManifest })),
  ]);
  console.log(JSON.stringify({
    outputs: {
      index: relative(PROJECT_ROOT, indexPath).replaceAll("\\", "/"),
      conflicts: relative(PROJECT_ROOT, conflictPath).replaceAll("\\", "/"),
      audit: relative(PROJECT_ROOT, auditPath).replaceAll("\\", "/"),
    },
    counts: validation.counts,
    pdf: index.metadata.pdf,
    automaticPublication: false,
    supabaseWrites: 0,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
