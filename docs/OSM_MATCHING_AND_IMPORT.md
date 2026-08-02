# Comparación e importación privada de candidatos OSM

## Secuencia controlada

La exportación consulta `public.residenciales` dentro de una transacción
Postgres de solo lectura y crea:

```powershell
npm run db:export:residenciales
```

`data/discovery/residenciales-live-AAAA-MM-DD.json`

La consulta Overpass se ejecuta fuera de toda ruta pública y crea:

```powershell
npm run discover:osm
```

`data/discovery/osm-elepem-candidates-AAAA-MM-DD.json`

Overpass se utiliza únicamente para generar candidatos de evidencia C. Se debe
permitir temporalmente HTTPS POST solo hacia `overpass-api.de` y retirar el
permiso al terminar.

## Matching y reporte local

```powershell
npm run db:import:candidates -- `
  --input data/discovery/osm-elepem-candidates-AAAA-MM-DD.json `
  --existing data/discovery/residenciales-live-AAAA-MM-DD.json
```

El modo predeterminado es dry-run. Produce
`data/discovery/osm-candidate-review-AAAA-MM-DD.json`, con tres alternativas y
componentes explicables por candidato. No abre una conexión a Supabase.

Las señales incluyen teléfono público exacto cuando existe en ambos lados,
departamento, localidad, calle, número de puerta, nombre, alias y distancia.
Un nombre similar nunca basta para confirmar una coincidencia. Los conflictos
de departamento llevan el score a cero y los números de puerta distintos o
coordenadas lejanas impiden clasificar un match como probable.

## Escritura privada

Solo después de revisar el reporte:

```powershell
npm run db:import:candidates -- `
  --input data/discovery/osm-elepem-candidates-AAAA-MM-DD.json `
  --existing data/discovery/residenciales-live-AAAA-MM-DD.json `
  --apply
```

`--apply` usa una transacción corta y escribe únicamente en:

- `discovery_private.facility_source_runs`;
- `discovery_private.facility_source_observations`;
- `discovery_private.facility_candidates`;
- `discovery_private.facility_candidate_sources`;
- `discovery_private.facility_external_ids`.

Los candidatos quedan como `possible_match` o `needs_review`, evidencia C,
`human_reviewed=false` y `public_eligible=false`. El importador comprueba el
conteo de `public.residenciales` antes y después y revierte si cambia.

Las etiquetas OSM completas permanecen únicamente en el caché local. La base
recibe campos normalizados, procedencia, fecha, URL, licencia y hash; no guarda
raw metadata.

## Pruebas

```powershell
npm run test:matching
npm run test:osm-discovery
```

Las pruebas son sintéticas o usan fixtures locales; no emplean credenciales ni
contactan Supabase u Overpass.
