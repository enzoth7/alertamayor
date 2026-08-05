import { createHash } from "node:crypto";
import {
  EXCLUDED_SOURCE_IDS,
  KNOWN_DISTINCT_FROM_EXISTING,
  KNOWN_EXISTING_MATCHES,
  SOURCE_MEMBERSHIP_CORRECTIONS,
  SOURCE_MERGE_GROUPS,
} from "./elepem-v01-reviewed-mappings.mjs";

export function sha256(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

export function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function parseCsv(text) {
  const records = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        value += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(value);
      value = "";
    } else if (character === "\n") {
      row.push(value.replace(/\r$/, ""));
      records.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }

  if (value || row.length) {
    row.push(value.replace(/\r$/, ""));
    records.push(row);
  }
  if (quoted) throw new Error("CSV inválido: comillas sin cerrar.");
  if (records.length === 0) return [];

  const header = records.shift().map((item) => item.replace(/^\uFEFF/, ""));
  return records
    .filter((items) => items.some((item) => item !== ""))
    .map((items, rowIndex) => {
      if (items.length !== header.length) {
        throw new Error(
          `CSV inválido en fila ${rowIndex + 2}: ${items.length} columnas; se esperaban ${header.length}.`,
        );
      }
      return Object.fromEntries(header.map((column, index) => [column, items[index]]));
    });
}

function stableKey(prefix, value, visible = "") {
  const suffix = visible
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  const digest = sha256(value).slice(0, 16).toUpperCase();
  return `${prefix}-${suffix ? `${suffix}-` : ""}${digest}`;
}

