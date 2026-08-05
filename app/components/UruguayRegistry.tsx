"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Building2, ChevronDown, ChevronUp, MapPinned, RotateCcw, Search, X } from "lucide-react";
import { useResidenciales } from "../hooks/useResidenciales";
import { usePrivateCandidateMapLayer } from "../hooks/usePrivateCandidateMapLayer";
import type { PrivateCandidateSummary } from "../hooks/usePrivateCandidateMapLayer";
import {
  canonicalDepartment,
  consolidateFacilities,
  evidenceDescription,
  facilityDisplayCategory,
  facilityDisplayLabel,
  hasOfficialAdministrativeRecord,
  isVerificationFacility,
  sourceCategoryLabels,
} from "./facility-presentation";
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

type UruguayRegistryProps = {
  onReport?: (facility?: Facility) => void;
  candidateDisplay?: "all" | "public" | "verification";
  filterControl?: ReactNode;
  onShowAll?: () => void;
  onShowVerification?: () => void;
  onCandidateSummary?: (summary: PrivateCandidateSummary) => void;
  onLegacyVerificationFacilities?: (facilities: Facility[]) => void;
  onVerificationMapFacilities?: (facilities: Facility[]) => void;
};

type SourceCategoryFilter = "" | "official" | "public_maps" | "social_public" | "other_public";
type PrivateWorkflowStatus = "" | "needs_review" | "possible_match" | "verified_new";

function matchesSourceCategory(facility: Facility, category: SourceCategoryFilter) {
  if (!category) return true;
  // En este filtro, "Fuentes oficiales" representa exclusivamente los tres
  // respaldos administrativos que determinan el color del punto.
  if (category === "official") return hasOfficialAdministrativeRecord(facility);
  return facility.sourceCategories?.includes(category) === true;
}

