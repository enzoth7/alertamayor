# Registro de bÃºsqueda pÃºblica â€” Treinta y Tres

**Fecha:** 2026-08-04  
**Objetivo:** descubrir sedes actuales probables que no estuvieran ya claramente representadas en el Ã­ndice nacional y detectar alias, mudanzas, errores departamentales, histÃ³ricos y falsos positivos.

## Insumos de exclusiÃ³n

- `known_facilities_exclusion_index_2026-08-03.json`: 953 entradas nacionales.
- Treinta y Tres exacto por departamento: 2.
- Candidato OSM sin departamento probablemente asociado a Santa Clara: `EXC-CANDIDATE-5E1C228FD6B7EC36`.
- `known_facilities_exclusion_conflicts_2026-08-03.csv`: 0 conflictos etiquetados exactamente como Treinta y Tres; el candidato OSM relacionado conserva 2 conflictos sin departamento.
- `known_facilities_exclusion_audit_2026-08-03.md`.
- Aderama 2026: https://aderama.org.uy/socios-2026/
- NÃ³mina nominal histÃ³rica 2019: https://www.gub.uy/ministerio-desarrollo-social/sites/ministerio-desarrollo-social/files/2019-06/respuesta-a-pedido-de-informacion%5B1%5D_3.pdf
- MSP: https://www.gub.uy/ministerio-salud-publica/sites/ministerio-salud-publica/files/2024-03/ELEPEM%20CERTIFICADOS%207-3-2024.pdf

## Zonas y localidades buscadas

- **Capital y periferia inmediata:** Treinta y Tres, Centro, Barrio Sosa, Villa Sara, El Verde Alto, corredores de Ruta 8.
- **Noreste:** Vergara, RincÃ³n y entorno de rutas 18 y 91.
- **Noroeste:** Santa Clara de Olimar, Isla Patrulla y corredor de Ruta 7.
- **Oeste:** Cerro Chato, Valentines y corredor de Ruta 19.
- **Este y sudeste:** General Enrique MartÃ­nez / La Charqueada, entorno del CebollatÃ­ y zonas rurales.
- **Parajes y centros menores:** MendizÃ¡bal, MarÃ­a Albina, Arrocera Zapata y bÃºsquedas rurales generales.

## Consultas representativas

- `"residencial adulto mayor" "Treinta y Tres" Uruguay`
- `"hogar de ancianos" "Treinta y Tres" Uruguay`
- `"geriÃ¡trico" "Treinta y Tres" Uruguay`
- `site:instagram.com residencial adulto mayor "Treinta y Tres"`
- `site:facebook.com residencial adulto mayor "Treinta y Tres"`
- `"Residencial Paradise" "Manuel Calleros 249"`
- `"Paradise" "Jacinto Trapani 1187"`
- `"Residencial Los Ãlamos" "Treinta y Tres" 099635067`
- `"Los Ãlamos 2" "Centro Integrado de Treinta y Tres"`
- `"GeriÃ¡trico Bienestar" "SarandÃ­ 1346"`
- `"Hogar El Amanecer" "Treinta y Tres" 44533813`
- `"Las Comadres" "SimÃ³n del Pino 1482"`
- `"099740051" residencial`
- `"Hogar de Ancianos de Santa Clara de Olimar"`
- `"Hogar de Ancianos Vergara Siglo XXI"`
- `"Hogar de Ancianos de Cerro Chato" Ruta 7 km 250`
- `"Hogar Mi SueÃ±o" "33 Orientales 974"`
- `"Residencia Asistida Treinta y Tres"`
- `"Hogar de Ancianos CebollatÃ­" Rocha`
- bÃºsquedas inversas por cada telÃ©fono, nombre y domicilio relevante.

## Familias de fuentes

- Ã­ndice nacional de exclusiÃ³n, candidatos privados y OSM;
- MSP, MIDES, BPS, ASSE, Intendencia y municipios;
- Instagram y Facebook pÃºblicos/indexados;
- Aderama 2026, 1122 y directorios comerciales;
- Mapeo de la Sociedad Civil;
- medios nacionales y locales;
- bÃºsquedas inversas por nombre, telÃ©fono y direcciÃ³n;
- resultados cartogrÃ¡ficos pÃºblicos cuando fueron accesibles.

## Pasadas realizadas

### 1. LÃ­nea de base y matriz histÃ³rica

Se extrajeron las 2 entradas exactas departamentales del Ã­ndice y se revisaron las 16 filas nominales de Treinta y Tres del documento de 2019. Cada nombre histÃ³rico se buscÃ³ de forma independiente.

### 2. Capital: redes, directorios y domicilios

Se investigaron Paradise, Los Ãlamos, Bienestar, El Amanecer, Las Comadres y los dos residenciales ya presentes en el Ã­ndice. Se hicieron bÃºsquedas inversas por telÃ©fono y direcciÃ³n.

### 3. Municipios y localidades

Se revisaron Vergara, Santa Clara de Olimar, Cerro Chato, La Charqueada y localidades menores. Se distinguieron hogares de larga estadÃ­a de clubes recreativos, recursos de salud y proyectos de construcciÃ³n de otros departamentos.

### 4. Relaciones temporales

Se marcaron mudanzas, errores departamentales, nombres compartidos entre departamentos y sitios histÃ³ricos. No se fusionÃ³ ningÃºn caso por nombre solo.

### 5. Google Maps y fichas cartogrÃ¡ficas

Se intentaron bÃºsquedas cartogrÃ¡ficas pÃºblicas. Google Maps requiriÃ³ JavaScript y no expuso fichas completas; no se usÃ³ API ni clave local, no se capturaron reseÃ±as, `place_id` o coordenadas nuevas. Los candidatos prioritarios quedan listos para verificaciÃ³n posterior.

## Limitaciones

1. Instagram y Facebook no indexan todo el contenido pÃºblico.
2. Una pÃ¡gina puede seguir visible despuÃ©s de un cierre o una mudanza.
3. Aderama y 1122 son directorios sectoriales/comerciales, no listas administrativas.
4. La nÃ³mina de 2019 es histÃ³rica y no demuestra continuidad actual.
5. Los resultados sociales pueden mezclar la calle â€œ33 Orientalesâ€ con el departamento Treinta y Tres.
6. Google Maps no fue accesible de forma completa y la clave local no fue utilizada.
7. No se puede detectar con certeza una sede sin huella pÃºblica.
8. La referencia 15 no es una cuota ni se resta de las entradas del Ã­ndice.
9. Esta es una primera pasada sistemÃ¡tica, no una declaraciÃ³n de cobertura 100 %.

## Cierre provisional

Treinta y Tres queda **investigado sistemÃ¡ticamente en una primera pasada**. No surgiÃ³ un candidato nuevo actual con domicilio exacto que pudiera separarse con confianza de histÃ³ricos, continuidades, mudanzas o pistas incompletas. El siguiente paso es el `dry-run` de Codex contra Supabase, el Ã­ndice, OSM y las observaciones privadas.