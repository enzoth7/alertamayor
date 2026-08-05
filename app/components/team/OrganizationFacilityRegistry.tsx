"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CandidateSourceCategory,
  PrivateCandidateSummary,
  PrivateQueueCandidate,
} from "../../hooks/usePrivateCandidateMapLayer";
import { canonicalDepartment } from "../facility-presentation";
import type { Facility } from "../map-types";
import UruguayRegistry from "../UruguayRegistry";
import { TeamFacilityCandidateQueue } from "./TeamFacilityCandidateQueue";
import "./OrganizationFacilityRegistry.css";

export type OrganizationRegistryView = "all" | "public" | "verification";

const EMPTY_CANDIDATE_SUMMARY: PrivateCandidateSummary = {
  total: 0,
  needsReview: 0,
  possibleMatch: 0,
  verifiedNew: 0,
  otherStatuses: 0,
  mappedFromDatabase: 0,
  mappedFromManualSources: 0,
  visibleOnMap: 0,
  unlocatedCandidates: [],
  queueCandidates: [],
};

function OrganizationRegistryViewFilter({
  value,
  onChange,
}: {
  value: OrganizationRegistryView;
  onChange: (value: OrganizationRegistryView) => void;
}) {
  return (
    <label className="organizationRegistryViewFilter">
      <b>Vista</b>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as OrganizationRegistryView)}
        aria-label="Vista de residenciales"
      >
        <option value="all">Todos</option>
        <option value="public">Públicos</option>
        <option value="verification">A verificar</option>
      </select>
    </label>
  );
}

export function OrganizationFacilityRegistry() {
  const [registryView, setRegistryView] = useState<OrganizationRegistryView>("all");
  const [candidateSummary, setCandidateSummary] = useState<PrivateCandidateSummary>(EMPTY_CANDIDATE_SUMMARY);
  const [legacyVerificationFacilities, setLegacyVerificationFacilities] = useState<Facility[]>([]);
  const [verificationMapFacilities, setVerificationMapFacilities] = useState<Facility[]>([]);
  const updateCandidateSummary = useCallback((summary: PrivateCandidateSummary) => {
    setCandidateSummary(summary);
  }, []);
  const viewFilter = (
    <OrganizationRegistryViewFilter value={registryView} onChange={setRegistryView} />
  );

  return (
    <section className="organizationRegistryWorkspace">
      <UruguayRegistry
        candidateDisplay={registryView}
        filterControl={viewFilter}
        onShowAll={() => setRegistryView("all")}
        onShowVerification={() => setRegistryView("verification")}
        onCandidateSummary={updateCandidateSummary}
        onLegacyVerificationFacilities={setLegacyVerificationFacilities}
        onVerificationMapFacilities={setVerificationMapFacilities}
      />
      {registryView !== "public" && (candidateSummary.total > 0 || legacyVerificationFacilities.length > 0) && (
        <CandidateInventorySummary
          legacyFacilities={legacyVerificationFacilities}
          summary={candidateSummary}
          verificationMapFacilities={verificationMapFacilities}
        />
      )}
      {registryView === "verification" && <TeamFacilityCandidateQueue hideMap embedded />}
    </section>
  );
}

