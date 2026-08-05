# Paso 20 - auditoria final de los cinco departamentos

Fecha: 2026-08-04  
Alcance: Paysandu, Artigas, Rocha, Canelones y Montevideo; pasos 12-20, con el paso 11 omitido por decision del proyecto.

## Resultado

La fase tecnica queda aprobada para el lote privado. Se procesaron los cinco departamentos, se preservo la procedencia y no hubo publicacion automatica. `public.residenciales` permanecio en 804 filas.

IDE Uruguay devolvio 25 coincidencias estrictas que fueron aprobadas por `project_owner`; otras 10 requieren revision adicional. Las 25 coordenadas se guardaron solamente en el workflow privado y quedaron disponibles para la capa autenticada. No se publico ningun candidato.

## Controles aprobados

- Instalacion reproducible: `npm ci`, 327 paquetes instalados.
- Pruebas: 91 aprobadas, 0 fallidas.
- Lint: 0 errores y 23 advertencias preexistentes.
- Build de produccion: correcto con Next.js 15.5.22.
- `git diff --check`: correcto.
- JSON: 60 archivos analizados, 0 invalidos.
- Indice nacional: 1.084 entradas, 186 candidatos privados y 0 IDs duplicados.
- Departamentos sin resolver en el indice: 32.
- Procedencia del lote: 325 referencias y 0 incompletas.
- Revision departamental: 35 nuevos verificados y 145 candidatos incluidos en los planes de importacion privada.
- Estado remoto final: 175 candidatos privados, 302 observaciones, 300 enlaces y 170 eventos de revision.
- Tabla publica: 804 antes y despues; candidatos publicamente elegibles: 0.
- Fuentes Google/SerpAPI persistidas como observaciones remotas nuevas: 0.
- Payloads crudos en el snapshot de auditoria: excluidos.
- Archivos originales bajo `Base de Datos/` modificados: 0; los nueve hashes del manifiesto siguen coincidiendo.
- Archivos `.env` versionados: 0.
- Geocodificacion IDE: 35 consultas, 25 coordenadas aprobadas, 10 casos a revisar y 0 errores.
- Escrituras de geocodificacion privada: 25; puntos habilitados en la capa privada: 25; publicaciones: 0.

## Paysandu y SerpAPI

Se evaluaron 53 pistas de mapas publicos: 8 corroboraron registros sociales, 18 quedaron retenidas hasta conseguir una fuente independiente, 16 estaban fuera del departamento y 11 no correspondian al alcance ELEPEM. No se trasladaron a Supabase nombres exclusivos, direcciones, telefonos, coordenadas, resenas, estados, `place_id` ni URLs de fichas de Google.

## Montevideo

El insumo original contenia 35 referencias al indice local sin URL publica. Se separaron como referencias internas no independientes y 23 niveles de evidencia se degradaron conservadoramente a C. El resultado fue 19 nuevos verificados, 40 pistas privadas pendientes, 21 reparaciones del indice y 2 descartes.

## Metricas del lote

- 252 pistas brutas.
- 34 coincidencias exactas y 10 probables.
- 35 nuevos verificados.
- 12 registros sin direccion.
- 5 falsos positivos y 1 servicio no ELEPEM.
- 145 importaciones privadas contabilizadas por los cierres departamentales.
- 153 casos continuan abiertos o requieren resolucion de vinculo.
- 0 publicaciones.

Artigas, Canelones, Paysandu y Rocha tienen cierre sistematico provisional. Montevideo queda como revalidacion parcial porque el insumo no documenta un log territorial granular suficiente para declarar cierre sistematico.

## Riesgos pendientes

1. `npm audit` informa 3 vulnerabilidades altas en la cadena de Next.js (`next`, `postcss` y `sharp`). No se ejecuto `npm audit fix --force` porque puede introducir cambios incompatibles.
2. Supabase remoto continua usando el workflow privado legado `discovery_private`; el esquema normalizado `elepem_core` no esta desplegado.
3. Diez resultados de IDE todavia requieren revision manual y no tienen coordenadas aprobadas.
4. Permanecen 153 decisiones abiertas, incluidas coincidencias conocidas, evidencia insuficiente y reparaciones del indice.
5. Los 18 leads exclusivos de SerpAPI no pueden normalizarse ni importarse hasta tener una fuente publica independiente permitida.

## Decision

Paso 20 aprobado para el lote privado, incluidas 25 coordenadas IDE revisadas. Esta aprobacion no autoriza publicacion, promocion publica de candidatos ni copia de resenas de Google.
