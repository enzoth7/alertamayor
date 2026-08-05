const LEGACY_DEPARTMENTS = [
  "Artigas", "Canelones", "Cerro Largo", "Colonia", "Durazno", "Flores", "Florida", "Lavalleja",
  "Maldonado", "Montevideo", "Paysandú", "Río Negro", "Rivera", "Rocha", "Salto", "San José",
  "Soriano", "Tacuarembó", "Treinta y Tres",
];

const DEPARTMENTS = [
  "Artigas", "Canelones", "Cerro Largo", "Colonia", "Durazno", "Flores", "Florida", "Lavalleja",
  "Maldonado", "Montevideo", "Paysand\u00fa", "R\u00edo Negro", "Rivera", "Rocha", "Salto", "San Jos\u00e9",
  "Soriano", "Tacuaremb\u00f3", "Treinta y Tres",
];

const METRIC_FIELDS = [
  "pistas_brutas", "exact_matches", "probable_matches", "probable_new", "historical", "without_address",
  "false_positive", "not_elepem", "reviewed_and_imported", "publicly_approved", "official_sources_count",
  "public_maps_count", "public_social_sources_count", "other_public_sources_count", "manual_editorial_count",
  "missing_provenance_count",
];

const LEGACY_DEPARTMENT_BY_KEY = new Map(LEGACY_DEPARTMENTS.map((department) => [
  department
    .replaceAll("Ã¡", "Ã¡").replaceAll("Ã©", "Ã©").replaceAll("Ã­", "Ã­")
    .replaceAll("Ã³", "Ã³").replaceAll("Ãº", "Ãº").replaceAll("Ã±", "Ã±")
    .normalize("NFKD").replace(/\p{M}/gu, "").toLocaleLowerCase("es-UY").trim(),
  department,
]));

function legacyCanonicalDepartment(value) {
  const key = String(value || "")
    .replaceAll("Ã¡", "Ã¡").replaceAll("Ã©", "Ã©").replaceAll("Ã­", "Ã­")
    .replaceAll("Ã³", "Ã³").replaceAll("Ãº", "Ãº").replaceAll("Ã±", "Ã±")
    .normalize("NFKD").replace(/\p{M}/gu, "").toLocaleLowerCase("es-UY").trim();
  return LEGACY_DEPARTMENT_BY_KEY.get(key) || null;
}
void legacyCanonicalDepartment;

function departmentKey(value) {
  let repaired = String(value || "");
  for (let attempt = 0; attempt < 2 && /[ÃÂ]/.test(repaired); attempt += 1) {
    const decoded = Buffer.from(repaired, "latin1").toString("utf8");
    if (decoded.includes("\uFFFD")) break;
    repaired = decoded;
  }
  return repaired.normalize("NFKD").replace(/\p{M}/gu, "").toLocaleLowerCase("es-UY").trim();
}

const DEPARTMENT_BY_KEY = new Map(DEPARTMENTS.map((department) => [departmentKey(department), department]));

function canonicalDepartment(value) {
  return DEPARTMENT_BY_KEY.get(departmentKey(value)) || null;
}

function emptyRow(department, known, referenceTotal) {
  return {
    department,
    metrics_status: "baseline_only",
    referencia_total: referenceTotal ?? null,
    conocidos_en_indice: known || 0,
    ...Object.fromEntries(METRIC_FIELDS.map((field) => [field, null])),
    closed_provisionally: false,
    automatic_publication: false,
  };
}

function sourceCounts(candidates) {
  const counts = {};
  let missing = 0;
  for (const candidate of candidates) {
    for (const source of candidate.sourceReferences || []) {
      if (!source.sourceChannel || !source.externalUrl || !source.retrievedAt) missing += 1;
      else counts[source.sourceChannel] = (counts[source.sourceChannel] || 0) + 1;
    }
  }
  return { counts, missing };
}

function isHistoricalCandidate(candidate) {
  return ["historical_or_moved_candidate", "social_candidate_possible_historical", "historical_only"]
    .includes(candidate.inputClassification);
}

