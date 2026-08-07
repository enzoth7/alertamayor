"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useResidenciales } from "../hooks/useResidenciales";
import { ArrowLeft, ArrowRight, Check, HeartHandshake, Info, Printer, RotateCcw, Sparkles, X } from "lucide-react";

type ActorType = "self" | "supporter" | "joint" | null;

const FORM_DEPARTMENTS = [
  "Todos los departamentos",
  "Artigas",
  "Canelones",
  "Cerro Largo",
  "Colonia",
  "Durazno",
  "Flores",
  "Florida",
  "Lavalleja",
  "Maldonado",
  "Montevideo",
  "Paysandú",
  "Río Negro",
  "Rivera",
  "Rocha",
  "Salto",
  "San José",
  "Soriano",
  "Tacuarembó",
  "Treinta y Tres",
];

const STEPS = [
  { id: 1, label: "Quién participa" },
  { id: 2, label: "Mis preferencias" },
  { id: 3, label: "Opciones" },
  { id: 4, label: "Visitas" },
  { id: 5, label: "Decisión e ingreso" },
];

const PREFERENCE_OPTIONS = [
  { id: "location", icon: "📍", label: "Seguir cerca de personas y lugares importantes", help: "Barrio, vínculos, servicios, transporte y actividades habituales." },
  { id: "relationships", icon: "🤝", label: "Recibir visitas y mantener vínculos", help: "Contacto familiar, afectivo y comunitario." },
  { id: "privacy", icon: "🔑", label: "Tener intimidad y espacios propios", help: "Higiene, dormitorio, comunicaciones y objetos personales." },
  { id: "routine", icon: "⏰", label: "Mantener rutinas, horarios y costumbres", help: "Continuidad con la historia de vida y las preferencias." },
  { id: "personalSpace", icon: "🖼️", label: "Llevar objetos y hacer propio el dormitorio", help: "Fotografías, muebles pequeños, ropa y recuerdos." },
  { id: "mobility", icon: "♿", label: "Moverme de forma segura y cómoda", help: "Circulación, baños, accesibilidad y apoyos personalizados." },
  { id: "activities", icon: "🎨", label: "Participar en actividades que me interesen", help: "Opciones con sentido, no actividades impuestas." },
  { id: "rest", icon: "🛋️", label: "Poder descansar o estar a solas", help: "El descanso y la tranquilidad también pueden dar bienestar." },
  { id: "autonomy", icon: "🙋‍♂️", label: "Tomar decisiones sobre mi vida cotidiana", help: "Elegir, opinar, cambiar de idea y acordar apoyos." },
  { id: "costs", icon: "📄", label: "Conocer costos y condiciones por escrito", help: "Servicios incluidos, pagos y cambios de precio." },
  { id: "documents", icon: "📁", label: "Mantener acceso a documentos y dinero", help: "Información personal, jubilación, pasividad y pertenencias." },
  { id: "food", icon: "🥗", label: "Alimentación acorde a gustos y necesidades", help: "Menú visible, preferencias y requerimientos personales." },
];

