export type FacilityStatus = "habilitado" | "registro" | "verificar";

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
};

export type MapMode = "streets" | "list";