function applyStep9(row, report) {
  const candidates = report.candidates || [];
  const historical = candidates.filter(isHistoricalCandidate).length;
  const { counts, missing } = sourceCounts(candidates);
  return {
    ...row,
    metrics_status: "step9_revalidated_dry_run",
    pistas_brutas: candidates.length,
    exact_matches: candidates.filter((candidate) => candidate.matchStatus === "exact_match").length,
    probable_matches: candidates.filter((candidate) => candidate.matchStatus === "probable_match").length,
    probable_new: candidates.filter((candidate) => candidate.matchStatus === "new_candidate" && !isHistoricalCandidate(candidate)).length,
    historical,
    without_address: candidates.filter((candidate) => !candidate.address).length,
    false_positive: candidates.filter((candidate) => /false_positive/i.test(candidate.inputClassification || "")).length,
    not_elepem: candidates.filter((candidate) => /not_elepem/i.test(candidate.inputClassification || "")).length,
    reviewed_and_imported: 0,
    publicly_approved: 0,
    official_sources_count: counts.official || counts.official_sources || 0,
    public_maps_count: counts.public_maps || 0,
    public_social_sources_count: counts.social_public || counts.public_social_sources || 0,
    other_public_sources_count: counts.other_public || counts.other_public_sources || 0,
    manual_editorial_count: counts.manual_editorial || 0,
    missing_provenance_count: missing,
  };
}

function applyClosure(row, closure) {
  const c = closure.counts;
  const p = closure.provenance.byChannel;
  return {
    ...row,
    metrics_status: closure.metadata.provisionalClosure
      ? "step17_closed_systematically"
      : "step17_partial_revalidation",
    pistas_brutas: c.rawLeads,
    exact_matches: Math.max(0, c.knownMatches - c.probableMatches),
    probable_matches: c.probableMatches,
    probable_new: c.verifiedNewAfterHumanReview,
    historical: c.historical,
    without_address: c.withoutAddress,
    false_positive: c.falsePositive,
    not_elepem: c.notElepem,
    reviewed_and_imported: c.importedPrivate,
    publicly_approved: c.publiclyApproved,
    official_sources_count: p.official ?? p.official_sources ?? 0,
    public_maps_count: p.public_maps,
    public_social_sources_count: p.social_public ?? p.public_social_sources ?? 0,
    other_public_sources_count: p.other_public ?? p.other_public_sources ?? 0,
    manual_editorial_count: p.manual_editorial ?? 0,
    missing_provenance_count: closure.provenance.missingProvenanceCount,
    closed_provisionally: closure.metadata.provisionalClosure === true,
  };
}

export function buildNationalMetrics({ exclusion, referenceTotals, closures = [], step9Reports = [], generatedAt }) {
  const knownCounts = Object.fromEntries(DEPARTMENTS.map((department) => [department, 0]));
  let missingDepartment = 0;
  for (const entry of exclusion.entries || []) {
    const department = canonicalDepartment(entry.department);
    if (department) knownCounts[department] += 1;
    else missingDepartment += 1;
  }

  const rows = DEPARTMENTS.map((department) => emptyRow(department, knownCounts[department], referenceTotals[department]));
  const byDepartment = new Map(rows.map((row) => [row.department, row]));
  for (const item of step9Reports) {
    const department = canonicalDepartment(item.department);
    if (department) byDepartment.set(department, applyStep9(byDepartment.get(department), item.report));
  }
  for (const closure of closures) {
    const department = canonicalDepartment(closure.metadata.department);
    if (department) byDepartment.set(department, applyClosure(byDepartment.get(department), closure));
  }
  const finalRows = DEPARTMENTS.map((department) => byDepartment.get(department));

  const processed = finalRows.filter((row) => row.metrics_status !== "baseline_only");
  const exclusionGeneratedAt = exclusion.metadata?.generated_at || null;
  const latestClosureAt = closures
    .map((closure) => closure.metadata?.closedAt)
    .filter(Boolean)
    .sort()
    .at(-1) || null;
  const sum = (field) => processed.reduce((total, row) => total + (row[field] || 0), 0);
  const report = {
    metadata: {
      schema_version: 1,
      generated_at: generatedAt,
      national_historical_reference_total: 1481,
      reference_interpretation: "Referencia histórica de cobertura; no es una nómina nominal actual ni permite calcular faltantes.",
      missing_facilities_formula_used: false,
      departments: DEPARTMENTS.length,
      departments_with_reference_total: finalRows.filter((row) => row.referencia_total !== null).length,
      departments_with_pipeline_metrics: processed.length,
      closed_departments: finalRows.filter((row) => row.closed_provisionally).map((row) => row.department),
      automatic_publication: false,
    },
    baseline: {
      exclusion_index_entries: (exclusion.entries || []).length,
      exclusion_entries_with_unknown_department: missingDepartment,
      exclusion_index_generated_at: exclusionGeneratedAt,
      latest_department_closure_at: latestClosureAt,
      exclusion_index_predates_latest_closure: Boolean(
        exclusionGeneratedAt && latestClosureAt && new Date(exclusionGeneratedAt) < new Date(latestClosureAt)
      ),
    },
    processed_totals: {
      scope: processed.map((row) => row.department),
      pistas_brutas: sum("pistas_brutas"),
      exact_matches: sum("exact_matches"),
      probable_matches: sum("probable_matches"),
      probable_new: sum("probable_new"),
      historical: sum("historical"),
      without_address: sum("without_address"),
      false_positive: sum("false_positive"),
      not_elepem: sum("not_elepem"),
      reviewed_and_imported: sum("reviewed_and_imported"),
      publicly_approved: sum("publicly_approved"),
    },
    departments: finalRows,
  };

  if (report.metadata.departments !== 19) throw new Error("La tabla no contiene los 19 departamentos");
  if (report.processed_totals.publicly_approved !== 0) throw new Error("Hay publicación no esperada en las métricas");
  if (finalRows.some((row) => "faltantes" in row)) throw new Error("No se permite calcular faltantes");
  if (processed.some((row) => row.missing_provenance_count !== 0)) throw new Error("Hay procedencia incompleta en un lote procesado");
  return report;
}

