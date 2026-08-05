import { createHash } from "node:crypto";
import { normalizeAddress, normalizeName, normalizeText } from "../../lib/facility-matching.mjs";

function record(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function text(value, maximum = 1_000) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

const OFFICIAL_DEPARTMENTS = [
  "Artigas", "Canelones", "Cerro Largo", "Colonia", "Durazno", "Flores", "Florida",
  "Lavalleja", "Maldonado", "Montevideo", "Paysandú", "Río Negro", "Rivera", "Rocha",
  "Salto", "San José", "Soriano", "Tacuarembó", "Treinta y Tres",
];

const OFFICIAL_DEPARTMENT_BY_KEY = new Map(
  OFFICIAL_DEPARTMENTS.map((department) => [normalizeText(department), department]),
);

function canonicalDepartment(value) {
  const raw = text(value, 100);
  return OFFICIAL_DEPARTMENT_BY_KEY.get(normalizeText(raw)) || raw;
}

function canonicalLocality(value, department) {
  const raw = text(value, 160);
  if (!raw) return "";
  const departmentName = canonicalDepartment(department);
  const parts = raw.split("/").map((part) => part.trim()).filter(Boolean);
  if (parts.some((part) => normalizeText(part) === normalizeText(departmentName))) {
    return departmentName;
  }
  return raw;
}

function sha256(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function validUrl(value) {
  const raw = text(value, 1_000);
  try {
    const parsed = new URL(raw);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function sourceType(value) {
  const source = record(value);
  const fingerprint = `${text(source.source_type || source.type, 120)} ${text(source.url, 1_000)}`.toLocaleLowerCase("es-UY");
  if (/openstreetmap|\bosm\b/.test(fingerprint)) return "openstreetmap";
  if (/\bmsp\b|\bmides\b|ministerio[-_ ](?:de[-_ ])?salud[-_ ]publica|ministerio[-_ ](?:de[-_ ])?desarrollo[-_ ]social/.test(fingerprint)) return "official";
  if (/instagram|facebook|social/.test(fingerprint)) return "social_public_url";
  if (/facility_website|sitio propio|website/.test(fingerprint)) return "facility_website";
  if (/news|medio|radio|prensa/.test(fingerprint)) return "news";
  if (/public_map|map_directory|maptons|directory|directorio|waze|apple.?maps|overture/.test(fingerprint)) return "public_directory";
  return "other";
}

function sourceChannel(value) {
  const source = record(value);
  const fingerprint = `${text(source.source_type || source.type, 120)} ${text(source.url, 1_000)}`.toLocaleLowerCase("es-UY");
  if (/\bmsp\b|\bmides\b|ministerio[-_ ](?:de[-_ ])?salud[-_ ]publica|ministerio[-_ ](?:de[-_ ])?desarrollo[-_ ]social/.test(fingerprint)) return "official";
  if (/public_map|map_directory|maptons|openstreetmap|\bosm\b|google.*maps|maps\.google|serpapi|waze|apple.?maps|overture/.test(fingerprint)) return "public_maps";
  if (/instagram|facebook|social/.test(fingerprint)) return "social_public";
  return "other_public";
}

function dateOnly(value) {
  const raw = text(value, 40);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

function timestamp(value, fallback) {
  const parsed = new Date(value || fallback);
  if (!Number.isFinite(parsed.getTime())) throw new Error(`Fecha inválida: ${value}`);
  return parsed.toISOString();
}

function earlierTimestamp(left, right) {
  const leftTimestamp = timestamp(left, right);
  const rightTimestamp = timestamp(right, right);
  return new Date(leftTimestamp) <= new Date(rightTimestamp) ? leftTimestamp : rightTimestamp;
}

function independenceKey(source, mappedType) {
  const explicit = text(source.independent_family, 160);
  if (explicit) return normalizeText(explicit).slice(0, 200);
  const url = validUrl(source.url);
  if (url) return new URL(url).hostname.replace(/^www\./, "").toLocaleLowerCase("en-US").slice(0, 200);
  return mappedType;
}

function observationFor(candidate, sourceValue, index, retrievedAt) {
  const source = record(sourceValue);
  const mappedType = sourceType(source);
  const url = validUrl(source.url);
  if (!url) throw new Error(`${candidate.candidateKey}: fuente ${index + 1} sin URL pública válida.`);
  const isSocial = mappedType === "social_public_url";
  const sourceRecordKey = `${candidate.candidateKey.slice(0, 235)}:${index + 1}:${sha256(url).slice(0, 12)}`;
  const humanNote = [
    text(source.title, 180),
    text(source.limitations, 280),
  ].filter(Boolean).join(" — ").slice(0, 500) || "Fuente pública revisada manualmente.";
  const normalized = {
    normalizedName: isSocial ? null : normalizeName(candidate.name) || null,
    normalizedDepartment: isSocial ? null : normalizeText(candidate.department) || null,
    normalizedLocality: isSocial ? null : normalizeText(candidate.locality) || null,
    normalizedAddress: isSocial || !candidate.address
      ? null
      : normalizeAddress(candidate.address, candidate) || null,
  };
  const observation = {
    candidateKey: candidate.candidateKey,
    sourceType: mappedType,
    sourceChannel: sourceChannel(source),
    sourceRecordKey,
    sourceUrl: url,
    retrievedAt: timestamp(source.observed_at, retrievedAt),
    sourceDate: dateOnly(source.source_date || source.observed_at),
    sourceLicense: mappedType === "openstreetmap" ? "ODbL" : null,
    storagePolicy: isSocial ? "reference_only" : "normalized_only",
    ...normalized,
    lat: null,
    lng: null,
    humanNote,
    rawMetadataStoragePermitted: false,
    rawMetadata: null,
    independenceKey: independenceKey(source, mappedType),
  };
  observation.recordHash = sha256(JSON.stringify(observation));
  return observation;
}

export function buildReviewedDepartmentImportPlan({ sourceDocument, reviewDocument, exclusionDocument, inputHash }) {
  const sourceRows = Array.isArray(record(sourceDocument).records) ? sourceDocument.records : [];
  const sourceByKey = new Map(sourceRows.map((item) => [text(item.candidate_key, 360), record(item)]));
  const exclusionRows = Array.isArray(record(exclusionDocument).entries) ? exclusionDocument.entries : [];
  const exclusionById = new Map(exclusionRows.map((item) => [text(item.exclusion_id, 300), record(item)]));
  const reviewedAt = text(record(reviewDocument).metadata?.generatedAt, 80);
  const department = text(record(reviewDocument).metadata?.department, 100);
  const decisions = Array.isArray(record(reviewDocument).decisions) ? reviewDocument.decisions : [];
  const eligible = decisions.filter((item) => item.eligibleForStep14 === true);
  const linkDecisions = exclusionDocument
    ? decisions.filter((item) => item.humanDecision === "link_existing_after_id_resolution")
    : [];
  if (!department || !reviewedAt) throw new Error("La revisión no declara departamento o fecha.");
  if (eligible.length === 0 && linkDecisions.length === 0) {
    throw new Error("No hay decisiones habilitadas para el Paso 14.");
  }
  const candidates = eligible.map((decisionValue) => {
    const decision = record(decisionValue);
    const candidateKey = text(decision.candidateKey, 360);
    const source = sourceByKey.get(candidateKey);
    if (!source) throw new Error(`No existe el insumo original de ${candidateKey}.`);
    const humanDecision = text(decision.humanDecision, 80);
    if (!["verified_new", "needs_more_evidence"].includes(humanDecision)) {
      throw new Error(`${candidateKey}: decisión no importable en la cola privada.`);
    }
    const evidenceTier = text(decision.evidenceTier, 1);
    if (!["A", "B", "C"].includes(evidenceTier)) throw new Error(`${candidateKey}: evidencia inválida.`);
    if (humanDecision === "verified_new" && evidenceTier === "C") {
      throw new Error(`${candidateKey}: evidencia C no puede verificarse como nueva.`);
    }
    const reviewer = text(decision.reviewerIdentifier, 200);
    if (!reviewer || !decision.reviewedAt) throw new Error(`${candidateKey}: falta identidad o fecha de revisión.`);
    const departmentName = canonicalDepartment(source.department);
    const localityName = canonicalLocality(source.locality, departmentName);
    const candidate = {
      candidateKey,
      name: text(source.observed_name, 300),
      department: departmentName,
      locality: localityName,
      address: text(source.address, 500) || null,
      status: humanDecision === "verified_new" ? "verified_new" : "needs_review",
      reviewAction: humanDecision,
      evidenceTier,
      humanReviewed: true,
      reviewedAt: timestamp(decision.reviewedAt, reviewedAt),
      reviewedBy: reviewer,
      reviewNote: text(decision.reviewerNote || decision.recommendationRationale, 2_000),
      publicEligible: false,
      firstSeenAt: earlierTimestamp(sourceDocument.generated_at, decision.reviewedAt || reviewedAt),
      lastSeenAt: timestamp(reviewedAt, reviewedAt),
      normalizedName: normalizeName(source.observed_name),
      normalizedDepartment: normalizeText(departmentName) || null,
      normalizedLocality: normalizeText(localityName) || null,
      normalizedAddress: source.address ? normalizeAddress(source.address, source) || null : null,
      lat: null,
      lng: null,
    };
    if (!candidate.name || !candidate.normalizedName) throw new Error(`${candidateKey}: nombre inválido.`);
    const sources = (Array.isArray(source.sources) ? source.sources : [])
      .map((item, index) => observationFor(candidate, item, index, reviewedAt));
    if (sources.length === 0) throw new Error(`${candidateKey}: no tiene fuentes.`);
    if (evidenceTier === "B" && new Set(sources.map((item) => item.independenceKey)).size < 2) {
      throw new Error(`${candidateKey}: evidencia B sin dos fuentes independientes.`);
    }
    candidate.sources = sources.map((item) => ({
      ...item,
      evidenceRole: evidenceTier === "A" && item.sourceType === "official"
        ? "evidence_a"
        : evidenceTier === "B"
          ? "evidence_b"
          : "lead",
    }));
    return candidate;
  });
  const facilityMatches = linkDecisions.map((decisionValue) => {
    const decision = record(decisionValue);
    const candidateKey = text(decision.candidateKey, 360);
    const source = sourceByKey.get(candidateKey);
    if (!source) throw new Error(`No existe el insumo original de ${candidateKey}.`);
    const reviewer = text(decision.reviewerIdentifier, 200);
    if (!reviewer || !decision.reviewedAt) throw new Error(`${candidateKey}: falta identidad o fecha de revisión.`);
    const exclusionId = text(decision.proposedMatchId, 300);
    const exclusion = exclusionById.get(exclusionId);
    if (!exclusion) throw new Error(`${candidateKey}: no se resolvió ${exclusionId} en el índice de exclusión.`);
    const legacyResidencialIds = Array.isArray(exclusion.legacy_residencial_ids)
      ? [...new Set(exclusion.legacy_residencial_ids.map((value) => text(value, 200)).filter(Boolean))]
      : [];
    if (legacyResidencialIds.length === 0) {
      throw new Error(`${candidateKey}: ${exclusionId} no tiene ID legacy para resolver la sede canónica.`);
    }
    const departmentName = canonicalDepartment(source.department);
    const localityName = canonicalLocality(source.locality, departmentName);
    const evidenceTier = text(decision.evidenceTier, 1);
    const historical = text(decision.currentDisposition, 80) === "historical_known_match";
    const match = {
      candidateKey,
      exclusionId,
      legacyResidencialIds,
      expectedCanonicalName: text(exclusion.canonical_name, 300),
      name: text(source.observed_name, 300),
      department: departmentName,
      locality: localityName,
      address: text(source.address, 500) || null,
      normalizedName: normalizeName(source.observed_name),
      normalizedDepartment: normalizeText(departmentName) || null,
      normalizedLocality: normalizeText(localityName) || null,
      normalizedAddress: source.address ? normalizeAddress(source.address, source) || null : null,
      lat: null,
      lng: null,
      evidenceTier,
      historical,
      reviewedAt: timestamp(decision.reviewedAt, reviewedAt),
      reviewedBy: reviewer,
      reviewNote: text(decision.reviewerNote || decision.recommendationRationale, 2_000),
    };
    match.sources = (Array.isArray(source.sources) ? source.sources : [])
      .map((item, index) => observationFor(match, item, index, reviewedAt))
      .map((item) => ({
        ...item,
        evidenceRole: historical
          ? "historical"
          : evidenceTier === "A" && item.sourceType === "official"
            ? "evidence_a"
            : evidenceTier === "B"
              ? "evidence_b"
              : "context",
      }));
    if (match.sources.length === 0) throw new Error(`${candidateKey}: no tiene fuentes para vincular.`);
    if (evidenceTier === "B" && new Set(match.sources.map((item) => item.independenceKey)).size < 2) {
      throw new Error(`${candidateKey}: evidencia B sin dos fuentes independientes.`);
    }
    return match;
  });
  const observationOwners = [...candidates, ...facilityMatches];
  const observations = observationOwners.flatMap((item) => item.sources);
  const sourceTypes = [...new Set(observations.map((item) => item.sourceType))].sort();
  const sourceChannels = Object.fromEntries(["official", "public_maps", "social_public", "other_public"]
    .map((channel) => [channel, observations.filter((item) => item.sourceChannel === channel).length]));
  const runs = sourceTypes.map((type) => {
    const typeObservations = observations.filter((item) => item.sourceType === type);
    return {
      runKey: `department:${normalizeText(department)}:${type}:${inputHash.slice(0, 24)}`.slice(0, 200),
      sourceType: type,
      sourceUrl: typeObservations[0].sourceUrl,
      sourceLicense: type === "openstreetmap" ? "ODbL" : null,
      storagePolicy: type === "social_public_url" ? "reference_only" : "normalized_only",
      completedAt: reviewedAt,
      observationCount: typeObservations.length,
    };
  });
  return {
    metadata: {
      schemaVersion: 1,
      department,
      reviewedAt,
      reviewerIdentifiers: [...new Set(observationOwners.map((item) => item.reviewedBy))],
      inputHash,
      privateOnly: true,
      publicEligible: false,
      automaticPublication: false,
    },
    summary: {
      candidates: candidates.length,
      facilityMatches: facilityMatches.length,
      verifiedNew: candidates.filter((item) => item.status === "verified_new").length,
      needsReview: candidates.filter((item) => item.status === "needs_review").length,
      observations: observations.length,
      runs: runs.length,
      sourceTypes,
      sourceChannels,
    },
    runs,
    candidates,
    facilityMatches,
  };
}

export async function inspectReviewedDepartmentImport(client, plan) {
  await client.query("begin transaction read only");
  try {
    await client.query("set local statement_timeout = '30s'");
    const required = await client.query(`
      select
        to_regclass('discovery_private.facility_source_runs') is not null as runs,
        to_regclass('discovery_private.facility_source_observations') is not null as observations,
        to_regclass('discovery_private.facility_candidates') is not null as candidates,
        to_regclass('discovery_private.facility_candidate_sources') is not null as sources,
        to_regclass('discovery_private.facility_candidate_review_events') is not null as review_events,
        to_regclass('elepem_core.legacy_facility_map') is not null as legacy_map,
        to_regclass('elepem_core.facility_observation_links') is not null as facility_links,
        to_regclass('elepem_core.audit_log') is not null as audit_log
    `);
    if (Object.values(required.rows[0]).some((value) => value !== true)) {
      throw new Error("Faltan tablas del workflow privado.");
    }
    const keys = plan.candidates.map((item) => item.candidateKey);
    const existing = await client.query(`
      select candidate_key, status, evidence_tier, human_reviewed, reviewed_by,
             review_note, public_eligible
      from discovery_private.facility_candidates
      where candidate_key = any($1::text[])
      order by candidate_key
    `, [keys]);
    const conflicts = existing.rows.filter((row) => row.human_reviewed && !plan.candidates.some((item) =>
      item.candidateKey === row.candidate_key &&
      item.status === row.status &&
      item.evidenceTier === row.evidence_tier &&
      item.reviewedBy === row.reviewed_by &&
      row.public_eligible === false));
    const legacyIds = [...new Set((plan.facilityMatches || []).flatMap((item) => item.legacyResidencialIds))];
    const mapped = legacyIds.length > 0 ? await client.query(`
      select mapping.legacy_residencial_id, mapping.facility_id, mapping.mapping_status,
             facility.facility_key
      from elepem_core.legacy_facility_map as mapping
      left join elepem_core.facilities as facility on facility.id = mapping.facility_id
      where mapping.legacy_residencial_id = any($1::text[])
      order by mapping.legacy_residencial_id
    `, [legacyIds]) : { rows: [] };
    const mappingByLegacyId = new Map(mapped.rows.map((row) => [row.legacy_residencial_id, row]));
    const facilityResolutions = (plan.facilityMatches || []).map((item) => {
      const mappings = item.legacyResidencialIds.map((id) => mappingByLegacyId.get(id)).filter(Boolean);
      const facilityIds = [...new Set(mappings.filter((row) => row.mapping_status === "mapped" && row.facility_id)
        .map((row) => String(row.facility_id)))];
      return {
        candidateKey: item.candidateKey,
        exclusionId: item.exclusionId,
        legacyResidencialIds: item.legacyResidencialIds,
        facilityIds,
        facilityKey: facilityIds.length === 1
          ? mappings.find((row) => String(row.facility_id) === facilityIds[0])?.facility_key || null
          : null,
        resolved: facilityIds.length === 1 && mappings.length === item.legacyResidencialIds.length,
      };
    });
    const facilityResolutionConflicts = facilityResolutions.filter((item) => !item.resolved);
    const plannedObservations = [...plan.candidates, ...(plan.facilityMatches || [])]
      .flatMap((item) => item.sources);
    const observationHashes = [...new Set(plannedObservations.map((item) => item.recordHash))];
    const existingObservations = observationHashes.length > 0 ? await client.query(`
      select source_type, source_record_key, record_hash
      from discovery_private.facility_source_observations
      where record_hash = any($1::text[])
    `, [observationHashes]) : { rows: [] };
    const existingObservationKeys = new Set(existingObservations.rows.map((row) =>
      `${row.source_type}|${row.source_record_key}|${row.record_hash}`));
    const wouldInsertObservations = plannedObservations.filter((item) =>
      !existingObservationKeys.has(`${item.sourceType}|${item.sourceRecordKey}|${item.recordHash}`)).length;
    const counts = await client.query(`
      select
        (select count(*)::integer from public.residenciales) as public_residenciales,
        (select count(*)::integer from discovery_private.facility_candidates) as private_candidates,
        (select count(*)::integer from discovery_private.facility_source_observations) as observations
    `);
    await client.query("commit");
    return {
      requiredTables: required.rows[0],
      existing: existing.rows,
      conflicts,
      facilityResolutions,
      facilityResolutionConflicts,
      counts: counts.rows[0],
      wouldInsert: keys.length - existing.rowCount,
      wouldUpdateOrKeep: existing.rowCount,
      plannedObservations: plannedObservations.length,
      wouldInsertObservations,
      wouldKeepObservations: plannedObservations.length - wouldInsertObservations,
      plannedCandidateSourceLinks: plan.candidates.reduce((total, item) => total + item.sources.length, 0),
      plannedFacilitySourceLinks: (plan.facilityMatches || []).reduce((total, item) => total + item.sources.length, 0),
      wouldLinkFacilities: facilityResolutions.filter((item) => item.resolved).length,
      safeToApply: conflicts.length === 0 && facilityResolutionConflicts.length === 0,
    };
  } catch (error) {
    try { await client.query("rollback"); } catch {}
    throw error;
  }
}

async function publicCount(client) {
  const result = await client.query("select count(*)::integer as count from public.residenciales");
  return result.rows[0].count;
}

export async function applyReviewedDepartmentImport(client, plan) {
  await client.query("begin");
  try {
    await client.query("set local statement_timeout = '45s'");
    await client.query("set local lock_timeout = '5s'");
    const beforePublic = await publicCount(client);
    const keys = plan.candidates.map((item) => item.candidateKey);
    const priorResult = await client.query(`
      select * from discovery_private.facility_candidates
      where candidate_key = any($1::text[])
      for update
    `, [keys]);
    const priorByKey = new Map(priorResult.rows.map((row) => [row.candidate_key, row]));
    for (const prior of priorResult.rows) {
      const planned = plan.candidates.find((item) => item.candidateKey === prior.candidate_key);
      const identicalReview = prior.status === planned.status &&
        prior.evidence_tier === planned.evidenceTier &&
        prior.reviewed_by === planned.reviewedBy &&
        prior.public_eligible === false;
      if (prior.human_reviewed && !identicalReview) {
        throw new Error(`${prior.candidate_key}: existe una revisión humana diferente; se revierte todo.`);
      }
    }

    const runIds = new Map();
    for (const run of plan.runs) {
      const result = await client.query(`
        insert into discovery_private.facility_source_runs (
          run_key, source_type, source_url, source_license, storage_policy,
          status, started_at, completed_at, observation_count
        ) values ($1,$2,$3,$4,$5,'succeeded',$6,$6,$7)
        on conflict (run_key) do update set
          status='succeeded', completed_at=excluded.completed_at,
          observation_count=excluded.observation_count, error_summary=null
        returning id
      `, [run.runKey, run.sourceType, run.sourceUrl, run.sourceLicense,
        run.storagePolicy, run.completedAt, run.observationCount]);
      runIds.set(run.sourceType, result.rows[0].id);
    }

    const observationIds = new Map();
    let insertedObservations = 0;
    const observationOwners = [...plan.candidates, ...(plan.facilityMatches || [])];
    for (const owner of observationOwners) {
      for (const observation of owner.sources) {
        const runId = runIds.get(observation.sourceType);
        const inserted = await client.query(`
          insert into discovery_private.facility_source_observations (
            run_id, source_type, source_record_key, source_url, retrieved_at,
            source_date, source_license, storage_policy, normalized_name,
            normalized_department, normalized_locality, normalized_address,
            lat, lng, human_note, raw_metadata_storage_permitted, raw_metadata,
            record_hash
          ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,false,null,$16)
          on conflict (source_type, source_record_key, record_hash) do nothing
          returning id
        `, [runId, observation.sourceType, observation.sourceRecordKey,
          observation.sourceUrl, observation.retrievedAt, observation.sourceDate,
          observation.sourceLicense, observation.storagePolicy,
          observation.normalizedName, observation.normalizedDepartment,
          observation.normalizedLocality, observation.normalizedAddress,
          observation.lat, observation.lng, observation.humanNote,
          observation.recordHash]);
        insertedObservations += inserted.rowCount;
        const id = inserted.rows[0]?.id || (await client.query(`
          select id from discovery_private.facility_source_observations
          where source_type=$1 and source_record_key=$2 and record_hash=$3
        `, [observation.sourceType, observation.sourceRecordKey, observation.recordHash])).rows[0]?.id;
        if (!id) throw new Error(`No se pudo resolver observación ${observation.sourceRecordKey}.`);
        observationIds.set(`${owner.candidateKey}|${observation.sourceRecordKey}`, id);
      }
    }

    let insertedOrUpdatedCandidates = 0;
    let insertedLinks = 0;
    let insertedReviewEvents = 0;
    for (const candidate of plan.candidates) {
      const result = await client.query(`
        insert into discovery_private.facility_candidates (
          candidate_key, status, normalized_name, normalized_department,
          normalized_locality, normalized_address, lat, lng,
          best_match_residencial_id, best_match_score, evidence_tier,
          human_reviewed, reviewed_at, reviewed_by, review_note,
          public_eligible, first_seen_at, last_seen_at
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,null,null,$9,true,$10,$11,$12,false,$13,$14)
        on conflict (candidate_key) do update set
          status=excluded.status, normalized_name=excluded.normalized_name,
          normalized_department=excluded.normalized_department,
          normalized_locality=excluded.normalized_locality,
          normalized_address=excluded.normalized_address,
          evidence_tier=excluded.evidence_tier, human_reviewed=true,
          reviewed_at=excluded.reviewed_at, reviewed_by=excluded.reviewed_by,
          review_note=excluded.review_note, public_eligible=false,
          first_seen_at=least(discovery_private.facility_candidates.first_seen_at, excluded.first_seen_at),
          last_seen_at=greatest(discovery_private.facility_candidates.last_seen_at, excluded.last_seen_at),
          updated_at=now()
        where not discovery_private.facility_candidates.human_reviewed
           or (
             discovery_private.facility_candidates.status=excluded.status
             and discovery_private.facility_candidates.evidence_tier=excluded.evidence_tier
             and discovery_private.facility_candidates.reviewed_by=excluded.reviewed_by
             and discovery_private.facility_candidates.public_eligible=false
           )
        returning *
      `, [candidate.candidateKey, candidate.status, candidate.normalizedName,
        candidate.normalizedDepartment, candidate.normalizedLocality,
        candidate.normalizedAddress, candidate.lat, candidate.lng,
        candidate.evidenceTier, candidate.reviewedAt, candidate.reviewedBy,
        candidate.reviewNote, candidate.firstSeenAt, candidate.lastSeenAt]);
      const saved = result.rows[0] || (await client.query(
        "select * from discovery_private.facility_candidates where candidate_key=$1",
        [candidate.candidateKey],
      )).rows[0];
      if (!saved) throw new Error(`No se pudo guardar ${candidate.candidateKey}.`);
      insertedOrUpdatedCandidates += result.rowCount;
      for (const observation of candidate.sources) {
        const observationId = observationIds.get(`${candidate.candidateKey}|${observation.sourceRecordKey}`);
        const linked = await client.query(`
          insert into discovery_private.facility_candidate_sources (
            candidate_id, observation_id, evidence_role, independence_key,
            link_method, linked_by
          ) values ($1,$2,$3,$4,'human',$5)
          on conflict (candidate_id, observation_id) do nothing
          returning candidate_id
        `, [saved.id, observationId, observation.evidenceRole,
          observation.independenceKey, candidate.reviewedBy]);
        insertedLinks += linked.rowCount;
      }
      const prior = priorByKey.get(candidate.candidateKey) || null;
      const event = await client.query(`
        insert into discovery_private.facility_candidate_review_events (
          candidate_id, action, previous_status, new_status,
          previous_evidence_tier, new_evidence_tier, matched_residencial_id,
          reviewer_identifier, review_note, corrections,
          candidate_before, candidate_after, created_at
        )
        select $1,$2,$3,$4,$5,$6,null,$7,$8,'{}'::jsonb,$9::jsonb,$10::jsonb,$11
        where not exists (
          select 1 from discovery_private.facility_candidate_review_events existing
          where existing.candidate_id=$1 and existing.action=$2
            and existing.reviewer_identifier=$7
            and existing.candidate_after->>'candidate_key'=$12
        )
        returning id
      `, [saved.id, candidate.reviewAction, prior?.status || "discovered",
        saved.status, prior?.evidence_tier || "C", saved.evidence_tier,
        candidate.reviewedBy, candidate.reviewNote,
        JSON.stringify(prior || {}), JSON.stringify(saved), candidate.reviewedAt,
        candidate.candidateKey]);
      insertedReviewEvents += event.rowCount;
    }
    let insertedFacilityLinks = 0;
    let insertedFacilityAuditEvents = 0;
    const facilityResolutionRows = [];
    for (const match of plan.facilityMatches || []) {
      const resolution = await client.query(`
        select distinct mapping.facility_id, facility.facility_key
        from elepem_core.legacy_facility_map as mapping
        join elepem_core.facilities as facility on facility.id = mapping.facility_id
        where mapping.legacy_residencial_id = any($1::text[])
          and mapping.mapping_status = 'mapped'
      `, [match.legacyResidencialIds]);
      if (resolution.rowCount !== 1) {
        throw new Error(`${match.candidateKey}: la coincidencia no resuelve una única sede canónica.`);
      }
      const facilityId = resolution.rows[0].facility_id;
      const facilityKey = resolution.rows[0].facility_key;
      for (const observation of match.sources) {
        const observationId = observationIds.get(`${match.candidateKey}|${observation.sourceRecordKey}`);
        const linked = await client.query(`
          insert into elepem_core.facility_observation_links (
            facility_id, observation_id, evidence_role, independence_key, linked_by, linked_at
          ) values ($1,$2,$3,$4,$5,$6)
          on conflict (facility_id, observation_id) do nothing
          returning facility_id
        `, [facilityId, observationId, observation.evidenceRole,
          observation.independenceKey, match.reviewedBy, match.reviewedAt]);
        insertedFacilityLinks += linked.rowCount;
      }
      const requestId = `department-link:${plan.metadata.inputHash.slice(0, 24)}:${sha256(match.candidateKey).slice(0, 16)}`;
      const audit = await client.query(`
        insert into elepem_core.audit_log (
          entity_type, entity_key, action, actor_identifier,
          before_state, after_state, request_id, created_at
        )
        select 'facility', $1, 'link_source_observations', $2,
               null, $3::jsonb, $4, $5
        where not exists (
          select 1 from elepem_core.audit_log where request_id = $4
        )
        returning id
      `, [facilityKey, match.reviewedBy, JSON.stringify({
        candidateKey: match.candidateKey,
        exclusionId: match.exclusionId,
        legacyResidencialIds: match.legacyResidencialIds,
        linkedObservationCount: match.sources.length,
        historical: match.historical,
      }), requestId, match.reviewedAt]);
      insertedFacilityAuditEvents += audit.rowCount;
      facilityResolutionRows.push({
        candidateKey: match.candidateKey,
        exclusionId: match.exclusionId,
        facilityId,
        facilityKey,
        linkedObservations: match.sources.length,
        historical: match.historical,
      });
    }
    const afterPublic = await publicCount(client);
    if (beforePublic !== afterPublic) throw new Error("Cambió public.residenciales; se revierte todo.");
    const verification = await client.query(`
      select candidate_key,status,evidence_tier,human_reviewed,reviewed_by,
             public_eligible
      from discovery_private.facility_candidates
      where candidate_key=any($1::text[])
      order by candidate_key
    `, [keys]);
    if (verification.rowCount !== plan.candidates.length || verification.rows.some((row) => row.public_eligible)) {
      throw new Error("La reconciliación privada falló; se revierte todo.");
    }
    await client.query("commit");
    return {
      publicResidencialesBefore: beforePublic,
      publicResidencialesAfter: afterPublic,
      insertedObservations,
      insertedOrUpdatedCandidates,
      insertedLinks,
      insertedReviewEvents,
      insertedFacilityLinks,
      insertedFacilityAuditEvents,
      facilityResolutions: facilityResolutionRows,
      reconciledCandidates: verification.rowCount,
      publicEligibleCandidates: verification.rows.filter((row) => row.public_eligible).length,
      rows: verification.rows,
    };
  } catch (error) {
    try { await client.query("rollback"); } catch {}
    throw error;
  }
}
