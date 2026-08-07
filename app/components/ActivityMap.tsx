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

    // Inicializar mapa centrado en Uruguay
    const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView([-32.5228, -55.7658], 7);
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
        radius: isSelected ? 11 : 8,
        color: isSelected ? "#0f172a" : "#1d4ed8",
        weight: isSelected ? 3 : 2,
        fillColor: isSelected ? "#2563eb" : "#3b82f6",
        fillOpacity: 0.9,
      });

      const tooltipText = `${act.icon} ${act.title}`;
      marker.bindTooltip(tooltipText, {
        permanent: false,
        direction: "top",
        className: "customMapTooltip",
        offset: [0, -10],
      });

      marker.on("mouseover", () => {
        marker.openTooltip();
      });

      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        onSelect(act.id);
        marker.openTooltip();
      });

      if (isSelected) {
        setTimeout(() => {
          marker.openTooltip();
        }, 50);
      }

      marker.addTo(markers);
    });

    if (activities.length > 0 && !selectedId) {
      const bounds = L.latLngBounds(activities.map(({ lat, lng }) => [lat, lng]));
      const isNationwide = activities.length >= 20;
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: isNationwide ? 8 : 13 });
    }
  }, [activities, onSelect, selectedId]);

  // Vuelo reactivo hacia la actividad seleccionada cuando el usuario la toca
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;

    const target = activities.find((a) => a.id === selectedId);
    if (target) {
      map.flyTo([target.lat, target.lng], 14, { duration: 1 });
    }
  }, [selectedId, activities]);

  return <div ref={containerRef} className="activityMapContainer" aria-label="Mapa de actividades cercanas" />;
}
