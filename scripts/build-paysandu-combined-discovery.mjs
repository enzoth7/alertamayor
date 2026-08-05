import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeAddress, similarity } from "../lib/facility-matching.mjs";
import { repairMojibake, repairMojibakeDeep } from "./lib/text-encoding.mjs";

const PROJECT_ROOT = fileURLToPath(new URL("..", import.meta.url));
const DISCOVERY_DIRECTORY = resolve(PROJECT_ROOT, "data", "discovery");
const REPORTS_DIRECTORY = resolve(PROJECT_ROOT, "data", "reports");
const SELECTED_DEPARTMENT = "Paysand\u00fa";

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--")) continue;
    const equals = argument.indexOf("=");
    if (equals >= 0) args[argument.slice(2, equals)] = argument.slice(equals + 1);
    else if (argv[index + 1] && !argv[index + 1].startsWith("--")) {
      args[argument.slice(2)] = argv[index + 1];
      index += 1;
    } else args[argument.slice(2)] = true;
  }
  return args;
}

function safeInput(value) {
  const path = resolve(PROJECT_ROOT, String(value));
  const relativePath = relative(PROJECT_ROOT, path);
  if (!relativePath || relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new Error(`Insumo fuera del workspace: ${value}`);
  }
  return path;
}

function safeOutput(value, root, extension) {
  const path = resolve(PROJECT_ROOT, String(value));
  const relativePath = relative(root, path);
  if (!relativePath || relativePath.startsWith("..") || isAbsolute(relativePath) || !path.endsWith(extension)) {
    throw new Error(`Salida invÃ¡lida: debe ser ${extension} dentro de ${relative(PROJECT_ROOT, root)}.`);
  }
  return path;
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function outsidePaysandu(address) {
  const normalized = text(address).toLocaleLowerCase("es-UY");
  return /argentina|buenos aires|entre r[iÃ­]os|departamento de (maldonado|tacuaremb[oÃ³]|r[iÃ­]o negro|treinta y tres|salto|montevideo|rocha)/.test(normalized);
}

function clearlyNotElepem(name) {
  const normalized = text(name).toLocaleLowerCase("es-UY");
  return /liceo|estudiantil|estudiantes|universitaria|pueblo universitario|municipio|ministerio|castillo|estancia|\blorenzo geyres\b|\btacuaremb[oÃ³]\b/.test(normalized);
}
void outsidePaysandu;
void clearlyNotElepem;

function outsideSelectedDepartment(address) {
  const normalized = text(address).toLocaleLowerCase("es-UY");
  return /argentina|buenos aires|entre r[i\u00ed]os|departamento de (maldonado|tacuaremb[o\u00f3]|r[i\u00ed]o negro|treinta y tres|salto|montevideo|rocha)/.test(normalized);
}

function incompatibleWithElepemScope(name) {
  const normalized = text(name).toLocaleLowerCase("es-UY");
  return /liceo|estudiantil|estudiantes|universitaria|pueblo universitario|municipio|ministerio|castillo|estancia|\blorenzo geyres\b|\btacuaremb[o\u00f3]\b/.test(normalized);
}

function bestSocialMatch(lead, socialRecords) {
  return socialRecords
    .map((record) => {
      const nameScore = similarity(lead.name, record.observed_name);
      const leftAddress = normalizeAddress(lead.address, { department: "PaysandÃº" });
      const rightAddress = normalizeAddress(record.address, record);
      const addressScore = leftAddress && rightAddress ? similarity(leftAddress, rightAddress) : 0;
      const exactDoor = (leftAddress.match(/\b\d{1,5}\b/g) || []).some((door) =>
        (rightAddress.match(/\b\d{1,5}\b/g) || []).includes(door),
      );
      return { record, nameScore, addressScore, exactDoor, score: Math.max(nameScore, exactDoor ? addressScore : 0) };
    })
    .sort((left, right) => right.score - left.score)[0];
}

function disposition(lead, socialRecords) {
  if (outsideSelectedDepartment(lead.address)) return { status: "outside_selected_department" };
  if (incompatibleWithElepemScope(lead.name)) return { status: "clearly_not_elepem" };
  const match = bestSocialMatch(lead, socialRecords);
  if (match && (match.nameScore >= 0.72 || (match.exactDoor && match.addressScore >= 0.82))) {
    return {
      status: "corroborates_public_social_lead",
      matched_candidate_key: match.record.candidate_key,
      match_basis: match.nameScore >= 0.84 ? "name_similarity" : "address_similarity_in_memory",
    };
  }
  return { status: "requires_independent_public_source" };
}

function markdown(summary, sourceHashes) {
  return `# ConsolidaciÃ³n conservadora de PaysandÃº\n\n` +
    `Fecha: 2026-08-04\n\n` +
    `Se evaluaron ${summary.serpapi_leads_assessed} pistas provenientes de resultados de mapas pÃºblicos preparados externamente y ${summary.public_social_records} registros de fuentes pÃºblicas de redes sociales.\n\n` +
    `## Resultado\n\n` +
    `- ${summary.corroborates_public_social_lead} pistas de mapas corroboran registros sociales ya documentados.\n` +
    `- ${summary.requires_independent_public_source} pistas quedan retenidas hasta obtener una fuente pÃºblica independiente.\n` +
    `- ${summary.outside_selected_department} resultados estaban fuera de PaysandÃº.\n` +
    `- ${summary.clearly_not_elepem} resultados eran incompatibles con el alcance ELEPEM.\n` +
    `- ${summary.operational_records} registros sociales continÃºan al matching; ningÃºn resultado exclusivo de Google/SerpAPI entra a Supabase.\n\n` +
    `No se copiaron a la salida operativa nombres exclusivos, direcciones, telÃ©fonos, coordenadas, reseÃ±as, estados, place_id ni URLs de fichas de Google. Los cruces se hicieron en memoria y se conservaron solo IDs internos, hashes y disposiciones.\n\n` +
    `## Trazabilidad\n\n` +
    `- Fuente social SHA-256: \`${sourceHashes.social}\`\n` +
    `- Fuente de mapas SHA-256: \`${sourceHashes.serpapi}\`\n` +
    `- PublicaciÃ³n automÃ¡tica: no.\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.social || !args.serpapi || !args.output || !args.report) {
    throw new Error("Faltan --social, --serpapi, --output o --report.");
  }
  const socialPath = safeInput(args.social);
  const serpapiPath = safeInput(args.serpapi);
  const outputPath = safeOutput(args.output, DISCOVERY_DIRECTORY, ".json");
  const reportPath = safeOutput(args.report, REPORTS_DIRECTORY, ".md");
  const [socialRaw, serpapiRaw] = await Promise.all([
    readFile(socialPath, "utf8"),
    readFile(serpapiPath, "utf8"),
  ]);
  const social = JSON.parse(socialRaw);
  const serpapi = JSON.parse(serpapiRaw);
  const records = Array.isArray(social.records) ? social.records : [];
  const leads = Array.isArray(serpapi.candidates) ? serpapi.candidates : [];
  const reconciliation = leads.map((lead) => ({
    restricted_lead_id: text(lead.id),
    restricted_record_sha256: hash(JSON.stringify(lead)),
    ...disposition(lead, records),
  }));
  const statusCounts = reconciliation.reduce((counts, item) => {
    counts[item.status] = (counts[item.status] || 0) + 1;
    return counts;
  }, {});
  const sourceHashes = { social: hash(socialRaw), serpapi: hash(serpapiRaw) };
  const summary = {
    public_social_records: records.length,
    serpapi_leads_assessed: leads.length,
    operational_records: records.length,
    ...Object.fromEntries([
      "corroborates_public_social_lead",
      "requires_independent_public_source",
      "outside_selected_department",
      "clearly_not_elepem",
    ].map((key) => [key, statusCounts[key] || 0])),
  };
  const output = {
    ...social,
    dataset: "paysandu_combined_conservative_discovery_2026-08-04",
    generated_at: "2026-08-04",
    department: "PaysandÃº",
    methodology: {
      source_families: ["public_social_sources", "public_maps_restricted_internal_leads"],
      localities_searched: ["PaysandÃº", "Nuevo PaysandÃº", "Porvenir", "Quebracho", "GuichÃ³n", "Tambores", "Lorenzo Geyres", "MoratÃ³"],
      google_maps_api_used: false,
      serpapi_policy: "Los resultados exclusivos se retienen fuera de records y Supabase hasta obtener una fuente independiente.",
    },
    combination_summary: summary,
    restricted_map_lead_reconciliation: reconciliation,
    unresolved_leads_not_imported: reconciliation
      .filter((item) => item.status !== "corroborates_public_social_lead")
      .map((item) => ({
        restricted_lead_id: item.restricted_lead_id,
        restricted_record_sha256: item.restricted_record_sha256,
        disposition: item.status,
        reason: item.status === "requires_independent_public_source"
          ? "Requiere una fuente pÃºblica independiente antes de normalizar nombre, direcciÃ³n o contacto."
          : item.status === "outside_selected_department"
            ? "Resultado fuera del departamento seleccionado."
            : "Resultado incompatible con el alcance ELEPEM.",
      })),
    input_manifest: [
      { role: "public_social_sources", path: relative(PROJECT_ROOT, socialPath).replaceAll("\\", "/"), sha256: sourceHashes.social },
      { role: "public_maps_restricted_internal_leads", path: relative(PROJECT_ROOT, serpapiPath).replaceAll("\\", "/"), sha256: sourceHashes.serpapi },
    ],
    records,
    automatic_publication: false,
  };
  output.department = SELECTED_DEPARTMENT;
  output.methodology.localities_searched = [
    SELECTED_DEPARTMENT, "Nuevo Paysand\u00fa", "Porvenir", "Quebracho", "Guich\u00f3n",
    "Tambores", "Lorenzo Geyres", "Morat\u00f3",
  ];
  await Promise.all([
    mkdir(dirname(outputPath), { recursive: true }),
    mkdir(dirname(reportPath), { recursive: true }),
  ]);
  const repairedOutput = repairMojibakeDeep(output);
  await Promise.all([
    writeFile(outputPath, `${JSON.stringify(repairedOutput, null, 2)}\n`, "utf8"),
    writeFile(reportPath, repairMojibake(markdown(summary, sourceHashes)), "utf8"),
  ]);
  console.log(JSON.stringify({ output: relative(PROJECT_ROOT, outputPath), report: relative(PROJECT_ROOT, reportPath), summary }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
