"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, ChevronDown, Contrast, ExternalLink, HeartHandshake, MapPin, Menu, ShieldAlert, Users, X } from "lucide-react";
import UruguayRegistry from "./UruguayRegistry";

export type View = "inicio" | "orientacion" | "denuncia" | "residenciales" | "equipos" | "aprendizajes" | "fuentes";

const viewPaths: Record<View, string> = {
  inicio: "/",
  orientacion: "/orientacion",
  denuncia: "/denuncia",
  residenciales: "/residenciales",
  equipos: "/equipos",
  aprendizajes: "/aprendizajes",
  fuentes: "/fuentes",
};

const choices = [
  ["🏠", "En su casa o en la comunidad", "Vive sola, con familiares, una persona cuidadora u otras personas."],
  ["🏢", "En un residencial o ELEPEM", "Está alojada de forma permanente o temporal en un establecimiento."],
  ["🏥", "En otro servicio", "Hospital, policlínica, centro de día u otro espacio de cuidado."],
  ["?", "No lo sé", "La persona que consulta no conoce el tipo de lugar."],
];

export function AppShell({ initialView }: { initialView: View }) {
  const router = useRouter();
  const view = initialView;
  const [menu, setMenu] = useState(false);
  const [contrast, setContrast] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [step, setStep] = useState(1);
  const [setting, setSetting] = useState("");
  const [story, setStory] = useState("");
  const [sent, setSent] = useState(false);
  const go = (next: View) => {
    setMenu(false);
    router.push(viewPaths[next]);
  };

  return <main className={`site ${contrast ? "contrast" : ""} ${largeText ? "largeText" : ""}`}>
    <header className="top"><div className="topin">
      <button className="brand" onClick={() => go("inicio")}><img src="/alertamayor.png" alt="Alerta mayor" className="brandLogo" /><span>Alerta mayor</span></button>
      <nav className={menu ? "nav open" : "nav"}>{([ ["inicio", "Inicio"], ["orientacion", "Orientación"], ["residenciales", "Residenciales"], ["equipos", "Equipos"], ["aprendizajes", "Aprendizajes"], ["fuentes", "Fuentes"] ] as [View, string][]).map(([key, label]) => <button key={key} className={view === key ? "active" : ""} onClick={() => go(key)}>{label}</button>)}</nav>
      <div className="tools"><button className="menuToggle" onClick={() => setMenu(!menu)} aria-label="Abrir menú"><Menu size={17}/> Menú</button><button onClick={() => setLargeText(!largeText)}>A+ Texto</button><button onClick={() => setContrast(!contrast)} aria-label="Alternar contraste"><Contrast size={17}/></button></div>
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
function Learning(){
  const [gapSaved, setGapSaved] = useState(false);
  const [contributionSaved, setContributionSaved] = useState(false);
  const kpis = [
    ["47,7%", "de las consultas del informe IM–CIEn fueron realizadas por terceras personas."],
    ["26,8%", "fue clasificado inicialmente como riesgo alto."],
    ["28,5%", "no correspondió finalmente a violencia o no cumplió criterios del servicio."],
    ["17,0%", "de las formas declaradas correspondió a negligencia o abandono."],
  ];
  const levels = [
    ["Expediente personal", "Solo el equipo responsable y los organismos autorizados."],
    ["Gestión institucional", "La información mínima que cada rol necesita para actuar."],
    ["Investigación autorizada", "Datos anonimizados, con protocolo, propósito y control de acceso."],
    ["Información pública", "Indicadores agregados, fuentes, tiempos y resultados no identificables."],
  ];

  return <>
    <section className="card learningHeader">
      <div className="eyebrow">Datos agregados, participación y mejora</div>
      <h1>¿Qué podemos aprender sin exponer a las personas?</h1>
      <p className="lead">La información operativa no se publica como expediente. Solo datos anonimizados y agregados pueden utilizarse para investigar, mejorar respuestas y devolver resultados a la sociedad.</p>
      <div className="learningKpis">{kpis.map(([value, label], index) => <article className={`learningKpi learningKpi-${index + 1}`} key={value}><b>{value}</b><span>{label}</span></article>)}</div>
    </section>

    <div className="learningForms">
      <form className="card learningForm" onSubmit={(event) => { event.preventDefault(); setGapSaved(true); }}>
        <h2>Registrar una brecha sin respuesta</h2>
        <p className="muted">Para equipos y organizaciones: deja constancia de un problema estructural sin convertirlo automáticamente en un caso individual.</p>
        <label>Tipo de barrera<select><option>No hay servicio disponible</option><option>El servicio no tiene cupos</option><option>Ningún organismo acepta la competencia</option><option>La derivación no tuvo respuesta</option><option>Falta transporte o acompañamiento</option><option>No existe un contacto seguro</option><option>Otra barrera</option></select></label>
        <label>Territorio o ámbito<input placeholder="Ej.: Pando; domicilio; ELEPEM; Montevideo"/></label>
        <label>Descripción breve, sin datos personales<textarea placeholder="Explicá qué impidió la respuesta."/></label>
        <button className="primary" type="submit">Guardar brecha ficticia</button>
        {gapSaved && <div className="learningSuccess" aria-live="polite"><CheckCircle2 size={18}/> Brecha ficticia guardada para análisis agregado.</div>}
      </form>

      <form className="card learningForm" onSubmit={(event) => { event.preventDefault(); setContributionSaved(true); }}>
        <h2>Aporte colectivo</h2>
        <p className="muted">Personas mayores, residentes, familiares u organizaciones pueden plantear un tema común, una propuesta o una dificultad repetida.</p>
        <label>Quién aporta<select><option>Grupo de personas mayores</option><option>Residentes de un ELEPEM</option><option>Familiares</option><option>Organización social</option><option>Equipo territorial</option><option>Otro colectivo</option></select></label>
        <label>Tema<select><option>Participación y decisiones cotidianas</option><option>Acceso a cuidados</option><option>Derechos en ELEPEM</option><option>Servicios y territorio</option><option>Inclusión digital</option><option>Información y comunicación</option><option>Otro</option></select></label>
        <label>Aporte o propuesta<textarea placeholder="Ejemplo ficticio: queremos poder hablar en privado con el profesional social y participar en la organización de las visitas."/></label>
        <button className="primary" type="submit">Guardar aporte ficticio</button>
        {contributionSaved && <div className="learningSuccess" aria-live="polite"><CheckCircle2 size={18}/> Aporte ficticio guardado para devolución colectiva.</div>}
      </form>
    </div>

    <section className="card learningLevels">
      <h2>Cuatro niveles de información</h2>
      <div className="dataLevels">{levels.map(([title, text]) => <article key={title}><strong>{title}</strong><p>{text}</p></article>)}</div>
      <div className="learningRoute">{["Experiencia", "Anonimización", "Análisis", "Devolución pública", "Mejora"].map((label, index, items) => <span className="learningRouteStep" key={label}>{label}{index < items.length - 1 && <b>→</b>}</span>)}</div>
    </section>
  </>;
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

    <SourceAccordion title="Fuentes principales" icon="📋" defaultOpen={true} delay={100}>
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
            <li>Que "no figura" significa clandestino.</li>
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
function Info({icon,title,text,tone="blue"}:{icon:React.ReactNode;title:string;text:string;tone?:string}){return <article className={`info info-${tone}`}><span className="infoIcon">{icon}</span><h2>{title}</h2><p>{text}</p></article>}
