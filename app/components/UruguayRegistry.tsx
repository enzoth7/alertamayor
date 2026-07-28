"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { Building2, MapPinned, Search } from "lucide-react";
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
  const selected = visible.find((facility) => facility.id === selectedId) ?? visible[0] ?? null;
  const totals = useMemo(() => ({
    habilitado: visible.filter((facility) => facility.statusGroup === "habilitado").length,
    registro: visible.filter((facility) => facility.statusGroup === "registro").length,
    verificar: visible.filter((facility) => facility.statusGroup === "verificar").length,
  }), [visible]);

  useEffect(() => {
    if (selected && selected.id !== selectedId) setSelectedId(selected.id);
    if (!selected && selectedId) setSelectedId(null);
  }, [selected, selectedId]);

  const orderedResults = selected ? [selected, ...visible.filter((facility) => facility.id !== selected.id)] : visible;

  function resetFilters() {
    setQuery(""); setDepartment(""); setStatus(""); setPrecision("");
  }

  return <>
    <section className="card registryIntro">
      <div className="eyebrow">Registro integrado por etapas</div>
      <h1>¿En qué situación administrativa está cada ELEPEM?</h1>
      <p className="lead">La vista combina fuentes con fecha de corte y una capa institucional ficticia. Elegí una etapa, un departamento o un punto para ver su ficha.</p>
      {loading && <div className="notice registryDataStatus" role="status">Cargando residenciales desde Supabase…</div>}
      {error && <div className="notice registryDataStatus registryDataError" role="alert">{error}</div>}
      <div className="stats registryStats">
        <div className="stat"><b>{visible.length}</b><p>puntos visibles</p><small>Resultado de los filtros activos</small></div>
        <div className="stat"><b>{totals.habilitado}</b><p>habilitados</p><small>Habilitación final MSP</small></div>
        <div className="stat"><b>{totals.registro}</b><p>en registro</p><small>Certificado de registro</small></div>
        <div className="stat"><b>{totals.verificar}</b><p>por verificar</p><small>Capa de demostración</small></div>
      </div>
      <div className="stageGrid">
        <button className={`stageCard stage-green ${status === "habilitado" ? "selected" : ""}`} onClick={() => setStatus(status === "habilitado" ? "" : "habilitado")}><b className="stageNumber">Etapa 3</b><strong><i className="statusDot"/>Habilitación final MSP</strong><small>Corte de datos abiertos 2024.</small></button>
        <a className="stageCard stage-blue" href="https://www.gub.uy/ministerio-desarrollo-social/etiqueta/otros/establecimientos-larga-estadia-para-personas-mayores-certificado-social" target="_blank" rel="noreferrer"><b className="stageNumber">Etapa 2</b><strong><i className="statusDot"/>Certificado social MIDES</strong><small>Directorio oficial externo 2026.</small></a>
        <button className={`stageCard stage-amber ${status === "registro" ? "selected" : ""}`} onClick={() => setStatus(status === "registro" ? "" : "registro")}><b className="stageNumber">Etapa 1</b><strong><i className="statusDot"/>Certificado de registro</strong><small>Emitidos durante 2024.</small></button>
        <button className={`stageCard stage-violet ${status === "verificar" ? "selected" : ""}`} onClick={() => setStatus(status === "verificar" ? "" : "verificar")}><b className="stageNumber">{totals.verificar} DEMO</b><strong><i className="statusDot"/>Dato no conciliado</strong><small>Capa ficticia pendiente de verificación.</small></button>
      </div>
      <div className="registryToolbar">
        <label className="searchField"><b>Nombre, calle o localidad</b><div className="registrySearchBox"><Search size={19}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ej.: La Paz, Artigas 1308, hogar"/></div></label>
        <label><b>Departamento</b><select value={department} onChange={(event) => setDepartment(event.target.value)}><option value="">Todos</option>{departmentCounts.map(([name]) => <option key={name}>{name}</option>)}</select></label>
        <label><b>Situación administrativa</b><select value={status} onChange={(event) => setStatus(event.target.value as "" | FacilityStatus)}><option value="">Todas las que tienen punto</option><option value="habilitado">Habilitación final · corte 2024</option><option value="registro">Certificado de registro · emitido 2024</option><option value="verificar">No figura / dato no coincide · DEMO</option></select></label>
        <label><b>Precisión (opcional)</b><select value={precision} onChange={(event) => setPrecision(event.target.value)}><option value="">Todas</option><option value="puerta">Nivel de puerta</option><option value="calle">Nivel de calle</option><option value="referencial">Referencial</option></select></label>
        <button className="secondary resetMapFilters" onClick={resetFilters}>Ver todo</button>
      </div>
      <div className="notice registryCoverage"><strong>Cobertura visible:</strong> {totals.habilitado + totals.registro} puntos derivados de recursos oficiales y {totals.verificar} alertas ficticias pendientes de verificación. Los puntos violetas pertenecen a una capa institucional de demostración.</div>
      <div className="departmentChips"><button className={!department ? "active" : ""} onClick={() => setDepartment("")}>Todos · {baseWithoutDepartment.length}</button>{departmentCounts.map(([name, count]) => <button className={department === name ? "active" : ""} onClick={() => setDepartment(department === name ? "" : name)} key={name}>{name} · {count}</button>)}</div>
      <div className="mapModes"><strong>Cómo verlos:</strong><button className={mode === "streets" ? "active" : ""} onClick={() => setMode("streets")}><MapPinned size={18}/> Mapa con calles</button><button className={mode === "list" ? "active" : ""} onClick={() => setMode("list")}><Building2 size={18}/> Solo listado</button></div>
    </section>

    <div className={`registryMapLayout ${mode === "list" ? "mapListOnly" : ""}`}>
      {mode !== "list" && <div className="registryMapColumn">
        <StreetMap facilities={visible} selectedId={selected?.id ?? null} onSelect={setSelectedId}/>
        <div className="notice overviewSelection">{selected ? <><strong>{selected.name}</strong><p>{selected.address} · {selected.locality} · {selected.department}</p><small>{selected.statusShort} · {selected.sourceLabel}</small></> : <><strong>Sin resultados visibles.</strong><p>Probá limpiar o cambiar los filtros.</p></>}</div>
        <p className="mapSourceNote">Las coordenadas se derivaron de domicilios publicados y datos de direcciones. La posición no confirma la vigencia administrativa.</p>
      </div>}

      <aside className="card registryResults">
        <div className="resultsHead"><div><div className="eyebrow">Registro consultable</div><h2>Resultados</h2></div><output className="resultCount">{visible.length}</output></div>
        <ul className="resultsLegend">
          <li><i className="dot greenDot"/>Habilitación final · corte 2024</li>
          <li><i className="dot amberDot"/>Certificado de registro · emitido 2024</li>
          <li><i className="dot blueDot"/>Certificado social · directorio externo 2026</li>
          <li><i className="dot violetDot"/>No figura / dato no coincide · DEMO institucional</li>
          <li><i className="dot redDot"/>Medida oficial, cuando exista una publicación verificable</li>
        </ul>
        <p className="resultsMeta">{visible.length} resultados · {totals.habilitado} etapa 3 · {totals.registro} etapa 1 · {totals.verificar} para verificar.</p>
        <div className="registryResultsScroll">{orderedResults.map((facility) => <FacilityCard facility={facility} selected={selected?.id === facility.id} onSelect={setSelectedId} onReport={onReport} key={facility.id}/>)}</div>
      </aside>
    </div>
  </>;
}

function FacilityCard({ facility, selected, onSelect, onReport }: { facility: Facility; selected: boolean; onSelect: (id: string) => void; onReport: () => void }) {
  return <article className={`facilityCard facility-${facility.statusGroup} ${selected ? "selected" : ""}`}>
    <span className={`stagePill pill-${facility.statusGroup}`}>{facility.statusStage}</span>
    <strong>{facility.name}</strong>
    <p>{facility.address}</p>
    <p>{facility.locality} · {facility.department}{facility.places != null ? ` · ${facility.places} plazas` : ""}</p>
    <small>{facility.sourceLabel}</small>
    <em>{facility.precisionLabel}</em>
    <div><button className="secondary" onClick={() => onSelect(facility.id)}>Ver ficha</button><button className="link" onClick={onReport}>Comunicar preocupación</button></div>
  </article>;
}
