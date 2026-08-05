import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { classifyFacilityMatch, normalizeText, rankFacilityMatches } from "../lib/facility-matching.mjs";

const inputPath = new URL("../data/reference/ELEPEM_CERTIFICADOS_ENERO_2026.md", import.meta.url);
const reportPath = new URL("../data/reports/mides_certificates_january_2026_comparison.json", import.meta.url);
const apiUrl = process.env.RESIDENCIALES_API_URL || "http://localhost:3000/api/residenciales";

const departments = new Map([
  ["artigas", "Artigas"], ["canelones", "Canelones"], ["cerro largo", "Cerro Largo"],
  ["colonia", "Colonia"], ["durazno", "Durazno"], ["flores", "Flores"],
  ["florida", "Florida"], ["lavalleja", "Lavalleja"], ["maldonado", "Maldonado"],
  ["montevideo", "Montevideo"], ["paysandu", "Paysandú"], ["rio negro", "Río Negro"],
  ["rivera", "Rivera"], ["rocha", "Rocha"], ["salto", "Salto"],
  ["san jose", "San José"], ["soriano", "Soriano"], ["tacuarembo", "Tacuarembó"],
  ["treinta y tres", "Treinta y Tres"],
]);

function canonicalDepartment(value) {
  return departments.get(normalizeText(value)) || "";
}

function parseMarkdown(markdown) {
  const rows = [];
  const discarded = [];
  let department = "";
  for (const [index, rawLine] of markdown.split(/\r?\n/).entries()) {
    const line = rawLine.trim();
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      department = canonicalDepartment(heading[1]);
      continue;
    }
    if (!line.includes("\t")) continue;
    const columns = rawLine.split("\t").map((value) => value.trim());
    if (normalizeText(columns[0]) === "localidad") continue;
    if (!department || columns.length < 4 || !columns[1]) {
      discarded.push({ line: index + 1, reason: "invalid_table_row", raw: rawLine });
      continue;
    }
    const [locality, name, street, door = "", phone = ""] = columns;
    const address = [street, door].filter((value) => value && normalizeText(value) !== "s n").join(" ").trim();
    rows.push({
      sourceLine: index + 1,
      department,
      locality,
      name,
      street,
      door,
      address,
      phone,
    });
  }
  return { rows, discarded };
}

function identityKey(row) {
  return [normalizeText(row.department), normalizeText(row.name), normalizeText(row.address)].join(":");
}

function explain(match) {
  if (!match) return null;
  return {
    residencialId: match.facility.id,
    name: match.facility.name,
    department: match.facility.department,
    locality: match.facility.locality,
    address: match.facility.address,
    score: match.score,
    nameScore: match.nameScore,
    streetScore: match.streetScore,
    doorNumberMatch: match.doorNumberMatch,
    doorNumberConflict: match.doorNumberConflict,
    localityScore: match.localityScore,
  };
}

const markdown = await readFile(inputPath, "utf8");
const sourceHash = createHash("sha256").update(markdown).digest("hex");
const parsed = parseMarkdown(markdown);
const byIdentity = new Map();
const internalDuplicates = [];
for (const row of parsed.rows) {
  const key = identityKey(row);
  if (byIdentity.has(key)) internalDuplicates.push({ duplicate: row, first: byIdentity.get(key) });
  else byIdentity.set(key, row);
}
const uniqueRows = [...byIdentity.values()];

const response = await fetch(apiUrl, { headers: { accept: "application/json" } });
if (!response.ok) throw new Error(`Residenciales API returned ${response.status}.`);
const payload = await response.json();
const publicRows = Array.isArray(payload) ? payload : payload.facilities;
if (!Array.isArray(publicRows)) throw new Error("Residenciales API did not return facilities.");

const matchablePublicRows = publicRows.map((row) => ({
  id: row.id,
  name: row.name,
  aliases: [],
  department: row.department,
  locality: row.locality,
  address: row.address,
  phone: "",
  lat: row.lat,
  lng: row.lng,
}));

function deterministicMatch(source) {
  const sameDepartment = publicRows.filter(
    (row) => normalizeText(row.department) === normalizeText(source.department),
  );
  const exactName = sameDepartment.filter(
    (row) => normalizeText(row.name) === normalizeText(source.name),
  );
  if (exactName.length === 1) return { row: exactName[0], method: "exact_department_name" };

  const meaningfulAddress = normalizeText(source.address);
  if (meaningfulAddress) {
    const exactAddress = sameDepartment.filter(
      (row) => normalizeText(row.address) === meaningfulAddress,
    );
    if (exactAddress.length === 1) return { row: exactAddress[0], method: "exact_department_address" };
  }
  return null;
}

const comparisons = uniqueRows.map((source) => {
  const deterministic = deterministicMatch(source);
  const matches = rankFacilityMatches({
    id: `source-line-${source.sourceLine}`,
    name: source.name,
    aliases: [],
    department: source.department,
    locality: source.locality,
    address: source.address,
    phone: source.phone,
    lat: null,
    lng: null,
  }, matchablePublicRows, 3);
  const matchStatus = classifyFacilityMatch(matches[0]);
  const suggested = deterministic?.row
    || (matchStatus === "probable_match" ? matches[0]?.facility : null);
  const existing = suggested ? publicRows.find((row) => row.id === suggested.id) : null;
  return {
    source,
    matchStatus: deterministic ? "probable_match" : matchStatus,
    matchMethod: deterministic?.method || (matchStatus === "probable_match" ? "scored_probable_match" : null),
    suggestedResidencialId: suggested?.id || null,
    currentlyCertified: existing?.midesSocial === true,
    matches: matches.map(explain),
  };
});

const acceptedIds = new Set(comparisons.map((row) => row.suggestedResidencialId).filter(Boolean));
const currentCertified = publicRows.filter((row) => row.midesSocial);
const retained = comparisons.filter((row) => row.suggestedResidencialId && row.currentlyCertified);
const additionsToExisting = comparisons.filter((row) => row.suggestedResidencialId && !row.currentlyCertified);
const uncertain = comparisons.filter((row) => !row.suggestedResidencialId);
const removals = currentCertified.filter((row) => !acceptedIds.has(row.id));

const report = {
  generatedAt: new Date().toISOString(),
  dryRun: true,
  source: {
    operationalPath: "data/reference/ELEPEM_CERTIFICADOS_ENERO_2026.md",
    immutableOriginalPath: "Base de Datos/Fuentes oficiales/ELEPEM CERTIFICADOS ENERO 2026.md",
    sha256: sourceHash,
    classification: "official",
    referenceDate: "2026-01",
  },
  counts: {
    sourceRowsRead: parsed.rows.length,
    sourceRowsUnique: uniqueRows.length,
    internalDuplicates: internalDuplicates.length,
    discarded: parsed.discarded.length,
    currentPublicFacilities: publicRows.length,
    currentlyCertified: currentCertified.length,
    retainedCertified: retained.length,
    additionsToExistingFacilities: additionsToExisting.length,
    uncertainOrNew: uncertain.length,
    removalsFromCurrentCertificateSet: removals.length,
  },
  internalDuplicates,
  discarded: parsed.discarded,
  retained,
  additionsToExisting,
  uncertain,
  removals: removals.map(({ id, name, department, locality, address }) => ({ id, name, department, locality, address })),
  warning: "Dry-run only. Probable matches are suggestions until the replacement set and ambiguous rows are reviewed.",
};

await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report.counts, null, 2));
