# Alerta Mayor — Fase 1

Aplicación privada y local para descubrir establecimientos de larga estadía para personas mayores (ELEPEM) públicamente anunciados en Uruguay, compararlos con una instantánea oficial y enviarlos a revisión humana.

El sistema **no** determina ilegalidad, abuso, culpabilidad, fraude ni incumplimiento. `NOT_MATCHED` significa únicamente que no se localizó una coincidencia suficientemente confiable en los conjuntos oficiales disponibles en la fecha registrada. No hay publicación, denuncia, derivación ni decisión adversa automática.

## Límites implementados

- Brave Search usa su API oficial y registra consulta, URL de solicitud, URLs resultantes y fecha/hora.
- Los resultados de Facebook e Instagram se reducen a URL pública y fecha; no se guarda título, snippet ni contenido. Una observación solo puede añadirse posteriormente por una persona.
- Los resultados de dominios Google obtenidos por Brave se omiten.
- Google Places no busca establecimientos. Solo valida un `place_id` aportado manualmente y guarda el ID y el enlace externo devuelto por la API con el field mask `id,googleMapsUri`.
- No hay Playwright, Selenium, login automatizado, evasión de CAPTCHA/rate limits, análisis de fotos, identificación de residentes ni reconocimiento facial.
- Todo candidato entra con `HUMAN_REVIEW_REQUIRED`; el matching produce una sugerencia separada. Solo una acción humana cambia la clasificación final.
- No existe endpoint de publicación o derivación. La elegibilidad A/B mostrada en la interfaz es informativa para un posible flujo futuro.

## Arquitectura

- FastAPI + interfaz HTML local en `127.0.0.1:8000`.
- SQLAlchemy 2 y Alembic sobre PostgreSQL 16 + PostGIS.
- Coordenadas WGS84 como `geography(POINT, 4326)` con índices GiST.
- Importaciones oficiales por instantánea, con SHA-256, URL, archivo, formato y fecha de obtención.
- Eventos de auditoría serializados mediante advisory lock y encadenados por hash. Un trigger impide `UPDATE` y `DELETE` sobre `audit_events`; `GET /api/audit/verify` comprueba la cadena completa.
- Matching conservador por teléfono, dominio, dirección, distancia y nombre normalizado.

## Inicio con Docker (PowerShell 7)

Desde este directorio:

```powershell
Copy-Item .env.example .env
notepad .env
docker compose config
docker compose up --build -d
docker compose ps
Invoke-RestMethod http://127.0.0.1:8000/health/ready
```

Abra `http://127.0.0.1:8000/review`. La documentación de la API está en `http://127.0.0.1:8000/docs`.

PostgreSQL **no publica ningún puerto al host Windows**. Solo la aplicación publica el puerto 8000 y lo hace exclusivamente sobre `127.0.0.1`. Dentro del contenedor, Uvicorn escucha en `0.0.0.0` para que el mapeo de Docker funcione; ese puerto no queda enlazado a interfaces externas del host.

Detener el entorno sin borrar datos:

```powershell
docker compose down
```

No use `docker compose down -v` salvo que realmente quiera eliminar el volumen local de PostgreSQL.

## Migraciones

La migración inicial habilita PostGIS y crea estas áreas: instantáneas oficiales, registros oficiales, ejecuciones de recolección, candidatos, fuentes, comparaciones, cola de revisión y auditoría append-only.

Revise el SQL antes de aplicarlo:

```powershell
docker compose run --rm app alembic upgrade head --sql | Out-File -Encoding utf8 migration-plan.sql
Get-Content migration-plan.sql
docker compose run --rm app alembic upgrade head
```

El contenedor de aplicación también ejecuta `alembic upgrade head` al iniciar. El downgrade no elimina la extensión PostGIS porque podría ser compartida.

## Importar un registro oficial

Formatos aceptados: `CSV`, `JSON`, `XLSX`, `PDF_DERIVED_CSV` y `PDF_DERIVED_JSON`. Los dos últimos son tablas estructuradas extraídas previamente de un PDF oficial: esta fase no hace OCR ni interpreta automáticamente PDFs crudos, evitando convertir errores de maquetación en datos supuestamente oficiales. Para evitar que una lista pública cualquiera sea etiquetada como registro oficial, la URL de origen debe pertenecer a `gub.uy` o a uno de sus subdominios.

