"use client";

import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Contrast, HeartHandshake, MapPin, Menu, ShieldAlert, Users, X } from "lucide-react";
import UruguayRegistry from "./components/UruguayRegistry";

type View = "inicio" | "orientacion" | "denuncia" | "residenciales" | "equipos" | "aprendizajes" | "fuentes";

const choices = [
  ["🏠", "En su casa o en la comunidad", "Vive sola, con familiares, una persona cuidadora u otras personas."],
  ["🏢", "En un residencial o ELEPEM", "Está alojada de forma permanente o temporal en un establecimiento."],
  ["🏥", "En otro servicio", "Hospital, policlínica, centro de día u otro espacio de cuidado."],
  ["?", "No lo sé", "La persona que consulta no conoce el tipo de lugar."],
];

export default function Home() {
  const [view, setView] = useState<View>("inicio");
  const [menu, setMenu] = useState(false);
  const [contrast, setContrast] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [step, setStep] = useState(1);
  const [setting, setSetting] = useState("");
  const [story, setStory] = useState("");
  const [sent, setSent] = useState(false);
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("view") as View | null;
    if (requested && ["inicio", "orientacion", "denuncia", "residenciales", "equipos", "aprendizajes", "fuentes"].includes(requested)) setView(requested);
  }, []);

  const go = (next: View) => {
    setView(next);
    setMenu(false);
    window.history.replaceState(null, "", next === "inicio" ? "/" : `/?view=${next}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return <main className={`site ${contrast ? "contrast" : ""} ${largeText ? "largeText" : ""}`}>
    <header className="top"><div className="topin">
      <button className="brand" onClick={() => go("inicio")}><span className="brandMark"><HeartHandshake size={20}/></span><span>Cuidados y protección<small>Prototipo académico · nombre por definir</small></span></button>
      <nav className={menu ? "nav open" : "nav"}>{([ ["inicio", "Inicio"], ["orientacion", "Orientación"], ["residenciales", "Residenciales"], ["equipos", "Equipos"], ["aprendizajes", "Aprendizajes"], ["fuentes", "Fuentes"] ] as [View, string][]).map(([key, label]) => <button key={key} className={view === key ? "active" : ""} onClick={() => go(key)}>{label}</button>)}</nav>
      <div className="tools"><button onClick={() => setMenu(!menu)} aria-label="Abrir menú"><Menu size={17}/> Menú</button><button onClick={() => setLargeText(!largeText)}>A+ Texto</button><button onClick={() => setContrast(!contrast)} aria-label="Alternar contraste"><Contrast size={17}/></button></div>
    </div></header>
    <div className="shell">
      <div className="banner"><ShieldAlert size={20}/><span><strong>PROTOTIPO ACADÉMICO</strong> · No recibe ni envía denuncias reales. Los casos, alertas, tareas y aportes son ficticios. Los datos históricos y administrativos muestran su fuente y fecha. No representa un servicio oficial.</span></div>
      {view === "inicio" && <HomeView go={go}/>} 
      {view === "orientacion" && <Orientation story={story} setStory={setStory} go={go}/>} 
      {view === "denuncia" && <Report step={step} setStep={setStep} setting={setting} setSetting={setSetting} sent={sent} setSent={setSent} go={go}/>} 
      {view === "residenciales" && <UruguayRegistry onReport={() => go("denuncia")}/>} 
      {view === "equipos" && <Team/>}
      {view === "aprendizajes" && <Learning/>}
      {view === "fuentes" && <Sources/>}
    </div>
    <button className="quickExit" onClick={() => go("inicio")}><X size={17}/> Salida rápida</button>
  </main>;
}

function HomeView({ go }: { go: (view: View) => void }) {
  const actions: [React.ReactNode, string, string, View, string][] = [
    [<HeartHandshake key="support"/>, "Necesito orientación o apoyo", "No sé por dónde empezar, faltan cuidados o quiero encontrar el canal adecuado.", "orientacion", "amber"],
    [<ShieldAlert key="report"/>, "Quiero comunicar una preocupación", "Puede hacerlo la propia persona, un familiar, vecino, cuidador, trabajador o profesional.", "denuncia", "violet"],
    [<MapPin key="map"/>, "Quiero consultar un residencial", "Ver la etapa administrativa conocida, la fecha de la fuente y antecedentes verificables.", "residenciales", "rose"],
    [<Users key="team"/>, "Trabajo en un equipo u organización", "Registrar entradas, organizar tareas, preparar visitas, derivar y dar seguimiento.", "equipos", "blue"],
  ];

  return <>
    <section className="card hero homeHero">
      <div className="eyebrow">Una entrada sencilla, distintas respuestas</div>
      <h1>¿Qué necesitás hacer?</h1>
      <p className="lead">La herramienta empieza por la necesidad de la persona. Puede orientar, recibir una preocupación, consultar un residencial o ayudar a un equipo a organizar la respuesta.</p>
      <div className="grid actionsGrid homeActions">{actions.map(([icon, title, text, target, tone]) =>
        <button className={`action action-${tone}`} key={title} onClick={() => go(target)}>
          <span className="actionIcon">{icon}</span><span className="actionCopy"><strong>{title}</strong><span>{text}</span></span><ArrowRight className="actionArrow" size={19}/>
        </button>)}</div>
      <div className="actions compactActions"><button className="secondary" onClick={() => go("aprendizajes")}>Ver aprendizajes y participación</button><button className="link" onClick={() => go("fuentes")}>Cómo se usan los datos y las fuentes</button></div>
    </section>
    <div className="grid three principles simplePrinciples">
      <Info tone="rose" icon="?" title="No hace falta saber si es maltrato" text="La persona puede comunicar lo que le preocupa. Un equipo humano distingue después entre violencia, falta de cuidados, riesgo o necesidad de orientación."/>
      <Info tone="amber" icon="🤝" title="La tecnología no reemplaza la respuesta" text="La herramienta ordena información, pero el contacto, la protección y las decisiones siguen en manos de personas responsables."/>
      <Info tone="blue" icon="📊" title="La experiencia vuelve como aprendizaje" text="Solo datos agregados y anonimizados pueden ayudar a investigar barreras y mejorar los servicios."/>
    </div>
  </>;
}
function Orientation({ story, setStory, go }: { story:string; setStory:(s:string)=>void; go:(v:View)=>void }) { const [result, setResult] = useState(""); return <><section className="card"><div className="eyebrow">Orientación inicial</div><h1>¿Qué está pasando?</h1><p className="lead">Elegí la opción más cercana. No hace falta conocer términos jurídicos ni tener una valoración formal de dependencia.</p><div className="grid"><button className="action danger" onClick={() => setResult("En una emergencia real llamá al 911, Bomberos o al servicio de emergencia médica.")}><span className="icon">🚨</span><strong>Hay peligro ahora</strong>Violencia en curso, incendio, lesión grave o falta inmediata de medicación esencial.</button><button className="action" onClick={() => go("denuncia")}><span className="icon">?</span><strong>No sé si esto es maltrato</strong>Quiero contar lo que veo y que una persona me oriente.</button><button className="action" onClick={() => go("denuncia")}><span className="icon">🦶</span><strong>Faltan cuidados o apoyos</strong>La persona necesita ayuda para alimentarse, moverse o tomar medicación.</button><button className="action" onClick={() => setResult("Podés revisar los recursos disponibles y registrar una consulta para evaluación humana.")}><span className="icon">🔎</span><strong>Busco un servicio o apoyo</strong>Necesito saber qué recurso podría corresponder.</button></div>{result && <div className="notice dangerNotice">{result}</div>}</section><div className="grid two gap"><section className="card"><h2>También puedo contarlo con mis palabras</h2><p className="muted">Esta demostración ordena un relato, pero no toma decisiones.</p><label>Escribí o simulá un relato de voz</label><textarea value={story} onChange={e => setStory(e.target.value)} placeholder="Ejemplo ficticio: mi vecina vive sola y no tiene quién la ayude."/><div className="actions"><button className="secondary" onClick={() => setStory("Mi vecina vive sola, se cayó y necesita apoyo con comida y medicación.")}>Simular relato</button><button className="primary" onClick={() => setResult(story ? "Se registraron posibles necesidades de apoyo, alimentación y medicación para revisión humana." : "Primero escribí un relato breve.")}>Ordenar lo que conté</button></div></section><section className="card"><h2>Seguir una comunicación</h2><p className="muted">En un sistema real, el código permite ver si la entrada fue recibida.</p><label>Código de demostración</label><input placeholder="Ej.: DEM-2401"/><button className="primary full">Consultar estado</button></section></div></> }
function Report({ step, setStep, setting, setSetting, sent, setSent, go }: { step:number; setStep:(n:number)=>void; setting:string; setSetting:(s:string)=>void; sent:boolean; setSent:(b:boolean)=>void; go:(v:View)=>void }) { if(sent) return <section className="card success"><CheckCircle2/><div className="eyebrow">Comunicación recibida</div><h1>Expediente ficticio creado</h1><p>El código de demostración es <strong>DEM-48291</strong>. No se envió información a ningún organismo.</p><button className="primary" onClick={() => {setSent(false); setStep(1); go("inicio")}}>Volver al inicio</button></section>; const titles = ["Dónde vive o está habitualmente la persona", "Quién comunica y cómo llegó la alerta", "Apoyos para la vida diaria", "Ubicación", "Qué preocupa", "Señales de urgencia", "Identidad y contacto seguro", "Revisión"]; return <section className="card report"><div className="eyebrow">Consulta, alerta o denuncia</div><h1>Comunicar una preocupación</h1><p className="lead">No hace falta saber si es delito o maltrato. La herramienta prepara una evaluación humana.</p><div className="steps">{titles.map((_, i) => <span className={step === i + 1 ? "current" : step > i + 1 ? "done" : ""} key={i}>{i + 1}</span>)}</div><h2>{titles[step - 1]}</h2>{step === 1 ? <div className="grid two">{choices.map(([icon, title, text]) => <button key={title} className={`choice ${setting === title ? "selected" : ""}`} onClick={() => setSetting(title)}><span>{icon}</span><strong>{title}</strong>{text}</button>)}</div> : step === 5 ? <><p className="muted">Se puede elegir más de una opción. “Reportado” no significa “confirmado”.</p><textarea placeholder="Contá brevemente qué ocurrió. Solo datos ficticios."/></> : step === 8 ? <div className="notice"><strong>Ruta sugerida para evaluación humana</strong><p>Entrada → Revisión humana → Responsable → Tareas y derivaciones</p></div> : <div className="grid two"><div><label>Información para esta etapa</label><input placeholder="Completá si lo conocés"/></div><div><label>Detalle adicional</label><input placeholder="Opcional"/></div></div>}<div className="actions"><button className="secondary" disabled={step === 1} onClick={() => setStep(step - 1)}>Volver</button><button className="primary" disabled={step === 1 && !setting} onClick={() => step === 8 ? setSent(true) : setStep(step + 1)}>{step === 8 ? "Crear expediente ficticio" : <>Continuar <ArrowRight size={17}/></>}</button></div></section> }
function Team() { return <><section className="card"><div className="eyebrow">Herramientas de trabajo</div><h1>¿Qué tarea tenés hoy?</h1><p className="lead">Cada persona ve solo lo necesario para su función. La app conserva el origen de la alerta, tareas y resultado.</p><div className="grid"><Info icon="📥" title="Recibir y gestionar una entrada" text="Registrar llamadas, mensajes, correos y derivaciones."/><Info icon="📋" title="Preparar o registrar una visita" text="Diferenciar una visita de protección de una inspección regulatoria."/><Info icon="⛔" title="Revisar medidas y antecedentes" text="Separar alerta, hallazgo y medida administrativa."/><Info icon="🗃️" title="Trabajar en habilitación" text="Controlar documentación, visitas, plazos y decisiones."/></div></section><section className="card gap"><h2>De una señal a una respuesta</h2><div className="workflow"><span>Entrada</span><b>→</b><span>Revisión humana</span><b>→</b><span>Responsable</span><b>→</b><span>Tareas</span><b>→</b><span>Seguimiento</span></div></section></> }
function Learning(){return <section className="card"><div className="eyebrow">Aprendizajes y participación</div><h1>Mejorar con información agregada</h1><p className="lead">Los aprendizajes sirven para identificar barreras y mejorar las respuestas sin exponer a las personas.</p><div className="grid three"><Info icon="🔒" title="Datos protegidos" text="No se publican relatos ni datos identificatorios."/><Info icon="🧭" title="Barreras detectadas" text="Se registran dificultades de acceso y recorridos de derivación."/><Info icon="🤝" title="Devolución pública" text="Los resultados se comparten en formato agregado."/></div></section>}
function Sources(){return <section className="card"><div className="eyebrow">Datos, fuentes y límites</div><h1>Cómo se usan los datos</h1><p className="lead">El prototipo diferencia información administrativa, antecedentes verificables y alertas pendientes de revisión.</p><div className="source"><strong>Registro y habilitación</strong><span>Fuentes oficiales del MSP y MIDES con su fecha de corte.</span></div><div className="source"><strong>Alertas</strong><span>Información ficticia, institucional y pendiente de verificación humana.</span></div><div className="source"><strong>Antecedentes</strong><span>Solo se muestran cuando existe una fuente verificable.</span></div></section>}
function Info({icon,title,text,tone="blue"}:{icon:React.ReactNode;title:string;text:string;tone?:string}){return <article className={`info info-${tone}`}><span className="infoIcon">{icon}</span><h2>{title}</h2><p>{text}</p></article>}
