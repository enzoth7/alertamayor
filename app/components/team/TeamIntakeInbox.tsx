"use client";

import { AlertTriangle, CheckCircle2, ClipboardCheck, FileText, History, Inbox, Mail, Paperclip, Phone, RefreshCw, Save, ShieldCheck, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type ReportPayload = Record<string, unknown>;
type ReviewKey = "emergency" | "safe" | "duplicate" | "wishes" | "scope";

type IntakeReport = {
  id: string;
  case_code: string;
  priority: string;
  department: string | null;
  report_payload: ReportPayload;
  created_at: string;
  current_status: string;
  updated_at: string;
  events: IntakeEvent[];
  attachments: IntakeAttachment[];
};

type IntakeEvent = {
  id: string;
  status: string;
  public_title: string;
  public_description: string;
  internal_note: string | null;
  event_data: ReportPayload;
  actor: string;
  created_at: string;
};

type IntakeAttachment = {
  id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
};

type IntakeReview = {
  checks: Record<ReviewKey, boolean>;
  urgency: string;
  route: string;
  referral: string;
  note: string;
  saved: boolean;
};

const reviewChecks: [ReviewKey, string, string][] = [
  ["emergency", "Se revisó si existe peligro inmediato", "revisar si existe peligro inmediato"],
  ["safe", "Se registró una forma de contacto seguro", "confirmar una forma de contacto seguro"],
  ["duplicate", "Se buscaron entradas o casos relacionados", "buscar entradas o casos relacionados"],
  ["wishes", "Se registró la voluntad de la persona o la posibilidad de contactarla", "registrar la voluntad de la persona o la posibilidad de contactarla"],
  ["scope", "La situación está dentro del alcance del servicio", "confirmar si la situación está dentro del alcance del servicio"],
];

const urgencyOptions = ["Crítica", "Alta", "Media", "Baja", "Por evaluar"];
const routeOptions = [
  "Equipo especializado / Inmayores",
  "Salud",
  "Sistema de Cuidados",
  "MSP · ELEPEM",
  "Policía / Fiscalía",
  "Bomberos",
  "Orientación sin apertura de caso",
];
const referralOptions = [
  "Servicio correspondiente por definir",
  "Policía / Fiscalía",
  "Servicio de salud / MSP",
  "MIDES / Inmujeres / Inmayores",
  "Sistema Nacional Integrado de Cuidados",
  "Gobierno departamental / servicio local",
  "Otro organismo",
];

function initialReview(priority: string): IntakeReview {
  return {
    checks: { emergency: false, safe: false, duplicate: false, wishes: false, scope: false },
    urgency: urgencyOptions.includes(priority) ? priority : "Por evaluar",
    route: "Equipo especializado / Inmayores",
    referral: referralOptions[0],
    note: "",
    saved: false,
  };
}

function reviewFromReport(report: IntakeReport): IntakeReview {
  const base = initialReview(report.priority);
  const latest = [...(Array.isArray(report.events) ? report.events : [])].reverse().find((event) => event.actor === "organization");
  if (!latest) return base;
  const data = record(latest.event_data);
  const storedChecks = record(data.checks);
  return {
    checks: {
      emergency: storedChecks.emergency === true,
      safe: storedChecks.safe === true,
      duplicate: storedChecks.duplicate === true,
      wishes: storedChecks.wishes === true,
      scope: storedChecks.scope === true,
    },
    urgency: value(data, "urgency", base.urgency),
    route: value(data, "route", base.route),
    referral: value(data, "referral", base.referral),
    note: latest.internal_note || "",
    saved: true,
  };
}

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

function statusLabel(status: string): string {
  return {
    received: "Nueva",
    triage: "En triage",
    in_review: "En revisión",
    contact: "Contacto",
    referred: "Derivada",
    resolved: "Resuelta",
    closed: "Cerrada",
  }[status] || "En revisión";
}

function fileSize(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "Tamaño no disponible";
  return value >= 1024 * 1024 ? `${(value / 1024 / 1024).toFixed(2)} MB` : `${Math.ceil(value / 1024)} KB`;
}

export function TeamIntakeInbox() {
  const [reports, setReports] = useState<IntakeReport[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviews, setReviews] = useState<Record<string, IntakeReview>>({});
  const [savingId, setSavingId] = useState("");
  const [saveError, setSaveError] = useState("");

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
      setReviews(Object.fromEntries(nextReports.map((report) => [report.id, reviewFromReport(report)])));
      setSelectedId((current) => nextReports.some((report) => report.id === current) ? current : (nextReports[0]?.id || ""));
    } catch (error) {
      setError(error instanceof Error ? error.message : "No se pudieron cargar las comunicaciones.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const selected = reports.find((report) => report.id === selectedId) || null;
  const selectedReview = selected ? reviews[selected.id] || initialReview(selected.priority) : null;
  const missingReviewItems = selectedReview
    ? reviewChecks.filter(([key]) => !selectedReview.checks[key]).map(([, , missingText]) => missingText)
    : [];

  const updateReview = (changes: Partial<IntakeReview>) => {
    if (!selected) return;
    setReviews((current) => {
      const existing = current[selected.id] || initialReview(selected.priority);
      return { ...current, [selected.id]: { ...existing, ...changes, saved: false } };
    });
  };

  const updateReviewCheck = (key: ReviewKey, checked: boolean) => {
    if (!selected) return;
    setReviews((current) => {
      const existing = current[selected.id] || initialReview(selected.priority);
      return {
        ...current,
        [selected.id]: {
          ...existing,
          checks: { ...existing.checks, [key]: checked },
          saved: false,
        },
      };
    });
  };

  const saveReview = async () => {
    if (!selected) return;
    const review = reviews[selected.id] || initialReview(selected.priority);
    setSavingId(selected.id);
    setSaveError("");
    try {
      const response = await fetch("/api/team/intake-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: selected.id,
          checks: review.checks,
          urgency: review.urgency,
          route: review.route,
          referral: review.referral,
          note: review.note,
        }),
      });
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok || !data || typeof data !== "object" || !("event" in data) || !data.event || typeof data.event !== "object") {
        const message = data && typeof data === "object" && "error" in data && typeof data.error === "string"
          ? data.error
          : "No se pudo guardar la revisión.";
        throw new Error(message);
      }
      const event = data.event as IntakeEvent;
      const currentStatus = "currentStatus" in data && typeof data.currentStatus === "string" ? data.currentStatus : event.status;
      setReports((current) => current.map((report) => report.id === selected.id
        ? { ...report, current_status: currentStatus, updated_at: event.created_at, events: [...(report.events || []), event] }
        : report));
      setReviews((current) => ({ ...current, [selected.id]: { ...review, saved: true } }));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "No se pudo guardar la revisión.");
    } finally {
      setSavingId("");
    }
  };

  return <section className="teamInbox">
    <header className="teamInboxHeader">
      <div><div className="eyebrow">Bandeja de entradas</div><h1>Comunicaciones recibidas</h1><p>Lo que una persona envía desde “Comunicar” llega acá como un registro pendiente de revisión.</p></div>
      <button className="teamGhostButton" type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={17} className={loading ? "teamInboxSpin" : ""}/> Actualizar</button>
    </header>

    {error && <div className="teamInboxError" role="alert"><AlertTriangle size={20}/><span>{error}</span></div>}
    {loading && <div className="teamInboxLoading">Cargando comunicaciones…</div>}
    {!loading && !error && !reports.length && <div className="teamInboxEmpty"><Inbox size={30}/><strong>Todavía no hay comunicaciones.</strong><span>Cuando una persona complete el formulario, aparecerá aquí.</span></div>}

    {!loading && !error && reports.length > 0 && <div className="teamInboxLayout">
      <aside className="teamInboxListPanel">
        <div className="teamInboxListHeading">
          <div><span>Bandeja de recepción</span><h2>{reports.length} {reports.length === 1 ? "entrada" : "entradas"}</h2></div>
          <ClipboardCheck size={22}/>
        </div>
        <div className="teamInboxList" aria-label="Comunicaciones recibidas">{reports.map((report) => {
          const payload = record(report.report_payload);
          const isSelected = report.id === selectedId;
          const reviewSaved = report.current_status !== "received";
          return <button key={report.id} type="button" className={`teamInboxItem ${isSelected ? "isSelected" : ""}`} onClick={() => setSelectedId(report.id)}>
            <span className="teamInboxItemBadges">
              <span className={`teamInboxPriority priority${report.priority}`}>{report.priority}</span>
              <span className="teamInboxSource">{value(payload, "channel", "Formulario web")}</span>
              <span className={`teamInboxStatus ${reviewSaved ? "isReviewed" : ""}`}>{statusLabel(report.current_status)}</span>
            </span>
            <strong>{report.case_code} · {value(payload, "setting")}</strong>
            <small>{value(payload, "narrative")}</small>
            <time>Recibida {dateTime(report.created_at)}</time>
          </button>;
        })}</div>
      </aside>

      {selected && selectedReview && <article className="teamInboxDetail">
        <div className="teamInboxDetailHeading">
          <div>
            <span className="teamInboxItemBadges">
              <span className={`teamInboxPriority priority${selectedReview.urgency}`}>{selectedReview.urgency}</span>
              <span className="teamInboxSource">{value(selected.report_payload, "channel", "Formulario web")}</span>
              <span className={`teamInboxStatus ${selected.current_status !== "received" ? "isReviewed" : ""}`}>{statusLabel(selected.current_status)}</span>
            </span>
            <h2>{selected.case_code}</h2>
            <p>Recibida {dateTime(selected.created_at)}</p>
          </div>
          <CheckCircle2 size={25}/>
        </div>
        <div className="teamInboxFacts">
          <div><strong>Ámbito</strong><span>{value(selected.report_payload, "setting")}</span></div>
          <div><strong>Quién comunica</strong><span>{value(selected.report_payload, "reporter")}</span></div>
          <div><strong>Lugar</strong><span>{reportPlace(selected)}</span></div>
          <div><strong>Privacidad</strong><span>{value(selected.report_payload, "privacy")}</span></div>
          <div><strong>Contacto seguro</strong><span>{value(selected.report_payload, "safeContact", value(selected.report_payload, "contactMethod"))}</span></div>
          <div><strong>No contactar primero</strong><span>{selected.report_payload.noEarlyContact === true ? "Sí" : "No indicado"}</span></div>
          <div><strong><Phone size={14}/> Celular</strong><span>{value(selected.report_payload, "contactPhone", "No indicado")}</span></div>
          <div><strong><Mail size={14}/> Correo</strong><span>{value(selected.report_payload, "contactEmail", "No indicado")}</span></div>
        </div>
        <section className="teamInboxNarrative"><strong>Lo comunicado</strong><p>{value(selected.report_payload, "narrative")}</p></section>
        <section className="teamInboxNarrative"><strong>Preocupaciones seleccionadas</strong><p>{values(selected.report_payload, "concerns").join(" · ") || "No indicadas"}</p></section>
        <section className="teamInboxEvidence">
          <header><Paperclip size={19}/><strong>Evidencias adjuntas</strong><span>{selected.attachments?.length || 0}</span></header>
          {selected.attachments?.length ? <ul>{selected.attachments.map((attachment) => <li key={attachment.id}><FileText size={18}/><span><strong>{attachment.file_name}</strong><small>{fileSize(Number(attachment.size_bytes))} · {dateTime(attachment.created_at)}</small></span></li>)}</ul> : <p>No se adjuntaron archivos.</p>}
        </section>
        <section className="teamInboxHistory">
          <header><History size={19}/><strong>Avances registrados</strong></header>
          <ol>{(selected.events || []).map((event) => <li key={event.id}><span></span><div><strong>{event.public_title}</strong><small>{event.public_description} · {dateTime(event.created_at)}</small></div></li>)}</ol>
        </section>

        <section className="teamInboxAssistant">
          <Sparkles size={22}/>
          <div>
            <strong>Asistente de registro · sugerencia</strong>
            <p>{missingReviewItems.length ? `Falta ${missingReviewItems.join(", ")}.` : "Los pasos básicos de recepción están revisados."}</p>
            <small>Sugerencia automática de demostración. No confirma violencia ni decide el caso.</small>
          </div>
        </section>

        <section className="teamInboxReview">
          <header><span><ShieldCheck size={21}/></span><div><small>Recepción y triage</small><h3>1. Revisar seguridad y alcance</h3></div></header>
          <div className="teamInboxReviewBody">
            <div className="teamInboxChecklist">{reviewChecks.map(([key, label]) =>
              <label key={key}><input type="checkbox" checked={selectedReview.checks[key]} onChange={(event) => updateReviewCheck(key, event.target.checked)}/><span>{label}</span></label>
            )}</div>

            <div className="teamInboxReviewFields">
              <label><span>Nivel de urgencia</span><select value={selectedReview.urgency} onChange={(event) => updateReview({ urgency: event.target.value })}>{urgencyOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
              <label><span>Ruta principal sugerida</span><select value={selectedReview.route} onChange={(event) => updateReview({ route: event.target.value })}>{routeOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
              {!selectedReview.checks.scope && <label className="teamInboxReferralField">
                <span>Derivar a <small>· situación fuera del alcance</small></span>
                <select value={selectedReview.referral} onChange={(event) => updateReview({ referral: event.target.value })}>{referralOptions.map((option) => <option key={option}>{option}</option>)}</select>
              </label>}
            </div>

            <label className="teamInboxTriageNote"><span>Nota de triage</span><textarea value={selectedReview.note} onChange={(event) => updateReview({ note: event.target.value })} placeholder="Distinguir hechos comunicados, información faltante y decisión de recepción."/></label>
            <div className="teamInboxReviewActions">
              <button type="button" disabled={savingId === selected.id} onClick={() => void saveReview()}><Save size={17}/> {savingId === selected.id ? "Guardando…" : "Guardar revisión"}</button>
              <span role="status" aria-live="polite">{saveError || (selectedReview.saved ? "Revisión guardada en Supabase; el usuario ya puede ver el avance." : "Los cambios se guardarán en el historial del trámite.")}</span>
            </div>
          </div>
        </section>
      </article>}
    </div>}
  </section>;
}
