import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

export const SEARCH_TERMS = [
  "residencial de adultos mayores",
  "residencial de ancianos",
  "hogar de ancianos",
  "residencial para personas mayores",
  "casa de salud",
  "geriátrico",
  "residencia de tercera edad",
  "ELEPEM",
];

export const DEPARTMENTS = [
  { name: "Artigas", iso: "UY-AR" },
  { name: "Canelones", iso: "UY-CA" },
  { name: "Cerro Largo", iso: "UY-CL" },
  { name: "Colonia", iso: "UY-CO" },
  { name: "Durazno", iso: "UY-DU" },
  { name: "Flores", iso: "UY-FS" },
  { name: "Florida", iso: "UY-FD" },
  { name: "Lavalleja", iso: "UY-LA" },
  { name: "Maldonado", iso: "UY-MA" },
  { name: "Montevideo", iso: "UY-MO" },
  { name: "Paysandú", iso: "UY-PA" },
  { name: "Río Negro", iso: "UY-RN" },
  { name: "Rivera", iso: "UY-RV" },
  { name: "Rocha", iso: "UY-RO" },
  { name: "Salto", iso: "UY-SA" },
  { name: "San José", iso: "UY-SJ" },
  { name: "Soriano", iso: "UY-SO" },
  { name: "Tacuarembó", iso: "UY-TA" },
  { name: "Treinta y Tres", iso: "UY-TT" },
];

const PLACEHOLDERS = new Set([
  "",
  "sin dato",
  "sin direccion publicada",
  "referencia aproximada protegida",
]);

