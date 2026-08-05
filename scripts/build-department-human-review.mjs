import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = fileURLToPath(new URL("..", import.meta.url));
const REPORTS_DIRECTORY = resolve(PROJECT_ROOT, "data", "reports");

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

function record(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function text(value, maximum = 2_000) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function sourceIndependenceKey(value) {
  const source = record(value);
  const explicit = text(source.independent_family, 160).toLocaleLowerCase("es-UY");
  if (explicit) return explicit;
  try {
    return new URL(text(source.url, 1_000)).hostname.replace(/^www\./, "").toLocaleLowerCase("en-US");
  } catch {
    return "";
  }
}

function isMspOrMidesSource(value) {
  const source = record(value);
  const fingerprint = `${text(source.source_type, 120)} ${text(source.url, 1_000)}`.toLocaleLowerCase("es-UY");
  return /\bmsp\b|\bmides\b|ministerio[-_ ](?:de[-_ ])?salud[-_ ]publica|ministerio[-_ ](?:de[-_ ])?desarrollo[-_ ]social/.test(fingerprint);
}

function effectiveEvidenceTier(source) {
  const sources = Array.isArray(source.sources) ? source.sources : [];
  if (source.evidence_tier === "A" && sources.some(isMspOrMidesSource)) return "A";
  const independent = new Set(sources.map(sourceIndependenceKey).filter(Boolean));
  if (["A", "B"].includes(source.evidence_tier) && independent.size >= 2) return "B";
  return "C";
}

function safeInput(value) {
  const path = resolve(PROJECT_ROOT, String(value));
  const relativePath = relative(PROJECT_ROOT, path);
  if (!relativePath || relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new Error(`Insumo fuera del workspace: ${value}`);
  }
  return path;
}

function safeOutput(value, extension) {
  const path = resolve(PROJECT_ROOT, String(value));
  const relativePath = relative(REPORTS_DIRECTORY, path);
  if (!relativePath || relativePath.startsWith("..") || isAbsolute(relativePath) || !path.endsWith(extension)) {
    throw new Error(`La salida debe ser ${extension} dentro de data/reports/.`);
  }
  return path;
}

function csvCell(value) {
  const raw = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(raw) ? `"${raw.replaceAll('"', '""')}"` : raw;
}

function recommendation(candidate, source, evidenceTier = effectiveEvidenceTier(source)) {
  const disposition = text(candidate.reviewDisposition, 80);
  if (disposition === "probable_new" && ["A", "B"].includes(evidenceTier)) {
    return {
      recommendedAction: "verified_new",
      requiresSecondResearch: false,
      rationale: "La pista tiene evidencia A/B y no presenta una coincidencia fuerte; requiere confirmación humana final.",
    };
  }
  if (disposition === "probable_known_match") {
    return {
      recommendedAction: "link_existing_after_id_resolution",
      requiresSecondResearch: false,
      rationale: candidate.explicitExclusionReference
        ? "Existe una referencia explícita en el índice; resolver el ID canónico antes de vincular."
        : "El matching encontró una coincidencia fuerte; confirmar el ID canónico antes de vincular.",
    };
  }
  if (disposition === "historical_known_match") {
    return {
      recommendedAction: "link_existing_after_id_resolution",
      requiresSecondResearch: false,
      rationale: "La referencia es exclusivamente histórica y coincide con una sede conocida; vincular la observación sin crear un candidato actual.",
    };
  }
  if (disposition === "historical_unresolved") {
    return {
      recommendedAction: "needs_more_evidence",
      requiresSecondResearch: true,
      rationale: "La referencia es exclusivamente histórica y no permite afirmar actividad actual ni resolver una sede conocida.",
    };
  }
  if (disposition === "exclusion_index_gap") {
    return {
      recommendedAction: "repair_exclusion_index",
      requiresSecondResearch: false,
      rationale: "Las fuentes oficiales indican una sede conocida que falta en el índice; no debe tratarse como descubrimiento nuevo.",
    };
  }
  if (["false_positive", "not_elepem"].includes(disposition)) {
    return {
      recommendedAction: "rejected",
      requiresSecondResearch: false,
      rationale: disposition === "false_positive"
        ? "El insumo la identifica como falso positivo fuera del alcance."
        : "El insumo la identifica como un servicio que no es ELEPEM.",
    };
  }
  return {
    recommendedAction: "needs_more_evidence",
    requiresSecondResearch: true,
    rationale: disposition === "possible_move_or_rebrand"
      ? "Resolver continuidad, mudanza, cambio de operador o reutilización del domicilio."
      : disposition === "address_missing"
        ? "Obtener una dirección física exacta y una fuente institucional o independiente."
        : "La evidencia C no permite verificar la pista como nueva o coincidente.",
  };
}

function buildReview(sourceDocument, matchingDocument, {
  generatedAt,
  department,
  acceptRecommendations = false,
  reviewerIdentifier = null,
}) {
  const sourceRows = Array.isArray(sourceDocument.records) ? sourceDocument.records : [];
  const sourceByKey = new Map(sourceRows.map((row) => [text(row.candidate_key, 360), record(row)]));
  const matchRows = Array.isArray(matchingDocument.candidates) ? matchingDocument.candidates : [];
  const decisions = matchRows.map((candidateValue) => {
    const candidate = record(candidateValue);
    const source = sourceByKey.get(text(candidate.id, 360)) || {};
    const evidenceTier = effectiveEvidenceTier(source);
    const proposed = recommendation(candidate, source, evidenceTier);
    const humanDecision = acceptRecommendations ? proposed.recommendedAction : null;
    const eligibleForStep14 = acceptRecommendations && [
      "verified_new",
      "needs_more_evidence",
    ].includes(humanDecision);
    return {
      candidateKey: text(candidate.id, 360),
      name: text(candidate.name, 300) || null,
      department: text(candidate.department, 100) || department,
      locality: text(candidate.locality, 160) || null,
      address: text(candidate.address, 500) || null,
      evidenceTier,
      currentDisposition: text(candidate.reviewDisposition, 80),
      recommendedAction: proposed.recommendedAction,
      recommendationRationale: proposed.rationale,
      requiresSecondResearch: proposed.requiresSecondResearch,
      proposedMatchId: text(candidate.explicitExclusionReference || candidate.suggestedResidencialId, 300) || null,
      sourceChannels: [...new Set((candidate.sourceReferences || []).map((item) => text(item.sourceChannel, 80)).filter(Boolean))],
      sourceCount: Array.isArray(source.sources) ? source.sources.length : 0,
      reviewNotes: text(source.review_notes, 2_000) || null,
      humanDecision,
      reviewerIdentifier: acceptRecommendations ? reviewerIdentifier : null,
      reviewerNote: acceptRecommendations
        ? "Recomendación conservadora aceptada explícitamente por la persona responsable del proyecto."
        : null,
      reviewedAt: acceptRecommendations ? generatedAt : null,
      eligibleForStep14,
    };
  });
  const counts = Object.fromEntries(
    [...new Set(decisions.map((item) => item.recommendedAction))]
      .sort()
      .map((action) => [action, decisions.filter((item) => item.recommendedAction === action).length]),
  );
  return {
    metadata: {
      schemaVersion: 1,
      generatedAt,
      department,
      dryRun: true,
      humanDecisionsRecorded: acceptRecommendations ? decisions.length : 0,
      reviewerIdentifier: acceptRecommendations ? reviewerIdentifier : null,
      supabaseWrites: 0,
      publicWrites: 0,
      automaticPublication: false,
      warning: acceptRecommendations
        ? "Las decisiones habilitan únicamente operaciones privadas expresamente marcadas; nunca publicación automática."
        : "Las recomendaciones no son decisiones humanas y no habilitan importación ni publicación.",
    },
    summary: {
      records: decisions.length,
      requiresSecondResearch: decisions.filter((item) => item.requiresSecondResearch).length,
      eligibleForStep14: decisions.filter((item) => item.eligibleForStep14).length,
      recommendedActions: counts,
    },
    decisions,
  };
}

function reviewCsv(review) {
  const columns = [
    "candidate_key", "name", "locality", "address", "evidence_tier",
    "current_disposition", "recommended_action", "requires_second_research",
    "proposed_match_id", "source_channels", "source_count", "recommendation_rationale",
    "human_decision", "reviewer_identifier", "reviewer_note", "reviewed_at",
  ];
  const rows = review.decisions.map((item) => [
    item.candidateKey, item.name, item.locality, item.address, item.evidenceTier,
    item.currentDisposition, item.recommendedAction, item.requiresSecondResearch,
    item.proposedMatchId, item.sourceChannels.join("|"), item.sourceCount,
    item.recommendationRationale, item.humanDecision, item.reviewerIdentifier,
    item.reviewerNote, item.reviewedAt,
  ]);
  return `${[columns, ...rows].map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
}

function researchMarkdown(review) {
  const unresolved = review.decisions.filter((item) => item.requiresSecondResearch);
  return `# Segunda investigación focalizada — ${review.metadata.department}\n\n` +
    `Fecha del paquete: ${review.metadata.generatedAt}\n\n` +
    `Investiga únicamente los siguientes ${unresolved.length} candidatos no resueltos. ` +
    `No agregues candidatos nuevos fuera de esta lista.\n\n` +
    `Para cada uno, busca por nombre exacto, teléfonos públicos, dirección, correo, ` +
    `usuarios, nombres anteriores, actividad reciente, posibles mudanzas, cambios de ` +
    `operador y sedes relacionadas. Conserva URL, fecha, afirmación y limitación. ` +
    `No recopiles datos de residentes y no infieras estado administrativo por ausencia ` +
    `de una lista.\n\n` +
    unresolved.map((item, index) =>
      `${index + 1}. **${item.name}** (${item.locality || "localidad pendiente"})\n` +
      `   - candidate_key: \`${item.candidateKey}\`\n` +
      `   - dirección observada: ${item.address || "sin dirección exacta"}\n` +
      `   - motivo: ${item.recommendationRationale}\n`,
    ).join("\n") +
    `\nEntrega una resolución por candidate_key con fuentes y una de estas salidas: ` +
    `probable_new_current, probable_known_match, possible_move_or_rebrand, ` +
    `needs_more_evidence, historical_only, false_positive o not_elepem.\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.apply) throw new Error("Este utilitario no admite --apply.");
  if (!args.input || !args.matching || !args.department || !args.output || !args.csv || !args.research) {
    throw new Error("Faltan --input, --matching, --department, --output, --csv o --research.");
  }
  const acceptRecommendations = args["accept-recommendations"] === true;
  const reviewerIdentifier = text(args.reviewer, 200);
  if (acceptRecommendations && !reviewerIdentifier) {
    throw new Error("--accept-recommendations requiere --reviewer.");
  }
  const [sourceDocument, matchingDocument] = await Promise.all([
    readFile(safeInput(args.input), "utf8").then(JSON.parse),
    readFile(safeInput(args.matching), "utf8").then(JSON.parse),
  ]);
  const review = buildReview(sourceDocument, matchingDocument, {
    generatedAt: new Date().toISOString(),
    department: text(args.department, 100),
    acceptRecommendations,
    reviewerIdentifier: reviewerIdentifier || null,
  });
  const outputs = [
    [safeOutput(args.output, ".json"), `${JSON.stringify(review, null, 2)}\n`],
    [safeOutput(args.csv, ".csv"), reviewCsv(review)],
    [safeOutput(args.research, ".md"), researchMarkdown(review)],
  ];
  await Promise.all(outputs.map(async ([path, content]) => {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content, "utf8");
  }));
  console.log(JSON.stringify({ summary: review.summary, supabaseWrites: 0, publicWrites: 0 }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
