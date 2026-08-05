# Iniciar n8n y Chatwoot en localhost

Usá dos terminales de PowerShell: una para n8n y otra para Chatwoot. No cierres la terminal de n8n mientras lo estés usando.

## 1. n8n

Abrí PowerShell y ejecutá:

```powershell
& ".\n8n\iniciar-n8n-local.ps1"
```

Cuando la terminal muestre que n8n está listo, abrí:

```text
http://localhost:5678
```

Para comprobarlo desde otra terminal:

```powershell
Invoke-WebRequest http://localhost:5678 -UseBasicParsing
```

> La contraseña que puede pedir el navegador es la cuenta de n8n. No es una contraseña para pegar en la terminal.

## 2. Docker Desktop y Chatwoot

Primero abrí Docker Desktop. También podés ejecutarlo desde PowerShell:

```powershell
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
```

Esperá hasta que Docker Desktop diga que está funcionando. Verificalo así:

```powershell
& "C:\Program Files\Docker\Docker\resources\bin\docker.exe" info
```

Luego entrá a la carpeta donde está el archivo `compose.yaml` o `docker-compose.yml` de Chatwoot y levantalo. Reemplazá la ruta de ejemplo por tu carpeta real de Chatwoot:

```powershell
$ChatwootPath = "C:\ruta\a\tu\chatwoot"
Set-Location $ChatwootPath
& "C:\Program Files\Docker\Docker\resources\bin\docker.exe" compose up -d
```

Comprobá los contenedores:

```powershell
& "C:\Program Files\Docker\Docker\resources\bin\docker.exe" compose ps
```

Abrí Chatwoot en:

```text
http://localhost:3201
```

Si tu `compose.yaml` usa otro puerto, mirá la columna `PORTS` del comando `compose ps` y usá ese puerto.

## Detener servicios

Para detener n8n, volvé a su terminal y presioná `Ctrl + C`.

Para detener Chatwoot sin borrar sus datos:

```powershell
Set-Location $ChatwootPath
& "C:\Program Files\Docker\Docker\resources\bin\docker.exe" compose down
```

No uses `docker compose down -v`: elimina volúmenes y puede borrar datos locales.

## Orden recomendado cada vez

1. Abrí Docker Desktop.
2. Esperá que Docker esté listo.
3. Corré `docker compose up -d` dentro de la carpeta de Chatwoot.
4. Corré `n8n start` en otra terminal.
5. Abrí `http://localhost:3201` y `http://localhost:5678`.

## Si no recordás la carpeta de Chatwoot

Buscá el archivo de Docker Compose desde el Explorador de archivos o con este comando. No modifica nada:

```powershell
Get-ChildItem "C:\" -Include compose.yaml,compose.yml,docker-compose.yml,docker-compose.yaml -File -Recurse -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -match "chatwoot" } |
  Select-Object -ExpandProperty FullName
```

Cuando encuentres la carpeta correcta, reemplazá `$ChatwootPath` en los comandos anteriores.
