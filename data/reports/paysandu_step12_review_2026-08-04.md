# Paso 12 — deduplicación de Paysandú

Fecha: 2026-08-04  
Modo: local y de solo lectura  
Registros evaluados: 14

## Resultado

- 7 registros tienen coincidencias probables con establecimientos ya conocidos: 5 oficiales y 2 filas existentes de la app.
- 6 pistas sociales permanecen como candidatos probablemente nuevos, todavía con evidencia C.
- 1 pista, Residencia del Adulto Mayor Santa Lucía, requiere más evidencia por su posible carácter histórico.
- 2 pistas carecen de dirección exacta: Residencia Bellanova y Casa Betel.
- 0 fusiones automáticas y 0 puntos públicos creados.

Las coincidencias conocidas propuestas son:

- Residencia Lore&Car → `EXC-LEGACY-APP-F50F63C7F0151126`.
- Residencia María Carolina → `EXC-OFFICIAL-ELP-0720`.
- Residencial Colibrí → `EXC-LEGACY-APP-EEA7F13CD1313782`.
- Residencia San Cono → `EXC-OFFICIAL-ELP-0721`.
- Carpe Diem → `EXC-OFFICIAL-ELP-0713`.
- Hogar de Ancianos Enrique Chaplin → `EXC-OFFICIAL-ELP-0717`.
- Casa Provenza → `EXC-OFFICIAL-ELP-0715`.

Son vínculos propuestos para revisión humana. No se fusionó ni publicó ningún registro.

## Conflicto interno

Las dos sedes de Como en Casa comparten el teléfono `98251284` y la cuenta pública `residencial__comoencasa`, pero tienen domicilios diferentes: Uruguay 1896 y Bulevar Artigas 1237. Se conservan como dos sedes físicas; el teléfono y la cuenta representan un operador común y no autorizan una fusión.

No se detectaron domicilios ni correos compartidos entre candidatos.

## Procedencia

Se conservaron 22 referencias con URL, tipo y fecha:

- 5 referencias de fuentes oficiales.
- 1 referencia de mapas públicos.
- 14 referencias de fuentes públicas de redes sociales.
- 2 referencias de otras fuentes públicas.
- 0 referencias con procedencia incompleta.

El origen de los 14 descubrimientos es una fuente pública de red social. Las 8 corroboraciones se dividen en 5 oficiales, 1 de mapas públicos y 2 de otras fuentes públicas.

## Garantías

- Los 14 candidatos incluyen tres alternativas de match explicables.
- Todos requieren revisión humana.
- El código postal `60000` ya no se interpreta como número de puerta y `BVAR`, `Bulevar` y `Avenida` se normalizan de forma coherente.
- No se llamó Google, Instagram, Facebook, Overpass, IDE Uruguay ni Supabase.
- No se asignaron coordenadas.
- No se modificó `public.residenciales`.
- No se publicó ningún candidato.

Archivos:

- `paysandu_step12_matching_2026-08-04.json`: candidatos y tres matches explicables.
- `paysandu_step12_conflicts_2026-08-04.json`: vínculos conocidos y señales compartidas entre las dos sedes de Como en Casa.
