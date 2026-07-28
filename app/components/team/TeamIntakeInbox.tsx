"use client";

import { AlertTriangle, CheckCircle2, Inbox, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type ReportPayload = Record<string, unknown>;

type IntakeReport = {
  id: string;
  case_code: string;
  priority: string;
  department: string | null;
  report_payload: ReportPayload;
  created_at: string;
};

function record(value: unknown): ReportPayload {
  return value && typeof value === "object" && !Array.isArray(value) ? value as ReportPayload : {};
}

function value(payload: ReportPayload, key: string, fallback = "No indicado"): string {
  return typeof payload[key] === "string" && payload[key].trim() ? payload[key].trim() : fallback;
}

function values(payload: ReportPayload, key: string): string[] {
  return Array.isArray(payload[key]) ? payload[key].filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [];
}

function reportPlace(report: IntakeReport): string {
  const location = record(report.report_payload.location);
  const facility = record(report.report_payload.facility);
  const facilityName = value(facility, "name", "");
  const reference = value(location, "reference", "");
  return facilityName || reference || report.department || "No indicado";
}

function dateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Fecha no disponible" : new Intl.DateTimeFormat("es-UY", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function TeamIntakeInbox() {
  const [reports, setReports] = useState<IntakeReport[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/team/intake-reports", { cache: "no-store" });
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok || !data || typeof data !== "object" || !("reports" in data) || !Array.isArray(data.reports)) {
        const message = data && typeof data === "object" && "error" in data && typeof data.error === "string" ? data.error : "No se pudieron cargar las comunicaciones.";
        throw new Error(message);
      }

      const nextReports = data.reports as IntakeReport[];
      setReports(nextReports);
      setSelectedId((current) => nextReports.some((report) => report.id === current) ? current : (nextReports[0]?.id || ""));
    } catch (error) {
      setError(error instanceof Error ? error.message : "No se pudieron cargar las comunicaciones.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const selected = reports.find((report) => report.id === selectedId) || null;

  return <section className="teamInbox">
    <header className="teamInboxHeader">
      <div><div className="eyebrow">Bandeja de entradas</div><h1>Comunicaciones recibidas</h1><p>Lo que una persona envía desde “Comunicar” llega acá como un registro pendiente de revisión.</p></div>
      <button className="teamGhostButton" type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={17} className={loading ? "teamInboxSpin" : ""}/> Actualizar</button>
    </header>

    {error && <div className="teamInboxError" role="alert"><AlertTriangle size={20}/><span>{error}</span></div>}
    {loading && <div className="teamInboxLoading">Cargando comunicaciones…</div>}
    {!loading && !error && !reports.length && <div className="teamInboxEmpty"><Inbox size={30}/><strong>Todavía no hay comunicaciones.</strong><span>Cuando una persona complete el formulario, aparecerá aquí.</span></div>}

    {!loading && !error && reports.length > 0 && <div className="teamInboxLayout">
      <div className="teamInboxList" aria-label="Comunicaciones recibidas">{reports.map((report) => {
        const payload = record(report.report_payload);
        const isSelected = report.id === selectedId;
        return <button key={report.id} type="button" className={`teamInboxItem ${isSelected ? "isSelected" : ""}`} onClick={() => setSelectedId(report.id)}>
          <span className={`teamInboxPriority priority${report.priority}`}>{report.priority}</span>
          <strong>{report.case_code}</strong>
          <small>{value(payload, "setting")} · {reportPlace(report)}</small>
          <time>{dateTime(report.created_at)}</time>
        </button>;
      })}</div>

      {selected && <article className="teamInboxDetail">
        <div className="teamInboxDetailHeading"><div><span className={`teamInboxPriority priority${selected.priority}`}>{selected.priority}</span><h2>{selected.case_code}</h2><p>Recibida {dateTime(selected.created_at)}</p></div><CheckCircle2 size={25}/></div>
        <div className="teamInboxFacts">
          <div><strong>Ámbito</strong><span>{value(selected.report_payload, "setting")}</span></div>
          <div><strong>Quién comunica</strong><span>{value(selected.report_payload, "reporter")}</span></div>
          <div><strong>Lugar</strong><span>{reportPlace(selected)}</span></div>
          <div><strong>Privacidad</strong><span>{value(selected.report_payload, "privacy")}</span></div>
          <div><strong>Contacto seguro</strong><span>{value(selected.report_payload, "safeContact", value(selected.report_payload, "contactMethod"))}</span></div>
          <div><strong>No contactar primero</strong><span>{selected.report_payload.noEarlyContact === true ? "Sí" : "No indicado"}</span></div>
        </div>
        <section className="teamInboxNarrative"><strong>Lo comunicado</strong><p>{value(selected.report_payload, "narrative")}</p></section>
        <section className="teamInboxNarrative"><strong>Preocupaciones seleccionadas</strong><p>{values(selected.report_payload, "concerns").join(" · ") || "No indicadas"}</p></section>
        <details className="teamInboxJson"><summary>Ver JSON recibido</summary><pre>{JSON.stringify(selected.report_payload, null, 2)}</pre></details>
      </article>}
    </div>}
  </section>;
}
