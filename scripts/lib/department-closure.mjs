import { createHash } from "node:crypto";

const CHANNEL_BY_SOURCE_TYPE = {
  openstreetmap: "public_maps",
  public_map_directory: "public_maps",
  facebook_public_page: "social_public",
  facebook_public_group_post: "social_public",
  instagram_public_profile: "social_public",
  instagram_public_post: "social_public",
  instagram_public_reel: "social_public",
  instagram_indexed_public_content: "social_public",
  threads_public_post: "social_public",
};

const CHANNEL_LABELS = {
  official: "Fuentes oficiales MSP/MIDES",
  public_maps: "Mapas públicos",
  social_public: "Fuentes públicas de redes sociales",
  other_public: "Otras fuentes públicas",
};

function countBy(values) {
  return values.reduce((result, value) => {
    result[value] = (result[value] || 0) + 1;
    return result;
  }, {});
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sourceType(source) {
  return source.source_type || source.type || "";
}

function sourceChannel(source) {
  const type = sourceType(source);
  if (CHANNEL_BY_SOURCE_TYPE[type]) return CHANNEL_BY_SOURCE_TYPE[type];
  const fingerprint = `${type} ${source.url || ""}`.toLocaleLowerCase("es-UY");
  if (/\bmsp\b|\bmides\b|ministerio[-_ ](?:de[-_ ])?salud[-_ ]publica|ministerio[-_ ](?:de[-_ ])?desarrollo[-_ ]social/.test(fingerprint)) return "official";
  if (/public_map|map_directory|maptons|openstreetmap|\bosm\b|google.*maps|maps\.google|serpapi|waze|apple.?maps|overture/.test(fingerprint)) return "public_maps";
  if (/instagram|facebook|social/.test(fingerprint)) return "social_public";
  return "other_public";
}

function hasCompleteProvenance(source) {
  return Boolean(sourceType(source) && source.url && source.observed_at);
}

function isInternalMatchingReference(source) {
  const type = sourceType(source).toLocaleLowerCase("es-UY");
  const family = String(source.independent_family || "").trim().toLocaleLowerCase("es-UY");
  return type === "exclusion_index" || family === "project_index";
}

export function buildDepartmentClosure({ source, matching, review, imported, inputHashes, closedAt }) {
  const decisions = review.decisions || [];
  const records = source.records || [];
  const scope = source.scope || {};
  const methodology = source.methodology || {};
  const coverageReviewRows = Array.isArray(source.coverage_review) ? source.coverage_review : [];
  const coverageReviewSummary = source.coverage_review && !Array.isArray(source.coverage_review)
    ? source.coverage_review
    : {};
  const preImportUnresolvedLeads = source.unresolved_leads_not_imported?.length
    ? source.unresolved_leads_not_imported
    : source.unresolved_leads || [];
  const importedKeys = new Set((imported.plan?.candidates || []).map((candidate) => candidate.candidateKey));
  const facilityMatchKeys = new Set((imported.plan?.facilityMatches || []).map((match) => match.candidateKey));
  const decisionByKey = new Map(decisions.map((decision) => [decision.candidateKey, decision]));
  const allSources = records.flatMap((record) =>
    (record.sources || []).filter((item) => !isInternalMatchingReference(item)).map((item, index) => ({
      candidateKey: record.candidate_key,
      source: item,
      channel: sourceChannel(item),
      role: index === 0 ? "discovery_origin" : "corroboration",
    })),
  );

  const unresolved = decisions
    .filter((decision) =>
      !["verified_new", "rejected"].includes(decision.humanDecision) &&
      !facilityMatchKeys.has(decision.candidateKey))
    .map((decision) => ({
      candidate_key: decision.candidateKey,
      name: decision.name,
      locality: decision.locality,
      address: decision.address,
      evidence_tier: decision.evidenceTier,
      current_disposition: decision.currentDisposition,
      human_decision: decision.humanDecision,
      proposed_match_id: decision.proposedMatchId,
      unresolved_reason: decision.recommendationRationale,
      required_action: decision.recommendedAction,
      imported_private: importedKeys.has(decision.candidateKey),
      public_eligible: false,
    }));

  const classifications = countBy(records.map((record) => record.classification));
  const sourceChannelCounts = countBy(allSources.map((item) => item.channel));
  const originChannelCounts = countBy(allSources.filter((item) => item.role === "discovery_origin").map((item) => item.channel));
  const corroborationChannelCounts = countBy(allSources.filter((item) => item.role === "corroboration").map((item) => item.channel));
  const providerCounts = countBy(allSources.map((item) => sourceType(item.source)));
  const missingProvenance = allSources.filter((item) => !hasCompleteProvenance(item.source));
  const localitiesWithRecords = [...new Set(records.map((record) => record.locality).filter(Boolean))].sort();
  const localitiesSearched = methodology.localities_searched || scope.localities_searched ||
    coverageReviewSummary.localities_and_zones_searched || [
    ...new Set((methodology.subregions || []).flatMap((subregion) => subregion.localities || [])),
  ];
  const systematicallyReviewed = localitiesSearched.length > 0;
  const coverageGaps = Array.isArray(source.coverage_gaps)
    ? source.coverage_gaps
    : coverageReviewRows
      .filter((item) => Array.isArray(item.record_keys) && item.record_keys.length === 0)
      .map((item) => ({ area: item.area, result: item.result }));
  const territorialReview = coverageReviewRows.length > 0
    ? coverageReviewRows.map((item) => ({
      area: item.name || item.area,
      result: item.summary || item.result,
    }))
    : (methodology.zones || []).map((item) => ({
      area: item.zone,
      result: item.result,
    }));
  const verifiedNew = decisions.filter((decision) => decision.humanDecision === "verified_new");
  const rejected = decisions.filter((decision) => decision.humanDecision === "rejected");

  const report = {
    metadata: {
      schemaVersion: 1,
      department: source.department || scope.department,
      status: systematicallyReviewed ? "revisado sistemáticamente" : "revalidado parcialmente",
      closedAt,
      provisionalClosure: systematicallyReviewed,
      completeAtOneHundredPercent: false,
      privateOnly: true,
      automaticPublication: false,
      inputHashes,
    },
    coverage: {
      localitiesSearched,
      localitiesWithReviewedRecords: localitiesWithRecords,
      languages: methodology.languages || scope.search_languages || [],
      sourceFamiliesSearched: methodology.source_families || [scope.platform_focus, scope.method].filter(Boolean),
      territorialReview,
      coverageGaps,
      insufficientCoverage: coverageGaps.length > 0
        ? coverageGaps.map((gap) => gap.area)
        : coverageReviewSummary.coverage_statement
          ? [coverageReviewSummary.coverage_statement]
        : systematicallyReviewed
          ? ["No se dispone de un log granular de cada consulta; el cierre continúa siendo provisional."]
          : ["El insumo no documenta localidades buscadas; no permite declarar revisión sistemática departamental."],
      granularSearchLogAvailable: false,
    },
    counts: {
      rawLeads: records.length + preImportUnresolvedLeads.length,
      formallyReviewedRecords: records.length,
      preImportUnresolvedLeads: preImportUnresolvedLeads.length,
      knownMatches: Math.max(
        facilityMatchKeys.size,
        (classifications.known_exact_match || 0) +
          (classifications.probable_known_match || 0) +
          (classifications.probable_existing_official_match || 0),
        decisions.filter((decision) => ["probable_known_match", "exclusion_index_gap"].includes(decision.currentDisposition)).length,
      ),
      probableMatches: decisions.filter((decision) => decision.currentDisposition === "probable_known_match").length,
      probableNewAtResearch: (classifications.probable_new_current || 0) +
        (classifications.social_candidate || 0) +
        (classifications.current_nonprofit_candidate_with_historical_official_reference || 0),
      verifiedNewAfterHumanReview: verifiedNew.length,
      withoutAddress: Math.max(classifications.address_missing || 0, records.filter((record) => !record.address).length),
      historical: (classifications.historical_only || 0) + (classifications.social_candidate_possible_historical || 0),
      falsePositive: classifications.false_positive || 0,
      notElepem: classifications.not_elepem || 0,
      possibleMoveOrRebrand: (classifications.possible_move_or_rebrand || 0) +
        (classifications.historical_or_moved_candidate || 0),
      exclusionIndexGaps: decisions.filter((decision) => decision.humanDecision === "repair_exclusion_index").length,
      rejectedAfterHumanReview: rejected.length,
      importedPrivate: importedKeys.size,
      unresolvedAfterHumanReview: unresolved.length,
      publiclyApproved: imported.databaseApply?.publicEligibleCandidates || 0,
    },
    provenance: {
      observationCount: allSources.length,
      byChannel: Object.fromEntries(Object.keys(CHANNEL_LABELS).map((channel) => [channel, sourceChannelCounts[channel] || 0])),
      channelLabels: CHANNEL_LABELS,
      discoveryOriginByChannel: Object.fromEntries(Object.keys(CHANNEL_LABELS).map((channel) => [channel, originChannelCounts[channel] || 0])),
      corroborationByChannel: Object.fromEntries(Object.keys(CHANNEL_LABELS).map((channel) => [channel, corroborationChannelCounts[channel] || 0])),
      byProviderOrSourceType: providerCounts,
      missingProvenanceCount: missingProvenance.length,
      recordsWithMissingProvenance: [...new Set(missingProvenance.map((item) => item.candidateKey))],
    },
    classifications,
    humanReview: {
      reviewerIdentifier: review.metadata?.reviewerIdentifier,
      reviewedAt: decisions[0]?.reviewedAt || null,
      decisionCounts: countBy(decisions.map((decision) => decision.humanDecision)),
    },
    databaseReconciliation: {
      remoteModel: imported.metadata?.remoteModel,
      publicResidencialesBefore: imported.databaseApply?.publicResidencialesBefore,
      publicResidencialesAfter: imported.databaseApply?.publicResidencialesAfter,
      importedCandidates: imported.databaseApply?.insertedOrUpdatedCandidates,
      importedObservations: imported.databaseApply?.insertedObservations,
      publicEligibleCandidates: imported.databaseApply?.publicEligibleCandidates,
      publicTableUnchanged: imported.databaseApply?.publicResidencialesBefore === imported.databaseApply?.publicResidencialesAfter,
    },
    resolved: decisions.filter((decision) =>
      ["verified_new", "rejected"].includes(decision.humanDecision) ||
      facilityMatchKeys.has(decision.candidateKey)).map((decision) => ({
      candidateKey: decision.candidateKey,
      name: decision.name,
      decision: decision.humanDecision,
      evidenceTier: decision.evidenceTier,
      importedPrivate: importedKeys.has(decision.candidateKey),
      linkedExistingFacility: facilityMatchKeys.has(decision.candidateKey),
      publicEligible: false,
    })),
    unresolved,
    preImportUnresolvedLeads,
    safety: {
      googleMapsApiUsed: methodology.google_maps_api_used === true,
      coordinatesVerified: source.results_summary?.records_with_verified_coordinates ||
        source.quality_summary?.records_with_verified_coordinates || 0,
      automaticPublicationCount: 0,
      googleReviewsStored: 0,
    },
  };

  if (!report.databaseReconciliation.publicTableUnchanged) throw new Error("La tabla pública cambió durante el lote");
  if (report.counts.publiclyApproved !== 0) throw new Error("El cierre contiene candidatos publicables");
  if (report.provenance.missingProvenanceCount !== 0) throw new Error("Hay observaciones con procedencia incompleta");
  if (matching.candidates?.length !== records.length) throw new Error("El matching no cubre todos los registros revisados");
  if (decisions.length !== records.length) throw new Error("La revisión humana no cubre todos los registros");
  for (const candidate of imported.plan?.candidates || []) {
    if (!decisionByKey.has(candidate.candidateKey)) throw new Error(`Candidato importado sin decisión: ${candidate.candidateKey}`);
  }

  return { report, unresolved };
}

export function closureInputHash(raw) {
  return sha256(raw);
}

export function toCsv(rows) {
  const columns = [
    "candidate_key", "name", "locality", "address", "evidence_tier", "current_disposition",
    "human_decision", "proposed_match_id", "unresolved_reason", "required_action", "imported_private",
    "public_eligible",
  ];
  const quote = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return `${columns.join(",")}\n${rows.map((row) => columns.map((column) => quote(row[column])).join(",")).join("\n")}\n`;
}

export function coverageMarkdown(report) {
  const c = report.counts;
  const p = report.provenance;
  return `# Cierre provisional de ${report.metadata.department}\n\n` +
    `**Estado:** ${report.metadata.status}  \n**Fecha:** ${report.metadata.closedAt.slice(0, 10)}  \n` +
    `Este cierre es provisional y no afirma cobertura completa al 100 %.\n\n` +
    `## Resultado\n\n` +
    `- ${c.rawLeads} pistas brutas: ${c.formallyReviewedRecords} registros evaluados y ${c.preImportUnresolvedLeads} leads descartados antes de importar.\n` +
    `- ${c.knownMatches} coincidencias conocidas; ${c.verifiedNewAfterHumanReview} nuevos verificados para la cola privada.\n` +
    `- ${c.importedPrivate} candidatos importados en privado; ${c.publiclyApproved} aprobados públicamente.\n` +
    `- ${c.withoutAddress} sin dirección, ${c.possibleMoveOrRebrand} posibles mudanzas/rebrandings, ${c.falsePositive} falso positivo y ${c.notElepem} servicio no ELEPEM.\n` +
    `- ${c.unresolvedAfterHumanReview} casos siguen abiertos.\n\n` +
    `## Cobertura\n\n` +
    `Localidades y zonas buscadas (${report.coverage.localitiesSearched.length}): ${report.coverage.localitiesSearched.join(", ")}.\n\n` +
    `Localidades con registros evaluados: ${report.coverage.localitiesWithReviewedRecords.join(", ")}.\n\n` +
    `Familias consultadas: ${report.coverage.sourceFamiliesSearched.join("; ")}. No se recibió un log granular de cada consulta, por lo que las búsquedas se documentan por familia y localidad.\n\n` +
    (report.coverage.territorialReview.length > 0
      ? `## Revisión territorial\n\n${report.coverage.territorialReview.map((area) => `- **${area.area}:** ${area.result}`).join("\n")}\n\n`
      : "") +
    `## Procedencia\n\n` +
    `Se conservaron ${p.observationCount} referencias: ${p.byChannel.official} oficiales MSP/MIDES, ${p.byChannel.public_maps} de mapas públicos, ${p.byChannel.social_public} de redes sociales públicas y ${p.byChannel.other_public} de otras fuentes públicas.\n\n` +
    `Origen de descubrimiento: ${JSON.stringify(p.discoveryOriginByChannel)}. Corroboraciones: ${JSON.stringify(p.corroborationByChannel)}. Registros con procedencia incompleta: ${p.missingProvenanceCount}.\n\n` +
    `## Cobertura insuficiente\n\n` +
    (report.coverage.coverageGaps.length > 0
      ? report.coverage.coverageGaps.map((gap) => `- **${gap.area}:** ${gap.result}`).join("\n")
      : report.coverage.insufficientCoverage.map((item) => `- ${item}`).join("\n")) + `\n\n` +
    `## Seguridad y publicación\n\n` +
    `La tabla pública permaneció sin cambios (${report.databaseReconciliation.publicResidencialesBefore} → ${report.databaseReconciliation.publicResidencialesAfter}). No se guardaron coordenadas inventadas, reseñas de Google ni candidatos publicables.\n`;
}
