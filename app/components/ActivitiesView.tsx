"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Filter,
  HeartHandshake,
  HelpCircle,
  Info,
  MapPin,
  MessageSquare,
  RotateCcw,
  Search,
  Sparkles,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import ActivityMap from "./ActivityMap";

export interface ActivityItem {
  id: string;
  icon: string;
  category: string;
  title: string;
  place: string;
  zone: string;
  moment: "Entre semana" | "Fin de semana";
  freeOnly: boolean;
  accessible: boolean;
  smallGroups: boolean;
  interests: string[];
  time: string;
  color: string;
  lat: number;
  lng: number;
  description: string;
  organizer: string;
}

export const ACTIVITIES_DATA: ActivityItem[] = [
  {
    id: "act-1",
    icon: "📱",
    category: "TECNOLOGÍA",
    title: "Taller práctico de celular y trámites",
    place: "Ibirapitá Centro",
    zone: "Cordón",
    moment: "Entre semana",
    freeOnly: true,
    accessible: true,
    smallGroups: true,
    interests: ["Aprender"],
    time: "Mié, 10:00 a 11:30",
    color: "#155eef",
    lat: -34.9037,
    lng: -56.1704,
    description: "Aprendé a usar WhatsApp, trámites en línea (BPS, Redpagos), redes sociales y videollamadas con acompañamiento personalizado.",
    organizer: "Ibirapitá & Programa Mayores Conectados",
  },
  {
    id: "act-2",
    icon: "🎨",
    category: "CULTURA",
    title: "Cerámica para principiantes",
    place: "Centro cultural barrial",
    zone: "Parque Rodó",
    moment: "Entre semana",
    freeOnly: true,
    accessible: true,
    smallGroups: true,
    interests: ["Cultura", "Aprender"],
    time: "Jue, 15:00 a 17:00",
    color: "#e83e6f",
    lat: -34.9102,
    lng: -56.1518,
    description: "Espacio de creación plástica y moldeado manual en arcilla. Diseñado para ejercitar la motricidad fina y la expresión artística.",
    organizer: "Colectivo de Arte Barrio Parque Rodó",
  },
  {
    id: "act-3",
    icon: "👟",
    category: "BIENESTAR",
    title: "Caminata suave en la rambla",
    place: "Plaza Trouville",
    zone: "Pocitos",
    moment: "Entre semana",
    freeOnly: true,
    accessible: true,
    smallGroups: true,
    interests: ["Moverme", "Conocer gente"],
    time: "Vie, 09:30 a 10:30",
    color: "#087443",
    lat: -34.9183,
    lng: -56.1577,
    description: "Recorrido de bajo impacto por la rambla de Pocitos con profesores de educación física especializados en personas mayores.",
    organizer: "Red de Salud y Deporte Comunitario",
  },
  {
    id: "act-4",
    icon: "🖌️",
    category: "CULTURA",
    title: "Encuentro de dibujo para adultos",
    place: "Salón de usos múltiples",
    zone: "Ciudad Vieja",
    moment: "Fin de semana",
    freeOnly: true,
    accessible: false,
    smallGroups: true,
    interests: ["Cultura", "Orientación"],
    time: "Sáb, 11:00 a 13:00",
    color: "#6941c6",
    lat: -34.9074,
    lng: -56.2025,
    description: "Taller al aire libre e interior para explorar técnicas de lápiz, acuarela y bosquejo histórico urbano.",
    organizer: "Talleres del Casco Histórico",
  },
  {
    id: "act-5",
    icon: "🎤",
    category: "ARTE",
    title: "Coral del barrio, ensayo abierto",
    place: "Centro cultural Barrio Sur",
    zone: "Barrio Sur",
    moment: "Entre semana",
    freeOnly: true,
    accessible: true,
    smallGroups: true,
    interests: ["Conocer gente", "Cultura"],
    time: "Lun, 18:00 a 20:00",
    color: "#155eef",
    lat: -34.9049,
    lng: -56.1992,
    description: "Ensayos participativos de música popular rioplatense, respiración y canto grupal. No requiere experiencia previa.",
    organizer: "Coral Barrio Sur",
  },
  {
    id: "act-6",
    icon: "⛰️",
    category: "BIENESTAR",
    title: "Caminata guiada al Cerro",
    place: "Parque del Cerro",
    zone: "Cerro",
    moment: "Entre semana",
    freeOnly: true,
    accessible: false,
    smallGroups: false,
    interests: ["Moverme", "Conocer gente"],
    time: "Mar, 08:30 a 09:30",
    color: "#087443",
    lat: -34.8914,
    lng: -56.1923,
    description: "Ascenso suave al mirador de la Fortaleza del Cerro combinando ejercicio aeróbico ligero e historia montevideana.",
    organizer: "Senderismo Cerro Activo",
  },
  {
    id: "act-7",
    icon: "💻",
    category: "APRENDER",
    title: "Aula abierta de herramientas digitales",
    place: "Biblioteca municipal Carrasco",
    zone: "Carrasco",
    moment: "Entre semana",
    freeOnly: true,
    accessible: true,
    smallGroups: true,
    interests: ["Aprender", "Orientación"],
    time: "Mié, 17:00 a 18:30",
    color: "#d97706",
    lat: -34.8864,
    lng: -56.0417,
    description: "Resolución de dudas digitales, uso de tablets Ibirapitá, descarga de aplicaciones útiles y seguridad en internet.",
    organizer: "Biblioteca Municipal Carrasco",
  },
  {
    id: "act-8",
    icon: "☕",
    category: "SOCIAL",
    title: "Mate y charla con vecinos",
    place: "Plaza de los Treinta y Tres",
    zone: "Centro",
    moment: "Fin de semana",
    freeOnly: true,
    accessible: true,
    smallGroups: true,
    interests: ["Conocer gente", "Orientación"],
    time: "Vie, 16:00 a 17:30",
    color: "#155eef",
    lat: -34.8893,
    lng: -56.1761,
    description: "Espacio de integración social, lectura de diarios local, juegos de mesa y rueda de mate comunitaria.",
    organizer: "Asociación Vecinal Centro",
  },
  {
    id: "act-9",
    icon: "🧘",
    category: "BIENESTAR",
    title: "Yoga suave y meditación guiada",
    place: "Centro de Barrio N° 3",
    zone: "Cordón",
    moment: "Entre semana",
    freeOnly: true,
    accessible: true,
    smallGroups: true,
    interests: ["Moverme", "Orientación"],
    time: "Jue, 10:00 a 11:00",
    color: "#087443",
    lat: -34.9015,
    lng: -56.1750,
    description: "Sesión adaptada en silla o mat suave para mejorar flexibilidad, aliviar tensiones y practicar la respiración profunda.",
    organizer: "Espacio Saludable Cordón",
  },
];

