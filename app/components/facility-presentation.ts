import type { Facility } from "./map-types";

export type FacilityDisplayCategory = "habilitado" | "registro" | "mides" | "verification";

const URUGUAY_DEPARTMENTS: Record<string, string> = {
  artigas: "Artigas",
  canelones: "Canelones",
  "cerro largo": "Cerro Largo",
  colonia: "Colonia",
  durazno: "Durazno",
  flores: "Flores",
  florida: "Florida",
  lavalleja: "Lavalleja",
  maldonado: "Maldonado",
  montevideo: "Montevideo",
  paysandu: "Paysandú",
  "rio negro": "Río Negro",
  rivera: "Rivera",
  rocha: "Rocha",
  salto: "Salto",
  "san jose": "San José",
  soriano: "Soriano",
  tacuarembo: "Tacuarembó",
  "treinta y tres": "Treinta y Tres",
};

export function canonicalDepartment(value: string | null | undefined) {
  const normalized = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-UY")
    .trim()
    .replace(/\s+/g, " ");
  return URUGUAY_DEPARTMENTS[normalized] ?? String(value || "").trim();
}

export function hasOfficialAdministrativeRecord(facility: Facility) {
  return facility.mspFinal || facility.mspRegistroHistorico || facility.midesSocial;
}

export function isVerificationFacility(facility: Facility) {
  return !hasOfficialAdministrativeRecord(facility);
}

export function facilityDisplayCategory(facility: Facility): FacilityDisplayCategory {
  if (isVerificationFacility(facility)) return "verification";
  if (facility.mspFinal) return "habilitado";
  if (facility.mspRegistroHistorico) return "registro";
  return "mides";
}

export function facilityDisplayLabel(facility: Facility) {
  const category = facilityDisplayCategory(facility);
  if (category === "habilitado") return "Habilitación final MSP";
  if (category === "registro") return "Registro histórico MSP";
  if (category === "mides") return "Certificado Social MIDES";
  return "A verificar";
}

function normalizedIdentity(value: string | null | undefined) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-UY")
    .replace(/\b(de|del|la|el|los|las)\b/g, " ")
    .replace(/\bresidencia(?:l)?\b/g, "residencia")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function identityKeys(facility: Facility) {
  const department = normalizedIdentity(facility.department);
  const name = normalizedIdentity(facility.name);
  const nameTokenSet = name.split(" ").filter(Boolean).sort().join(" ");
  const address = normalizedIdentity(facility.address);
  return [
    name ? `name:${department}:${name}` : "",
    nameTokenSet ? `name-tokens:${department}:${nameTokenSet}` : "",
    address && address !== "sin direccion informada" && address !== "direccion pendiente confirmacion"
      ? `address:${department}:${address}`
      : "",
  ].filter(Boolean);
}

function preferredFacility(left: Facility, right: Facility) {
  const leftOfficial = hasOfficialAdministrativeRecord(left);
  const rightOfficial = hasOfficialAdministrativeRecord(right);
  if (leftOfficial !== rightOfficial) return leftOfficial ? left : right;
  if (left.privateCandidate !== right.privateCandidate) return left.privateCandidate ? left : right;
  return left;
}

export function consolidateFacilities(facilities: Facility[]) {
  const consolidated: Facility[] = [];
  const indexesByKey = new Map<string, number>();

  for (const facility of facilities) {
    const keys = identityKeys(facility);
    const existingIndex = keys.map((key) => indexesByKey.get(key)).find((index) => index !== undefined);
    const existing = existingIndex === undefined ? null : consolidated[existingIndex];
    const crossesPublicAndPrivateLayers = existing !== null
      && existing.privateCandidate !== facility.privateCandidate
      && (existing.privateCandidate === true || facility.privateCandidate === true);
    if (existingIndex === undefined || !crossesPublicAndPrivateLayers) {
      const nextIndex = consolidated.length;
      consolidated.push(facility);
      for (const key of keys) indexesByKey.set(key, nextIndex);
      continue;
    }

    const selected = preferredFacility(consolidated[existingIndex], facility);
    const merged = {
      ...selected,
      sourceCategories: [...new Set([
        ...(consolidated[existingIndex].sourceCategories || []),
        ...(facility.sourceCategories || []),
      ])],
    };
    consolidated[existingIndex] = merged;
    for (const key of identityKeys(merged)) indexesByKey.set(key, existingIndex);
  }

  return consolidated;
}

export function sourceCategoryLabels(facility: Facility) {
  const labels = new Set<string>();
  for (const category of facility.sourceCategories || []) {
    if (category === "official") labels.add("Fuentes oficiales");
    if (category === "public_maps") labels.add("Mapas públicos");
    if (category === "social_public") labels.add("Redes sociales públicas");
    if (category === "other_public") labels.add("Webs y directorios públicos");
  }
  return [...labels];
}

export function evidenceDescription(tier: Facility["privateCandidateEvidenceTier"]) {
  if (tier === "A") return "Fuente oficial nominal";
  if (tier === "B") return "Dos fuentes públicas independientes";
  return "Pista pública todavía no corroborada";
}
