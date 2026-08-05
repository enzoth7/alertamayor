# Paso 16 - resultado de visualizacion privada

Fecha: 2026-08-04

## Decision

Las 25 coordenadas aprobadas quedan habilitadas solamente en la capa privada autenticada. No se habilita ningun punto nuevo en el mapa publico.

- 25 candidatos `verified_new` tienen coordenadas IDE Uruguay aprobadas por `project_owner`.
- 25 observaciones IDE y 25 enlaces de procedencia quedaron almacenados en el workflow privado.
- 25 eventos de auditoria registran la correccion de coordenadas.
- 10 resultados de geocodificacion siguen sin aprobar.
- 25 puntos pueden mostrarse en la capa privada autenticada.
- 0 candidatos tienen `public_eligible=true`.
- 0 candidatos fueron publicados.
- `public.residenciales` permanecio en 804 filas.

La capa privada identifica estos puntos como `Geocodificacion IDE Uruguay aprobada`. La aprobacion de coordenadas no equivale a una autorizacion de publicacion.

## Condiciones para el mapa publico

Cada candidato necesita una autorizacion explicita e individual de publicacion. Hasta entonces mantiene la leyenda interna `Pista publica pendiente de verificacion` y permanece fuera del mapa publico.
