"use client";

import dynamic from "next/dynamic";
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
  RotateCcw,
  Sparkles,
  UserCheck,
  Users,
  X,
} from "lucide-react";

const ActivityMap = dynamic(() => import("./ActivityMap"), {
  ssr: false,
  loading: () => <div className="streetMapLoading">Cargando mapa de actividades…</div>,
});

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
    icon: "🗺️",
    category: "RECREACIÓN",
    title: "Búsqueda del tesoro e ir por un helado",
    place: "Costanera y Plaza Constitución",
    zone: "Paysandú",
    moment: "Fin de semana",
    freeOnly: true,
    accessible: true,
    smallGroups: true,
    interests: ["Conocer gente", "Moverme"],
    time: "Sáb, 16:00 a 18:00",
    color: "#d97706",
    lat: -32.3214,
    lng: -58.0756,
    description: "Juego recreativo al aire libre recorriendo la costanera de Paysandú en equipos, finalizando con una degustación de helados artesanales.",
    organizer: "Comisión de Recreación Paysandú",
  },
  {
    id: "act-28",
    icon: "♟️",
    category: "RECREACIÓN",
    title: "Ajedrez en la costanera",
    place: "Plaza de los Recuerdos y Costanera Norte",
    zone: "Paysandú",
    moment: "Entre semana",
    freeOnly: true,
    accessible: true,
    smallGroups: true,
    interests: ["Conocer gente", "Aprender"],
    time: "Mié, 16:30 a 18:30",
    color: "#d97706",
    lat: -32.3160,
    lng: -58.0820,
    description: "Partidas de ajedrez al aire libre frente al río Uruguay con mesas adaptadas y mate compartido.",
    organizer: "Club de Ajedrez Paysandú",
  },
  {
    id: "act-29",
    icon: "🚶",
    category: "BIENESTAR",
    title: "Caminatas por el Trébol",
    place: "Parque y Monumento al Trébol",
    zone: "Paysandú",
    moment: "Fin de semana",
    freeOnly: true,
    accessible: true,
    smallGroups: true,
    interests: ["Moverme"],
    time: "Sáb, 09:00 a 10:30",
    color: "#087443",
    lat: -32.3080,
    lng: -58.0650,
    description: "Recorrido aeróbico suave por los senderos arbolados del Trébol con guía de estiramientos.",
    organizer: "Grupo Caminantes de Paysandú",
  },
  {
    id: "act-2",
    icon: "♨️",
    category: "BIENESTAR",
    title: "Tardes de mate y termas en Daymán",
    place: "Parque Termal Daymán",
    zone: "Salto",
    moment: "Entre semana",
    freeOnly: false,
    accessible: true,
    smallGroups: true,
    interests: ["Moverme", "Conocer gente"],
    time: "Mié, 15:00 a 18:00",
    color: "#087443",
    lat: -31.4633,
    lng: -57.9158,
    description: "Caminata suave y descanso en piscinas termales adaptadas con guía de ejercicios hidroterapéuticos.",
    organizer: "Salto Vital & Turismo Social",
  },
  {
    id: "act-3",
    icon: "🎨",
    category: "CULTURA",
    title: "Acuarela y patrimonio en el Bastión del Carmen",
    place: "Centro Cultural Bastión del Carmen",
    zone: "Colonia",
    moment: "Entre semana",
    freeOnly: true,
    accessible: true,
    smallGroups: true,
    interests: ["Cultura", "Aprender"],
    time: "Jue, 15:00 a 17:00",
    color: "#e83e6f",
    lat: -34.4714,
    lng: -57.8441,
    description: "Taller plástico al aire libre retratando las calles históricas de Colonia del Sacramento.",
    organizer: "Asociación Cultural Colonia",
  },
  {
    id: "act-32",
    icon: "🫙",
    category: "CULTURA",
    title: "Recorrido por bodegas y mermeladas artesanales",
    place: "Colonia Valdense",
    zone: "Colonia",
    moment: "Fin de semana",
    freeOnly: false,
    accessible: true,
    smallGroups: true,
    interests: ["Cultura", "Conocer gente"],
    time: "Sáb, 15:00 a 17:30",
    color: "#e83e6f",
    lat: -34.3390,
    lng: -57.2340,
    description: "Visita a fincas tradicionales de la colectividad valdense con degustación de dulces caseros y té.",
    organizer: "Tradición Valdense Colonia",
  },
  {
    id: "act-33",
    icon: "🎶",
    category: "CULTURA",
    title: "Tarde de tango, coros y merienda en la Plaza Mayor",
    place: "Plaza Mayor, Barrio Histórico",
    zone: "Colonia",
    moment: "Entre semana",
    freeOnly: true,
    accessible: true,
    smallGroups: true,
    interests: ["Cultura", "Conocer gente"],
    time: "Vie, 16:30 a 18:00",
    color: "#e83e6f",
    lat: -34.4720,
    lng: -57.8510,
    description: "Encuentro coral de música rioplatense al aire libre en el casco histórico de Colonia.",
    organizer: "Coro Abuelos de Colonia",
  },
  {
    id: "act-4",
    icon: "🧘",
    category: "BIENESTAR",
    title: "Yoga suave frente al mar en la Mansa",
    place: "Parada 5 de la Mansa",
    zone: "Maldonado",
    moment: "Entre semana",
    freeOnly: true,
    accessible: true,
    smallGroups: true,
    interests: ["Moverme", "Orientación"],
    time: "Lun, 09:30 a 10:30",
    color: "#087443",
    lat: -34.9536,
    lng: -54.9406,
    description: "Sesión de yoga y ejercicios de estiramiento suave con respiración guiada frente a la playa Mansa.",
    organizer: "Deportes e Integración Maldonado",
  },
  {
    id: "act-30",
    icon: "🌲",
    category: "NATURALEZA",
    title: "Caminata y mateada en el Arboreto Lussich",
    place: "Arboreto Lussich, Punta Ballena",
    zone: "Maldonado",
    moment: "Fin de semana",
    freeOnly: true,
    accessible: true,
    smallGroups: true,
    interests: ["Moverme", "Conocer gente"],
    time: "Dom, 10:00 a 12:00",
    color: "#087443",
    lat: -34.8870,
    lng: -55.0340,
    description: "Sendero guiado entre la colección de eucaliptos y bosque nativo con descansos sombreados.",
    organizer: "Amigos de Lussich Maldonado",
  },
  {
    id: "act-31",
    icon: "🏺",
    category: "CULTURA",
    title: "Taller de cerámica y escultura suave",
    place: "Casa de la Cultura de Maldonado",
    zone: "Maldonado",
    moment: "Entre semana",
    freeOnly: true,
    accessible: true,
    smallGroups: true,
    interests: ["Aprender", "Cultura"],
    time: "Mar, 15:00 a 16:30",
    color: "#e83e6f",
    lat: -34.9060,
    lng: -54.9570,
    description: "Modelado básico en arcilla, torneado artesanal y pintura para adultos mayores.",
    organizer: "Cultura Maldonado Senior",
  },
  {
    id: "act-5",
    icon: "🪗",
    category: "CULTURA",
    title: "Música, cuentos y café de frontera",
    place: "Plaza Internacional",
    zone: "Rivera",
    moment: "Fin de semana",
    freeOnly: true,
    accessible: true,
    smallGroups: true,
    interests: ["Conocer gente", "Cultura"],
    time: "Sáb, 17:00 a 19:00",
    color: "#155eef",
    lat: -30.9025,
    lng: -55.5508,
    description: "Rueda de historias binacionales, música popular de frontera y mateada compartida.",
    organizer: "Colectivo Frontera Rivera-Livramento",
  },
  {
    id: "act-6",
    icon: "🦜",
    category: "NATURALEZA",
    title: "Avistamiento de aves y mateada comunitaria",
    place: "Mirador Laguna de Rocha",
    zone: "Rocha",
    moment: "Fin de semana",
    freeOnly: true,
    accessible: false,
    smallGroups: true,
    interests: ["Moverme", "Cultura"],
    time: "Dom, 10:00 a 12:30",
    color: "#087443",
    lat: -34.6215,
    lng: -54.2708,
    description: "Recorrido de baja dificultad por senderos protegidos de Rocha para observación de fauna y avifauna.",
    organizer: "Ecoturismo Rocha",
  },
  {
    id: "act-7",
    icon: "🎸",
    category: "APRENDER",
    title: "Taller de guitarra y folclore criollo",
    place: "Casa de la Cultura Carlos Gardel",
    zone: "Tacuarembó",
    moment: "Entre semana",
    freeOnly: true,
    accessible: true,
    smallGroups: true,
    interests: ["Aprender", "Cultura"],
    time: "Mar, 17:30 a 19:00",
    color: "#6941c6",
    lat: -31.7131,
    lng: -55.9811,
    description: "Introducción al canto y acordes de guitarra tradicional en la tierra de Carlos Gardel.",
    organizer: "Dirección de Cultura Tacuarembó",
  },
  {
    id: "act-8",
    icon: "🧶",
    category: "RECREACIÓN",
    title: "Paseo por la rambla y taller de tejido",
    place: "Paseo 7 de Septiembre",
    zone: "Artigas",
    moment: "Entre semana",
    freeOnly: true,
    accessible: true,
    smallGroups: true,
    interests: ["Conocer gente", "Aprender"],
    time: "Lun, 15:00 a 17:00",
    color: "#d97706",
    lat: -30.4000,
    lng: -56.4667,
    description: "Caminata accesible a orillas del río Cuareim seguida de taller de tejido artesanal en grupo.",
    organizer: "Asociación Social Artigas",
  },
  {
    id: "act-9",
    icon: "🐟",
    category: "RECREACIÓN",
    title: "Pesca recreativa y picnic a orillas del Yí",
    place: "Parque de la Hispanidad",
    zone: "Durazno",
    moment: "Fin de semana",
    freeOnly: true,
    accessible: true,
    smallGroups: true,
    interests: ["Conocer gente", "Moverme"],
    time: "Sáb, 10:00 a 13:00",
    color: "#087443",
    lat: -33.3806,
    lng: -56.5264,
    description: "Jornada de integración al aire libre con actividad de pesca artesanal recreativa y almuerzo compartido.",
    organizer: "Club Náutico Durazno",
  },
  {
    id: "act-10",
    icon: "🌿",
    category: "NATURALEZA",
    title: "Caminata accesible por el Cerro del Verdún",
    place: "Parque UTE-ANTEL y Verdún",
    zone: "Lavalleja",
    moment: "Fin de semana",
    freeOnly: true,
    accessible: true,
    smallGroups: true,
    interests: ["Moverme"],
    time: "Dom, 09:00 a 11:30",
    color: "#087443",
    lat: -34.3758,
    lng: -55.2378,
    description: "Sendero serrano adaptado de bajo impacto en las sierras de Minas con descansos orientados.",
    organizer: "Sierras Saludables Lavalleja",
  },
  {
    id: "act-11",
    icon: "🎭",
    category: "CULTURA",
    title: "Teatro leído y expresión corporal",
    place: "Casa de la Cultura",
    zone: "San José",
    moment: "Entre semana",
    freeOnly: true,
    accessible: true,
    smallGroups: true,
    interests: ["Cultura", "Conocer gente"],
    time: "Mié, 16:30 a 18:00",
    color: "#6941c6",
    lat: -34.3375,
    lng: -56.7136,
    description: "Lectura dramatizada de guiones rioplatenses y dinámicas suaves de expresión escénica.",
    organizer: "Teatro Macció San José",
  },
  {
    id: "act-12",
    icon: "📱",
    category: "TECNOLOGÍA",
    title: "Taller de celular y trámites en línea",
    place: "Biblioteca Municipal",
    zone: "Montevideo",
    moment: "Entre semana",
    freeOnly: true,
    accessible: true,
    smallGroups: true,
    interests: ["Aprender"],
    time: "Mié, 10:00 a 11:30",
    color: "#155eef",
    lat: -34.9037,
    lng: -56.1704,
    description: "Aprender a usar WhatsApp, agendas digitales y realizar consultas de forma práctica.",
    organizer: "Talleres Digitales Montevideo",
  },
  {
    id: "act-13",
    icon: "🤖",
    category: "TECNOLOGÍA",
    title: "Taller de Inteligencia Artificial y ChatGPT",
    place: "Centro Cultural Pocitos",
    zone: "Montevideo",
    moment: "Entre semana",
    freeOnly: false,
    accessible: true,
    smallGroups: true,
    interests: ["Aprender"],
    time: "Mar, 16:00 a 17:30",
    color: "#155eef",
    lat: -34.9150,
    lng: -56.1480,
    description: "Descubrir herramientas de IA generativa de forma sencilla para la vida diaria y entretenimiento.",
    organizer: "Innovación Senior Pocitos",
  },
  {
    id: "act-14",
    icon: "🍷",
    category: "CULTURA",
    title: "Cata de vinos finos y maridaje en cava",
    place: "Cava de Carrasco",
    zone: "Montevideo",
    moment: "Fin de semana",
    freeOnly: false,
    accessible: true,
    smallGroups: true,
    interests: ["Cultura", "Conocer gente"],
    time: "Sáb, 18:30 a 20:30",
    color: "#e83e6f",
    lat: -34.8870,
    lng: -56.0580,
    description: "Degustación guiada por sommelier de cepas nacionales acompanadas de quesos artesanales.",
    organizer: "Club Enológico Carrasco",
  },
  {
    id: "act-15",
    icon: "🌱",
    category: "NATURALEZA",
    title: "Taller de huerta orgánica urbana y compost",
    place: "Jardín Botánico del Prado",
    zone: "Montevideo",
    moment: "Entre semana",
    freeOnly: true,
    accessible: true,
    smallGroups: true,
    interests: ["Aprender", "Moverme"],
    time: "Jue, 10:00 a 12:00",
    color: "#087443",
    lat: -34.8610,
    lng: -56.1980,
    description: "Cultivo de hortalizas de estación, siembra en macetas y técnicas de compostaje en casa.",
    organizer: "Red de Huertas Urbanas",
  },
  {
    id: "act-16",
    icon: "🍲",
    category: "RECREACIÓN",
    title: "Voluntariado en olla comunitaria y cocina",
    place: "Centro Comunitario Cordón",
    zone: "Montevideo",
    moment: "Entre semana",
    freeOnly: true,
    accessible: true,
    smallGroups: false,
    interests: ["Conocer gente"],
    time: "Mié, 11:00 a 14:00",
    color: "#d97706",
    lat: -34.9010,
    lng: -56.1790,
    description: "Apoyo en la preparación y reparto de viandas solidarias de almuerzo para vecinos del barrio.",
    organizer: "Olla Solidaria Cordón",
  },
  {
    id: "act-17",
    icon: "💃",
    category: "CULTURA",
    title: "Taller de tango y milonga de la tarde",
    place: "Mercado de la Abundancia",
    zone: "Montevideo",
    moment: "Entre semana",
    freeOnly: true,
    accessible: true,
    smallGroups: true,
    interests: ["Cultura", "Moverme"],
    time: "Lun, 17:00 a 18:30",
    color: "#e83e6f",
    lat: -34.9050,
    lng: -56.1880,
    description: "Pasos básicos de tango rioplatense, postura y baile guiado con música en vivo.",
    organizer: "Milonga de la Plaza",
  },
  {
    id: "act-18",
    icon: "🧘‍♀️",
    category: "BIENESTAR",
    title: "Pilates y meditación guiada al aire libre",
    place: "Parque Rodó (frente al lago)",
    zone: "Montevideo",
    moment: "Fin de semana",
    freeOnly: true,
    accessible: true,
    smallGroups: true,
    interests: ["Moverme", "Orientación"],
    time: "Sáb, 09:30 a 10:45",
    color: "#087443",
    lat: -34.9140,
    lng: -56.1660,
    description: "Ejercicios suaves de flexibilidad, respiración y relajación en la sombra de las tipas.",
    organizer: "Salud en el Parque",
  },
  {
    id: "act-19",
    icon: "☕",
    category: "RECREACIÓN",
    title: "Taller y degustación de café de especialidad",
    place: "Café de la Costa, Malvín",
    zone: "Montevideo",
    moment: "Entre semana",
    freeOnly: false,
    accessible: true,
    smallGroups: true,
    interests: ["Conocer gente", "Cultura"],
    time: "Mié, 16:30 a 18:00",
    color: "#d97706",
    lat: -34.8940,
    lng: -56.1020,
    description: "Origen del café, filtrados artesanales y maridaje con repostería casera.",
    organizer: "Baristas Malvín",
  },
  {
    id: "act-20",
    icon: "📚",
    category: "APRENDER",
    title: "Club de lectura de literatura latinoamericana",
    place: "Biblioteca Punta Carretas",
    zone: "Montevideo",
    moment: "Entre semana",
    freeOnly: true,
    accessible: true,
    smallGroups: true,
    interests: ["Aprender", "Cultura"],
    time: "Jue, 17:00 a 18:30",
    color: "#6941c6",
    lat: -34.9220,
    lng: -56.1580,
    description: "Encuentro semanal para comentar cuentos y novelas clásicas y contemporáneas.",
    organizer: "Lectores de Punta Carretas",
  },
  {
    id: "act-21",
    icon: "🍲",
    category: "RECREACIÓN",
    title: "Comedor comunitario y cocina de barrio",
    place: "Centro Barrio Cerro",
    zone: "Montevideo",
    moment: "Entre semana",
    freeOnly: true,
    accessible: true,
    smallGroups: false,
    interests: ["Conocer gente"],
    time: "Vie, 11:30 a 13:30",
    color: "#d97706",
    lat: -34.8880,
    lng: -56.2520,
    description: "Elaboración de meriendas comunitarias y espacio de encuentro e integración social.",
    organizer: "Red Comunitaria del Cerro",
  },
  {
    id: "act-22",
    icon: "🌊",
    category: "BIENESTAR",
    title: "Yoga y caminata entre dunas al atardecer",
    place: "Playa Solymar (Bajada 22)",
    zone: "Canelones",
    moment: "Fin de semana",
    freeOnly: true,
    accessible: true,
    smallGroups: true,
    interests: ["Moverme"],
    time: "Sáb, 18:00 a 19:30",
    color: "#087443",
    lat: -34.8250,
    lng: -55.9550,
    description: "Caminata por la costa de Ciudad de la Costa seguida de ejercicios de estiramiento y relajación.",
    organizer: "Costa Activa Canelones",
  },
  {
    id: "act-23",
    icon: "🪴",
    category: "NATURALEZA",
    title: "Taller de plantas medicinales y huerta nativa",
    place: "Centro de Barrio El Pinar",
    zone: "Canelones",
    moment: "Entre semana",
    freeOnly: true,
    accessible: true,
    smallGroups: true,
    interests: ["Aprender"],
    time: "Mar, 15:00 a 16:30",
    color: "#087443",
    lat: -34.7980,
    lng: -55.9020,
    description: "Reconocimiento de aromáticas, infusiones tradicionales y cultivo responsable.",
    organizer: "Eco Pinar Canelones",
  },
  {
    id: "act-24",
    icon: "🎨",
    category: "CULTURA",
    title: "Pintura y acuarela frente al Águila",
    place: "El Águila de Atlántida",
    zone: "Canelones",
    moment: "Fin de semana",
    freeOnly: true,
    accessible: true,
    smallGroups: true,
    interests: ["Cultura", "Aprender"],
    time: "Dom, 15:30 a 17:30",
    color: "#e83e6f",
    lat: -34.7740,
    lng: -55.7580,
    description: "Encuentro de dibujo y pintura paisajística con técnica libre mirando el mar.",
    organizer: "Taller de Arte Atlántida",
  },
  {
    id: "act-25",
    icon: "🍇",
    category: "CULTURA",
    title: "Visita guiada a viñedos y vendimia artesanal",
    place: "Bodega Las Piedras",
    zone: "Canelones",
    moment: "Fin de semana",
    freeOnly: false,
    accessible: true,
    smallGroups: true,
    interests: ["Cultura", "Conocer gente"],
    time: "Sáb, 11:00 a 14:00",
    color: "#e83e6f",
    lat: -34.7290,
    lng: -56.2160,
    description: "Recorrido por viñedos canarios, explicación del proceso de vinificación y almuerzo tradicional.",
    organizer: "Ruta del Vino Canelones",
  },
  {
    id: "act-26",
    icon: "🌱",
    category: "NATURALEZA",
    title: "Huerta comunitaria e intercambio de semillas",
    place: "Plaza Paso Carrasco",
    zone: "Canelones",
    moment: "Entre semana",
    freeOnly: true,
    accessible: true,
    smallGroups: true,
    interests: ["Aprender", "Conocer gente"],
    time: "Jue, 16:00 a 17:30",
    color: "#087443",
    lat: -34.8560,
    lng: -56.0340,
    description: "Trabajo compartido en la huerta del barrio, intercambio de platines y merienda.",
    organizer: "Vecinos en Acción Paso Carrasco",
  },
  {
    id: "act-27",
    icon: "♟️",
    category: "RECREACIÓN",
    title: "Tardes de ajedrez, cartas y merienda",
    place: "Club Social La Blanqueada",
    zone: "Montevideo",
    moment: "Entre semana",
    freeOnly: true,
    accessible: true,
    smallGroups: true,
    interests: ["Conocer gente"],
    time: "Lun, 16:00 a 18:00",
    color: "#d97706",
    lat: -34.8850,
    lng: -56.1550,
    description: "Partidas amistosas de ajedrez, truco y rami con café caliente compartidos entre vecinos.",
    organizer: "Ajedrez La Blanqueada",
  },
];

