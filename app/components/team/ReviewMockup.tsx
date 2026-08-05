import "./ReviewMockup.css";

const mockReviews = [
  {
    residential: "Residencial Los Aromos",
    department: "Paysandú",
    reviews: 12,
    alert: "Patrón a revisar",
    alertTone: "high",
    findings: "Higiene, respuesta del personal",
    reviewedAt: "05/08/2026",
    status: "2ª revisión",
    statusTone: "second",
  },
  {
    residential: "Hogar San José",
    department: "Artigas",
    reviews: 8,
    alert: "Señal revisada",
    alertTone: "medium",
    findings: "Alimentación",
    reviewedAt: "04/08/2026",
    status: "1ª revisión",
    statusTone: "first",
  },
  {
    residential: "Residencial Sol del Este",
    department: "Rocha",
    reviews: 0,
    alert: "Sin información suficiente",
    alertTone: "neutral",
    findings: "—",
    reviewedAt: "03/08/2026",
    status: "Pendiente",
    statusTone: "pending",
  },
] as const;

export function ReviewMockup() {
  return (
    <section className="reviewMockup" aria-labelledby="review-title">
      <header className="reviewMockupHeader">
        <div>
          <span className="reviewMockupEyebrow">Mockup interno · datos ficticios</span>
          <h1 id="review-title">Alertas por experiencias públicas</h1>
          <p>Vista de arquitectura sin backend para equipos autorizados.</p>
        </div>
        <button type="button" disabled title="Disponible cuando se conecte el backend">Exportar</button>
      </header>

      <div className="reviewMockupFilters" aria-label="Filtros de demostración">
        <label><span>Departamento</span><select defaultValue=""><option value="">Todos</option><option>Paysandú</option><option>Artigas</option><option>Rocha</option></select></label>
        <label><span>Nivel de alerta</span><select defaultValue=""><option value="">Todos</option><option>Patrón a revisar</option><option>Señal revisada</option><option>Sin información suficiente</option></select></label>
        <label><span>Estado de revisión</span><select defaultValue=""><option value="">Todos</option><option>1ª revisión</option><option>2ª revisión</option><option>Pendiente</option></select></label>
      </div>

      <div className="reviewMockupTableWrap">
        <table>
          <thead><tr><th>Residencial</th><th>Departamento</th><th>Reseñas analizadas</th><th>Nivel de alerta</th><th>Categorías con hallazgos</th><th>Última revisión</th><th>Estado</th></tr></thead>
          <tbody>{mockReviews.map((review) => (
            <tr key={review.residential}>
              <td><strong>{review.residential}</strong></td>
              <td>{review.department}</td>
              <td className="reviewMockupNumber">{review.reviews}</td>
              <td><span className={`reviewAlert reviewAlert-${review.alertTone}`}>{review.alert}</span></td>
              <td>{review.findings}</td>
              <td>{review.reviewedAt}</td>
              <td><span className={`reviewStatus reviewStatus-${review.statusTone}`}>{review.status}</span></td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      <footer className="reviewMockupFooter">
        <span>Mostrando 1 a 3 de 3 resultados ficticios</span>
        <div aria-label="Paginación de demostración"><button type="button" disabled>‹</button><button type="button" className="active">1</button><button type="button" disabled>›</button></div>
      </footer>
    </section>
  );
}