const ZONES = ["Todas las zonas", "Cordón", "Centro", "Barrio Sur", "Ciudad Vieja", "Pocitos", "Parque Rodó", "Carrasco", "Cerro"];
const MOMENTS = ["Cualquier momento", "Entre semana", "Fin de semana"];
const INTEREST_OPTIONS = ["Todo", "Moverme", "Aprender", "Cultura", "Conocer gente", "Orientación"];

const QUICK_QUERIES = [
  { label: "Orientarme", value: "Orientación", query: "Necesito orientarme y saber por dónde empezar." },
  { label: "Aprender celular", value: "Aprender", query: "Quiero aprender a usar el celular para comunicarme con mi familia." },
  { label: "Moverme suavemente", value: "Moverme", query: "Busco una actividad suave de movimiento por la mañana cerca de casa." },
  { label: "Conocer gente y cultura", value: "Cultura", query: "Me gustaría conocer gente del barrio y participar en talleres culturales." },
  { label: "Participar en grupo pequeño", value: "Aprender", query: "Quiero una actividad tranquila en grupos pequeños." },
];

export function ActivitiesView({ onHome }: { onHome: () => void }) {
  const [whoFor, setWhoFor] = useState<"Para mí" | "Acompaño a otra persona">("Para mí");
  const [searchText, setSearchText] = useState("");
  const [zone, setZone] = useState("Todas las zonas");
  const [moment, setMoment] = useState("Cualquier momento");
  const [interest, setInterest] = useState("Todo");
  const [freeOnly, setFreeOnly] = useState(false);
  const [accessible, setAccessible] = useState(false);
  const [smallGroups, setSmallGroups] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "mixed" | "map">("mixed");
  const [selectedId, setSelectedId] = useState<string | null>("act-1");
  const [activeModal, setActiveModal] = useState<ActivityItem | null | "support">(null);
  const [sentNotice, setSentNotice] = useState(false);

  // Filtrado reactivo de actividades
  const filteredActivities = useMemo(() => {
    return ACTIVITIES_DATA.filter((act) => {
      if (zone !== "Todas las zonas" && act.zone !== zone) return false;
      if (moment !== "Cualquier momento" && act.moment !== moment) return false;
      if (interest !== "Todo" && !act.interests.includes(interest)) return false;
      if (freeOnly && !act.freeOnly) return false;
      if (accessible && !act.accessible) return false;
      if (smallGroups && !act.smallGroups) return false;

      if (searchText.trim()) {
        const text = searchText.toLowerCase();
        const matchTitle = act.title.toLowerCase().includes(text);
        const matchPlace = act.place.toLowerCase().includes(text);
        const matchCat = act.category.toLowerCase().includes(text);
        const matchZone = act.zone.toLowerCase().includes(text);
        const matchDesc = act.description.toLowerCase().includes(text);
        if (!matchTitle && !matchPlace && !matchCat && !matchZone && !matchDesc) {
          return false;
        }
      }

      return true;
    });
  }, [zone, moment, interest, freeOnly, accessible, smallGroups, searchText]);

  const selectedActivity = useMemo(() => {
    if (!filteredActivities.length) return null;
    return filteredActivities.find((a) => a.id === selectedId) || filteredActivities[0];
  }, [filteredActivities, selectedId]);

  const activeFiltersCount = (zone !== "Todas las zonas" ? 1 : 0) +
    (moment !== "Cualquier momento" ? 1 : 0) +
    (interest !== "Todo" ? 1 : 0) +
    (freeOnly ? 1 : 0) +
    (accessible ? 1 : 0) +
    (smallGroups ? 1 : 0) +
    (searchText ? 1 : 0);

  const clearFilters = () => {
    setZone("Todas las zonas");
    setMoment("Cualquier momento");
    setInterest("Todo");
    setFreeOnly(false);
    setAccessible(false);
    setSmallGroups(false);
    setSearchText("");
  };

  const handleQuickQuery = (item: (typeof QUICK_QUERIES)[0]) => {
    setSearchText(item.query);
    setInterest(item.value);
  };

  return (
    <section className="activitiesSection">
      {/* Header superior */}
      <header className="activitiesHeader">
        <button type="button" className="activitiesBackBtn" onClick={onHome}>
          <ArrowLeft size={18} /> Volver al inicio
        </button>
        <div className="activitiesTitleGroup">
          <div className="eyebrowActivities">
            <Sparkles size={16} /> Módulos +Cerca · Actividades para vos
          </div>
          <h1>Actividades y Encuentros de Cercanía</h1>
          <p className="lead">
            Encontrá propuestas para aprender, moverte, participar y convivir en Montevideo y Canelones.
          </p>
        </div>
      </header>

      {/* Asistente de búsqueda / IA de orientación */}
      <div className="activitiesAssistantPanel">
        <div className="assistantBadge">
          <Sparkles size={16} /> Búsqueda guiada en lenguaje natural
        </div>
        <h2>IA con fuentes y orientación humana</h2>
        <p className="assistantLead">
          Contanos qué actividad estás buscando, en qué horario o barrio, y qué apoyos preferís.
        </p>

        <div className="assistantWhoGroup">
          <span>¿Para quién buscás?</span>
          <div className="chipRow">
            <button
              type="button"
              className={`chipBtn ${whoFor === "Para mí" ? "active" : ""}`}
              onClick={() => setWhoFor("Para mí")}
            >
              Para mí
            </button>
            <button
              type="button"
              className={`chipBtn ${whoFor === "Acompaño a otra persona" ? "active" : ""}`}
              onClick={() => setWhoFor("Acompaño a otra persona")}
            >
              Acompaño a otra persona
            </button>
          </div>
        </div>

        <div className="assistantInputGroup">
          <label htmlFor="naturalQuery">Contá qué estás buscando:</label>
          <textarea
            id="naturalQuery"
            className="assistantTextarea"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Ej.: Vivo en Cordón, me cuesta caminar distancias largas y quiero un taller gratuito de celular..."
          />
        </div>

        <div className="assistantSuggestions">
          <span>Sugerencias rápidas:</span>
          <div className="chipRow">
            {QUICK_QUERIES.map((item) => (
              <button
                key={item.label}
                type="button"
                className={`chipBtn queryChip ${interest === item.value ? "active" : ""}`}
                onClick={() => handleQuickQuery(item)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Barra de control de vista y filtros */}
      <div className="activitiesToolbar">
        <div className="viewSwitchers">
          <button
            type="button"
            className={`viewBtn ${viewMode === "list" ? "active" : ""}`}
            onClick={() => setViewMode("list")}
          >
            Vista de lista
          </button>
          <button
            type="button"
            className={`viewBtn ${viewMode === "mixed" ? "active" : ""}`}
            onClick={() => setViewMode("mixed")}
          >
            Vista mixta (Lista + Mapa)
          </button>
          <button
            type="button"
            className={`viewBtn ${viewMode === "map" ? "active" : ""}`}
            onClick={() => setViewMode("map")}
          >
            Vista solo del mapa
          </button>
        </div>

        {activeFiltersCount > 0 && (
          <button type="button" className="clearFiltersBtn" onClick={clearFilters}>
            <RotateCcw size={15} /> Limpiar filtros ({activeFiltersCount})
          </button>
        )}
      </div>

      {/* Panel principal con filtros + Lista/Mapa */}
      <div className={`activitiesMainLayout view-${viewMode}`}>
        {/* Panel lateral de Filtros Avanzados */}
        {(viewMode === "list" || viewMode === "mixed") && (
          <aside className="filtersSidebar">
            <h3><Filter size={17} /> Filtros</h3>

            <div className="filterBlock">
              <label htmlFor="zoneSelect">Zona / Barrio</label>
              <select id="zoneSelect" value={zone} onChange={(e) => setZone(e.target.value)}>
                {ZONES.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </div>

            <div className="filterBlock">
              <label htmlFor="momentSelect">Momento</label>
              <select id="momentSelect" value={moment} onChange={(e) => setMoment(e.target.value)}>
                {MOMENTS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="filterBlock">
              <span className="filterTitle">Interés</span>
              <div className="interestChips">
                {INTEREST_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className={`interestChip ${interest === opt ? "active" : ""}`}
                    onClick={() => setInterest(opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="filterBlock checkboxesBlock">
              <span className="filterTitle">Preferencias</span>
              <label className="checkboxLabel">
                <input type="checkbox" checked={freeOnly} onChange={(e) => setFreeOnly(e.target.checked)} />
                <span>Solo gratuitas</span>
              </label>
              <label className="checkboxLabel">
                <input type="checkbox" checked={accessible} onChange={(e) => setAccessible(e.target.checked)} />
                <span>Accesibilidad confirmada</span>
              </label>
              <label className="checkboxLabel">
                <input type="checkbox" checked={smallGroups} onChange={(e) => setSmallGroups(e.target.checked)} />
                <span>Grupos pequeños</span>
              </label>
            </div>

            <div className="sidebarSupportNotice">
              <HelpCircle size={18} />
              <p>¿No encontrás lo que buscás? Podés solicitar acompañamiento personalizado.</p>
              <button type="button" className="sidebarSupportBtn" onClick={() => setActiveModal("support")}>
                Pedir acompañamiento
              </button>
            </div>
          </aside>
        )}

        {/* Lista de Tarjetas de Actividades */}
        {(viewMode === "list" || viewMode === "mixed") && (
          <div className="activitiesListContainer">
            <div className="listSummaryHeader">
              <h2>Actividades disponibles ({filteredActivities.length})</h2>
              <span>Montevideo y Canelones</span>
            </div>

            {filteredActivities.length === 0 ? (
              <div className="noResultsBox">
                <Calendar size={38} />
                <p>No se encontraron actividades con las preferencias seleccionadas.</p>
                <button type="button" className="clearFiltersBtn" onClick={clearFilters}>
                  Restablecer filtros
                </button>
              </div>
            ) : (
              <div className="activitiesGrid">
                {filteredActivities.map((act) => {
                  const isSelected = selectedActivity?.id === act.id;
                  return (
                    <article
                      key={act.id}
                      className={`activityCard ${isSelected ? "selected" : ""}`}
                      onClick={() => setSelectedId(act.id)}
                    >
                      <div className="cardBadgeHeader">
                        <span className="catBadge" style={{ color: act.color, borderColor: act.color }}>
                          {act.icon} {act.category}
                        </span>
                        <span className="zoneBadge">{act.zone}</span>
                      </div>
                      <h3>{act.title}</h3>
                      <p className="actPlace">📍 {act.place}</p>
                      <p className="actDesc">{act.description}</p>

                      <div className="actMetaGrid">
                        <div><Clock size={14} /> {act.time}</div>
                        <div><Users size={14} /> {act.organizer}</div>
                      </div>

                      <div className="actTagsRow">
                        {act.freeOnly && <span className="tagChip tagGreen">Gratuito</span>}
                        {act.accessible && <span className="tagChip tagBlue">Accesible</span>}
                        {act.smallGroups && <span className="tagChip tagAmber">Grupos reducidos</span>}
                      </div>

                      <button
                        type="button"
                        className="actDetailBtn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(act.id);
                          setActiveModal(act);
                        }}
                      >
                        Ver detalle y consultar <ChevronRight size={16} />
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Panel con Mapa Interactivo Leaflet */}
        {(viewMode === "mixed" || viewMode === "map") && (
          <div className="mapPanelContainer">
            <div className="mapHeader">
              <h3>📍 Mapa interactivo (+Cerca)</h3>
              <small>{filteredActivities.length} actividades georreferenciadas</small>
            </div>
            <div className="mapFrame">
              <ActivityMap
                activities={filteredActivities}
                selectedId={selectedId}
                onSelect={(id) => setSelectedId(id)}
              />
            </div>
            {selectedActivity && (
              <div className="mapSelectedDetail">
                <div>
                  <strong>{selectedActivity.icon} {selectedActivity.title}</strong>
                  <p>{selectedActivity.place} · {selectedActivity.zone} · {selectedActivity.time}</p>
                </div>
                <button type="button" onClick={() => setActiveModal(selectedActivity)}>
                  Ver detalle
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bloque Informativo de IA Responsable & Integración Ibirapitá */}
      <div className="activitiesInfoGrid">
        <article className="infoCard aiResponsibility">
          <div className="infoIcon"><UserCheck size={26} /></div>
          <h3>Componente de IA Responsable</h3>
          <p className="infoSubtitle">La IA orienta, no toma decisiones autónomas.</p>
          <ol className="infoStepsList">
            <li><strong>1. Recolecta preferencias:</strong> Procesa zona, horarios y accesibilidad.</li>
            <li><strong>2. Ordena alternativas:</strong> Prioriza por cercanía y disponibilidad.</li>
            <li><strong>3. Conduce al apoyo humano:</strong> Presenta los canales de contacto oficial.</li>
          </ol>
        </article>

        <article className="infoCard ibirapitaIntegration">
          <div className="infoIcon"><HeartHandshake size={26} /></div>
          <h3>Integración Propuesta con Ibirapitá</h3>
          <p className="infoSubtitle">La tecnología abre la puerta y el equipo acompaña el proceso.</p>
          <ul className="infoCheckList">
            <li><strong>Acceso:</strong> Desde la web, guías digitales o tablet Ibirapitá.</li>
            <li><strong>Prueba:</strong> Se valida con usuarios reales en centros de barrio.</li>
            <li><strong>Continuidad:</strong> Derivación directa a llamadas o talleres de cercanía.</li>
          </ul>
        </article>
      </div>

      {/* Banner de Acompañamiento Protegido */}
      <div className="activitiesBannerAlert">
        <div>
          <strong>¿La búsqueda requiere ayuda de una persona?</strong>
          <p>Si hay dudas o necesitás un canal guiado, podés solicitar la asistencia de nuestro equipo humano.</p>
        </div>
        <button type="button" onClick={() => setActiveModal("support")}>
          Ir al canal de acompañamiento
        </button>
      </div>

      {/* Modal interactivo de Detalle o Acompañamiento */}
      {activeModal && (
        <div className="activitiesModalBackdrop" onClick={() => { setActiveModal(null); setSentNotice(false); }}>
          <div className="activitiesModalBox" onClick={(e) => e.stopPropagation()}>
            <button className="modalCloseBtn" onClick={() => { setActiveModal(null); setSentNotice(false); }}>
              <X size={20} />
            </button>

            {activeModal === "support" ? (
              <div className="modalSupportBody">
                <div className="modalEyebrow"><HeartHandshake size={18} /> Acompañamiento +Cerca</div>
                <h2>Solicitar ayuda personalizada</h2>
                <p>
                  Completá este formulario simple de demostración para recibir información o ayuda para sumarte a actividades en tu barrio.
                </p>
                {sentNotice ? (
                  <div className="modalSuccessMsg">
                    <CheckCircle2 size={32} />
                    <strong>¡Solicitud de demostración enviada!</strong>
                    <p>Un facilitador de Ibirapitá o Alerta Mayor se comunicará a la brevedad.</p>
                    <button type="button" className="modalConfirmBtn" onClick={() => { setActiveModal(null); setSentNotice(false); }}>
                      Cerrar
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setSentNotice(true);
                    }}
                    className="modalForm"
                  >
                    <label>
                      <span>Tu nombre / Contacto (Ficticio para la demo)</span>
                      <input placeholder="Ej.: María Rodríguez" required />
                    </label>
                    <label>
                      <span>Barrio o zona</span>
                      <input placeholder="Ej.: Cordón / Pocitos" defaultValue={zone !== "Todas las zonas" ? zone : ""} />
                    </label>
                    <label>
                      <span>¿Qué tipo de actividad buscás?</span>
                      <textarea defaultValue={searchText} placeholder="Contanos brevemente qué te gustaría hacer..." />
                    </label>
                    <button type="submit" className="modalSubmitBtn">
                      Enviar consulta de demostración
                    </button>
                  </form>
                )}
              </div>
            ) : (
              <div className="modalDetailBody">
                <div className="modalEyebrow">{activeModal.icon} {activeModal.category}</div>
                <h2>{activeModal.title}</h2>
                <p className="modalPlace">📍 <strong>{activeModal.place}</strong> ({activeModal.zone})</p>

                <div className="modalFacts">
                  <div><strong>Horario:</strong> <span>{activeModal.time}</span></div>
                  <div><strong>Momento:</strong> <span>{activeModal.moment}</span></div>
                  <div><strong>Organiza:</strong> <span>{activeModal.organizer}</span></div>
                  <div><strong>Costo:</strong> <span>{activeModal.freeOnly ? "Gratuito" : "Sin costo"}</span></div>
                </div>

                <p className="modalDescription">{activeModal.description}</p>

                <div className="modalTags">
                  {activeModal.accessible && <span className="tagChip tagBlue">Accesibilidad Confirmada</span>}
                  {activeModal.smallGroups && <span className="tagChip tagAmber">Grupos Pequeños</span>}
                  <span className="tagChip tagGreen">Inscripción Abierta</span>
                </div>

                {sentNotice ? (
                  <div className="modalSuccessMsg">
                    <CheckCircle2 size={28} />
                    <strong>¡Consulta registrada en la demostración!</strong>
                    <p>Se envió la solicitud para participar en {activeModal.title}.</p>
                    <button type="button" className="modalConfirmBtn" onClick={() => { setActiveModal(null); setSentNotice(false); }}>
                      Volver a las actividades
                    </button>
                  </div>
                ) : (
                  <div className="modalActions">
                    <button type="button" className="modalSubmitBtn" onClick={() => setSentNotice(true)}>
                      Inscribirme / Consultar vacante
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
