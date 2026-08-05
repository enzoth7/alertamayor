# Plan Codex: alertas basadas en reseÃ±as pÃºblicas de Google Maps

## Objetivo

Incorporar a Alerta Mayor un piloto territorial que revise reseÃ±as pÃºblicas de Google Maps y transforme relatos concretos en **seÃ±ales para revisiÃ³n humana**, sin confundirlas con habilitaciones oficiales, denuncias comprobadas ni inspecciones.

Territorios del piloto:

- Confirmados: PaysandÃº, Artigas, Rocha, Montevideo y Canelones.
- Condicionados al cierre de la bÃºsqueda de residenciales faltantes: Treinta y Tres, TacuarembÃ³ y Durazno.

## DecisiÃ³n metodolÃ³gica central

La unidad principal es el **residencial**, no la cantidad total de reseÃ±as. Montevideo y Canelones no pueden dominar el estudio solo porque tienen mÃ¡s establecimientos y mÃ¡s actividad digital.

Reglas:

1. Se busca el 100 % de los establecimientos del padrÃ³n congelado de cada territorio.
2. Cada establecimiento recibe el mismo protocolo de bÃºsqueda, tenga o no reseÃ±as.
3. â€œNo tiene reseÃ±asâ€ se registra como `sin_datos`, nunca como â€œsin problemasâ€.
4. Los resultados territoriales se presentan como tasas y coberturas, no como totales brutos.
5. En establecimientos con muchas reseÃ±as se aplica un mÃ¡ximo estratificado; en los que tienen pocas se revisan todas.
6. Las alertas dependen de la especificidad, gravedad, recencia e independencia de los relatos, no del promedio de estrellas ni del volumen bruto.

## Reparto de tareas

### ChatGPT Pro o investigaciÃ³n humana

- Buscar y confirmar la ficha exacta de cada residencial en Google Maps.
- Revisar reseÃ±as con un protocolo comÃºn.
- Generar un archivo JSON estructurado con enlaces, fechas, estrellas, categorÃ­as y parÃ¡frasis.
- No modificar el repositorio.
- No copiar de forma masiva textos completos, nombres, avatares ni perfiles.

### Codex

- Inspeccionar el repositorio.
- Crear migraciones, importadores, validadores, APIs, pantalla interna y visualizaciÃ³n pÃºblica segura.
- Ejecutar pruebas, lint y build.
- No navegar ni scrapear Google Maps.
- No publicar automÃ¡ticamente ninguna alerta.

### RevisiÃ³n humana final

- Confirmar que la ficha de Google pertenece al residencial correcto.
- Revisar las seÃ±ales antes de aprobar una alerta.
- Exigir dos revisiones humanas para cualquier alerta pÃºblica.

## Protocolo territorial contra el sesgo

### Orden de trabajo

1. Artigas.
2. Rocha.
3. PaysandÃº.
4. Treinta y Tres, TacuarembÃ³ y Durazno cuando su padrÃ³n estÃ© congelado.
5. Canelones.
6. Montevideo.

No comenzar el anÃ¡lisis masivo de Montevideo hasta terminar el primer control de calidad de los departamentos pequeÃ±os.

### MÃ©tricas obligatorias por departamento

- establecimientos del padrÃ³n;
- establecimientos buscados en Google Maps;
- ficha confirmada;
- ficha ambigua;
- ficha no encontrada;
- ficha confirmada sin reseÃ±as;
- ficha confirmada con reseÃ±as;
- reseÃ±as revisadas;
- establecimientos con al menos una seÃ±al especÃ­fica;
- establecimientos con patrÃ³n repetido;
- cobertura de bÃºsqueda;
- cobertura de reseÃ±as.

Nunca comparar departamentos solo con â€œcantidad de alertasâ€. Mostrar, por ejemplo:

- 2 de 28 establecimientos de PaysandÃº con una seÃ±al revisada;
- 15 de 428 establecimientos de Montevideo con una seÃ±al revisada.

## Protocolo para encontrar bien cada ficha en Google Maps

Para cada establecimiento congelado:

1. Buscar nombre exacto + localidad.
2. Buscar nombre exacto + direcciÃ³n.
3. Buscar variantes del nombre: residencial, hogar, casa de salud, residencia geriÃ¡trica, ELEPEM.
4. Buscar nombres anteriores o comerciales guardados en la base.
5. Buscar direcciÃ³n sin nombre.
6. Buscar telÃ©fono institucional, cuando exista.
7. Revisar alrededor de las coordenadas del punto por posibles fichas con otro nombre.
8. Comparar nombre, direcciÃ³n, telÃ©fono y coordenadas.
9. Registrar uno de estos estados:
   - `matched_with_reviews`
   - `matched_no_reviews`
   - `ambiguous`
   - `not_found`
   - `closed`
   - `moved`
   - `duplicate_listing`

