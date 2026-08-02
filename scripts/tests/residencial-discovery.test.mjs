import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCandidates,
  normalizeAddress,
  normalizeText,
  redactRestrictedContent,
  scoreMatch,
  shouldMergeDiscoveries,
} from "../lib/residencial-discovery.mjs";

const existing = {
  id: "ELP-0273",
  name: "Abras",
  department: "Montevideo",
  locality: "Montevideo",
  address: "Gral. Enrique Martínez 2269",
  lat: -34.87161,
  lng: -56.1667868,
};

test("normaliza acentos, abreviaturas y la localidad de una dirección", () => {
  assert.equal(normalizeText("Avda. José Batlle Nº 123"), "av jose batlle 123");
  assert.equal(
    normalizeAddress("General Enrique Martínez 2269, Montevideo", existing),
    "gral enrique martinez 2269",
  );
});

test("clasifica una coincidencia de nombre, puerta y coordenadas como segura", () => {
  const match = scoreMatch(
    {
      name: "Residencial Abras",
      department: "Montevideo",
      locality: "Montevideo",
      address: "General Enrique Martinez 2269",
      lat: -34.87162,
      lng: -56.16679,
    },
    existing,
  );
  assert.ok(match.score >= 0.93, `puntaje inesperado: ${match.score}`);
  assert.ok(match.reasons.includes("dirección normalizada exacta"));
});

test("no vincula establecimientos de departamentos diferentes", () => {
  const match = scoreMatch(
    {
      ...existing,
      id: undefined,
      department: "Canelones",
    },
    existing,
  );
  assert.equal(match.score, 0);
});

test("une hallazgos OSM y Google cuando representan el mismo punto", () => {
  const osm = {
    source: "openstreetmap",
    externalId: "node/1",
    googlePlaceId: null,
    name: "Residencial Abras",
    department: "Montevideo",
    locality: "Montevideo",
    address: "General Enrique Martinez 2269",
    lat: -34.87161,
    lng: -56.16679,
  };
  const google = {
    ...osm,
    source: "google_places",
    externalId: "ChIJ-test",
    googlePlaceId: "ChIJ-test",
    name: "Abras Residencial",
  };
  assert.equal(shouldMergeDiscoveries(osm, google), true);
});

test("persiste solo el place_id cuando Places es la única fuente", () => {
  const candidates = buildCandidates(
    [
      {
        source: "google_places",
        externalId: "ChIJ-new",
        googlePlaceId: "ChIJ-new",
        name: "Residencial Ejemplo",
        department: "Montevideo",
        locality: "Montevideo",
        address: "Calle Ejemplo 123",
        phone: "099 000 000",
        websiteUrl: "https://example.test",
        lat: -34.9,
        lng: -56.2,
        sourceUrl: "https://maps.google.test/example",
        queries: ["residencial"],
      },
    ],
    [],
    "2026-07-31T00:00:00.000Z",
  );
  assert.equal(candidates[0].storagePolicy, "google_place_id_only");
  assert.equal(candidates[0].name, null);
  assert.equal(candidates[0].origins[0].sourceUrl, null);
  assert.equal(candidates[0].runtimePreview.name, "Residencial Ejemplo");

  const persisted = redactRestrictedContent(candidates);
  assert.equal("runtimePreview" in persisted[0], false);
  assert.deepEqual(persisted[0].googlePlaceIds, ["ChIJ-new"]);
});

test("marca SerpApi como fuente interna de riesgo contractual", () => {
  const candidates = buildCandidates(
    [
      {
        source: "serpapi",
        externalId: "ChIJ-serpapi",
        googlePlaceId: "ChIJ-serpapi",
        name: "Residencial de prueba",
        department: "Canelones",
        locality: "",
        address: "Calle 1",
        phone: null,
        websiteUrl: null,
        lat: -34.7,
        lng: -56.1,
        sourceUrl: null,
        queries: ["residencial de adultos mayores en Canelones, Uruguay"],
      },
    ],
    [],
    "2026-08-01T00:00:00.000Z",
  );
  assert.equal(candidates[0].storagePolicy, "internal_contract_risk");
  assert.equal(candidates[0].name, "Residencial de prueba");
  assert.deepEqual(candidates[0].googlePlaceIds, ["ChIJ-serpapi"]);
});