export function metricsCsv(report) {
  const columns = ["department", "metrics_status", "referencia_total", "conocidos_en_indice", ...METRIC_FIELDS, "closed_provisionally", "automatic_publication"];
  const quote = (value) => value === null ? "" : `"${String(value).replaceAll('"', '""')}"`;
  return `${columns.join(",")}\n${report.departments.map((row) => columns.map((column) => quote(row[column])).join(",")).join("\n")}\n`;
}

export function metricsMarkdown(report) {
  const processed = report.departments.filter((row) => row.metrics_status !== "baseline_only");
  return `# Métricas nacionales ELEPEM — ${report.metadata.generated_at.slice(0, 10)}\n\n` +
    `La cifra nacional de **1.481** se conserva únicamente como referencia histórica de cobertura. No se calculan faltantes restando puntos actuales.\n\n` +
    `## Estado del snapshot\n\n` +
    `- ${report.baseline.exclusion_index_entries} entradas en el índice de exclusión; ${report.baseline.exclusion_entries_with_unknown_department} sin departamento resoluble.\n` +
    (report.baseline.exclusion_index_predates_latest_closure
      ? `- El índice es un baseline anterior a los cierres departamentales actuales y debe regenerarse antes de usarlo como conteo vigente.\n`
      : "") +
    `- ${report.metadata.departments_with_reference_total} de 19 departamentos tienen total histórico departamental disponible en el repositorio.\n` +
    `- ${report.metadata.departments_with_pipeline_metrics} departamentos tienen métricas del pipeline: ${processed.map((row) => row.department).join(", ")}.\n` +
    `- Cerrado sistemáticamente: ${report.metadata.closed_departments.join(", ") || "ninguno"}.\n` +
    `- Publicaciones aprobadas por estos lotes: ${report.processed_totals.publicly_approved}.\n\n` +
    `## Departamentos procesados\n\n` +
    `| Departamento | Estado | Referencia histórica | Índice | Pistas | Probables nuevas | Importadas | Públicas |\n` +
    `|---|---|---:|---:|---:|---:|---:|---:|\n` +
    processed.map((row) => `| ${row.department} | ${row.metrics_status} | ${row.referencia_total ?? "s/d"} | ${row.conocidos_en_indice} | ${row.pistas_brutas} | ${row.probable_new} | ${row.reviewed_and_imported} | ${row.publicly_approved} |`).join("\n") +
    `\n\nLos valores nulos indican que esa fase todavía no se ejecutó o que el insumo departamental no existe; no equivalen a cero.\n`;
}
