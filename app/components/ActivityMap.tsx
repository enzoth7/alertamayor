"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import type { ActivityItem } from "./ActivitiesView";

export default function ActivityMap({
  activities,
  selectedId,
  onSelect,
}: {
  activities: ActivityItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Inicializar mapa centrado en Montevideo
    const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView([-34.901, -56.176], 12);
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

  // Dibujar marcadores interactivos
  useEffect(() => {
    const map = mapRef.current;
    const markers = markersRef.current;
    if (!map || !markers) return;

    markers.clearLayers();

    activities.forEach((act) => {
      const isSelected = selectedId === act.id;
      const marker = L.circleMarker([act.lat, act.lng], {
        radius: isSelected ? 11 : 7,
        color: isSelected ? "#155eef" : "#d97706",
        weight: isSelected ? 3 : 2,
        fillColor: isSelected ? "#155eef" : "#087443",
        fillOpacity: isSelected ? 1 : 0.85,
      });

      marker.on("click", () => {
        onSelect(act.id);
      });

      const popupContent = document.createElement("div");
      popupContent.className = "activityMapPopup";
      popupContent.innerHTML = `
        <strong style="color:#17365d; font-size:0.95rem; display:block; margin-bottom:3px;">${act.icon} ${act.title}</strong>
        <span style="color:#64748b; font-size:0.8rem; display:block;">📍 ${act.place} (${act.zone})</span>
        <span style="color:#d97706; font-size:0.8rem; font-weight:700; display:block; margin-top:2px;">⏰ ${act.time}</span>
      `;
      marker.bindPopup(popupContent);
      marker.addTo(markers);
    });

    if (activities.length > 0) {
      const bounds = L.latLngBounds(activities.map(({ lat, lng }) => [lat, lng]));
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
    }
  }, [activities, onSelect, selectedId]);

  // Vuelo reactivo hacia la actividad seleccionada
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;

    const target = activities.find((a) => a.id === selectedId);
    if (target) {
      map.flyTo([target.lat, target.lng], 15, { duration: 1 });
    }
  }, [selectedId, activities]);

  return <div ref={containerRef} className="activityMapContainer" aria-label="Mapa de actividades cercanas" />;
}
