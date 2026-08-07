"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, HeartHandshake, Info, Printer, RotateCcw, Sparkles, X } from "lucide-react";
import type { Facility } from "./map-types";

type ActorType = "self" | "supporter" | "joint" | null;

interface ChoiceGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  facilities: Facility[];
  onOpenSupport?: () => void;
}

const STEPS = [
  { id: 1, label: "Quién participa" },
  { id: 2, label: "Mis preferencias" },
  { id: 3, label: "Opciones" },
  { id: 4, label: "Visitas" },
  { id: 5, label: "Decisión e ingreso" },
];

const PREFERENCE_OPTIONS = [
  { id: "pref-1", icon: "🏠", label: "Cercanía con mi barrio o familia", help: "Ubicación accesible para recibir visitas frecuentes de seres queridos." },
  { id: "pref-2", icon: "🌳", label: "Espacios al aire libre y jardín", help: "Patio, jardín o terraza para disfrutar del sol y la naturaleza." },
  { id: "pref-3", icon: "🛏️", label: "Habitación individual o intimidad", help: "Espacio propio respetando la privacidad y autonomía personal." },
  { id: "pref-4", icon: "🎨", label: "Actividades recreativas y talleres", help: "Propuestas diarias de cultura, música, juegos y gimnasia." },
  { id: "pref-5", icon: "⏰", label: "Libertad de horarios de visita", help: "Sin restricciones rígidas para ver a familiares y amigos." },
  { id: "pref-6", icon: "🥗", label: "Alimentación personalizada", help: "Menú adaptado a requerimientos nutricionales y gustos." },
  { id: "pref-7", icon: "🩺", label: "Atención de enfermería 24hs", help: "Supervisión de salud continua y administración segura de medicamentos." },
  { id: "pref-8", icon: "♿", label: "Accesibilidad sin escalones", help: "Rampas, pasamanos y baños adaptados para silla de ruedas o andador." },
];

const VISIT_QUESTIONS = [
  { id: "q-1", category: "Trato y convivencia", title: "¿El personal se dirige a la persona con respeto y calidez?", help: "Observá si usan su nombre de preferencia y escuchan sus inquietudes." },
  { id: "q-2", category: "Autonomía", title: "¿Se respetan los horarios de sueño y despertar?", help: "Verificá si la rutina respeta los hábitos personales o es inflexible." },
  { id: "q-3", category: "Espacios", title: "¿Los ambientes tienen luz natural y buena ventilación?", help: "Comprobá limpieza, olores y luz en habitaciones y salas comunes." },
  { id: "q-4", category: "Alimentación", title: "¿El menú semanal es variado y servido a temperatura adecuada?", help: "Podés consultar si se puede elegir entre opciones." },
  { id: "q-5", category: "Vínculos", title: "¿Los familiares pueden ingresar sin aviso previo?", help: "Políticas abiertas de comunicación y contacto con la comunidad." },
];

export function ChoiceGuideModal({ isOpen, onClose, facilities, onOpenSupport }: ChoiceGuideModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [actor, setActor] = useState<ActorType>(null);
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([]);
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [visitAnswers, setVisitAnswers] = useState<Record<string, "yes" | "no" | "ask">>({});

  if (!isOpen) return null;

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
    setSelectedFacilities([]);
    setVisitAnswers({});
  };

  return (
    <div className="choiceModalBackdrop" onClick={onClose}>
      <div className="choiceModalCard" onClick={(e) => e.stopPropagation()}>
        {/* Header de la Guía */}
        <header className="choiceModalHeader">
          <button type="button" className="choiceModalCloseBtn" onClick={onClose} aria-label="Cerrar guía">
            <X size={20} />
          </button>

          <div className="choiceModalTitleBox">
            <span className="choiceModalKicker">
              <Sparkles size={16} /> Guía interactiva para una decisión informada
            </span>
            <h2>Elegir un lugar para vivir</h2>
            <p>
              Ordená preferencias, prepará visitas, registrá lo que pudiste comprobar y revisá la decisión.
              No es un examen ni un ranking: podés dejar preguntas pendientes, volver atrás y cambiar tus respuestas.
            </p>

            <div className="choiceModalTags">
              <span>La persona participa</span>
              <span>Sin puntajes</span>
              <span>Fuentes visibles</span>
              <span>La decisión puede revisarse</span>
              <span>Apoyo humano disponible</span>
            </div>

            <div className="choiceModalSubbar">
              <small>Cambios guardados solo en este navegador</small>
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
                <span className="stepBadge">Paso 1 de 5</span>
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
                <span className="stepBadge">Paso 2 de 5</span>
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
                <span className="stepBadge">Paso 3 de 5</span>
                <h3>Seleccionar residenciales para evaluar</h3>
                <p>Elegí de la lista consolidada los establecimientos que querés visitar o consultar.</p>
              </div>

              <div className="facilityPickerGrid">
                {facilities.slice(0, 8).map((fac) => {
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
                <span className="stepBadge">Paso 4 de 5</span>
                <h3>Guía de preguntas para la visita</h3>
                <p>Aspectos clave para observar e interactuar durante una visita a los residenciales.</p>
              </div>

              <div className="visitQuestionsList">
                {VISIT_QUESTIONS.map((q) => {
                  const currentAnswer = visitAnswers[q.id];
                  return (
                    <div key={q.id} className="questionItem">
                      <div className="qHeader">
                        <span className="qCategory">{q.category}</span>
                        <h4>{q.title}</h4>
                        <p>{q.help}</p>
                      </div>
                      <div className="qActions">
                        <button
                          type="button"
                          className={`ansBtn ansYes ${currentAnswer === "yes" ? "active" : ""}`}
                          onClick={() => setAnswer(q.id, "yes")}
                        >
                          Sí, comprobado
                        </button>
                        <button
                          type="button"
                          className={`ansBtn ansNo ${currentAnswer === "no" ? "active" : ""}`}
                          onClick={() => setAnswer(q.id, "no")}
                        >
                          No se cumple
                        </button>
                        <button
                          type="button"
                          className={`ansBtn ansAsk ${currentAnswer === "ask" ? "active" : ""}`}
                          onClick={() => setAnswer(q.id, "ask")}
                        >
                          A preguntar en visita
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PASO 5: DECISIÓN E INGRESO */}
          {currentStep === 5 && (
            <div className="stepContainer">
              <div className="stepHeader">
                <span className="stepBadge">Paso 5 de 5</span>
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
                  <button
                    type="button"
                    className="printSummaryBtn"
                    onClick={() => window.print()}
                  >
                    <Printer size={16} /> Imprimir / Descargar resumen
                  </button>
                  {onOpenSupport && (
                    <button type="button" className="supportSummaryBtn" onClick={onOpenSupport}>
                      <HeartHandshake size={16} /> Consultar con un facilitador humano
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer de Navegación del Modal */}
        <footer className="choiceModalFooter">
          <button
            type="button"
            className="stepBackBtn"
            disabled={currentStep === 1}
            onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
          >
            <ArrowLeft size={16} /> Anterior
          </button>

          <span>Paso {currentStep} de 5</span>

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
    </div>
  );
}
