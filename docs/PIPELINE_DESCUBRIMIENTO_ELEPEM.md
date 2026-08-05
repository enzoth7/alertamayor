# Pipeline de descubrimiento de posibles ELEPEM

Fecha de implementación: 2026-07-31.

Este pipeline descubre establecimientos candidatos, los cruza contra
`public.residenciales` y los deja en una cola privada. Un hallazgo no acredita
que el lugar sea un ELEPEM, esté activo, tenga habilitación o carezca de ella.

## Flujo y decisiones

1. Consultar OpenStreetMap/Overpass y, de forma opcional, Places o Apify.
2. Consolidar repeticiones de una misma fuente y cruces entre fuentes.
3. Comparar nombre, dirección, departamento y distancia contra el padrón vivo.
4. Clasificar como `probable_match`, `possible_match` o `new_candidate`.
5. Guardar siempre con `review_status=pending` en
   `public.residencial_discovery_candidates`.
6. Una persona revisa y decide `matched`, `approved_new` o `rejected`.
7. Solo `approved_new` puede promoverse al padrón. La promoción crea una fila
   con `status_group=verificar`, que la interfaz representa en violeta.

No hay promoción automática. Un candidato sin nombre, dirección o coordenadas
no puede publicarse.

## Fuentes y reglas

### OpenStreetMap / Overpass

Busca objetos con `nursing_home`, `assisted_living` y establecimientos sociales
para personas mayores. Conserva URL, etiquetas de evidencia y atribución
`© OpenStreetMap contributors · ODbL`.

### Google Places API (New)

Usa Text Search con las ocho nomenclaturas del proyecto. El comando exige:

- `GOOGLE_PLACES_API_KEY` en `.env.local`;
- `--acknowledge-paid-api`;
- un límite explícito `--max-google-requests=N`.

Por defecto pide campos del nivel Pro. `--google-contact-details` agrega teléfono
y sitio web, que actualmente elevan la solicitud al nivel Enterprise.

La política de Places prohíbe almacenar su contenido fuera de las excepciones y
prohíbe usarlo junto a un mapa que no sea de Google. Por eso el pipeline utiliza
nombre/dirección/coordenadas solo durante el cruce y persiste únicamente el
`place_id`, la consulta y los metadatos de decisión cuando Google es la única
fuente. La vista transitoria se imprime con atribución `Google Maps`.

Referencias vigentes al implementar:

- https://developers.google.com/maps/documentation/places/web-service/text-search
- https://developers.google.com/maps/documentation/places/web-service/policies
- https://cloud.google.com/maps-platform/terms/maps-service-terms

### Apify

Usa el Actor `compass/crawler-google-places` solo como control interno. Exige:

- `APIFY_TOKEN` en `.env.local`;
- `--acknowledge-google-maps-scraping-risk`;
- `--max-apify-charge-usd=N`.

El tope se divide entre los departamentos de la ejecución y también se envía
`maxItems`. Se desactivan reseñas, imágenes, perfiles sociales, enriquecimiento
de contactos, leads, preguntas, directorios y análisis de competidores.

Referencias:

- https://apify.com/compass/crawler-google-places/input-schema
- https://docs.apify.com/api/v2/act-run-sync-get-dataset-items-post

Los resultados se marcan `internal_contract_risk` y no deben publicarse como
fuente independiente sin revisión jurídica y verificación por otra fuente.

### SerpApi Google Maps Results API

SerpApi consulta resultados de Google Maps y devuelve hasta 20 lugares por
página. La integración usa `type=search`, localización en español para Uruguay
y paginación `start=0,20,40`; nunca solicita reseñas, imágenes ni datos
personales. Exige:

- `SERPAPI_API_KEY` en `.env.local` (nunca en el código ni en el chat);
- `--acknowledge-google-maps-scraping-risk`;
- un límite absoluto `--max-serpapi-searches=N`;
- como máximo seis páginas por consulta, aun si se configura un valor mayor.

Cada respuesta exitosa cuenta como una búsqueda según la documentación de
precios. El plan piloto fija 48 búsquedas como máximo. SerpApi advierte que los
resultados pueden quedar fuera del área pedida, por lo que el departamento debe
validarse en la revisión humana. Los datos se marcan
`internal_contract_risk`: SerpApi facilita el acceso técnico, pero no convierte
el scraping de Google Maps en Places API oficial.

