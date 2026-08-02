export type FacilityStatus =
  | "habilitado"
  | "registro"
  | "mides"
  | "otra_fuente"
  | "verificar"
  | "app"
  | "candidate_private";

export type Facility = {
  id: string;
  name: string;
  department: string;
  locality: string;
  address: string;
  places: number | null;
  lat: number;
  lng: number;
  precision: "puerta" | "calle" | "referencial";
  precisionLabel: string;
  statusGroup: FacilityStatus;
  statusStage: string;
  statusShort: string;
  sourceLabel: string;
  mspFinal: boolean;
  mspRegistroHistorico: boolean;
  midesSocial: boolean;
  pacp: boolean;
  otherSource: boolean;
  pendingVerification: boolean;
  appDiscovered: boolean;
  privateCandidate?: boolean;
  privateCandidateEvidenceTier?: "A" | "B" | "C";
  privateCandidateSourceUrl?: string;
  privateCandidateRetrievedAt?: string;
};

export type MapMode = "streets" | "list";