function validDate(value) {
  const match = String(value ?? "").match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

function validTimestamp(value, fallback) {
  const parsed = Date.parse(String(value ?? ""));
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : fallback;
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function integerOrNull(value) {
  const parsed = numberOrNull(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function booleanValue(value) {
  return value === true || value === 1 || value === "1" || value === "true";
}

function addressKey(record) {
  const address = normalizeText(record.address ?? record.address_line);
  if (!address) return null;
  return `${normalizeText(record.department)}|${address}`;
}

function sourceTypeForResearch(value) {
  const sourceType = normalizeText(value).replaceAll(" ", "_");
  if (sourceType.startsWith("instagram_") || sourceType.startsWith("facebook_")) {
    return "social_public_url";
  }
  if (sourceType.includes("official") || sourceType.includes("government")) {
    return "official";
  }
  if (sourceType.includes("news") || sourceType.includes("media")) return "news";
  if (sourceType.includes("openstreetmap") || sourceType === "osm") return "openstreetmap";
  if (sourceType === "facility_website") return "facility_website";
  if (sourceType === "public_directory") return "public_directory";
  return "other";
}

function sourceChannelFor({ sourceType, sourceUrl, displayName }) {
  const type = normalizeText(sourceType).replaceAll(" ", "_");
  const context = normalizeText(`${sourceUrl ?? ""} ${displayName ?? ""}`);
  if (type === "official") return "official_sources";
  if (
    type === "openstreetmap" ||
    /openstreetmap|google maps|googlemaps|google com maps|maps google|maps app goo gl|serpapi|mapas? public/.test(context)
  ) {
    return "public_maps";
  }
  if (
    type === "social_public_url" ||
    /instagram|facebook|redes? sociales?|social public/.test(context)
  ) {
    return "public_social_sources";
  }
  if (type === "manual_referral") return "manual_editorial";
  return "other_public_sources";
}

function legacySourceChannel(row) {
  if (
    booleanValue(row.msp_final) ||
    booleanValue(row.msp_registro_historico) ||
    booleanValue(row.mides_social) ||
    booleanValue(row.pacp)
  ) {
    return "official_sources";
  }
  const label = normalizeText(row.source_label);
  if (/openstreetmap|google maps|googlemaps|google com maps|maps google|maps app goo gl|serpapi|mapas? public/.test(label)) {
    return "public_maps";
  }
  if (/instagram|facebook|redes? sociales?|social public/.test(label)) {
    return "public_social_sources";
  }
  if (/manual|editorial|equipo/.test(label)) return "manual_editorial";
  return "other_public_sources";
}

function legacySourceType(channel, sourceLabel) {
  if (channel === "official_sources") return "official";
  if (channel === "public_social_sources") return "social_public_url";
  if (channel === "manual_editorial") return "legacy_app";
  if (channel === "public_maps") {
    return /openstreetmap|\bosm\b/.test(normalizeText(sourceLabel))
      ? "openstreetmap"
      : "public_directory";
  }
  return "other";
}

function splitContactValues(value, type, conflicts, context) {
  const raw = String(value ?? "").trim();
  if (!raw) return [];
  const parts = raw
    .split(/[|;\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length > 1) {
    conflicts.push({
      conflictType: "split_multivalue_contact",
      legacyResidencialId: context.legacyId ?? "",
      officialEntityId: context.officialId ?? "",
      department: context.department ?? "",
      detail: `${type}: ${parts.length} valores separados conservadoramente`,
      requiresHumanReview: true,
      resolution: "Cada valor fue almacenado en una fila; confirmar vigencia.",
    });
  }
  return [...new Set(parts)];
}

function buildOfficialGroups(officialEntities, conflicts) {
  const byId = new Map(officialEntities.map((row) => [String(row.entity_id), { ...row }]));
  for (const [entityId, correction] of SOURCE_MEMBERSHIP_CORRECTIONS) {
    const entity = byId.get(entityId);
    if (entity) Object.assign(entity, correction);
  }

  const memberToRepresentative = new Map();
  const geocodeByRepresentative = new Map();
  for (const group of SOURCE_MERGE_GROUPS) {
    for (const member of group.members) memberToRepresentative.set(member, group.representative);
    if (group.geocode) geocodeByRepresentative.set(group.representative, group.geocode);
  }

  const groups = new Map();
  for (const [entityId, entity] of byId) {
    if (EXCLUDED_SOURCE_IDS.has(entityId)) {
      conflicts.push({
        conflictType: "excluded_contaminated_source",
        legacyResidencialId: "",
        officialEntityId: entityId,
        department: entity.department ?? "",
        detail: EXCLUDED_SOURCE_IDS.get(entityId),
        requiresHumanReview: true,
        resolution: "No importado al modelo canónico.",
      });
      continue;
    }
    const representativeId = memberToRepresentative.get(entityId) ?? entityId;
    const members = groups.get(representativeId) ?? [];
    members.push(entity);
    groups.set(representativeId, members);
  }

  return [...groups.entries()].map(([representativeId, members]) => {
    const representative =
      members.find((member) => String(member.entity_id) === representativeId) ?? members[0];
    const geocodeId = geocodeByRepresentative.get(representativeId) ?? representativeId;
    return {
      representativeId,
      representative,
      geocodeEntity:
        members.find((member) => String(member.entity_id) === geocodeId) ?? representative,
      members,
    };
  });
}

function matchOfficialGroups(groups, legacyRows, conflicts) {
  const legacyById = new Map(legacyRows.map((row) => [String(row.id), row]));
  const legacyAddressIndex = new Map();
  for (const row of legacyRows) {
    const key = addressKey(row);
    if (!key) continue;
    const matches = legacyAddressIndex.get(key) ?? [];
    matches.push(row);
    legacyAddressIndex.set(key, matches);
  }

  const assignedLegacyIds = new Set();
  const matches = new Map();
  for (const group of groups) {
    const explicitPairs = group.members
      .map((member) => [String(member.entity_id), KNOWN_EXISTING_MATCHES.get(String(member.entity_id))])
      .filter(([, legacyId]) => legacyId && legacyById.has(legacyId));
    const exactRows = group.members
      .map((member) => legacyById.get(String(member.entity_id)))
      .filter(Boolean);

    let legacy = null;
    let method = null;
    if (explicitPairs.length > 0) {
      const ids = [...new Set(explicitPairs.map(([, legacyId]) => legacyId))];
      if (ids.length === 1) {
        legacy = legacyById.get(ids[0]);
        method = "human_review";
      }
    } else if (exactRows.length === 1) {
      legacy = exactRows[0];
      method = "exact_id";
    } else {
      const addressMatches = new Map();
      for (const member of group.members) {
        const key = addressKey(member);
        if (!key) continue;
        for (const candidate of legacyAddressIndex.get(key) ?? []) {
          if (KNOWN_DISTINCT_FROM_EXISTING.get(String(member.entity_id)) === String(candidate.id)) {
            conflicts.push({
              conflictType: "reviewed_distinct_same_address",
              legacyResidencialId: String(candidate.id),
              officialEntityId: String(member.entity_id),
              department: candidate.department ?? "",
              detail: "La revisión previa determinó que no son la misma sede.",
              requiresHumanReview: false,
              resolution: "Conservar como sedes separadas.",
            });
            continue;
          }
          addressMatches.set(String(candidate.id), candidate);
        }
      }
      if (addressMatches.size === 1) {
        legacy = [...addressMatches.values()][0];
        method = "exact_address";
      } else if (addressMatches.size > 1) {
        conflicts.push({
          conflictType: "ambiguous_address_match",
          legacyResidencialId: [...addressMatches.keys()].join("|"),
          officialEntityId: group.representativeId,
          department: group.representative.department ?? "",
          detail: `${addressMatches.size} filas heredadas comparten la dirección candidata.`,
          requiresHumanReview: true,
          resolution: "No fusionado; se crea sede oficial separada.",
        });
      }
    }

    if (legacy && assignedLegacyIds.has(String(legacy.id))) {
      conflicts.push({
        conflictType: "multiple_official_groups_for_legacy",
        legacyResidencialId: String(legacy.id),
        officialEntityId: group.representativeId,
        department: legacy.department ?? "",
        detail: "Otra agrupación oficial ya fue vinculada a la misma fila heredada.",
        requiresHumanReview: true,
        resolution: "No fusionado; se crea sede oficial separada.",
      });
      legacy = null;
      method = null;
    }
    if (legacy) assignedLegacyIds.add(String(legacy.id));
    matches.set(group.representativeId, legacy ? { legacy, method } : null);
  }
  return matches;
}

function addUnique(target, seen, key, row) {
  if (seen.has(key)) return;
  seen.add(key);
  target.push(row);
}

export function buildBackfillPlan({
  remoteSnapshot,
  officialEntities,
  officialCsvRows,
  sourceRecordRows,
  sourceCatalogRows,
  osmDocument,
  paysanduDocument,
  artigasDocument,
  generatedAt = new Date().toISOString(),
}) {
  const conflicts = [];
  const legacyRows = remoteSnapshot.residenciales ?? remoteSnapshot.facilities ?? [];
  if (legacyRows.length === 0) throw new Error("El snapshot remoto no contiene residenciales.");
  if (officialEntities.length !== officialCsvRows.length) {
    throw new Error(
      `La fuente oficial JSON (${officialEntities.length}) y CSV (${officialCsvRows.length}) difieren.`,
    );
  }
  const jsonIds = new Set(officialEntities.map((row) => String(row.entity_id)));
  const csvIds = new Set(officialCsvRows.map((row) => String(row.entity_id)));
  if (jsonIds.size !== csvIds.size || [...jsonIds].some((id) => !csvIds.has(id))) {
    throw new Error("Los IDs de la fuente oficial JSON y CSV no coinciden.");
  }

  const groups = buildOfficialGroups(officialEntities, conflicts);
  const groupMatches = matchOfficialGroups(groups, legacyRows, conflicts);
  const groupByMember = new Map();
  for (const group of groups) for (const member of group.members) groupByMember.set(String(member.entity_id), group);

  const sourceCatalog = [];
  const sourceCatalogSeen = new Set();
  const sourceCatalogByUrl = new Map();
  function registerCatalog(row) {
    if (sourceCatalogSeen.has(row.sourceKey)) return row.sourceKey;
    const normalizedRow = {
      ...row,
      sourceChannel:
        row.sourceChannel ??
        sourceChannelFor({
          sourceType: row.sourceType,
          sourceUrl: row.baseUrl,
          displayName: row.displayName,
        }),
    };
    sourceCatalogSeen.add(row.sourceKey);
    sourceCatalog.push(normalizedRow);
    if (normalizedRow.baseUrl) sourceCatalogByUrl.set(normalizedRow.baseUrl, normalizedRow.sourceKey);
    return row.sourceKey;
  }
  for (const row of sourceCatalogRows) {
    const url = String(row.url ?? "").trim();
    if (!/^https?:\/\//i.test(url)) continue;
    registerCatalog({
      sourceKey: stableKey("SRC-OFFICIAL", row.source_id ?? url, row.source_id),
      displayName: String(row.title || row.institution || row.source_id).slice(0, 240),
      sourceType: "official",
      baseUrl: url,
      authorityLevel: "official_nominal",
      storagePolicy: "normalized_only",
      sourceLicense: null,
    });
  }
  const legacyCatalogs = new Map();
  const legacyCatalogDefinitions = {
    official_sources: {
      displayName: "Fuentes oficiales importadas desde public.residenciales",
      sourceType: "official",
      authorityLevel: "official_nominal",
    },
    public_maps: {
      displayName: "Mapas públicos importados desde public.residenciales",
      sourceType: "public_directory",
      authorityLevel: "lead",
    },
    public_social_sources: {
      displayName: "Fuentes públicas de redes sociales importadas desde public.residenciales",
      sourceType: "social_public_url",
      authorityLevel: "lead",
    },
    other_public_sources: {
      displayName: "Otras fuentes públicas importadas desde public.residenciales",
      sourceType: "other",
      authorityLevel: "lead",
    },
    manual_editorial: {
      displayName: "Carga editorial heredada de public.residenciales",
      sourceType: "legacy_app",
      authorityLevel: "lead",
    },
  };
  for (const [sourceChannel, definition] of Object.entries(legacyCatalogDefinitions)) {
    legacyCatalogs.set(
      sourceChannel,
      registerCatalog({
        sourceKey: `SRC-LEGACY-${sourceChannel.toUpperCase().replaceAll("_", "-")}`,
        displayName: definition.displayName,
        sourceType: definition.sourceType,
        sourceChannel,
        baseUrl: `https://${remoteSnapshot.metadata.projectRef}.supabase.co`,
        authorityLevel: definition.authorityLevel,
        storagePolicy:
          sourceChannel === "public_social_sources" ? "reference_only" : "normalized_only",
        sourceLicense: null,
      }),
    );
  }

  const sourceRuns = [];
  const runSeen = new Set();
  function registerRun(sourceKey, sourceType, sourceUrl, startedAt) {
    const runKey = `normalized-backfill:${sourceKey}:${validDate(generatedAt)}`;
    if (!runSeen.has(runKey)) {
      runSeen.add(runKey);
      sourceRuns.push({
        runKey,
        sourceCatalogKey: sourceKey,
        sourceType,
        sourceUrl,
        sourceLicense: null,
        storagePolicy: sourceType === "social_public_url" ? "reference_only" : "normalized_only",
        status: "succeeded",
        startedAt,
        completedAt: startedAt,
      });
    }
    return runKey;
  }

  const observations = [];
  const observationSeen = new Set();
  function registerObservation(row) {
    const key = `${row.sourceType}|${row.sourceRecordKey}|${row.recordHash}`;
    if (!observationSeen.has(key)) {
      observationSeen.add(key);
      observations.push({ logicalKey: key, ...row });
    }
    return key;
  }

  const facilities = [];
  const facilityByLegacyId = new Map();
  const facilityByOfficialId = new Map();
  const names = [];
  const nameSeen = new Set();
  const addresses = [];
  const contacts = [];
  const contactSeen = new Set();
  const organizations = [];
  const organizationSeen = new Set();
  const operators = [];
  const capacities = [];
  const geocodes = [];
  const administrativeEvents = [];
  const observationLinks = [];
  const observationLinkSeen = new Set();
  const externalIds = [];
  const externalIdSeen = new Set();
  const legacyMappings = [];

  const legacyRetrievedAt = validTimestamp(remoteSnapshot.metadata.retrievedAt, generatedAt);
  const legacyRunKeys = new Map();
  const legacyObservationById = new Map();
  for (const row of legacyRows) {
    const sourceChannel = legacySourceChannel(row);
    const sourceType = legacySourceType(sourceChannel, row.source_label);
    const catalogKey = legacyCatalogs.get(sourceChannel);
    let runKey = legacyRunKeys.get(sourceChannel);
    if (!runKey) {
      runKey = registerRun(
        catalogKey,
        sourceType,
        `https://${remoteSnapshot.metadata.projectRef}.supabase.co`,
        legacyRetrievedAt,
      );
      legacyRunKeys.set(sourceChannel, runKey);
    }
    const payload = {
      id: row.id,
      name: row.name,
      department: row.department,
      locality: row.locality,
      address: row.address,
      places: row.places,
      lat: row.lat ?? row.latitude,
      lng: row.lng ?? row.longitude,
      updated_at: row.updated_at ?? row.updatedAt,
    };
    const logicalKey = registerObservation({
      runKey,
      sourceCatalogKey: catalogKey,
      sourceType,
      sourceRecordKey: `public.residenciales:${row.id}`,
      sourceUrl: `https://${remoteSnapshot.metadata.projectRef}.supabase.co`,
      retrievedAt: legacyRetrievedAt,
      sourceDate: validDate(remoteSnapshot.metadata.retrievedAt),
      sourceLicense: null,
      storagePolicy:
        sourceChannel === "public_social_sources" ? "reference_only" : "normalized_only",
      normalizedName: normalizeText(row.name) || null,
      normalizedDepartment: normalizeText(row.department) || null,
      normalizedLocality: normalizeText(row.locality) || null,
      normalizedAddress: normalizeText(row.address) || null,
      lat: numberOrNull(row.lat ?? row.latitude),
      lng: numberOrNull(row.lng ?? row.longitude),
      humanNote: `Snapshot read-only usado para reconciliación local. Fuente heredada: ${String(row.source_label || "sin etiqueta").slice(0, 300)}.`,
      recordHash: sha256(JSON.stringify(payload)),
    });
    legacyObservationById.set(String(row.id), logicalKey);
  }

  const groupObservationKeys = new Map();
  for (const record of sourceRecordRows) {
    const entityId = String(record.entity_id ?? "");
    const group = groupByMember.get(entityId);
    if (!group) continue;
    const sourceUrl = String(record.source_url ?? "").trim();
    if (!/^https?:\/\//i.test(sourceUrl)) {
      conflicts.push({
        conflictType: "official_source_missing_url",
        legacyResidencialId: "",
        officialEntityId: entityId,
        department: record.department ?? "",
        detail: `Registro ${record.record_id || "sin ID"} sin URL válida.`,
        requiresHumanReview: true,
        resolution: "Observación no importada.",
      });
      continue;
    }
    let catalogKey = sourceCatalogByUrl.get(sourceUrl);
    if (!catalogKey) {
      catalogKey = registerCatalog({
        sourceKey: stableKey("SRC-OFFICIAL-URL", sourceUrl),
        displayName: String(record.source_title || record.source_type || "Fuente oficial").slice(0, 240),
        sourceType: "official",
        baseUrl: sourceUrl,
        authorityLevel: "official_nominal",
        storagePolicy: "normalized_only",
        sourceLicense: null,
      });
    }
    const runKey = registerRun(catalogKey, "official", sourceUrl, generatedAt);
    const recordHash = sha256(
      JSON.stringify({
        record_id: record.record_id,
        entity_id: entityId,
        source_type: record.source_type,
        source_date: record.source_date,
        source_url: sourceUrl,
        name: record.name,
        address: record.address,
      }),
    );
    const logicalKey = registerObservation({
      runKey,
      sourceCatalogKey: catalogKey,
      sourceType: "official",
      sourceRecordKey: String(record.record_id || `${entityId}:${recordHash.slice(0, 16)}`),
      sourceUrl,
      retrievedAt: generatedAt,
      sourceDate: validDate(record.source_date),
      sourceLicense: null,
      storagePolicy: "normalized_only",
      normalizedName: normalizeText(record.name) || null,
      normalizedDepartment: normalizeText(record.department) || null,
      normalizedLocality: normalizeText(record.locality) || null,
      normalizedAddress: normalizeText(record.address) || null,
      lat: null,
      lng: null,
      humanNote: null,
      recordHash,
    });
    const groupKeys = groupObservationKeys.get(group.representativeId) ?? [];
    groupKeys.push({ logicalKey, record });
    groupObservationKeys.set(group.representativeId, groupKeys);
  }

  const matchedGroupByLegacyId = new Map();
  for (const group of groups) {
    const match = groupMatches.get(group.representativeId);
    if (match) matchedGroupByLegacyId.set(String(match.legacy.id), group);
  }

  function addFacility({ legacy, group }) {
    const representative = group?.representative ?? null;
    const facilityKey = legacy
      ? stableKey("FAC-LEGACY", legacy.id, legacy.id)
      : stableKey("FAC-OFFICIAL", group.representativeId, group.representativeId);
    const flags = {
      mspFinal:
        booleanValue(legacy?.msp_final) || group?.members.some((row) => booleanValue(row.msp_final)),
      historical:
        booleanValue(legacy?.msp_registro_historico) ||
        group?.members.some((row) => booleanValue(row.msp_registro_historico)),
      mides:
        booleanValue(legacy?.mides_social) || group?.members.some((row) => booleanValue(row.mides_social)),
      pacp: booleanValue(legacy?.pacp) || group?.members.some((row) => booleanValue(row.pacp)),
    };
    const lifecycleStatus = legacy
      ? "current"
      : flags.mspFinal || flags.mides
        ? "current"
        : flags.historical
          ? "historical"
          : "unknown";
    facilities.push({
      facilityKey,
      lifecycleStatus,
      reviewStatus: "needs_review",
      publicationStatus: "private",
    });
    if (legacy) facilityByLegacyId.set(String(legacy.id), facilityKey);
    if (group) for (const member of group.members) facilityByOfficialId.set(String(member.entity_id), facilityKey);

    const preferredName = String(legacy?.name || representative?.name || "").trim();
    if (preferredName) {
      addUnique(names, nameSeen, `${facilityKey}|canonical|${normalizeText(preferredName)}`, {
        facilityKey,
        name: preferredName,
        normalizedName: normalizeText(preferredName),
        nameType: "canonical",
        isPreferred: true,
        observationKey: legacy
          ? legacyObservationById.get(String(legacy.id))
          : groupObservationKeys.get(group.representativeId)?.[0]?.logicalKey ?? null,
      });
    }
    for (const observed of [
      ...(legacy?.aliases ?? []),
      ...(group?.members.map((member) => member.name) ?? []),
    ]) {
      const observedName = String(observed ?? "").trim();
      const normalizedName = normalizeText(observedName);
      if (!normalizedName || normalizedName === normalizeText(preferredName)) continue;
      addUnique(names, nameSeen, `${facilityKey}|observed|${normalizedName}`, {
        facilityKey,
        name: observedName,
        normalizedName,
        nameType: "observed",
        isPreferred: false,
        observationKey: groupObservationKeys.get(group?.representativeId)?.[0]?.logicalKey ?? null,
      });
    }

    const selectedAddress = String(legacy?.address || representative?.address || "").trim();
    if (selectedAddress) {
      addresses.push({
        addressKey: `${facilityKey}|${normalizeText(selectedAddress)}`,
        facilityKey,
        addressLine: selectedAddress,
        normalizedAddress: normalizeText(selectedAddress),
        locality: String(legacy?.locality || representative?.locality || "Sin localidad").slice(0, 160),
        department: String(legacy?.department || representative?.department || "Sin departamento").slice(0, 100),
        addressType: lifecycleStatus === "historical" ? "historical" : "physical",
        isCurrent: lifecycleStatus !== "historical",
        observationKey: legacy
          ? legacyObservationById.get(String(legacy.id))
          : groupObservationKeys.get(group.representativeId)?.[0]?.logicalKey ?? null,
      });
    } else {
      conflicts.push({
        conflictType: "facility_missing_address",
        legacyResidencialId: legacy?.id ?? "",
        officialEntityId: group?.representativeId ?? "",
        department: legacy?.department ?? representative?.department ?? "",
        detail: "La sede no tiene una dirección utilizable.",
        requiresHumanReview: true,
        resolution: "Sede privada sin dirección; no elegible para mapa.",
      });
    }
    if (
      legacy && representative?.address &&
      normalizeText(legacy.address) !== normalizeText(representative.address)
    ) {
      conflicts.push({
        conflictType: "address_difference",
        legacyResidencialId: String(legacy.id),
        officialEntityId: group.representativeId,
        department: legacy.department ?? "",
        detail: "La dirección heredada difiere de la agrupación oficial vinculada.",
        requiresHumanReview: true,
        resolution: "Se conserva la dirección heredada como actual; la oficial permanece en la observación.",
      });
    }

    const geocodeSource = legacy ?? group?.geocodeEntity;
    const latitude = numberOrNull(geocodeSource?.lat ?? geocodeSource?.latitude);
    const longitude = numberOrNull(geocodeSource?.lng ?? geocodeSource?.longitude);
    if (selectedAddress && latitude !== null && longitude !== null) {
      const method = String(geocodeSource?.geocode_method ?? "").toLowerCase();
      geocodes.push({
        facilityKey,
        addressKey: `${facilityKey}|${normalizeText(selectedAddress)}`,
        provider: legacy ? "legacy" : method.includes("ide") ? "ide_uy" : "legacy",
        lat: latitude,
        lng: longitude,
        precision: legacy?.precision ?? "referencial",
        precisionLabel: String(legacy?.precision_label ?? legacy?.precisionLabel ?? geocodeSource?.geocode_method ?? "Coordenada heredada").slice(0, 160),
        confidence: numberOrNull(geocodeSource?.geocode_confidence),
        checkedAt: validTimestamp(legacy?.updated_at ?? legacy?.updatedAt, generatedAt),
        isCurrent: lifecycleStatus !== "historical",
        observationKey: legacy
          ? legacyObservationById.get(String(legacy.id))
          : groupObservationKeys.get(group.representativeId)?.[0]?.logicalKey ?? null,
      });
    }

    const capacity = integerOrNull(legacy?.places ?? representative?.capacity);
    const primaryObservation = legacy
      ? legacyObservationById.get(String(legacy.id))
      : groupObservationKeys.get(group.representativeId)?.[0]?.logicalKey ?? null;
    if (capacity !== null && primaryObservation) {
      capacities.push({
        facilityKey,
        places: capacity,
        isCurrent: lifecycleStatus !== "historical",
        observationKey: primaryObservation,
      });
    }

    const eventDefinitions = [
      [flags.mspFinal, "MSP", "authorization_final", "Habilitación final MSP", true, "msp_habilitacion_final_2026"],
      [flags.historical, "MSP", "historical_registration", "Registro histórico MSP", !flags.mspFinal, "msp_certificado_registro_historico"],
      [flags.mides, "MIDES", "social_certificate", "Certificado Social MIDES", true, "mides_certificado_social"],
      [flags.pacp, "PACP", "provider_registry", "Registro de proveedor PACP", true, "pacp_proveedor_2023"],
    ];
    for (const [enabled, authority, stage, label, isCurrent, recordType] of eventDefinitions) {
      if (!enabled) continue;
      const observationKey =
        groupObservationKeys
          .get(group?.representativeId)
          ?.find(({ record }) => record.source_type === recordType)?.logicalKey ?? primaryObservation;
      if (!observationKey) {
        conflicts.push({
          conflictType: "administrative_flag_without_observation",
          legacyResidencialId: legacy?.id ?? "",
          officialEntityId: group?.representativeId ?? "",
          department: legacy?.department ?? representative?.department ?? "",
          detail: `${stage} no tiene una observación enlazable.`,
          requiresHumanReview: true,
          resolution: "Evento no importado.",
        });
        continue;
      }
      administrativeEvents.push({
        facilityKey,
        authority,
        administrativeStage: stage,
        statusLabel: label,
        effectiveDate: validDate(representative?.latest_public_date),
        isCurrent,
        observationKey,
      });
    }

    for (const member of group?.members ?? []) {
      for (const [type, rawValue] of [["phone", member.phone], ["email", member.email]]) {
        for (const value of splitContactValues(rawValue, type, conflicts, {
          legacyId: legacy?.id,
          officialId: member.entity_id,
          department: member.department,
        })) {
          const normalizedValue = normalizeText(value).replaceAll(" ", "");
          addUnique(contacts, contactSeen, `${facilityKey}|${type}|${normalizedValue}`, {
            facilityKey,
            contactType: type,
            contactValue: value.slice(0, 500),
            normalizedValue: normalizedValue.slice(0, 500),
            isCurrent: String(member.entity_id) === group.representativeId,
            observationKey: groupObservationKeys.get(group.representativeId)?.[0]?.logicalKey ?? null,
          });
        }
      }
    }

    const legalName = String(representative?.legal_name ?? "").trim();
    if (legalName) {
      const organizationKey = stableKey(
        "ORG",
        `${representative.rut || ""}|${legalName}`,
      );
      if (!organizationSeen.has(organizationKey)) {
        organizationSeen.add(organizationKey);
        organizations.push({ organizationKey, legalName, organizationType: "unknown" });
      }
      operators.push({
        facilityKey,
        organizationKey,
        relationshipType: "license_holder",
        observationKey: primaryObservation,
      });
    }

    if (group) {
      for (const member of group.members) {
        const externalKey = `official|${member.entity_id}`;
        if (externalIdSeen.has(externalKey)) continue;
        externalIdSeen.add(externalKey);
        externalIds.push({
          ownerType: "facility",
          ownerKey: facilityKey,
          observationKey:
            groupObservationKeys
              .get(group.representativeId)
              ?.find(({ record }) => String(record.entity_id) === String(member.entity_id))?.logicalKey ?? null,
          provider: "official",
          externalId: String(member.entity_id),
          externalUrl: null,
          linkMethod: "official_import",
          linkedBy: "normalized-backfill-2026-08-03",
          linkedAt: generatedAt,
        });
      }
      for (const { logicalKey } of groupObservationKeys.get(group.representativeId) ?? []) {
        addUnique(
          observationLinks,
          observationLinkSeen,
          `${facilityKey}|${logicalKey}`,
          {
            facilityKey,
            observationKey: logicalKey,
            evidenceRole: "evidence_a",
            independenceKey: null,
            linkedBy: "normalized-backfill-2026-08-03",
          },
        );
      }
    }
    if (legacy) {
      const logicalKey = legacyObservationById.get(String(legacy.id));
      addUnique(
        observationLinks,
        observationLinkSeen,
        `${facilityKey}|${logicalKey}`,
        {
          facilityKey,
          observationKey: logicalKey,
          evidenceRole: "context",
          independenceKey: null,
          linkedBy: "normalized-backfill-2026-08-03",
        },
      );
      legacyMappings.push({
        legacyResidencialId: String(legacy.id),
        facilityKey,
        mappingStatus: "mapped",
        matchMethod: "exact_id",
        confidence: 1,
        mappedBy: "normalized-backfill-2026-08-03",
        mappedAt: generatedAt,
        officialEntityIds: group?.members.map((member) => String(member.entity_id)) ?? [],
        department: String(legacy.department ?? ""),
      });
    }
  }

  for (const legacy of legacyRows) {
    addFacility({ legacy, group: matchedGroupByLegacyId.get(String(legacy.id)) ?? null });
  }
  for (const group of groups) {
    if (!groupMatches.get(group.representativeId)) addFacility({ legacy: null, group });
  }

  // Preserve the current private discovery workflow without copying raw metadata.
  const remoteRunKeyById = new Map();
  for (const run of remoteSnapshot.sourceRuns ?? []) {
    const catalogKey = registerCatalog({
      sourceKey: stableKey("SRC-REMOTE", `${run.source_type}|${run.source_url}`),
      displayName: `Fuente privada existente: ${run.source_type}`,
      sourceType: run.source_type,
      sourceChannel: sourceChannelFor({
        sourceType: run.source_type,
        sourceUrl: run.source_url,
        displayName: `Fuente privada existente: ${run.source_type}`,
      }),
      baseUrl: run.source_url,
      authorityLevel: run.source_type === "official" ? "official_nominal" : "lead",
      storagePolicy: run.storage_policy,
      sourceLicense: run.source_license,
    });
    const runKey = String(run.run_key);
    if (!runSeen.has(runKey)) {
      runSeen.add(runKey);
      sourceRuns.push({
        runKey,
        sourceCatalogKey: catalogKey,
        sourceType: run.source_type,
        sourceUrl: run.source_url,
        sourceLicense: run.source_license,
        storagePolicy: run.storage_policy,
        status: run.status,
        startedAt: run.started_at,
        completedAt: run.completed_at,
      });
    }
    remoteRunKeyById.set(String(run.id), runKey);
  }
  const remoteObservationKeyById = new Map();
  for (const observation of remoteSnapshot.sourceObservations ?? []) {
    const runKey = remoteRunKeyById.get(String(observation.run_id));
    const run = sourceRuns.find((item) => item.runKey === runKey);
    const logicalKey = registerObservation({
      runKey,
      sourceCatalogKey: run?.sourceCatalogKey ?? null,
      sourceType: observation.source_type,
      sourceRecordKey: observation.source_record_key,
      sourceUrl: observation.source_url,
      retrievedAt: observation.retrieved_at,
      sourceDate: observation.source_date,
      sourceLicense: observation.source_license,
      storagePolicy: observation.storage_policy,
      normalizedName: observation.normalized_name,
      normalizedDepartment: observation.normalized_department,
      normalizedLocality: observation.normalized_locality,
      normalizedAddress: observation.normalized_address,
      lat: numberOrNull(observation.lat),
      lng: numberOrNull(observation.lng),
      humanNote: observation.human_note,
      recordHash: observation.record_hash,
    });
    remoteObservationKeyById.set(String(observation.id), logicalKey);
  }

  const candidates = [];
  const candidateSeen = new Set();
  const remoteCandidateKeyById = new Map();
  for (const candidate of remoteSnapshot.candidates ?? []) {
    const candidateKey = String(candidate.candidate_key);
    candidateSeen.add(candidateKey);
    remoteCandidateKeyById.set(String(candidate.id), candidateKey);
    candidates.push({
      candidateKey,
      status: candidate.status,
      normalizedName: candidate.normalized_name,
      normalizedDepartment: candidate.normalized_department,
      normalizedLocality: candidate.normalized_locality,
      normalizedAddress: candidate.normalized_address,
      lat: numberOrNull(candidate.lat),
      lng: numberOrNull(candidate.lng),
      bestMatchResidencialId: candidate.best_match_residencial_id,
      bestMatchScore: numberOrNull(candidate.best_match_score),
      evidenceTier: candidate.evidence_tier,
      humanReviewed: booleanValue(candidate.human_reviewed),
      reviewedAt: candidate.reviewed_at,
      reviewedBy: candidate.reviewed_by,
      reviewNote: candidate.review_note,
      publicEligible: false,
      firstSeenAt: candidate.first_seen_at,
      lastSeenAt: candidate.last_seen_at,
    });
  }
  const candidateSources = [];
  for (const link of remoteSnapshot.candidateSources ?? []) {
    const candidateKey = remoteCandidateKeyById.get(String(link.candidate_id));
    const observationKey = remoteObservationKeyById.get(String(link.observation_id));
    if (!candidateKey || !observationKey) continue;
    candidateSources.push({
      candidateKey,
      observationKey,
      evidenceRole: link.evidence_role,
      independenceKey: link.independence_key,
      linkMethod: link.link_method,
      linkedBy: link.linked_by,
      linkedAt: link.linked_at,
    });
  }

  for (const external of remoteSnapshot.externalIds ?? []) {
    const externalKey = `${external.provider}|${external.external_id}`;
    if (externalIdSeen.has(externalKey)) continue;
    const candidateKey = remoteCandidateKeyById.get(String(external.candidate_id));
    if (!candidateKey && !external.residencial_id) continue;
    externalIdSeen.add(externalKey);
    externalIds.push({
      ownerType: candidateKey ? "candidate" : "legacy",
      ownerKey: candidateKey ?? String(external.residencial_id),
      observationKey: remoteObservationKeyById.get(String(external.observation_id)) ?? null,
      provider: external.provider,
      externalId: external.external_id,
      externalUrl: external.external_url,
      linkMethod: external.link_method,
      linkedBy: external.linked_by,
      linkedAt: external.linked_at,
    });
  }

  const matchSuggestions = (remoteSnapshot.matchSuggestions ?? [])
    .map((suggestion) => ({
      candidateKey: remoteCandidateKeyById.get(String(suggestion.candidate_id)),
      residencialId: suggestion.residencial_id,
      facilityKey: facilityByLegacyId.get(String(suggestion.residencial_id)) ?? null,
      rank: Number(suggestion.rank),
      score: Number(suggestion.score),
      components: suggestion.components,
      generatedAt: suggestion.generated_at,
    }))
    .filter((suggestion) => suggestion.candidateKey);

  function addResearch(document, label) {
    for (const record of document.records ?? []) {
      const candidateKey = String(record.candidate_key ?? record.candidateKey ?? "").trim();
      const observedName = String(record.observed_name ?? record.name ?? "").trim();
      if (!candidateKey || !observedName) continue;
      if (!candidateSeen.has(candidateKey)) {
        candidateSeen.add(candidateKey);
        const department = String(record.department ?? "").trim() || null;
        const locality = String(record.locality ?? "").trim() || null;
        const address = String(record.address ?? "").trim() || null;
        candidates.push({
          candidateKey,
          status: "needs_review",
          normalizedName: normalizeText(observedName),
          normalizedDepartment: department ? normalizeText(department) : null,
          normalizedLocality: locality ? normalizeText(locality) : null,
          normalizedAddress: address ? normalizeText(address) : null,
          lat: null,
          lng: null,
          bestMatchResidencialId: null,
          bestMatchScore: null,
          evidenceTier: "C",
          humanReviewed: false,
          reviewedAt: null,
          reviewedBy: null,
          reviewNote: null,
          publicEligible: false,
          firstSeenAt: validTimestamp(document.generated_at ?? document.metadata?.generatedAt, generatedAt),
          lastSeenAt: validTimestamp(document.generated_at ?? document.metadata?.generatedAt, generatedAt),
        });
        if (!department || !address) {
          conflicts.push({
            conflictType: "candidate_missing_location",
            legacyResidencialId: "",
            officialEntityId: candidateKey,
            department: department ?? "",
            detail: `Candidato ${label} sin ${!department ? "departamento" : "dirección"} completo.`,
            requiresHumanReview: true,
            resolution: "Permanece privado con nivel C.",
          });
        }
      }

      let firstSource = true;
      for (const [index, source] of (record.sources ?? []).entries()) {
        const sourceUrl = String(source.url ?? "").trim();
        if (!/^https?:\/\//i.test(sourceUrl)) continue;
        const sourceType = sourceTypeForResearch(source.type);
        const social = sourceType === "social_public_url";
        const host = new URL(sourceUrl).hostname.toLowerCase();
        const catalogKey = registerCatalog({
          sourceKey: stableKey("SRC-RESEARCH", `${sourceType}|${host}`, host),
          displayName: `${label}: ${host}`.slice(0, 240),
          sourceType,
          sourceChannel: sourceChannelFor({
            sourceType,
            sourceUrl,
            displayName: `${label}: ${host}`,
          }),
          baseUrl: `https://${host}`,
          authorityLevel:
            sourceType === "official"
              ? "official_nominal"
              : social
                ? "lead"
                : "independent_public",
          storagePolicy: social ? "reference_only" : "normalized_only",
          sourceLicense: null,
        });
        const retrievedAt = validTimestamp(source.observed_at, generatedAt);
        const runKey = registerRun(catalogKey, sourceType, sourceUrl, retrievedAt);
        const recordHash = sha256(
          JSON.stringify({ candidateKey, type: source.type, url: sourceUrl, observedAt: source.observed_at }),
        );
        const observationKey = registerObservation({
          runKey,
          sourceCatalogKey: catalogKey,
          sourceType,
          sourceRecordKey: `${candidateKey}:${index + 1}`,
          sourceUrl,
          retrievedAt,
          sourceDate: validDate(source.source_date),
          sourceLicense: null,
          storagePolicy: social ? "reference_only" : "normalized_only",
          normalizedName: social ? null : normalizeText(observedName),
          normalizedDepartment: social ? null : normalizeText(record.department) || null,
          normalizedLocality: social ? null : normalizeText(record.locality) || null,
          normalizedAddress: social ? null : normalizeText(record.address) || null,
          lat: null,
          lng: null,
          humanNote: social
            ? "URL pública identificada por investigación humana; requiere revisión."
            : "Referencia pública importada; requiere revisión humana.",
          recordHash,
        });
        candidateSources.push({
          candidateKey,
          observationKey,
          evidenceRole: firstSource ? "lead" : "context",
          independenceKey: host,
          linkMethod: "human",
          linkedBy: "chatgpt-research-import-2026-08-03",
          linkedAt: retrievedAt,
        });
        firstSource = false;
      }
    }
  }
  addResearch(paysanduDocument, "Paysandú");
  addResearch(artigasDocument, "Artigas");

  const sourceRunCounts = new Map();
  for (const observation of observations) {
    sourceRunCounts.set(observation.runKey, (sourceRunCounts.get(observation.runKey) ?? 0) + 1);
  }
  for (const run of sourceRuns) run.observationCount = sourceRunCounts.get(run.runKey) ?? 0;

  const officialMatchMethods = { exact_id: 0, exact_address: 0, human_review: 0, unmatched: 0 };
  for (const match of groupMatches.values()) {
    if (!match) officialMatchMethods.unmatched += 1;
    else officialMatchMethods[match.method] += 1;
  }
  const conflictTypes = {};
  for (const conflict of conflicts) {
    conflictTypes[conflict.conflictType] = (conflictTypes[conflict.conflictType] ?? 0) + 1;
  }
  const summary = {
    legacyRows: legacyRows.length,
    officialJsonRows: officialEntities.length,
    officialCsvRows: officialCsvRows.length,
    officialSourceRecords: sourceRecordRows.length,
    officialSourceCatalogRows: sourceCatalogRows.length,
    reviewedMergeGroups: SOURCE_MERGE_GROUPS.length,
    excludedOfficialRows: EXCLUDED_SOURCE_IDS.size,
    officialMatchMethods,
    facilities: facilities.length,
    legacyMappings: legacyMappings.length,
    sourceCatalog: sourceCatalog.length,
    sourceRuns: sourceRuns.length,
    sourceObservations: observations.length,
    candidates: candidates.length,
    candidateSources: candidateSources.length,
    externalIds: externalIds.length,
    matchSuggestions: matchSuggestions.length,
    conflicts: conflicts.length,
    conflictTypes,
    publicApprovedRowsPlanned: 0,
  };

  return {
    generatedAt,
    summary,
    legacyRows,
    sourceCatalog,
    sourceRuns,
    observations,
    facilities,
    names,
    addresses,
    contacts,
    organizations,
    operators,
    capacities,
    geocodes,
    administrativeEvents,
    observationLinks,
    externalIds,
    legacyMappings,
    candidates,
    candidateSources,
    matchSuggestions,
    conflicts,
    osmInputCount: (osmDocument.candidates ?? []).length,
  };
}
