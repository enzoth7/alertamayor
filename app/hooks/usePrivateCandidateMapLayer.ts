"use client";

import { useEffect, useState } from "react";
import { mapPrivateCandidatesToFacilities } from "../../lib/private-candidate-map.mjs";
import type { Facility } from "../components/map-types";

type SessionResponse = { authenticated?: boolean };
type CandidateSourceRecord = { sourceType?: unknown; sourceUrl?: unknown; sourceRecordKey?: unknown };
type CandidateRecord = {
  candidate_key?: unknown;
  name?: unknown;
  department?: unknown;
  locality?: unknown;
  address?: unknown;
  status?: unknown;
  evidence_tier?: unknown;
  human_reviewed?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  sources?: unknown;
  [key: string]: unknown;
};
type CandidateResponse = { candidates?: CandidateRecord[]; error?: string };
export type CandidateSourceCategory = "official" | "public_maps" | "social_public" | "other_public";
export type PrivateQueueCandidate = {
  candidateKey: string;
  name: string;
  department: string;
  locality: string;
  address: string | null;
  status: string;
  evidenceTier: "A" | "B" | "C";
  humanReviewed: boolean;
  hasCoordinates: boolean;
  sourceCategories: CandidateSourceCategory[];
  pendingImport: boolean;
  details: Record<string, unknown>;
};
export type PrivateUnlocatedCandidate = {
  candidateKey: string;
  name: string;
  department: string;
  locality: string;
  address: string | null;
  evidenceTier: "A" | "B" | "C";
  historical: boolean;
  alreadyInQueue: boolean;
};
export type PrivateCandidateSummary = {
  total: number;
  needsReview: number;
  possibleMatch: number;
  verifiedNew: number;
  otherStatuses: number;
  mappedFromDatabase: number;
  mappedFromManualSources: number;
  visibleOnMap: number;
  unlocatedCandidates: PrivateUnlocatedCandidate[];
  queueCandidates: PrivateQueueCandidate[];
};

const EMPTY_SUMMARY: PrivateCandidateSummary = {
  total: 0,
  needsReview: 0,
  possibleMatch: 0,
  verifiedNew: 0,
  otherStatuses: 0,
  mappedFromDatabase: 0,
  mappedFromManualSources: 0,
  visibleOnMap: 0,
  unlocatedCandidates: [],
  queueCandidates: [],
};
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
  const sourceCategories = manualSourceCategories(candidate);
  const sourceLabel = sourceCategories.includes("social_public")
    ? "Fuente pública de redes sociales"
    : "Webs y directorios públicos";
  return {
    id: `manual:${candidate.candidateKey}`, name: candidate.name, department: candidate.department, locality: candidate.locality,
    address: candidate.address || "Dirección pendiente de confirmación", places: null, lat: candidate.latitude, lng: candidate.longitude,
    precision: "puerta", precisionLabel: "Ubicación obtenida con IDE Uruguay", statusGroup: "candidate_private",
    statusStage: "Piloto interno", statusShort: "A verificar", sourceLabel,
    mspFinal: false, mspRegistroHistorico: false, midesSocial: false, pacp: false, otherSource: false,
    pendingVerification: true, appDiscovered: false, privateCandidate: true, privateCandidateEvidenceTier: candidate.evidenceTier,
    privateCandidateSourceUrl: candidate.geocodingSourceUrl || undefined, privateCandidateRetrievedAt: candidate.retrievedAt,
    createdAt: candidate.retrievedAt, updatedAt: candidate.retrievedAt,
    sourceCategories,
    privateCandidateStatus: candidate.reviewStatus,
  };
}

