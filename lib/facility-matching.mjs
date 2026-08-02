const PLACEHOLDER_VALUES = new Set([
  "",
  "sin dato",
  "sin direccion publicada",
  "referencia aproximada protegida",
]);

const GENERIC_FACILITY_NAMES = new Set([
  "esperanza",
  "hogar esperanza",
  "los abuelos",
  "mi refugio",
  "residencial esperanza",
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
    .replace(/\bii\b/g, " 2 ")
    .replace(/\biii\b/g, " 3 ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizePhone(value) {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("598") && digits.length >= 11) digits = digits.slice(3);
  if (digits.startsWith("0") && digits.length === 9) digits = digits.slice(1);
  return digits.length >= 7 ? digits : "";
}

function textArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return value.split(";");
  return [];
}

function facilityNames(row) {
  return [row?.name, ...textArray(row?.aliases)]
    .map(normalizeName)
    .filter(Boolean);
}

function meaningful(value) {
  return !PLACEHOLDER_VALUES.has(normalizeText(value));
}

function tokenSet(value) {
  return new Set(normalizeText(value).split(" ").filter(Boolean));
}

export function tokenJaccard(left, right) {
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
  const normalized = ` ${normalizeText(value)} `;
  const result = [];
  for (let index = 0; index < normalized.length - 1; index += 1) {
    result.push(normalized.slice(index, index + 2));
  }
  return result;
}

export function diceCoefficient(left, right) {
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
  return 0.55 * diceCoefficient(left, right) + 0.45 * tokenJaccard(left, right);
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
    .replace(/\bsolar\b/g, " s ")
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

export function addressParts(value, row = {}) {
  const normalized = normalizeAddress(value, row);
  if (!normalized) return { normalized: "", street: "", doorNumber: null };
  const tokens = normalized.split(" ");
  const numericIndexes = tokens
    .map((token, index) => (/^\d{1,6}[a-z]?$/.test(token) ? index : -1))
    .filter((index) => index >= 0);
  const doorIndex = numericIndexes.at(-1);
  if (doorIndex === undefined) {
    return { normalized, street: normalized, doorNumber: null };
  }
  return {
    normalized,
    street: tokens.filter((_, index) => index !== doorIndex).join(" "),
    doorNumber: tokens[doorIndex],
  };
}

export function addressSimilarity(left, right) {
  const a = addressParts(left.address, left);
  const b = addressParts(right.address, right);
  if (!a.normalized || !b.normalized) return 0;
  return similarity(a.normalized, b.normalized);
}

function coordinate(value, minimum, maximum) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : null;
}

export function distanceMeters(left, right) {
  const lat1 = coordinate(left.lat, -90, 90);
  const lng1 = coordinate(left.lng, -180, 180);
  const lat2 = coordinate(right.lat, -90, 90);
  const lng2 = coordinate(right.lng, -180, 180);
  if ([lat1, lng1, lat2, lng2].some((value) => value === null)) {
    return Infinity;
  }

  const radians = (value) => (value * Math.PI) / 180;
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

function proximityScore(distance) {
  if (!Number.isFinite(distance)) return 0;
  if (distance <= 40) return 1;
  if (distance <= 150) return 0.85;
  if (distance <= 500) return 0.5;
  if (distance <= 2_000) return 0.15;
  return 0;
}

function bestNameMatch(candidate, existing) {
  const candidateNames = facilityNames(candidate);
  const existingNames = facilityNames(existing);
  let best = { score: 0, candidateName: null, existingName: null };
  for (const candidateName of candidateNames) {
    for (const existingName of existingNames) {
      const score = similarity(candidateName, existingName);
      if (score > best.score) {
        best = { score, candidateName, existingName };
      }
    }
  }
  return {
    ...best,
    aliasMatch: Boolean(
      best.score === 1 &&
        best.candidateName &&
        best.existingName &&
        (best.candidateName !== normalizeName(candidate?.name) ||
          best.existingName !== normalizeName(existing?.name)),
    ),
    genericName: Boolean(
      best.candidateName && GENERIC_FACILITY_NAMES.has(best.candidateName),
    ),
  };
}

function weightedAverage(signals) {
  let numerator = 0;
  let denominator = 0;
  for (const signal of signals) {
    if (!signal.available) continue;
    numerator += signal.value * signal.weight;
    denominator += signal.weight;
  }
  return denominator ? numerator / denominator : 0;
}

export function scoreFacilityMatch(candidate, existing) {
  const candidateDepartment = normalizeText(candidate.department);
  const existingDepartment = normalizeText(existing.department);
  const departmentAvailable = Boolean(candidateDepartment && existingDepartment);
  const departmentConflict = Boolean(
    departmentAvailable && candidateDepartment !== existingDepartment,
  );
  const departmentMatch = departmentAvailable && !departmentConflict;

  const candidatePhone = normalizePhone(candidate.phone);
  const existingPhone = normalizePhone(existing.phone);
  const phoneAvailable = Boolean(candidatePhone && existingPhone);
  const phoneExact = phoneAvailable && candidatePhone === existingPhone;
  const phoneConflict = phoneAvailable && !phoneExact;

  const name = bestNameMatch(candidate, existing);
  const localityScore = similarity(candidate.locality, existing.locality);
  const candidateAddress = addressParts(candidate.address, candidate);
  const existingAddress = addressParts(existing.address, existing);
  const addressAvailable = Boolean(
    candidateAddress.normalized && existingAddress.normalized,
  );
  const streetScore = addressAvailable
    ? similarity(candidateAddress.street, existingAddress.street)
    : 0;
  const doorAvailable = Boolean(
    candidateAddress.doorNumber && existingAddress.doorNumber,
  );
  const doorNumberMatch = doorAvailable
    ? candidateAddress.doorNumber === existingAddress.doorNumber
    : null;
  const doorNumberConflict = doorAvailable && !doorNumberMatch;
  const addressScore = addressAvailable
    ? 0.72 * streetScore + 0.28 * (doorNumberMatch ? 1 : 0)
    : 0;

  const distance = distanceMeters(candidate, existing);
  const geoScore = proximityScore(distance);
  const geoAvailable = Number.isFinite(distance);
  const localityAvailable = Boolean(
    normalizeText(candidate.locality) && normalizeText(existing.locality),
  );

  let score = weightedAverage([
    { available: phoneAvailable, value: phoneExact ? 1 : 0, weight: 0.32 },
    { available: departmentAvailable, value: departmentMatch ? 1 : 0, weight: 0.12 },
    { available: localityAvailable, value: localityScore, weight: 0.1 },
    { available: addressAvailable, value: streetScore, weight: 0.2 },
    { available: doorAvailable, value: doorNumberMatch ? 1 : 0, weight: 0.14 },
    { available: name.score > 0, value: name.score, weight: name.genericName ? 0.06 : 0.2 },
    { available: geoAvailable, value: geoScore, weight: 0.12 },
  ]);

  const hasAddressIdentity = streetScore >= 0.78 && doorNumberMatch === true;
  const hasGeoIdentity =
    geoAvailable && distance <= 150 && (streetScore >= 0.55 || name.score >= 0.78);
  const hasStrongIdentity = phoneExact || hasAddressIdentity || hasGeoIdentity;

  if (!hasStrongIdentity) score = Math.min(score, name.genericName ? 0.35 : 0.49);
  if (doorNumberConflict) score = Math.min(score, phoneExact ? 0.79 : 0.49);
  if (geoAvailable && distance > 2_000 && name.score >= 0.8) {
    score = Math.min(score, phoneExact ? 0.79 : 0.49);
  }
  if (phoneConflict) score *= 0.82;
  if (departmentConflict) score = 0;

  return {
    score: Math.max(0, Math.min(1, Number(score.toFixed(4)))),
    nameScore: Number(name.score.toFixed(4)),
    addressScore: Number(addressScore.toFixed(4)),
    streetScore: Number(streetScore.toFixed(4)),
    localityScore: Number(localityScore.toFixed(4)),
    proximityScore: geoScore,
    distanceMeters: Number.isFinite(distance) ? Math.round(distance) : null,
    departmentMatch,
    departmentConflict,
    phoneExact,
    phoneConflict,
    doorNumberMatch,
    doorNumberConflict,
    aliasMatch: name.aliasMatch,
    genericName: name.genericName,
    matchedCandidateName: name.candidateName,
    matchedExistingName: name.existingName,
    hasStrongIdentity,
  };
}

export function rankFacilityMatches(candidate, existingFacilities, limit = 3) {
  return existingFacilities
    .map((facility) => ({ facility, ...scoreFacilityMatch(candidate, facility) }))
    .sort((left, right) =>
      right.score - left.score ||
      String(left.facility.id ?? "").localeCompare(String(right.facility.id ?? "")),
    )
    .slice(0, Math.max(1, limit));
}

export function classifyFacilityMatch(bestMatch) {
  if (!bestMatch || bestMatch.score < 0.55) return "new_candidate";
  const corroborated =
    bestMatch.phoneExact ||
    (bestMatch.streetScore >= 0.82 && bestMatch.doorNumberMatch === true) ||
    (bestMatch.nameScore >= 0.82 &&
      bestMatch.distanceMeters !== null &&
      bestMatch.distanceMeters <= 150);
  const conflicting =
    bestMatch.departmentConflict ||
    bestMatch.doorNumberConflict ||
    (bestMatch.distanceMeters !== null && bestMatch.distanceMeters > 2_000);
  if (bestMatch.score >= 0.88 && corroborated && !conflicting) {
    return "probable_match";
  }
  return "possible_match";
}
