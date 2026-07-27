"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, ArrowUpRight, Building2, ChevronRight, FileText, Filter, HelpCircle, LayoutDashboard, MapPin, Menu, Search, ShieldCheck, X } from "lucide-react";

type Case = { id: string; title: string; location: string; category: string; status: "Nuevo" | "En revisión" | "En seguimiento"; priority: "Crítica" | "Alta" | "Media"; time: string; x: number; y: number };
const cases: Case[] = [
  { id: "AE-2418", title: "Situación a verificar", location: "Centro, Montevideo", category: "Posible negligencia", status: "Nuevo", priority: "Crítica", time: "Hace 18 min", x: 56, y: 38 },
  { id: "AE-2417", title: "Solicitud de inspección", location: "La Blanqueada, Montevideo", category: "Condiciones edilicias", status: "En revisión", priority: "Alta", time: "Hace 1 h", x: 34, y: 62 },
  { id: "AE-2415", title: "Comunicación ciudadana", location: "Cordón, Montevideo", category: "Atención y cuidados", status: "En seguimiento", priority: "Media", time: "Hace 3 h", x: 67, y: 71 },
  { id: "AE-2412", title: "Consulta sobre establecimiento", location: "Pocitos, Montevideo", category: "Información administrativa", status: "En revisión", priority: "Media", time: "Ayer", x: 78, y: 25 },
];

function Status({ value }: { value: Case["status"] }) { return <span className={`status ${value.toLowerCase().replaceAll(" ", "-")}`}>{value}</span>; }

export default function Home() {
  const [section, setSection] = useState<"panel" | "mapa" | "publico" | "denuncia">("panel");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(cases[0]);
  const [menuOpen, setMenuOpen] = useState(false);
  const filtered = useMemo(() => cases.filter(c => `${c.id} ${c.title} ${c.location}`.toLowerCase().includes(query.toLowerCase())), [query]);

  return <main>
    <header className="topbar">
      <button className="brand" onClick={() => setSection("panel")} aria-label="Ir al inicio"><span>AE</span><div>Alerta ELEPEM<small>Gestión y seguimiento</small></div></button>
      <nav className={menuOpen ? "nav open" : "nav"}>
        <button className="reportNav" onClick={() => { setSection("denuncia"); setMenuOpen(false); }}>Hacer una denuncia</button>
        <button className={section === "panel" ? "active" : ""} onClick={() => { setSection("panel"); setMenuOpen(false); }}>Panel</button>
        <button className={section === "mapa" ? "active" : ""} onClick={() => { setSection("mapa"); setMenuOpen(false); }}>Mapa operativo</button>
        <button className={section === "publico" ? "active" : ""} onClick={() => { setSection("publico"); setMenuOpen(false); }}>Registro público</button>
      </nav>
      <div className="headerActions"><button className="help"><HelpCircle size={17}/> Ayuda</button><button className="avatar">MR</button><button className="menuButton" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X/> : <Menu/>}</button></div>
    </header>

    <div className="appShell">
      <aside className="sidebar">
        <div className="agency"><div className="agencyIcon"><Building2 size={19}/></div><div><strong>Intendencia de Montevideo</strong><small>Equipo de protección</small></div></div>
        <div className="sideLabel">GESTIÓN</div>
        <button className={section === "panel" ? "sideLink current" : "sideLink"} onClick={() => setSection("panel")}><LayoutDashboard size={18}/> Bandeja de casos</button>
        <button className={section === "mapa" ? "sideLink current" : "sideLink"} onClick={() => setSection("mapa")}><MapPin size={18}/> Mapa operativo</button>
        <button className="sideLink"><FileText size={18}/> Actividad reciente</button>
        <div className="sideLabel space">CONSULTA</div>
        <button className={section === "publico" ? "sideLink current" : "sideLink"} onClick={() => setSection("publico")}><Search size={18}/> Registro público</button>
        <div className="privacy"><ShieldCheck size={18}/><span>Los datos sensibles solo se muestran a personal autorizado.</span></div>
      </aside>

      <section className="content">
        {section === "panel" && <>
          <div className="pageHeading"><div><p className="eyebrow">Lunes, 26 de julio</p><h1>Buenos días, María</h1><p className="subtitle">Hay <b>2 casos que requieren atención hoy</b>.</p></div><button className="primary"><FileText size={18}/> Registrar actuación</button></div>
          <div className="metrics"><Metric label="Casos abiertos" value="24" detail="+3 esta semana"/><Metric label="Sin asignar" value="5" detail="Requieren responsable" accent="amber"/><Metric label="Dentro de plazo" value="91%" detail="Últimos 30 días" accent="green"/><Metric label="Alertas hoy" value="7" detail="2 de prioridad alta" accent="red"/></div>
          <div className="workspace">
            <div className="casePanel"><div className="panelHead"><div><h2>Casos recientes</h2><p>Actualizado hace unos instantes</p></div><button className="textButton">Ver todos <ChevronRight size={16}/></button></div>
              <div className="tools"><div className="search"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por código o ubicación"/></div><button className="filter"><Filter size={17}/> Filtrar</button></div>
              <div className="caseList">{filtered.map(item => <button key={item.id} onClick={() => setSelected(item)} className={selected.id === item.id ? "caseRow selected" : "caseRow"}><div className={`priority ${item.priority.toLowerCase()}`}></div><div className="caseInfo"><strong>{item.title}</strong><span>{item.id} · {item.location}</span></div><Status value={item.status}/><time>{item.time}</time><ChevronRight className="rowChevron" size={17}/></button>)}{filtered.length === 0 && <p className="empty">No encontramos casos con esa búsqueda.</p>}</div>
            </div>
            <CaseDetail item={selected}/>
          </div>
        </>}
        {section === "mapa" && <MapView selected={selected} onPick={setSelected}/>} 
        {section === "publico" && <PublicRegistry onReport={() => setSection("denuncia")}/>} 
        {section === "denuncia" && <ReportForm onBack={() => setSection("publico")}/>} 
      </section>
    </div>
  </main>;
}