`not_found` significa que no se encontrÃ³ una ficha inequÃ­voca, no que el establecimiento no exista.

## Muestreo de reseÃ±as

### Cuando hay hasta 30 reseÃ±as

Revisar todas las reseÃ±as visibles.

### Cuando hay mÃ¡s de 30

Revisar un mÃ¡ximo de 30, deduplicadas:

- 10 mÃ¡s recientes;
- 10 de menor calificaciÃ³n;
- 5 de mayor calificaciÃ³n;
- 5 relevantes o destacadas por Google.

El archivo debe indicar el grupo de muestreo de cada reseÃ±a. Esto evita que Montevideo y Canelones consuman todo el trabajo y, al mismo tiempo, conserva reseÃ±as positivas, negativas y recientes.

### Ventana temporal

- AnÃ¡lisis principal: Ãºltimos 36 meses.
- Si hay menos de cinco reseÃ±as en esa ventana, incorporar todas las histÃ³ricas disponibles, marcÃ¡ndolas como `historical_context`.
- Una reseÃ±a antigua no genera por sÃ­ sola una alerta actual.

## CategorÃ­as de anÃ¡lisis

- `staff_response`: demora o falta de respuesta;
- `hygiene`: higiene, ropa o ropa de cama;
- `health_attention`: deterioro, lesiÃ³n o problema de salud no atendido;
- `medication_restraints`: medicaciÃ³n o posibles restricciones;
- `food_hydration`: alimentaciÃ³n o hidrataciÃ³n;
- `falls_safety`: caÃ­das, seguridad o infraestructura;
- `staffing_competence`: falta de personal o problemas de competencia;
- `family_communication`: comunicaciÃ³n con familiares, visitas o acceso;
- `possible_violence`: posible violencia fÃ­sica o psicolÃ³gica;
- `financial_concern`: dinero, pertenencias o cobros concretamente descritos;
- `positive_care`: experiencia positiva concreta;
- `vague_or_insufficient`: comentario negativo sin informaciÃ³n suficiente;
- `not_about_care`: comentario no relacionado con cuidados;
- `wrong_place`: reseÃ±a de otra entidad o identidad dudosa.

## Niveles de alerta

### `sin_datos`

No hay ficha, no hay reseÃ±as o el volumen es insuficiente. No significa ausencia de problemas.

### `senal_aislada`

Existe al menos una reseÃ±a especÃ­fica y verificable que describe una situaciÃ³n concreta. Se muestra internamente como amarilla. Para el pÃºblico, solo puede aparecer despuÃ©s de dos revisiones humanas y con lenguaje neutral.

### `patron_a_revisar`

Existen al menos dos reseÃ±as independientes de los Ãºltimos 24 meses en la misma categorÃ­a, o tres de los Ãºltimos 36 meses. Se muestra en naranja.

### `prioridad_interna`

Hay una descripciÃ³n especÃ­fica reciente de posible violencia, lesiÃ³n grave, restricciÃ³n, medicaciÃ³n indebida o falta de atenciÃ³n mÃ©dica; o varias seÃ±ales graves independientes. Se muestra en rojo Ãºnicamente dentro del portal de organizaciÃ³n.

Una experiencia positiva no â€œanulaâ€ una seÃ±al grave. Ambas se informan por separado.

## QuÃ© se guarda

Guardar:

- establecimiento;
- `google_place_id`;
- URL de Google Maps;
- URL directa de la reseÃ±a cuando estÃ© disponible;
- estrellas;
- fecha visible y fecha normalizada aproximada;
- fecha de consulta;
- categorÃ­a;
- especificidad;
- gravedad;
- grupo de muestreo;
- parÃ¡frasis humana breve;
- persona revisora;
- decisiÃ³n y auditorÃ­a.

No guardar:

- texto original completo;
- nombre o perfil del autor;
- avatar;
- fotografÃ­as;
- respuestas personales;
- datos de residentes o familiares.

## Esquema de datos

Reutilizar `discovery_private.facility_external_ids` para `google_place_id`.

Crear esquema privado `review_alert_private` con:

### `pilot_territories`

- departamento;
- estado: `discovery_pending`, `ready_to_freeze`, `frozen`, `reviews_in_progress`, `reviews_complete`;
- fecha del padrÃ³n;
- cantidad de establecimientos.

### `collection_runs`

- departamento;
- archivo de origen;
- mÃ©todo;
- fecha;
- responsable;
- cantidad de establecimientos y reseÃ±as.

### `review_observations`

- `residencial_id` y/o `facility_id`;
- `google_place_id`;
- URLs de fuente;
- estrellas;
- fechas;
- categorÃ­a;
- especificidad;
- gravedad;
- parÃ¡frasis;
- muestreo;
- revisiÃ³n humana.

### `review_annotation_events`

Historial append-only de correcciones y decisiones.

### `facility_review_alerts`

- nivel interno;
- nivel pÃºblico;
- cantidad de evidencias;
- categorÃ­as;
- fecha de seÃ±al mÃ¡s reciente;
- cobertura;
- aprobado por dos personas;
- `public_visible`.

Crear una vista pÃºblica que exponga Ãºnicamente el resumen aprobado; nunca observaciones privadas, autores ni texto original.

## DÃ³nde aparecen las alertas

### Portal privado

Agregar al menÃº de organizaciÃ³n:

- **Alertas**
- ruta: `/organizacion/alertas`

La pantalla muestra:

- departamento;
- residencial;
- estado de ficha Google;
- cobertura de reseÃ±as;
- nivel de alerta;
- categorÃ­as;
- fecha de la Ãºltima seÃ±al;
- enlaces a las fuentes;
- primera y segunda revisiÃ³n humana;
- historial de cambios.

### Mapa pÃºblico

No cambiar el color central del punto, porque ese color representa la situaciÃ³n administrativa.

Agregar un **aro exterior** independiente:

- sin aro: sin alerta pÃºblica;
- aro amarillo: seÃ±al pÃºblica revisada;
- aro naranja: patrÃ³n de experiencias pÃºblicas;
- el rojo queda reservado al portal interno.

Agregar al filtro del registro:

- â€œCon seÃ±ales en experiencias pÃºblicasâ€.

### Ficha pÃºblica del residencial

Debajo de las fuentes administrativas:

> **Experiencias pÃºblicas en Google Maps**
>
> Se encontraron 2 relatos recientes que describen problemas concretos de higiene. Esta informaciÃ³n surge de experiencias individuales, requiere interpretaciÃ³n y no constituye una constataciÃ³n oficial.
>
> Ãšltima revisiÃ³n: agosto de 2026.
>
> [Ver fuentes en Google Maps]

No mostrar ranking, â€œÃ­ndice de maltratoâ€, nombres de autores ni textos completos.

## Cambios de cÃ³digo previstos

- `app/components/AppShell.tsx`
  - agregar vista `alertas` y navegaciÃ³n del portal de organizaciÃ³n.
- `app/organizacion/alertas/page.tsx`
  - nueva ruta protegida.
- `app/components/team/TeamReviewAlerts.tsx`
  - tablero interno.
- `app/components/team/TeamReviewAlerts.css`
  - estilos.
- `app/api/team/review-alerts/route.ts`
  - listado y filtros internos.
- `app/api/team/review-alerts/[id]/route.ts`
  - segunda revisiÃ³n y decisiones.
- `app/api/residenciales/route.ts`
  - incorporar solo el resumen pÃºblico aprobado.
- `app/components/map-types.ts`
  - agregar campos de alerta pÃºblica.
- `app/components/StreetMap.tsx`
  - aro exterior y bloque de alerta en el popup.
- `app/components/UruguayRegistry.tsx`
  - filtro, badge y detalle pÃºblico.
- `scripts/export-google-review-pilot.mjs`
  - congelar padrÃ³n por territorio.
- `scripts/validate-google-review-observations.mjs`
  - validar JSON.
- `scripts/import-google-review-observations.mjs`
  - dry-run y apply.
- `lib/review-alert-rules.mjs`
  - reglas determinÃ­sticas y auditables.
- `supabase/migrations/20260805XXXX_create_google_review_alerts.sql`
  - tablas, RLS, Ã­ndices y vista pÃºblica.
- `docs/GOOGLE_REVIEWS_PILOT.md`
  - metodologÃ­a completa.

## Formato de importaciÃ³n

