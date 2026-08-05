# InvestigaciÃ³n pÃºblica de ELEPEM â€” Departamento de Rocha

**Fecha de investigaciÃ³n:** 2026-08-03  
**Alcance:** todo el departamento de Rocha.  
**Referencia histÃ³rica de cobertura del proyecto:** 43 ELEPEM.  
**Ãndice de exclusiÃ³n utilizado:** `known_facilities_exclusion_index_2026-08-03.json`.

## Resultado ejecutivo

La investigaciÃ³n revisÃ³ **18 registros o casos de control**:

- **7 candidatos actuales probables y con direcciÃ³n**;
- **1 pista con direcciÃ³n que necesita una fuente actual independiente**;
- **2 pistas actuales sin direcciÃ³n exacta**;
- **4 posibles mudanzas, cambios de nombre o reutilizaciones de domicilio**;
- **2 establecimientos ya conocidos encontrados durante la bÃºsqueda**;
- **1 servicio excluido porque su descripciÃ³n pÃºblica no corresponde claramente a ELEPEM**;
- **1 falso positivo de Argentina**.

NingÃºn registro tiene coordenadas verificadas en este archivo y ninguno es apto
para publicaciÃ³n automÃ¡tica.

## Hallazgo crÃ­tico sobre el Ã­ndice nacional

La auditorÃ­a del Ã­ndice informa **953 entradas nacionales**, de las cuales solo
**5 estÃ¡n etiquetadas como Rocha**. Sin embargo, una nÃ³mina pÃºblica histÃ³rica de
2019 contiene **28 registros nominales o fÃ­sicos del departamento**.

Eso significa que el Ã­ndice actual es Ãºtil, pero su cobertura departamental de
Rocha estÃ¡ incompleta. Antes de afirmar que un hallazgo es nuevo, Codex debe
compararlo tambiÃ©n contra los 28 registros histÃ³ricos incorporados en el JSON.

Esta correcciÃ³n no convierte los 28 registros en establecimientos actuales:
la lista es histÃ³rica y puede incluir cierres, mudanzas, cambios de nombre o
reutilizaciÃ³n de inmuebles.

## Candidatos actuales probables

| Establecimiento | Localidad | DirecciÃ³n observada | ClasificaciÃ³n | Evidencia | Confianza |
|---|---|---|---|---|---|
| Residencial OrquÃ­deas | Rocha | Francisco de los Santos 134 | `probable_new_current` | B | high |
| Nuevo Renacer | Rocha | 25 de Mayo 140, esquina Treinta y Tres | `probable_new_current` | C | high |
| Hotel Asistido RegiÃ³n Este | Rocha | RincÃ³n 112 | `probable_new_current` | C | high |
| Nuevo Residencial MaiLuz | Rocha | 19 de Abril 167 | `probable_new_current` | C | high |
| Hogar Alba | Rocha | 25 de Agosto 27, antes de Leonardo Olivera | `probable_new_current` | C | medium |
| Veneza - Residencial para Adultos Mayores | Chuy | Tito FernÃ¡ndez 140 | `probable_new_current` | B | high |
| Centro Residencial Bienestar Lascano | Lascano | 18 de Julio, esquina Arigoni | `probable_new_current` | B | high |

Los descubrimientos mÃ¡s fuertes son:

1. **Residencial OrquÃ­deas**, Rocha, Francisco de los Santos 134.
2. **Nuevo Renacer**, Rocha, 25 de Mayo 140 esquina Treinta y Tres.
3. **Hotel Asistido RegiÃ³n Este**, Rocha, RincÃ³n 112.
4. **Nuevo Residencial MaiLuz**, Rocha, 19 de Abril 167.
5. **Hogar Alba**, Rocha, 25 de Agosto 27, con conflicto de direcciÃ³n que debe revisarse.
6. **Residencial Veneza**, Chuy, Tito FernÃ¡ndez 140.
7. **Centro Residencial Bienestar Lascano**, 18 de Julio esquina Arigoni.

## Pistas que todavÃ­a no deben mapearse

| Establecimiento | Localidad | DirecciÃ³n observada | ClasificaciÃ³n | Evidencia | Confianza |
|---|---|---|---|---|---|
| Las Espumillas | Rocha | JosÃ© Enrique RodÃ³ 107 | `needs_more_evidence` | C | medium |
| Residencial Nuestro Camino | Lascano | Sin direcciÃ³n exacta | `address_missing` | C | medium |
| Centro Residencial Bienestar CebollatÃ­ | CebollatÃ­ | Sin direcciÃ³n exacta | `address_missing` | C | low_to_medium |

