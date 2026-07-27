import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ padding: "60px 20px", textAlign: "center" }}>
      <h2>Página no encontrada</h2>
      <p style={{ color: "#5d6875", marginBottom: "20px" }}>La página que buscás no existe o fue movida.</p>
      <Link href="/" style={{ padding: "10px 18px", background: "#155eef", color: "#fff", borderRadius: "10px", textDecoration: "none", fontWeight: "bold" }}>
        Volver al inicio
      </Link>
    </div>
  );
}