export function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("es-UY")
    .replace(/[“”„‟«»"'´`]/g, " ")
    .replace(/\bn\s*(?:o|º|°)\s*(?=\d)/g, " ")
    .replace(/\b(avenida|avda)\b/g, " av ")
    .replace(/\b(general|gral)\b/g, " gral ")
    .replace(/\b(doctora?|dra?)\b/g, " dr ")
    .replace(/\b(numero|nro|num)\b/g, " ")
    .replace(/\b(sin numero|s\s*\/\s*n)\b/g, " sn ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeName(value) {
  return normalizeText(value)
    .replace(/\b(ii)\b/g, " 2 ")
    .replace(/\b(iii)\b/g, " 3 ")
    .replace(/\s+/g, " ")
    .trim();
}

export function compactName(value) {
  return normalizeName(value)
    .replace(
      /\b(residencial|residencia|establecimiento|elepem|hogar|casa|instituto|geriatrico|de|del|para|la|las|los|el)\b/g,
      " ",
    )
    .replace(/\s+/g, "")
    .trim();
}

export function normalizeAddress(value, row = {}) {
  const removable = new Set([
    ...normalizeText(row.locality).split(" "),
    ...normalizeText(row.department).split(" "),
    "uruguay",
    "uy",
    "mdeo",
  ]);
  const tokens = normalizeText(value)
    .replace(/([a-z])(\d)/g, "$1 $2")
    .replace(/(\d)([a-z])/g, "$1 $2")
    .replace(/\b(manzana|manz)\b/g, " m ")
    .replace(/\b(solar)\b/g, " s ")
    .replace(/\b(avenida|avda|av|calle)\b/g, " ")
    .replace(/\b(de|del|el)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((token) => token && !removable.has(token));

  const deduplicated = [];
  for (const token of tokens) {
    if (deduplicated.at(-1) !== token) deduplicated.push(token);
  }
  return deduplicated.join(" ");
}

function meaningful(value) {
  return !PLACEHOLDERS.has(normalizeText(value));
}

function tokenSet(value) {
  return new Set(normalizeText(value).split(" ").filter(Boolean));
}

function tokenJaccard(left, right) {
  const a = tokenSet(left);
  const b = tokenSet(right);
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  return intersection / (a.size + b.size - intersection);
}

function bigrams(value) {
  const text = ` ${normalizeText(value)} `;
  if (text.length < 2) return [];
  const result = [];
  for (let index = 0; index < text.length - 1; index += 1) {
    result.push(text.slice(index, index + 2));
  }
  return result;
}

function dice(left, right) {
  const a = bigrams(left);
  const b = bigrams(right);
  if (a.length === 0 || b.length === 0) return 0;
  const counts = new Map();
  for (const pair of a) counts.set(pair, (counts.get(pair) || 0) + 1);
  let intersection = 0;
  for (const pair of b) {
    const count = counts.get(pair) || 0;
    if (count > 0) {
      intersection += 1;
      counts.set(pair, count - 1);
    }
  }
  return (2 * intersection) / (a.length + b.length);
}

export function similarity(left, right) {
  if (!meaningful(left) || !meaningful(right)) return 0;
  if (normalizeText(left) === normalizeText(right)) return 1;
  return 0.55 * dice(left, right) + 0.45 * tokenJaccard(left, right);
}

function radians(value) {
  return (value * Math.PI) / 180;
}

export function distanceMeters(left, right) {
  const lat1 = Number(left.lat);
  const lng1 = Number(left.lng);
  const lat2 = Number(right.lat);
  const lng2 = Number(right.lng);
  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return Infinity;
  const earthRadius = 6_371_000;
  const dLat = radians(lat2 - lat1);
  const dLng = radians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(lat1)) *
      Math.cos(radians(lat2)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(a));
}

function sameDepartment(left, right) {
  const a = normalizeText(left.department);
  const b = normalizeText(right.department);
  return !a || !b || a === b;
}

export function scoreMatch(discovery, existing) {
  if (!sameDepartment(discovery, existing)) {
    return { score: 0, reasons: ["departamento diferente"] };
  }

  const nameScore = similarity(discovery.name, existing.name);
  const compactLeft = compactName(discovery.name);
  const compactRight = compactName(existing.name);
  const compactExact =
    compactLeft.length >= 4 && compactLeft === compactRight;
  const leftAddress = normalizeAddress(discovery.address, discovery);
  const rightAddress = normalizeAddress(existing.address, existing);
  const addressScore = similarity(leftAddress, rightAddress);
  const exactAddress =
    leftAddress.length >= 5 && leftAddress === rightAddress;
  const distance = distanceMeters(discovery, existing);
  const distanceScore = Number.isFinite(distance)
    ? Math.max(0, 1 - distance / 1_000)
    : 0;
  let score = 0.48 * nameScore + 0.34 * addressScore + 0.18 * distanceScore;
  const reasons = [];

  if (nameScore >= 0.9) reasons.push("nombre casi idéntico");
  else if (nameScore >= 0.7) reasons.push("nombre similar");
  if (compactExact) {
    score = Math.max(score, 0.88);
    reasons.push("nombre distintivo exacto");
  }
  if (exactAddress) {
    score = Math.max(score, nameScore >= 0.45 ? 0.96 : 0.86);
    reasons.push("dirección normalizada exacta");
  } else if (addressScore >= 0.82) {
    reasons.push("dirección muy similar");
  }
  if (distance <= 35) {
    score = Math.max(score, nameScore >= 0.55 ? 0.95 : score);
    reasons.push(`${Math.round(distance)} m entre coordenadas`);
  } else if (distance <= 120) {
    score = Math.max(score, nameScore >= 0.75 ? 0.9 : score);
    reasons.push(`${Math.round(distance)} m entre coordenadas`);
  }
  if (normalizeText(discovery.locality) && normalizeText(existing.locality)) {
    if (normalizeText(discovery.locality) === normalizeText(existing.locality)) {
      score = Math.min(1, score + 0.025);
    }
  }

  return {
    score: Math.min(1, Number(score.toFixed(4))),
    reasons,
    metrics: {
      name: Number(nameScore.toFixed(4)),
      address: Number(addressScore.toFixed(4)),
      distanceMeters: Number.isFinite(distance) ? Math.round(distance) : null,
    },
  };
}

export function findMatches(discovery, existingRows, limit = 3) {
  return existingRows
    .map((existing) => ({ existing, ...scoreMatch(discovery, existing) }))
    .filter((match) => match.score >= 0.35)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

export function classifyMatch(matches) {
  const best = matches[0];
  if (!best || best.score < 0.62) return "new_candidate";
  if (best.score >= 0.93) return "probable_match";
  return "possible_match";
}

export function shouldMergeDiscoveries(left, right) {
  if (
    left.googlePlaceId &&
    right.googlePlaceId &&
    left.googlePlaceId === right.googlePlaceId
  ) {
    return true;
  }
  if (left.source === right.source && left.externalId === right.externalId) {
    return true;
  }
  if (!sameDepartment(left, right)) return false;
  const nameScore = similarity(left.name, right.name);
  const addressScore = similarity(
    normalizeAddress(left.address, left),
    normalizeAddress(right.address, right),
  );
  const distance = distanceMeters(left, right);
  return (
    (nameScore >= 0.9 && (addressScore >= 0.55 || distance <= 180)) ||
    (nameScore >= 0.72 && addressScore >= 0.82) ||
    (nameScore >= 0.82 && distance <= 60)
  );
}

function union(parent, left, right) {
  const find = (index) => {
    let current = index;
    while (parent[current] !== current) {
      parent[current] = parent[parent[current]];
      current = parent[current];
    }
    return current;
  };
  const a = find(left);
  const b = find(right);
  if (a !== b) parent[b] = a;
}

export function groupDiscoveries(discoveries) {
  const parent = discoveries.map((_, index) => index);
  for (let left = 0; left < discoveries.length; left += 1) {
    for (let right = left + 1; right < discoveries.length; right += 1) {
      if (shouldMergeDiscoveries(discoveries[left], discoveries[right])) {
        union(parent, left, right);
      }
    }
  }

  const root = (index) => {
    let current = index;
    while (parent[current] !== current) current = parent[current];
    return current;
  };
  const groups = new Map();
  discoveries.forEach((discovery, index) => {
    const key = root(index);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(discovery);
  });
  return [...groups.values()];
}

function stableId(group) {
  const placeId = group.find((item) => item.googlePlaceId)?.googlePlaceId;
  const osm = group.find((item) => item.source === "openstreetmap");
  const origin = placeId
    ? `google:${placeId}`
    : osm
      ? `openstreetmap:${osm.externalId}`
      : group
          .map((item) => `${item.source}:${item.externalId}`)
          .sort()[0];
  return `RDC-${createHash("sha256").update(origin).digest("hex").slice(0, 16)}`;
}

function preferredPersistentDiscovery(group) {
  return (
    group.find((item) => item.source === "openstreetmap") ||
    group.find((item) => item.source === "serpapi") ||
    group.find((item) => item.source === "apify") ||
    null
  );
}

function bestRuntimeMatch(group, existingRows) {
  const ranked = group
    .filter((item) => meaningful(item.name))
    .flatMap((item) =>
      findMatches(item, existingRows).map((match) => ({
        discovery: item,
        ...match,
      })),
    )
    .sort((left, right) => right.score - left.score);
  const unique = [];
  const seen = new Set();
  for (const match of ranked) {
    if (seen.has(match.existing.id)) continue;
    seen.add(match.existing.id);
    unique.push(match);
    if (unique.length === 3) break;
  }
  return unique;
}

function originRecord(item) {
  return {
    source: item.source,
    externalId: item.externalId,
    googlePlaceId: item.googlePlaceId || null,
    sourceUrl: item.source === "google_places" ? null : item.sourceUrl || null,
    queries: [...new Set(item.queries || [])],
    evidence: item.evidence || null,
  };
}

export function buildCandidates(discoveries, existingRows, discoveredAt) {
  return groupDiscoveries(discoveries).map((group) => {
    const persisted = preferredPersistentDiscovery(group);
    const matches = bestRuntimeMatch(group, existingRows);
    const best = matches[0];
    const matchStatus = classifyMatch(matches);
    const sources = [...new Set(group.map((item) => item.source))].sort();
    const googleOnly = sources.length === 1 && sources[0] === "google_places";
    const storagePolicy = googleOnly
      ? "google_place_id_only"
      : sources.includes("openstreetmap")
        ? "open_data"
        : "internal_contract_risk";

    return {
      id: stableId(group),
      sources,
      origins: group.map(originRecord),
      googlePlaceIds: [
        ...new Set(group.map((item) => item.googlePlaceId).filter(Boolean)),
      ],
      name: persisted?.name || null,
      department: persisted?.department || group[0]?.department || null,
      locality: persisted?.locality || null,
      address: persisted?.address || null,
      phone: persisted?.phone || null,
      websiteUrl: persisted?.websiteUrl || null,
      lat: Number.isFinite(Number(persisted?.lat)) ? Number(persisted.lat) : null,
      lng: Number.isFinite(Number(persisted?.lng)) ? Number(persisted.lng) : null,
      operationalStatus: persisted?.operationalStatus || null,
      discoveredAt,
      storagePolicy,
      matchStatus,
      suggestedResidencialId:
        matchStatus === "new_candidate" ? null : best?.existing.id || null,
      confidence: best?.score || 0,
      matchReasons: best?.reasons || [],
      alternativeMatches: matches
        .slice(matchStatus === "new_candidate" ? 0 : 1)
        .map((match) => ({
        residencialId: match.existing.id,
        name: match.existing.name,
        score: match.score,
        })),
      reviewStatus: "pending",
      reviewNotes: null,
      runtimePreview: googleOnly
        ? {
            // This property is removed before writing a report or database row.
            name: group[0]?.name || null,
            address: group[0]?.address || null,
          }
        : undefined,
    };
  });
}

export function redactRestrictedContent(candidates) {
  return candidates.map(({ runtimePreview: _runtimePreview, ...candidate }) => candidate);
}

export async function readExistingLocal(path) {
  const parsed = JSON.parse(await readFile(path, "utf8"));
  const rows = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.facilities)
      ? parsed.facilities
      : null;
  if (!rows) throw new Error("La fuente local existente no contiene una lista de sedes.");
  return rows.map((row) => ({
    id: String(row.entity_id || row.id),
    name: String(row.name || ""),
    department: String(row.department || ""),
    locality: String(row.locality || ""),
    address: String(row.address || ""),
    lat: Number(row.latitude ?? row.lat),
    lng: Number(row.longitude ?? row.lng),
  }));
}

export function parseDepartmentList(value) {
  const requested = String(value || "Montevideo,Canelones")
    .split(",")
    .map((item) => normalizeText(item))
    .filter(Boolean);
  if (requested.includes("todos") || requested.includes("uruguay")) {
    return [...DEPARTMENTS];
  }
  return requested.map((name) => {
    const department = DEPARTMENTS.find(
      (candidate) => normalizeText(candidate.name) === name,
    );
    if (!department) throw new Error(`Departamento desconocido: ${name}.`);
    return department;
  });
}

export function csvValue(value) {
  const text = Array.isArray(value)
    ? value.join(" | ")
    : value == null
      ? ""
      : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function candidatesToCsv(candidates) {
  const columns = [
    "id",
    "sources",
    "source_external_ids",
    "google_place_ids",
    "name",
    "department",
    "locality",
    "address",
    "phone",
    "website_url",
    "lat",
    "lng",
    "operational_status",
    "discovered_at",
    "storage_policy",
    "match_status",
    "suggested_residencial_id",
    "confidence",
    "match_reasons",
    "review_status",
    "review_notes",
  ];
  const rows = candidates.map((candidate) => ({
    id: candidate.id,
    sources: candidate.sources,
    source_external_ids: candidate.origins.map(
      (origin) => `${origin.source}:${origin.externalId}`,
    ),
    google_place_ids: candidate.googlePlaceIds,
    name: candidate.name,
    department: candidate.department,
    locality: candidate.locality,
    address: candidate.address,
    phone: candidate.phone,
    website_url: candidate.websiteUrl,
    lat: candidate.lat,
    lng: candidate.lng,
    operational_status: candidate.operationalStatus,
    discovered_at: candidate.discoveredAt,
    storage_policy: candidate.storagePolicy,
    match_status: candidate.matchStatus,
    suggested_residencial_id: candidate.suggestedResidencialId,
    confidence: candidate.confidence,
    match_reasons: candidate.matchReasons,
    review_status: candidate.reviewStatus,
    review_notes: candidate.reviewNotes,
  }));
  return [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvValue(row[column])).join(",")),
  ].join("\n");
}

export function summarizeCandidates(candidates, meta) {
  const count = (value) => candidates.filter(value).length;
  const sourceName = (source) =>
    source === "osm" ? "openstreetmap" : source === "google" ? "google_places" : source;
  return {
    generatedAt: meta.generatedAt,
    departments: meta.departments,
    sources: meta.sources,
    existingCount: meta.existingCount,
    discoveryCountBeforeDeduplication: meta.discoveryCount,
    candidateCount: candidates.length,
    probableMatches: count((item) => item.matchStatus === "probable_match"),
    possibleMatches: count((item) => item.matchStatus === "possible_match"),
    newCandidates: count((item) => item.matchStatus === "new_candidate"),
    googleIdentifierOnly: count(
      (item) => item.storagePolicy === "google_place_id_only",
    ),
    sourceCounts: Object.fromEntries(
      meta.sources.map((source) => [
        source,
        count((item) => item.sources.includes(sourceName(source))),
      ]),
    ),
    warnings: meta.warnings,
    requestUsage: meta.requestUsage,
  };
}
