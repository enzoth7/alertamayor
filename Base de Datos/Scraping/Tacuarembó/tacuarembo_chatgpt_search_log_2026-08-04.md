# Registro de bÃºsqueda pÃºblica â€” TacuarembÃ³

**Fecha:** 2026-08-04  
**Objetivo:** descubrir sedes actuales probables que no estuvieran ya claramente representadas en el Ã­ndice nacional, y detectar alias, sucursales, mudanzas, reutilizaciÃ³n de domicilios, identidades histÃ³ricas y falsos positivos departamentales.

## Insumos de exclusiÃ³n

- `known_facilities_exclusion_index_2026-08-03.json`: 953 entradas nacionales.
- TacuarembÃ³ exacto por departamento: 11.
- Candidato OSM adicional sin departamento: Hogar de Ancianos San Vicente de Paul.
- `known_facilities_exclusion_conflicts_2026-08-03.csv`: 128 conflictos nacionales; ninguno etiquetado exactamente como TacuarembÃ³.
- `known_facilities_exclusion_audit_2026-08-03.md`.
- Aderama 2026: https://aderama.org.uy/socios-2026/
- Acuerdo ASSEâ€“COMTA histÃ³rico: https://documentos.diputados.gub.uy/docs/L49/Original/03519.pdf
- MSP: https://www.gub.uy/ministerio-salud-publica/comunicacion/comunicados/listado-residenciales-habilitados-certificados-msp-alojan-personas-mayores

## Zonas cubiertas

- **Ciudad de TacuarembÃ³ y periferia:** centro, Barrio Ferrocarril, Barrio LÃ³pez, Barrio Torres, Balneario IporÃ¡ y corredores suburbanos.
- **Paso de los Toros y RincÃ³n del Bonete.**
- **San Gregorio de Polanco, Achar y Cuchilla de Peralta.**
- **Ansina, Las Toscas, CaraguatÃ¡ y Puntas de Cinco Sauces.**
- **Tambores, Piedra Sola, Curtina, Clara, Paso del Cerro y RincÃ³n de Tranqueras.**

## Consultas representativas

- `"residencial adulto mayor" TacuarembÃ³`
- `"hogar de ancianos" TacuarembÃ³`
- `"casa de salud" adulto mayor TacuarembÃ³`
- `"residencia geriÃ¡trica" TacuarembÃ³`
- `site:instagram.com residencial TacuarembÃ³ adulto mayor`
- `site:facebook.com residencial TacuarembÃ³ adulto mayor`
- `"residencial" "Paso de los Toros" adulto mayor`
- `"hogar de ancianos" "Paso de los Toros"`
- `"residencial" "San Gregorio de Polanco"`
- `"hogar de ancianos" "San Gregorio de Polanco"`
- `"residencial" Ansina adulto mayor`
- `"Hogar Casa de la Caridad" Ansina`
- `"residencial" Tambores adulto mayor`
- `"residencial" "Balneario IporÃ¡"`
- `"Tacuavida" TacuarembÃ³`
- `"Tacuavida Plus" TacuarembÃ³`
- `"Residencial Alhoa" TacuarembÃ³`
- `"Residencial Aloha" TacuarembÃ³`
- `"Las Mariposas Residencial Boutique" TacuarembÃ³`
- `"Residencial Vida Feliz" TacuarembÃ³`
- `"Residencial San AgustÃ­n" "Paso de los Toros"`
- `"Residencial Los Jazmines" TacuarembÃ³`
- `"Residencial Nuevo Amanecer" "Henry Dunant 414"`
- `"Casa Las Violetas" "Paso de los Toros"`
- `"Segundo Marisel" TacuarembÃ³`
- `"Residencial Los Patitos" "San Gregorio de Polanco"`
- telÃ©fono exacto + nombre para cada pista;
- direcciÃ³n exacta + nombre;
- nombre histÃ³rico + localidad;
- usuario social + telÃ©fono;
- operador + segunda sede;
- domicilio + identidad anterior.

## Familias de fuentes