```json
{
  "facilityKey": "MSPREG24-0001",
  "department": "PaysandÃº",
  "googlePlaceId": "ChIJ...",
  "googleMapsUrl": "https://maps.google.com/...",
  "reviewSourceUrl": "https://www.google.com/maps/reviews/...",
  "rating": 1,
  "publishedAtDisplay": "hace 8 meses",
  "publishedAtNormalized": "2025-12-01",
  "observedAt": "2026-08-05T03:00:00-03:00",
  "sampleBucket": "newest",
  "polarity": "negative",
  "specificity": "specific",
  "severity": "moderate",
  "categories": ["hygiene", "staff_response"],
  "humanSummary": "Describe una demora reiterada del personal y una situaciÃ³n concreta de higiene.",
  "source": "google_maps",
  "reviewer": "equipo-investigacion"
}
```

## Pruebas obligatorias

1. Un departamento condicionado no se puede importar antes de `frozen`.
2. â€œSin reseÃ±asâ€ produce `sin_datos`, no `sin_alerta`.
3. Los totales de Montevideo no alteran el nivel de alerta de PaysandÃº.
4. La regla funciona por establecimiento.
5. Duplicados de una misma reseÃ±a no cuentan dos veces.
6. Una reseÃ±a vaga de una estrella no genera alerta.
7. Dos relatos independientes especÃ­ficos sÃ­ pueden generar `patron_a_revisar`.
8. Una seÃ±al grave aislada queda como `prioridad_interna`, no pÃºblica automÃ¡ticamente.
9. La API pÃºblica nunca expone texto original, autor o datos privados.
10. El color administrativo del punto no cambia por una alerta de reseÃ±as.
11. RLS impide acceso directo del navegador a tablas privadas.
12. Importar dos veces el mismo archivo es idempotente.

## Secuencia para Codex

### Tarea 1: infraestructura y padrÃ³n

- rama `feat/google-review-alerts`;
- documentaciÃ³n;
- territorios;
- exportador de padrÃ³n;
- vÃ­nculo de `place_id`;
- migraciÃ³n privada;
- pruebas.

### Tarea 2: importaciÃ³n y reglas

- esquema JSON;
- validador;
- importador con `--dry-run` y `--apply`;
- reglas de alerta;
- auditorÃ­a;
- pruebas.

### Tarea 3: portal interno

- `/organizacion/alertas`;
- filtros;
- fuentes;
- revisiÃ³n doble;
- reportes territoriales.

### Tarea 4: visualizaciÃ³n pÃºblica segura

- vista pÃºblica agregada;
- aro en el mapa;
- filtro;
- ficha con lenguaje neutral;
- pruebas de privacidad.

## Primer prompt para Codex

```text
InspeccionÃ¡ todo el repositorio antes de editar. LeÃ© AGENTS.md y todos los
planes metodolÃ³gicos aplicables. TrabajÃ¡ en una rama nueva:
feat/google-review-alerts.

Objetivo: implementar la infraestructura de un piloto de alertas basadas en
reseÃ±as pÃºblicas de Google Maps, sin scrapear Google Maps y sin guardar texto
original, autores, avatares ni fotografÃ­as.

Territorios confirmados: PaysandÃº, Artigas, Rocha, Montevideo y Canelones.
Territorios condicionados: Treinta y Tres, TacuarembÃ³ y Durazno; no pueden
recibir importaciones hasta que su padrÃ³n estÃ© frozen.

Antes de escribir cÃ³digo:
1. MostrÃ¡ el plan de cambios.
2. IdentificÃ¡ cÃ³mo mantener compatibilidad con los modos legacy,
   compatibility y normalized.
3. ProponÃ© la migraciÃ³n y los contratos JSON.
4. SeÃ±alÃ¡ cualquier conflicto con AGENTS.md.

ImplementÃ¡ solamente la Tarea 1 del documento
PLAN_CODEX_ALERTAS_GOOGLE_REVIEWS_ALERTA_MAYOR.md:
- configuraciÃ³n auditable de territorios;
- exportador reproducible del padrÃ³n;
- reutilizaciÃ³n de discovery_private.facility_external_ids para google_place;
- migraciÃ³n privada inicial;
- estados de matching;
- RLS y auditorÃ­a;
- pruebas.

No recolectes reseÃ±as, no cambies el mapa pÃºblico y no apliques migraciones en
producciÃ³n. EjecutÃ¡ lint, build y pruebas pertinentes. InformÃ¡ archivos
modificados, comandos, resultados, fallas y riesgos.
```