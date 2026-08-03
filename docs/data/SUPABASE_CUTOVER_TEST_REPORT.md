# Informe de prueba del corte normalizado de Supabase

Fecha: 2026-08-03  
Paso: 6 de `docs/PLAN_NACIONAL_DESCUBRIMIENTO_ELEPEM.md`  
Target probado: PostgreSQL/Supabase local desechable `local-elepem-backfill-20260803` (`127.0.0.1:55432/postgres`)  
Proyecto remoto auditado: `itolluaivfoxnaohbsdk`, solo lectura; no se aplicaron migraciones ni escrituras remotas.

## Veredicto

La implementación y las pruebas técnicas del corte reversible pasaron en el entorno local. El corte de producción **no está aprobado ni ejecutado**.

La puerta pública permanece cerrada porque `public.facilities_public_approved` contiene 0 filas. Cambiar hoy producción a `ELEPEM_DATA_SOURCE=normalized` dejaría el mapa sin establecimientos. El valor predeterminado y recomendado hasta completar revisiones humanas A/B sigue siendo:

```text
ELEPEM_DATA_SOURCE=legacy
```

## Cambios de aplicación probados

- Selector allowlisted y reversible: `legacy`, `compatibility` o `normalized`.
- El mapa público puede leer `public.facilities_public_approved` conservando el contrato JSON anterior.
- La cola privada puede leer `public.facilities_current_internal` y sugerencias enlazadas por `facility_id`.
- Matching e importadores normalizados consultan `public.known_facilities_exclusion_view`.
- El importador OSM sigue escribiendo solo corridas, observaciones, candidatos, fuentes e IDs privados; en modo normalizado completa `resolved_facility_id`.
- La sincronización de sugerencias admite instalaciones con `facility_id` aunque todavía no tengan ID legado.
- El POST de revisión hace dual-write temporal de IDs legado/normalizado cuando existe el vínculo, sin publicar candidatos.
- No se incorporó una clave de service role al navegador.
- Las tablas anteriores permanecen intactas.

## Reconciliación local final

| Control | Resultado |
|---|---:|
| `public.residenciales` legado | 804 |
| vista de compatibilidad | 804 |
| instalaciones normalizadas | 896 |
| instalaciones actuales | 878 |
| instalaciones históricas | 18 |
| vista pública normalizada aprobada | 0 |
| índice/vista de exclusión | 949 |
| candidatos privados | 53 |
| candidatos elegibles para publicación | 0 |
| sugerencias de matching | 90 |
| sugerencias con `facility_id` | 90 |
| eventos de revisión humana | 0 |
| diferencias de departamento en las 804 correspondencias legadas | 0 |
| filas huérfanas | 0 |
| IDs externos duplicados | 0 |
| claves de instalación duplicadas | 0 |

Las 18 instalaciones históricas son las mismas 18 sin dirección física/geocódigo actual; no se inventaron coordenadas para completar el mapa.

Tres registros representativos (`Casa Hogar Cuidando Con Amor`, `casa mia` y `Casa Ravello`) conservaron nombre, departamento, dirección y coordenadas entre el registro legado y la instalación normalizada.

## Importación y matching

La importación OSM normalizada se ejecutó dos veces sobre los fixtures existentes:

- 32 candidatos evaluados;
- 30 candidatos insertados o actualizados en la cola privada;
- 10 candidatos con coincidencia normalizada;
- 804 filas públicas antes y después;
- 53 candidatos, 2.236 observaciones y 30 corridas antes y después de la repetición;
- 0 candidatos públicos o elegibles.

La sincronización privada dejó 90/90 sugerencias enlazadas a `facility_id` y mantuvo 804 filas públicas. La investigación social preparada se probó solo en dry-run contra el índice normalizado: 14 entradas válidas, 4 coincidencias exactas, 2 no coincidentes, 0 elegibles para mapa y 0 escrituras; no se contactó Instagram ni Facebook.

## Seguridad y pruebas

| Prueba | Resultado |
|---|---|
| migración forward repetida | pasa |
| backfill repetido | pasa, conteos idénticos |
| rollback y reaplicación | pasa |
| suite SQL transaccional | pasa |
| Supabase `db lint --level error` | 0 errores |
| tablas normalizadas con RLS + FORCE | 15/15 |
| grants de tabla a navegador | 0 |
| vistas `security_invoker` | 4/4 |
| sesión privada no autenticada | HTTP 401 |
| login E2E con credenciales locales ficticias | HTTP 200 |
| cola privada normalizada E2E | HTTP 200, 53 candidatos |
| endpoint público en compatibilidad | HTTP 200, 804 filas |
| endpoint público normalizado | HTTP 200, 0 filas aprobadas |
| `npm ci` desde lockfile limpio | pasa |
| lint | pasa, 0 errores y 22 advertencias preexistentes |
| TypeScript `--noEmit` | pasa |
| pruebas Node | 57/57 pasan |
| build de producción | pasa, 20 páginas/rutas |

`npm audit` informa 3 vulnerabilidades altas en `next`, `postcss` y `sharp`. La corrección automática propuesta intenta bajar Next a `9.3.3` y es un cambio mayor/regresivo; por eso no se aplicó. Debe resolverse mediante una actualización controlada separada del framework y sus pruebas.

## Rollback probado

El rollback local retiró el esquema canónico y conservó:

- 804 filas legadas;
- 53 candidatos;
- 2.236 observaciones;
- 90 sugerencias con respaldo legado;
- 30 IDs externos originales.

Luego se reaplicaron migración y backfill. Se restauraron 896 instalaciones, 804 mappings, 2.236 observaciones, 838 IDs externos y 90 sugerencias; una segunda ejecución produjo conteos idénticos.

Rollback funcional de la app:

1. configurar `ELEPEM_DATA_SOURCE=legacy`;
2. desplegar la misma versión de aplicación;
3. verificar que `/api/residenciales` responda 804 filas y encabezado `X-ELEPEM-Data-Source: legacy`.

El rollback SQL explícito está en `supabase/rollbacks/20260803042525_drop_normalized_elepem_core_model.sql`. Solo debe usarse tras respaldo y aprobación específica del target; no forma parte de la cadena automática de migraciones.

## Riesgos y puerta de aprobación

No cambiar producción ni avanzar al Paso 7 hasta que se cumpla todo lo siguiente:

1. aplicar la migración/backfill al target de producción con aprobación explícita y respaldo;
2. resolver o aceptar humanamente los 43 conflictos documentados;
3. registrar revisiones humanas trazables y evidencia A/B para las instalaciones que deban aparecer en el mapa;
4. confirmar que `facilities_public_approved` tenga el conjunto público esperado y reconciliado por departamento;
5. repetir E2E, RLS, conteos, registros representativos y rollback en staging/producción controlada;
6. tratar las 3 vulnerabilidades altas de dependencias en una actualización separada.

Hasta entonces, la conclusión de este informe es: **implementación de prueba aprobada; corte público de producción no apto**.
