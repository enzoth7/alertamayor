"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2, Calendar, CheckCircle2, ChevronDown, ClipboardCheck, ExternalLink, FileCheck2, FilePlus2, Landmark, LockKeyhole, LogOut, MapPin, MapPinned, Menu, ShieldAlert, ShieldCheck, Sparkles, UserRound, Users, X } from "lucide-react";
import UruguayRegistry from "./UruguayRegistry";
import { TeamCasesWorkflow } from "./team/TeamCasesWorkflow";
import { TeamLicenseWorkflow } from "./team/TeamLicenseWorkflow";
import { TeamMeasuresWorkflow } from "./team/TeamMeasuresWorkflow";
import { TeamVisitsWorkflow } from "./team/TeamVisitsWorkflow";
import { IntakeReportForm } from "./IntakeReportForm";
import { ReportStatusLookup } from "./ReportStatusLookup";
import { ActivitiesView } from "./ActivitiesView";
import { TeamIntakeInbox } from "./team/TeamIntakeInbox";
import { OrganizationFacilityRegistry } from "./team/OrganizationFacilityRegistry";
import { ReviewMockup } from "./team/ReviewMockup";
import { ResidencialesFormView } from "./ResidencialesFormView";
import { useResidenciales } from "../hooks/useResidenciales";
import type { Facility } from "./map-types";

export type View = "inicio" | "actividades" | "denuncia" | "seguimiento" | "residenciales" | "residenciales_form" | "review" | "equipos" | "fuentes";
type AccessMode = "loading" | "chooser" | "person" | "organization";
export type Portal = "person" | "organization";

const ACCESS_SESSION_KEY = "alerta-mayor-access";

const personViewPaths: Partial<Record<View, string>> = {
  inicio: "/personas",
  actividades: "/personas/actividades",
  denuncia: "/personas/denuncia",
  seguimiento: "/personas/seguimiento",
  residenciales: "/personas/residenciales",
  residenciales_form: "/personas/residenciales/form",
};

const orgViewPaths: Partial<Record<View, string>> = {
  residenciales: "/organizacion/residenciales",
  review: "/organizacion/review",
  equipos: "/organizacion/equipos",
  fuentes: "/organizacion/fuentes",
};

const choices = [
  ["🏠", "En su casa o en la comunidad", "Vive sola, con familiares, una persona cuidadora u otras personas."],
  ["🏢", "En un residencial o ELEPEM", "Está alojada de forma permanente o temporal en un establecimiento."],
  ["🏥", "En otro servicio", "Hospital, policlínica, centro de día u otro espacio de cuidado."],
  ["?", "No lo sé", "La persona que consulta no conoce el tipo de lugar."],
];

export function AppShell({ initialView, portal, forceLogin }: { initialView: View; portal?: Portal; forceLogin?: boolean }) {
  const router = useRouter();
  const view = initialView;
  const [accessMode, setAccessMode] = useState<AccessMode>(() => {
    if (portal === "person") return "person";
    if (typeof window !== "undefined") {
      try {
        const savedMode = window.sessionStorage.getItem(ACCESS_SESSION_KEY);
        if (savedMode === "person") return "person";
      } catch {}
    }
    return portal === "organization" ? (forceLogin ? "chooser" : "loading") : "chooser";
  });
  const [organizationLogin, setOrganizationLogin] = useState(Boolean(forceLogin));
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [menu, setMenu] = useState(false);
  const [preselectedFacility, setPreselectedFacility] = useState<Facility | null>(null);
  const [followCode, setFollowCode] = useState<string>("");

  useEffect(() => {
    let active = true;

    // Portal personas: establece modo person inmediatamente
    if (portal === "person") {
      try { window.sessionStorage.setItem(ACCESS_SESSION_KEY, "person"); } catch {}
      setAccessMode("person");
      return;
    }

    // Portal organización: verifica sesión; si no hay, muestra login de org
    if (portal === "organization") {
      const restoreOrg = async () => {
        try {
          const response = await fetch("/api/team/session", { cache: "no-store" });
          const data: unknown = await response.json().catch(() => null);
          const authenticated = Boolean(data && typeof data === "object" && "authenticated" in data && data.authenticated === true);
          if (!active) return;
          if (authenticated) {
            window.sessionStorage.setItem(ACCESS_SESSION_KEY, "organization");
            setAccessMode("organization");
            return;
          }
          if (!active) return;
          window.sessionStorage.removeItem(ACCESS_SESSION_KEY);
          setOrganizationLogin(true);
          setAccessMode("chooser");
        } catch {
          if (active) { setOrganizationLogin(true); setAccessMode("chooser"); }
        }
      };
      void restoreOrg();
      return () => { active = false; };
    }

    // Chooser raíz (/): muestra el chooser salvo que haya sesión de org
    const restoreAccess = async () => {
      try {
        const savedMode = window.sessionStorage.getItem(ACCESS_SESSION_KEY);
        if (savedMode !== "organization") {
          if (active) setAccessMode("chooser");
          return;
        }
        const response = await fetch("/api/team/session", { cache: "no-store" });
        const data: unknown = await response.json().catch(() => null);
        const authenticated = Boolean(data && typeof data === "object" && "authenticated" in data && data.authenticated === true);
        if (!active) return;
        if (authenticated) {
          router.replace("/organizacion/residenciales");
        } else {
          window.sessionStorage.removeItem(ACCESS_SESSION_KEY);
          setAccessMode("chooser");
        }
      } catch {
        if (active) setAccessMode("chooser");
      }
    };
    void restoreAccess();
    return () => { active = false; };
  }, [portal, router]);

  const personBlockedView = view === "review" || view === "equipos" || view === "fuentes";
  const organizationBlockedView = view === "denuncia" || view === "seguimiento";
  const isOrganization = accessMode === "organization";
  const navItems: [View, string][] = isOrganization
    ? [["residenciales", "Residenciales"], ["review", "Review"], ["equipos", "Equipos"], ["fuentes", "Fuentes"]]
    : [["inicio", "Inicio"], ["actividades", "Actividades"], ["residenciales", "Residenciales"]];

  useEffect(() => {
    if (accessMode === "person" && personBlockedView) router.replace("/personas");
    if (accessMode === "organization" && organizationBlockedView) router.replace("/organizacion/residenciales");
  }, [accessMode, organizationBlockedView, personBlockedView, router]);

  const saveAccessMode = (mode: "person" | "organization") => {
    try { window.sessionStorage.setItem(ACCESS_SESSION_KEY, mode); } catch {}
    setAccessMode(mode);
  };

  const resetAccess = () => {
    if (accessMode === "organization") void fetch("/api/team/session", { method: "DELETE" }).catch(() => undefined);
    try { window.sessionStorage.removeItem(ACCESS_SESSION_KEY); } catch {}
    setAccessMode("chooser");
    setOrganizationLogin(false);
    setUsername("");
    setPassword("");
    setLoginError("");
    setMenu(false);
    router.push("/");
  };

  const submitOrganizationLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoggingIn(true);
    setLoginError("");
    try {
      const response = await fetch("/api/team/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) {
        const data: unknown = await response.json().catch(() => null);
        const message = data && typeof data === "object" && "error" in data && typeof data.error === "string" ? data.error : "No se pudo ingresar.";
        throw new Error(message);
      }
      setLoginError("");
      setPassword("");
      saveAccessMode("organization");
      // Redirigir al portal de organización
      router.push("/organizacion/residenciales");
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "No se pudo ingresar.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const go = (next: View) => {
    setMenu(false);
    if (portal === "organization" || isOrganization) {
      if (next === "denuncia" || next === "seguimiento") {
        router.push("/organizacion/residenciales");
        return;
      }
      router.push(orgViewPaths[next] ?? "/organizacion/residenciales");
      return;
    }
    // Portal personas
    if (next === "review" || next === "equipos" || next === "fuentes") {
      router.push("/personas");
      return;
    }
    router.push(personViewPaths[next] ?? "/personas");
  };

  if (accessMode === "loading") return <main className="accessGate accessGateLoading" aria-label="Cargando acceso"><img src="/alertamayor.png" alt="Alerta mayor"/></main>;

  if (accessMode === "chooser") return <AccessGateway
    organizationLogin={organizationLogin}
    setOrganizationLogin={setOrganizationLogin}
    username={username}
    setUsername={setUsername}
    password={password}
    setPassword={setPassword}
    loginError={loginError}
    setLoginError={setLoginError}
    isLoggingIn={isLoggingIn}
    onPerson={() => { saveAccessMode("person"); router.push("/personas"); }}
    onOrganizationLogin={submitOrganizationLogin}
  />;

  if ((accessMode === "person" && personBlockedView) || (accessMode === "organization" && organizationBlockedView)) {
    return <main className="accessGate accessGateLoading"><span>Abriendo la vista correspondiente…</span></main>;
  }

  return <main className={`site ${accessMode === "person" ? "personSite" : "organizationSite"}`}>
    <header className="top"><div className="topin">
      <button className="brand" onClick={resetAccess} aria-label="Volver a elegir entre persona y organización"><img src="/alertamayor.png" alt="Alerta mayor" className="brandLogo" /><span>Alerta mayor</span></button>
      <nav className={menu ? "nav open" : "nav"}>{navItems.map(([key, label]) => <button key={key} className={view === key ? "active" : ""} onClick={() => go(key)}>{label}</button>)}</nav>
      <div className="tools"><button className="menuToggle" onClick={() => setMenu(!menu)} aria-label="Abrir menú"><Menu size={17}/> Menú</button><button className="profileReset" onClick={resetAccess} aria-label={isOrganization ? "Salir de la organización" : "Cambiar perfil"}><LogOut size={16}/><span>{isOrganization ? "Salir" : "Cambiar perfil"}</span></button></div>
    </div></header>
    <div className="shell">
      <div className="banner"><ShieldAlert size={20}/><span><strong>PROTOTIPO ACADÉMICO</strong> · Usá sólo datos de demostración. Las comunicaciones se guardan para que el equipo las vea en su bandeja, pero no se envían a ningún organismo ni representan un servicio oficial.</span></div>
      {view === "inicio" && <HomeView go={go} isOrganization={isOrganization}/>}
      {view === "actividades" && <ActivitiesView onHome={() => go("inicio")}/>}
      {view === "denuncia" && <IntakeReportForm onHome={() => go("inicio")} onFollow={(code) => { if (code) setFollowCode(code); go("seguimiento"); }} initialFacility={preselectedFacility}/>}
      {view === "seguimiento" && <ReportStatusLookup onHome={() => go("inicio")} initialCode={followCode}/>}
      {view === "residenciales" && (isOrganization ? <OrganizationFacilityRegistry/> : <UruguayRegistry onReport={(facility) => {
        if (facility) {
          try {
            window.sessionStorage.setItem("alerta-mayor-preselected-facility", JSON.stringify(facility));
          } catch {}
          setPreselectedFacility(facility);
        }
        go(isOrganization ? "equipos" : "denuncia");
      }}/>) }
      {view === "residenciales_form" && <ResidencialesFormView />}
      {isOrganization && view === "equipos" && <Team initialFacility={preselectedFacility}/>}
      {isOrganization && view === "fuentes" && <Sources/>}
      {isOrganization && view === "review" && <ReviewMockup/>}
    </div>
  </main>;
}

