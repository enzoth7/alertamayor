"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { Building2, ChevronDown, Map, MapPinned, Search, ShieldAlert } from "lucide-react";
import facilityData from "../data/facilities.json";
import type { Facility, FacilityStatus, MapMode } from "./map-types";

function RegistryNoticeAccordion({ title, tone, defaultOpen = false, children }: { title: string; tone: "violet" | "red" | "amber"; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return <div className={`registryNoticeAccordion accordion-${tone} ${open ? "accordionOpen" : ""}`}>
    <button className="registryNoticeHeader" onClick={() => setOpen(!open)} aria-expanded={open}>
      <strong className="registryNoticeTitle">{title}</strong>
      <ChevronDown className="registryNoticeChevron" size={19}/>
    </button>
    <div className="registryNoticeBody">
      <div className="registryNoticeContent">{children}</div>
    </div>
  </div>;
}

const StreetMap = dynamic(() => import("./StreetMap"), {
  ssr: false,
  loading: () => <div className="streetMapLoading">Preparando el mapa con calles…</div>,
});

const facilities = facilityData as Facility[];
const colors: Record<FacilityStatus, string> = {
  habilitado: "#087443",
  registro: "#d97706",
  verificar: "#6941c6",
};

const uruguayOutline = [
  [-57.62513342958296,-30.21629485445426],[-56.976025763564735,-30.109686374636127],[-55.97324459494094,-30.883075860316303],[-55.601510179249345,-30.853878676071393],[-54.57245154480512,-31.494511407193748],[-53.78795162618219,-32.047242526987624],[-53.209588995971544,-32.727666110974724],[-53.6505439927181,-33.20200408298183],[-53.373661668498244,-33.768377780900764],[-53.806425950726535,-34.39681487400223],[-54.93586605489773,-34.952646579733624],[-55.67408972840329,-34.75265878676407],[-56.21529700379607,-34.85983570733742],[-57.1396850246331,-34.430456231424245],[-57.81786068381551,-34.4625472958775],[-58.42707414410439,-33.909454441057576],[-58.349611172098875,-33.26318897881541],[-58.13264767112145,-33.040566908502015],[-58.14244035504076,-32.044503676076154],[-57.87493730328188,-31.016556084926208],[-57.62513342958296,-30.21629485445426],
];

const countryBounds = { minLng: -58.6, maxLng: -53, minLat: -35.15, maxLat: -29.9 };
const montevideoBounds = { minLng: -56.25, maxLng: -56.02, minLat: -34.95, maxLat: -34.78 };
const mainBox = { x: 18, y: 42, w: 530, h: 585 };
const insetBox = { x: 590, y: 102, w: 305, h: 310 };

function project(lng: number, lat: number, bounds: typeof countryBounds, box: typeof mainBox) {
  return [box.x + (lng - bounds.minLng) / (bounds.maxLng - bounds.minLng) * box.w, box.y + (bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat) * box.h];
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export default function UruguayRegistry({ onReport }: { onReport: () => void }) {
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState<"" | FacilityStatus>("");
  const [precision, setPrecision] = useState("");
  const [mode, setMode] = useState<MapMode>("streets");
  const [selectedId, setSelectedId] = useState<string | null>(facilities[0]?.id ?? null);

  useEffect(() => {
    const requestedMode = new URLSearchParams(window.location.search).get("map") as MapMode | null;
    if (requestedMode && ["overview", "streets", "list"].includes(requestedMode)) setMode(requestedMode);
  }, []);

  const baseWithoutDepartment = useMemo(() => facilities.filter((facility) => {
    const haystack = normalize(`${facility.name} ${facility.address} ${facility.locality} ${facility.department} ${facility.statusShort}`);
    return (!status || facility.statusGroup === status) && (!precision || facility.precision === precision) && (!query || haystack.includes(normalize(query)));
  }), [precision, query, status]);

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

  const outlinePath = uruguayOutline.map(([lng, lat], index) => {
    const [x, y] = project(lng, lat, countryBounds, mainBox);
    return `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ") + " Z";
  const orderedResults = selected ? [selected, ...visible.filter((facility) => facility.id !== selected.id)] : visible;

  function resetFilters() {
    setQuery(""); setDepartment(""); setStatus(""); setPrecision("");
  }

  return <>
    <section className="card registryIntro">
      <div className="eyebrow">Registro integrado por etapas</div>
      <h1>¿En qué situación administrativa está cada ELEPEM?</h1>
      <p className="lead">La vista combina fuentes con fecha de corte y una capa institucional ficticia. Elegí una etapa, un departamento o un punto para ver su ficha.</p>
      <div className="stats registryStats">
        <div className="stat"><b>{visible.length}</b><span>puntos visibles</span><small>{totals.habilitado + totals.registro} oficiales + {totals.verificar} DEMO</small></div>
        <div className="stat"><b>234</b><span>con respaldo oficial</span><small>Datos georreferenciados del prototipo</small></div>
        <div className="stat"><b>212</b><span>listado MSP 2026</span><small>Requiere conciliación nominal</small></div>
        <div className="stat"><b>319</b><span>certificado social</span><small>Directorio MIDES 2026</small></div>
        <div className="stat"><b>3 DEMO</b><span>por verificar</span><small>No representan casos reales</small></div>
      </div>
      <div className="stageGrid">
        <button className={`stageCard stage-green ${status === "habilitado" ? "selected" : ""}`} onClick={() => setStatus(status === "habilitado" ? "" : "habilitado")}><span className="stageNumber">Etapa 3</span><strong><i className="statusDot"/>Habilitación final MSP</strong><small>Corte de datos abiertos 2024.</small></button>
        <a className="stageCard stage-blue" href="https://www.gub.uy/ministerio-desarrollo-social/etiqueta/otros/establecimientos-larga-estadia-para-personas-mayores-certificado-social" target="_blank" rel="noreferrer"><span className="stageNumber">Etapa 2</span><strong><i className="statusDot"/>Certificado social MIDES</strong><small>Directorio oficial externo 2026.</small></a>
        <button className={`stageCard stage-amber ${status === "registro" ? "selected" : ""}`} onClick={() => setStatus(status === "registro" ? "" : "registro")}><span className="stageNumber">Etapa 1</span><strong><i className="statusDot"/>Certificado de registro</strong><small>Emitidos durante 2024.</small></button>
        <button className={`stageCard stage-violet ${status === "verificar" ? "selected" : ""}`} onClick={() => setStatus(status === "verificar" ? "" : "verificar")}><span className="stageNumber">3 DEMO</span><strong><i className="statusDot"/>Dato no conciliado</strong><small>Capa ficticia pendiente de verificación.</small></button>
      </div>
      <div className="registryNoticeStack">
        <RegistryNoticeAccordion title="Posibles establecimientos no registrados: capa institucional del prototipo" tone="violet">
          <p>Los tres puntos violetas muestran cómo se incorporaría una alerta que no coincide con las fuentes públicas. Cada ficha indica el origen, el canal de entrada, el organismo receptor propuesto y el estado de la derivación.</p>
          <button className="link" onClick={onReport}>Agregar otro lugar para verificar</button>
        </RegistryNoticeAccordion>

        <RegistryNoticeAccordion title="Las medidas administrativas son otra dimensión" tone="red">
          <p>Observación, apercibimiento, multa, suspensión, clausura o caducidad no deben mezclarse con la etapa de habilitación. No existe una base pública nacional única y actualizada de todas esas medidas.</p>
        </RegistryNoticeAccordion>

        <RegistryNoticeAccordion title="Cómo leer este mapa" tone="amber">
          <p>El color principal indica la etapa administrativa respaldada por la fuente; la precisión geográfica aparece como dato secundario. Un registro histórico puede haber cambiado después de su fecha de corte.</p>
        </RegistryNoticeAccordion>
      </div>
      <div className="registryToolbar">
        <label className="searchField"><span>Nombre, calle o localidad</span><div className="registrySearchBox"><Search size={19}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ej.: La Paz, Artigas 1308, hogar"/></div></label>
        <label><span>Departamento</span><select value={department} onChange={(event) => setDepartment(event.target.value)}><option value="">Todos</option>{departmentCounts.map(([name]) => <option key={name}>{name}</option>)}</select></label>
        <label><span>Situación administrativa</span><select value={status} onChange={(event) => setStatus(event.target.value as "" | FacilityStatus)}><option value="">Todas las que tienen punto</option><option value="habilitado">Habilitación final · corte 2024</option><option value="registro">Certificado de registro · emitido 2024</option><option value="verificar">No figura / dato no coincide · DEMO</option></select></label>
        <label><span>Precisión (opcional)</span><select value={precision} onChange={(event) => setPrecision(event.target.value)}><option value="">Todas</option><option value="puerta">Nivel de puerta</option><option value="calle">Nivel de calle</option><option value="referencial">Referencial</option></select></label>
        <button className="secondary resetMapFilters" onClick={resetFilters}>Ver todo</button>
      </div>
      <div className="notice registryCoverage"><strong>Cobertura visible:</strong> {totals.habilitado + totals.registro} puntos derivados de recursos oficiales y {totals.verificar} alertas ficticias pendientes de verificación. <span>Los puntos violetas pertenecen a una capa institucional de demostración.</span></div>
      <div className="departmentChips"><button className={!department ? "active" : ""} onClick={() => setDepartment("")}>Todos · {baseWithoutDepartment.length}</button>{departmentCounts.map(([name, count]) => <button className={department === name ? "active" : ""} onClick={() => setDepartment(department === name ? "" : name)} key={name}>{name} · {count}</button>)}</div>
      <div className="mapModes"><strong>Cómo verlos:</strong><button className={mode === "streets" ? "active" : ""} onClick={() => setMode("streets")}><MapPinned size={18}/> Mapa con calles</button><button className={mode === "overview" ? "active" : ""} onClick={() => setMode("overview")}><Map size={18}/> Vista general</button><button className={mode === "list" ? "active" : ""} onClick={() => setMode("list")}><Building2 size={18}/> Solo listado</button></div>
    </section>

    <div className={`registryMapLayout ${mode === "list" ? "mapListOnly" : ""}`}>
      {mode !== "list" && <div className="registryMapColumn">
        {mode === "overview" ? <div className="uruguayOverview">
          <svg viewBox="0 0 920 670" role="img" aria-label={`Uruguay con ${visible.length} puntos visibles`}>
            <rect width="920" height="670" fill="#eef6fb"/>
            <text x="18" y="25" className="mapTitle">Uruguay · {visible.length} puntos visibles</text>
            <path d={outlinePath} fill="#fff" stroke="#708090" strokeWidth="2"/>
            <text x="605" y="78" className="mapInsetTitle">Ampliación de Montevideo</text>
            <rect x={insetBox.x} y={insetBox.y} width={insetBox.w} height={insetBox.h} rx="10" fill="#fff" stroke="#708090" strokeWidth="1.5"/>
            <line x1={insetBox.x} y1={insetBox.y + insetBox.h / 2} x2={insetBox.x + insetBox.w} y2={insetBox.y + insetBox.h / 2} stroke="#e5e7eb"/>
            <line x1={insetBox.x + insetBox.w / 2} y1={insetBox.y} x2={insetBox.x + insetBox.w / 2} y2={insetBox.y + insetBox.h} stroke="#e5e7eb"/>
            {visible.map((facility) => <OverviewPoint facility={facility} selected={selected?.id === facility.id} bounds={countryBounds} box={mainBox} onSelect={setSelectedId} key={`uy-${facility.id}`}/>) }
            {visible.filter((facility) => facility.department === "Montevideo").map((facility) => <OverviewPoint facility={facility} selected={selected?.id === facility.id} bounds={montevideoBounds} box={insetBox} onSelect={setSelectedId} key={`mvd-${facility.id}`}/>) }
            <text x="590" y="438" className="mapNote">Los puntos violetas son alertas ficticias pendientes de verificación.</text>
            <text x="590" y="458" className="mapNote">La ubicación exacta sería protegida en un sistema real.</text>
            <g transform="translate(590 500)" className="mapLegendSvg"><circle cx="6" cy="6" r="5" fill={colors.habilitado}/><text x="17" y="10">habilitación final ({totals.habilitado})</text><circle cx="6" cy="30" r="5" fill={colors.registro}/><text x="17" y="34">certificado de registro ({totals.registro})</text><circle cx="6" cy="54" r="6" fill={colors.verificar}/><text x="17" y="58">dato no conciliado ({totals.verificar} DEMO)</text></g>
          </svg>
          <div className="overviewDisclaimer">Verde y naranja provienen de recursos oficiales con fecha de corte. Violeta es una capa institucional ficticia.</div>
        </div> : <StreetMap facilities={visible} selectedId={selected?.id ?? null} onSelect={setSelectedId}/>} 
        <div className="notice overviewSelection">{selected ? <><strong>{selected.name}</strong><span>{selected.address} · {selected.locality} · {selected.department}</span><small>{selected.statusShort} · {selected.sourceLabel}</small></> : <><strong>Sin resultados visibles.</strong><span>Probá limpiar o cambiar los filtros.</span></>}</div>
        <p className="mapSourceNote">Las coordenadas se derivaron de domicilios publicados y datos de direcciones. La posición no confirma la vigencia administrativa.</p>
      </div>}

      <aside className="card registryResults">
        <div className="resultsHead"><div><div className="eyebrow">Registro consultable</div><h2>Resultados</h2></div><span className="resultCount">{visible.length}</span></div>
        <div className="resultsLegend">
          <span><i className="dot greenDot"/>Habilitación final · corte 2024</span>
          <span><i className="dot amberDot"/>Certificado de registro · emitido 2024</span>
          <span><i className="dot blueDot"/>Certificado social · directorio externo 2026</span>
          <span><i className="dot violetDot"/>No figura / dato no coincide · DEMO institucional</span>
          <span><i className="dot redDot"/>Medida oficial, cuando exista una publicación verificable</span>
        </div>
        <p className="resultsMeta">{visible.length} resultados · {totals.habilitado} etapa 3 · {totals.registro} etapa 1 · {totals.verificar} para verificar.</p>
        <div className="registryResultsScroll">{orderedResults.map((facility) => <FacilityCard facility={facility} selected={selected?.id === facility.id} onSelect={setSelectedId} onReport={onReport} key={facility.id}/>)}</div>
      </aside>
    </div>
  </>;
}

function OverviewPoint({ facility, selected, bounds, box, onSelect }: { facility: Facility; selected: boolean; bounds: typeof countryBounds; box: typeof mainBox; onSelect: (id: string) => void }) {
  const [cx, cy] = project(facility.lng, facility.lat, bounds, box);
  return <circle
    className={`overviewPoint ${selected ? "selected" : ""}`}
    cx={cx.toFixed(1)} cy={cy.toFixed(1)} r={selected ? 6 : facility.statusGroup === "verificar" ? 4.3 : 2.8}
    fill={colors[facility.statusGroup]} opacity=".9" tabIndex={0} role="button"
    aria-label={`${facility.name}: ${facility.statusShort}`}
    onClick={() => onSelect(facility.id)}
    onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect(facility.id); }}
  ><title>{facility.name} · {facility.statusShort} · {facility.address}</title></circle>;
}

function FacilityCard({ facility, selected, onSelect, onReport }: { facility: Facility; selected: boolean; onSelect: (id: string) => void; onReport: () => void }) {
  return <article className={`facilityCard facility-${facility.statusGroup} ${selected ? "selected" : ""}`}>
    <span className={`stagePill pill-${facility.statusGroup}`}>{facility.statusStage}</span>
    <strong>{facility.name}</strong>
    <span>{facility.address}</span>
    <span>{facility.locality} · {facility.department}{facility.places != null ? ` · ${facility.places} plazas` : ""}</span>
    <small>{facility.sourceLabel}</small>
    <em>{facility.precisionLabel}</em>
    <div><button className="secondary" onClick={() => onSelect(facility.id)}>Ver ficha</button><button className="link" onClick={onReport}>Comunicar preocupación</button></div>
  </article>;
}
