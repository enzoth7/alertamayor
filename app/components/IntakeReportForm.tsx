"use client";

import { ArrowLeft, ArrowRight, Check, CheckCircle2, Copy, Mail, Paperclip, Phone, ShieldAlert, Trash2 } from "lucide-react";
import { useState } from "react";

type IntakeDraft = {
  setting: string;
  concerns: string[];
  narrative: string;
  department: string;
  locationReference: string;
  facilityName: string;
  reporter: string;
  urgency: "Alta" | "Media" | "Baja" | "";
  privacy: string;
  contactEmail: string;
  contactPhone: string;
  contactMethod: string;
  safeContact: string;
  noEarlyContact: boolean;
};

const initialDraft: IntakeDraft = {
  setting: "",
  concerns: [],
  narrative: "",
  department: "",
  locationReference: "",
  facilityName: "",
  reporter: "",
  urgency: "",
  privacy: "",
  contactEmail: "",
  contactPhone: "",
  contactMethod: "Sin contacto",
  safeContact: "",
  noEarlyContact: false,
};

const places = ["En su casa o comunidad", "En un residencial / ELEPEM", "En otro servicio", "No se conoce"];
const concerns = [
  "Violencia, amenazas o humillación",
  "Negligencia, abandono o falta de cuidados",
  "Dinero, préstamos, documentos o bienes",
  "Control, aislamiento, encierro o represalias",
  "Medicación, salud, caída o accidente",
  "Necesidad de cuidados o apoyos",
  "Riesgo o irregularidad en un residencial",
  "No sé cómo clasificarlo",
];
const reporters = ["La propia persona", "Familiar o referente", "Vecino/a o amistad", "Cuidador/a", "Profesional", "Otra persona"];
const departments = ["Artigas", "Canelones", "Cerro Largo", "Colonia", "Durazno", "Flores", "Florida", "Lavalleja", "Maldonado", "Montevideo", "Paysandú", "Río Negro", "Rivera", "Rocha", "Salto", "San José", "Soriano", "Tacuarembó", "Treinta y Tres", "No se conoce"];

function OptionGrid({ options, selected, onSelect, multiple = false }: { options: string[]; selected: string | string[]; onSelect: (value: string) => void; multiple?: boolean }) {
  const selectedValues = Array.isArray(selected) ? selected : [selected];

  return <div className="reportOptionGrid isCompact">{options.map((option) => {
    const isSelected = selectedValues.includes(option);
    return <button key={option} type="button" className={`reportOption ${isSelected ? "isSelected" : ""}`} aria-pressed={isSelected} onClick={() => onSelect(option)}>
      <span className="reportOptionCopy"><strong>{option}</strong></span>
      {multiple && <span className="reportOptionCheck">{isSelected ? <CheckCircle2 size={16}/> : "+"}</span>}
    </button>;
  })}</div>;
}

function urgencyLabel(value: IntakeDraft["urgency"]): string {
  return value === "Alta" ? "Hay riesgo ahora" : value === "Media" ? "Necesita atención pronto" : "No hay urgencia inmediata";
}

