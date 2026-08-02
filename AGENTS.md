# Alerta Mayor — instrucciones para Codex

## Objetivo

Construir un sistema legal, auditable y conservador para descubrir posibles
ELEPEM en Uruguay, compararlos con la base existente y enviarlos a una cola
privada de revisión humana.

## Reglas no negociables

- No scrapear Google Maps, Instagram ni Facebook.
- No usar Playwright, Selenium, cuentas falsas, proxies ni automatización de login.
- No sortear CAPTCHA, bloqueos, rate limits, robots.txt ni controles de acceso.
- No copiar ni almacenar reseñas, autores, fotografías o contenido de Google.
- Google solo puede utilizarse mediante un place_id vinculado manualmente y
  un enlace externo a Google Maps.
- De Instagram y Facebook, conservar inicialmente solo URL pública, fecha de
  consulta y una observación humana breve.
- No recopilar datos de residentes, historias clínicas, documentos, teléfonos
  personales ni contenido de denuncias.
- Ningún candidato se publica automáticamente.
- Solo candidatos revisados por una persona y con evidencia A o B pueden ser
  elegibles para el mapa público.
- Nunca guardar secretos o archivos .env en Git.
- Nunca utilizar credenciales de producción en pruebas.
- No alterar rutas públicas o la interfaz existente fuera de la tarea indicada.

## Evidencia

- Nivel A: una fuente oficial nominal.
- Nivel B: dos fuentes públicas independientes y coherentes.
- Nivel C: una pista todavía no corroborada.

## Método de trabajo

- Inspeccionar antes de editar.
- Hacer cambios pequeños y reversibles.
- Mostrar el plan antes de aplicar migraciones.
- Ejecutar npm ci, lint, build y pruebas disponibles.
- Informar archivos modificados, comandos ejecutados, fallas y riesgos pendientes.
- No ocultar errores ni reemplazar dependencias masivamente para hacer pasar un build.

## Definition of done

Una tarea solo está terminada cuando:
- el código compila;
- las pruebas pertinentes pasan;
- no se incorporaron secretos;
- existe trazabilidad de fuente y fecha;
- el cambio no publica candidatos automáticamente;
- el diff fue revisado.
