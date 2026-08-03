# Caché local de descubrimiento

Este directorio recibe resultados normalizados de fuentes de descubrimiento.
Los archivos `osm-elepem-candidates-*.json`, `residenciales-live-*.json` y
`osm-candidate-review-*.json` son artefactos locales, privados y
reproducibles; no se publican ni se cargan automáticamente en Supabase.

Se conserva este README, pero los JSON y archivos temporales del caché están
ignorados por Git.

## Fuentes sociales curadas manualmente

Los archivos sociales son referencias de investigación manual: el importador
no contacta Instagram, no inicia sesión y no descarga contenido. Para generar
una comparación de solo lectura contra la base y las pistas OSM locales:

```powershell
npm run db:import:social-candidates -- `
  --input data/discovery/instagram_paysandu_candidates_2026-08-02.json `
  --dry-run
```

El informe resultante queda en este directorio. En esta fase `--apply` está
intencionalmente bloqueado: primero se revisan coincidencias, direcciones y
coordenadas exactas en la cola privada.