function manualSourceCategories(candidate: UnlocatedDiscoveryCandidate): CandidateSourceCategory[] {
  return [candidate.dataset.toLocaleLowerCase("es-UY").includes("instagram") ? "social_public" : "other_public"];
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function sourceCategoriesFromRecord(candidate: CandidateRecord): CandidateSourceCategory[] {
  const categories = new Set<CandidateSourceCategory>();
  const sources = Array.isArray(candidate.sources) ? candidate.sources as CandidateSourceRecord[] : [];
  for (const source of sources) {
    const sourceType = text(source.sourceType);
    const context = `${text(source.sourceUrl)} ${text(source.sourceRecordKey)}`
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

function mapQueueCandidate(candidate: CandidateRecord): PrivateQueueCandidate {
  const evidenceTier = ["A", "B", "C"].includes(text(candidate.evidence_tier))
    ? text(candidate.evidence_tier) as "A" | "B" | "C"
    : "C";
  return {
    candidateKey: text(candidate.candidate_key),
    name: text(candidate.name) || "Candidato sin nombre",
    department: text(candidate.department) || "Sin departamento",
    locality: text(candidate.locality) || "Sin localidad",
    address: text(candidate.address) || null,
    status: text(candidate.status) || "needs_review",
    evidenceTier,
    humanReviewed: candidate.human_reviewed === true,
    hasCoordinates: candidate.latitude !== null && candidate.latitude !== undefined && candidate.latitude !== ""
      && candidate.longitude !== null && candidate.longitude !== undefined && candidate.longitude !== ""
      && Number.isFinite(Number(candidate.latitude)) && Number.isFinite(Number(candidate.longitude)),
    sourceCategories: sourceCategoriesFromRecord(candidate),
    pendingImport: false,
    details: { ...candidate },
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
  const [summary, setSummary] = useState<PrivateCandidateSummary>(EMPTY_SUMMARY);
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
            setSummary(EMPTY_SUMMARY);
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
        const manualCandidates = unlocatedResponse.ok && Array.isArray(unlocated.candidates)
          ? unlocated.candidates
          : [];
        const manualCandidatesWarning = manualCandidates.length === 0 && !unlocatedResponse.ok
          ? unlocated.error || "No se pudo cargar la lista interna de candidatos sin ubicar."
          : "";
        if (requestId === latestRequest) {
          const databaseQueueCandidates = data.candidates.map(mapQueueCandidate);
          const databaseMappedKeys = new Set(databaseQueueCandidates
            .filter((candidate) => candidate.hasCoordinates)
            .map((candidate) => candidate.candidateKey));
          const databaseFacilities = mapPrivateCandidatesToFacilities(data.candidates) as Facility[];
          const manualFacilities = manualCandidates
            .filter((candidate) => !databaseMappedKeys.has(candidate.candidateKey))
            .map(mapManualCandidateToFacility)
            .filter((candidate): candidate is Facility => candidate !== null);
          const needsReview = data.candidates.filter((candidate) => candidate.status === "needs_review").length;
          const possibleMatch = data.candidates.filter((candidate) => candidate.status === "possible_match").length;
          const verifiedNew = data.candidates.filter((candidate) => candidate.status === "verified_new").length;
          const queuedKeys = new Set(data.candidates
            .map((candidate) => typeof candidate.candidate_key === "string" ? candidate.candidate_key : "")
            .filter(Boolean));
          const manualCandidatesByKey = new Map(manualCandidates.map((candidate) => [candidate.candidateKey, candidate]));
          const queueCandidates = databaseQueueCandidates.map((mapped) => {
            const manualCandidate = manualCandidatesByKey.get(mapped.candidateKey);
            if (!manualCandidate?.hasCoordinates) return mapped;
            return {
              ...mapped,
              hasCoordinates: true,
              sourceCategories: [...new Set([...mapped.sourceCategories, ...manualSourceCategories(manualCandidate)])],
            };
          });
          const pendingImportCandidates: PrivateQueueCandidate[] = manualCandidates
            .filter((candidate) => !candidate.hasCoordinates && !queuedKeys.has(candidate.candidateKey))
            .map((candidate) => ({
              candidateKey: candidate.candidateKey,
              name: candidate.name,
              department: candidate.department || "Sin departamento",
              locality: candidate.locality || "Sin localidad",
              address: candidate.address,
              status: candidate.reviewStatus || "needs_review",
              evidenceTier: candidate.evidenceTier,
              humanReviewed: false,
              hasCoordinates: false,
              sourceCategories: [candidate.dataset.toLocaleLowerCase("es-UY").includes("instagram") ? "social_public" : "other_public"],
              pendingImport: true,
              details: { ...candidate },
            }));
          setAvailable(true);
          setSummary({
            total: data.candidates.length,
            needsReview,
            possibleMatch,
            verifiedNew,
            otherStatuses: data.candidates.length - needsReview - possibleMatch - verifiedNew,
            mappedFromDatabase: databaseFacilities.length,
            mappedFromManualSources: manualFacilities.length,
            visibleOnMap: databaseFacilities.length + manualFacilities.length,
            unlocatedCandidates: manualCandidates
              .filter((candidate) => !candidate.hasCoordinates)
              .map((candidate) => ({
                candidateKey: candidate.candidateKey,
                name: candidate.name,
                department: candidate.department,
                locality: candidate.locality,
                address: candidate.address,
                evidenceTier: candidate.evidenceTier,
                historical: candidate.historical,
                alreadyInQueue: queuedKeys.has(candidate.candidateKey),
              })),
            queueCandidates: [...queueCandidates, ...pendingImportCandidates],
          });
          setFacilities([...databaseFacilities, ...manualFacilities]);
          setUnlocatedCandidates(manualCandidates);
          setError(manualCandidatesWarning);
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

  return { facilities, unlocatedCandidates, summary, available, loading, error };
}
