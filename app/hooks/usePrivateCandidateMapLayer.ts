"use client";

import { useEffect, useState } from "react";
import { mapPrivateCandidatesToFacilities } from "../../lib/private-candidate-map.mjs";
import type { Facility } from "../components/map-types";

type SessionResponse = { authenticated?: boolean };
type CandidateResponse = { candidates?: unknown[]; error?: string };
export type UnlocatedDiscoveryCandidate = {
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

function mapManualCandidateToFacility(candidate: UnlocatedDiscoveryCandidate): Facility | null {
  if (!candidate.hasCoordinates || candidate.latitude === null || candidate.longitude === null) return null;
  return {
    id: `manual:${candidate.candidateKey}`, name: candidate.name, department: candidate.department, locality: candidate.locality,
    address: candidate.address || "Dirección pendiente de confirmación", places: null, lat: candidate.latitude, lng: candidate.longitude,
    precision: "puerta", precisionLabel: "Geocodificación IDE Uruguay", statusGroup: "candidate_private",
    statusStage: "Piloto interno", statusShort: "Candidato con coordenadas IDE", sourceLabel: "IDE Uruguay · evidencia C",
    mspFinal: false, mspRegistroHistorico: false, midesSocial: false, pacp: false, otherSource: false,
    pendingVerification: true, appDiscovered: false, privateCandidate: true, privateCandidateEvidenceTier: candidate.evidenceTier,
    privateCandidateSourceUrl: candidate.geocodingSourceUrl || undefined, privateCandidateRetrievedAt: candidate.retrievedAt,
  };
}
type UnlocatedCandidateResponse = {
  candidates?: UnlocatedDiscoveryCandidate[];
  summary?: { candidatesWithoutCoordinates?: number; candidatesWithCoordinates?: number };
  error?: string;
};

export function usePrivateCandidateMapLayer() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [unlocatedCandidates, setUnlocatedCandidates] = useState<UnlocatedDiscoveryCandidate[]>([]);
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let latestRequest = 0;

    async function load() {
      const requestId = ++latestRequest;
      setLoading(true);
      try {
        const sessionResponse = await fetch("/api/team/session", {
          cache: "no-store",
          signal: controller.signal,
        });
        const session = await sessionResponse.json().catch(() => ({})) as SessionResponse;
        if (!sessionResponse.ok || session.authenticated !== true) {
          if (requestId === latestRequest) {
            setAvailable(false);
            setFacilities([]);
            setUnlocatedCandidates([]);
            setError("");
          }
          return;
        }

        const [candidateResponse, unlocatedResponse] = await Promise.all([
          fetch("/api/team/facility-candidates", {
            cache: "no-store",
            signal: controller.signal,
          }),
          fetch("/api/team/facility-candidates/unlocated", {
            cache: "no-store",
            signal: controller.signal,
          }),
        ]);
        const data = await candidateResponse.json().catch(() => ({})) as CandidateResponse;
        const unlocated = await unlocatedResponse.json().catch(() => ({})) as UnlocatedCandidateResponse;
        if (!candidateResponse.ok || !Array.isArray(data.candidates)) {
          throw new Error(data.error || "No se pudo cargar la capa privada de candidatos.");
        }
        if (!unlocatedResponse.ok || !Array.isArray(unlocated.candidates)) {
          throw new Error(unlocated.error || "No se pudo cargar la lista interna de candidatos sin ubicar.");
        }
        if (requestId === latestRequest) {
          setAvailable(true);
          setFacilities([
            ...(mapPrivateCandidatesToFacilities(data.candidates) as Facility[]),
            ...unlocated.candidates.map(mapManualCandidateToFacility).filter((candidate): candidate is Facility => candidate !== null),
          ]);
          setUnlocatedCandidates(unlocated.candidates);
          setError("");
        }
      } catch (loadError) {
        if (controller.signal.aborted || requestId !== latestRequest) return;
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la capa privada.");
      } finally {
        if (!controller.signal.aborted && requestId === latestRequest) setLoading(false);
      }
    }

    void load();
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      controller.abort();
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  return { facilities, unlocatedCandidates, available, loading, error };
}