export function IntakeReportForm({
  onHome,
  onFollow,
  initialConcerns = [],
  initialNarrative = "",
}: {
  onHome: () => void;
  onFollow?: () => void;
  initialConcerns?: string[];
  initialNarrative?: string;
}) {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<IntakeDraft>(() => ({
    ...initialDraft,
    concerns: initialConcerns.filter((concern) => concerns.includes(concern)),
    narrative: initialNarrative,
  }));
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [caseCode, setCaseCode] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [attachmentState, setAttachmentState] = useState<"idle" | "uploading" | "complete" | "partial">("idle");
  const [uploadedFileCount, setUploadedFileCount] = useState(0);
  const [emailNotice, setEmailNotice] = useState("");

  const update = <Key extends keyof IntakeDraft>(key: Key, value: IntakeDraft[Key]) => setDraft((current) => ({ ...current, [key]: value }));
  const toggleConcern = (concern: string) => update("concerns", draft.concerns.includes(concern) ? draft.concerns.filter((item) => item !== concern) : [...draft.concerns, concern]);

  const validate = (): boolean => {
    if (step === 1 && !draft.setting && !draft.concerns.length && !draft.narrative.trim()) {
      setMessage("Indicá al menos un dato: el ámbito, una preocupación o un relato breve.");
      return false;
    }
    if (step === 2 && (!draft.department || !draft.locationReference.trim())) {
      setMessage("Indicá el departamento y una referencia del lugar, o elegí “No se conoce”.");
      return false;
    }
    if (step === 3 && (!draft.reporter || !draft.urgency || !draft.privacy)) {
      setMessage("Completá quién comunica, la urgencia y cómo proteger su identidad.");
      return false;
    }
    if (step === 3 && draft.contactEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.contactEmail.trim())) {
      setMessage("Revisá el formato del correo electrónico.");
      return false;
    }
    if (step === 3 && draft.contactPhone.trim() && !/^[+()0-9\s.-]{6,24}$/.test(draft.contactPhone.trim())) {
      setMessage("Revisá el número de celular. Puede incluir prefijo, espacios, guiones y paréntesis.");
      return false;
    }
    if (step === 4 && !consent) {
      setMessage("Confirmá que este ejercicio se guardará sólo para la demostración.");
      return false;
    }
    setMessage("");
    return true;
  };

  const advance = () => {
    if (!validate()) return;
    if (step < 4) setStep((current) => current + 1);
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/intake-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report: {
            setting: draft.setting,
            reporter: draft.reporter,
            channel: "Formulario web / app",
            location: {
              department: draft.department,
              reference: draft.locationReference,
            },
            facility: {
              name: draft.facilityName || null,
            },
            concerns: draft.concerns,
            narrative: draft.narrative,
            risks: [urgencyLabel(draft.urgency)],
            privacy: draft.privacy,
            contactEmail: draft.contactEmail,
            contactPhone: draft.contactPhone,
            contactMethod: draft.contactMethod,
            safeContact: draft.safeContact,
            noEarlyContact: draft.noEarlyContact,
            preliminaryPriority: draft.urgency,
            suggestedRoute: [],
          },
        }),
      });
      const data: unknown = await response.json().catch(() => null);

      if (!response.ok || !data || typeof data !== "object" || !("caseCode" in data) || typeof data.caseCode !== "string") {
        const error = data && typeof data === "object" && "error" in data && typeof data.error === "string" ? data.error : "No se pudo guardar la comunicación. Intentá nuevamente.";
        throw new Error(error);
      }

      const savedCaseCode = data.caseCode;
      const uploadToken = "uploadToken" in data && typeof data.uploadToken === "string" ? data.uploadToken : "";
      setCaseCode(savedCaseCode);
      try { window.sessionStorage.setItem("alerta-mayor-last-code", savedCaseCode); } catch {}

      const notification = "emailNotification" in data && data.emailNotification && typeof data.emailNotification === "object"
        ? data.emailNotification as Record<string, unknown>
        : null;
      if (draft.contactEmail.trim()) {
        setEmailNotice(notification?.sent === true
          ? `También enviamos el código a ${draft.contactEmail.trim()}.`
          : "El correo quedó registrado. El envío automático se habilitará al configurar Resend.");
      }

      if (files.length) {
        setAttachmentState("uploading");
        const uploads = await Promise.all(files.map(async (file) => {
          const formData = new FormData();
          formData.set("file", file);
          formData.set("uploadToken", uploadToken);
          try {
            const uploadResponse = await fetch(`/api/intake-reports/${encodeURIComponent(savedCaseCode)}/attachments`, {
              method: "POST",
              body: formData,
            });
            return uploadResponse.ok;
          } catch {
            return false;
          }
        }));
        const uploaded = uploads.filter(Boolean).length;
        setUploadedFileCount(uploaded);
        setAttachmentState(uploaded === files.length ? "complete" : "partial");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar la comunicación. Intentá nuevamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const restart = () => {
    setDraft(initialDraft);
    setConsent(false);
    setMessage("");
    setCaseCode("");
    setFiles([]);
    setCopyState("idle");
    setAttachmentState("idle");
    setUploadedFileCount(0);
    setEmailNotice("");
    setStep(1);
  };

  const copyCaseCode = async () => {
    try {
      await navigator.clipboard.writeText(caseCode);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2500);
    } catch {
      setCopyState("error");
    }
  };

  const addFiles = (nextFiles: FileList | null) => {
    if (!nextFiles) return;
    const allowed = Array.from(nextFiles).filter((file) => file.size > 0 && file.size <= 10 * 1024 * 1024);
    const merged = [...files, ...allowed].slice(0, 5);
    setFiles(merged);
    if (Array.from(nextFiles).some((file) => file.size > 10 * 1024 * 1024)) {
      setMessage("Cada archivo puede pesar hasta 10 MB. Los archivos más grandes no se agregaron.");
    } else if (files.length + nextFiles.length > 5) {
      setMessage("Podés adjuntar hasta 5 archivos.");
    } else {
      setMessage("");
    }
  };

  if (caseCode) return <section className="reportFlow reportSuccess">
    <div className="reportSuccessMark"><CheckCircle2 size={32}/></div>
    <div className="eyebrow">Comunicación guardada</div>
    <h1>Recibimos tu comunicación</h1>
    <p className="reportTrackingWarning"><strong>Guardá este código.</strong> Lo vas a necesitar para seguir el avance o hacer un reclamo sobre esta comunicación.</p>
    <div className="reportTrackingCode">
      <code>{caseCode}</code>
      <button type="button" onClick={() => void copyCaseCode()}>{copyState === "copied" ? <Check size={17}/> : <Copy size={17}/>} {copyState === "copied" ? "Copiado" : "Copiar código"}</button>
    </div>
    {copyState === "error" && <p className="reportCopyError" role="alert">No se pudo copiar automáticamente. Seleccioná el código y copialo manualmente.</p>}
    {emailNotice && <p className="reportSuccessNotice"><Mail size={17}/>{emailNotice}</p>}
    {attachmentState === "uploading" && <p className="reportSuccessNotice"><Paperclip size={17}/>Subiendo {files.length} {files.length === 1 ? "archivo" : "archivos"}…</p>}
    {attachmentState === "complete" && <p className="reportSuccessNotice isComplete"><Check size={17}/>{uploadedFileCount} {uploadedFileCount === 1 ? "archivo guardado" : "archivos guardados"} como evidencia privada.</p>}
    {attachmentState === "partial" && <p className="reportSuccessNotice isWarning"><ShieldAlert size={17}/>La comunicación se guardó, pero sólo se pudieron adjuntar {uploadedFileCount} de {files.length} archivos.</p>}
    <div className="reportSuccessActions"><button className="reportBack" onClick={restart}>Nueva comunicación</button>{onFollow && <button className="reportBack" onClick={onFollow}>Seguir esta comunicación</button>}<button className="reportContinue" onClick={onHome}>Volver al inicio <ArrowRight size={17}/></button></div>
  </section>;

  const stageTitle = step === 1 ? "¿Qué está pasando?" : step === 2 ? "¿Dónde ocurre?" : step === 3 ? "Urgencia y contacto" : "Revisá y enviá";

  return <section className="reportFlow">
    <header className="reportFlowHeader">
      <div className="eyebrow">Comunicar una preocupación</div>
      <h1>{stageTitle}</h1>
      <p className="lead">Completá sólo lo que sepas. En el primer paso alcanza con indicar uno de los datos.</p>
    </header>

    <nav className="reportStepper" aria-label="Pasos de la comunicación">
      {["Situación", "Lugar", "Urgencia", "Enviar"].map((label, index) => <button key={label} type="button" className={`reportStep ${step === index + 1 ? "isCurrent" : ""} ${step > index + 1 ? "isComplete" : ""}`} onClick={() => index + 1 < step && setStep(index + 1)} disabled={index + 1 > step || submitting} aria-current={step === index + 1 ? "step" : undefined}><span className="reportStepNumber">{step > index + 1 ? <CheckCircle2 size={15}/> : index + 1}</span><span className="reportStepLabel">{label}</span></button>)}
    </nav>

    <div className="reportStage">
      {step === 1 && <>
        <p className="reportStageHelp">No es obligatorio completar todo: elegí una opción o contalo con tus palabras.</p>
        <h3 className="reportSubheading">Ámbito <em>opcional</em></h3>
        <OptionGrid options={places} selected={draft.setting} onSelect={(value) => update("setting", value)} />
        <h3 className="reportSubheading">Preocupación <em>opcional</em></h3>
        <OptionGrid options={concerns} selected={draft.concerns} onSelect={toggleConcern} multiple />
        <label className="reportField"><span>Contá brevemente qué está pasando <em>opcional</em></span><textarea value={draft.narrative} onChange={(event) => update("narrative", event.target.value)} placeholder="Si preferís, escribí un resumen breve. Usá sólo datos de demostración." /></label>
      </>}

      {step === 2 && <>
        <div className="reportFieldGrid">
          <label className="reportField"><span>Departamento</span><select value={draft.department} onChange={(event) => update("department", event.target.value)}><option value="">Elegí una opción</option>{departments.map((department) => <option key={department}>{department}</option>)}</select></label>
          <label className="reportField"><span>Barrio, localidad o referencia</span><input value={draft.locationReference} onChange={(event) => update("locationReference", event.target.value)} placeholder="Ej.: barrio, localidad o “No se conoce”" /></label>
        </div>
        {draft.setting === "En un residencial / ELEPEM" && <label className="reportField"><span>Nombre del residencial <em>opcional</em></span><input value={draft.facilityName} onChange={(event) => update("facilityName", event.target.value)} placeholder="Si lo conocés" /></label>}
      </>}

      {step === 3 && <>
        <h3 className="reportSubheading">¿Quién comunica?</h3>
        <OptionGrid options={reporters} selected={draft.reporter} onSelect={(value) => update("reporter", value)} />
        <h3 className="reportSubheading">Urgencia</h3>
        <OptionGrid options={["Alta", "Media", "Baja"]} selected={draft.urgency} onSelect={(value) => update("urgency", value as IntakeDraft["urgency"])} />
        <h3 className="reportSubheading">Privacidad</h3>
        <OptionGrid options={["Anónima", "Confidencial", "Identificada"]} selected={draft.privacy} onSelect={(value) => update("privacy", value)} />
        <div className="reportContactBlock">
          <div className="reportContactIntro"><strong>Datos de contacto <em>opcionales</em></strong><span>Podés dejarlos con cualquier opción de privacidad. No son obligatorios.</span></div>
          <div className="reportFieldGrid">
            <label className="reportField"><span><Phone size={15}/> Celular <em>opcional</em></span><input type="tel" inputMode="tel" autoComplete="tel" value={draft.contactPhone} onChange={(event) => update("contactPhone", event.target.value)} placeholder="Ej.: 099 123 456" /></label>
            <label className="reportField"><span><Mail size={15}/> Correo electrónico <em>opcional</em></span><input type="email" inputMode="email" autoComplete="email" value={draft.contactEmail} onChange={(event) => update("contactEmail", event.target.value)} placeholder="Ej.: nombre@correo.com" /></label>
          </div>
          <small>Si dejás un correo, intentaremos enviarte allí el código de seguimiento. Igual aparecerá en pantalla al finalizar.</small>
        </div>
        <div className="reportFieldGrid"><label className="reportField"><span>Medio seguro <em>opcional</em></span><select value={draft.contactMethod} onChange={(event) => update("contactMethod", event.target.value)}><option>Sin contacto</option><option>Llamada</option><option>WhatsApp o SMS</option><option>Correo</option><option>Persona de confianza</option></select></label><label className="reportField"><span>Horario o condición segura <em>opcional</em></span><input value={draft.safeContact} onChange={(event) => update("safeContact", event.target.value)} placeholder="Ej.: después de las 18" /></label></div>
        <label className="reportCheckbox"><input type="checkbox" checked={draft.noEarlyContact} onChange={(event) => update("noEarlyContact", event.target.checked)} /><span>No contactar primero a la persona señalada ni al establecimiento.</span></label>
        {draft.urgency === "Alta" && <div className="reportUrgencyNotice"><ShieldAlert size={21}/><div><strong>Si hay peligro inmediato, llamá al 911, Bomberos o la emergencia médica.</strong><span>Este formulario de demostración no reemplaza una respuesta de urgencia.</span></div></div>}
      </>}

      {step === 4 && <>
        <div className="reportSummary">
          <div><strong>Situación</strong><span>{draft.setting || "No indicada"}</span></div><div><strong>Preocupación</strong><span>{draft.concerns.join(" · ") || "No indicada"}</span></div><div><strong>Lugar</strong><span>{draft.department} · {draft.locationReference}</span></div><div><strong>Urgencia</strong><span>{urgencyLabel(draft.urgency)}</span></div><div><strong>Quién comunica</strong><span>{draft.reporter}</span></div><div><strong>Privacidad</strong><span>{draft.privacy}</span></div>
        </div>
        <div className="reportAttachments">
          <div className="reportAttachmentsHeading"><span><Paperclip size={20}/></span><div><strong>Imágenes o pruebas <em>opcionales</em></strong><small>Desde el celular o la computadora. Hasta 5 archivos de 10 MB cada uno.</small></div></div>
          <label className="reportFilePicker">
            <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,text/plain,.doc,.docx" onChange={(event) => { addFiles(event.target.files); event.currentTarget.value = ""; }} />
            <Paperclip size={18}/> Elegir archivos
          </label>
          {files.length > 0 && <ul className="reportFileList">{files.map((file, index) => <li key={`${file.name}-${file.lastModified}-${index}`}><span><strong>{file.name}</strong><small>{(file.size / 1024 / 1024).toFixed(2)} MB</small></span><button type="button" aria-label={`Quitar ${file.name}`} onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}><Trash2 size={16}/></button></li>)}</ul>}
        </div>
        <label className="reportCheckbox reportConsent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>Entiendo que esto es una demostración: se guardará en la base de datos para que el equipo lo vea, pero no se enviará a ningún organismo.</span></label>
      </>}
      {message && <div className="reportValidation" role="alert">{message}</div>}
    </div>

    <footer className="reportActions"><button className="reportBack" type="button" disabled={step === 1 || submitting} onClick={() => { setMessage(""); setStep((current) => current - 1); }}><ArrowLeft size={17}/> Volver</button><span>Paso {step} de 4</span>{step < 4 ? <button className="reportContinue" type="button" onClick={advance}>Continuar <ArrowRight size={17}/></button> : <button className="reportContinue" type="button" disabled={submitting} onClick={submit}>{submitting ? "Guardando…" : "Guardar y enviar al equipo"}<ArrowRight size={17}/></button>}</footer>
  </section>;
}
