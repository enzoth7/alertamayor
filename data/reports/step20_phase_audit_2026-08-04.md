# Paso 20 — auditoría final de la fase

Fecha: 2026-08-04  
Alcance: pasos 12, 13, 14 y 17 de Artigas, Rocha, Canelones y Paysandú; métricas nacionales del paso 19. Paysandú se conserva como revalidación parcial por falta de cobertura territorial documentada.

## Resultado

La fase supera los controles técnicos y de seguridad definidos para este lote. Ningún candidato fue publicado automáticamente y `public.residenciales` permaneció en 804 filas antes y después de las cuatro importaciones privadas autorizadas.

## Comandos ejecutados

- `npm ci`
- `node --test` sobre los 18 archivos `scripts/tests/*.test.mjs`
- `npm run lint`
- `npm run build` con `ALERTAMAYOR_NEXT_DIST_DIR=.next-step20-paysandu-build`
- validación local de JSON, CSV, IDs, procedencia, secretos, `.env`, campos prohibidos de Google y escrituras públicas
- `git diff --check`
- `npm audit --json`

## Controles aprobados

- Instalación reproducible: 327 paquetes instalados.
- Pruebas: 88 aprobadas, 0 fallidas.
- Build de producción: correcto.
- Lint: 0 errores y 23 advertencias existentes.
- JSON: 44 archivos parseados, 0 inválidos.
- Índice de exclusión: 953 IDs y 0 duplicados.
- Procedencia: 190 referencias de Artigas, Rocha, Canelones y Paysandú; 0 incompletas.
- Revisión humana: 112 decisiones registradas.
- Importación: 86 candidatos privados y 140 observaciones.
- Secretos: 68 archivos de texto del alcance analizados, 0 coincidencias sospechosas.
- Archivos de entorno exactos versionados: 0; `.env` está ignorado.
- Persistencia prohibida de Google Reviews, ratings, fotos, teléfonos, coordenadas, horarios o respuestas crudas: 0 campos detectados.
- Mutaciones a `public.residenciales` desde los ocho scripts de esta fase: 0.
- Conteo público en las cuatro importaciones: 804 antes y 804 después.
- Candidatos públicamente aprobados por el lote: 0.
- Coordenadas verificadas o inventadas: 0.
- Reviews de Google almacenadas: 0.
- Pendientes departamentales: 92 filas, 8 de Artigas, 13 de Rocha, 57 de Canelones y 14 de Paysandú.
- Snapshot nacional: 19 departamentos, 86 importaciones privadas y 0 publicaciones.
- Cerrados sistemáticamente: Artigas, Canelones y Rocha. Paysandú figura como `step17_partial_revalidation`, no como departamento cerrado.
- El snapshot marca expresamente que el índice del 3 de agosto es anterior a los cierres del 4 de agosto.
- `git diff --check`: correcto.

## Riesgos y deudas pendientes

1. `npm audit` informa 3 vulnerabilidades altas: `next`, `postcss` y `sharp`. No se aplicó `npm audit fix --force` para evitar una actualización incompatible sin revisión.
2. Supabase remoto todavía no tiene desplegado el esquema normalizado `elepem_core`; los lotes se cargaron en el flujo privado legado `discovery_private`.
3. Permanecen 92 casos abiertos: 57 en Canelones, 14 en Paysandú, 13 en Rocha y 8 en Artigas. En Paysandú, siete requieren evidencia adicional y siete resolver vínculos canónicos conocidos.
4. El índice nacional debe regenerarse: es anterior a las importaciones y contiene 32 entradas sin departamento resoluble.
5. Solo Rocha y Canelones tienen un total histórico departamental disponible en los insumos actuales; los demás valores permanecen `null`.
6. Existen seis scripts históricos fuera de esta fase capaces de escribir en `public.residenciales`. No fueron ejecutados ni modificados por este lote; cualquier uso futuro requiere revisión y autorización explícitas.
7. El worktree contiene cambios y eliminaciones ajenos a esta fase, incluyendo trabajo paralelo de WhatsApp/n8n. Se preservaron y cualquier commit debe seleccionar archivos explícitamente.

## Incidente resuelto

El primer intento de importación de Canelones fue rechazado por una restricción temporal y PostgreSQL revirtió toda la transacción. Se corrigió el cálculo de `first_seen_at`, se agregó una prueba de regresión y la importación posterior fue reconciliada con 58 filas, 0 conflictos y 0 cambios públicos.

El cierre de Artigas reveló un segundo problema de compatibilidad local: su archivo guarda cobertura dentro de `scope`, usa `type` para las fuentes y clasificaciones departamentales específicas. El generador fue ampliado de forma retrocompatible y se agregó una prueba; no hubo fallo ni escritura remota durante esta corrección.

El matching de Paysandú reveló que códigos postales de cinco dígitos se interpretaban como puertas y que `BVAR`, `Bulevar` y `Avenida` no se normalizaban de forma equivalente. La corrección y su prueba de regresión permitieron vincular correctamente Lore&Car, María Carolina y Colibrí sin fusiones automáticas.

## Decisión

Paso 20 aprobado para este lote. El cierre no autoriza publicación, geocodificación, migración de esquema ni promoción de candidatos.