- **Las Espumillas** tiene direcciÃ³n y telÃ©fonos concretos, pero la evidencia
  actual proviene de directorios y requiere confirmaciÃ³n de funcionamiento.
- **Nuestro Camino**, en Lascano, tiene actividad pÃºblica reciente pero no
  domicilio exacto.
- **Bienestar CebollatÃ­** aparece en contenido pÃºblico indexado, pero falta
  una fuente directa estable, direcciÃ³n y telÃ©fono.

## Posibles mudanzas, rebrandings o reutilizaciÃ³n de domicilio

| Establecimiento | Localidad | DirecciÃ³n observada | ClasificaciÃ³n | Evidencia | Confianza |
|---|---|---|---|---|---|
| Residencial San Luca | Rocha | RamÃ­rez 92 | `possible_move_or_rebrand` | C | high_for_current_identity_medium_for_relationship |
| Carpe Diem / RincÃ³n de Luz | La Paloma | Avenida del NavÃ­o, entre Psisis y Leo | `possible_move_or_rebrand` | C | medium |
| Hogar Dulce CompaÃ±Ã­a | Castillos | GonzÃ¡lez 1226 | `possible_move_or_rebrand` | B | high |
| Residencial Como En Casa | Rocha | 19 de Abril 71 | `possible_move_or_rebrand` | C | low |

Casos principales:

- **San Luca** ocupa actualmente RamÃ­rez 92, direcciÃ³n que en 2019 figuraba
  para **Bienvenidos**.
- **Carpe Diem / RincÃ³n de Luz** aparece en La Paloma, mientras la referencia
  histÃ³rica ubicaba RincÃ³n de Luz en Rocha ciudad con el mismo telÃ©fono.
- **Dulce CompaÃ±Ã­a** conserva el mismo telÃ©fono histÃ³rico, pero ahora aparece
  en GonzÃ¡lez 1226 en vez de 19 de Abril 1386.
- **Como En Casa** aparece en 19 de Abril 71, domicilio histÃ³rico de **Maxime**,
  pero la fuente actual es de baja calidad y hasta lo clasifica como urbanizaciÃ³n.

No deben contarse automÃ¡ticamente como sedes nuevas adicionales.

## Establecimientos conocidos que el Ã­ndice debe enriquecer

| Establecimiento | Localidad | DirecciÃ³n observada | ClasificaciÃ³n | Evidencia | Confianza |
|---|---|---|---|---|---|
| Hogar de Ancianos Dr. Ãngel Modesto Delgado | Rocha | Avenida Agraciada s/n | `known_exact_match` | A | high |
| Hogar de Ancianos del Chuy | Chuy | LeÃ³n Ventura / Ruta 19 193 | `known_exact_match` | A | high |

- **Hogar Dr. Ãngel Modesto Delgado** es conocido por fuentes oficiales, pero
  falta entre las cinco entradas de Rocha del Ã­ndice.
- **Hogar de Ancianos del Chuy** ya estÃ¡ como candidato OSM privado, aunque sin
  departamento ni direcciÃ³n exacta. Debe enriquecerse, no duplicarse.

## Exclusiones

| Establecimiento | Motivo |
|---|---|
| Hogar OASIS, Castillos | La comunicaciÃ³n pÃºblica lo presenta como residencial para personas con discapacidad; no se importÃ³ como ELEPEM. |
| Nuestra SeÃ±ora del Huerto | El resultado pertenece a ConcepciÃ³n del Uruguay, Argentina. |

TambiÃ©n se excluyeron centros de dÃ­a, viviendas comunes, servicios de salud,
alojamientos turÃ­sticos, proyectos todavÃ­a no operativos y resultados del lado
brasileÃ±o o argentino sin prueba de ubicaciÃ³n en Rocha, Uruguay.

## Cobertura territorial

Se buscaron Rocha, Castillos, Lascano, Chuy, VelÃ¡zquez, CebollatÃ­, La Paloma,
La Pedrera, Aguas Dulces, Barra de Valizas, Punta del Diablo, La Coronilla,
Barra del Chuy, 18 de Julio, San Luis al Medio, Costa Azul, Arachania,
Punta Rubia, Cabo Polonio, La Esmeralda, OceanÃ­a del Polonio y zonas rurales.

