# Descubrimiento de candidatos con OpenStreetMap

Este comando usa Overpass únicamente para generar pistas privadas. Un objeto
OSM no demuestra que el establecimiento sea un ELEPEM, esté activo o cuente con
habilitación. Cada resultado permanece como evidencia C hasta revisión humana.

## Cobertura

La consulta abarca Uruguay e incluye nodos, vías y relaciones con combinaciones
actuales o históricas de:

- `amenity=nursing_home`, `retirement_home`, `care_home` u
  `old_people_home`;
- `healthcare=nursing_home`, `assisted_living` o `care_home`;
- `building=nursing_home`;
- `social_facility=nursing_home`, `assisted_living`, `retirement_home` o
  `care_home`;
- `amenity=social_facility` para personas mayores;
- `social_facility=group_home` para personas mayores.

No se hacen búsquedas por nombres comerciales y no se consulta Google, Meta ni
ningún directorio externo.

## Salida

Cada objeto se normaliza con identificador y URL OSM, licencia, atribución,
fecha de consulta, nombre, operador, dirección, localidad, departamento,
coordenadas, etiquetas originales y teléfono/sitio web solo cuando están
etiquetados explícitamente en OSM.

La atribución conservada es `© OpenStreetMap contributors` y la licencia se
registra como `ODbL 1.0`. Las etiquetas siguen siendo datos de terceros: antes
de cualquier uso público debe revisarse atribución, licencia, vigencia y posible
presencia de datos de contacto personales.

El resultado se guarda atómicamente en
`data/discovery/osm-elepem-candidates-AAAA-MM-DD.json`. Los JSON generados se ignoran
en Git; solo se conserva la documentación del directorio.

El script no importa `pg`, no usa credenciales y no escribe en Supabase ni en
`public.residenciales`.

## Dry run

```powershell
npm run discovery:osm:dry-run
```

Imprime endpoint, timeout, reintentos, User-Agent, ruta de caché y consulta
Overpass completa. No abre una conexión de red ni crea el archivo de caché.

## Ejecución controlada en vivo

Revisar primero el dry run. Para realizar una única consulta nacional:

```powershell
npm run discover:osm
```

El endpoint predeterminado es
`https://overpass-api.de/api/interpreter`. Puede agregarse
`--contact=<URL-o-correo-del-proyecto>` para incluir un contacto en el
User-Agent. No deben usarse endpoints alternativos para eludir límites o
bloqueos.

## Pruebas

```powershell
npm run test:osm-discovery
```

Las pruebas usan exclusivamente
`scripts/tests/fixtures/overpass-osm-candidates.json`; nunca llaman a Overpass.

La ejecución controlada requiere permitir temporalmente solicitudes HTTPS POST
solo a `overpass-api.de`. No requiere cuenta ni sesión y no habilita otros
dominios.
