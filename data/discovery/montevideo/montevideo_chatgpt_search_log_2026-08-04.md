# Registro de bÃºsqueda pÃºblica â€” Montevideo

**Fecha:** 2026-08-04  
**Objetivo:** descubrir sedes actuales probables que no estuvieran ya
claramente representadas en el Ã­ndice nacional, y detectar alias,
sucursales, mudanzas y reutilizaciÃ³n de domicilios.

## Insumos de exclusiÃ³n

- `known_facilities_exclusion_index_2026-08-03.json`: 953 entradas nacionales.
- Montevideo exacto por departamento: 503.
- Montevideo en alcance geogrÃ¡fico amplio: 562.
- `known_facilities_exclusion_conflicts_2026-08-03.csv`: 7 conflictos de Montevideo.
- `known_facilities_exclusion_audit_2026-08-03.md`.
- Aderama 2026: https://aderama.org.uy/socios-2026/
- MSP: https://www.gub.uy/ministerio-salud-publica/comunicacion/comunicados/listado-residenciales-habilitados-certificados-msp-alojan-personas-mayores
- NÃ³mina nominal histÃ³rica: https://www.gub.uy/ministerio-desarrollo-social/sites/ministerio-desarrollo-social/files/2019-06/respuesta-a-pedido-de-informacion%5B1%5D_3.pdf

## Zonas cubiertas

- **Centro y costa central**: Ciudad Vieja, Centro, CordÃ³n, Palermo, Barrio Sur, Parque RodÃ³, Punta Carretas
- **Pocitos, Buceo, Parque Batlle y La Blanqueada**: Pocitos, Buceo, Parque Batlle, La Blanqueada, La Comercial, Jacinto Vera
- **MalvÃ­n, Punta Gorda y Carrasco**: MalvÃ­n, MalvÃ­n Norte, Punta Gorda, Carrasco, Carrasco Norte, BaÃ±ados de Carrasco
- **UniÃ³n y corredores del este**: UniÃ³n, MaroÃ±as, MalvÃ­n Norte, Punta de Rieles, Villa EspaÃ±ola, ItuzaingÃ³
- **Prado y noroeste urbano**: Prado, Atahualpa, Aires Puros, Brazo Oriental, Bella Vista, Capurro, Reducto
- **Oeste**: La Teja, Belvedere, Paso Molino, Cerro, CasabÃ³, Pajas Blancas, Nuevo ParÃ­s
- **Norte y periferia**: ColÃ³n, Lezica, PeÃ±arol, Sayago, Manga, Piedras Blancas, Villa GarcÃ­a, Melilla, Montevideo rural

## Consultas representativas

- `"residencial adulto mayor" Montevideo`
- `"hogar de ancianos" Montevideo`
- `"casa de salud" adulto mayor Montevideo`
- `"residencial geriÃ¡trico" Montevideo`
- `site:instagram.com residencial mayores Montevideo`
- `site:facebook.com residencial mayores Montevideo`
- `"residencial" "Ciudad Vieja" adulto mayor`
- `"residencial" Centro Montevideo adulto mayor`
- `"residencial" CordÃ³n adulto mayor`
- `"residencial" Parque RodÃ³ adulto mayor`
- `"residencial" Pocitos adulto mayor`
- `"residencial" Punta Carretas adulto mayor`
- `"residencial" Buceo adulto mayor`
- `"residencial" Parque Batlle adulto mayor`
- `"residencial" La Blanqueada adulto mayor`
- `"residencial" MalvÃ­n adulto mayor`
- `"residencial" Punta Gorda adulto mayor`
- `"residencial" Carrasco adulto mayor`
- `"residencial" UniÃ³n Montevideo adulto mayor`
- `"residencial" Prado Montevideo adulto mayor`
- `"residencial" Bella Vista Montevideo adulto mayor`
- `"residencial" La Teja adulto mayor`
- `"residencial" Cerro Montevideo adulto mayor`
- `"residencial" ColÃ³n Montevideo adulto mayor`
- `"residencial" Lezica adulto mayor`
- `"residencial" Manga Montevideo adulto mayor`
- `"residencial" Piedras Blancas adulto mayor`
- `"residencial" Villa GarcÃ­a adulto mayor`
- `telÃ©fono exacto + nombre para cada pista`
- `direcciÃ³n exacta + nombre histÃ³rico`
- `nombre de operador + todas sus sedes`
- `site:aderama.org.uy socios 2026 Montevideo`
- `site:inforesidenciales.com.uy Montevideo residencial`
- `site:1122.com.uy/local residenciales Montevideo`
- `site:redresidenciales.uy residencial Montevideo`

## Familias de fuentes

- MSP, MIDES y documentos oficiales;
- Aderama 2026;
- Instagram y Facebook pÃºblicos/indexados;
- sitios propios;
- Info Residenciales;
- Red de Residenciales;
- 1122 y directorios cartogrÃ¡ficos;
- Waze;
- OSM y candidatos privados;
- bÃºsqueda inversa por telÃ©fono, direcciÃ³n, dominio y nombre.

## Pasadas realizadas

### 1. Matriz sectorial contra el Ã­ndice

Se compararon 199 filas de Aderama con el Ã­ndice nacional
por nombre normalizado y domicilio normalizado.

### 2. BÃºsqueda por barrios y corredores

Se buscaron categorÃ­as y sinÃ³nimos en zonas centrales, costeras, oeste,
norte, este y periferia.

### 3. Sitios propios, redes y directorios

Se buscaron fuentes independientes para las filas sin coincidencia exacta,
y se bajÃ³ a `needs_more_evidence` todo caso sostenido por una sola familia.

### 4. BÃºsqueda inversa

Cada nombre relevante se revisÃ³ por domicilio, telÃ©fono, dominio, cuenta
social, razÃ³n social y posibles nombres anteriores.

### 5. Relaciones temporales y sedes

Se marcaron domicilios con otra identidad conocida, marcas con varias
sucursales y puertas contiguas. No se fusionaron automÃ¡ticamente.

## Limitaciones

1. Instagram y Facebook no indexan todo el contenido pÃºblico.
2. Una pÃ¡gina puede seguir visible despuÃ©s de un cierre.
3. Dos publicaciones pueden copiar la misma campaÃ±a.
4. Aderama es un directorio sectorial, no una lista administrativa.
5. Los directorios comerciales pueden estar desactualizados.
6. La clave local de Google no fue utilizada por ChatGPT.
7. No se puede detectar con certeza una sede sin ninguna huella pÃºblica.
8. La referencia 537 no es una cuota.
9. Esta es una primera pasada sistemÃ¡tica, no una declaraciÃ³n de cobertura 100 %.

## Cierre provisional

Montevideo queda **investigado sistemÃ¡ticamente en una primera pasada**.
El siguiente paso es el `dry-run` de Codex contra Supabase, el Ã­ndice,
OSM y las observaciones privadas.