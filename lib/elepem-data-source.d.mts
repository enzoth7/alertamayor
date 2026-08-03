export type ElepemDataSource = "legacy" | "compatibility" | "normalized";

export function readElepemDataSource(value?: string): ElepemDataSource;
export function publicFacilityRelation(dataSource: ElepemDataSource):
  | "public.residenciales"
  | "public.residenciales_legacy_compat"
  | "public.facilities_public_approved";
export function matchingFacilityRelation(dataSource: ElepemDataSource):
  | "public.residenciales"
  | "public.residenciales_legacy_compat"
  | "public.known_facilities_exclusion_view";
export function candidateSuggestionSql(dataSource: ElepemDataSource): string;