const ZONES = [
  "Todos los departamentos",
  "Artigas",
  "Canelones",
  "Colonia",
  "Durazno",
  "Florida",
  "Lavalleja",
  "Maldonado",
  "Montevideo",
  "Paysandú",
  "Rivera",
  "Rocha",
  "Salto",
  "San José",
  "Soriano",
  "Tacuarembó",
];
const MOMENTS = ["Cualquier momento", "Entre semana", "Fin de semana"];
const INTEREST_OPTIONS = ["Todo", "Moverme", "Aprender", "Cultura", "Conocer gente", "Orientación"];

const QUICK_QUERIES = [
  { label: "Aprender a usar el celular", value: "Aprender", query: "Aprender a usar el celular" },
  { label: "Moverme suavemente", value: "Moverme", query: "Moverme suavemente" },
  { label: "Conocer gente y cultura", value: "Cultura", query: "Conocer gente y cultura" },
  { label: "Participar desde casa", value: "Aprender", query: "Participar desde casa" },
];

export function ActivitiesView({ onHome }: { onHome: () => void }) {
  const [whoFor, setWhoFor] = useState<"Para mí" | "Acompaño a otra persona">("Para mí");
  const [searchText, setSearchText] = useState("");
  const [zone, setZone] = useState("Todos los departamentos");
  const [moment, setMoment] = useState("Cualquier momento");
  const [interest, setInterest] = useState("Todo");
  const [freeOnly, setFreeOnly] = useState(false);
  const [accessible, setAccessible] = useState(false);
  const [smallGroups, setSmallGroups] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "mixed" | "map">("mixed");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<ActivityItem | null | "support">(null);
  const [sentNotice, setSentNotice] = useState(false);

  // Filtrado reactivo de actividades
  const filteredActivities = useMemo(() => {
    return ACTIVITIES_DATA.filter((act) => {
      if (zone !== "Todos los departamentos" && act.zone !== zone) return false;
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
    return (selectedId ? filteredActivities.find((a) => a.id === selectedId) : null) || filteredActivities[0];
  }, [filteredActivities, selectedId]);

  const activeFiltersCount = (zone !== "Todos los departamentos" ? 1 : 0) +
    (moment !== "Cualquier momento" ? 1 : 0) +
    (interest !== "Todo" ? 1 : 0) +
    (freeOnly ? 1 : 0) +
    (accessible ? 1 : 0) +
    (smallGroups ? 1 : 0) +
    (searchText ? 1 : 0);

  const clearFilters = () => {
    setZone("Todos los departamentos");
    setMoment("Cualquier momento");
    setInterest("Todo");
    setFreeOnly(false);
    setAccessible(false);
    setSmallGroups(false);
    setSearchText("");
    setSelectedId(null);
  };

  const handleQuickQuery = (item: (typeof QUICK_QUERIES)[0]) => {
    setSearchText(item.query);
    setInterest(item.value);
  };

  return (
    <section className="activitiesSection">
      {/* Header / Hero de Actividades */}
      <div className="heroCardActivities">
        <h1>Encontrá actividades que tengan sentido para vos.</h1>
        <p className="heroLead">
          Decí qué te gustaría hacer, cuándo y qué apoyo necesitás. La herramienta organiza opciones cercanas, explica por qué aparecen y te permite continuar con una persona.
        </p>

        <div className="searchBoxHero">
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Ej.: Vivo en La Blanqueada, me cuesta caminar y quiero algo gratuito de mañana"
          />
          <button type="button" className="micBtn" title="Hablar">
            🎙️
          </button>
          <button type="button" className="orientBtn">
            🔍 Orientarme
          </button>
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
            Vista mixta
          </button>
          <button
            type="button"
            className={`viewBtn ${viewMode === "map" ? "active" : ""}`}
            onClick={() => setViewMode("map")}
          >
            Vista solo del mapa
          </button>
        </div>
      </div>

      {/* Panel principal con filtros + Lista/Mapa */}
      <div className={`activitiesMainLayout view-${viewMode}`}>
        {/* Panel lateral de Filtros Avanzados */}
        {(viewMode === "list" || viewMode === "mixed") && (
          <aside className="filtersSidebar">
            <div className="sidebarHeaderRow">
              <h3><Filter size={17} /> Filtros</h3>
              <button
                type="button"
                className="resetFiltersSidebarBtn"
                onClick={clearFilters}
                title="Reiniciar todos los filtros"
              >
                <RotateCcw size={13} /> Reiniciar
              </button>
            </div>

            <div className="filterBlock">
              <label htmlFor="zoneSelect">Departamento</label>
              <select
                id="zoneSelect"
                value={zone}
                onChange={(e) => {
                  setZone(e.target.value);
                  setSelectedId(null);
                }}
              >
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
              <label htmlFor="interestSelect">Interés</label>
              <select id="interestSelect" value={interest} onChange={(e) => setInterest(e.target.value)}>
                {INTEREST_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === "Todo" ? "Todos los intereses" : opt}
                  </option>
                ))}
              </select>
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
          </aside>
        )}

        {/* Lista de Tarjetas de Actividades */}
        {(viewMode === "list" || viewMode === "mixed") && (
          <div className="activitiesListContainer">
            <div className="listSummaryHeader">
              <h2>Actividades disponibles ({filteredActivities.length})</h2>
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
                        Ver detalle <ChevronRight size={16} />
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
              <h3>📍 Mapa de Actividades</h3>
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
