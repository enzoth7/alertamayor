"use client";

import { useEffect } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";
import type { Facility } from "./map-types";

const colors = {
  habilitado: "#087443",
  registro: "#d97706",
  verificar: "#6941c6",
};

function FitToResults({ facilities }: { facilities: Facility[] }) {
  const map = useMap();

  useEffect(() => {
    if (!facilities.length) return;
    const bounds = facilities.map(({ lat, lng }) => [lat, lng]) as LatLngBoundsExpression;
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 14 });
  }, [facilities, map]);

  return null;
}

export default function StreetMap({ facilities, selectedId, onSelect }: { facilities: Facility[]; selectedId: string | null; onSelect: (id: string) => void }) {
  return <MapContainer className="leafletRegistryMap" center={[-32.8, -56]} zoom={6} scrollWheelZoom>
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    />
    <FitToResults facilities={facilities}/>
    {facilities.map((facility) => <CircleMarker
      key={facility.id}
      center={[facility.lat, facility.lng]}
      radius={selectedId === facility.id ? 9 : facility.statusGroup === "verificar" ? 7 : 5}
      pathOptions={{ color: "#fff", weight: 2, fillColor: colors[facility.statusGroup], fillOpacity: .92 }}
      eventHandlers={{ click: () => onSelect(facility.id) }}
    >
      <Popup><div className="mapPopup"><strong>{facility.name}</strong><span>{facility.address}</span><span>{facility.locality} · {facility.department}</span><b>{facility.statusShort}</b><small>{facility.sourceLabel}</small></div></Popup>
    </CircleMarker>)}
  </MapContainer>;
}