const CHOICE_CATEGORIES = [
  {
    id: "autonomy",
    title: "Trato, autonomía y participación",
    questions: [
      { id: "autonomy.name", essential: true, source: "Ambas fuentes", text: "¿Las personas son llamadas por su nombre o por el nombre que prefieren?", detail: "La guía pública incluye el trato por el nombre como buena señal; Movimiento ELEPEM vincula el nombre o apodo preferido con identidad y reconocimiento." },
      { id: "autonomy.decisions", essential: true, source: "Movimiento ELEPEM · 2026", text: "¿Se les pregunta qué quieren y pueden ratificar o cambiar decisiones cotidianas?", detail: "La autodeterminación incluye preguntar aun cuando creemos conocer la respuesta y permitir que la persona ratifique o modifique su elección." },
      { id: "autonomy.conversation", essential: false, source: "Movimiento ELEPEM · 2026", text: "¿El personal les habla directamente y las incluye en la conversación?", detail: "La comunicación centrada en la persona supone no ignorarla, permitir que se exprese y ayudarla a sentirse escuchada y valorada." },
      { id: "autonomy.participation", essential: false, source: "Movimiento ELEPEM · 2026", text: "¿Existen espacios para hacer sugerencias y participar en decisiones del establecimiento?", detail: "Movimiento ELEPEM propone espacios formales y cotidianos de participación, además de mecanismos para realizar planteos." },
      { id: "autonomy.supports", essential: true, source: "Criterio del proyecto", text: "¿Los apoyos se adaptan a cada persona sin hacer por ella lo que puede y quiere hacer?", detail: "Este criterio traduce la distinción entre apoyar, acompañar y sustituir decisiones, y la recomendación de evitar la sobreprotección." }
    ]
  },
  {
    id: "life",
    title: "Vida cotidiana, vínculos y actividades",
    questions: [
      { id: "life.location", essential: false, source: "Criterio del proyecto", text: "¿La ubicación permite mantener vínculos y acceder a lugares importantes para la persona?", detail: "Pregunta incorporada para conectar la elección con el proyecto de vida, los vínculos y la inclusión comunitaria." },
      { id: "life.visits", essential: true, source: "Ambas fuentes", text: "¿Los horarios de visita son amplios y se facilita el contacto con familiares y allegados?", detail: "La guía pública considera los horarios amplios una buena señal y las grandes restricciones una señal de atención." },
      { id: "life.communication", essential: false, source: "Ambas fuentes", text: "¿Hay medios y un espacio privado para comunicarse por teléfono o recibir visitas?", detail: "Las fuentes contemplan medios de comunicación elegidos por la persona y un espacio reservado para llamadas y visitas." },
      { id: "life.activities", essential: true, source: "Ambas fuentes", text: "¿Las actividades son variadas y se adaptan a los gustos, posibilidades e intereses de cada persona?", detail: "Las actividades deben relacionarse con los intereses, capacidades y preferencias." },
      { id: "life.rest", essential: true, source: "Movimiento ELEPEM · 2026", text: "¿También se respeta la decisión de descansar, estar a solas o no participar en una actividad?", detail: "Movimiento ELEPEM aclara que descansar, mirar o estar a solas también pueden proporcionar bienestar." },
      { id: "life.menu", essential: false, source: "Sistema de Cuidados · 2019", text: "¿El menú está visible y contempla necesidades y gustos de cada persona?", detail: "La guía pública recomienda que el menú semanal esté a la vista y se confeccione según necesidades y gustos." },
      { id: "life.exit", essential: false, source: "Sistema de Cuidados · 2019", text: "¿La persona puede entrar, salir y mantener comunicación con el exterior con los apoyos que necesite?", detail: "La guía pública incluye la posibilidad de entrar y salir y disponer de medios de comunicación." }
    ]
  },
  {
    id: "privacy",
    title: "Privacidad e intimidad",
    questions: [
      { id: "privacy.hygiene", essential: true, source: "Ambas fuentes", text: "¿Se protege la intimidad durante la higiene y el uso del baño?", detail: "Ambas fuentes destacan puertas cerradas, presencia solo de quienes realizan la atención y respeto del cuerpo y el pudor." },
      { id: "privacy.permission", essential: false, source: "Movimiento ELEPEM · 2026", text: "¿Se avisa y se pide permiso antes de entrar a las habitaciones?", detail: "Movimiento ELEPEM lo incluye expresamente como práctica de respeto de la intimidad espacial." },
      { id: "privacy.storage", essential: false, source: "Ambas fuentes", text: "¿Cada persona tiene un lugar propio para guardar objetos personales?", detail: "Las fuentes contemplan dormitorios personalizados y lugares propios para guardar pertenencias." },
      { id: "privacy.visits", essential: false, source: "Ambas fuentes", text: "¿Hay privacidad para recibir visitas y mantener conversaciones?", detail: "La intimidad con las visitas y la comunicación reservada aparecen en ambas fuentes." },
      { id: "privacy.cameras", essential: true, source: "Sistema de Cuidados · 2019", text: "¿Los dormitorios y baños están libres de cámaras de videovigilancia?", detail: "La guía pública identifica cámaras en espacios privados, como dormitorios o baños, como una mala señal." },
      { id: "privacy.consent", essential: true, source: "Movimiento ELEPEM · 2026", text: "¿Se informa y se solicita consentimiento antes de usar imágenes o compartir información personal?", detail: "El documento de 2026 reconoce a la persona como titular de la información y recomienda no divulgar imágenes sin consentimiento." }
    ]
  },
  {
    id: "space",
    title: "Espacio y accesibilidad",
    questions: [
      { id: "space.light", essential: false, source: "Sistema de Cuidados · 2019", text: "¿Hay ventilación, luz natural y una temperatura adecuada?", detail: "La guía pública incluye ventilación, luz natural, calefacción y refrigeración adecuadas." },
      { id: "space.circulation", essential: true, source: "Sistema de Cuidados · 2019", text: "¿Se puede circular de forma segura y hay espacio suficiente entre las camas?", detail: "La disposición debe permitir una circulación segura y cómoda; camas unidas sin espacio de paso son una señal de atención." },
      { id: "space.bathrooms", essential: true, source: "Sistema de Cuidados · 2019", text: "¿Los baños son suficientes y accesibles para las personas que viven allí?", detail: "La suficiencia y accesibilidad de los baños forma parte de las buenas señales de la guía pública." },
      { id: "space.locks", essential: true, source: "Sistema de Cuidados · 2019", text: "¿Las habitaciones pueden abrirse desde adentro y no tienen trancas o candados externos?", detail: "La guía pública identifica trancas externas o enganches para candados desde afuera como una mala señal." },
      { id: "space.decorate", essential: false, source: "Ambas fuentes", text: "¿La persona puede llevar elementos personales y hacer propio su dormitorio?", detail: "La guía pública menciona decorar el dormitorio; Movimiento ELEPEM propone que la persona participe en los preparativos." },
      { id: "space.signage", essential: false, source: "Sistema de Cuidados · 2019", text: "¿El establecimiento está identificado y la persona responsable permite conocer las instalaciones?", detail: "La guía pública incluye cartelería visible y la posibilidad de recorrer las instalaciones como señales favorables." }
    ]
  },
  {
    id: "care",
    title: "Equipo y cuidados",
    questions: [
      { id: "care.director", essential: true, source: "Sistema de Cuidados · 2019", text: "¿Hay una dirección técnica médica y se informa claramente cómo y cuándo contactarla?", detail: "La ausencia de dirección técnica médica es una señal de atención en la guía pública." },
      { id: "care.training", essential: false, source: "Sistema de Cuidados · 2019", text: "¿El personal está formado para cuidar y cuenta con capacitación en primeros auxilios?", detail: "La formación para el cuidado y los primeros auxilios figuran como buena señal." },
      { id: "care.medication", essential: true, source: "Sistema de Cuidados · 2019", text: "¿La medicación está almacenada de forma adecuada?", detail: "El almacenamiento incorrecto de medicación figura como una mala señal en la guía pública." },
      { id: "care.restraints", essential: false, source: "Sistema de Cuidados · 2019", text: "¿El establecimiento explica si usa medidas físicas de contención, en qué situaciones y con qué controles?", detail: "La guía pública identifica la presencia frecuente de contenciones físicas como señal de atención." },
      { id: "care.diapers", essential: true, source: "Ambas fuentes", text: "¿Los pañales se usan solo cuando existe una razón que lo justifica?", detail: "La guía pública cuestiona el uso 'por precaución' y Movimiento ELEPEM recomienda evitarlo si no existe incontinencia." },
      { id: "care.reference", essential: true, source: "Movimiento ELEPEM · 2026", text: "¿Hay una persona cuidadora referente con quien acordar la comunicación y el seguimiento?", detail: "El documento de 2026 recomienda coordinar con una cuidadora referente para facilitar la comunicación." },
      { id: "care.adaptation", essential: false, source: "Movimiento ELEPEM · 2026", text: "¿Durante la adaptación se escucha a la persona y se ajustan prácticas cuando es necesario?", detail: "Movimiento ELEPEM propone acompañar la adaptación y ajustar apoyos." }
    ]
  },
  {
    id: "contract",
    title: "Contrato, costos y documentación",
    questions: [
      { id: "contract.clear", essential: true, source: "Ambas fuentes", text: "¿El contrato explica con claridad los servicios, costos, forma de pago, derechos y obligaciones?", detail: "La guía pública pide condiciones del servicio y pago explicitadas; el documento de 2026 recomienda revisar el contrato." },
      { id: "contract.consent", essential: false, source: "Movimiento ELEPEM · 2026", text: "¿El contrato y el consentimiento se explican antes de solicitar una firma?", detail: "Movimiento ELEPEM recomienda informar bien su contenido y permitir todas las consultas necesarias antes de firmar." },
      { id: "contract.documents", essential: true, source: "Sistema de Cuidados · 2019", text: "¿La persona mantiene acceso a sus documentos personales y sabe cómo se administrará su dinero?", detail: "La guía pública incluye el acceso a documentos y el manejo de jubilación entre las buenas señales." },
      { id: "contract.proof", essential: true, source: "Sistema de Cuidados · 2019", text: "¿El establecimiento muestra documentación vigente de habilitación o del trámite que corresponda?", detail: "La guía pública recomienda elegir lugares habilitados o en proceso y solicitar documentación probatoria." },
      { id: "contract.questions", essential: false, source: "Movimiento ELEPEM · 2026", text: "¿La persona puede hacer preguntas, pedir una copia y tomarse tiempo para revisar la información?", detail: "El documento de 2026 propone permitir todas las consultas e informar de manera comprensible antes de la firma." }
    ]
  }
];

