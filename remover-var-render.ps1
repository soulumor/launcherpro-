# Script para remover variável de ambiente DISABLE_RATE_LIMITER no Render.com via API
# Requer API Key do Render

param(
    [Parameter(Mandatory=$false)]
    [string]$ApiKey = "",
    
    [Parameter(Mandatory=$false)]
    [string]$ServiceId = ""
)

Write-Host ""
Write-Host "=== Remover Variável no Render.com ===" -ForegroundColor Cyan
Write-Host ""

# Verificar se API Key foi fornecida
if ([string]::IsNullOrEmpty($ApiKey)) {
    if ($env:RENDER_API_KEY) {
        $ApiKey = $env:RENDER_API_KEY
        Write-Host "✅ Usando API Key da variável de ambiente" -ForegroundColor Green
    } else {
        Write-Host "❌ API Key não encontrada!" -ForegroundColor Red
        Write-Host "   Defina: `$env:RENDER_API_KEY = 'sua-api-key'" -ForegroundColor Yellow
        exit 1
    }
}

# Verificar se Service ID foi fornecido
if ([string]::IsNullOrEmpty($ServiceId)) {
    if ($env:RENDER_SERVICE_ID) {
        $ServiceId = $env:RENDER_SERVICE_ID
        Write-Host "✅ Usando Service ID da variável de ambiente" -ForegroundColor Green
    } else {
        Write-Host "❌ Service ID não encontrado!" -ForegroundColor Red
        Write-Host "   Defina: `$env:RENDER_SERVICE_ID = 'seu-service-id'" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "🔑 API Key: $($ApiKey.Substring(0, [Math]::Min(10, $ApiKey.Length)))..." -ForegroundColor Gray
Write-Host "🆔 Service ID: $ServiceId" -ForegroundColor Gray
Write-Host ""

# Headers para API do Render
$headers = @{
    "Authorization" = "Bearer $ApiKey"
    "Content-Type" = "application/json"
    "Accept" = "application/json"
}

# URL da API do Render
$baseUrl = "https://api.render.com/v1"
$envVarsUrl = "$baseUrl/services/$ServiceId/env-vars"

Write-Host "📡 Buscando variável DISABLE_RATE_LIMITER..." -ForegroundColor Yellow

try {
    # Buscar variáveis existentes
    $response = Invoke-RestMethod -Uri $envVarsUrl -Method GET -Headers $headers -ErrorAction Stop
    
    # Verificar se DISABLE_RATE_LIMITER existe
    $varExistente = $response | Where-Object { $_.key -eq "DISABLE_RATE_LIMITER" }
    
    if (-not $varExistente) {
        Write-Host "⚠️  Variável DISABLE_RATE_LIMITER não encontrada!" -ForegroundColor Yellow
        Write-Host "   Rate limiter já está ativado." -ForegroundColor Green
        exit 0
    }
    
    Write-Host "✅ Variável encontrada!" -ForegroundColor Green
    Write-Host "   Key: $($varExistente.key)" -ForegroundColor White
    Write-Host "   Value: $($varExistente.value)" -ForegroundColor White
    Write-Host ""
    
    $resposta = Read-Host "Deseja remover a variável? (S/N)"
    if ($resposta -ne "S" -and $resposta -ne "s") {
        Write-Host "❌ Operação cancelada." -ForegroundColor Red
        exit 0
    }
    
    # Remover variável
    $deleteUrl = "$envVarsUrl/$($varExistente.id)"
    
    Write-Host "🗑️  Removendo variável..." -ForegroundColor Yellow
    Invoke-RestMethod -Uri $deleteUrl -Method DELETE -Headers $headers -ErrorAction Stop
    
    Write-Host "✅ Variável removida com sucesso!" -ForegroundColor Green
    Write-Host "   Rate limiter será reativado após reiniciar o serviço." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "⚠️  IMPORTANTE: Reinicie o serviço no Render para aplicar a mudança!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Como reiniciar:" -ForegroundColor Cyan
    Write-Host "1. Acesse: https://dashboard.render.com/web/$ServiceId" -ForegroundColor White
    Write-Host "2. Vá em 'Manual Deploy' → 'Deploy latest commit'" -ForegroundColor White
    Write-Host "3. Aguarde o deploy completar" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host "❌ Erro ao remover variável!" -ForegroundColor Red
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Yellow
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status Code: $statusCode" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "💡 Dica: Você pode remover manualmente no painel do Render:" -ForegroundColor Cyan
    Write-Host "   https://dashboard.render.com/web/$ServiceId/environment" -ForegroundColor White
    Write-Host ""
    
    exit 1
}

Write-Host ""

