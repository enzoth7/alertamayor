"use client";

import { useEffect, useState } from "react";
import { mapPrivateCandidatesToFacilities } from "../../lib/private-candidate-map.mjs";
import type { Facility } from "../components/map-types";

type SessionResponse = { authenticated?: boolean };
type CandidateResponse = { candidates?: unknown[]; error?: string };

export function usePrivateCandidateMapLayer() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
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
            setError("");
          }
          return;
        }

        const candidateResponse = await fetch("/api/team/facility-candidates", {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await candidateResponse.json().catch(() => ({})) as CandidateResponse;
        if (!candidateResponse.ok || !Array.isArray(data.candidates)) {
          throw new Error(data.error || "No se pudo cargar la capa privada de candidatos.");
        }
        if (requestId === latestRequest) {
          setAvailable(true);
          setFacilities(mapPrivateCandidatesToFacilities(data.candidates) as Facility[]);
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

  return { facilities, available, loading, error };
}