- Ã­ndice nacional de exclusiÃ³n, conflictos y auditorÃ­a;
- MSP, ASSE y documentos oficiales histÃ³ricos;
- Intendencia de TacuarembÃ³;
- Aderama 2026;
- sitios propios;
- Instagram y Facebook pÃºblicos/indexados;
- 1122;
- directorios comerciales y cartogrÃ¡ficos;
- medios locales y nacionales;
- bÃºsqueda inversa por nombre, domicilio, telÃ©fono, dominio y usuario.

## Pasadas realizadas

### 1. ExtracciÃ³n del alcance conocido

Se aislaron las 11 entradas exactas de TacuarembÃ³ y el candidato OSM de San Vicente de Paul sin departamento. Se revisaron nombres, alias, domicilios, fuentes y posibles relaciones.

### 2. RevisiÃ³n visual de la fuente histÃ³rica

Se revisaron visualmente las pÃ¡ginas del acuerdo ASSEâ€“COMTA. La fuente aporta una lista histÃ³rica de hogares, residenciales y dos servicios de inserciÃ³n familiar. No se trataron todos sus nombres como establecimientos actuales.

### 3. Barrido por localidades y tÃ©rminos alternativos

Se buscaron las categorÃ­as residencial, hogar, casa de salud, geriÃ¡trico, residencia asistida y adulto mayor en cada corredor territorial.

### 4. Redes, sitios propios y directorios

Se cruzaron perfiles pÃºblicos, publicaciones indexadas, sitios institucionales, Aderama, 1122 y directorios cartogrÃ¡ficos. Una ficha comercial no fue considerada prueba administrativa.

### 5. BÃºsqueda inversa y relaciones

Cada pista relevante se revisÃ³ por nombre, domicilio, telÃ©fono y nombres anteriores. Se marcaron:

- Tacuavida / Tacuavida Plus;
- Los Jazmines / Nuevo Amanecer / Henry Dunant 414;
- Casa Las Violetas / Residencial Las Violetas;
- Segundo Marisel / Maricel / FantasÃ­a Maricel;
- Hogar de San Gregorio / Los Patitos;
- San Vicente oficial / candidato OSM.

### 6. CorrecciÃ³n territorial y exclusiones

Se comprobÃ³ que DespuÃ©s de Nosotros estÃ¡ fÃ­sicamente del lado de PaysandÃº. Los servicios de inserciÃ³n familiar y el hogar identificado como psiquiÃ¡trico fueron separados de ELEPEM.

## Hallazgos sin identidad importable

- Una referencia pÃºblica a un establecimiento de RincÃ³n de Tranqueras no permitiÃ³ identificar de forma estable nombre, domicilio y actividad actual. No se estructurÃ³.
- Resultados para Casa Romero y Edad Dorada correspondÃ­an a comercios, referencias histÃ³ricas o ruido territorial.
- No se recogieron denuncias, datos de residentes ni informaciÃ³n de salud.

## Limitaciones

1. Instagram y Facebook no indexan todo el contenido pÃºblico.
2. Una pÃ¡gina o ficha puede permanecer visible despuÃ©s de una mudanza o cierre.
3. Un directorio puede reutilizar informaciÃ³n antigua.
4. Aderama es un directorio sectorial, no una lista administrativa.
5. La fuente de 2020 es histÃ³rica y no demuestra continuidad hasta 2026.
6. No se utilizÃ³ una clave privada de Google Maps.
7. No se puede detectar con certeza una sede sin huella pÃºblica.
8. La referencia de 23 no es una cuota ni una resta contra las 11 entradas.
9. Las direcciones por intersecciÃ³n o punto de referencia no deben transformarse en coordenadas sin revisiÃ³n.
10. Esta es una primera pasada sistemÃ¡tica, no una declaraciÃ³n de cobertura total.

## Cierre provisional

TacuarembÃ³ queda **investigado sistemÃ¡ticamente en una primera pasada**. El siguiente paso es el `dry-run` de Codex contra Supabase, el Ã­ndice, OSM, alias, telÃ©fonos y observaciones privadas. Solo los candidatos que sobrevivan esa comparaciÃ³n deben pasar a verificaciÃ³n de direcciÃ³n y `place_id`.