function AccessGateway({ organizationLogin, setOrganizationLogin, username, setUsername, password, setPassword, loginError, setLoginError, isLoggingIn, onPerson, onOrganizationLogin }: { organizationLogin: boolean; setOrganizationLogin: (value: boolean) => void; username: string; setUsername: (value: string) => void; password: string; setPassword: (value: string) => void; loginError: string; setLoginError: (value: string) => void; isLoggingIn: boolean; onPerson: () => void; onOrganizationLogin: (event: FormEvent<HTMLFormElement>) => void }) {
  return <main className="accessGate">
    <div className={`accessGatePanel ${organizationLogin ? "isLogin" : ""}`}>
      <img src="/alertamayor.png" alt="Alerta mayor" className="accessGateLogo"/>
      <h1>Alerta mayor</h1>
      {!organizationLogin ? <>
        <p className="accessGateLead">Elegí cómo querés ingresar</p>
        <div className="accessChoiceGrid">
          <button type="button" className="accessChoiceCard accessChoicePerson" onClick={onPerson}>
            <span className="accessChoiceIcon"><UserRound size={42}/></span>
            <strong>Soy una persona</strong>
            <small>Orientación, consultas y comunicación de preocupaciones</small>
          </button>
          <button type="button" className="accessChoiceCard accessChoiceOrganization" onClick={() => { setLoginError(""); setOrganizationLogin(true); }}>
            <span className="accessChoiceIcon"><Building2 size={42}/></span>
            <strong>Soy de la organización</strong>
            <small>Acceso a equipos, gestión institucional y fuentes</small>
          </button>
        </div>
      </> : <>
        <p className="accessGateLead">Ingreso de organización</p>
        <form className="organizationLoginForm" onSubmit={onOrganizationLogin}>
          <label><span>Usuario</span><div className="accessInput"><UserRound size={19}/><input value={username} onChange={(event) => { setUsername(event.target.value); setLoginError(""); }} autoComplete="username" autoFocus/></div></label>
          <label><span>Contraseña</span><div className="accessInput"><LockKeyhole size={19}/><input type="password" value={password} onChange={(event) => { setPassword(event.target.value); setLoginError(""); }} autoComplete="current-password"/></div></label>
          {loginError && <div className="accessLoginError" role="alert">{loginError}</div>}
          <button className="accessLoginSubmit" type="submit" disabled={isLoggingIn}>{isLoggingIn ? "Ingresando…" : "Ingresar"} <ArrowRight size={18}/></button>
        </form>
        <button type="button" className="accessLoginBack" onClick={() => { setOrganizationLogin(false); setLoginError(""); setPassword(""); }}><ArrowLeft size={17}/> Volver</button>
      </>}
    </div>
  </main>;
}

function HomeView({ go, isOrganization }: { go: (view: View) => void; isOrganization: boolean }) {
  if (isOrganization) return <section className="card hero homeHero">
    <div className="eyebrow">Acceso institucional</div>
    <h1>Herramientas de la organización</h1>
    <p className="lead">Elegí una de las tres áreas disponibles para trabajar en el prototipo.</p>
    <div className="grid three actionsGrid homeActions organizationHomeActions">
      <button className="action action-blue" onClick={() => go("residenciales")}>
        <div className="actionIcon"><MapPin size={28}/></div>
        <div className="actionCopy"><strong>Residenciales</strong><p>Registro, habilitación y datos de ELEPEM</p></div>
        <ArrowRight className="actionArrow" size={22}/>
      </button>
      <button className="action action-violet" onClick={() => go("equipos")}>
        <div className="actionIcon"><Users size={28}/></div>
        <div className="actionCopy"><strong>Equipos</strong><p>Comunicaciones recibidas y gestión institucional</p></div>
        <ArrowRight className="actionArrow" size={22}/>
      </button>
      <button className="action action-amber" onClick={() => go("fuentes")}>
        <div className="actionIcon"><FileCheck2 size={28}/></div>
        <div className="actionCopy"><strong>Fuentes</strong><p>Origen, fecha y límites de los datos</p></div>
        <ArrowRight className="actionArrow" size={22}/>
      </button>
    </div>
  </section>;

  return <section className="personHome">
    <header className="personHomeHeader">
      <h1>¿Qué necesitás hoy?</h1>
      <p>Elegí una opción para empezar.</p>
    </header>
    <div className="personHomeGrid">
      <button className="personHomeOption optionActivities" onClick={() => go("actividades")}>
        <Calendar size={37}/>
        <strong>Actividades</strong>
        <p>Talleres, recreación y espacios para personas mayores.</p>
      </button>
      <button className="personHomeOption optionConcern" onClick={() => go("denuncia")}>
        <ShieldAlert size={37}/>
        <strong>Comunicar una preocupación</strong>
        <p>Contá una situación sobre vos o sobre otra persona mayor.</p>
      </button>
      <button className="personHomeOption optionResidential" onClick={() => go("residenciales")}>
        <MapPin size={37}/>
        <strong>Consultar residenciales</strong>
        <p>Buscá un ELEPEM y revisá su situación administrativa.</p>
      </button>
      <button className="personHomeOption optionFollow" onClick={() => go("seguimiento")}>
        <ClipboardCheck size={37}/>
        <strong>Seguir el trámite</strong>
        <p>Ingresá tu código y comprobá si la comunicación fue recibida.</p>
      </button>
    </div>
  </section>;
}
function ReportLegacy({ step, setStep, setting, setSetting, sent, setSent, go }: { step:number; setStep:(n:number)=>void; setting:string; setSetting:(s:string)=>void; sent:boolean; setSent:(b:boolean)=>void; go:(v:View)=>void }) { if(sent) return <section className="card success"><CheckCircle2/><div className="eyebrow">Comunicación recibida</div><h1>Expediente ficticio creado</h1><p>El código de demostración es <strong>DEM-48291</strong>. No se envió información a ningún organismo.</p><button className="primary" onClick={() => {setSent(false); setStep(1); go("inicio")}}>Volver al inicio</button></section>; const titles = ["Dónde vive o está habitualmente la persona", "Quién comunica y cómo llegó la alerta", "Apoyos para la vida diaria", "Ubicación", "Qué preocupa", "Señales de urgencia", "Identidad y contacto seguro", "Revisión"]; return <section className="card report"><div className="eyebrow">Consulta, alerta o denuncia</div><h1>Comunicar una preocupación</h1><p className="lead">No hace falta saber si es delito o maltrato. La herramienta prepara una evaluación humana.</p><div className="steps">{titles.map((_, i) => <span className={step === i + 1 ? "current" : step > i + 1 ? "done" : ""} key={i}>{i + 1}</span>)}</div><h2>{titles[step - 1]}</h2>{step === 1 ? <div className="grid two">{choices.map(([icon, title, text]) => <button key={title} className={`choice ${setting === title ? "selected" : ""}`} onClick={() => setSetting(title)}><span>{icon}</span><strong>{title}</strong>{text}</button>)}</div> : step === 5 ? <><p className="muted">Se puede elegir más de una opción. “Reportado” no significa “confirmado”.</p><textarea placeholder="Contá brevemente qué ocurrió. Solo datos ficticios."/></> : step === 8 ? <div className="notice"><strong>Ruta sugerida para evaluación humana</strong><p>Entrada → Revisión humana → Responsable → Tareas y derivaciones</p></div> : <div className="grid two"><div><label>Información para esta etapa</label><input placeholder="Completá si lo conocés"/></div><div><label>Detalle adicional</label><input placeholder="Opcional"/></div></div>}<div className="actions"><button className="secondary" disabled={step === 1} onClick={() => setStep(step - 1)}>Volver</button><button className="primary" disabled={step === 1 && !setting} onClick={() => step === 8 ? setSent(true) : setStep(step + 1)}>{step === 8 ? "Crear expediente ficticio" : <>Continuar <ArrowRight size={17}/></>}</button></div></section> }

const reportStages = [
  { label: "Dónde", title: "Dónde vive o está habitualmente la persona" },
  { label: "Quién", title: "Quién comunica y cómo llegó la alerta" },
  { label: "Cuidados", title: "Apoyos para la vida diaria" },
  { label: "Ubicación", title: "Ubicación" },
  { label: "Preocupa", title: "Qué preocupa" },
  { label: "Urgencia", title: "Señales de urgencia" },
  { label: "Contacto", title: "Identidad y contacto seguro" },
  { label: "Revisar", title: "Revisión" },
];

