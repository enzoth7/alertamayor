import assert from "node:assert/strict";
import test from "node:test";
import { selectStrictIdeResult } from "../lib/ide-geocoding.mjs";

const candidate = { address: "Sarandí 1192", department: "Paysandú", locality: "Paysandú" };
test("accepts only an exact IDE door, locality and department result", () => {
  const exact = { error: "", puntoY: -32.31, puntoX: -58.08, direccion: { departamento: { nombre_normalizado: "PAYSANDU" }, localidad: { nombre_normalizado: "PAYSANDU" }, numero: { nro_puerta: 1192 } } };
  assert.equal(selectStrictIdeResult([exact], candidate), exact);
  assert.equal(selectStrictIdeResult([{ ...exact, direccion: { ...exact.direccion, numero: { nro_puerta: 1193 } } }], candidate), null);
  assert.equal(selectStrictIdeResult([{ ...exact, error: "APROXIMADO POR CALLE" }], candidate), null);
});
