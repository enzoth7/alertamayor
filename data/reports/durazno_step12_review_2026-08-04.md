# Paso 12 — matching y deduplicación de Durazno

Fecha local: 2026-08-04

Insumo operativo:
`data/discovery/durazno/durazno_chatgpt_public_candidates_2026-08-04.json`

Original inmutable:
`Base de Datos/Scraping/Durazno/durazno_chatgpt_public_candidates_2026-08-04.json`

SHA-256 de ambas copias:
`1bc4026384b2292c7c985f622503118c4e468a7f9babd14a69f8328b5b2b76b0`

Índice comparado:
`data/exclusion/known_facilities_exclusion_index_2026-08-04.json`

- Ejecución local en modo simulación.
- Registros conocidos comparados: 1.082.
- Escrituras en Supabase: 0.
- Escrituras en `public.residenciales`: 0.
- Servicios externos consultados: 0.
- Publicaciones automáticas: 0.

## Conteos exactos

| Resultado | Cantidad |
|---|---:|
| Registros leídos | 32 |
| Registros estructuralmente válidos | 32 |
| Duplicados internos exactos | 0 |
| Conflictos internos por teléfono compartido | 1 par |
| Coincidencias con registros conocidos | 18 |
| Coincidencias conocidas actuales o probables | 9 |
| Coincidencias conocidas exclusivamente históricas | 9 |
| Nuevos probables con evidencia B | 3 |
| Nueva pista C retenida para más evidencia | 1 |
| Otros casos sin resolver | 6 |
| Descartados | 4 |
| Con coordenadas | 0 |
| Sin coordenadas | 32 |

## Recomendación de revisión humana

Las 32 recomendaciones conservadoras son:

| Acción recomendada | Cantidad |
|---|---:|
| Vincular o enriquecer un registro existente | 18 |
| Mantener separado en la cola privada | 7 |
| Verificar como candidato nuevo privado | 3 |
| Rechazar con motivo | 4 |

Los tres candidatos nuevos con evidencia B son:

- Calas Hogar, Durazno, Herrera 948.
- Residencial Shalom, Durazno, Zorrilla 618.
- Hogar Amaneciendo, Blanquillo, calle Artigas frente a OSE.

Los siete casos separados para revisión adicional comprenden dos sin dirección
exacta, tres posibles mudanzas o rebrandings, una pista OSM de evidencia C y
una pista pública con evidencia todavía insuficiente.

El conflicto interno por teléfono compartido relaciona `Residencial Doña Inés
/ El Bienestar Hogar Durazno` con `Residencial Reino de las Flores`. Se
mantienen como registros separados hasta resolver operador, sede y continuidad.

Los cuatro descartes son tres servicios que el insumo identifica como no
ELEPEM y un falso positivo correspondiente a La Paloma, Rocha. No se borran del
reporte: se conserva el motivo y la procedencia.

## Coincidencias oficiales e históricas

Nueve observaciones actuales o probables y nueve observaciones exclusivamente
históricas coinciden con entradas conocidas. No deben crear puntos rojos ni
candidatos nuevos. La recomendación es vincular sus observaciones al ID
canónico resuelto, conservar todas las fuentes y mantener la temporalidad
histórica cuando corresponda.

## Normalización

- Departamento canónico: `Durazno` en los 32 registros.
- Los nombres y direcciones se conservan en forma observada y se generan claves
  normalizadas para matching.
- `Santa Bernardina / Durazno` se normaliza operativamente a la localidad
  canónica `Durazno`, conservando el valor observado en la fuente.
- No se inventaron direcciones ni coordenadas.
- Las claves de candidato son únicas.

## Procedencia

Se conservaron 55 referencias:

| Canal permitido | Referencias |
|---|---:|
| `official` — exclusivamente MSP/MIDES | 21 |
| `public_maps` | 1 |
| `social_public` | 7 |
| `other_public` | 26 |

PACP, BPS, intendencias, medios y otros organismos o directorios no se
clasifican como `official`. IDE Uruguay no aparece como procedencia del
hallazgo.

## Puerta siguiente

Este paquete contiene recomendaciones, no decisiones humanas. Todavía no
habilita upserts. Tras la aprobación expresa de las recomendaciones se generará
el archivo revisado, se ejecutará el dry-run de lectura contra el proyecto
autorizado y se mostrará el plan exacto de upserts antes de cualquier `--apply`.