function ReportVisualLegacy({ step, setStep, setting, setSetting, sent, setSent, go }: { step:number; setStep:(n:number)=>void; setting:string; setSetting:(s:string)=>void; sent:boolean; setSent:(b:boolean)=>void; go:(v:View)=>void }) {
  if (sent) return <section className="reportFlow reportSuccess"><div className="reportSuccessMark"><CheckCircle2 size={32}/></div><div className="eyebrow">Comunicación recibida</div><h1>Expediente ficticio creado</h1><p>El código de demostración es <strong>DEM-48291</strong>. No se envió información a ningún organismo.</p><button className="reportContinue" onClick={() => { setSent(false); setStep(1); go("inicio"); }}>Volver al inicio <ArrowRight size={17}/></button></section>;
  const stage = reportStages[step - 1];
  return <section className="reportFlow">
    <header className="reportFlowHeader"><div className="eyebrow">Consulta, alerta o denuncia</div><h1>Comunicar una preocupación</h1><p className="lead">No hace falta saber si es delito o maltrato. La herramienta prepara una evaluación humana.</p></header>
    <nav className="reportStepper" aria-label="Etapas de la comunicación">{reportStages.map((item, index) => {
      const stageNumber = index + 1;
      const current = stageNumber === step;
      const complete = stageNumber < step;
      return <button key={item.label} type="button" className={`reportStep ${current ? "isCurrent" : ""} ${complete ? "isComplete" : ""}`} onClick={() => complete && setStep(stageNumber)} disabled={!complete} aria-current={current ? "step" : undefined}><span className="reportStepNumber">{complete ? <CheckCircle2 size={15}/> : stageNumber}</span><span className="reportStepLabel">{item.label}</span></button>;
    })}</nav>
    <div className="reportStage" key={step}>
      <div className="reportStageIntro"><span>Etapa {String(step).padStart(2, "0")} · {stage.label}</span><h2>{stage.title}</h2></div>
      {step === 1 ? <div className="grid two reportChoices">{choices.map(([icon, title, text]) => <button key={title} className={`choice ${setting === title ? "selected" : ""}`} onClick={() => setSetting(title)}><span>{icon}</span><strong>{title}</strong>{text}</button>)}</div> : step === 5 ? <div className="reportSingleField"><p className="muted">Se puede elegir más de una opción. “Reportado” no significa “confirmado”.</p><label>Contá brevemente qué ocurrió<textarea placeholder="Solo datos ficticios. Podés escribir con tus palabras."/></label></div> : step === 8 ? <div className="reportReview"><span><Sparkles size={20}/></span><div><strong>Ruta sugerida para evaluación humana</strong><p>Entrada <b>→</b> Revisión humana <b>→</b> Responsable <b>→</b> Tareas y derivaciones</p></div></div> : <div className="grid two reportFields"><label>Información para esta etapa<input placeholder="Completá si lo conocés"/></label><label>Detalle adicional<input placeholder="Opcional"/></label></div>}
    </div>
    <footer className="reportActions"><button className="reportBack" disabled={step === 1} onClick={() => setStep(step - 1)}>← Volver</button><span>Etapa {step} de {reportStages.length}</span><button className="reportContinue" disabled={step === 1 && !setting} onClick={() => step === reportStages.length ? setSent(true) : setStep(step + 1)}>{step === reportStages.length ? "Crear expediente ficticio" : "Continuar"}<ArrowRight size={17}/></button></footer>
  </section>;
}
type ReportOption = { value: string; title?: string; detail?: string; icon?: string };
type ReportFacility = Pick<Facility, "id" | "name" | "department" | "locality" | "address" | "statusShort" | "statusGroup">;

const reportSettings: ReportOption[] = [
  { value: "Domicilio o comunidad", icon: "🏠", title: "En su casa o en la comunidad", detail: "Vive sola, con familiares, con una persona cuidadora o con otras personas." },
  { value: "ELEPEM", icon: "🏢", title: "En un residencial o ELEPEM", detail: "Está alojada de forma permanente o temporal en un establecimiento." },
  { value: "Otro servicio", icon: "🏥", title: "En otro servicio", detail: "Hospital, policlínica, centro de día, vivienda con apoyo u otro espacio de cuidado." },
  { value: "No sabe", icon: "❓", title: "No lo sé", detail: "La persona que consulta no conoce con certeza el tipo de lugar." },
];

const reportReporters = ["La propia persona", "Familiar o referente", "Vecino/a o amigo/a", "Cuidador", "Profesional", "Trabajador/a o extrabajador/a", "Otra persona"];
const reportNeeds = ["Alimentación e hidratación", "Higiene y vestirse", "Moverse o ir al baño", "Tomar medicamentos", "Compras y trámites", "Manejo de dinero", "Comunicarse", "Supervisión para estar segura", "Otro"];
const reportConcerns = ["Estoy preocupada/o pero no sé si es maltrato", "Maltrato psicológico o amenazas", "Violencia física", "Abuso sexual", "Uso indebido de dinero o documentos", "Negligencia o abandono", "Medicación, contención o encierro", "Autonegligencia o extrema vulnerabilidad", "Falta de cuidados o de red", "Accidente o lesión", "Riesgo edilicio o incendio", "Falla institucional o de acceso a servicios", "Quiero plantear una preocupación o propuesta sobre la vida cotidiana", "No se consulta a la persona sobre decisiones que la afectan"];
const reportRisks = ["Peligro o violencia en curso", "Lesión grave o persona inconsciente", "Sin comida, agua o medicación esencial", "Abandono o vive con quien podría agredirla", "Amenazas de muerte o represalias", "Posible abuso sexual", "No hay una forma segura de contactarla", "No se observan señales de urgencia inmediata"];
const reportDepartments = ["Artigas", "Canelones", "Cerro Largo", "Colonia", "Durazno", "Flores", "Florida", "Lavalleja", "Maldonado", "Montevideo", "Paysandú", "Río Negro", "Rivera", "Rocha", "Salto", "San José", "Soriano", "Tacuarembó", "Treinta y Tres", "Otro"];

function ReportOptionGrid({ options, selected, onSelect, multiple = false, compact = false }: { options: (string | ReportOption)[]; selected: string | string[]; onSelect: (value: string) => void; multiple?: boolean; compact?: boolean }) {
  const selectedValues = Array.isArray(selected) ? selected : [selected];
  return <div className={`reportOptionGrid ${compact ? "isCompact" : ""}`}>{options.map((item) => {
    const option = typeof item === "string" ? { value: item } : item;
    const isSelected = selectedValues.includes(option.value);
    return <button type="button" key={option.value} className={`reportOption ${isSelected ? "isSelected" : ""}`} aria-pressed={isSelected} onClick={() => onSelect(option.value)}>{option.icon && <span className="reportOptionIcon">{option.icon}</span>}<span className="reportOptionCopy"><strong>{option.title || option.value}</strong>{option.detail && <small>{option.detail}</small>}</span>{multiple && <span className="reportOptionCheck">{isSelected ? <CheckCircle2 size={16}/> : "+"}</span>}</button>;
  })}</div>;
}

function ReportFacilityResults({ matches, loading, onSelect }: { matches: ReportFacility[]; loading: boolean; onSelect: (facility: ReportFacility) => void }) {
  if (loading) return <div className="reportFacilityResults reportFacilityEmpty">Consultando residenciales en Supabase…</div>;
  if (!matches.length) return <div className="reportFacilityResults reportFacilityEmpty">No hay coincidencias en las fuentes integradas. La ausencia no prueba que el lugar sea clandestino.</div>;
  return <div className="reportFacilityResults">{matches.map((facility) => <button type="button" key={facility.id} onClick={() => onSelect(facility)}><span><strong>{facility.name}</strong><small>{facility.address} · {facility.locality} · {facility.department}</small></span><em>{facility.statusShort}</em><ArrowRight size={17}/></button>)}</div>;
}