La ausencia de resultados concretos en una localidad significa **brecha de
informaciÃ³n pÃºblica indexada**, no ausencia de establecimientos.

## RelaciÃ³n con la referencia de 43

El nÃºmero 43 se mantiene como referencia histÃ³rica de cobertura. No debe
calcularse:

```text
43 - puntos actuales = residenciales que faltan
```

Tampoco corresponde sumar los 28 nombres de 2019 y los siete candidatos nuevos
y declarar 35 establecimientos actuales. Primero deben resolverse cierres,
mudanzas, cambios de nombre y duplicados.

## Uso de Google Maps

No se realizÃ³ una llamada a la API de Google desde ChatGPT porque la clave
permanece correctamente en el `.env` local y no fue compartida. DespuÃ©s del
`dry-run`, Codex puede verificar los candidatos concretos y almacenar solamente
el `place_id`, la URL externa y la fecha de verificaciÃ³n, segÃºn el plan.

## Archivos entregados

```text
rocha_chatgpt_public_candidates_2026-08-03.json
rocha_chatgpt_public_review_2026-08-03.csv
rocha_chatgpt_public_research_report_2026-08-03.md
rocha_chatgpt_search_log_2026-08-03.md
```

## Prompt preparado para Codex

```text
Read AGENTS.md and docs/PLAN_NACIONAL_DESCUBRIMIENTO_ELEPEM.md.

Use:

data/discovery/rocha/rocha_chatgpt_public_candidates_2026-08-03.json

Execute only the department comparison/deduplication dry run.

This file was produced by ChatGPT public-web research. It is not a verified
registry and nothing may be published automatically.

Important baseline issue:

- The exclusion audit reports only 5 entries labeled Rocha.
- The JSON includes a 2019 public nominal reference with 28 Rocha records.
- Before classifying any record as genuinely new, compare against those 28
  historical names, addresses and phones as well as Supabase, private
  candidates and OSM.
- Do not treat the 2019 list as proof of current operation.

Tasks:

1. Validate the JSON schema and source provenance.
2. Compare every record with:
   - the normalized Supabase exclusion view or latest export;
   - known_facilities_exclusion_index_2026-08-03.json;
   - private candidates and observations;
   - OSM records and candidates;
   - the 28 historical Rocha records embedded in the JSON;
   - aliases, addresses, phones, social URLs and existing coordinates.
3. Do not merge by name alone.
4. Keep one row per physical site.
5. For the 7 probable_new_current records, return exact and probable matches
   before proposing an insert.
6. Keep Las Espumillas as needs_more_evidence until current activity is
   independently confirmed.
7. Do not geocode Nuestro Camino or Bienestar CebollatÃ­ without exact addresses.
8. Resolve these as relationship reviews, not clean new facilities:
   - Residencial San Luca / historical Bienvenidos at RamÃ­rez 92;
   - Carpe Diem / historical RincÃ³n de Luz;
   - Hogar Dulce CompaÃ±Ã­a current versus historical address;
   - Residencial Como En Casa / historical Maxime at 19 de Abril 71;
   - Hotel Asistido / Terranova / Solares shared-phone history;
   - Hogar Alba current versus stale directory address and 27 versus 217 risk.
9. Do not create a new record for Hogar Dr. Ãngel Modesto Delgado.
   Patch/enrich the exclusion layer because it is an official known facility.
10. Do not create a duplicate for Hogar de Ancianos del Chuy.
    Enrich the existing OSM/private candidate and assign Rocha/Chuy after review.
11. Exclude Hogar OASIS from the ELEPEM import unless separate evidence proves
    it is a long-stay service for older persons.
12. Discard the Argentina false positive.
13. Do not call Google, Instagram, Facebook, IDE Uruguay or other external
    services in this dry run.
14. Do not write to Supabase.
15. Do not modify public.residenciales or the public map.
16. Return:
    - exact matches;
    - probable matches;
    - unmatched probable new sites;
    - move/rebrand/address-reuse cases;
    - index coverage patches required;
    - records without exact address;
    - false positives and non-ELEPEM exclusions;
    - inserts/links that a later --apply would perform.
17. Run focused tests and git diff --check.

Stop after the dry run.
```