import assert from "node:assert/strict";
import test from "node:test";
import {
  mapPrivateCandidateToFacility,
  mapPrivateCandidatesToFacilities,
} from "../../lib/private-candidate-map.mjs";

test("convierte un candidato OSM en un punto privado claramente identificado", () => {
  const facility = mapPrivateCandidateToFacility({
    id: "42",
    status: "needs_review",
    name: "hogar ejemplo",
    department: "montevideo",
    locality: "montevideo",
    address: "Calle 1234",
    latitude: -34.9,
    longitude: -56.16,
    evidence_tier: "C",
    sources: [{
      sourceType: "openstreetmap",
      sourceUrl: "https://www.openstreetmap.org/node/42",
      retrievedAt: "2026-08-02T01:00:00.000Z",
    }],
  });

  assert.equal(facility.id, "candidate:42");
  assert.equal(facility.statusGroup, "candidate_private");
  assert.equal(facility.privateCandidate, true);
  assert.equal(facility.privateCandidateEvidenceTier, "C");
  assert.equal(facility.privateCandidateStatus, "needs_review");
  assert.deepEqual(facility.sourceCategories, ["public_maps"]);
  assert.match(facility.sourceLabel, /OpenStreetMap contributors/);
  assert.equal(facility.privateCandidateSourceUrl, "https://www.openstreetmap.org/node/42");
  assert.equal(facility.appDiscovered, false);
  assert.equal(facility.department, "Montevideo");
  assert.equal(facility.locality, "Montevideo");
});

test("omite candidatos sin coordenadas válidas", () => {
  assert.equal(mapPrivateCandidateToFacility({ id: "1", latitude: null, longitude: -56 }), null);
  assert.equal(mapPrivateCandidatesToFacilities([
    { id: "1", latitude: -34.8, longitude: -56.1 },
    { id: "2", latitude: "sin dato", longitude: -56.2 },
  ]).length, 1);
});

test("no conserva URLs con protocolos inseguros", () => {
  const facility = mapPrivateCandidateToFacility({
    id: "3",
    latitude: -34.8,
    longitude: -56.1,
    sources: [{ sourceType: "openstreetmap", sourceUrl: "javascript:alert(1)" }],
  });
  assert.equal(facility.privateCandidateSourceUrl, undefined);
});

test("clasifica Google Maps por procedencia aunque llegue como directorio público", () => {
  const facility = mapPrivateCandidateToFacility({
    id: "4",
    latitude: -32.3,
    longitude: -58.1,
    sources: [{
      sourceType: "public_directory",
      sourceUrl: "https://www.google.com/maps/place/residencial-ejemplo",
    }],
  });
  assert.deepEqual(facility.sourceCategories, ["public_maps"]);
});

test("identifica una coordenada IDE aprobada en la capa privada", () => {
  const facility = mapPrivateCandidateToFacility({
    id: "25",
    status: "verified_new",
    name: "residencial ejemplo",
    latitude: -34.9,
    longitude: -56.1,
    evidence_tier: "B",
    sources: [{
      sourceType: "other",
      sourceLicense: "IDE Uruguay API",
      sourceUrl: "https://direcciones.ide.uy/api/v0/geocode/BusquedaDireccion",
      retrievedAt: "2026-08-04T18:00:00.000Z",
    }],
  });
  assert.match(facility.precisionLabel, /IDE Uruguay aprobada/);
  assert.match(facility.sourceLabel, /revision humana/);
  assert.equal(facility.statusStage, "Candidato privado revisado");
  assert.equal(facility.privateCandidateEvidenceTier, "B");
  assert.deepEqual(facility.sourceCategories, ["other_public"]);
});
