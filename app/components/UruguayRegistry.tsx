"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, ChevronDown, ChevronUp, MapPinned, Search } from "lucide-react";
import { useResidenciales } from "../hooks/useResidenciales";
import type { Facility, FacilityStatus, MapMode } from "./map-types";

const StreetMap = dynamic(() => import("./StreetMap"), {
  ssr: false,
  loading: () => <div className="streetMapLoading">Preparando el mapa con calles…</div>,
});

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export default function UruguayRegistry({ onReport }: { onReport: () => void }) {
  const { facilities, loading, error } = useResidenciales();
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState<"" | FacilityStatus>("");
  const [precision, setPrecision] = useState("");
  const [mode, setMode] = useState<MapMode>("streets");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const requestedMode = new URLSearchParams(window.location.search).get("map") as MapMode | null;
    if (requestedMode && ["streets", "list"].includes(requestedMode)) setMode(requestedMode);
  }, []);

  const baseWithoutDepartment = useMemo(() => facilities.filter((facility) => {
    const haystack = normalize(`${facility.name} ${facility.address} ${facility.locality} ${facility.department} ${facility.statusShort}`);
    return (!status || facility.statusGroup === status) && (!precision || facility.precision === precision) && (!query || haystack.includes(normalize(query)));
  }), [facilities, precision, query, status]);

  const visible = useMemo(() => baseWithoutDepartment.filter((facility) => !department || facility.department === department), [baseWithoutDepartment, department]);
  const departmentCounts = useMemo(() => Object.entries(baseWithoutDepartment.reduce<Record<string, number>>((counts, facility) => ({ ...counts, [facility.department]: (counts[facility.department] ?? 0) + 1 }), {})).sort(([a], [b]) => a.localeCompare(b, "es")), [baseWithoutDepartment]);
  const selected = selectedId ? (visible.find((facility) => facility.id === selectedId) ?? null) : null;
  const totals = useMemo(() => ({
    habilitado: visible.filter((facility) => facility.statusGroup === "habilitado").length,
    registro: visible.filter((facility) => facility.statusGroup === "registro").length,
    verificar: visible.filter((facility) => facility.statusGroup === "verificar").length,
  }), [visible]);

  useEffect(() => {
    if (selectedId && !visible.some((facility) => facility.id === selectedId)) {
      setSelectedId(null);
    }
  }, [visible, selectedId]);

  const orderedResults = visible;

  function resetFilters() {
    setQuery(""); setDepartment(""); setStatus(""); setPrecision("");
  }

  return <>
    <section className="card registryIntro">
      <div className="eyebrow">Registro de establecimientos</div>
      <h1>¿En qué situación administrativa está cada ELEPEM?</h1>
      <p className="lead">Elegí una categoría, un departamento o seleccioná un punto en el mapa para ver la información.</p>
      {loading && <div className="notice registryDataStatus" role="status">Cargando residenciales…</div>}
      {error && <div className="notice registryDataStatus registryDataError" role="alert">{error}</div>}
      <div className="stats registryStats">
        <button type="button" className={`stat statCard-blue ${!status ? "selected" : ""}`} onClick={() => setStatus("")}>
          <b>{visible.length}</b>
          <p>puntos visibles</p>
          <small>Resultado de los filtros</small>
        </button>
        <button type="button" className={`stat statCard-green ${status === "habilitado" ? "selected" : ""}`} onClick={() => setStatus(status === "habilitado" ? "" : "habilitado")}>
          <b>{totals.habilitado}</b>
          <p>habilitados</p>
          <small>Habilitación final MSP</small>
        </button>
        <button type="button" className={`stat statCard-amber ${status === "registro" ? "selected" : ""}`} onClick={() => setStatus(status === "registro" ? "" : "registro")}>
          <b>{totals.registro}</b>
          <p>en registro</p>
          <small>Certificado de registro</small>
        </button>
        <button type="button" className={`stat statCard-violet ${status === "verificar" ? "selected" : ""}`} onClick={() => setStatus(status === "verificar" ? "" : "verificar")}>
          <b>{totals.verificar}</b>
          <p>por verificar</p>
          <small>Capa de demostración</small>
        </button>
      </div>
      <div className="registryToolbar">
        <label className="searchField"><b>Nombre, calle o localidad</b><div className="registrySearchBox"><Search size={19}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ej.: La Paz, Artigas 1308, hogar"/></div></label>
        <label><b>Departamento</b><select value={department} onChange={(event) => setDepartment(event.target.value)}><option value="">Todos</option>{departmentCounts.map(([name]) => <option key={name}>{name}</option>)}</select></label>
        <label><b>Situación administrativa</b><select value={status} onChange={(event) => setStatus(event.target.value as "" | FacilityStatus)}><option value="">Todas las que tienen punto</option><option value="habilitado">Habilitación final · corte 2024</option><option value="registro">Certificado de registro · emitido 2024</option><option value="verificar">No figura / dato no coincide · DEMO</option></select></label>
        <label><b>Precisión (opcional)</b><select value={precision} onChange={(event) => setPrecision(event.target.value)}><option value="">Todas</option><option value="puerta">Nivel de puerta</option><option value="calle">Nivel de calle</option><option value="referencial">Referencial</option></select></label>
        <button className="secondary resetMapFilters" onClick={resetFilters}>Ver todo</button>
      </div>
      <div className="departmentChips"><button className={!department ? "active" : ""} onClick={() => setDepartment("")}>Todos · {baseWithoutDepartment.length}</button>{departmentCounts.map(([name, count]) => <button className={department === name ? "active" : ""} onClick={() => setDepartment(department === name ? "" : name)} key={name}>{name} · {count}</button>)}</div>
      <div className="mapModes"><strong>Cómo verlos:</strong><button className={mode === "streets" ? "active" : ""} onClick={() => setMode("streets")}><MapPinned size={18}/> Mapa con calles</button><button className={mode === "list" ? "active" : ""} onClick={() => setMode("list")}><Building2 size={18}/> Solo listado</button></div>
    </section>

    <div className={`registryMapLayout ${mode === "list" ? "mapListOnly" : ""}`}>
      {mode !== "list" && <div className="registryMapColumn">
        <StreetMap facilities={visible} selectedId={selected?.id ?? null} onSelect={setSelectedId}/>
      </div>}

      <aside className="card registryResults">
        <div className="resultsHead"><div><div className="eyebrow">Registro consultable</div><h2>Resultados</h2></div><output className="resultCount">{visible.length}</output></div>
        <ul className="resultsLegend">
          <li><i className="dot greenDot"/>Habilitación final MSP</li>
          <li><i className="dot amberDot"/>Certificado de registro</li>
          <li><i className="dot blueDot"/>Certificado social MIDES</li>
          <li><i className="dot violetDot"/>Pendiente de verificación</li>
        </ul>
        <p className="resultsMeta">{visible.length} residenciales encontrados</p>
        <div className="registryResultsScroll">
          {orderedResults.map((facility) => (
            <FacilityAccordionCard
              facility={facility}
              isSelected={selected?.id === facility.id}
              onSelect={setSelectedId}
              onReport={onReport}
              key={facility.id}
            />
          ))}
        </div>
      </aside>
    </div>
  </>;
}