function Report({ step, setStep, setting, setSetting, sent, setSent, go }: { step:number; setStep:(n:number)=>void; setting:string; setSetting:(s:string)=>void; sent:boolean; setSent:(b:boolean)=>void; go:(v:View)=>void }) {
  const { facilities: reportFacilities, loading: facilitiesLoading } = useResidenciales();
  const [reporter, setReporter] = useState("");
  const [channel, setChannel] = useState("Formulario web / app");
  const [ageRange, setAgeRange] = useState("No sabe");
  const [dependency, setDependency] = useState("No sabe o no fue valorada");
  const [livingWith, setLivingWith] = useState("No sabe");
  const [needs, setNeeds] = useState<string[]>([]);
  const [otherNeed, setOtherNeed] = useState("");
  const [requestAssessment, setRequestAssessment] = useState(false);
  const [department, setDepartment] = useState("Montevideo");
  const [locationReference, setLocationReference] = useState("");
  const [privateAddress, setPrivateAddress] = useState("");
  const [facilityName, setFacilityName] = useState("");
  const [selectedFacility, setSelectedFacility] = useState<ReportFacility | null>(null);
  const [facilitySearchStatus, setFacilitySearchStatus] = useState("Todavía no se buscó en las fuentes");
  const [unknownArea, setUnknownArea] = useState("");
  const [unknownAddress, setUnknownAddress] = useState("");
  const [unknownNote, setUnknownNote] = useState("");
  const [concerns, setConcerns] = useState<string[]>([]);
  const [allegedRelation, setAllegedRelation] = useState("No sabe / no hay una persona identificada");
  const [narrative, setNarrative] = useState("");
  const [risks, setRisks] = useState<string[]>([]);
  const [privacy, setPrivacy] = useState("Confidencial");
  const [contactMethod, setContactMethod] = useState("Sin contacto / anónimo");
  const [safeContact, setSafeContact] = useState("");
  const [noEarlyContact, setNoEarlyContact] = useState(false);
  const [demoConsent, setDemoConsent] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");
  const [caseCode, setCaseCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const stage = reportStages[step - 1];
  const facilityMatches = facilityName.trim().length < 2 ? [] : reportFacilities.filter((facility) => facility.statusGroup !== "verificar" && `${facility.name} ${facility.address} ${facility.locality} ${facility.department} ${facility.statusShort}`.toLocaleLowerCase("es-UY").includes(facilityName.trim().toLocaleLowerCase("es-UY"))).slice(0, 12);

  const toggle = (value: string, values: string[], setValues: (next: string[]) => void) => setValues(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  const place = setting === "ELEPEM" ? `${selectedFacility ? `${selectedFacility.name} · ${selectedFacility.address}` : facilityName || "ELEPEM pendiente de verificación"}${unknownArea ? ` · ${unknownArea}` : ""}` : `${department}${locationReference ? ` · ${locationReference}` : " · ubicación protegida"}`;
  const preliminaryPriority = risks.some((risk) => risk !== "No se observan señales de urgencia inmediata") ? "Alta" : concerns.some((concern) => /Violencia física|Abuso sexual|Negligencia|Medicaci|dinero/.test(concern)) ? "Media" : "Baja";
  const participationConcern = concerns.some((concern) => /vida cotidiana|decisiones que la afectan/i.test(concern));
  const seriousConcern = concerns.some((concern) => /Violencia física|Abuso sexual|Negligencia|Medicaci|contención|encierro|lesión|Riesgo edilicio|incendio/i.test(concern));
  const urgentRisk = risks.some((risk) => /Peligro|violencia en curso|inconsciente|incendio/i.test(risk));
  const primaryRoute = setting === "ELEPEM" ? participationConcern && !seriousConcern ? "Canal de participación o profesional social del ELEPEM · a validar" : "Inmayores / MIDES · protección de derechos" : "Inmayores / MIDES · orientación y protección";
  const suggestedRoute = [...new Set([
    urgentRisk ? "911 / Bomberos / emergencia médica" : "",
    "Equipo receptor de personas mayores (propuesto)",
    primaryRoute,
    setting === "ELEPEM" && participationConcern && !seriousConcern ? "Inmayores / MIDES · orientación sobre derechos" : "",
    setting === "ELEPEM" && (!participationConcern || seriousConcern) ? "MSP · Sector ELEPEM · cuando corresponda fiscalización" : "",
    concerns.some((concern) => /Violencia física|Abuso sexual|dinero|documentos|encierro|amenazas/.test(concern)) ? "Policía / Fiscalía" : "",
    requestAssessment || needs.length > 0 || concerns.some((concern) => concern === "Falta de cuidados o de red") ? "Sistema de Cuidados / valoración" : "",
    concerns.some((concern) => /lesión|Medicaci|comida|agua/i.test(concern)) || risks.some((risk) => /Lesión|comida|agua|medicación/i.test(risk)) ? "Prestador de salud / emergencia médica" : "",
    concerns.some((concern) => /Autonegligencia|red|acceso/i.test(concern)) ? "Servicios territoriales" : "",
  ].filter(Boolean))];

  const clearValidation = () => setValidationMessage("");
  const submitReport = async () => {
    setIsSubmitting(true);
    clearValidation();

    try {
      const response = await fetch("/api/intake-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report: {
            setting,
            reporter,
            channel,
            ageRange,
            dependency,
            livingWith,
            needs,
            otherNeed,
            requestAssessment,
            location: {
              department,
              reference: locationReference,
              privateAddress,
              unknownArea,
              unknownAddress,
              unknownNote,
            },
            facility: {
              id: selectedFacility?.id,
              name: selectedFacility?.name || facilityName,
              address: selectedFacility?.address,
              locality: selectedFacility?.locality,
              department: selectedFacility?.department,
              searchStatus: facilitySearchStatus,
            },
            concerns,
            allegedRelation,
            narrative,
            risks,
            privacy,
            contactMethod,
            safeContact,
            noEarlyContact,
            preliminaryPriority,
            suggestedRoute,
          },
        }),
      });
      const data: unknown = await response.json().catch(() => null);

      if (!response.ok || !data || typeof data !== "object" || !("caseCode" in data) || typeof data.caseCode !== "string") {
        const message = data && typeof data === "object" && "error" in data && typeof data.error === "string"
          ? data.error
          : "No se pudo guardar la comunicación. Intentá nuevamente.";
        throw new Error(message);
      }

      setCaseCode(data.caseCode);
      setSent(true);
    } catch (error) {
      setValidationMessage(error instanceof Error ? error.message : "No se pudo guardar la comunicación. Intentá nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  };
  const advance = () => {
    if (step === 1 && !setting) { setValidationMessage("Elegí dónde vive o está habitualmente la persona para continuar."); return; }
    if (step === 2 && !reporter) { setValidationMessage("Elegí quién comunica y cómo llegó la alerta para conservar su origen."); return; }
    if (step === reportStages.length) {
      if (!demoConsent) { setValidationMessage("Confirmá que entendés que esta es una demostración antes de crear el expediente ficticio."); return; }
      void submitReport();
      return;
    }
    clearValidation();
    setStep(step + 1);
  };
  const restart = () => {
    setStep(1); setSetting(""); setReporter(""); setChannel("Formulario web / app"); setAgeRange("No sabe"); setDependency("No sabe o no fue valorada"); setLivingWith("No sabe"); setNeeds([]); setOtherNeed(""); setRequestAssessment(false); setDepartment("Montevideo"); setLocationReference(""); setPrivateAddress(""); setFacilityName(""); setSelectedFacility(null); setFacilitySearchStatus("Todavía no se buscó en las fuentes"); setUnknownArea(""); setUnknownAddress(""); setUnknownNote(""); setConcerns([]); setAllegedRelation("No sabe / no hay una persona identificada"); setNarrative(""); setRisks([]); setPrivacy("Confidencial"); setContactMethod("Sin contacto / anónimo"); setSafeContact(""); setNoEarlyContact(false); setDemoConsent(false); setValidationMessage(""); setCaseCode(""); setSent(false);
  };

  if (sent) return <section className="reportFlow reportSuccess"><div className="reportSuccessMark"><CheckCircle2 size={32}/></div><div className="eyebrow">Comunicación guardada</div><h1>Expediente de demostración creado</h1><p>El código de seguimiento es <strong>{caseCode || "AM-PENDIENTE"}</strong>. El ejercicio se guardó para esta demostración y no se envió a ningún organismo.</p><div className="reportSuccessActions"><button className="reportBack" onClick={restart}>Nueva simulación</button><button className="reportContinue" onClick={() => { restart(); go("inicio"); }}>Volver al inicio <ArrowRight size={17}/></button></div></section>;

  const needsSummary = needs
    .map((need) => need === "Otro" && otherNeed.trim() ? `Otro: ${otherNeed.trim()}` : need)
    .join("; ");

  let stageContent: React.ReactNode;
  if (step === 1) {
    stageContent = <ReportOptionGrid options={reportSettings} selected={setting} onSelect={(value) => { setSetting(value); clearValidation(); }} />;
  } else if (step === 2) {
    stageContent = <><p className="reportStageHelp">La fuente y el canal se conservan para no perder el recorrido previo de la información.</p><ReportOptionGrid options={reportReporters} selected={reporter} onSelect={(value) => { setReporter(value); clearValidation(); }} compact /><div className="reportFieldGrid reportFieldGridOne"><label className="reportField"><span>Canal de entrada</span><select value={channel} onChange={(event) => setChannel(event.target.value)}><option>Formulario web / app</option><option>Teléfono</option><option>WhatsApp o SMS</option><option>Atención presencial</option><option>Derivación de un equipo de salud o social</option><option>Policía, Bomberos u otra autoridad</option></select></label></div></>;
  } else if (step === 3) {
    stageContent = <>
      <p className="reportStageHelp">Esto no sustituye el baremo oficial ni obliga a elegir un grado. Sirve para no perder una necesidad de cuidados detrás de la situación de violencia.</p>
      <div className="reportFieldGrid reportFieldGridThree">
        <label className="reportField"><span>Edad aproximada de la/s persona/s afectada/s</span><select value={ageRange} onChange={(event) => setAgeRange(event.target.value)}>{["No sabe", "60 a 64 años", "65 a 69 años", "70 a 74 años", "75 a 79 años", "80 a 84 años", "85 a 89 años", "90 años o más"].map((option) => <option key={option}>{option}</option>)}</select></label>
        <label className="reportField"><span>¿Tiene una valoración oficial de dependencia?</span><select value={dependency} onChange={(event) => setDependency(event.target.value)}>{["No sabe o no fue valorada", "Sin dependencia reconocida", "Dependencia leve", "Dependencia moderada", "Dependencia severa"].map((option) => <option key={option}>{option}</option>)}</select></label>
        <label className="reportField"><span>¿Con quién vive?</span><select value={livingWith} onChange={(event) => setLivingWith(event.target.value)}>{["No sabe", "Vive sola", "Con hijo/a u otro familiar", "Con pareja", "Con cuidador", "En un establecimiento"].map((option) => <option key={option}>{option}</option>)}</select></label>
      </div>
      <h3 className="reportSubheading">Necesita ayuda para…</h3>
      <ReportOptionGrid
        options={reportNeeds}
        selected={needs}
        onSelect={(value) => {
          toggle(value, needs, setNeeds);
          if (value === "Otro" && needs.includes(value)) setOtherNeed("");
        }}
        multiple
        compact
      />
      {needs.includes("Otro") && <label className="reportField"><span>Especificá qué otra ayuda necesita</span><input value={otherNeed} onChange={(event) => setOtherNeed(event.target.value)} placeholder="Describí la ayuda que necesita"/></label>}
      <label className="reportCheckbox"><input type="checkbox" checked={requestAssessment} onChange={(event) => setRequestAssessment(event.target.checked)}/><span>Puede necesitar una valoración formal de dependencia y acceso a apoyos.</span></label>
    </>;
  } else if (step === 4) {
    stageContent = setting === "ELEPEM" ? <>
      <div className="reportLocationNotice"><strong>Primero se busca en las fuentes integradas.</strong><span>Si no hay coincidencia, se registra como “no figura / dato no coincide: pendiente de verificación”; no se publica automáticamente como clandestino.</span></div>
      <div className="reportFieldGrid"><label className="reportField"><span>Nombre o dirección</span><input value={facilityName} onChange={(event) => { setFacilityName(event.target.value); setSelectedFacility(null); setFacilitySearchStatus("Todavía no se buscó en las fuentes"); }} placeholder="Buscar residencial"/></label><label className="reportField"><span>Resultado de la búsqueda</span><select value={facilitySearchStatus} onChange={(event) => { setFacilitySearchStatus(event.target.value); if (event.target.value === "No aparece, cambió de dirección o usa otro nombre") setSelectedFacility(null); }}><option>Todavía no se buscó en las fuentes</option><option>Se encontró una coincidencia</option><option>No aparece, cambió de dirección o usa otro nombre</option></select></label></div>
      {facilityName.trim().length >= 2 && facilitySearchStatus !== "No aparece, cambió de dirección o usa otro nombre" && <ReportFacilityResults matches={facilityMatches} loading={facilitiesLoading} onSelect={(facility) => { setSelectedFacility(facility); setFacilityName(facility.name); setDepartment(facility.department); setLocationReference(`${facility.address} · ${facility.locality}`); setFacilitySearchStatus("Se encontró una coincidencia"); }} />}
      {selectedFacility && <div className="reportSelectedFacility"><strong>{selectedFacility.name}</strong><span>{selectedFacility.address} · {selectedFacility.locality} · {selectedFacility.department}</span><small>{selectedFacility.statusShort}</small></div>}
      {facilitySearchStatus === "No aparece, cambió de dirección o usa otro nombre" && <div className="reportUnknownPlace"><h3>Lugar pendiente de verificación</h3><div className="reportFieldGrid"><label className="reportField"><span>Departamento</span><select value={department} onChange={(event) => setDepartment(event.target.value)}>{reportDepartments.map((option) => <option key={option}>{option}</option>)}</select></label><label className="reportField"><span>Barrio, localidad o zona</span><input value={unknownArea} onChange={(event) => setUnknownArea(event.target.value)} placeholder="Ubicación aproximada"/></label><label className="reportField"><span>Dirección o referencia exacta</span><input value={unknownAddress} onChange={(event) => setUnknownAddress(event.target.value)} placeholder="Quedaría protegida"/></label><label className="reportField"><span>¿Qué hace pensar que es un residencial o anexo?</span><input value={unknownNote} onChange={(event) => setUnknownNote(event.target.value)} placeholder="Solo datos ficticios"/></label></div></div>}
    </> : <>
      <div className="reportFieldGrid">
        <label className="reportField"><span>Departamento</span><select value={department} onChange={(event) => setDepartment(event.target.value)}>{reportDepartments.map((option) => <option key={option}>{option}</option>)}</select></label>
        <label className="reportField"><span>Barrio, localidad o referencia</span><input value={locationReference} onChange={(event) => setLocationReference(event.target.value)} placeholder="Ej.: Municipio D, La Paz, Pando"/></label>
      </div>
      <label className="reportField"><span>Dirección exacta <em>opcional y protegida</em></span><input value={privateAddress} onChange={(event) => setPrivateAddress(event.target.value)} placeholder="No aparecería en mapas públicos"/></label>
      <div className="reportLocationNotice"><strong>Privacidad geográfica.</strong><span>La ubicación se ingresa manualmente y se puede corregir antes de continuar. Un domicilio particular solo sería visible para equipos autorizados; las estadísticas públicas mostrarían zonas agregadas.</span></div>
    </>;
  } else if (step === 5) {
    stageContent = <><p className="reportStageHelp">Se puede elegir más de una opción. “Reportado” no significa “confirmado”.</p><ReportOptionGrid options={reportConcerns} selected={concerns} onSelect={(value) => toggle(value, concerns, setConcerns)} multiple compact /><div className="reportFieldGrid"><label className="reportField"><span>Relación de la persona presuntamente responsable</span><select value={allegedRelation} onChange={(event) => setAllegedRelation(event.target.value)}>{["No sabe / no hay una persona identificada", "Hijo o hija", "Pareja", "Otro familiar", "Cuidador", "Vecino/a", "Personal o responsable de un servicio", "Otra persona no familiar"].map((option) => <option key={option}>{option}</option>)}</select></label><label className="reportField"><span>¿Qué ocurrió?</span><textarea value={narrative} onChange={(event) => setNarrative(event.target.value)} placeholder="Caso ficticio únicamente. No incluyas datos personales reales."/></label></div></>;
  } else if (step === 6) {
    stageContent = <><ReportOptionGrid options={reportRisks} selected={risks} onSelect={(value) => toggle(value, risks, setRisks)} multiple compact /><div className="reportUrgencyNotice"><ShieldAlert size={21}/><div><strong>En una emergencia real:</strong><span>llamar al 911, a Bomberos o al servicio de emergencia médica. Un formulario no puede sustituir esa respuesta.</span></div></div></>;
  } else if (step === 7) {
    stageContent = <><ReportOptionGrid options={["Anónima", "Confidencial", "Identificada"]} selected={privacy} onSelect={setPrivacy} compact /><div className="reportFieldGrid"><label className="reportField"><span>Medio seguro</span><select value={contactMethod} onChange={(event) => setContactMethod(event.target.value)}>{["Sin contacto / anónimo", "Llamada", "WhatsApp o SMS", "Correo", "Persona de confianza"].map((option) => <option key={option}>{option}</option>)}</select></label><label className="reportField"><span>Horario o condición segura</span><input value={safeContact} onChange={(event) => setSafeContact(event.target.value)} placeholder="Ej.: llamar después de las 18; no dejar mensaje"/></label></div><label className="reportCheckbox"><input type="checkbox" checked={noEarlyContact} onChange={(event) => setNoEarlyContact(event.target.checked)}/><span>No contactar primero a la persona señalada ni al establecimiento.</span></label></>;
  } else {
    const summary = [["Ámbito", setting || "No indicado"], ["Origen de la alerta", `${reporter || "No indicado"} · ${channel}`], ["Lugar", place], ["Edad aproximada", ageRange], ["Dependencia", dependency], ["Con quién vive", livingWith], ["Apoyos necesarios", needsSummary || "No indicados"], ["Preocupaciones", concerns.join("; ") || "Consulta general"], ["Presunta relación", allegedRelation], ["Riesgo preliminar", preliminaryPriority], ["Identidad", privacy], ["Contacto seguro", `${contactMethod}${safeContact ? ` · ${safeContact}` : ""}`], ["No contactar primero", noEarlyContact ? "Sí" : "No indicado"]];
    stageContent = <><div className="reportSummary">{summary.map(([label, value]) => <div key={label}><strong>{label}</strong><span>{value}</span></div>)}</div><div className="reportRoutePanel"><span><Sparkles size={20}/></span><div><strong>Ruta sugerida para evaluación humana</strong><div className="reportRouteTags">{suggestedRoute.map((route) => <span key={route}>{route}</span>)}</div></div></div><label className="reportCheckbox reportConsent"><input type="checkbox" checked={demoConsent} onChange={(event) => { setDemoConsent(event.target.checked); clearValidation(); }}/><span>Entiendo que este es un prototipo: el ejercicio se guardará para la demostración y no se enviará a ningún organismo.</span></label></>;
  }

  return <section className="reportFlow"><header className="reportFlowHeader"><div className="eyebrow">Consulta, alerta o denuncia</div><h1>Comunicar una preocupación</h1><p className="lead">No hace falta saber si es delito, maltrato o falta de cuidados. La herramienta registra lo observado, protege el contacto y prepara una evaluación humana.</p></header><nav className="reportStepper" aria-label="Etapas de la comunicación">{reportStages.map((item, index) => { const stageNumber = index + 1; const current = stageNumber === step; const complete = stageNumber < step; return <button key={item.label} type="button" className={`reportStep ${current ? "isCurrent" : ""} ${complete ? "isComplete" : ""}`} onClick={() => complete && setStep(stageNumber)} disabled={!complete || isSubmitting} aria-current={current ? "step" : undefined}><span className="reportStepNumber">{complete ? <CheckCircle2 size={15}/> : stageNumber}</span><span className="reportStepLabel">{item.label}</span></button>; })}</nav><div className="reportStage" key={step}><div className="reportStageIntro"><span>Etapa {String(step).padStart(2, "0")} · {stage.label}</span><h2>{stage.title}</h2></div>{stageContent}{validationMessage && <div className="reportValidation" role="alert">{validationMessage}</div>}</div><footer className="reportActions"><button className="reportBack" disabled={step === 1 || isSubmitting} onClick={() => { clearValidation(); setStep(step - 1); }}>← Volver</button><span>Etapa {step} de {reportStages.length}</span><button className="reportContinue" disabled={isSubmitting} onClick={advance}>{step === reportStages.length ? (isSubmitting ? "Guardando…" : "Guardar expediente de demostración") : "Continuar"}<ArrowRight size={17}/></button></footer></section>;
}

type TeamTask = "cases" | "visits" | "measures" | "license";

function Team({ initialFacility }: { initialFacility?: Facility | null }) {
  return <TeamIntakeInbox initialFacility={initialFacility}/>;
}

function TeamLegacy() {
  const [task, setTask] = useState<TeamTask | null>(null);
  if (task) return <TeamWorkspace task={task} back={() => setTask(null)}/>;
  const cards: [TeamTask, string, string, string][] = [
    ["cases", "📥", "Recibir y gestionar una entrada", "Registrar llamadas, WhatsApp, correos, formularios o derivaciones; revisar urgencia, buscar duplicados y abrir o vincular un caso."],
    ["visits", "📋", "Preparar o registrar una visita", "Diferenciar una visita de protección en domicilio de una inspección regulatoria a un ELEPEM."],
    ["measures", "⛔", "Revisar medidas, antecedentes o realojos", "Separar alerta, hallazgo, medida administrativa, actuación judicial y seguimiento de las personas."],
    ["license", "🗂️", "Trabajar en habilitación o renovación", "Controlar documentación, visitas, plazos, correcciones y decisiones sin confirmar incumplimientos."],
  ];
  return <><section className="card"><div className="eyebrow">Herramientas de trabajo</div><h1>¿Qué tarea tenés hoy?</h1><p className="lead">Cada persona ve solo lo necesario para su función. La app conserva el origen de la alerta, las decisiones, las tareas y el resultado.</p><div className="grid">{cards.map(([key, icon, title, text]) => <button className="action" key={key} onClick={() => setTask(key)}><span className="icon">{icon}</span><strong>{title}</strong>{text}</button>)}</div></section><section className="card gap"><h2>De una señal a una respuesta</h2><div className="workflow"><span>Entrada</span><b>→</b><span>Revisión humana</span><b>→</b><span>Responsable</span><b>→</b><span>Tareas</span><b>→</b><span>Seguimiento</span></div></section></>;
}

function TeamWorkspaceLegacy({ task, back }: { task: TeamTask; back: () => void }) {
  const [saved, setSaved] = useState(false);
  const [visitType, setVisitType] = useState<"home" | "elepem">("home");
  const titles: Record<TeamTask, [string, string]> = {
    cases: ["Recibir y gestionar una entrada", "Registrar una comunicación, revisar su urgencia y decidir si se abre o vincula un expediente ficticio."],
    visits: ["Preparar y registrar una visita", "Una visita de protección no es lo mismo que una inspección regulatoria: cambian el propósito, consentimiento y evidencia."],
    measures: ["Medidas, antecedentes y realojos", "La alerta inicial no es un hallazgo ni una medida. Cada elemento conserva su fuente, fecha y estado."],
    license: ["Habilitación o renovación", "Gestioná documentación, visita, correcciones y decisión administrativa sin mezclarlo con una denuncia."],
  };
  const save = () => setSaved(true);
  return <><button className="secondary" onClick={back}>← Volver a herramientas para equipos</button><section className="card gap"><div className="eyebrow">{task === "cases" ? "Recepción y triage" : task === "visits" ? "Trabajo de campo" : task === "measures" ? "Datos verificados y gestión" : "Trámite administrativo"}</div><h1>{titles[task][0]}</h1><p className="lead">{titles[task][1]}</p>
    {task === "cases" && <div className="grid two"><label>Canal de entrada<select><option>Llamada</option><option>WhatsApp / mensaje</option><option>Correo</option><option>Formulario</option><option>Derivación institucional</option></select></label><label>Urgencia inicial<select><option>Media · revisar hoy</option><option>Alta · atención prioritaria</option><option>Baja · orientación o seguimiento</option></select></label><label>Origen de la alerta<input placeholder="Ej.: familiar, vecina, profesional"/></label><label>¿Hay un caso que pueda estar vinculado?<select><option>No identificado</option><option>DEM-48291 · consulta en evaluación</option><option>Vincular a expediente existente</option></select></label><label className="wide">Relato inicial, sin convertirlo en hallazgo<textarea placeholder="Registrar lo comunicado y los datos mínimos necesarios."/></label><div className="actions"><button className="secondary" onClick={save}>Guardar como borrador</button><button className="primary" onClick={save}>Abrir expediente ficticio</button></div></div>}
    {task === "visits" && <><div className="actions"><button className={visitType === "home" ? "primary" : "secondary"} onClick={() => setVisitType("home")}>Visita de protección en domicilio</button><button className={visitType === "elepem" ? "primary" : "secondary"} onClick={() => setVisitType("elepem")}>Visita regulatoria a ELEPEM</button></div><div className="grid two gap"><section><h2>Antes de ir</h2><label>Objetivo<input defaultValue={visitType === "home" ? "Conocer la situación y acordar apoyos" : "Verificar condiciones y documentación"}/></label><label>Riesgos y salvaguardas<textarea placeholder="Contacto seguro, entrevista privada, acompañamiento y riesgos previstos."/></label></section><section><h2>Durante y después</h2><label>{visitType === "home" ? "Voluntad y acuerdos de la persona" : "Hallazgos observables y evidencia"}<textarea placeholder="Registrar hechos verificables; separar lo informado de lo observado."/></label><label>Próximo paso<select><option>Programar seguimiento</option><option>Derivar para evaluación</option><option>Solicitar corrección</option><option>Preparar informe</option></select></label></section></div><button className="primary" onClick={save}>Enviar al expediente ficticio</button></>}
    {task === "measures" && <div className="grid two"><label>Tipo de registro<select><option>Alerta o antecedente publicado</option><option>Hallazgo verificado</option><option>Medida administrativa</option><option>Actuación judicial</option><option>Realojo y seguimiento</option></select></label><label>Fuente y fecha<input placeholder="Ej.: resolución oficial · 27/07/2026"/></label><label>Estado<select><option>Pendiente de verificación</option><option>Vigente según fuente</option><option>Histórico / requiere actualización</option></select></label><label>Establecimiento o caso<input placeholder="Nombre o código ficticio"/></label><label className="wide">Descripción y alcance<textarea placeholder="No etiquetar una situación actual si la fuente solo refiere a un antecedente."/></label><button className="primary" onClick={save}>Registrar antecedente ficticio</button></div>}
    {task === "license" && <div className="grid two"><label>Establecimiento<input placeholder="Nombre ficticio del ELEPEM"/></label><label>Etapa<select><option>Registro MSP</option><option>Certificado social MIDES</option><option>Habilitación final / renovación</option></select></label><label>Documentación<select><option>Pendiente de revisión</option><option>Completa</option><option>Requiere correcciones</option></select></label><label>Plazo de respuesta<input type="date"/></label><label className="wide">Observaciones de visita o expediente<textarea placeholder="Documentar requisitos y correcciones solicitadas, sin tratarlo como incumplimiento confirmado."/></label><div className="actions"><button className="secondary" onClick={save}>Guardar avance</button><button className="primary" onClick={save}>Registrar decisión ficticia</button></div></div>}
    {saved && <div className="notice" role="status"><strong>Registro ficticio guardado.</strong> No se envió información a ningún organismo; podés continuar agregando datos o volver a las herramientas.</div>}
  </section></>;
}
const teamWorkspaceMeta = {
  cases: {
    eyebrow: "Recepción y triage",
    title: "Recibir y gestionar una entrada",
    description: "Convertí una comunicación en un próximo paso claro, sin transformar un relato en un hallazgo.",
    icon: FilePlus2,
    steps: ["Recibir", "Valorar", "Vincular"],
  },
  visits: {
    eyebrow: "Trabajo de campo",
    title: "Preparar y registrar una visita",
    description: "Una guía breve para llegar con propósito, cuidado y un registro que sirva para actuar.",
    icon: MapPinned,
    steps: ["Preparar", "Visitar", "Acordar"],
  },
  measures: {
    eyebrow: "Trazabilidad y seguimiento",
    title: "Medidas, antecedentes y realojos",
    description: "Ordená lo informado, lo verificado y las decisiones sin confundir sus alcances.",
    icon: Landmark,
    steps: ["Distinguir", "Respaldar", "Seguir"],
  },
  license: {
    eyebrow: "Habilitación y renovación",
    title: "Avanzar una habilitación",
    description: "Reuní el avance del trámite, las correcciones y las decisiones en una misma vista.",
    icon: FileCheck2,
    steps: ["Revisar", "Corregir", "Resolver"],
  },
};

function TeamWorkspaceGenericLegacy({ task, back }: { task: TeamTask; back: () => void }) {
  const [savedMessage, setSavedMessage] = useState("");
  const [visitType, setVisitType] = useState<"home" | "elepem">("home");
  const meta = teamWorkspaceMeta[task];
  const Icon = meta.icon;
  const save = (message: string) => setSavedMessage(message);

  return <div className={`teamWorkspace teamWorkspace-${task}`}>
    <header className="teamWorkspaceNav">
      <button className="teamBack" onClick={back}><ArrowLeft size={18}/> Herramientas de equipos</button>
      <span className="teamPractice"><span/> Entorno de práctica</span>
    </header>

    <section className="teamWorkspaceHero">
      <div className="teamHeroGlow teamHeroGlowOne"/><div className="teamHeroGlow teamHeroGlowTwo"/>
      <div className="teamHeroContent">
        <div className="teamHeroIcon"><Icon size={30}/></div>
        <div className="eyebrow">{meta.eyebrow}</div>
        <h1>{meta.title}</h1>
        <p>{meta.description}</p>
        <div className="teamHeroBadges"><span><ShieldCheck size={15}/> Solo datos ficticios</span><span><Sparkles size={15}/> Guía paso a paso</span></div>
      </div>
      <ol className="teamHeroSteps" aria-label="Etapas del flujo">{meta.steps.map((step, index) => <li key={step} className={index === 0 ? "isCurrent" : ""}><i>{index + 1}</i><span>{step}</span></li>)}</ol>
    </section>

    <section className="teamComposer">
      <div className="teamComposerIntro">
        <div><span className="teamComposerKicker">Completá lo esencial</span><h2>{task === "cases" ? "Empezamos por lo que llegó" : task === "visits" ? "Diseñá una visita útil y segura" : task === "measures" ? "Registrá cada cosa en su lugar" : "Mantené el trámite en movimiento"}</h2></div>
        <p>Guardá un avance cuando quieras. Esta demostración no comunica información a ningún organismo.</p>
      </div>

      {task === "cases" && <div className="teamFormBody">
        <div className="teamSectionLabel"><span>01</span><div><strong>La entrada</strong><small>El origen ayuda a decidir el siguiente paso, no a confirmar lo sucedido.</small></div></div>
        <div className="teamFieldGrid">
          <label className="teamField"><span>Canal de entrada</span><select><option>Llamada</option><option>WhatsApp / mensaje</option><option>Correo</option><option>Formulario</option><option>Derivación institucional</option></select></label>
          <label className="teamField"><span>Urgencia inicial</span><select><option>Media · revisar hoy</option><option>Alta · atención prioritaria</option><option>Baja · orientación o seguimiento</option></select></label>
          <label className="teamField"><span>Origen de la alerta</span><input placeholder="Ej.: familiar, vecina, profesional"/></label>
          <label className="teamField"><span>Posible vínculo</span><select><option>No identificado</option><option>DEM-48291 · consulta en evaluación</option><option>Vincular a expediente existente</option></select></label>
        </div>
        <label className="teamField teamNarrative"><span>Relato inicial <em>sin convertirlo en hallazgo</em></span><textarea placeholder="Registrá lo comunicado y los datos mínimos necesarios."/></label>
      </div>}

      {task === "visits" && <div className="teamFormBody">
        <div className="teamSegmented" role="group" aria-label="Tipo de visita"><button className={visitType === "home" ? "isSelected" : ""} onClick={() => setVisitType("home")}><Users size={17}/> Protección en domicilio</button><button className={visitType === "elepem" ? "isSelected" : ""} onClick={() => setVisitType("elepem")}><ClipboardCheck size={17}/> Visita regulatoria a ELEPEM</button></div>
        <p className="teamModeNote">{visitType === "home" ? "La entrevista privada y la voluntad de la persona orientan esta visita." : "El registro debe distinguir observaciones verificables, documentación y acciones solicitadas."}</p>
        <div className="teamFlowColumns">
          <div className="teamFlowGroup"><div className="teamSectionLabel"><span>01</span><div><strong>Antes de ir</strong><small>Prepará un propósito claro y los resguardos necesarios.</small></div></div><label className="teamField"><span>Objetivo</span><input value={visitType === "home" ? "Conocer la situación y acordar apoyos" : "Verificar condiciones y documentación"} readOnly/></label><label className="teamField"><span>Riesgos y salvaguardas</span><textarea placeholder="Contacto seguro, entrevista privada, acompañamiento y riesgos previstos."/></label></div>
          <div className="teamFlowGroup"><div className="teamSectionLabel"><span>02</span><div><strong>Durante y después</strong><small>Dejá hechos claros y un próximo paso compartido.</small></div></div><label className="teamField"><span>{visitType === "home" ? "Voluntad y acuerdos" : "Hallazgos observables y evidencia"}</span><textarea placeholder="Registrá hechos verificables; separá lo informado de lo observado."/></label><label className="teamField"><span>Próximo paso</span><select><option>Programar seguimiento</option><option>Derivar para evaluación</option><option>Solicitar corrección</option><option>Preparar informe</option></select></label></div>
        </div>
      </div>}

      {task === "measures" && <div className="teamFormBody">
        <div className="teamSectionLabel"><span>01</span><div><strong>Qué se está registrando</strong><small>Cada tipo de información tiene una fuente y un alcance diferente.</small></div></div>
        <div className="teamFieldGrid">
          <label className="teamField"><span>Tipo de registro</span><select><option>Alerta o antecedente publicado</option><option>Hallazgo verificado</option><option>Medida administrativa</option><option>Actuación judicial</option><option>Realojo y seguimiento</option></select></label>
          <label className="teamField"><span>Estado</span><select><option>Pendiente de verificación</option><option>Vigente según fuente</option><option>Histórico / requiere actualización</option></select></label>
          <label className="teamField"><span>Fuente y fecha</span><input placeholder="Ej.: resolución oficial · 27/07/2026"/></label>
          <label className="teamField"><span>Establecimiento o caso</span><input placeholder="Nombre o código ficticio"/></label>
        </div>
        <label className="teamField teamNarrative"><span>Descripción y alcance</span><textarea placeholder="No etiquetes una situación actual si la fuente solo refiere a un antecedente."/></label>
      </div>}

      {task === "license" && <div className="teamFormBody">
        <div className="teamSectionLabel"><span>01</span><div><strong>Estado del trámite</strong><small>Una habilitación se construye por etapas; no confirma una situación hasta que exista decisión.</small></div></div>
        <div className="teamFieldGrid">
          <label className="teamField"><span>Establecimiento</span><input placeholder="Nombre ficticio del ELEPEM"/></label>
          <label className="teamField"><span>Etapa</span><select><option>Registro MSP</option><option>Certificado social MIDES</option><option>Habilitación final / renovación</option></select></label>
          <label className="teamField"><span>Documentación</span><select><option>Pendiente de revisión</option><option>Completa</option><option>Requiere correcciones</option></select></label>
          <label className="teamField"><span>Plazo de respuesta</span><input type="date"/></label>
        </div>
        <label className="teamField teamNarrative"><span>Observaciones de visita o expediente</span><textarea placeholder="Documentá requisitos y correcciones solicitadas, sin tratarlo como incumplimiento confirmado."/></label>
      </div>}

      <footer className="teamActionDock">
        <span><Sparkles size={17}/> Podés retomar este flujo en cualquier momento.</span>
        <div>{task === "cases" || task === "license" ? <button className="teamGhostButton" onClick={() => save("Borrador ficticio guardado. Podés volver y completar lo que falta.")}>Guardar borrador</button> : null}<button className="teamSaveButton" onClick={() => save(task === "visits" ? "Visita ficticia preparada y vinculada al expediente de demostración." : task === "measures" ? "Registro ficticio agregado con su alcance y fuente." : task === "license" ? "Avance del trámite ficticio guardado." : "Expediente ficticio abierto para continuar la evaluación.")}>{task === "visits" ? "Preparar visita" : task === "measures" ? "Registrar antecedente" : task === "license" ? "Guardar avance" : "Abrir expediente"}<ArrowRight size={17}/></button></div>
      </footer>
      {savedMessage && <div className="teamSaved" role="status"><CheckCircle2 size={20}/><span><strong>Listo.</strong> {savedMessage}</span><button onClick={() => setSavedMessage("")} aria-label="Cerrar mensaje">×</button></div>}
    </section>
  </div>;
}

function TeamWorkspace({ task, back }: { task: TeamTask; back: () => void }) {
  const [savedMessage, setSavedMessage] = useState("");
  const meta = teamWorkspaceMeta[task];
  const Icon = meta.icon;
  const composerTitle = {
    cases: "La entrada completa, desde la recepción hasta el seguimiento",
    visits: "Una visita útil, segura y documentada punto por punto",
    measures: "Antecedentes, medidas y realojos sin mezclar su alcance",
    license: "El recorrido de habilitación, etapa por etapa",
  }[task];

  return <div className={`teamWorkspace teamWorkspace-${task}`}>
    <header className="teamWorkspaceNav">
      <button className="teamBack" onClick={back}><ArrowLeft size={18}/> Herramientas de equipos</button>
      <span className="teamPractice"><span/> Entorno de práctica</span>
    </header>

    <section className="teamWorkspaceHero">
      <div className="teamHeroGlow teamHeroGlowOne"/>
      <div className="teamHeroGlow teamHeroGlowTwo"/>
      <div className="teamHeroContent">
        <div className="teamHeroIcon"><Icon size={30}/></div>
        <div className="eyebrow">{meta.eyebrow}</div>
        <h1>{meta.title}</h1>
        <p>{meta.description}</p>
        <div className="teamHeroBadges">
          <span><ShieldCheck size={15}/> Solo datos ficticios</span>
          <span><Sparkles size={15}/> Contenido completo del prototipo</span>
        </div>
      </div>
      <ol className="teamHeroSteps" aria-label="Etapas principales del flujo">
        {meta.steps.map((step, index) => <li key={step} className={index === 0 ? "isCurrent" : ""}><i>{index + 1}</i><span>{step}</span></li>)}
      </ol>
    </section>

    <section className="teamComposer">
      <div className="teamComposerIntro">
        <div>
          <span className="teamComposerKicker">Herramienta de trabajo completa</span>
          <h2>{composerTitle}</h2>
        </div>
        <p>Explorá las ramas y guardá avances ficticios. Ninguna acción comunica información a organismos reales.</p>
      </div>

      {task === "cases" && <TeamCasesWorkflow onSaved={setSavedMessage}/>}
      {task === "visits" && <TeamVisitsWorkflow onSaved={setSavedMessage}/>}
      {task === "measures" && <TeamMeasuresWorkflow onSaved={setSavedMessage}/>}
      {task === "license" && <TeamLicenseWorkflow onSaved={setSavedMessage}/>}

      {savedMessage && <div className="teamSaved" role="status">
        <CheckCircle2 size={20}/>
        <span><strong>Listo.</strong> {savedMessage}</span>
        <button onClick={() => setSavedMessage("")} aria-label="Cerrar mensaje">×</button>
      </div>}
    </section>
  </div>;
}

function SourceAccordion({ title, icon, defaultOpen, delay, children }: { title: string; icon: string; defaultOpen?: boolean; delay?: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return <div className={`sourcesSection accordion ${open ? "accordionOpen" : ""}`} style={{ animationDelay: `${delay || 0}ms` }}>
    <button className="accordionHeader" onClick={() => setOpen(!open)} aria-expanded={open}>
      <span className="accordionHeaderIcon">{icon}</span>
      <span>{title}</span>
      <ChevronDown className="accordionChevron" size={20}/>
    </button>
    <div className="accordionBody"><div className="accordionContent">{children}</div></div>
  </div>;
}
function Sources() {
  return <div className="sourcesPage">
    <section className="card sourcesHero sourcesSection">
      <div className="eyebrow">Base de evidencia</div>
      <h1>Fuentes, fechas y límites</h1>
      <p className="lead">El prototipo diferencia información administrativa, antecedentes verificables y alertas pendientes de revisión. Cada dato muestra su fuente y fecha para que pueda verificarse de forma independiente.</p>
    </section>

    <SourceAccordion title="Fuentes principales" icon="📋" defaultOpen={false} delay={100}>
      <div className="grid three sourceCards">
        <div className="sourceCard">
          <span className="sourceBadge sourceBadge-green">ETAPA 3 · MSP</span>
          <strong>Habilitados a junio de 2026</strong>
          <p>La publicación oficial más reciente contiene 212 habilitados. Se usa para verificar vigencia, pero no se mezcla silenciosamente con coordenadas provenientes de otro corte.</p>
          <a className="sourceLink" href="https://www.gub.uy/ministerio-salud-publica/comunicacion/comunicados/listado-residenciales-habilitados-certificados-msp-alojan-personas-mayores" target="_blank" rel="noopener noreferrer"><ExternalLink size={14}/> Abrir publicación</a>
        </div>
        <div className="sourceCard">
          <span className="sourceBadge sourceBadge-blue">ETAPA 2 · MIDES</span>
          <strong>Certificado social</strong>
          <p>El directorio oficial informa 319 establecimientos con certificado social al 12 de enero de 2026 y los presenta como establecimientos en proceso de habilitación.</p>
          <a className="sourceLink" href="https://www.gub.uy/ministerio-desarrollo-social/etiqueta/otros/establecimientos-larga-estadia-para-personas-mayores-certificado-social" target="_blank" rel="noopener noreferrer"><ExternalLink size={14}/> Abrir directorio</a>
        </div>
        <div className="sourceCard">
          <span className="sourceBadge sourceBadge-amber">ETAPA 1 · MSP</span>
          <strong>Certificado de registro</strong>
          <p>El catálogo abierto contiene certificados emitidos entre 2017 y 2024. El prototipo georreferencia los emitidos en 2024 y evita duplicar la misma dirección cuando ya aparece en habilitados.</p>
          <a className="sourceLink" href="https://catalogodatos.gub.uy/dataset/ministerio-de-salud-publica-establecimientos_para_personas_mayores_elepem" target="_blank" rel="noopener noreferrer"><ExternalLink size={14}/> Abrir catálogo</a>
        </div>
        <div className="sourceCard">
          <span className="sourceBadge sourceBadge-blue">DATOS ABIERTOS</span>
          <strong>Habilitados julio 2024</strong>
          <p>207 filas reutilizables con nombres y domicilios. Son la base georreferenciada de la etapa 3 en esta versión.</p>
          <a className="sourceLink" href="https://catalogodatos.gub.uy/dataset/ministerio-de-salud-publica-establecimientos_para_personas_mayores_elepem" target="_blank" rel="noopener noreferrer"><ExternalLink size={14}/> Abrir catálogo</a>
        </div>
        <div className="sourceCard">
          <span className="sourceBadge sourceBadge-violet">IM + CIEn</span>
          <strong>Informe de atención 2025</strong>
          <p>Fundamenta que la puerta de comunicación también contemple situaciones domiciliarias, consultas de terceros y problemas que finalmente pueden no clasificarse como violencia.</p>
          <a className="sourceLink" href="https://cien.ei.udelar.edu.uy/wp-content/uploads/2026/04/DIGITAL-Informe-Atencion-a-PM.pdf" target="_blank" rel="noopener noreferrer"><ExternalLink size={14}/> Abrir informe</a>
        </div>
        <div className="sourceCard">
          <span className="sourceBadge sourceBadge-navy">NORMA</span>
          <strong>Decreto 356/016</strong>
          <p>Define las tres etapas y, separadamente, observación, apercibimiento, sanción pecuniaria, suspensión y clausura definitiva.</p>
          <a className="sourceLink" href="https://www.impo.com.uy/bases/decretos/356-2016" target="_blank" rel="noopener noreferrer"><ExternalLink size={14}/> Abrir norma</a>
        </div>
      </div>
    </SourceAccordion>

    <SourceAccordion title="Lo que una ficha puede y no puede afirmar" icon="⚖️" delay={200}>
      <div className="affirmGrid">
        <div className="affirmBlock affirmBlock-yes">
          <h3>Lo que una ficha puede afirmar</h3>
          <ul>
            <li>Que el nombre y domicilio aparecen en una fuente determinada.</li>
            <li>Qué etapa respalda esa fuente y cuál es su fecha.</li>
            <li>Qué precisión tiene el punto geográfico.</li>
            <li>Que la vigencia posterior requiere conciliación cuando el corte es anterior.</li>
          </ul>
        </div>
        <div className="affirmBlock affirmBlock-no">
          <h3>Lo que no puede afirmar</h3>
          <ul>
            <li>Que “no figura” significa clandestino.</li>
            <li>Que tener habilitación equivale a no haber tenido incidentes.</li>
            <li>Que un certificado histórico siga vigente hoy.</li>
            <li>Que una alerta equivale a una infracción confirmada.</li>
          </ul>
        </div>
      </div>
    </SourceAccordion>

    <SourceAccordion title={"Fuentes incorporadas en \u00ABMedidas y antecedentes\u00BB"} icon="📂" delay={300}>
      <div className="grid three sourceCards">
        <div className="sourceCard">
          <span className="sourceBadge sourceBadge-green">OFICIAL · GESTIÓN 2024</span>
          <strong>Clausuras y realojos acumulados</strong>
          <p>20 ELEPEM clausurados, 148 residentes realojados y 73 mediante PACP; también 785 intervenciones de regulación.</p>
          <a className="sourceLink" href="https://medios.presidencia.gub.uy/legal/2025/proyectos/02/presidencia_1399_tomo2.pdf" target="_blank" rel="noopener noreferrer"><ExternalLink size={14}/> Abrir Memoria Anual 2024</a>
        </div>
        <div className="sourceCard">
          <span className="sourceBadge sourceBadge-blue">OFICIAL · AUDITORÍA</span>
          <strong>Universo y denuncias</strong>
          <p>La auditoría informa un universo de 1.481 ELEPEM y 133 denuncias recepcionadas, con datos a marzo de 2024.</p>
          <a className="sourceLink" href="https://www.gub.uy/ministerio-economia-finanzas/sites/ministerio-economia-finanzas/files/documentos/publicaciones/2025_MinisteriodeDesarrolloSocial-InstitutoNacionaldelasPersonasMayores.pdf" target="_blank" rel="noopener noreferrer"><ExternalLink size={14}/> Abrir informe</a>
        </div>
        <div className="sourceCard">
          <span className="sourceBadge sourceBadge-amber">OFICIAL · MSP 2022</span>
          <strong>Cuatro clausuras nominales</strong>
          <p>Respuesta de acceso a la información: cuatro establecimientos, 32 residentes realojados y 24 mediante PACP.</p>
          <a className="sourceLink" href="https://www.gub.uy/ministerio-salud-publica/sites/ministerio-salud-publica/files/2022-08/Res%20585%202022_removed%20%281%29.pdf" target="_blank" rel="noopener noreferrer"><ExternalLink size={14}/> Abrir respuesta</a>
        </div>
        <div className="sourceCard">
          <span className="sourceBadge sourceBadge-red">OFICIAL · FISCALÍA</span>
          <strong>Rincón de Tranqueras</strong>
          <p>Ocho condenas por el caso de un residencial clandestino en Tacuarembó donde vivían más de treinta personas.</p>
          <a className="sourceLink" href="https://www.gub.uy/fiscalia-general-nacion/comunicacion/noticias/ocho-condenados-caso-residencial-clandestino-tacuarembo" target="_blank" rel="noopener noreferrer"><ExternalLink size={14}/> Abrir publicación</a>
        </div>
        <div className="sourceCard">
          <span className="sourceBadge sourceBadge-red">OFICIAL · JUSTICIA</span>
          <strong>Incendios de Treinta y Tres y Salinas</strong>
          <p>Treinta y Tres: dos condenas por el incendio con diez fallecidos. Salinas: formalización por el incendio con cuatro fallecidos.</p>
          <div className="sourceLinks">
            <a className="sourceLink" href="https://www.gub.uy/ministerio-interior/comunicacion/noticias/condenadas-dos-personas-incendio-geriatrico-dejo-diez-fallecidos" target="_blank" rel="noopener noreferrer"><ExternalLink size={14}/> Treinta y Tres</a>
            <a className="sourceLink" href="https://www.gub.uy/fiscalia-general-nacion/comunicacion/noticias/formalizacion-incendio-residencial-salinas" target="_blank" rel="noopener noreferrer"><ExternalLink size={14}/> Salinas</a>
          </div>
        </div>
        <div className="sourceCard">
          <span className="sourceBadge sourceBadge-violet">PRENSA · 2026</span>
          <strong>La Unión y Britópolis</strong>
          <p>Se muestran como procesos recientes con fuente periodística y advertencia expresa: no sustituyen una resolución administrativa o sentencia definitiva.</p>
          <div className="sourceLinks">
            <a className="sourceLink" href="https://ladiaria.com.uy/justicia/articulo/2026/7/fiscalia-advirtio-que-trabajadores-buscaron-evitar-ingreso-de-la-policia-al-residencial-clandestino/" target="_blank" rel="noopener noreferrer"><ExternalLink size={14}/> La Unión</a>
            <a className="sourceLink" href="https://helvecia.com.uy/2026/05/22/britopolis-tras-fallecimiento-de-residente-el-msp-clausuro-en-forma-definitiva-el-residencial-que-funcionaba-con-61-irregularidades-y-sin-habilitacion-de-bomberos/" target="_blank" rel="noopener noreferrer"><ExternalLink size={14}/> Britópolis</a>
          </div>
        </div>
      </div>
    </SourceAccordion>

    <SourceAccordion title="Regla de evidencia que usa el prototipo" icon="🔍" delay={400}>
      <div className="evidenceList">
        <div className="evidenceItem evidenceItem-amber">
          <strong className="evidenceLabel">Alerta</strong>
          <p>Dice que alguien comunicó una preocupación. No confirma el hecho.</p>
        </div>
        <div className="evidenceItem evidenceItem-red">
          <strong className="evidenceLabel">Incidente</strong>
          <p>Registra que ocurrió un evento, como incendio, muerte inesperada o evacuación. Puede requerir investigar negligencia o delito.</p>
        </div>
        <div className="evidenceItem evidenceItem-violet">
          <strong className="evidenceLabel">Hallazgo</strong>
          <p>Una visita, documento o autoridad constató un incumplimiento.</p>
        </div>
        <div className="evidenceItem evidenceItem-blue">
          <strong className="evidenceLabel">Medida</strong>
          <p>Existe una resolución, actuación administrativa o decisión judicial con fecha y responsable.</p>
        </div>
        <div className="evidenceItem evidenceItem-green">
          <strong className="evidenceLabel">Antecedente histórico</strong>
          <p>Se conserva para trazabilidad, pero no se presenta automáticamente como estado vigente.</p>
        </div>
      </div>
    </SourceAccordion>

    <SourceAccordion title="Vacío de información" icon="⚠️" delay={500}>
      <div className="voidBlock">
        <p>No existe una base pública nacional única que, para cada ELEPEM, consolide las tres etapas, vencimientos, cambios de nombre o domicilio y todas las medidas administrativas vigentes. La solución propuesta no rellena esos vacíos por inferencia: los marca como datos pendientes de verificación.</p>
      </div>
    </SourceAccordion>
  </div>;
}
