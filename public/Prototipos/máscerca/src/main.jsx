import { useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet'
import './style.css'

const VIEW_OPTIONS = [
  { value: 'list', label: 'Vista de lista' },
  { value: 'mixed', label: 'Vista mixta' },
  { value: 'map', label: 'Vista solo del mapa' },
]

const FILTER_DEFAULTS = {
  zone: 'Todas las zonas',
  moment: 'Cualquier momento',
  freeOnly: false,
  accessible: false,
  smallGroups: false,
  interest: 'Todo',
}

const INTEREST_OPTIONS = ['Todo', 'Moverme', 'Aprender', 'Cultura', 'Conocer gente', 'Orientación']
const QUICK_QUERIES = [
  { label: 'Orientarme', value: 'Todo', query: 'Necesito orientarme y saber por dónde empezar.' },
  { label: 'Aprender a usar el celular', value: 'Aprender', query: 'Quiero aprender a usar el celular para comunicarme.' },
  { label: 'Moverme suavemente', value: 'Moverme', query: 'Busco una actividad suave de movimiento por la mañana.' },
  { label: 'Conocer gente y cultura', value: 'Cultura', query: 'Me gustaría conocer gente y participar en actividades culturales.' },
  { label: 'Participar desde casa', value: 'Aprender', query: 'Quiero actividades para participar desde mi casa.' },
]
const ZONES = ['Todas las zonas', 'Cordón', 'Centro', 'Barrio Sur', 'Ciudad Vieja', 'Pocitos', 'Parque Rodo', 'Carrasco', 'Cerro']
const MOMENTS = ['Cualquier momento', 'Entre semana', 'Fin de semana']

const ACTIVITIES = [
  {
    icon: '\u{1F4F1}',
    category: 'TECNOLOGÍA',
    title: 'Taller práctico de celular y trámites',
    place: 'Ibirapitá Centro',
    zone: 'Cordón',
    moment: 'Entre semana',
    freeOnly: true,
    accessible: true,
    smallGroups: true,
    interests: ['Aprender'],
    time: 'Mié, 10:00 a 11:30',
    color: 'blue',
    lat: -34.9037,
    lng: -56.1704,
  },
  {
    icon: '\u{1F3A8}',
    category: 'CULTURA',
    title: 'Cerámica para principiantes',
    place: 'Centro cultural barrial',
    zone: 'Parque Rodo',
    moment: 'Entre semana',
    freeOnly: true,
    accessible: true,
    smallGroups: true,
    interests: ['Cultura', 'Aprender'],
    time: 'Jue, 15:00 a 17:00',
    color: 'rose',
    lat: -34.9102,
    lng: -56.1518,
  },
  {
    icon: '\u{1F463}',
    category: 'BIENESTAR',
    title: 'Caminata suave en la rambla',
    place: 'Plaza Trouville',
    zone: 'Pocitos',
    moment: 'Entre semana',
    freeOnly: true,
    accessible: true,
    smallGroups: true,
    interests: ['Moverme', 'Conocer gente'],
    time: 'Vie, 09:30 a 10:30',
    color: 'green',
    lat: -34.9183,
    lng: -56.1577,
  },
  {
    icon: '\u{1F58C}',
    category: 'CULTURA',
    title: 'Encuentro de dibujo para adultos',
    place: 'Salón de usos múltiples',
    zone: 'Ciudad Vieja',
    moment: 'Fin de semana',
    freeOnly: true,
    accessible: false,
    smallGroups: true,
    interests: ['Cultura', 'Orientación'],
    time: 'Sáb, 11:00 a 13:00',
    color: 'lilac',
    lat: -34.9074,
    lng: -56.2025,
  },
  {
    icon: '\u{1F3A4}',
    category: 'ARTE',
    title: 'Coral del barrio, ensayo abierto',
    place: 'Centro cultural Barrio Sur',
    zone: 'Barrio Sur',
    moment: 'Entre semana',
    freeOnly: true,
    accessible: true,
    smallGroups: true,
    interests: ['Conocer gente', 'Cultura'],
    time: 'Lun, 18:00 a 20:00',
    color: 'blue',
    lat: -34.9049,
    lng: -56.1992,
  },
  {
    icon: '\u{1F344}',
    category: 'BIENESTAR',
    title: 'Caminata guiada al Cerro',
    place: 'Parque Rodo',
    zone: 'Cerro',
    moment: 'Entre semana',
    freeOnly: true,
    accessible: false,
    smallGroups: false,
    interests: ['Moverme', 'Conocer gente'],
    time: 'Mar, 08:30 a 09:30',
    color: 'green',
    lat: -34.8914,
    lng: -56.1923,
  },
  {
    icon: '\u{1F4BB}',
    category: 'APRENDER',
    title: 'Aula abierta de herramientas digitales',
    place: 'Biblioteca municipal Carrasco',
    zone: 'Carrasco',
    moment: 'Entre semana',
    freeOnly: true,
    accessible: true,
    smallGroups: true,
    interests: ['Aprender', 'Orientación'],
    time: 'Mié, 17:00 a 18:30',
    color: 'rose',
    lat: -34.8864,
    lng: -56.0417,
  },
  {
    icon: '\u2615',
    category: 'SOCIAL',
    title: 'Mate y charla con vecinos',
    place: 'Plaza de los Treinta y Tres',
    zone: 'Centro',
    moment: 'Fin de semana',
    freeOnly: true,
    accessible: true,
    smallGroups: true,
    interests: ['Conocer gente', 'Orientación'],
    time: 'Vie, 16:00 a 17:30',
    color: 'blue',
    lat: -34.8893,
    lng: -56.1761,
  },
]

const MVD_CENTER = [-34.901, -56.176]
const centerFromActivity = (activity) => [activity.lat, activity.lng]

function FlyToSelection({ selected }) {
  const map = useMap()
  const last = useRef(selected.title)

  if (selected.title !== last.current) {
    map.flyTo(centerFromActivity(selected), 14, { duration: 1.05 })
    last.current = selected.title
  }

  return null
}

function MapPanel({ selected, onSelect, activities }) {
  return (
    <MapContainer
      className="leaflet-frame"
      center={MVD_CENTER}
      zoom={12}
      scrollWheelZoom={true}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FlyToSelection selected={selected} />
      {activities.map((activity) => (
        <CircleMarker
          key={activity.title}
          center={[activity.lat, activity.lng]}
          radius={selected.title === activity.title ? 10 : 7}
          pathOptions={{
            color: selected.title === activity.title ? '#155eef' : '#008574',
            fillColor: selected.title === activity.title ? '#155eef' : '#008574',
            fillOpacity: selected.title === activity.title ? 1 : 0.9,
          }}
          eventHandlers={{ click: () => onSelect(activity) }}
        >
          <Popup>
            <b>{activity.title}</b>
            <br />
            {activity.time}
          </Popup>
        </CircleMarker>
      ))}
      <CircleMarker
        center={centerFromActivity(selected)}
        radius={16}
        pathOptions={{ color: '#ff7a50', fillColor: '#ff7a50', fillOpacity: 0.95 }}
      />
    </MapContainer>
  )
}

function App() {
  const [selected, setSelected] = useState(ACTIVITIES[0])
  const [notice, setNotice] = useState(false)
  const [viewMode, setViewMode] = useState('mixed')
  const [filters, setFilters] = useState(FILTER_DEFAULTS)
  const [whoFor, setWhoFor] = useState('Para mí')
  const [searchText, setSearchText] = useState('')

  const filteredActivities = useMemo(() => {
    return ACTIVITIES.filter((activity) => {
      if (filters.zone !== 'Todas las zonas' && activity.zone !== filters.zone) {
        return false
      }
      if (filters.moment !== 'Cualquier momento' && activity.moment !== filters.moment) {
        return false
      }
      if (filters.freeOnly && !activity.freeOnly) {
        return false
      }
      if (filters.accessible && !activity.accessible) {
        return false
      }
      if (filters.smallGroups && !activity.smallGroups) {
        return false
      }
      if (filters.interest !== 'Todo' && !activity.interests.includes(filters.interest)) {
        return false
      }
      if (searchText) {
        const text = searchText.toLowerCase()
        const matchTitle = activity.title.toLowerCase().includes(text)
        const matchPlace = activity.place.toLowerCase().includes(text)
        const matchCategory = activity.category.toLowerCase().includes(text)
        if (!matchTitle && !matchPlace && !matchCategory) {
          return false
        }
      }
      return true
    })
  }, [filters, searchText])

  const selectedActivity = useMemo(() => {
    if (!filteredActivities.length) {
      return null
    }
    return filteredActivities.find((activity) => activity.title === selected.title) || filteredActivities[0]
  }, [filteredActivities, selected.title])

  const selectedCategoryCounts = useMemo(
    () =>
      filteredActivities.reduce((acc, activity) => {
        acc[activity.category] = (acc[activity.category] || 0) + 1
        return acc
      }, {}),
    [filteredActivities],
  )

  const handleInterest = (interest) => {
    setFilters((prev) => ({ ...prev, interest }))
  }

  const toggleFilters = (key) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const clearFilters = () => {
    setFilters(FILTER_DEFAULTS)
    setSearchText('')
  }

  const handleWhoFor = (value) => {
    setWhoFor(value)
  }

  const handleQuickQuery = (item) => {
    setSearchText(item.query)
    setFilters((prev) => ({ ...prev, interest: item.value }))
  }

  const runSearch = () => {
    setNotice(true)
  }

  return (
    <>
      <header className="topbar">
        <a className="brand" href="#inicio">
          +Cerca <small>actividades cercanas para vos</small>
        </a>
        <nav>
          <a href="#agenda">Agenda</a>
          <a href="#acompanamiento">Acompañamiento</a>
        </nav>
        <button className="access" onClick={() => setNotice(true)}>
          Accesibilidad
        </button>
      </header>

      <main id="inicio">
        <section className="intro">
          <p className="eyebrow">MÓDULO CERCA</p>
          <h1>Encontrá actividades para aprender, descansar y convivir en Montevideo.</h1>
          <p>Sin complicaciones: una pantalla simple para presentar propuestas cercanas.</p>
        </section>

        <section className="search-panel reveal">
          <div className="search-copy">
            <p className="eyebrow">Prototipo interactivo</p>
            <h2>IA con fuentes y revisión humana</h2>
            <p>
              Integración propuesta con Ibirapitá. Encontrá actividades con sentido para vos.
              Contanos qué actividad estás buscando, cuándo y qué apoyo necesitás. La herramienta organiza
              opciones cercanas, explica por qué aparecen y te permite continuar con una persona.
            </p>
          </div>
          <div className="search-fields">
            <p className="field-title">¿Para quién buscás?</p>
            <div className="chip-row">
              <button className={`chip ${whoFor === 'Para mí' ? 'active' : ''}`} onClick={() => handleWhoFor('Para mí')}>
                Para mí
              </button>
              <button
                className={`chip ${whoFor === 'Acompaño a otra persona' ? 'active' : ''}`}
                onClick={() => handleWhoFor('Acompaño a otra persona')}
              >
                Acompaño a otra persona
              </button>
            </div>
          </div>
          <label className="query-label" htmlFor="queryText">
            Contá qué actividad estás buscando
          </label>
          <textarea
            id="queryText"
            className="query-textarea"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Ej.: Vivo en La Blanqueada, me cuesta caminar y quiero algo gratuito de mañana"
          />
          <div className="field-title">Sugerencias</div>
          <div className="chip-row">
            {QUICK_QUERIES.map((item) => (
              <button
                key={item.label}
                className={`chip query-chip ${filters.interest === item.value ? 'active' : ''}`}
                onClick={() => handleQuickQuery(item)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button className="hero-search-btn" onClick={runSearch}>
            Buscar
          </button>
        </section>

        <div className="view-switch">
          {VIEW_OPTIONS.map((option) => (
            <button
              key={option.value}
              className={`view-btn ${viewMode === option.value ? 'active' : ''}`}
              onClick={() => setViewMode(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <section className={`map-layout ${viewMode}`} id="agenda">
          {(viewMode === 'list' || viewMode === 'mixed') && (
            <aside className="support-card reveal">
              <div className="search-top">
              <p className="eyebrow">TU BÚSQUEDA</p>
                <button className="filter clear" onClick={clearFilters}>
                  Limpiar
                </button>
              </div>
              <h2>Tu búsqueda</h2>
              <div className="filter-block">
                <p className="filter-title">Zona</p>
                <select
                  className="field"
                  value={filters.zone}
                  onChange={(e) => setFilters((prev) => ({ ...prev, zone: e.target.value }))}
                >
                  {ZONES.map((zone) => (
                    <option key={zone} value={zone}>
                      {zone}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-block">
                <p className="filter-title">Momento</p>
                <select
                  className="field"
                  value={filters.moment}
                  onChange={(e) => setFilters((prev) => ({ ...prev, moment: e.target.value }))}
                >
                  {MOMENTS.map((moment) => (
                    <option key={moment} value={moment}>
                      {moment}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-block">
                <p className="filter-title">Preferencias</p>
                <label className="check">
                  <input type="checkbox" checked={filters.freeOnly} onChange={() => toggleFilters('freeOnly')} />
                  Solo gratuitas
                </label>
                <label className="check">
                  <input type="checkbox" checked={filters.accessible} onChange={() => toggleFilters('accessible')} />
                  Accesibilidad confirmada
                </label>
                <label className="check">
                  <input type="checkbox" checked={filters.smallGroups} onChange={() => toggleFilters('smallGroups')} />
                  Grupos pequeños
                </label>
              </div>
              <div className="filter-block">
                <p className="filter-title">Me interesa</p>
                <div className="chip-row">
                  {INTEREST_OPTIONS.map((interest) => (
                    <button
                      key={interest}
                      className={`chip ${filters.interest === interest ? 'active' : ''}`}
                      onClick={() => handleInterest(interest)}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </div>
              <p className="filter-help">
                La búsqueda se complica? Prepará un resumen y continuá por un canal humano propuesto para validar con Ibirapitá.
              </p>
              <button className="notice-button" onClick={() => setNotice(true)}>
                Pedir acompañamiento
              </button>
            </aside>
          )}

          {(viewMode === 'list' || viewMode === 'mixed') && (
            <div className="activity-list reveal">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">ACTIVIDADES CERCA</p>
                  <h2>Esta semana</h2>
                </div>
              </div>
              {filteredActivities.length === 0 ? (
                <div className="no-results">No hay actividades con este filtro.</div>
              ) : (
                filteredActivities.map((activity, index) => (
                  <button
                    key={activity.title}
                    className={`activity ${selectedActivity?.title === activity.title ? 'active' : ''}`}
                    onClick={() => setSelected(activity)}
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    <b className={activity.color}>{activity.icon}</b>
                    <div>
                      <p className="category">
                        {activity.category} · {activity.place}
                      </p>
                      <h3>{activity.title}</h3>
                <small>{activity.time} · Sin costo</small>
                    </div>
                    <strong>{activity.icon}</strong>
                  </button>
                ))
              )}
            </div>
          )}

          {(viewMode === 'mixed' || viewMode === 'map') && (
            <div className="map-panel reveal">
              <div className="map-title">
                <p className="map-label">Montevideo · Mapa real</p>
                <small>
                  {filteredActivities.length} actividades | {Object.keys(selectedCategoryCounts).length} categorías
                </small>
              </div>
              <div className="map-mapwrap">
                {filteredActivities.length === 0 ? (
                  <div className="map-empty">No hay puntos para mostrar con estos filtros.</div>
                ) : (
                  <MapPanel
                    selected={selectedActivity || filteredActivities[0]}
                    onSelect={setSelected}
                    activities={filteredActivities}
                  />
                )}
              </div>
              {selectedActivity ? (
                <article className="map-detail" key={selectedActivity.title}>
                  <div>
                    <h2>{selectedActivity.title}</h2>
                    <p>
                      {selectedActivity.place} · {selectedActivity.time}
                    </p>
                  </div>
                  <button onClick={() => setNotice(true)}>Ver detalle</button>
                </article>
              ) : null}
            </div>
          )}
        </section>

        <section className="information" id="acompanamiento">
          <article className="panel ai-panel reveal">
            <p className="eyebrow">COMPONENTE DE IA RESPONSABLE</p>
            <h2>La IA orienta, no toma decisiones.</h2>
            <p>Te ayuda con lenguaje claro para que la persona tome la decisión final.</p>
            <div className="steps">
              <div>
                <b>1</b>
                <h3>Recolecta preferencias</h3>
                <p>Escucha horario, zona y tipo de actividad.</p>
              </div>
              <div>
                <b>2</b>
                <h3>Ordena alternativas</h3>
                <p>Prioriza distancia y opciones disponibles.</p>
              </div>
              <div>
                <b>3</b>
                <h3>Conduce al apoyo</h3>
                <p>Muestra el siguiente paso con una persona de contacto.</p>
              </div>
            </div>
          </article>
          <article className="panel integration reveal">
            <p className="eyebrow">INTEGRACIÓN PROPUESTA</p>
            <h2>Ibirapitá como puerta de entrada.</h2>
            <p>La tecnología abre la puerta y el apoyo humano acompaña el proceso.</p>
            <ol>
              <li>
                <b>Acceso</b>
                <small>Desde la web, un taller o una guía digital.</small>
              </li>
              <li>
                <b>Prueba</b>
                <small>Se valida con personas reales y se ajusta.</small>
              </li>
              <li>
                <b>Continuidad</b>
                <small>Se integra con llamadas o talleres de cercanía.</small>
              </li>
            </ol>
          </article>
        </section>

        <section className="alert reveal">
          <div>
            <b>¿La búsqueda sigue en curso?</b>
            <p>Si hay dudas, el canal protegido puede derivar a una revisión humana.</p>
          </div>
          <button onClick={() => setNotice(true)}>Ir al canal protegido</button>
        </section>
      </main>

      <footer className="reveal">
        <b>+Cerca</b>
        <p>Landing de presentación con mapa real de Montevideo y varias vistas.</p>
      </footer>

      {notice && (
        <div className="modal" role="dialog" aria-modal="true">
          <article className="reveal">
            <button className="close" aria-label="Cerrar" onClick={() => setNotice(false)}>
              ×
            </button>
            <p className="eyebrow">DEMO</p>
            <h2>Listo</h2>
            <p>En esta versión el botón puede abrir un canal de apoyo o el detalle real.</p>
            <button onClick={() => setNotice(false)}>Volver a la agenda</button>
          </article>
        </div>
      )}
    </>
  )
}

createRoot(document.getElementById('root')).render(<App />)