export default function UruguayRegistry({
  candidateDisplay = "all",
  filterControl,
  onShowAll,
  onShowVerification,
  onCandidateSummary,
  onLegacyVerificationFacilities,
  onVerificationMapFacilities,
}: UruguayRegistryProps) {
  const { facilities: publicFacilities, loading, error } = useResidenciales();
  const {
    facilities: privateCandidateFacilities,
    summary: candidateSummary,
    available: privateCandidatesAvailable,
    loading: privateCandidatesLoading,
    error: privateCandidatesError,
  } = usePrivateCandidateMapLayer();
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState<"" | FacilityStatus>("");
  const [sourceCategory, setSourceCategory] = useState<SourceCategoryFilter>("");
  const [privateWorkflowStatus, setPrivateWorkflowStatus] = useState<PrivateWorkflowStatus>("");
  const [mode, setMode] = useState<MapMode>("streets");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [activeKpiHelp, setActiveKpiHelp] = useState<string | null>(null);
  const mapColumnRef = useRef<HTMLDivElement | null>(null);
  const consolidatedFacilities = useMemo(
    () => consolidateFacilities([...publicFacilities, ...privateCandidateFacilities]),
    [privateCandidateFacilities, publicFacilities],
  );
  const facilities = useMemo(() => {
    if (candidateDisplay === "verification") return consolidatedFacilities.filter(isVerificationFacility);
    if (candidateDisplay === "public") return consolidatedFacilities.filter((facility) => !isVerificationFacility(facility));
    return consolidatedFacilities;
  }, [candidateDisplay, consolidatedFacilities]);
  const legacyVerificationFacilities = useMemo(
    () => consolidatedFacilities.filter((facility) => isVerificationFacility(facility) && !facility.privateCandidate),
    [consolidatedFacilities],
  );
  const verificationMapFacilities = useMemo(
    () => consolidatedFacilities.filter(isVerificationFacility),
    [consolidatedFacilities],
  );

  useEffect(() => {
    const requestedMode = new URLSearchParams(window.location.search).get("map") as MapMode | null;
    if (requestedMode && ["streets", "list"].includes(requestedMode)) setMode(requestedMode);
  }, []);

  useEffect(() => {
    if (candidateDisplay === "verification") setStatus("");
    else setPrivateWorkflowStatus("");
    setSelectedId(null);
    setDetailId(null);
  }, [candidateDisplay]);

  useEffect(() => {
    onCandidateSummary?.(candidateSummary);
  }, [candidateSummary, onCandidateSummary]);

  useEffect(() => {
    onLegacyVerificationFacilities?.(legacyVerificationFacilities);
  }, [legacyVerificationFacilities, onLegacyVerificationFacilities]);

  useEffect(() => {
    onVerificationMapFacilities?.(verificationMapFacilities);
  }, [onVerificationMapFacilities, verificationMapFacilities]);

  const statusIndependentWithoutDepartment = useMemo(() => facilities.filter((facility) => {
    const haystack = normalize(`${facility.name} ${facility.address} ${facility.locality} ${facility.department} ${facility.statusShort} ${facility.sourceLabel}`);
    return matchesSourceCategory(facility, sourceCategory)
      && (!privateWorkflowStatus || facility.privateCandidateStatus === privateWorkflowStatus)
      && (!query || haystack.includes(normalize(query)));
  }), [facilities, privateWorkflowStatus, query, sourceCategory]);

  const baseWithoutDepartment = useMemo(
    () => statusIndependentWithoutDepartment.filter(
      (facility) => !status || matchesAdministrativeStatus(facility, status),
    ),
    [statusIndependentWithoutDepartment, status],
  );
  const visible = useMemo(() => baseWithoutDepartment.filter((facility) => !department || canonicalDepartment(facility.department) === department), [baseWithoutDepartment, department]);
  const departmentCounts = useMemo(() => Object.entries(baseWithoutDepartment.reduce<Record<string, number>>((counts, facility) => {
    const canonical = canonicalDepartment(facility.department);
    if (canonical) counts[canonical] = (counts[canonical] ?? 0) + 1;
    return counts;
  }, {})).sort(([a], [b]) => a.localeCompare(b, "es")), [baseWithoutDepartment]);
  const selected = selectedId ? (visible.find((facility) => facility.id === selectedId) ?? null) : null;
  const detailedFacility = detailId
    ? (consolidatedFacilities.find((facility) => facility.id === detailId) ?? null)
    : null;
  const summaryKpiScope = useMemo(() => consolidatedFacilities.filter((facility) => {
    const haystack = normalize(`${facility.name} ${facility.address} ${facility.locality} ${facility.department} ${facility.statusShort} ${facility.sourceLabel}`);
    return matchesSourceCategory(facility, sourceCategory)
      && (!query || haystack.includes(normalize(query)))
      && (!department || canonicalDepartment(facility.department) === department);
  }), [consolidatedFacilities, department, query, sourceCategory]);
  const summaryTotals = useMemo(() => ({
    habilitado: summaryKpiScope.filter((facility) => facility.mspFinal).length,
    registro: summaryKpiScope.filter((facility) => facility.mspRegistroHistorico).length,
    mides: summaryKpiScope.filter((facility) => facility.midesSocial).length,
  }), [summaryKpiScope]);
  const visibleOfficialCount = visible.filter((facility) => !isVerificationFacility(facility)).length;
  const visibleVerificationCount = visible.filter(isVerificationFacility).length;
  useEffect(() => {
    if (selectedId && !visible.some((facility) => facility.id === selectedId)) {
      setSelectedId(null);
    }
  }, [visible, selectedId]);

  const orderedResults = visible;

  function resetFilters() {
    setQuery(""); setDepartment(""); setStatus(""); setSourceCategory(""); setPrivateWorkflowStatus("");
    setSelectedId(null);
    setDetailId(null);
  }

  return <>
    <section className="card registryIntro">
      <div className="registryIntroCopy">
        <h1>Encontrá un residencial</h1>
        <p className="lead">Buscá por nombre o ubicación y consultá su situación administrativa.</p>
      </div>
      {loading && <div className="notice registryDataStatus" role="status">Cargando residenciales…</div>}
      {error && <div className="notice registryDataStatus registryDataError" role="alert">{error}</div>}
      {candidateDisplay !== "public" && privateCandidatesAvailable && privateCandidatesLoading && <div className="notice registryDataStatus" role="status">Actualizando residenciales a verificar…</div>}
      {candidateDisplay !== "public" && privateCandidatesAvailable && privateCandidatesError && <div className="notice registryDataStatus registryDataError" role="alert">{privateCandidatesError}</div>}
      <div className={`registryQuickSummary ${onShowVerification ? "hasVerificationKpi" : ""}`} aria-label="Resumen y filtros rápidos">
        <RegistryKpi activeHelp={activeKpiHelp} className={`statCard-blue ${candidateDisplay !== "verification" && !status ? "selected" : ""}`} help="Total de residenciales de la vista." helpId="all" label="Todos" onActivate={() => { if (candidateDisplay === "verification") onShowAll?.(); setStatus(""); }} onToggleHelp={setActiveKpiHelp} value={summaryKpiScope.length} />
        <RegistryKpi activeHelp={activeKpiHelp} className={`statCard-green ${candidateDisplay !== "verification" && status === "habilitado" ? "selected" : ""}`} help="Con habilitación final vigente del MSP." helpId="msp-final" label="Habilitación final MSP" onActivate={() => { if (candidateDisplay === "verification") onShowAll?.(); setStatus(status === "habilitado" ? "" : "habilitado"); }} onToggleHelp={setActiveKpiHelp} value={summaryTotals.habilitado} />
        <RegistryKpi activeHelp={activeKpiHelp} className={`statCard-registry-yellow ${candidateDisplay !== "verification" && status === "registro" ? "selected" : ""}`} help="Incluidos en el registro histórico del MSP." helpId="msp-registry" label="Registro histórico MSP" onActivate={() => { if (candidateDisplay === "verification") onShowAll?.(); setStatus(status === "registro" ? "" : "registro"); }} onToggleHelp={setActiveKpiHelp} value={summaryTotals.registro} />
        <RegistryKpi activeHelp={activeKpiHelp} className={`statCard-cyan ${candidateDisplay !== "verification" && status === "mides" ? "selected" : ""}`} help="Con Certificado Social emitido por MIDES." helpId="mides" label="Certificado Social MIDES" onActivate={() => { if (candidateDisplay === "verification") onShowAll?.(); setStatus(status === "mides" ? "" : "mides"); }} onToggleHelp={setActiveKpiHelp} value={summaryTotals.mides} />
        {onShowVerification && <RegistryKpi activeHelp={activeKpiHelp} className={`statCard-red ${candidateDisplay === "verification" ? "selected" : ""}`} help="Sin respaldo oficial; requieren revisión." helpId="verification" label="A verificar" onActivate={onShowVerification} onToggleHelp={setActiveKpiHelp} value={summaryKpiScope.filter(isVerificationFacility).length} />}
      </div>
      <p className="registryOverlapNote">
        Las acreditaciones se cuentan por separado: <strong>un mismo residencial puede
        figurar en más de una lista</strong>. Los candidatos del piloto no son una acreditación.
      </p>
      <div className="registrySearchFirst">
        <label className="searchField">
          <b>¿Qué residencial estás buscando?</b>
          <div className="registrySearchBox"><Search size={26}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Escribí un nombre, una calle o una localidad"/></div>
        </label>
      </div>
    </section>

    <div className={`registryMapLayout ${mode === "list" ? "mapListOnly" : ""}`}>
      <aside className="card registryFiltersPanel" aria-label="Filtros del mapa">
        <div className="registryFiltersHeading">
          <div><span>Filtrar resultados</span><small>Elegí una o más opciones</small></div>
          <button
            type="button"
            className="registryClearFilters"
            disabled={!(query || department || status || sourceCategory || privateWorkflowStatus || selectedId)}
            aria-label="Restablecer filtros y mapa"
            title="Restablecer filtros y mapa"
            onClick={resetFilters}
          ><RotateCcw size={17}/></button>
        </div>
        <div className="registryToolbar">
        {filterControl}
        <label><b>Departamento</b><select value={department} onChange={(event) => setDepartment(event.target.value)}><option value="">Todos</option>{departmentCounts.map(([name]) => <option key={name}>{name}</option>)}</select></label>
        {candidateDisplay === "verification" ? <label><b>Estado de tratamiento</b><select value={privateWorkflowStatus} onChange={(event) => setPrivateWorkflowStatus(event.target.value as PrivateWorkflowStatus)}><option value="">Todos</option><option value="needs_review">Necesita revisión</option><option value="possible_match">Posible coincidencia</option><option value="verified_new">Nuevo verificado</option></select></label> : <label><b>Situación administrativa</b><select value={status} onChange={(event) => {
          const nextStatus = event.target.value as "" | FacilityStatus;
          setStatus(nextStatus);
        }}><option value="">Todas</option><option value="habilitado">Habilitación final MSP</option><option value="registro">Certificado de registro MSP (histórico)</option><option value="mides">Certificado Social MIDES</option></select></label>}
          <label><b>Fuente de hallazgo</b><select value={sourceCategory} onChange={(event) => setSourceCategory(event.target.value as SourceCategoryFilter)}><option value="">Todas</option><option value="official">Fuentes oficiales</option><option value="public_maps">Mapas públicos</option><option value="social_public">Fuentes públicas de redes sociales</option><option value="other_public">Webs y directorios públicos</option></select></label>
        </div>
        <div className="mapModes"><strong>Vista</strong><button className={mode === "streets" ? "active" : ""} onClick={() => setMode("streets")}><MapPinned size={18}/> Mapa</button><button className={mode === "list" ? "active" : ""} onClick={() => setMode("list")}><Building2 size={18}/> Lista</button></div>
      </aside>
      {mode !== "list" && <div className="registryMapColumn" ref={mapColumnRef}>
        <StreetMap facilities={visible} selectedId={selected?.id ?? null} onSelect={setSelectedId}/>
        {detailedFacility && <FacilityMapDialog facility={detailedFacility} onClose={() => setDetailId(null)} />}
      </div>}

      <aside className="card registryResults">
        <div className="resultsHead"><h2>Residenciales encontrados</h2><output className="resultCount">{visible.length}</output></div>
        <p className="resultsMeta">{visibleOfficialCount} con respaldo oficial{visibleVerificationCount > 0 ? ` + ${visibleVerificationCount} a verificar` : ""}</p>
        <div className="registryResultsScroll">
          {orderedResults.map((facility) => (
            <FacilityAccordionCard
              facility={facility}
              isSelected={selected?.id === facility.id}
              onSelect={setSelectedId}
              onViewMore={(selectedFacility) => {
                setSelectedId(selectedFacility.id);
                setDetailId(selectedFacility.id);
                setMode("streets");
                window.requestAnimationFrame(() => mapColumnRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
              }}
              key={facility.id}
            />
          ))}
        </div>
      </aside>
    </div>
  </>;
}

type RegistryKpiProps = {
  activeHelp: string | null;
  className: string;
  help: string;
  helpId: string;
  label: string;
  onActivate: () => void;
  onToggleHelp: (id: string | null) => void;
  value: number;
};

function RegistryKpi({ activeHelp, className, help, helpId, label, onActivate, onToggleHelp, value }: RegistryKpiProps) {
  const helpVisible = activeHelp === helpId;
  return <div className={`stat ${className}`}>
    <button type="button" className="registryKpiAction" onClick={onActivate}>
      <b>{value}</b>
      <p>{label}</p>
    </button>
    <button
      type="button"
      className="registryKpiHelp"
      aria-expanded={helpVisible}
      aria-label={`Explicar ${label}`}
      onClick={() => onToggleHelp(helpVisible ? null : helpId)}
    >?</button>
    {helpVisible && <span className="registryKpiTooltip" role="status">{help}</span>}
  </div>;
}

function badgeTone(facility: Facility) {
  const category = facilityDisplayCategory(facility);
  if (category === "habilitado") return "green";
  if (category === "registro") return "amber";
  if (category === "mides") return "cyan";
  return "red";
}

function FacilityPrimaryBadge({ facility }: { facility: Facility }) {
  return <span className="facilityBadges" aria-label="Situación principal">
    <span className={`sourceBadge sourceBadge-${badgeTone(facility)}`}>{facilityDisplayLabel(facility)}</span>
  </span>;
}

function FacilityMembershipBadges({ facility }: { facility: Facility }) {
  if (isVerificationFacility(facility)) return <FacilityPrimaryBadge facility={facility} />;
  const badges = [
    facility.mspFinal && {
      label: "Habilitación final MSP",
      tone: "green",
    },
    facility.mspRegistroHistorico && {
      label: "Registro histórico MSP",
      tone: "amber",
    },
    facility.midesSocial && {
      label: "Certificado Social MIDES",
      tone: "cyan",
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
  onViewMore,
}: {
  facility: Facility;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onViewMore: (facility: Facility) => void;
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
    <article ref={cardRef} className={`facilityCard facility-${facilityDisplayCategory(facility)} ${isOpen ? "isOpen" : ""} ${isSelected ? "selected" : ""}`}>
      <button type="button" className="facilityAccordionHeader" onClick={toggle} aria-expanded={isOpen}>
        <div className="facilityAccordionTitle">
          <strong>{facility.name}</strong>
          <span className="facilityLocation">{facility.locality} · {canonicalDepartment(facility.department)}</span>
          <FacilityMembershipBadges facility={facility} />
        </div>
        <span className="facilityAccordionChevron">
          {isOpen ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
        </span>
      </button>

      {isOpen && (
        <div className="facilityAccordionBody">
          {facility.address && <p className="facilityAddress"><strong>Dirección:</strong> {facility.address}</p>}
          {sourceCategoryLabels(facility).length > 0 && <p className="facilityDetailFact"><strong>Fuente de hallazgo:</strong> {sourceCategoryLabels(facility).join(" · ")}</p>}
          <div className="facilityAccordionActions">
            <button type="button" className="reportContinue facilityViewMoreBtn" onClick={() => onViewMore(facility)}>Ver más</button>
          </div>
        </div>
      )}
    </article>
  );
}

function FacilityMapDialog({ facility, onClose }: { facility: Facility; onClose: () => void }) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const sources = sourceCategoryLabels(facility);
  const formatDate = (value?: string) => {
    if (!value) return "Sin fecha registrada";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString("es-UY");
  };
  return <section className="facilityMapDialog" role="dialog" aria-modal="false" aria-labelledby="facility-map-dialog-title">
    <div className="facilityMapDialogHeader">
      <div>
        <span>Información del residencial</span>
        <h2 id="facility-map-dialog-title">{facility.name}</h2>
        <p>{facility.locality} · {canonicalDepartment(facility.department)}</p>
      </div>
      <button type="button" onClick={onClose}><X size={18}/> Cerrar</button>
    </div>
    <FacilityMembershipBadges facility={facility} />
    <dl className="facilityMapDialogFacts">
      <div><dt>Identificador</dt><dd>{facility.id}</dd></div>
      <div><dt>Dirección</dt><dd>{facility.address || "Sin dirección informada"}</dd></div>
      <div><dt>Departamento</dt><dd>{canonicalDepartment(facility.department)}</dd></div>
      <div><dt>Localidad</dt><dd>{facility.locality || "Sin localidad informada"}</dd></div>
      <div><dt>Capacidad</dt><dd>{facility.places != null ? `${facility.places} plazas` : "Sin dato"}</dd></div>
      <div><dt>Situación principal</dt><dd>{facilityDisplayLabel(facility)}</dd></div>
      <div><dt>Etapa registrada</dt><dd>{facility.statusStage || "Sin detalle"}</dd></div>
      <div><dt>Resumen registrado</dt><dd>{facility.statusShort || "Sin detalle"}</dd></div>
      <div><dt>Fuente de hallazgo</dt><dd>{sources.length ? sources.join(" · ") : "Sin clasificación"}</dd></div>
      <div><dt>Fuente registrada</dt><dd>{facility.sourceLabel || "Sin detalle"}</dd></div>
      <div><dt>Ubicación registrada</dt><dd>{facility.precisionLabel || "Sin detalle"}</dd></div>
      <div><dt>Coordenadas</dt><dd>{facility.lat}, {facility.lng}</dd></div>
      <div><dt>Registro PACP</dt><dd>{facility.pacp ? "Sí" : "No"}</dd></div>
      <div><dt>Otra fuente registrada</dt><dd>{facility.otherSource ? "Sí" : "No"}</dd></div>
      <div><dt>Hallazgo de la aplicación</dt><dd>{facility.appDiscovered ? "Sí" : "No"}</dd></div>
      <div><dt>Creado en la base</dt><dd>{formatDate(facility.createdAt)}</dd></div>
      <div><dt>Última actualización</dt><dd>{formatDate(facility.updatedAt)}</dd></div>
      {facility.privateCandidate && <>
        <div><dt>Nivel de evidencia</dt><dd>{facility.privateCandidateEvidenceTier || "C"} · {evidenceDescription(facility.privateCandidateEvidenceTier)}</dd></div>
        <div><dt>Estado de revisión</dt><dd>{facility.privateCandidateStatus || "Sin estado registrado"}</dd></div>
        <div><dt>Fecha de consulta</dt><dd>{facility.privateCandidateRetrievedAt || "Sin fecha registrada"}</dd></div>
        <div><dt>Referencia pública</dt><dd>{facility.privateCandidateSourceUrl
          ? <a href={facility.privateCandidateSourceUrl} target="_blank" rel="noopener noreferrer">{facility.privateCandidateSourceUrl}</a>
          : "Sin enlace registrado"}</dd></div>
      </>}
    </dl>
  </section>;
}
