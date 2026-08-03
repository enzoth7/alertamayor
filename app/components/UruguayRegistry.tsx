"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, ChevronDown, ChevronUp, MapPinned, Search } from "lucide-react";
import { useResidenciales } from "../hooks/useResidenciales";
import { usePrivateCandidateMapLayer } from "../hooks/usePrivateCandidateMapLayer";
import type { Facility, FacilityStatus, MapMode } from "./map-types";

const StreetMap = dynamic(() => import("./StreetMap"), {
  ssr: false,
  loading: () => <div className="streetMapLoading">Preparando el mapa con calles…</div>,
});

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function matchesAdministrativeStatus(
  facility: Facility,
  status: FacilityStatus,
) {
  if (status === "habilitado") return facility.mspFinal;
  if (status === "registro") return facility.mspRegistroHistorico;
  if (status === "mides") return facility.midesSocial;
  if (status === "otra_fuente") return facility.otherSource;
  if (status === "app") return facility.appDiscovered;
  if (status === "candidate_private") return facility.privateCandidate === true;
  return facility.pendingVerification;
}

export default function UruguayRegistry({ onReport }: { onReport: (facility?: Facility) => void }) {
  const { facilities: publicFacilities, loading, error } = useResidenciales();
  const {
    facilities: privateCandidateFacilities,
    unlocatedCandidates,
    available: privateCandidatesAvailable,
    loading: privateCandidatesLoading,
    error: privateCandidatesError,
  } = usePrivateCandidateMapLayer();
  const [showPrivateCandidates, setShowPrivateCandidates] = useState(true);
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState<"" | FacilityStatus>("");
  const [precision, setPrecision] = useState("");
  const [mode, setMode] = useState<MapMode>("streets");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const facilities = useMemo(
    () => showPrivateCandidates
      ? [...publicFacilities, ...privateCandidateFacilities]
      : publicFacilities,
    [privateCandidateFacilities, publicFacilities, showPrivateCandidates],
  );

  useEffect(() => {
    const requestedMode = new URLSearchParams(window.location.search).get("map") as MapMode | null;
    if (requestedMode && ["streets", "list"].includes(requestedMode)) setMode(requestedMode);
  }, []);

  const statusIndependentWithoutDepartment = useMemo(() => facilities.filter((facility) => {
    const haystack = normalize(`${facility.name} ${facility.address} ${facility.locality} ${facility.department} ${facility.statusShort} ${facility.sourceLabel}`);
    return (!precision || facility.precision === precision) && (!query || haystack.includes(normalize(query)));
  }), [facilities, precision, query]);

  const baseWithoutDepartment = useMemo(
    () => statusIndependentWithoutDepartment.filter(
      (facility) => !status || matchesAdministrativeStatus(facility, status),
    ),
    [statusIndependentWithoutDepartment, status],
  );
  const visible = useMemo(() => baseWithoutDepartment.filter((facility) => !department || facility.department === department), [baseWithoutDepartment, department]);
  const kpiScope = useMemo(
    () => statusIndependentWithoutDepartment.filter(
      (facility) => !department || facility.department === department,
    ),
    [statusIndependentWithoutDepartment, department],
  );
  const departmentCounts = useMemo(() => Object.entries(baseWithoutDepartment.reduce<Record<string, number>>((counts, facility) => ({ ...counts, [facility.department]: (counts[facility.department] ?? 0) + 1 }), {})).sort(([a], [b]) => a.localeCompare(b, "es")), [baseWithoutDepartment]);
  const selected = selectedId ? (visible.find((facility) => facility.id === selectedId) ?? null) : null;
  const totals = useMemo(() => ({
    habilitado: kpiScope.filter((facility) => facility.mspFinal).length,
    registro: kpiScope.filter((facility) => facility.mspRegistroHistorico).length,
    mides: kpiScope.filter((facility) => facility.midesSocial).length,
    otraFuente: kpiScope.filter((facility) => facility.otherSource).length,
    verificar: kpiScope.filter((facility) => facility.pendingVerification).length,
    app: kpiScope.filter((facility) => facility.appDiscovered).length,
    privateCandidates: kpiScope.filter((facility) => facility.privateCandidate).length,
  }), [kpiScope]);
  const visiblePublicCount = visible.filter((facility) => !facility.privateCandidate).length;
  const visiblePrivateCandidateCount = visible.filter((facility) => facility.privateCandidate).length;
  const visibleUnlocatedCandidates = useMemo(() => unlocatedCandidates.filter((candidate) => !candidate.hasCoordinates && (() => {
    const haystack = normalize(`${candidate.name} ${candidate.address || ""} ${candidate.locality} ${candidate.department}`);
    return (!department || candidate.department === department)
      && (!query || haystack.includes(normalize(query)));
  })()), [department, query, unlocatedCandidates]);
  const unlocatedCandidateCount = unlocatedCandidates.filter((candidate) => !candidate.hasCoordinates).length;

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
      {privateCandidatesAvailable && privateCandidatesLoading && <div className="notice registryDataStatus" role="status">Actualizando candidatos OSM del piloto…</div>}
      {privateCandidatesAvailable && privateCandidatesError && <div className="notice registryDataStatus registryDataError" role="alert">{privateCandidatesError}</div>}
      {privateCandidatesAvailable && <div className="privateCandidateMapNotice">
        <span><strong>Capa piloto de descubrimiento.</strong> Los {privateCandidateFacilities.length} puntos rojos incluyen candidatos OSM y coincidencias exactas de IDE Uruguay. Los {unlocatedCandidateCount} hallazgos manuales sin coordenadas verificadas están en el listado inferior; no se sumaron a la base oficial.</span>
        <button type="button" onClick={() => {
          setShowPrivateCandidates((current) => {
            if (current && status === "candidate_private") setStatus("");
            return !current;
          });
        }}>{showPrivateCandidates ? "Ocultar candidatos" : `Mostrar ${privateCandidateFacilities.length + unlocatedCandidates.length} candidatos`}</button>
      </div>}
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
          <p>con registro</p>
          <small>Certificado de registro MSP</small>
        </button>
        <button type="button" className={`stat statCard-violet ${status === "verificar" ? "selected" : ""}`} onClick={() => setStatus(status === "verificar" ? "" : "verificar")}>
          <b>{totals.verificar}</b>
          <p>por verificar</p>
          <small>Revisión pendiente</small>
        </button>
        <button type="button" className={`stat statCard-black ${status === "app" ? "selected" : ""}`} onClick={() => setStatus(status === "app" ? "" : "app")}>
          <b>{totals.app}</b>
          <p>encontrados por la app</p>
          <small>Fuente digital · sin verificar</small>
        </button>
        <button type="button" className={`stat statCard-gray ${status === "otra_fuente" ? "selected" : ""}`} onClick={() => setStatus(status === "otra_fuente" ? "" : "otra_fuente")}>
          <b>{totals.otraFuente}</b>
          <p>otras fuentes</p>
          <small>No figura en estas 3 listas</small>
        </button>
        <button type="button" className={`stat statCard-cyan ${status === "mides" ? "selected" : ""}`} onClick={() => setStatus(status === "mides" ? "" : "mides")}>
          <b>{totals.mides}</b>
          <p>certificado social</p>
          <small>Certificado Social MIDES</small>
        </button>
        {privateCandidatesAvailable && <button type="button" className={`stat statCard-red ${status === "candidate_private" ? "selected" : ""}`} onClick={() => {
          setShowPrivateCandidates(true);
          setStatus(status === "candidate_private" ? "" : "candidate_private");
        }}>
          <b>{privateCandidateFacilities.length}</b>
          <p>puntos piloto</p>
          <small>OSM · evidencia C</small>
        </button>}
      </div>
      <p className="registryOverlapNote">
        Las acreditaciones se cuentan por separado: un mismo residencial puede
        figurar en más de una lista. Los candidatos del piloto no son una acreditación.
      </p>
      <div className="registryToolbar">
        <label className="searchField"><b>Nombre, calle o localidad</b><div className="registrySearchBox"><Search size={19}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ej.: La Paz, Artigas 1308, hogar"/></div></label>
        <label><b>Departamento</b><select value={department} onChange={(event) => setDepartment(event.target.value)}><option value="">Todos</option>{departmentCounts.map(([name]) => <option key={name}>{name}</option>)}</select></label>
        <label><b>Situación administrativa</b><select value={status} onChange={(event) => {
          const nextStatus = event.target.value as "" | FacilityStatus;
          if (nextStatus === "candidate_private") setShowPrivateCandidates(true);
          setStatus(nextStatus);
        }}><option value="">Todas las que tienen punto</option><option value="habilitado">Habilitación final MSP</option><option value="registro">Certificado de registro MSP (histórico)</option><option value="verificar">Pendiente de verificación</option><option value="app">Encontrados por la app</option><option value="otra_fuente">No figura en las tres listas auditadas</option><option value="mides">Certificado Social MIDES</option>{privateCandidatesAvailable && <option value="candidate_private">Candidatos OSM del piloto</option>}</select></label>
        <label><b>Precisión (opcional)</b><select value={precision} onChange={(event) => setPrecision(event.target.value)}><option value="">Todas</option><option value="puerta">Nivel de puerta</option><option value="calle">Nivel de calle</option><option value="referencial">Referencial</option></select></label>
        <button className="secondary resetMapFilters" onClick={resetFilters}>Ver todo</button>
      </div>
      <div className="departmentChips"><button className={!department ? "active" : ""} onClick={() => setDepartment("")}>Todos · {baseWithoutDepartment.length}</button>{departmentCounts.map(([name, count]) => <button className={department === name ? "active" : ""} onClick={() => setDepartment(department === name ? "" : name)} key={name}>{name} · {count}</button>)}</div>
      <div className="mapModes"><strong>Cómo verlos:</strong><button className={mode === "streets" ? "active" : ""} onClick={() => setMode("streets")}><MapPinned size={18}/> Mapa con calles</button><button className={mode === "list" ? "active" : ""} onClick={() => setMode("list")}><Building2 size={18}/> Solo listado</button></div>
    </section>

    <div className={`registryMapLayout ${privateCandidatesAvailable && showPrivateCandidates ? "hasUnlocatedPanel" : ""} ${mode === "list" ? "mapListOnly" : ""}`}>
      {privateCandidatesAvailable && showPrivateCandidates && <aside className="card registryUnlocatedPanel" aria-label="Candidatos sin coordenadas verificadas">
        <div className="resultsHead"><div><div className="eyebrow">Piloto interno</div><h2>Sin ubicar</h2></div><output className="resultCount">{visibleUnlocatedCandidates.length}</output></div>
        <p className="unlocatedPanelLead">No tienen coordenadas comprobadas; por eso no se colocan en el mapa.</p>
        <div className="unlocatedPilotCandidates">
          <ul>
            {visibleUnlocatedCandidates.map((candidate) => <li key={candidate.candidateKey}>
              <strong>{candidate.name}</strong>
              <span>{candidate.address || "Sin dirección exacta"} · {candidate.locality}, {candidate.department}</span>
              <small>{candidate.historical ? "Referencia histórica · no mapear" : "Evidencia C · requiere geocodificación y revisión"}</small>
            </li>)}
          </ul>
          {!visibleUnlocatedCandidates.length && <p className="unlocatedEmpty">No hay candidatos sin coordenadas para estos filtros.</p>}
        </div>
      </aside>}
      {mode !== "list" && <div className="registryMapColumn">
        <StreetMap facilities={visible} selectedId={selected?.id ?? null} onSelect={setSelectedId}/>
      </div>}

      <aside className="card registryResults">
        <div className="resultsHead"><div><div className="eyebrow">Registro consultable</div><h2>Con ubicación en el mapa</h2></div><output className="resultCount">{visible.length}</output></div>
        <ul className="resultsLegend">
          <li><i className="dot greenDot"/>Habilitación final MSP</li>
          <li><i className="dot amberDot"/>Certificado de registro MSP (histórico)</li>
          <li><i className="dot cyanDot"/>Certificado Social MIDES</li>
          <li><i className="dot grayDot"/>No figura en las tres listas auditadas</li>
          <li><i className="dot violetDot"/>Pendiente de verificación</li>
          <li><i className="dot blackDot"/>Encontrado por la app</li>
          {privateCandidatesAvailable && showPrivateCandidates && <li><i className="dot redDot"/>Candidato OSM del piloto · evidencia C</li>}
        </ul>
        <p className="resultsMeta">{visiblePublicCount} públicos{showPrivateCandidates && visiblePrivateCandidateCount > 0 ? ` + ${visiblePrivateCandidateCount} candidatos del piloto` : ""}</p>
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

function FacilityMembershipBadges({ facility }: { facility: Facility }) {
  const badges = [
    facility.mspFinal && {
      label: "Habilitación final MSP",
      tone: "green",
    },
    facility.midesSocial && {
      label: "Certificado Social MIDES",
      tone: "cyan",
    },
    facility.mspRegistroHistorico && {
      label: "Registro MSP histórico",
      tone: "amber",
    },
    facility.pacp && {
      label: "Proveedor PACP",
      tone: "gray",
    },
    facility.otherSource && !facility.pacp && {
      label: "Otra fuente / fuera de listas auditadas",
      tone: "gray",
    },
    facility.pendingVerification && {
      label: "Pendiente de verificación",
      tone: "violet",
    },
    facility.appDiscovered && {
      label: "Encontrado por la app · sin verificar",
      tone: "black",
    },
    facility.privateCandidate && {
      label: `Candidato OSM del piloto · evidencia ${facility.privateCandidateEvidenceTier || "C"}`,
      tone: "red",
    },
  ].filter(Boolean) as { label: string; tone: string }[];

  return (
    <span className="facilityBadges" aria-label="Fuentes y situación administrativa">
      {badges.map((badge) => (
        <span className={`sourceBadge sourceBadge-${badge.tone}`} key={badge.label}>
          {badge.label}
        </span>
      ))}
    </span>
  );
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
  onReport: (facility?: Facility) => void;
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
          <FacilityMembershipBadges facility={facility} />
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
            {facility.privateCandidate ? <>
              {facility.privateCandidateSourceUrl && <a className="secondary facilityCandidateSourceLink" href={facility.privateCandidateSourceUrl} target="_blank" rel="noopener noreferrer">Abrir fuente OSM</a>}
              <a className="reportContinue facilityPrivateReviewBtn" href="/organizacion/residenciales">Abrir cola interna</a>
            </> : <button className="reportContinue facilityReportBtn" onClick={() => {
              if (facility) {
                try {
                  window.sessionStorage.setItem("alerta-mayor-preselected-facility", JSON.stringify(facility));
                } catch {}
              }
              onReport(facility);
            }}>
              Comunicar preocupación
            </button>}
          </div>
        </div>
      )}
    </article>
  );
}
