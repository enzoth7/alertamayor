import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyFacilityMatch,
  normalizeAddress,
  normalizePhone,
  normalizeText,
  rankFacilityMatches,
  scoreFacilityMatch,
} from "../../lib/facility-matching.mjs";

const existing = {
  id: "ELP-0273",
  name: "Abras",
  department: "Montevideo",
  locality: "Montevideo",
  address: "Gral. Enrique Martínez 2269",
  lat: -34.87161,
  lng: -56.1667868,
};

test("normaliza acentos, abreviaturas y localidad", () => {
  assert.equal(normalizeText("Avda. José Batlle Nº 123"), "av jose batlle 123");
  assert.equal(
    normalizeAddress("General Enrique Martínez 2269, Montevideo", existing),
    "gral enrique martinez 2269",
  );
});

test("una coincidencia exacta queda como probable, pero no verificada", () => {
  const match = scoreFacilityMatch(
    {
      name: "Abras",
      department: "Montevideo",
      locality: "Montevideo",
      address: "General Enrique Martinez 2269",
      lat: -34.87161,
      lng: -56.16679,
    },
    existing,
  );
  assert.ok(match.score >= 0.93);
  assert.equal(classifyFacilityMatch(match), "probable_match");
});

test("un departamento diferente impide el match", () => {
  const match = scoreFacilityMatch(
    { ...existing, id: undefined, department: "Canelones" },
    existing,
  );
  assert.equal(match.departmentConflict, true);
  assert.equal(match.score, 0);
  assert.equal(classifyFacilityMatch(match), "new_candidate");
});

test("la proximidad sin texto compatible no produce coincidencia fuerte", () => {
  const match = scoreFacilityMatch(
    {
      name: "Nombre sin relación",
      department: "Montevideo",
      locality: "Montevideo",
      address: "Otra avenida 9999",
      lat: -34.87161,
      lng: -56.16679,
    },
    existing,
  );
  assert.ok(match.score < 0.62);
});

test("coordenadas ausentes no se interpretan como cero", () => {
  const match = scoreFacilityMatch(
    {
      name: "Otro nombre",
      department: "Montevideo",
      locality: "Montevideo",
      address: "Otra calle 10",
      lat: null,
      lng: null,
    },
    {
      ...existing,
      lat: null,
      lng: null,
    },
  );
  assert.equal(match.distanceMeters, null);
  assert.equal(match.proximityScore, 0);

  const emptyCoordinates = scoreFacilityMatch(
    { ...existing, lat: "", lng: "" },
    { ...existing, lat: "", lng: "" },
  );
  assert.equal(emptyCoordinates.distanceMeters, null);
  assert.equal(emptyCoordinates.proximityScore, 0);
});

test("rankea primero la instalación compatible", () => {
  const ranked = rankFacilityMatches(
    {
      name: "Residencial Abras",
      department: "Montevideo",
      locality: "Montevideo",
      address: "General Enrique Martinez 2269",
      lat: -34.87162,
      lng: -56.16679,
    },
    [
      { ...existing, id: "ELP-OTHER", department: "Canelones" },
      existing,
    ],
    2,
  );
  assert.equal(ranked[0].facility.id, existing.id);
});

test("reconoce un alias conocido solo con señales corroborantes", () => {
  const match = scoreFacilityMatch(
    {
      name: "Casa San José",
      department: "Montevideo",
      locality: "Montevideo",
      address: "Colonia 1550",
      lat: -34.905,
      lng: -56.18,
    },
    {
      id: "ELP-ALIAS",
      name: "Residencial Nueva Vida",
      aliases: ["Casa San Jose"],
      department: "Montevideo",
      locality: "Montevideo",
      address: "Calle Colonia 1550",
      lat: -34.90501,
      lng: -56.18001,
    },
  );
  assert.equal(match.aliasMatch, true);
  assert.equal(classifyFacilityMatch(match), "probable_match");
});

test("un posible traslado no se confirma automáticamente", () => {
  assert.equal(normalizePhone("+598 2 900 1234"), "29001234");
  const match = scoreFacilityMatch(
    {
      name: "Residencial Los Tilos",
      phone: "+598 2 900 1234",
      department: "Montevideo",
      locality: "Montevideo",
      address: "Rivera 1200",
      lat: -34.9,
      lng: -56.16,
    },
    {
      id: "ELP-MOVED",
      name: "Residencial Los Tilos",
      phone: "2900 1234",
      department: "Montevideo",
      locality: "Montevideo",
      address: "Agraciada 4400",
      lat: -34.84,
      lng: -56.23,
    },
  );
  assert.equal(match.phoneExact, true);
  assert.ok(match.score >= 0.55 && match.score < 0.88);
  assert.equal(classifyFacilityMatch(match), "possible_match");
});

test("distingue sucursales de una cadena por dirección", () => {
  const ranked = rankFacilityMatches(
    {
      name: "Residencial Vida",
      department: "Canelones",
      locality: "Las Piedras",
      address: "Artigas 500",
      lat: -34.73,
      lng: -56.22,
    },
    [
      {
        id: "CHAIN-OTHER",
        name: "Residencial Vida",
        department: "Canelones",
        locality: "Las Piedras",
        address: "Artigas 1500",
        lat: -34.75,
        lng: -56.2,
      },
      {
        id: "CHAIN-EXACT",
        name: "Residencial Vida",
        department: "Canelones",
        locality: "Las Piedras",
        address: "Av. Artigas 500",
        lat: -34.73001,
        lng: -56.22001,
      },
    ],
    2,
  );
  assert.equal(ranked[0].facility.id, "CHAIN-EXACT");
  assert.equal(ranked[1].doorNumberConflict, true);
});

test("un homónimo genérico en otra dirección queda separado", () => {
  const match = scoreFacilityMatch(
    {
      name: "Esperanza",
      department: "Maldonado",
      locality: "Maldonado",
      address: "Sarandí 100",
      lat: -34.9,
      lng: -54.95,
    },
    {
      id: "HOMONYM",
      name: "Esperanza",
      department: "Maldonado",
      locality: "Maldonado",
      address: "18 de Julio 2200",
      lat: -34.86,
      lng: -55.0,
    },
  );
  assert.equal(match.genericName, true);
  assert.ok(match.score < 0.55);
  assert.equal(classifyFacilityMatch(match), "new_candidate");
});

test("un falso positivo cercano sin identidad textual queda bajo", () => {
  const match = scoreFacilityMatch(
    {
      name: "Centro Comunal Norte",
      department: "Montevideo",
      locality: "Montevideo",
      address: "Calle Dos 80",
      lat: -34.8716,
      lng: -56.1668,
    },
    existing,
  );
  assert.equal(match.hasStrongIdentity, false);
  assert.ok(match.score < 0.55);
});
