"use client";

import { useEffect, useState } from "react";
import type { Facility } from "../components/map-types";

type ResidencialesResponse = {
  facilities?: Facility[];
  error?: string;
};

export function useResidenciales() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch("/api/residenciales", {
          cache: "no-store",
          signal: controller.signal,
        });
        let data: ResidencialesResponse;
        try {
          data = await response.json() as ResidencialesResponse;
        } catch {
          throw new Error("No se pudo cargar el registro de residenciales.");
        }

        if (!response.ok || !Array.isArray(data.facilities)) {
          throw new Error(data.error || "No se pudo cargar el registro.");
        }

        setFacilities(data.facilities);
        setError("");
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el registro.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, []);

  return { facilities, loading, error };
}
