function normalize(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function doorNumber(address) {
  const match = String(address || "").match(/\b(\d{1,5})\b/);
  return match ? Number(match[1]) : null;
}

export function selectStrictIdeResult(results, candidate) {
  const expectedDoor = doorNumber(candidate.address);
  return (Array.isArray(results) ? results : []).find((item) => {
    const result = item && typeof item === "object" ? item : {};
    const address = result.direccion || {};
    const resultDoor = Number(address.numero?.nro_puerta);
    return result.error === ""
      && Number.isFinite(result.puntoY) && Number.isFinite(result.puntoX)
      && normalize(address.departamento?.nombre_normalizado) === normalize(candidate.department)
      && normalize(address.localidad?.nombre_normalizado) === normalize(candidate.locality)
      && (expectedDoor === null || resultDoor === expectedDoor);
  }) || null;
}

export function ideQueryUrl(candidate) {
  const params = new URLSearchParams({ calle: candidate.address, departamento: candidate.department, localidad: candidate.locality });
  return `https://direcciones.ide.uy/api/v0/geocode/BusquedaDireccion?${params}`;
}