Referencias:

- https://serpapi.com/google-maps-api
- https://serpapi.com/maps-local-results
- https://serpapi.com/pricing

## Comandos

Ver el plan del piloto sin llamar APIs:

```powershell
npm run discovery:plan
```

Ejecutar OSM para Montevideo y Canelones contra el padrón vivo:

```powershell
npm run discovery:pilot
```

Ejecutar Places con un máximo absoluto de 48 solicitudes:

```powershell
node --env-file=.env.local scripts/discover-residenciales.mjs `
  --sources=google `
  --departments=Montevideo,Canelones `
  --existing=database `
  --acknowledge-paid-api `
  --max-google-requests=48
```

Ejecutar Apify con un tope total de USD 5:

```powershell
node --env-file=.env.local scripts/discover-residenciales.mjs `
  --sources=apify `
  --departments=Montevideo,Canelones `
  --existing=database `
  --acknowledge-google-maps-scraping-risk `
  --max-apify-charge-usd=5
```

Ejecutar SerpApi para el piloto con un máximo absoluto de 48 búsquedas:

```powershell
npm run discovery:serpapi:pilot
```

El comando solo debe ejecutarse después de revocar cualquier clave expuesta y
guardar una clave nueva como `SERPAPI_API_KEY` en `.env.local`.

### Barrido departamental de Paysandú

El perfil `paysandu-completo` programa exactamente 50 consultas distintas: 18
sinónimos sobre todo el departamento y dos búsquedas amplias para cada una de
16 localidades (Paysandú, Guichón, Quebracho, Porvenir, Piedras Coloradas,
Chapicuy, Lorenzo Geyres, Tambores, Gallinal, Orgoroso, Morató, El Eucalipto,
Cerro Chato, Beisso, Merinos y Piñera). Usa una sola página por consulta para
que la paginación nunca desplace el límite ni deje pueblos sin consultar.

Con Google Places API oficial:

```powershell
npm run discovery:paysandu:google
```

Con SerpApi:

```powershell
npm run discovery:paysandu:serpapi
```

Usar `--departments=todos` solo después de comparar la cobertura del piloto.

Validar y cargar un informe en la cola privada:

```powershell
npm run db:sync:discovery -- --file="ruta\candidates.json"
npm run db:sync:discovery -- --file="ruta\candidates.json" --apply
```

Consultar conteos de la cola y promociones:

```powershell
npm run db:sync:discovery -- --status
```

Registrar una revisión humana:

```powershell
npm run db:review:discovery -- `
  --id=RDC-0000000000000000 `
  --decision=approved_new `
  --reviewer="Nombre del revisor" `
  --notes="Fuente independiente y dirección verificadas" `
  --apply
```

Para `--decision=matched` también es obligatorio
`--residencial-id=ELP-0000`.

Promover un candidato aprobado como violeta:

```powershell
npm run db:promote:discovery -- --id=RDC-0000000000000000
npm run db:promote:discovery -- --id=RDC-0000000000000000 --apply
```

El primer comando es una vista previa. El segundo inserta en
`public.residenciales` y vincula la promoción con la fila de auditoría.

## Piloto ejecutado

El piloto del 2026-07-31 comparó OpenStreetMap con los 787 registros vivos:

- 24 hallazgos antes de consolidar;
- 23 candidatos consolidados;
- 11 coincidencias probables;
- 3 coincidencias posibles;
- 9 candidatos no vinculados;
- 23 filas pendientes de revisión en la cola privada;
- 0 candidatos promovidos al padrón público.

Los archivos reproducibles están en
`data/discovery/osm/descubrimiento_osm_piloto_2026-07-31/`.

## Seguridad y operación

La tabla de candidatos tiene RLS activado, no expone políticas y revoca acceso a
`anon` y `authenticated`. Los scripts se conectan desde servidor con la
contraseña de PostgreSQL; esa contraseña no debe copiarse a variables
`NEXT_PUBLIC_*`.

El historial remoto de migraciones ya era divergente respecto del repositorio.
La tabla se aplicó directamente con SQL y se verificó después, sin reparar ni
reescribir el historial remoto. Antes de adoptar `supabase db push` como flujo de
despliegue general hay que reconciliar ese historial por separado.
