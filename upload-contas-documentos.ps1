# Script para fazer upload do arquivo contas_launcherpro.json da pasta Documentos
Write-Host ""
Write-Host "=== Upload de Contas ===" -ForegroundColor Cyan
Write-Host ""

$BACKEND_URL = "https://launcherpro.onrender.com"
$EMAIL = "ailtonbergnovo@gmail.com"

# Tentar usar senha de variável de ambiente ou usar a senha padrão
$SENHA = $env:ADMIN_SENHA
if (-not $SENHA) {
    $SENHA = "amelanegomes"
}

$ARQUIVO = "$env:USERPROFILE\Documents\contas_launcherpro.json"

# Verificar se arquivo existe
if (-not (Test-Path $ARQUIVO)) {
    Write-Host "ERRO: Arquivo nao encontrado: $ARQUIVO" -ForegroundColor Red
    exit 1
}

Write-Host "Arquivo encontrado: $ARQUIVO" -ForegroundColor Green
$arquivoJson = Get-Content $ARQUIVO -Raw | ConvertFrom-Json
Write-Host "Total de contas no arquivo: $($arquivoJson.Count)" -ForegroundColor Cyan
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
    Write-Host ""
    Write-Host "Verifique se as credenciais estao corretas:" -ForegroundColor Yellow
    Write-Host "Email: $EMAIL" -ForegroundColor White
    exit 1
}

# 2. Fazer upload do arquivo
Write-Host "[2/2] Fazendo upload do arquivo (isso pode levar alguns minutos para 3234 contas)..." -ForegroundColor Yellow

try {
    # Usar System.Net.Http para multipart/form-data (compatível com PowerShell 5.1+)
    Add-Type -AssemblyName System.Net.Http
    
    $httpClient = New-Object System.Net.Http.HttpClient
    $httpClient.Timeout = [System.TimeSpan]::FromSeconds(600)
    
    $httpClient.DefaultRequestHeaders.Add("Authorization", "Bearer $token")
    
    $multipartContent = New-Object System.Net.Http.MultipartFormDataContent
    $fileBytes = [System.IO.File]::ReadAllBytes($ARQUIVO)
    $fileName = [System.IO.Path]::GetFileName($ARQUIVO)
    
    # Converter byte[] para byte[] explicitamente
    $byteArray = [byte[]]$fileBytes
    $byteArrayContent = New-Object System.Net.Http.ByteArrayContent(,$byteArray)
    $byteArrayContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse("application/json")
    
    $multipartContent.Add($byteArrayContent, "arquivo", $fileName)
    
    $response = $httpClient.PostAsync("$BACKEND_URL/api/contas/upload", $multipartContent).Result
    $responseBody = $response.Content.ReadAsStringAsync().Result
    
    if ($response.IsSuccessStatusCode) {
        $uploadResponse = $responseBody | ConvertFrom-Json
    } else {
        throw "HTTP $($response.StatusCode): $responseBody"
    }
    
    $httpClient.Dispose()
    
    Write-Host ""
    Write-Host "=== UPLOAD CONCLUIDO ===" -ForegroundColor Green
    Write-Host "Total processado: $($uploadResponse.total)" -ForegroundColor White
    Write-Host "Adicionadas: $($uploadResponse.adicionadas)" -ForegroundColor Green
    Write-Host "Duplicadas: $($uploadResponse.duplicadas)" -ForegroundColor Yellow
    Write-Host "Erros: $($uploadResponse.erros)" -ForegroundColor $(if ($uploadResponse.erros -gt 0) { "Red" } else { "Green" })
    Write-Host ""
    Write-Host "Mensagem: $($uploadResponse.mensagem)" -ForegroundColor Cyan
    Write-Host ""
    
} catch {
    Write-Host "ERRO no upload: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Resposta: $responseBody" -ForegroundColor Red
        try {
            $errorJson = $responseBody | ConvertFrom-Json
            Write-Host "Erro detalhado: $($errorJson.error)" -ForegroundColor Red
        } catch {
            # Ignorar se não for JSON
        }
    }
    exit 1
}