Copie el archivo a `registry/` y registre siempre la URL oficial y la fecha de obtención:

```powershell
docker compose run --rm app alerta-mayor import-registry /data/registry/elepem.csv `
  --format CSV `
  --source-url "https://www.gub.uy/organismo/ruta-a-la-fuente-oficial" `
  --retrieved-at "2026-08-02T10:00:00-03:00" `
  --actor "iniciales-revisor"

docker compose exec app alerta-mayor export `
  --format csv `
  --output /data/exports/review-queue.csv `
  --actor "iniciales-revisor"
```

El importador reconoce encabezados habituales como `nombre`, `estado`, `dirección`, `departamento`, `teléfono`, `sitio web`, `latitud` y `longitud`. Descarta filas sin nombre y coordenadas fuera de un cuadro geográfico conservador de Uruguay. No conserva valores de columnas no reconocidas; solo sus nombres y el número de fila, para reducir el riesgo de ingerir datos personales accidentales.

También se puede importar mediante `POST /api/registry/import` como `multipart/form-data`.

Los datos de candidato que se usan para teléfono, dominio, dirección y coordenadas se agregan desde el formulario **Corroborar datos** de cada revisión o mediante `POST /api/candidates/{id}/enrichment`. Ambos exigen URL de evidencia, fecha de consulta y operador. La aplicación rechaza datos estructurados derivados de Facebook/Instagram y URLs de Google en ese flujo.

Sin una clave de Brave, la página inicial permite crear una pista manual desde una URL pública. El formulario registra automáticamente la fecha/hora, crea la cola de revisión y ejecuta deduplicación y matching. La API equivalente es `POST /api/candidates/manual` y exige una fecha ISO-8601 explícita.

## Descubrimiento y enlace manual de Google

Ejemplo Brave:

```powershell
$body = @{
  query = '"residencial de adultos mayores" Uruguay'
  count = 10
  actor = 'iniciales-revisor'
} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/api/discovery/brave `
  -ContentType 'application/json' -Body $body
```

Enlace Google Places, una vez que una persona obtuvo y verificó el `place_id`:

```powershell
$candidateId = 'UUID-DEL-CANDIDATO'
$body = @{ place_id = 'PLACE_ID_MANUAL'; actor = 'iniciales-revisor' } | ConvertTo-Json
Invoke-RestMethod -Method Post `
  -Uri "http://127.0.0.1:8000/api/candidates/$candidateId/google-place" `
  -ContentType 'application/json' -Body $body
```

## Desarrollo y pruebas (PowerShell)

Python local puede ejecutar análisis y pruebas unitarias sin conectarse a producción:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -e ".[dev]"
ruff check .
ruff format --check .
mypy app
pytest
```

Prueba de build y configuración:

```powershell
docker compose config --quiet
docker build -f Containerfile -t alerta-mayor:phase1 .
```

Las pruebas de API externas usan `httpx.MockTransport`; nunca requieren claves reales. Nunca use credenciales de producción en pruebas ni confirme `.env` en Git.

## Clasificaciones y evidencia

Clasificaciones disponibles: `MATCHED_HABILITATED`, `MATCHED_IN_PROCESS`, `POSSIBLE_MATCH`, `NOT_MATCHED`, `INSUFFICIENT_INFORMATION` y `HUMAN_REVIEW_REQUIRED`.

- Evidencia A: fuente oficial nominal.
- Evidencia B: dos fuentes públicas independientes y coherentes.
- Evidencia C: pista aún no corroborada.

La cola y sus exportaciones son privadas. Cada fuente incluye URL y fecha de consulta; cada búsqueda incluye la consulta exacta. Las notas no deben contener nombres de residentes, historias clínicas, documentos, teléfonos personales ni contenido de denuncias.

## Riesgos y alcance pendiente

- Phase 1 no incluye autenticación multiusuario; la protección depende del enlace local `127.0.0.1` y `TrustedHostMiddleware`.
- El matching es apoyo de priorización, no una decisión. Diferencias de nombre/dirección requieren revisión.
- La cadena hash detecta alteraciones lógicas, pero no sustituye backups, control de acceso ni almacenamiento WORM.
- Antes de producción deben definirse retención, roles, backups cifrados, monitoreo y un proceso aprobado de publicación/derivación separado.
