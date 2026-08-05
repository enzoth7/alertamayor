const STATUS_LABELS = Object.freeze({
  discovered: "Descubierto",
  possible_match: "Posible coincidencia",
  needs_review: "Necesita revisión",
  verified_new: "Nuevo verificado",
  verified_match: "Coincidencia verificada",
  rejected: "Rechazado",
  duplicate: "Duplicado",
  closed: "Cerrado",
});

function record(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function optionalText(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function coordinate(value, minimum, maximum) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

function sourceUrl(value) {
  const text = optionalText(value);
  if (!text) return "";
  try {
    const url = new URL(text);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

function displayName(value) {
  const name = optionalText(value);
  return name ? `${name.charAt(0).toUpperCase()}${name.slice(1)}` : "Candidato sin nombre";
}

const DEPARTMENT_LABELS = new Map([
  ["artigas", "Artigas"], ["canelones", "Canelones"], ["cerro largo", "Cerro Largo"],
  ["colonia", "Colonia"], ["durazno", "Durazno"], ["flores", "Flores"],
  ["florida", "Florida"], ["lavalleja", "Lavalleja"], ["maldonado", "Maldonado"],
  ["montevideo", "Montevideo"], ["paysandu", "Paysandú"], ["rio negro", "Río Negro"],
  ["rivera", "Rivera"], ["rocha", "Rocha"], ["salto", "Salto"],
  ["san jose", "San José"], ["soriano", "Soriano"], ["tacuarembo", "Tacuarembó"],
  ["treinta y tres", "Treinta y Tres"],
]);

function locationKey(value) {
  return optionalText(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-UY").replace(/\s+/g, " ");
}

function displayLocation(value, { department = false } = {}) {
  const text = optionalText(value);
  if (!text) return "";
  if (department) return DEPARTMENT_LABELS.get(locationKey(text)) || text;
  const small = new Set(["de", "del", "la", "las", "los", "y", "e"]);
  return text.toLocaleLowerCase("es-UY").split(/\s+/).map((word, index) => (
    index > 0 && small.has(word) ? word : `${word.charAt(0).toLocaleUpperCase("es-UY")}${word.slice(1)}`
  )).join(" ");
}

function isApprovedIdeSource(source) {
  const license = optionalText(source.sourceLicense).toLocaleLowerCase("es-UY");
  const url = optionalText(source.sourceUrl).toLocaleLowerCase("en-US");
  return license.includes("ide uruguay") || url.includes("direcciones.ide.uy/");
}

function sourceCategories(sources) {
  const categories = new Set();
  for (const source of sources) {
    const sourceType = optionalText(source.sourceType);
    const context = `${optionalText(source.sourceUrl)} ${optionalText(source.sourceRecordKey)}`
      .toLocaleLowerCase("es-UY");
    if (sourceType === "official") categories.add("official");
    else if (
      sourceType === "openstreetmap" ||
      /openstreetmap|google\.com\/maps|maps\.google|maps\.app\.goo\.gl|serpapi/.test(context)
    ) categories.add("public_maps");
    else if (sourceType === "social_public_url") categories.add("social_public");
    else categories.add("other_public");
  }
  if (categories.size === 0) categories.add("other_public");
  return [...categories];
}

export function mapPrivateCandidateToFacility(value) {
  const candidate = record(value);
  const latitude = coordinate(candidate.latitude, -90, 90);
  const longitude = coordinate(candidate.longitude, -180, 180);
  const id = optionalText(candidate.id);
  if (!id || latitude === null || longitude === null) return null;

  const sources = Array.isArray(candidate.sources) ? candidate.sources.map(record) : [];
  const preferredSource = sources.find(isApprovedIdeSource) ||
    sources.find((source) => source.sourceType === "openstreetmap") || sources[0] || {};
  const approvedIdeCoordinates = isApprovedIdeSource(preferredSource);
  const evidenceTier = ["A", "B", "C"].includes(candidate.evidence_tier)
    ? candidate.evidence_tier
    : "C";
  const status = optionalText(candidate.status);
  const retrievedAt = optionalText(preferredSource.retrievedAt);
  const url = sourceUrl(preferredSource.sourceUrl);

  const facility = {
    id: `candidate:${id}`,
    name: displayName(candidate.name),
    department: displayLocation(candidate.department, { department: true }) || "Sin departamento",
    locality: displayLocation(candidate.locality) || "Sin localidad",
    address: optionalText(candidate.address) || "Sin dirección informada",
    places: null,
    lat: latitude,
    lng: longitude,
    precision: "referencial",
    precisionLabel: "Coordenada observada en OpenStreetMap · sin verificar",
    statusGroup: "candidate_private",
    statusStage: "Candidato del piloto de descubrimiento",
    statusShort: `Candidato OSM del piloto · ${STATUS_LABELS[status] || status || "Sin revisar"}`,
    sourceLabel: "© OpenStreetMap contributors · ODbL 1.0",
    mspFinal: false,
    mspRegistroHistorico: false,
    midesSocial: false,
    pacp: false,
    otherSource: false,
    pendingVerification: false,
    appDiscovered: false,
    sourceCategories: sourceCategories(sources),
    privateCandidate: true,
    privateCandidateStatus: status,
    privateCandidateEvidenceTier: evidenceTier,
    privateCandidateSourceUrl: url || undefined,
    privateCandidateRetrievedAt: retrievedAt || undefined,
    createdAt: optionalText(candidate.first_seen_at) || undefined,
    updatedAt: optionalText(candidate.last_seen_at) || undefined,
  };
  if (approvedIdeCoordinates) {
    facility.precisionLabel = "Geocodificacion IDE Uruguay aprobada";
    facility.statusStage = "Candidato privado revisado";
    facility.statusShort = `Coordenada IDE aprobada - ${STATUS_LABELS[status] || status || "Sin revisar"}`;
    facility.sourceLabel = "IDE Uruguay - coordenada aprobada por revision humana";
  }
  return facility;
}

export function mapPrivateCandidatesToFacilities(values) {
  if (!Array.isArray(values)) return [];
  return values.map(mapPrivateCandidateToFacility).filter(Boolean);
}