function CandidateInventorySummary({
  legacyFacilities,
  summary,
  verificationMapFacilities,
}: {
  legacyFacilities: Facility[];
  summary: PrivateCandidateSummary;
  verificationMapFacilities: Facility[];
}) {
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [source, setSource] = useState<"" | CandidateSourceCategory>("");
  const [coordinates, setCoordinates] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<PrivateQueueCandidate | null>(null);

  const inventoryCandidates = useMemo<PrivateQueueCandidate[]>(() => {
    const verificationMapIds = new Set(verificationMapFacilities.map((facility) => facility.id));
    const consolidatedQueueCandidates = summary.queueCandidates.filter((candidate) => {
      if (!candidate.hasCoordinates) return true;
      const databaseId = typeof candidate.details.id === "string" ? `candidate:${candidate.details.id}` : "";
      return (databaseId && verificationMapIds.has(databaseId))
        || verificationMapIds.has(`manual:${candidate.candidateKey}`);
    });

    const representedMapIds = new Set<string>();
    for (const candidate of consolidatedQueueCandidates) {
      const databaseId = typeof candidate.details.id === "string" ? `candidate:${candidate.details.id}` : "";
      if (databaseId && verificationMapIds.has(databaseId)) representedMapIds.add(databaseId);
      const manualId = `manual:${candidate.candidateKey}`;
      if (verificationMapIds.has(manualId)) representedMapIds.add(manualId);
    }
    for (const facility of legacyFacilities) representedMapIds.add(facility.id);

    const mapOnlyCandidates: PrivateQueueCandidate[] = verificationMapFacilities
      .filter((facility) => !representedMapIds.has(facility.id))
      .map((facility) => ({
        candidateKey: `map:${facility.id}`,
        name: facility.name,
        department: canonicalDepartment(facility.department),
        locality: facility.locality,
        address: facility.address,
        status: facility.privateCandidateStatus || "needs_review",
        evidenceTier: facility.privateCandidateEvidenceTier || "C",
        humanReviewed: false,
        hasCoordinates: true,
        sourceCategories: facility.sourceCategories || ["other_public"],
        pendingImport: true,
        details: { ...facility, recordType: "consolidated_map_facility" },
      }));

    return [
      ...consolidatedQueueCandidates.map((candidate) => ({
        ...candidate,
        department: canonicalDepartment(candidate.department),
      })),
      ...legacyFacilities.map((facility) => ({
      candidateKey: `legacy:${facility.id}`,
      name: facility.name,
      department: canonicalDepartment(facility.department),
      locality: facility.locality,
      address: facility.address,
      status: "needs_review",
      evidenceTier: "C" as const,
      humanReviewed: false,
      hasCoordinates: true,
      sourceCategories: facility.sourceCategories || ["other_public"],
      pendingImport: false,
      details: { ...facility, recordType: "legacy_verification_facility" },
      })),
      ...mapOnlyCandidates,
    ];
  }, [legacyFacilities, summary.queueCandidates, verificationMapFacilities]);

  const departments = useMemo(() => [...new Set(
    inventoryCandidates.map((candidate) => canonicalDepartment(candidate.department)).filter(Boolean),
  )].sort((left, right) => left.localeCompare(right, "es")), [inventoryCandidates]);

  const filteredCandidates = useMemo(() => {
    const normalizedQuery = normalize(query);
    return inventoryCandidates.filter((candidate) => {
      const haystack = normalize(`${candidate.name} ${candidate.address || ""} ${candidate.locality} ${candidate.department}`);
      const matchesCoordinates = !coordinates
        || (coordinates === "mapped" ? candidate.hasCoordinates : !candidate.hasCoordinates);
      return (!normalizedQuery || haystack.includes(normalizedQuery))
        && (!department || canonicalDepartment(candidate.department) === department)
        && (!source || candidate.sourceCategories.includes(source))
        && matchesCoordinates;
    });
  }, [coordinates, department, inventoryCandidates, query, source]);

  const totalVerificationCount = inventoryCandidates.length;
  const visibleMapCount = inventoryCandidates.filter((candidate) => candidate.hasCoordinates).length;
  const unclearCoordinatesCount = Math.max(0, totalVerificationCount - visibleMapCount);

  return (
    <section className="candidateInventorySummary" aria-labelledby="candidate-inventory-title">
      <header className="candidateInventoryHeading">
        <h2 id="candidate-inventory-title">Todas las residencias a verificar</h2>
      </header>

      <div className="candidateInventoryPrimaryKpis" aria-label="Resumen de residenciales a verificar">
        <article className="candidateInventoryPrimaryKpi isTotal">
          <strong>{totalVerificationCount}</strong>
          <span>A verificar</span>
        </article>
        <article className="candidateInventoryPrimaryKpi isMapped">
          <strong>{visibleMapCount}</strong>
          <span>Visibles en el mapa</span>
        </article>
        <article className="candidateInventoryPrimaryKpi isUnmapped">
          <strong>{unclearCoordinatesCount}</strong>
          <span>Sin coordenadas claras</span>
        </article>
      </div>

      <section className="candidateInventoryListSection" aria-label="Buscador de residencias a verificar">
        <div className="candidateInventoryFilters" aria-label="Filtros de residenciales a verificar">
          <label className="candidateInventorySearch">
            <b>Buscar</b>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre, dirección o localidad" />
          </label>
          <label>
            <b>Departamento</b>
            <select value={department} onChange={(event) => setDepartment(event.target.value)}>
              <option value="">Todos</option>
              {departments.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
          <label>
            <b>Fuente</b>
            <select value={source} onChange={(event) => setSource(event.target.value as "" | CandidateSourceCategory)}>
              <option value="">Todas</option>
              <option value="official">Fuentes oficiales</option>
              <option value="public_maps">Mapas públicos</option>
              <option value="social_public">Redes sociales públicas</option>
              <option value="other_public">Webs y directorios públicos</option>
            </select>
          </label>
          <label>
            <b>Coordenadas</b>
            <select value={coordinates} onChange={(event) => setCoordinates(event.target.value)}>
              <option value="">Todos: con coordenadas o sin coordenadas</option>
              <option value="mapped">Con coordenadas</option>
              <option value="unmapped">Sin coordenadas</option>
            </select>
          </label>
        </div>

        <div className="candidateInventoryList">
          {filteredCandidates.map((candidate) => (
            <CandidateInventoryRow
              candidate={candidate}
              key={`${candidate.pendingImport ? "pending" : "queue"}:${candidate.candidateKey}`}
              onViewMore={setSelectedCandidate}
            />
          ))}
          {filteredCandidates.length === 0 && (
            <p className="candidateInventoryEmpty">No hay residenciales que coincidan con esos filtros.</p>
          )}
        </div>
      </section>

      {selectedCandidate && (
        <CandidateInventoryDialog candidate={selectedCandidate} onClose={() => setSelectedCandidate(null)} />
      )}
    </section>
  );
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-UY");
}

const SOURCE_LABELS: Record<CandidateSourceCategory, string> = {
  official: "Fuente oficial",
  public_maps: "Mapas públicos",
  social_public: "Redes sociales públicas",
  other_public: "Webs y directorios públicos",
};

const STATUS_LABELS: Record<string, string> = {
  needs_review: "Necesita revisión",
  possible_match: "Posible coincidencia",
  verified_new: "Nuevo verificado",
};

function CandidateInventoryRow({
  candidate,
  onViewMore,
}: {
  candidate: PrivateQueueCandidate;
  onViewMore: (candidate: PrivateQueueCandidate) => void;
}) {
  const statusLabel = candidate.pendingImport
    ? "Pendiente de incorporar"
    : STATUS_LABELS[candidate.status] || candidate.status || "Sin estado";
  return (
    <article className="candidateInventoryRow">
      <div className="candidateInventoryRowCopy">
        <strong>{candidate.name}</strong>
        <span>{candidate.address || "Sin dirección informada"}</span>
        <small>{candidate.locality} · {candidate.department}</small>
      </div>
      <div className="candidateInventoryBadges">
        <span className={`candidateInventoryBadge candidateInventoryBadge-status candidateInventoryBadge-${candidate.pendingImport ? "pending" : candidate.status}`}>{statusLabel}</span>
        <span className="candidateInventoryBadge">Evidencia {candidate.evidenceTier}</span>
        {candidate.sourceCategories.map((category) => (
          <span className={`candidateInventoryBadge candidateInventoryBadge-source-${category}`} key={category}>{SOURCE_LABELS[category]}</span>
        ))}
        <span className={`candidateInventoryBadge ${candidate.hasCoordinates ? "candidateInventoryBadge-mapped" : "candidateInventoryBadge-unmapped"}`}>
          {candidate.hasCoordinates ? "Con coordenadas" : "Sin coordenadas"}
        </span>
      </div>
      <button className="candidateInventoryViewMore" type="button" onClick={() => onViewMore(candidate)}>
        Ver más
      </button>
    </article>
  );
}

function CandidateInventoryDialog({
  candidate,
  onClose,
}: {
  candidate: PrivateQueueCandidate;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const detailEntries = Object.entries(candidate.details)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .sort(([left], [right]) => left.localeCompare(right, "es"));

  return (
    <div className="candidateDetailBackdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="candidate-detail-title"
        aria-modal="true"
        className="candidateDetailDialog"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header>
          <div>
            <span>Información completa del registro</span>
            <h2 id="candidate-detail-title">{candidate.name}</h2>
            <p>{candidate.locality} · {candidate.department}</p>
          </div>
          <button aria-label="Cerrar detalle" className="candidateDetailClose" onClick={onClose} type="button">×</button>
        </header>

        <div className="candidateDetailOverview">
          <DetailItem label="Dirección" value={candidate.address || "Sin dirección informada"} />
          <DetailItem label="Coordenadas" value={candidate.hasCoordinates ? coordinateText(candidate.details) : "Sin coordenadas claras"} />
          <DetailItem label="Estado" value={STATUS_LABELS[candidate.status] || candidate.status || "Sin estado"} />
          <DetailItem label="Evidencia" value={`Nivel ${candidate.evidenceTier}`} />
          <DetailItem label="Fuentes" value={candidate.sourceCategories.map((category) => SOURCE_LABELS[category]).join(", ")} />
          <DetailItem label="Revisión humana" value={candidate.humanReviewed ? "Sí" : "No"} />
        </div>

        <section className="candidateDetailDatabase">
          <h3>Todos los datos disponibles en la base</h3>
          <dl>
            {detailEntries.map(([key, value]) => (
              <div key={key}>
                <dt>{formatDetailLabel(key)}</dt>
                <dd><DetailValue value={value} /></dd>
              </div>
            ))}
          </dl>
        </section>
      </section>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

function coordinateText(details: Record<string, unknown>) {
  const latitude = details.latitude ?? details.lat;
  const longitude = details.longitude ?? details.lng;
  return latitude !== undefined && longitude !== undefined
    ? `${String(latitude)}, ${String(longitude)}`
    : "Coordenadas disponibles";
}

function formatDetailLabel(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (letter) => letter.toLocaleUpperCase("es-UY"));
}

function DetailValue({ value }: { value: unknown }) {
  if (typeof value === "boolean") return <>{value ? "Sí" : "No"}</>;
  if (typeof value === "string" && /^https?:\/\//i.test(value)) {
    return <a href={value} rel="noreferrer" target="_blank">{value}</a>;
  }
  if (Array.isArray(value) || (typeof value === "object" && value !== null)) {
    return <pre>{JSON.stringify(value, null, 2)}</pre>;
  }
  return <>{String(value)}</>;
}
