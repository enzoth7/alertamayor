export type MatchableFacility = {
  id?: string;
  name?: unknown;
  aliases?: unknown;
  department?: unknown;
  locality?: unknown;
  address?: unknown;
  phone?: unknown;
  lat?: unknown;
  lng?: unknown;
};

export type AddressParts = {
  normalized: string;
  street: string;
  doorNumber: string | null;
};

export type FacilityMatchResult<T extends MatchableFacility = MatchableFacility> = {
  facility: T;
  score: number;
  nameScore: number;
  addressScore: number;
  streetScore: number;
  localityScore: number;
  proximityScore: number;
  distanceMeters: number | null;
  departmentMatch: boolean;
  departmentConflict: boolean;
  phoneExact: boolean;
  phoneConflict: boolean;
  doorNumberMatch: boolean | null;
  doorNumberConflict: boolean;
  aliasMatch: boolean;
  genericName: boolean;
  matchedCandidateName: string | null;
  matchedExistingName: string | null;
  hasStrongIdentity: boolean;
};

export type FacilityMatchStatus =
  | "new_candidate"
  | "possible_match"
  | "probable_match";

export function normalizeText(value: unknown): string;
export function normalizeName(value: unknown): string;
export function normalizePhone(value: unknown): string;
export function normalizeAddress(value: unknown, row?: MatchableFacility): string;
export function addressParts(value: unknown, row?: MatchableFacility): AddressParts;
export function tokenJaccard(left: unknown, right: unknown): number;
export function diceCoefficient(left: unknown, right: unknown): number;
export function similarity(left: unknown, right: unknown): number;
export function addressSimilarity(left: MatchableFacility, right: MatchableFacility): number;
export function distanceMeters(left: MatchableFacility, right: MatchableFacility): number;
export function scoreFacilityMatch(
  candidate: MatchableFacility,
  existing: MatchableFacility,
): Omit<FacilityMatchResult, "facility">;
export function rankFacilityMatches<T extends MatchableFacility>(
  candidate: MatchableFacility,
  existingFacilities: T[],
  limit?: number,
): FacilityMatchResult<T>[];
export function classifyFacilityMatch(
  bestMatch: Omit<FacilityMatchResult, "facility"> | undefined,
): FacilityMatchStatus;