function Metric({ label, value, detail, accent = "blue" }: { label: string; value: string; detail: string; accent?: string }) { return <article className={`metric ${accent}`}><p>{label}</p><strong>{value}</strong><span>{detail}</span></article>; }
function CaseDetail({ item }: { item: Case }) { return <aside className="detail"><div className="detailTop"><div><p className="eyebrow">CASO {item.id}</p><h2>{item.title}</h2></div><Status value={item.status}/></div><div className="detailMeta"><div><span>Prioridad</span><b className={item.priority.toLowerCase()}>{item.priority}</b></div><div><span>Recibido</span><b>{item.time}</b></div><div><span>Ubicación</span><b>{item.location}</b></div></div><div className="summary"><h3>Resumen</h3><p>Se recibió una comunicación vinculada a {item.category.toLowerCase()}. El equipo debe validar la información y definir la primera actuación.</p></div><div className="timeline"><div><i></i><span>Ahora</span><b>Asignado al equipo de protección</b></div><div><i></i><span>Hace 18 min</span><b>Comunicación recibida</b></div></div><div className="detailActions"><button className="secondary">Ver caso completo</button><button className="primary">Tomar caso</button></div></aside>; }
function MapView({ selected, onPick }: { selected: Case; onPick: (item: Case) => void }) { return <><div className="pageHeading"><div><p className="eyebrow">VISTA RESTRINGIDA</p><h1>Mapa operativo</h1><p className="subtitle">Ubicaciones aproximadas de casos en curso.</p></div><button className="secondary">Vista por zonas</button></div><div className="mapLayout"><div className="mapCanvas"><div className="mapGrid"></div><div className="mapName nameOne">Montevideo</div><div className="mapName nameTwo">Rambla República</div>{cases.map(item => <button title={item.title} onClick={() => onPick(item)} style={{ left: `${item.x}%`, top: `${item.y}%` }} className={`pin ${item.priority.toLowerCase()} ${selected.id === item.id ? "active" : ""}`} key={item.id}><MapPin size={19}/></button>)}<div className="mapLegend"><span><i className="critical"></i>Crítica</span><span><i className="high"></i>Alta</span><span><i className="medium"></i>Media</span></div></div><CaseDetail item={selected}/></div></>; }
function PublicRegistry({ onReport }: { onReport: () => void }) { const [term, setTerm] = useState(""); const places = ["Hogar Los Aromos", "Residencial del Prado", "Centro Vida Sur"]; return <><div className="publicHero"><div><p className="eyebrow">INFORMACIÓN PÚBLICA</p><h1>Consultá establecimientos registrados</h1><p>Información administrativa disponible para la comunidad. No muestra reportes ni datos personales.</p><button className="reportButton" onClick={onReport}><AlertTriangle size={18}/> Hacer una denuncia</button></div><AlertTriangle size={32}/></div><div className="registry"><div className="registrySearch"><Search size={19}/><input value={term} onChange={e => setTerm(e.target.value)} placeholder="Buscar por nombre o dirección"/><button>Buscar</button></div><p className="results">{places.filter(p => p.toLowerCase().includes(term.toLowerCase())).length} establecimientos encontrados</p>{places.filter(p => p.toLowerCase().includes(term.toLowerCase())).map((place, i) => <article className="place" key={place}><div className="placeIcon"><Building2 size={21}/></div><div><h2>{place}</h2><p>{i === 0 ? "Av. Italia 1240 · Parque Batlle" : i === 1 ? "Av. Lucas Obes 1133 · Prado" : "Bv. Artigas 1821 · Tres Cruces"}</p></div><span className={i === 1 ? "status review" : "status enabled"}>{i === 1 ? "En trámite" : "Habilitado"}</span><ArrowUpRight size={19}/></article>)}</div></>; }
function ReportForm({ onBack }: { onBack: () => void }) { const [step, setStep] = useState(1); const [done, setDone] = useState(false); return <div className="reportPage"><button className="back" onClick={onBack}><ArrowLeft size={17}/> Volver</button>{done ? <div className="success"><ShieldCheck size={36}/><p className="eyebrow">COMUNICACIÓN RECIBIDA</p><h1>Tu denuncia fue registrada</h1><p>Guardá este código para consultar novedades: <b>AE-48291</b></p><button className="primary" onClick={onBack}>Volver al inicio</button></div> : <><div className="reportHeader"><p className="eyebrow">COMUNICACIÓN CIUDADANA</p><h1>Hacer una denuncia</h1><p>Contanos lo esencial. Podés hacerlo sin crear una cuenta.</p></div><div className="emergency"><AlertTriangle size={20}/><div><b>¿Hay peligro inmediato?</b><span>Llamá al 911 o al servicio de emergencia antes de completar este formulario.</span></div></div><div className="stepper"><span className={step >= 1 ? "now" : ""}>1. Situación</span><i></i><span className={step >= 2 ? "now" : ""}>2. Lugar</span><i></i><span className={step >= 3 ? "now" : ""}>3. Contacto</span></div><div className="reportCard">{step === 1 && <><h2>¿Qué está pasando?</h2><p>Elegí la opción más cercana y describí brevemente la situación.</p><div className="choices"><button className="choice selected">Posible negligencia o maltrato</button><button className="choice">Condiciones del establecimiento</button><button className="choice">Otro motivo</button></div><textarea placeholder="Escribí lo que consideres importante..."></textarea></>}{step === 2 && <><h2>¿Dónde ocurrió?</h2><p>Indicanos el establecimiento o una referencia para poder ubicarlo.</p><input placeholder="Nombre del lugar o dirección"/><input placeholder="Barrio o localidad (opcional)"/></>}{step === 3 && <><h2>¿Cómo podemos contactarte?</h2><p>Es opcional. Tus datos no se compartirán con el establecimiento.</p><input placeholder="Nombre (opcional)"/><input placeholder="Teléfono o correo (opcional)"/><label className="check"><input type="checkbox"/> Quiero recibir novedades de esta comunicación.</label></>}<div className="formActions"><button className="secondary" disabled={step === 1} onClick={() => setStep(step - 1)}>Anterior</button><button className="primary" onClick={() => step === 3 ? setDone(true) : setStep(step + 1)}>{step === 3 ? "Enviar denuncia" : <>Continuar <ArrowRight size={17}/></>}</button></div></div></>}</div>; }
