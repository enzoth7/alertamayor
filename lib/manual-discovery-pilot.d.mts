export type ManualDiscoveryPilotCandidate = {
  candidateKey: string;
  name: string;
  department: string;
  locality: string;
  address: string | null;
  coordinateStatus: string;
  mapAction: string;
  reviewStatus: string;
  evidenceTier: "A" | "B" | "C";
  historical: boolean;
  hasCoordinates: boolean;
  latitude: number | null;
  longitude: number | null;
  geocodingSourceUrl: string | null;
  dataset: string;
  retrievedAt: string;
};

export function manualDiscoveryPilotRecords(documents: unknown[], geocodingResults?: unknown[]): ManualDiscoveryPilotCandidate[];
export function loadManualDiscoveryPilot(rootDirectory: string): Promise<{
  candidates: ManualDiscoveryPilotCandidate[];
  summary: {
    inputFiles: number;
    candidatesWithoutCoordinates: number;
    candidatesWithCoordinates: number;
    historicalReviewOnly: number;
  };
}>;
