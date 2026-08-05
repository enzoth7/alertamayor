# Registro de bÃºsqueda pÃºblica â€” Durazno

**Fecha:** 2026-08-04  
**Objetivo:** descubrir sedes actuales probables que no estuvieran ya claramente representadas en el Ã­ndice nacional, y detectar alias, sucursales, mudanzas, reutilizaciÃ³n de domicilios y falsos positivos territoriales.

## Insumos de exclusiÃ³n

- `known_facilities_exclusion_index_2026-08-03.json`: 953 entradas nacionales.
- Durazno exacto por departamento: 21.
- Durazno en alcance amplio: 22, incluyendo un candidato OSM sin departamento en Maciel 505.
- `known_facilities_exclusion_conflicts_2026-08-03.csv`: 1 conflicto de Durazno.
- `known_facilities_exclusion_audit_2026-08-03.md`.
- MSP: https://www.gub.uy/ministerio-salud-publica/sites/ministerio-salud-publica/files/2026-06/ELEPEM%20HABILITADOS%20JUNIO%202026.pdf
- MIDES Durazno: https://www.gub.uy/ministerio-desarrollo-social/etiqueta/otros/durazno-establecimientos-larga-estadia-para-personas-mayores-certificado-social
- Aderama 2026: https://aderama.org.uy/socios-2026/

## Zonas y localidades cubiertas

- **Ciudad de Durazno y periferia:** Centro, Barrio HipÃ³dromo, Santa Bernardina, corredores Herrera y Zorrilla, Maciel, 25 de Agosto, Batalla de las Piedras y zonas suburbanas.
- **SarandÃ­ del YÃ­ y este:** SarandÃ­ del YÃ­, Villa del Carmen, Blanquillo y Aguas Buenas.
- **Eje Ruta 5:** Carlos Reyles, Pueblo Centenario, Baygorria y RincÃ³n de Baygorria.
- **Norte rural y bordes:** La Paloma, San Jorge, Colonia Rossell y Rius y resultados fronterizos de Cerro Chato.

## Consultas representativas

- `"residencial adulto mayor" Durazno`
- `"hogar de ancianos" Durazno`
- `"casa de salud" adultos mayores Durazno`
- `"residencia geriÃ¡trica" Durazno`
- `site:instagram.com residencial Durazno adulto mayor`
- `site:facebook.com residencial Durazno adulto mayor`
- `"residencial" "SarandÃ­ del YÃ­" adulto mayor`
- `"hogar" Blanquillo personas mayores`
- `"residencial" "Villa del Carmen" Durazno`
- `"residencial" "Carlos Reyles" adulto mayor`
- `"hogar de ancianos" "Pueblo Centenario"`
- `"residencial" "La Paloma" Durazno`
- `"hogar" "San Jorge" adultos mayores Durazno`
- `site:1122.com.uy/local residenciales Durazno`
- `site:aderama.org.uy/socios-2026 Durazno residencial`
- `nombre exacto + telÃ©fono para cada pista`
- `direcciÃ³n exacta + nombre histÃ³rico`
- `nombre actual + operador + sucursales`
- `direcciÃ³n compartida + identidades distintas`

## Familias de fuentes

- Ã­ndice nacional, conflictos y auditorÃ­a;
- MSP, MIDES y catÃ¡logo oficial de datos;
- Ministerio del Interior y Gobierno de Durazno;
- Aderama 2026;
- Instagram y Facebook pÃºblicos/indexados;
- medios locales de Durazno y Blanquillo;
- 1122 y directorios comerciales;
- OpenStreetMap y candidatos privados existentes;
- sitios institucionales y organizacionales;
- bÃºsqueda inversa por nombre, domicilio, telÃ©fono, usuario y localidad.

## Pasadas realizadas

### 1. Matriz de exclusiÃ³n departamental

Se extrajeron las 21 entradas exactas de Durazno, el candidato OSM de Maciel 505 y el conflicto de Tea Garden. Se prepararon nombres, alias, domicilios y telÃ©fonos para evitar redescubrimientos.

### 2. BÃºsqueda por capital y barrios

Se buscaron categorÃ­as, sinÃ³nimos, calles, barrios y nombres de establecimientos en la ciudad de Durazno y su periferia.

### 3. BÃºsqueda por localidades

Se hicieron pasadas separadas para SarandÃ­ del YÃ­, Blanquillo, Villa del Carmen, Carlos Reyles, Pueblo Centenario, La Paloma, San Jorge y otros corredores.

### 4. Redes, directorios y medios

Se cruzaron perfiles y publicaciones pÃºblicas, directorios comerciales, Aderama, fuentes oficiales y medios locales. Las pistas sostenidas por una sola fuente sin fecha quedaron en `needs_more_evidence`.

### 5. BÃºsqueda inversa y relaciones temporales

Cada candidato relevante se revisÃ³ por direcciÃ³n, telÃ©fono, variantes de nombre, operador y posible identidad previa. Se marcaron las relaciones Tu Hogar/AÃ±os Dorados, DoÃ±a InÃ©s/El Bienestar, Reino/Reina de las Flores, Sagrada Familia/Sagrado CorazÃ³n, Maciel 505/630 y las sedes Tea Garden.

### 6. Control territorial y de categorÃ­a

Se corrigiÃ³ RincÃ³n de Luz como resultado de La Paloma, Rocha. TambiÃ©n se separaron El Sauzal, Casa del Adulto Mayor y Residencia S.A.R.U. por no corresponder a ELEPEM.

## Limitaciones

1. Instagram y Facebook no indexan todo el contenido pÃºblico.
2. Una pÃ¡gina o ficha puede permanecer visible despuÃ©s de un cambio de operador o cese de actividad.
3. Varias pÃ¡ginas de directorio pertenecen a la misma familia y no cuentan como evidencia independiente.
4. Las direcciones por intersecciÃ³n o punto de referencia requieren verificaciÃ³n antes de geocodificar.
5. La clave privada de Google no fue utilizada por ChatGPT.
6. No se puede detectar con certeza una sede sin huella pÃºblica.
7. La referencia 31 no es una cuota ni una resta automÃ¡tica.
8. Esta es una primera pasada sistemÃ¡tica, no una declaraciÃ³n de cobertura 100 %.

## Cierre provisional

Durazno queda **investigado sistemÃ¡ticamente en una primera pasada**. El siguiente paso es el `dry-run` de Codex contra Supabase, el Ã­ndice, OSM, alias, telÃ©fonos, domicilios y observaciones privadas. Ninguno de los registros estÃ¡ autorizado para publicaciÃ³n automÃ¡tica.