export function ResidencialesFormView() {
  const { facilities } = useResidenciales();
  const [currentStep, setCurrentStep] = useState(1);
  const [actor, setActor] = useState<ActorType>(null);
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState("Todos los departamentos");
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [visitAnswers, setVisitAnswers] = useState<Record<string, "yes" | "no" | "ask">>({});
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);

  const displayedFacilities = useMemo(() => {
    return facilities.filter((fac) => {
      if (selectedDepartment === "Todos los departamentos") return true;
      const deptLower = selectedDepartment.toLowerCase();
      const locLower = (fac.locality || "").toLowerCase();
      const addrLower = (fac.address || "").toLowerCase();
      const nameLower = (fac.name || "").toLowerCase();
      return (
        locLower.includes(deptLower) ||
        addrLower.includes(deptLower) ||
        nameLower.includes(deptLower)
      );
    });
  }, [facilities, selectedDepartment]);

  const togglePref = (id: string) => {
    setSelectedPreferences((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleFacility = (id: string) => {
    setSelectedFacilities((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const setAnswer = (questionId: string, answer: "yes" | "no" | "ask") => {
    setVisitAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const resetAll = () => {
    setCurrentStep(1);
    setActor(null);
    setSelectedPreferences([]);
    setSelectedDepartment("Todos los departamentos");
    setSelectedFacilities([]);
    setVisitAnswers({});
  };

  return (
    <div className="formViewContainer">
      {/* Barra Superior de Retorno */}
      <div className="formViewTopBar">
        <Link href="/personas/residenciales" className="formViewBackLink">
          <ArrowLeft size={18} /> Volver a Residenciales
        </Link>
      </div>

      <div className="formViewCard">
        {/* Header Principal */}
        <header className="choiceModalHeader">
          <div className="choiceModalTitleBox">
            <h2>Elegir un lugar para vivir</h2>
            <p>
              Ordená preferencias, prepará visitas, registrá lo que pudiste comprobar y revisá la decisión.
              No es un examen ni un ranking: podés dejar preguntas pendientes, volver atrás y cambiar tus respuestas.
            </p>

            <div className="choiceModalSubbar" style={{ justifyContent: "flex-end" }}>
              <button type="button" className="choiceResetBtn" onClick={resetAll}>
                <RotateCcw size={14} /> Empezar de nuevo
              </button>
            </div>
          </div>
        </header>

        {/* Stepper de Progreso */}
        <nav className="choiceStepperNav">
          {STEPS.map((step) => {
            const isActive = step.id === currentStep;
            const isDone = step.id < currentStep;
            return (
              <button
                key={step.id}
                type="button"
                className={`choiceStepBtn ${isActive ? "active" : ""} ${isDone ? "done" : ""}`}
                onClick={() => setCurrentStep(step.id)}
              >
                <span className="stepNum">{isDone ? <Check size={14} /> : step.id}</span>
                <span className="stepLabel">{step.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Cuerpo del Paso Actual */}
        <div className="choiceStepBody">
          {/* PASO 1: QUIÉN PARTICIPA */}
          {currentStep === 1 && (
            <div className="stepContainer">
              <div className="stepHeader">
                <div className="formProgressBarContainer">
                  <div className="formProgressBarTrack">
                    <div className="formProgressBarFill" style={{ width: `${(currentStep / 5) * 100}%` }} />
                  </div>
                  <span className="formProgressText">{Math.round((currentStep / 5) * 100)}% completado</span>
                </div>
                <h3>¿Quién está completando esta guía?</h3>
                <p>
                  La respuesta cambia el modo de acompañar la decisión, pero no cambia un principio:
                  la voluntad y las preferencias de la persona que podría vivir allí deben estar presentes.
                </p>
              </div>

              <div className="actorCardsGrid">
                <button
                  type="button"
                  className={`actorCard ${actor === "self" ? "selected" : ""}`}
                  onClick={() => setActor("self")}
                >
                  <span className="actorNumber">1</span>
                  <strong>La persona que podría vivir allí</strong>
                  <small>Completo la guía desde mis propias preferencias y observaciones.</small>
                </button>

                <button
                  type="button"
                  className={`actorCard ${actor === "supporter" ? "selected" : ""}`}
                  onClick={() => setActor("supporter")}
                >
                  <span className="actorNumber">2</span>
                  <strong>Una persona que la acompaña</strong>
                  <small>Acompaño el proceso y registro la voluntad y las preferencias de la persona.</small>
                </button>

                <button
                  type="button"
                  className={`actorCard ${actor === "joint" ? "selected" : ""}`}
                  onClick={() => setActor("joint")}
                >
                  <span className="actorNumber">3</span>
                  <strong>La completamos en conjunto</strong>
                  <small>Conversamos y registramos las respuestas entre dos o más personas.</small>
                </button>
              </div>

              {actor === "supporter" && (
                <div className="choiceNoticeBox warning">
                  <Info size={18} />
                  <div>
                    <strong>Acompañar no es decidir por la otra persona.</strong>
                    <p>Mantené informada a la persona mayor y asegurate de escuchar sus inquietudes en cada etapa.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PASO 2: MIS PREFERENCIAS */}
          {currentStep === 2 && (
            <div className="stepContainer">
              <div className="stepHeader">
                <div className="formProgressBarContainer">
                  <div className="formProgressBarTrack">
                    <div className="formProgressBarFill" style={{ width: `${(currentStep / 5) * 100}%` }} />
                  </div>
                  <span className="formProgressText">{Math.round((currentStep / 5) * 100)}% completado</span>
                </div>
                <h3>¿Qué es importante para vos?</h3>
                <p>
                  Marcá todo lo que quieras. Estas prioridades se usarán para ordenar preguntas y revisar opciones,
                  no para producir un puntaje automático.
                </p>
              </div>

              <div className="preferencesGrid">
                {PREFERENCE_OPTIONS.map((pref) => {
                  const isSelected = selectedPreferences.includes(pref.id);
                  return (
                    <button
                      key={pref.id}
                      type="button"
                      className={`prefCard ${isSelected ? "selected" : ""}`}
                      onClick={() => togglePref(pref.id)}
                    >
                      <span className="prefIcon">{pref.icon}</span>
                      <div className="prefCopy">
                        <strong>{pref.label}</strong>
                        <small>{pref.help}</small>
                      </div>
                      <span className="prefCheck">{isSelected ? <Check size={14} /> : null}</span>
                    </button>
                  );
                })}
              </div>

              <p className="selectedCounter">
                <strong>{selectedPreferences.length}</strong> preferencias marcadas.
              </p>
            </div>
          )}

          {/* PASO 3: OPCIONES */}
          {currentStep === 3 && (
            <div className="stepContainer">
              <div className="stepHeader">
                <div className="formProgressBarContainer">
                  <div className="formProgressBarTrack">
                    <div className="formProgressBarFill" style={{ width: `${(currentStep / 5) * 100}%` }} />
                  </div>
                  <span className="formProgressText">{Math.round((currentStep / 5) * 100)}% completado</span>
                </div>
                <h3>Seleccionar residenciales para evaluar</h3>
                <p>Elegí de la lista consolidada los establecimientos que querés visitar o consultar.</p>
              </div>

              <div className="formDeptFilterRow" style={{ marginBottom: 20, maxWidth: 360 }}>
                <label
                  htmlFor="formDeptSelect"
                  style={{ display: "block", marginBottom: 6, fontWeight: 800, color: "#134e4a", fontSize: "0.88rem" }}
                >
                  Filtrar por departamento:
                </label>
                <select
                  id="formDeptSelect"
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  style={{
                    width: "100%",
                    height: 42,
                    padding: "0 12px",
                    borderRadius: 10,
                    border: "1.5px solid #99f6e4",
                    background: "#fff",
                    color: "#0f766e",
                    fontWeight: 750,
                    fontSize: "0.88rem",
                  }}
                >
                  {FORM_DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="facilityPickerGrid">
                {displayedFacilities.slice(0, 12).map((fac) => {
                  const isChecked = selectedFacilities.includes(fac.id);
                  return (
                    <button
                      key={fac.id}
                      type="button"
                      className={`facilityPickCard ${isChecked ? "selected" : ""}`}
                      onClick={() => toggleFacility(fac.id)}
                    >
                      <span className="pickCheck">{isChecked ? <Check size={14} /> : null}</span>
                      <div>
                        <strong>{fac.name}</strong>
                        <p>{fac.address} · {fac.locality}</p>
                        <span className="pickBadge">{fac.statusShort}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* PASO 4: VISITAS */}
          {currentStep === 4 && (
            <div className="stepContainer">
              <div className="stepHeader">
                <div className="formProgressBarContainer">
                  <div className="formProgressBarTrack">
                    <div className="formProgressBarFill" style={{ width: `${(currentStep / 5) * 100}%` }} />
                  </div>
                  <span className="formProgressText">{Math.round((currentStep / 5) * 100)}% completado</span>
                </div>
                <h3>Prepará y registrá la visita</h3>
                <p>
                  No hace falta responder todo. “No pude comprobarlo” y “Quiero preguntarlo” son respuestas válidas.
                  Podés volver en otro día u horario para completar la información.
                </p>
              </div>

              <div className="choiceCategoryList" style={{ display: "grid", gap: 14 }}>
                {CHOICE_CATEGORIES.map((cat, ci) => (
                  <details key={cat.id} className="choiceCategoryBlock" defaultOpen={ci === 0} style={{ border: "1px solid #cbd5e1", borderRadius: 14, background: "#fff", overflow: "hidden" }}>
                    <summary style={{ padding: "14px 18px", fontWeight: 800, background: "#f8fafc", color: "#0f172a", cursor: "pointer", fontSize: "0.95rem" }}>
                      {cat.title}
                    </summary>
                    <div className="choiceCategoryQuestions" style={{ padding: 16, display: "grid", gap: 16 }}>
                      {cat.questions.map((q, qi) => {
                        const currentAnswer = visitAnswers[q.id];
                        return (
                          <div key={q.id} className="questionItem" style={{ borderBottom: qi < cat.questions.length - 1 ? "1px solid #e2e8f0" : "none", paddingBottom: 14 }}>
                            <div className="qHeader">
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                <span style={{ background: "#e0f2fe", color: "#0369a1", fontWeight: 900, borderRadius: 6, padding: "2px 8px", fontSize: "0.76rem" }}>
                                  #{qi + 1}
                                </span>
                                <span style={{ fontSize: "0.75rem", color: "#087c70", fontWeight: 800 }}>
                                  {q.source}
                                </span>
                              </div>
                              <h4 style={{ margin: "4px 0 6px", fontSize: "0.92rem", color: "#0f172a", fontWeight: 750, lineHeight: 1.4 }}>{q.text}</h4>
                              <p style={{ margin: 0, fontSize: "0.82rem", color: "#475569", lineHeight: 1.4 }}>{q.detail}</p>
                            </div>
                            <div className="qActions" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                              <button
                                type="button"
                                className={`ansBtn ansYes ${currentAnswer === "yes" ? "active" : ""}`}
                                onClick={() => setAnswer(q.id, "yes")}
                                style={{ padding: "8px 14px", borderRadius: 8, fontSize: "0.82rem", fontWeight: 750, border: "1px solid #cbd5e1", cursor: "pointer", background: currentAnswer === "yes" ? "#dcfce7" : "#fff", color: currentAnswer === "yes" ? "#15803d" : "#475569", borderColor: currentAnswer === "yes" ? "#86efac" : "#cbd5e1" }}
                              >
                                Sí, lo confirmé
                              </button>
                              <button
                                type="button"
                                className={`ansBtn ansNo ${currentAnswer === "no" ? "active" : ""}`}
                                onClick={() => setAnswer(q.id, "no")}
                                style={{ padding: "8px 14px", borderRadius: 8, fontSize: "0.82rem", fontWeight: 750, border: "1px solid #cbd5e1", cursor: "pointer", background: currentAnswer === "no" ? "#fee2e2" : "#fff", color: currentAnswer === "no" ? "#b91c1c" : "#475569", borderColor: currentAnswer === "no" ? "#fca5a5" : "#cbd5e1" }}
                              >
                                No / me preocupó
                              </button>
                              <button
                                type="button"
                                className={`ansBtn ansUnknown ${currentAnswer === "unknown" ? "active" : ""}`}
                                onClick={() => setAnswer(q.id, "unknown")}
                                style={{ padding: "8px 14px", borderRadius: 8, fontSize: "0.82rem", fontWeight: 750, border: "1px solid #cbd5e1", cursor: "pointer", background: currentAnswer === "unknown" ? "#fef3c7" : "#fff", color: currentAnswer === "unknown" ? "#b45309" : "#475569", borderColor: currentAnswer === "unknown" ? "#fcd34d" : "#cbd5e1" }}
                              >
                                No pude comprobarlo
                              </button>
                              <button
                                type="button"
                                className={`ansBtn ansAsk ${currentAnswer === "ask" ? "active" : ""}`}
                                onClick={() => setAnswer(q.id, "ask")}
                                style={{ padding: "8px 14px", borderRadius: 8, fontSize: "0.82rem", fontWeight: 750, border: "1px solid #cbd5e1", cursor: "pointer", background: currentAnswer === "ask" ? "#e0f2fe" : "#fff", color: currentAnswer === "ask" ? "#0369a1" : "#475569", borderColor: currentAnswer === "ask" ? "#7dd3fc" : "#cbd5e1" }}
                              >
                                Quiero preguntarlo
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}

          {/* PASO 5: DECISIÓN E INGRESO */}
          {currentStep === 5 && (
            <div className="stepContainer">
              <div className="stepHeader">
                <div className="formProgressBarContainer">
                  <div className="formProgressBarTrack">
                    <div className="formProgressBarFill" style={{ width: `${(currentStep / 5) * 100}%` }} />
                  </div>
                  <span className="formProgressText">{Math.round((currentStep / 5) * 100)}% completado</span>
                </div>
                <h3>Resumen para conversar en familia</h3>
                <p>Revisá lo completado y prepará la conversación final respetando la voluntad de la persona.</p>
              </div>

              <div className="summaryResultsBox">
                <div className="summarySection">
                  <h4>Participación</h4>
                  <p>
                    {actor === "self" && "Completado por la persona que vivirá allí."}
                    {actor === "supporter" && "Completado por un acompañante con consulta a la persona."}
                    {actor === "joint" && "Completado en conjunto."}
                    {!actor && "Sin especificar."}
                  </p>
                </div>

                <div className="summarySection">
                  <h4>Preferencias destacadas ({selectedPreferences.length})</h4>
                  <div className="summaryTagsRow">
                    {selectedPreferences.map((id) => {
                      const pref = PREFERENCE_OPTIONS.find((p) => p.id === id);
                      return pref ? <span key={id}>{pref.icon} {pref.label}</span> : null;
                    })}
                  </div>
                </div>

                <div className="summarySection">
                  <h4>Residenciales seleccionados ({selectedFacilities.length})</h4>
                  <p>{selectedFacilities.length ? `${selectedFacilities.length} opciones en lista de cotejo` : "Sin residenciales seleccionados aún."}</p>
                </div>

                <div className="summaryActionsRow">
                  <button type="button" className="printSummaryBtn" onClick={() => window.print()}>
                    <Printer size={16} /> Imprimir / Descargar resumen
                  </button>
                  <button type="button" className="supportSummaryBtn" onClick={() => setIsSupportModalOpen(true)}>
                    <HeartHandshake size={16} /> Consultar con un facilitador humano
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer de Navegación del Formulario */}
        <footer className="choiceModalFooter">
          <button
            type="button"
            className="stepBackBtn"
            disabled={currentStep === 1}
            onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
          >
            <ArrowLeft size={16} /> Anterior
          </button>

          <button
            type="button"
            className="stepNextBtn"
            disabled={currentStep === 5}
            onClick={() => setCurrentStep((prev) => Math.min(5, prev + 1))}
          >
            Continuar <ArrowRight size={16} />
          </button>
        </footer>
      </div>

      {/* Modal de Apoyo Humano */}
      {isSupportModalOpen && (
        <div className="activitiesModalBackdrop" onClick={() => setIsSupportModalOpen(false)}>
          <div className="activitiesModalBox" onClick={(e) => e.stopPropagation()}>
            <button className="modalCloseBtn" onClick={() => setIsSupportModalOpen(false)}>
              <X size={20} />
            </button>
            <div className="modalSupportBody">
              <div className="modalEyebrow">Apoyo Institucional</div>
              <h2>Continuar con acompañamiento humano</h2>
              <p>
                Un facilitador de Alerta Mayor / Ibirapitá te ayudará a evaluar opciones, preparar visitas a residenciales y acompañar el proceso sin costo alguno.
              </p>
              <div className="modalSuccessMsg">
                <strong>Canal de apoyo disponible</strong>
                <p>Podés comunicarte directamente al 0800-ELEPEM o solicitar que te llamemos.</p>
                <button type="button" className="modalConfirmBtn" onClick={() => setIsSupportModalOpen(false)}>
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
