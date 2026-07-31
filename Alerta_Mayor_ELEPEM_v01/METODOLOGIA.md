# Alerta Mayor - Mapa y registro público inicial de ELEPEM (v0.1)

Fecha de construcción: 2026-07-31.

## Propósito

Esta versión reúne y cruza información **ya publicada** sobre Establecimientos de Larga Estadía para Personas Mayores (ELEPEM) en Uruguay. No es un registro oficial, no sustituye al MSP ni a MIDES/Inmayores, no recibe denuncias y no evalúa la calidad de la atención.

## Fuentes incorporadas

1. Listado de **212 establecimientos con habilitación final MSP**, actualizado a junio de 2026.
2. **281 filas nominales** recuperadas de páginas departamentales de establecimientos con Certificado Social de MIDES. La página general informa 319 establecimientos, por lo que existe una brecha de 38 filas respecto de las páginas localizadas.
3. **828 emisiones históricas** de certificados de registro MSP entre 2017 y marzo de 2024.
4. **36 filas** del Registro de Proveedores del Programa de Apoyo al Cuidado Permanente (PACP), corte agosto de 2023.
5. El Informe Anual 2023 del Sistema Nacional Integrado de Cuidados como referencia agregada de **1.481 ELEPEM** al 5 de marzo de 2024.
6. Direcciones Geográficas del Uruguay (IDE) para ubicar las sedes de manera exacta o aproximada.

## Qué significa cada distintivo

- **Habilitación final MSP**: aparece en el listado final de junio de 2026.
- **Certificado Social MIDES**: aparece en una página departamental pública de MIDES localizada para esta carga.
- **Certificado de registro MSP (histórico)**: existe al menos una emisión publicada entre 2017 y marzo de 2024. No se interpreta como vigencia actual.
- **Proveedor PACP**: aparece en el registro programático publicado en agosto de 2023.

La ausencia en una capa no demuestra clandestinidad, cierre o incumplimiento.

## Resolución de identidades

La base conserva 1357 registros originales y los agrupa en 810 sedes probables. Se usan coincidencias exactas de departamento, calle y puerta y, de manera conservadora, similitud alta de nombre y dirección. El mismo nombre en direcciones distintas se conserva como sedes separadas.

La vinculación automática puede cometer dos tipos de error:

- **falso negativo**: el mismo establecimiento queda separado por cambio de nombre, dirección incompleta o errores de escritura;
- **falso positivo**: dos registros diferentes se unen por una coincidencia excepcionalmente similar.

Por eso se incluyen los registros de fuente para auditoría y revisión humana.

## Georreferenciación

Los pines se clasifican como:

- calle y puerta exacta;
- puerta más cercana en la misma calle;
- centroide de calle;
- centroide de localidad;
- centroide departamental.

Los pines de baja precisión llevan una ligera separación visual para que no queden superpuestos. No deben utilizarse para una inspección sin verificación previa.

## Brechas conocidas

- MIDES informa 319 establecimientos con Certificado Social, pero esta versión recuperó 281 filas de páginas departamentales.
- No se localizaron páginas nominales indexadas para Rivera, Rocha, Tacuarembó y Treinta y Tres durante la construcción.
- El universo agregado de 1.481 no tiene un padrón nominal público equivalente, por lo que no puede reconstruirse completamente con estas fuentes.
- Las fechas de actualización son heterogéneas.
- La aplicación no incluye todavía reseñas de Google, noticias, sanciones, inspecciones individuales ni comunicaciones ciudadanas.

## Uso responsable de reseñas en una versión futura

Las reseñas se mantendrían separadas del estado administrativo. Una reseña sería una señal para verificar, no prueba de maltrato o incumplimiento. No se publicaría un ranking automático de “buenos” y “malos” residenciales.
