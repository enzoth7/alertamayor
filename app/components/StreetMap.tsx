"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import type { Facility } from "./map-types";

const colors = {
  habilitado: "#087443",
  registro: "#d97706",
  mides: "#0891b2",
  otra_fuente: "#64748b",
  verificar: "#6941c6",
} satisfies Record<Facility["statusGroup"], string>;

function membershipBadges(facility: Facility) {
  return [
    facility.mspFinal && ["Habilitación final MSP", "green"],
    facility.midesSocial && ["Certificado Social MIDES", "cyan"],
    facility.mspRegistroHistorico && ["Registro MSP histórico", "amber"],
    facility.pacp && ["Proveedor PACP", "gray"],
    facility.otherSource &&
      !facility.pacp && ["Otra fuente / fuera de listas auditadas", "gray"],
    facility.pendingVerification && ["Pendiente de verificación", "violet"],
  ].filter(Boolean) as [string, string][];
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
  location.textContent = `${facility.locality} · ${facility.department}`;
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
  status.textContent = facility.statusShort;
  popup.appendChild(status);

  const source = document.createElement("small");
  source.textContent = facility.sourceLabel;
  popup.appendChild(source);

  return popup;
}

export default function StreetMap({ facilities, selectedId, onSelect }: { facilities: Facility[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const isFirstRender = useRef(true);

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
      const marker = L.circleMarker([facility.lat, facility.lng], {
        radius: isSelected ? 10 : facility.statusGroup === "verificar" ? 7 : 6,
        color: isSelected ? "#155eef" : "#fff",
        weight: isSelected ? 3 : 2,
        fillColor: colors[facility.statusGroup],
        fillOpacity: 0.92,
      });
      marker.on("click", () => {
        onSelect(facility.id);
      });
      marker.bindPopup(createPopup(facility));
      marker.addTo(markers);
    });

    // Ajustar límites solo en la carga inicial o al cambiar filtros
    if (isFirstRender.current && facilities.length) {
      isFirstRender.current = false;
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

  return <div ref={containerRef} className="leafletRegistryMap" aria-label="Mapa de residenciales"/>;
}
