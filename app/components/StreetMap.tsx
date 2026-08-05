"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import {
  canonicalDepartment,
  evidenceDescription,
  facilityDisplayCategory,
  facilityDisplayLabel,
  sourceCategoryLabels,
} from "./facility-presentation";
import type { Facility } from "./map-types";

const colors = {
  habilitado: "#087443",
  mides: "#d97706",
  unconfirmed: "#64748b",
};

function membershipBadges(facility: Facility) {
  const category = facilityDisplayCategory(facility);
  const tone = category === "habilitado" ? "green" : category === "mides" ? "amber" : "gray";
  return [[facilityDisplayLabel(facility), tone]] as [string, string][];
}

function createPopup(facility: Facility) {
  const popup = document.createElement("div");
  popup.className = "mapPopup";

  const name = document.createElement("strong");
  name.textContent = facility.name;
  popup.appendChild(name);

  const address = document.createElement("p");
  address.textContent = facility.address;
  popup.appendChild(address);

  const location = document.createElement("p");
  location.textContent = `${facility.locality} · ${canonicalDepartment(facility.department)}`;
  popup.appendChild(location);

  const badges = document.createElement("div");
  badges.className = "facilityBadges mapPopupBadges";
  for (const [label, tone] of membershipBadges(facility)) {
    const badge = document.createElement("span");
    badge.className = `sourceBadge sourceBadge-${tone}`;
    badge.textContent = label;
    badges.appendChild(badge);
  }
  popup.appendChild(badges);

  const status = document.createElement("b");
  status.textContent = `Estado en el mapa: ${facilityDisplayLabel(facility)}`;
  popup.appendChild(status);

  const sourceCategories = sourceCategoryLabels(facility);
  if (sourceCategories.length) {
    const provenance = document.createElement("p");
    provenance.textContent = `Procedencia: ${sourceCategories.join(" · ")}`;
    popup.appendChild(provenance);
  }

  if (facility.privateCandidate) {
    const evidence = document.createElement("p");
    evidence.textContent = `Evidencia ${facility.privateCandidateEvidenceTier || "C"}: ${evidenceDescription(facility.privateCandidateEvidenceTier)}`;
    popup.appendChild(evidence);
  }

  const source = document.createElement("small");
  source.textContent = facility.sourceLabel;
  popup.appendChild(source);

  return popup;
}

export default function StreetMap({ facilities, selectedId, onSelect }: { facilities: Facility[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const fittedFacilitiesRef = useRef("");
  const previousSelectedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView([-32.8, -56], 6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    mapRef.current = map;
    markersRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
    };
  }, []);

  // Re-dibujar marcadores cuando cambia la lista de instalaciones
  useEffect(() => {
    const map = mapRef.current;
    const markers = markersRef.current;
    if (!map || !markers) return;

    markers.clearLayers();
    facilities.forEach((facility) => {
      const isSelected = selectedId === facility.id;
      const displayCategory = facilityDisplayCategory(facility);
      const requiresVerification = displayCategory === "unconfirmed";
      const marker = L.circleMarker([facility.lat, facility.lng], {
        radius: isSelected ? 11 : requiresVerification ? 8 : 6,
        color: isSelected ? "#155eef" : "#fff",
        weight: isSelected ? 3 : 2,
        fillColor: colors[displayCategory],
        fillOpacity: 0.92,
      });
      marker.on("click", () => {
        onSelect(facility.id);
      });
      marker.bindTooltip(facility.name, {
        direction: "top",
        offset: [0, -7],
        opacity: 0.96,
        className: "facilityNameTooltip",
      });
      marker.bindPopup(createPopup(facility));
      marker.addTo(markers);
    });

    // Ajustar límites solo en la carga inicial o al cambiar filtros
    const facilitiesKey = facilities.map((facility) => facility.id).sort().join("|");
    if (facilities.length && facilitiesKey !== fittedFacilitiesRef.current) {
      fittedFacilitiesRef.current = facilitiesKey;
      const bounds = L.latLngBounds(facilities.map(({ lat, lng }) => [lat, lng]));
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: 14 });
    }
  }, [facilities, onSelect, selectedId]);

  // Zoom in reactivo al seleccionar un residencial
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;

    const target = facilities.find((f) => f.id === selectedId);
    if (target) {
      map.flyTo([target.lat, target.lng], 16, { duration: 1 });
    }
  }, [selectedId, facilities]);

  // Al quitar una selección, volver al encuadre general de los resultados.
  useEffect(() => {
    const map = mapRef.current;
    const previousSelectedId = previousSelectedIdRef.current;
    previousSelectedIdRef.current = selectedId;
    if (!map || previousSelectedId === null || selectedId !== null) return;

    if (facilities.length) {
      const bounds = L.latLngBounds(facilities.map(({ lat, lng }) => [lat, lng]));
      map.flyToBounds(bounds, { padding: [28, 28], maxZoom: 14, duration: 0.8 });
    } else {
      map.flyTo([-32.8, -56], 6, { duration: 0.8 });
    }
  }, [facilities, selectedId]);

  return <div ref={containerRef} className="leafletRegistryMap" aria-label="Mapa de residenciales"/>;
}
