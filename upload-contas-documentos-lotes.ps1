# Script para fazer upload do arquivo contas_launcherpro.json da pasta Documentos em lotes
Write-Host ""
Write-Host "=== Upload de Contas em Lotes ===" -ForegroundColor Cyan
Write-Host ""

$BACKEND_URL = "https://launcherpro.onrender.com"
$EMAIL = "ailtonbergnovo@gmail.com"

# Tentar usar senha de variável de ambiente ou usar a senha padrão
$SENHA = $env:ADMIN_SENHA
if (-not $SENHA) {
    $SENHA = "amelanegomes"
}

$ARQUIVO = "$env:USERPROFILE\Documents\contas_launcherpro.json"
$LOTE_SIZE = 500  # Processar 500 contas por vez

# Verificar se arquivo existe
if (-not (Test-Path $ARQUIVO)) {
    Write-Host "ERRO: Arquivo nao encontrado: $ARQUIVO" -ForegroundColor Red
    exit 1
}

Write-Host "Arquivo encontrado: $ARQUIVO" -ForegroundColor Green
$todasContas = Get-Content $ARQUIVO -Raw | ConvertFrom-Json
Write-Host "Total de contas no arquivo: $($todasContas.Count)" -ForegroundColor Cyan
Write-Host "Processando em lotes de $LOTE_SIZE contas..." -ForegroundColor Yellow
Write-Host ""

# 1. Fazer login
Write-Host "[1/2] Fazendo login..." -ForegroundColor Yellow
$loginBody = @{
    email = $EMAIL
    senha = $SENHA
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$BACKEND_URL/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -TimeoutSec 30
    $token = $loginResponse.token
    Write-Host "Login realizado com sucesso!" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "ERRO no login: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Resposta: $responseBody" -ForegroundColor Red
    }
    exit 1
}

# 2. Dividir em lotes e fazer upload
Write-Host "[2/2] Fazendo upload em lotes..." -ForegroundColor Yellow
Write-Host ""

$totalLotes = [Math]::Ceiling($todasContas.Count / $LOTE_SIZE)
$totalAdicionadas = 0
$totalDuplicadas = 0
$totalErros = 0

Add-Type -AssemblyName System.Net.Http

for ($i = 0; $i -lt $todasContas.Count; $i += $LOTE_SIZE) {
    $loteNumero = [Math]::Floor($i / $LOTE_SIZE) + 1
    $loteContas = $todasContas[$i..([Math]::Min($i + $LOTE_SIZE - 1, $todasContas.Count - 1))]
    
    Write-Host "Processando lote $loteNumero/$totalLotes (contas $($i+1) a $([Math]::Min($i + $LOTE_SIZE, $todasContas.Count)))..." -ForegroundColor Cyan
    
    try {
        # Criar arquivo temporário para este lote (sem BOM)
        $tempFile = [System.IO.Path]::GetTempFileName() + ".json"
        $jsonString = $loteContas | ConvertTo-Json -Depth 10 -Compress
        $jsonBytes = [System.Text.Encoding]::UTF8.GetBytes($jsonString)
        [System.IO.File]::WriteAllBytes($tempFile, $jsonBytes)
        
        $httpClient = New-Object System.Net.Http.HttpClient
        $httpClient.Timeout = [System.TimeSpan]::FromSeconds(300)
        $httpClient.DefaultRequestHeaders.Add("Authorization", "Bearer $token")
        
        $multipartContent = New-Object System.Net.Http.MultipartFormDataContent
        $fileBytes = [System.IO.File]::ReadAllBytes($tempFile)
        $fileName = "contas_lote_$loteNumero.json"
        
        $byteArray = [byte[]]$fileBytes
        $byteArrayContent = New-Object System.Net.Http.ByteArrayContent(,$byteArray)
        $byteArrayContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse("application/json")
        
        $multipartContent.Add($byteArrayContent, "arquivo", $fileName)
        
        $response = $httpClient.PostAsync("$BACKEND_URL/api/contas/upload", $multipartContent).Result
        $responseBody = $response.Content.ReadAsStringAsync().Result
        
        if ($response.IsSuccessStatusCode) {
            $uploadResponse = $responseBody | ConvertFrom-Json
            $totalAdicionadas += $uploadResponse.adicionadas
            $totalDuplicadas += $uploadResponse.duplicadas
            $totalErros += $uploadResponse.erros
            
            Write-Host "  Adicionadas: $($uploadResponse.adicionadas) | Duplicadas: $($uploadResponse.duplicadas) | Erros: $($uploadResponse.erros)" -ForegroundColor Green
        } else {
            Write-Host "  ERRO: HTTP $($response.StatusCode)" -ForegroundColor Red
            $totalErros += $loteContas.Count
        }
        
        $httpClient.Dispose()
        Remove-Item $tempFile -Force
        
        # Aguardar um pouco entre lotes para não sobrecarregar
        if ($i + $LOTE_SIZE -lt $todasContas.Count) {
            Start-Sleep -Seconds 2
        }
        
    } catch {
        Write-Host "  ERRO no lote $loteNumero : $_" -ForegroundColor Red
        $totalErros += $loteContas.Count
        if (Test-Path $tempFile) {
            Remove-Item $tempFile -Force
        }
    }
}

Write-Host ""
Write-Host "=== UPLOAD CONCLUIDO ===" -ForegroundColor Green
Write-Host "Total processado: $($todasContas.Count)" -ForegroundColor White
Write-Host "Adicionadas: $totalAdicionadas" -ForegroundColor Green
Write-Host "Duplicadas: $totalDuplicadas" -ForegroundColor Yellow
Write-Host "Erros: $totalErros" -ForegroundColor $(if ($totalErros -gt 0) { "Red" } else { "Green" })
Write-Host ""