function FacilityAccordionCard({
  facility,
  isSelected,
  onSelect,
  onReport,
}: {
  facility: Facility;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onReport: () => void;
}) {
  const [isOpen, setIsOpen] = useState(isSelected);
  const cardRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isSelected) {
      setIsOpen(true);
      cardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [isSelected]);

  const toggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      onSelect(facility.id);
    }
  };

  return (
    <article ref={cardRef} className={`facilityCard facility-${facility.statusGroup} ${isOpen ? "isOpen" : ""} ${isSelected ? "selected" : ""}`}>
      <button type="button" className="facilityAccordionHeader" onClick={toggle} aria-expanded={isOpen}>
        <div className="facilityAccordionTitle">
          <strong>{facility.name}</strong>
          <span className="facilityLocation">{facility.locality} · {facility.department}</span>
        </div>
        <span className="facilityAccordionChevron">
          {isOpen ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
        </span>
      </button>

      {isOpen && (
        <div className="facilityAccordionBody">
          {facility.address && <p className="facilityAddress"><strong>Dirección:</strong> {facility.address}</p>}
          {facility.places != null && <p className="facilityPlaces"><strong>Capacidad:</strong> {facility.places} plazas</p>}
          <small className="facilitySource">{facility.sourceLabel}</small>
          {facility.precisionLabel && <em className="facilityPrecision">{facility.precisionLabel}</em>}
          
          <div className="facilityAccordionActions">
            <button className="reportContinue facilityReportBtn" onClick={onReport}>
              Comunicar preocupación
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
