import { readFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;
const PROJECT_ROOT = fileURLToPath(new URL("..", import.meta.url));
const APPLY = process.argv.includes("--apply");
const APPLY_MEMBERSHIPS =
  process.argv.includes("--apply-memberships") || APPLY;
const MUTATES_DATABASE = APPLY || APPLY_MEMBERSHIPS;
const VERBOSE = process.argv.includes("--verbose");
const TARGET_PROJECT_REF = "itolluaivfoxnaohbsdk";

function argumentValue(name) {
  const inlinePrefix = `--${name}=`;
  const inline = process.argv.find((argument) => argument.startsWith(inlinePrefix));
  if (inline) return inline.slice(inlinePrefix.length);
  const index = process.argv.indexOf(`--${name}`);
  const next = process.argv[index + 1];
  return index >= 0 && next && !next.startsWith("--") ? next : "";
}

const sourceArgument = argumentValue("source");
if (!sourceArgument) {
  throw new Error(
    "Falta --source=ruta. La fuente ELEPEM v01 retirada ya no tiene una ruta predeterminada.",
  );
}
const sourcePath = resolve(PROJECT_ROOT, sourceArgument);
const sourceRelativePath = relative(PROJECT_ROOT, sourcePath);
if (!sourceRelativePath || sourceRelativePath.startsWith("..") || isAbsolute(sourceRelativePath)) {
  throw new Error("--source debe apuntar a un archivo dentro del workspace.");
}
const EXCLUDED_SOURCE_IDS = new Map([
  [
    "ELP-0085",
    "extracción PDF concatenada: nombre y dirección mezclan decenas de filas",
  ],
  [
    "ELP-0181",
    "agrupación de origen defectuosa: mezcla ELP-0180 y ELP-0182",
  ],
]);
const SOURCE_MERGE_GROUPS = [
  { representative: "ELP-0019", members: ["ELP-0018", "ELP-0019"] },
  { representative: "ELP-0023", members: ["ELP-0022", "ELP-0023"] },
  { representative: "ELP-0036", members: ["ELP-0036", "ELP-0037"] },
  { representative: "ELP-0042", members: ["ELP-0042", "ELP-0043"] },
  { representative: "ELP-0056", members: ["ELP-0056", "ELP-0057"] },
  { representative: "ELP-0118", members: ["ELP-0117", "ELP-0118"] },
  {
    representative: "ELP-0129",
    members: ["ELP-0128", "ELP-0129", "ELP-0130"],
    geocode: "ELP-0128",
  },
  { representative: "ELP-0135", members: ["ELP-0135", "ELP-0136"] },
  { representative: "ELP-0147", members: ["ELP-0146", "ELP-0147"] },
  { representative: "ELP-0215", members: ["ELP-0215", "ELP-0260"] },
  {
    representative: "ELP-0221",
    members: ["ELP-0220", "ELP-0221"],
    geocode: "ELP-0220",
  },
  { representative: "ELP-0229", members: ["ELP-0229", "ELP-0230"] },
  { representative: "ELP-0231", members: ["ELP-0231", "ELP-0232"] },
  { representative: "ELP-0234", members: ["ELP-0234", "ELP-0253"] },
  { representative: "ELP-0236", members: ["ELP-0236", "ELP-0237"] },
  {
    representative: "ELP-0331",
    members: ["ELP-0330", "ELP-0331"],
    geocode: "ELP-0330",
  },
  { representative: "ELP-0339", members: ["ELP-0339", "ELP-0340"] },
  { representative: "ELP-0363", members: ["ELP-0362", "ELP-0363"] },
  {
    representative: "ELP-0418",
    members: ["ELP-0418", "ELP-0419"],
    geocode: "ELP-0419",
  },
  { representative: "ELP-0442", members: ["ELP-0441", "ELP-0442"] },
  { representative: "ELP-0462", members: ["ELP-0462", "ELP-0463"] },
  {
    representative: "ELP-0470",
    members: ["ELP-0469", "ELP-0470"],
    geocode: "ELP-0469",
  },
  {
    representative: "ELP-0474",
    members: ["ELP-0474", "ELP-0647"],
    geocode: "ELP-0647",
  },
  { representative: "ELP-0636", members: ["ELP-0636", "ELP-0637"] },
  { representative: "ELP-0685", members: ["ELP-0644", "ELP-0685"] },
  { representative: "ELP-0670", members: ["ELP-0669", "ELP-0670"] },
  { representative: "ELP-0699", members: ["ELP-0699", "ELP-0700"] },
  { representative: "ELP-0713", members: ["ELP-0712", "ELP-0713"] },
  { representative: "ELP-0714", members: ["ELP-0714", "ELP-0722"] },
  {
    representative: "ELP-0717",
    members: ["ELP-0717", "ELP-0718"],
    geocode: "ELP-0718",
  },
  { representative: "ELP-0758", members: ["ELP-0757", "ELP-0758"] },
  {
    representative: "ELP-0765",
    members: ["ELP-0764", "ELP-0765"],
    geocode: "ELP-0764",
  },
  { representative: "ELP-0769", members: ["ELP-0769", "ELP-0770"] },
  { representative: "ELP-0791", members: ["ELP-0791", "ELP-0794"] },
  // Fusiones auditadas después de detectar matches many-to-one en Supabase.
  // Blanes conserva continuidad por nombre y responsable médico; 935/965 es
  // una discrepancia entre el certificado histórico y los padrones recientes.
  {
    representative: "ELP-0319",
    members: ["ELP-0318", "ELP-0319"],
    geocode: "ELP-0319",
  },
  // Dorita conserva el mismo nombre; 3374/3674 es una discrepancia histórica
  // de puerta y la sede pública vigente figura en General Flores 3674.
  {
    representative: "ELP-0376",
    members: ["ELP-0376", "ELP-0593"],
    geocode: "ELP-0376",
  },
  // El teléfono MIDES de Palmar 2520 coincide con el publicado por Fundación
  // Algarrobo para Palmar 2560.
  {
    representative: "ELP-0409",
    members: ["ELP-0409", "ELP-0411"],
    geocode: "ELP-0409",
  },
  {
    representative: "ELP-0484",
    members: ["ELP-0415", "ELP-0484"],
    geocode: "ELP-0484",
  },
  {
    representative: "ELP-0774",
    members: ["ELP-0771", "ELP-0774"],
    geocode: "ELP-0774",
  },
  {
    representative: "ELP-0788",
    members: ["ELP-0788", "ELP-0789"],
    geocode: "ELP-0788",
  },
];
const SOURCE_MEMBERSHIP_CORRECTIONS = new Map([
  [
    "ELP-0033",
    {
      mides_social: true,
      labels: ["Certificado Social MIDES"],
      source_record_ids: ["MIDES-019"],
      reason:
        "Puga Soria fue unido por error a ELP-0032 (Hogar Intergeneracional de Pando).",
    },
  ],
  [
    "ELP-0180",
    {
      mides_social: true,
      msp_registro_historico: true,
      pacp: true,
      labels: [
        "Certificado Social MIDES",
        "Certificado de registro MSP (histórico)",
        "Proveedor PACP",
      ],
      source_record_ids: ["MIDES-050", "MSPR-091-2021", "PACP-012"],
      reason:
        "Registros de Sarandí Grande separados de la entidad conflada ELP-0181.",
    },
  ],
  [
    "ELP-0182",
    {
      mides_social: true,
      msp_registro_historico: true,
      labels: [
        "Certificado Social MIDES",
        "Certificado de registro MSP (histórico)",
      ],
      source_record_ids: [
        "MIDES-047",
        "MSPR-041-2018",
        "MSPR-084-2019",
        "MSPR-129-2019",
      ],
      reason:
        "Registros de Florida ciudad separados de la entidad conflada ELP-0181.",
    },
  ],
]);
const KNOWN_EXISTING_MATCHES = new Map([
  ["ELP-0067", "MSP24-168"],
  ["ELP-0100", "MSP24-207"],
  ["ELP-0106", "MSP24-179"],
  ["ELP-0114", "MSP24-177"],
  ["ELP-0115", "MSP24-178"],
  ["ELP-0118", "MSP24-182"],
  ["ELP-0180", "MSP24-186"],
  ["ELP-0229", "MSP24-188"],
  ["ELP-0421", "MSP24-117"],
  ["ELP-0686", "MSP24-067"],
  ["ELP-0734", "MSP24-195"],
  ["ELP-0755", "MSP24-202"],
  ["ELP-0768", "MSP24-201"],
  ["ELP-0774", "MSP24-199"],
  ["ELP-0788", "MSP24-204"],
]);
const KNOWN_DISTINCT_FROM_EXISTING = new Map([
  [
    "ELP-0393",
    "MSP24-040",
  ],
  [
    "ELP-0587",
    "MSP24-046",
  ],
]);

const sourceEntities = JSON.parse(await readFile(sourcePath, "utf8"));

if (!Array.isArray(sourceEntities) || sourceEntities.length === 0) {
  throw new Error("La fuente ELEPEM no contiene registros.");
}

if (process.env.SUPABASE_PROJECT_REF !== TARGET_PROJECT_REF) {
  throw new Error(
    `La conexión configurada no corresponde al proyecto ${TARGET_PROJECT_REF}.`,
  );
}

if (!process.env.SUPABASE_DB_PASSWORD) {
  throw new Error("Falta SUPABASE_DB_PASSWORD.");
}

const pool = new Pool({
  host:
    process.env.SUPABASE_DB_HOST ||
    `db.${process.env.SUPABASE_PROJECT_REF}.supabase.co`,
  port: Number(process.env.SUPABASE_DB_PORT || 5432),
  database: process.env.SUPABASE_DB_NAME || "postgres",
  user: process.env.SUPABASE_DB_USER || "postgres",
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: {
    rejectUnauthorized:
      process.env.SUPABASE_DB_SSL_REJECT_UNAUTHORIZED === "true",
  },
  max: 2,
  connectionTimeoutMillis: 15_000,
});

const placeholderValues = new Set([
  "",
  "sin dato",
  "sin direccion publicada",
  "referencia aproximada protegida",
]);

function normalized(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("es-UY")
    .replace(/[“”„‟«»"'´`]/g, " ")
    .replace(/\bn\s*[º°]\s*/g, " ")
    .replace(/\b(avenida|avda)\b/g, " av ")
    .replace(/\b(general|gral)\b/g, " gral ")
    .replace(/\b(doctora?|dra?)\b/g, " dr ")
    .replace(/\b(numero|nro|num)\b/g, " ")
    .replace(/\b(sin numero|s\s*\/\s*n)\b/g, " sn ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedName(value) {
  return normalized(value)
    .replace(/\bii\b/g, " 2 ")
    .replace(/\biii\b/g, " 3 ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactName(value) {
  return normalizedName(value)
    .replace(
      /\b(residencial|establecimiento|hogar|casa|instituto|inst|de|del|la|las|los|el)\b/g,
      " ",
    )
    .replace(/\s+/g, "")
    .trim();
}

function normalizedAddress(value, row = {}) {
  const removable = new Set([
    ...normalized(row.locality).split(" "),
    ...normalized(row.department).split(" "),
    "mdeo",
  ]);
  const tokens = normalized(value)
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
  return !placeholderValues.has(normalized(value));
}

function tokenSet(value) {
  return new Set(normalized(value).split(" ").filter(Boolean));
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
  const text = ` ${normalized(value)} `;
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

function similarity(left, right) {
  if (!meaningful(left) || !meaningful(right)) return 0;
  if (normalized(left) === normalized(right)) return 1;
  return 0.55 * dice(left, right) + 0.45 * tokenJaccard(left, right);
}

function addressSimilarity(left, right) {
  const leftAddress = normalizedAddress(left.address, left);
  const rightAddress = normalizedAddress(right.address, right);
  if (!leftAddress || !rightAddress) return 0;
  return similarity(leftAddress, rightAddress);
}

function addressContains(left, right) {
  const leftTokens = tokenSet(normalizedAddress(left.address, left));
  const rightTokens = tokenSet(normalizedAddress(right.address, right));
  if (leftTokens.size < 2 || rightTokens.size < 2) return false;
  const smaller =
    leftTokens.size <= rightTokens.size ? leftTokens : rightTokens;
  const larger = smaller === leftTokens ? rightTokens : leftTokens;
  let intersection = 0;
  for (const token of smaller) {
    if (larger.has(token)) intersection += 1;
  }
  return intersection / smaller.size >= 0.8;
}

function radians(value) {
  return (value * Math.PI) / 180;
}

function distanceMeters(left, right) {
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

function precisionValue(method) {
  if (method === "calle y puerta exacta") return "puerta";
  if (
    method === "puerta más cercana en la misma calle" ||
    method === "centroide de calle"
  ) {
    return "calle";
  }
  return "referencial";
}

function placesValue(value) {
  if (value === "" || value == null) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function sourceMemberships(entities, representativeId) {
  const correction = SOURCE_MEMBERSHIP_CORRECTIONS.get(representativeId);
  return {
    mspFinal:
      entities.some((entity) => Boolean(entity.msp_final)) ||
      Boolean(correction?.msp_final),
    mspRegistroHistorico:
      entities.some((entity) => Boolean(entity.msp_registro_historico)) ||
      Boolean(correction?.msp_registro_historico),
    midesSocial:
      entities.some((entity) => Boolean(entity.mides_social)) ||
      Boolean(correction?.mides_social),
    pacp:
      entities.some((entity) => Boolean(entity.pacp)) ||
      Boolean(correction?.pacp),
  };
}

function sourceLabel(entities, representativeId) {
  const correction = SOURCE_MEMBERSHIP_CORRECTIONS.get(representativeId);
  const labels = [
    ...new Set(
      [
        ...entities
          .flatMap((entity) => entity.sources || [])
          .map((source) => String(source.label || "").trim()),
        ...(correction?.labels || []),
      ].filter(Boolean),
    ),
  ];
  return `${labels.join(" + ")} · geocodificación IDE`.slice(0, 240);
}

function statusFields(memberships, entities) {
  if (memberships.mspFinal) {
    return {
      statusGroup: "habilitado",
      statusStage: "Etapa 3 de 3",
      statusShort: "Habilitación final MSP · corte junio 2026",
    };
  }

  if (memberships.midesSocial) {
    return {
      statusGroup: "registro",
      statusStage: "Etapa 2 de 3",
      statusShort: "Certificado Social MIDES · fuente pública consultada",
    };
  }

  if (memberships.mspRegistroHistorico) {
    const year =
      entities
        .map(
          (entity) =>
            entity.historical_latest_year || entity.latest_public_date,
        )
        .filter(Boolean)
        .sort()
        .at(-1) || "sin fecha";
    return {
      statusGroup: "registro",
      statusStage: "Etapa 1 de 3",
      statusShort: `Certificado de registro MSP · antecedente histórico ${year}`,
    };
  }

  return {
    statusGroup: "registro",
    statusStage: "Registro programático",
    statusShort: "Proveedor PACP · corte agosto 2023",
  };
}

function toRow(entity, members = [entity], geocodeEntity = entity) {
  const id = String(entity.entity_id).trim();
  const memberships = sourceMemberships(members, id);
  const status = statusFields(memberships, members);
  const capacityEntity =
    members.find(
      (member) =>
        member.msp_final &&
        member.capacity !== "" &&
        member.capacity != null,
    ) ||
    members.find(
      (member) => member.capacity !== "" && member.capacity != null,
    ) ||
    entity;
  return {
    id,
    name: String(entity.name).trim(),
    department: String(entity.department).trim(),
    locality:
      String(geocodeEntity.locality || entity.locality || "").trim() ||
      "Sin dato",
    address:
      String(geocodeEntity.address || entity.address || "").trim() ||
      "Sin dirección publicada",
    places: placesValue(capacityEntity.capacity),
    lat: Number(geocodeEntity.latitude),
    lng: Number(geocodeEntity.longitude),
    precision: precisionValue(geocodeEntity.geocode_method),
    precisionLabel: String(geocodeEntity.geocode_method).trim(),
    statusGroup: status.statusGroup,
    statusStage: status.statusStage,
    statusShort: status.statusShort,
    sourceLabel: sourceLabel(members, id),
    ...memberships,
  };
}

function consolidateSource(entities) {
  const byId = new Map(
    entities.map((entity) => [String(entity.entity_id), entity]),
  );
  const mergedMemberIds = new Set();
  const mergedRows = [];

  for (const group of SOURCE_MERGE_GROUPS) {
    const members = group.members.map((id) => {
      const entity = byId.get(id);
      if (!entity) throw new Error(`No se encontró ${id} en la fuente.`);
      if (mergedMemberIds.has(id)) {
        throw new Error(`${id} aparece en más de un grupo de unificación.`);
      }
      mergedMemberIds.add(id);
      return entity;
    });
    const representative = byId.get(group.representative);
    const geocodeEntity = byId.get(group.geocode || group.representative);
    if (!members.includes(representative) || !members.includes(geocodeEntity)) {
      throw new Error(
        `Grupo inválido para representante ${group.representative}.`,
      );
    }
    mergedRows.push(toRow(representative, members, geocodeEntity));
  }

  const individualRows = entities
    .filter(
      (entity) =>
        !EXCLUDED_SOURCE_IDS.has(String(entity.entity_id)) &&
        !mergedMemberIds.has(String(entity.entity_id)),
    )
    .map((entity) => toRow(entity));

  return [...individualRows, ...mergedRows].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
}

function compareCandidate(source, existing) {
  if (normalized(source.department) !== normalized(existing.department)) {
    return null;
  }

  const idEqual = source.id === existing.id;
  const nameEqual =
    normalizedName(source.name) === normalizedName(existing.name);
  const compactNameEqual =
    compactName(source.name).length >= 5 &&
    compactName(source.name) === compactName(existing.name);
  const addressEqual =
    meaningful(source.address) &&
    meaningful(existing.address) &&
    normalizedAddress(source.address, source) ===
      normalizedAddress(existing.address, existing);
  const localityEqual =
    meaningful(source.locality) &&
    meaningful(existing.locality) &&
    normalized(source.locality) === normalized(existing.locality);
  const nameSimilarity = similarity(
    normalizedName(source.name),
    normalizedName(existing.name),
  );
  const addressSimilarityValue = addressSimilarity(source, existing);
  const localitySimilarity = similarity(source.locality, existing.locality);
  const distance = distanceMeters(source, existing);
  const bothPrecise =
    source.precision !== "referencial" &&
    existing.precision !== "referencial";

  let rule = "";
  if (KNOWN_EXISTING_MATCHES.get(source.id) === existing.id) {
    rule = "equivalencia auditada";
  } else if (idEqual) {
    rule = "id";
  } else if (
    addressEqual &&
    (localityEqual || nameSimilarity >= 0.55)
  ) {
    rule = "dirección exacta";
  } else if (
    (nameEqual || compactNameEqual) &&
    localityEqual &&
    addressSimilarityValue >= 0.35
  ) {
    rule = "nombre y localidad";
  } else if (
    (nameEqual || compactNameEqual) &&
    (addressSimilarityValue >= 0.62 || addressContains(source, existing))
  ) {
    rule = "nombre y dirección";
  } else if (
    localityEqual &&
    nameSimilarity >= 0.88 &&
    addressSimilarityValue >= 0.72
  ) {
    rule = "nombre/dirección similares";
  } else if (
    nameSimilarity >= 0.78 &&
    addressSimilarityValue >= 0.88
  ) {
    rule = "dirección muy similar";
  } else if (
    bothPrecise &&
    distance <= 40 &&
    (nameSimilarity >= 0.6 ||
      compactNameEqual ||
      addressSimilarityValue >= 0.7)
  ) {
    rule = "coordenada y texto";
  } else if (
    bothPrecise &&
    distance <= 100 &&
    (nameEqual || compactNameEqual)
  ) {
    rule = "nombre y coordenada";
  }

  const proximityScore =
    distance <= 40 ? 1 : distance <= 150 ? 0.8 : distance <= 500 ? 0.4 : 0;
  const score =
    0.4 * addressSimilarityValue +
    0.35 * nameSimilarity +
    0.15 * localitySimilarity +
    0.1 * proximityScore;

  return {
    existing,
    rule,
    score,
    nameSimilarity,
    addressSimilarity: addressSimilarityValue,
    localitySimilarity,
    distance,
  };
}

function compareRows(sourceRows, existingRows) {
  const matches = [];
  const unmatched = [];
  const review = [];
  const bestCandidates = [];

  for (const source of sourceRows) {
    const candidates = existingRows
      .map((existing) => compareCandidate(source, existing))
      .filter(Boolean)
      .sort((left, right) => {
        if (Boolean(left.rule) !== Boolean(right.rule)) {
          return left.rule ? -1 : 1;
        }
        return right.score - left.score;
      });

    const bestMatch = candidates.find((candidate) => candidate.rule);
    if (bestMatch) {
      matches.push({ source, ...bestMatch });
      continue;
    }

    unmatched.push(source);
    if (candidates[0]) {
      bestCandidates.push({ source, ...candidates[0] });
    }
    if (
      candidates[0]?.score >= 0.63 &&
      KNOWN_DISTINCT_FROM_EXISTING.get(source.id) !==
        candidates[0].existing.id
    ) {
      review.push({ source, ...candidates[0] });
    }
  }

  return { matches, unmatched, review, bestCandidates };
}

function duplicateIds(rows) {
  const counts = new Map();
  for (const row of rows) counts.set(row.id, (counts.get(row.id) || 0) + 1);
  return [...counts.entries()].filter(([, count]) => count > 1);
}

function compactComparison(item) {
  return {
    source_id: item.source.id,
    source_name: item.source.name,
    source_address: item.source.address,
    existing_id: item.existing.id,
    existing_name: item.existing.name,
    existing_address: item.existing.address,
    rule: item.rule || "revisión",
    score: Number(item.score.toFixed(3)),
    distance_m: Number.isFinite(item.distance)
      ? Math.round(item.distance)
      : null,
  };
}

function membershipCounts(rows) {
  return {
    msp_final: rows.filter((row) => row.mspFinal).length,
    msp_registro_historico: rows.filter(
      (row) => row.mspRegistroHistorico,
    ).length,
    mides_social: rows.filter((row) => row.midesSocial).length,
    pacp: rows.filter((row) => row.pacp).length,
    ninguna_principal: rows.filter(
      (row) =>
        !row.mspFinal &&
        !row.mspRegistroHistorico &&
        !row.midesSocial,
    ).length,
  };
}

const sourceRows = consolidateSource(sourceEntities);
if (sourceEntities.length !== 810 || sourceRows.length !== 767) {
  throw new Error(
    `Conteo inesperado: fuente=${sourceEntities.length}, consolidada=${sourceRows.length}.`,
  );
}
const sourceMembershipCounts = membershipCounts(sourceRows);
const expectedSourceMembershipCounts = {
  msp_final: 212,
  msp_registro_historico: 732,
  mides_social: 275,
  pacp: 36,
  ninguna_principal: 1,
};
if (
  JSON.stringify(sourceMembershipCounts) !==
  JSON.stringify(expectedSourceMembershipCounts)
) {
  throw new Error(
    `Membresías inesperadas: ${JSON.stringify(sourceMembershipCounts)}.`,
  );
}
const invalidRows = sourceRows.filter(
  (row) =>
    !row.id ||
    !row.name ||
    !row.department ||
    !row.locality ||
    !row.address ||
    row.name.length > 200 ||
    row.department.length > 100 ||
    row.locality.length > 120 ||
    row.address.length > 300 ||
    row.precisionLabel.length > 160 ||
    row.statusStage.length > 120 ||
    row.statusShort.length > 200 ||
    row.sourceLabel.length > 240 ||
    ![
      row.mspFinal,
      row.mspRegistroHistorico,
      row.midesSocial,
      row.pacp,
    ].every((value) => typeof value === "boolean") ||
    !Number.isFinite(row.lat) ||
    !Number.isFinite(row.lng),
);

if (invalidRows.length > 0) {
  throw new Error(`Hay ${invalidRows.length} filas transformadas inválidas.`);
}

const client = await pool.connect();

try {
  await client.query("begin");
  if (MUTATES_DATABASE) {
    await client.query(
      "lock table public.residenciales in share row exclusive mode",
    );
  }

  const existingResult = await client.query(`
    select
      id,
      name,
      department,
      locality,
      address,
      places,
      lat,
      lng,
      precision,
      precision_label,
      status_group,
      status_stage,
      status_short,
      source_label,
      msp_final,
      msp_registro_historico,
      mides_social,
      pacp,
      other_source
    from public.residenciales
    order by id
  `);

  const comparison = compareRows(sourceRows, existingResult.rows);
  const matchesByExistingId = Map.groupBy(
    comparison.matches,
    (item) => item.existing.id,
  );
  const coveredExistingIds = new Set(matchesByExistingId.keys());
  const targetCollisions = [...matchesByExistingId.entries()]
    .filter(([, matches]) => matches.length > 1)
    .map(([existingId, matches]) => ({
      existing_id: existingId,
      existing_name: matches[0].existing.name,
      existing_address: matches[0].existing.address,
      sources: matches.map(compactComparison),
    }));
  const existingNotCovered = existingResult.rows
    .filter((row) => !coveredExistingIds.has(row.id))
    .map((row) => ({
      id: row.id,
      name: row.name,
      department: row.department,
      locality: row.locality,
      address: row.address,
      status_group: row.status_group,
      status_short: row.status_short,
      source_label: row.source_label,
    }));
  if (targetCollisions.length > 0) {
    throw new Error(
      `Hay ${targetCollisions.length} matches many-to-one sin fusión auditada.`,
    );
  }
  const matchedByRule = Object.fromEntries(
    [...new Set(comparison.matches.map((item) => item.rule))]
      .sort()
      .map((rule) => [
        rule,
        comparison.matches.filter((item) => item.rule === rule).length,
      ]),
  );

  const report = {
    mode:
      APPLY && APPLY_MEMBERSHIPS
        ? "apply-and-memberships"
        : APPLY
          ? "apply"
          : APPLY_MEMBERSHIPS
            ? "apply-memberships"
            : "dry-run",
    source_rows_raw: sourceEntities.length,
    source_rows_after_quality_and_dedupe: sourceRows.length,
    source_memberships: sourceMembershipCounts,
    excluded_source_rows: Object.fromEntries(EXCLUDED_SOURCE_IDS),
    audited_membership_corrections: Object.fromEntries(
      SOURCE_MEMBERSHIP_CORRECTIONS,
    ),
    merged_source_groups: SOURCE_MERGE_GROUPS.length,
    merged_source_rows_removed: SOURCE_MERGE_GROUPS.reduce(
      (total, group) => total + group.members.length - 1,
      0,
    ),
    source_duplicate_ids: duplicateIds(sourceRows),
    existing_rows_before: existingResult.rows.length,
    already_present: comparison.matches.length,
    unique_existing_rows_covered: coveredExistingIds.size,
    target_collisions: targetCollisions,
    existing_rows_not_covered: existingNotCovered,
    already_present_by_status: Object.fromEntries(
      ["habilitado", "registro", "verificar"].map((status) => [
        status,
        comparison.matches.filter(
          (item) => item.source.statusGroup === status,
        ).length,
      ]),
    ),
    matched_by_rule: matchedByRule,
    pending_insert: comparison.unmatched.length,
    pending_insert_by_status: Object.fromEntries(
      ["habilitado", "registro", "verificar"].map((status) => [
        status,
        comparison.unmatched.filter((item) => item.statusGroup === status)
          .length,
      ]),
    ),
    close_candidates_for_review: comparison.review.length,
    audited_as_distinct: Object.fromEntries(KNOWN_DISTINCT_FROM_EXISTING),
    match_examples: comparison.matches.slice(0, 15).map(compactComparison),
    review_candidates: comparison.review.slice(0, 50).map(compactComparison),
    ...(VERBOSE
      ? {
          pending_habilitado_candidates: comparison.bestCandidates
            .filter((item) => item.source.statusGroup === "habilitado")
            .sort((left, right) => right.score - left.score)
            .map(compactComparison),
        }
      : {}),
  };

  if (!MUTATES_DATABASE) {
    await client.query("rollback");
    console.log(JSON.stringify(report, null, 2));
  } else {
    if (APPLY_MEMBERSHIPS && !APPLY && comparison.unmatched.length > 0) {
      throw new Error(
        `Hay ${comparison.unmatched.length} filas pendientes; usá --apply junto con --apply-memberships.`,
      );
    }

    const insertSql = `
      insert into public.residenciales (
        id,
        name,
        department,
        locality,
        address,
        places,
        lat,
        lng,
        precision,
        precision_label,
        status_group,
        status_stage,
        status_short,
        source_label,
        msp_final,
        msp_registro_historico,
        mides_social,
        pacp,
        other_source
      )
      values (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19
      )
      on conflict (id) do nothing
    `;

    let inserted = 0;
    if (APPLY) {
      for (const row of comparison.unmatched) {
        const result = await client.query(insertSql, [
          row.id,
          row.name,
          row.department,
          row.locality,
          row.address,
          row.places,
          row.lat,
          row.lng,
          row.precision,
          row.precisionLabel,
          row.statusGroup,
          row.statusStage,
          row.statusShort,
          row.sourceLabel,
          row.mspFinal,
          row.mspRegistroHistorico,
          row.midesSocial,
          row.pacp,
          false,
        ]);
        inserted += result.rowCount;
      }
    }

    if (APPLY && inserted !== comparison.unmatched.length) {
      throw new Error(
        `Se esperaban ${comparison.unmatched.length} inserciones y se ejecutaron ${inserted}.`,
      );
    }

    const finalResult = await client.query(
      "select count(*)::integer as count from public.residenciales",
    );
    const expected = existingResult.rows.length + inserted;
    const finalCount = finalResult.rows[0]?.count;
    if (finalCount !== expected) {
      throw new Error(
        `La verificación esperaba ${expected} filas y encontró ${finalCount}.`,
      );
    }

    const finalRowsResult = await client.query(`
      select
        id,
        name,
        department,
        locality,
        address,
        places,
        lat,
        lng,
        precision,
        precision_label,
        status_group,
        status_stage,
        status_short,
        source_label,
        msp_final,
        msp_registro_historico,
        mides_social,
        pacp,
        other_source
      from public.residenciales
      order by id
    `);
    const finalComparison = compareRows(sourceRows, finalRowsResult.rows);
    if (finalComparison.unmatched.length !== 0) {
      throw new Error(
        `La verificación semántica dejó ${finalComparison.unmatched.length} filas sin cubrir.`,
      );
    }
    const finalMatchesByExistingId = Map.groupBy(
      finalComparison.matches,
      (item) => item.existing.id,
    );
    const finalCollisions = [...finalMatchesByExistingId.values()].filter(
      (matches) => matches.length > 1,
    );
    if (
      finalCollisions.length > 0 ||
      finalMatchesByExistingId.size !== sourceRows.length
    ) {
      throw new Error(
        "La verificación detectó destinos repetidos o sedes fuente sin destino único.",
      );
    }

    let membershipRowsUpdated = 0;
    if (APPLY_MEMBERSHIPS) {
      const membershipPayload = finalRowsResult.rows.map((row) => {
        const match = finalMatchesByExistingId.get(row.id)?.[0];
        const uncoveredKnownSource =
          !match &&
          row.status_group !== "verificar" &&
          !row.msp_final &&
          !row.msp_registro_historico &&
          !row.mides_social &&
          Boolean(row.source_label);
        return {
          id: row.id,
          msp_final: match?.source.mspFinal ?? row.msp_final,
          msp_registro_historico:
            match?.source.mspRegistroHistorico ??
            row.msp_registro_historico,
          mides_social: match?.source.midesSocial ?? row.mides_social,
          pacp: match?.source.pacp ?? row.pacp,
          other_source: match
            ? false
            : Boolean(row.other_source) || uncoveredKnownSource,
          status_group: match?.source.statusGroup ?? null,
          status_stage: match?.source.statusStage ?? null,
          status_short: match?.source.statusShort ?? null,
          source_label: match?.source.sourceLabel ?? null,
        };
      });
      const membershipUpdateResult = await client.query(
        `
          with incoming as (
            select *
            from jsonb_to_recordset($1::jsonb) as value(
              id text,
              msp_final boolean,
              msp_registro_historico boolean,
              mides_social boolean,
              pacp boolean,
              other_source boolean,
              status_group text,
              status_stage text,
              status_short text,
              source_label text
            )
          )
          update public.residenciales as target
          set
            msp_final = incoming.msp_final,
            msp_registro_historico = incoming.msp_registro_historico,
            mides_social = incoming.mides_social,
            pacp = incoming.pacp,
            other_source = incoming.other_source,
            status_group = coalesce(incoming.status_group, target.status_group),
            status_stage = coalesce(incoming.status_stage, target.status_stage),
            status_short = coalesce(incoming.status_short, target.status_short),
            source_label = coalesce(incoming.source_label, target.source_label),
            updated_at = now()
          from incoming
          where target.id = incoming.id
            and (
              target.msp_final,
              target.msp_registro_historico,
              target.mides_social,
              target.pacp,
              target.other_source,
              target.status_group,
              target.status_stage,
              target.status_short,
              target.source_label
            ) is distinct from (
              incoming.msp_final,
              incoming.msp_registro_historico,
              incoming.mides_social,
              incoming.pacp,
              incoming.other_source,
              coalesce(incoming.status_group, target.status_group),
              coalesce(incoming.status_stage, target.status_stage),
              coalesce(incoming.status_short, target.status_short),
              coalesce(incoming.source_label, target.source_label)
            )
        `,
        [JSON.stringify(membershipPayload)],
      );
      membershipRowsUpdated = membershipUpdateResult.rowCount;
    }

    const verifiedMembershipResult = await client.query(`
      select
        count(*)::integer as total,
        count(*) filter (where msp_final)::integer as msp_final,
        count(*) filter (where msp_registro_historico)::integer
          as msp_registro_historico,
        count(*) filter (where mides_social)::integer as mides_social,
        count(*) filter (where pacp)::integer as pacp,
        count(*) filter (where other_source)::integer as other_source,
        count(*) filter (
          where status_group = 'verificar'
        )::integer as verificar,
        count(*) filter (
          where status_group <> 'verificar'
            and not msp_final
            and not msp_registro_historico
            and not mides_social
            and (other_source or pacp)
        )::integer as gris,
        count(*) filter (
          where status_group <> 'verificar' and msp_final
        )::integer as color_verde,
        count(*) filter (
          where status_group <> 'verificar'
            and not msp_final
            and mides_social
        )::integer as color_celeste,
        count(*) filter (
          where status_group <> 'verificar'
            and not msp_final
            and not mides_social
            and msp_registro_historico
        )::integer as color_naranja
      from public.residenciales
    `);
    const verifiedMemberships = verifiedMembershipResult.rows[0];
    if (APPLY_MEMBERSHIPS) {
      const verifiedSourceMembershipResult = await client.query(
        `
          select
            count(*) filter (where msp_final)::integer as msp_final,
            count(*) filter (where msp_registro_historico)::integer
              as msp_registro_historico,
            count(*) filter (where mides_social)::integer as mides_social,
            count(*) filter (where pacp)::integer as pacp
          from public.residenciales
          where id = any($1::text[])
        `,
        [[...finalMatchesByExistingId.keys()]],
      );
      const verifiedSourceMemberships =
        verifiedSourceMembershipResult.rows[0];
      for (const key of [
        "msp_final",
        "msp_registro_historico",
        "mides_social",
        "pacp",
      ]) {
        if (
          verifiedSourceMemberships[key] !== sourceMembershipCounts[key]
        ) {
          throw new Error(
            `Verificación ${key}: se esperaban ${sourceMembershipCounts[key]} y hay ${verifiedSourceMemberships[key]}.`,
          );
        }
      }
      const expectedGray =
        sourceMembershipCounts.ninguna_principal +
        finalRowsResult.rows.filter(
          (row) =>
            !finalMatchesByExistingId.has(row.id) &&
            row.status_group !== "verificar" &&
            !row.msp_final &&
            !row.msp_registro_historico &&
            !row.mides_social &&
            (row.other_source || Boolean(row.source_label)),
        ).length;
      if (verifiedMemberships.gris !== expectedGray) {
        throw new Error(
          `Verificación gris: se esperaban ${expectedGray} y hay ${verifiedMemberships.gris}.`,
        );
      }
    }

    await client.query("commit");
    console.log(
      JSON.stringify(
        {
          ...report,
          inserted,
          membership_rows_updated: membershipRowsUpdated,
          existing_rows_after: finalCount,
          source_rows_covered_after: sourceRows.length,
          database_memberships: verifiedMemberships,
          verified: true,
        },
        null,
        2,
      ),
    );
  }
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  client.release();
  await pool.end();
}
