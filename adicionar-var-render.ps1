# Script para adicionar variável de ambiente DISABLE_RATE_LIMITER no Render.com via API
# Requer API Key do Render

param(
    [Parameter(Mandatory=$false)]
    [string]$ApiKey = "",
    
    [Parameter(Mandatory=$false)]
    [string]$ServiceId = ""
)

Write-Host ""
Write-Host "=== Adicionar Variável no Render.com ===" -ForegroundColor Cyan
Write-Host ""

# Verificar se API Key foi fornecida
if ([string]::IsNullOrEmpty($ApiKey)) {
    Write-Host "⚠️  API Key não fornecida!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Como obter a API Key:" -ForegroundColor Cyan
    Write-Host "1. Acesse: https://dashboard.render.com" -ForegroundColor White
    Write-Host "2. Vá em Account Settings → API Keys" -ForegroundColor White
    Write-Host "3. Clique em 'New API Key'" -ForegroundColor White
    Write-Host "4. Copie a chave gerada" -ForegroundColor White
    Write-Host ""
    Write-Host "Uso:" -ForegroundColor Yellow
    Write-Host "  .\adicionar-var-render.ps1 -ApiKey 'sua-api-key' -ServiceId 'seu-service-id'" -ForegroundColor White
    Write-Host ""
    Write-Host "OU defina as variáveis de ambiente:" -ForegroundColor Yellow
    Write-Host "  `$env:RENDER_API_KEY = 'sua-api-key'" -ForegroundColor White
    Write-Host "  `$env:RENDER_SERVICE_ID = 'seu-service-id'" -ForegroundColor White
    Write-Host ""
    
    # Tentar usar variáveis de ambiente
    if ($env:RENDER_API_KEY) {
        $ApiKey = $env:RENDER_API_KEY
        Write-Host "✅ Usando API Key da variável de ambiente" -ForegroundColor Green
    } else {
        Write-Host "❌ API Key não encontrada!" -ForegroundColor Red
        exit 1
    }
}

# Verificar se Service ID foi fornecido
if ([string]::IsNullOrEmpty($ServiceId)) {
    if ($env:RENDER_SERVICE_ID) {
        $ServiceId = $env:RENDER_SERVICE_ID
        Write-Host "✅ Usando Service ID da variável de ambiente" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Service ID não fornecido!" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Como obter o Service ID:" -ForegroundColor Cyan
        Write-Host "1. Acesse: https://dashboard.render.com" -ForegroundColor White
        Write-Host "2. Vá no seu serviço (ex: launcherpro-backend)" -ForegroundColor White
        Write-Host "3. A URL será: https://dashboard.render.com/web/seu-service-id" -ForegroundColor White
        Write-Host "4. Copie o 'seu-service-id' da URL" -ForegroundColor White
        Write-Host ""
        Write-Host "OU defina a variável de ambiente:" -ForegroundColor Yellow
        Write-Host "  `$env:RENDER_SERVICE_ID = 'seu-service-id'" -ForegroundColor White
        Write-Host ""
        
        $ServiceId = Read-Host "Digite o Service ID"
        if ([string]::IsNullOrEmpty($ServiceId)) {
            Write-Host "❌ Service ID é obrigatório!" -ForegroundColor Red
            exit 1
        }
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

Write-Host "📡 Buscando variáveis de ambiente existentes..." -ForegroundColor Yellow

try {
    # Buscar variáveis existentes
    $response = Invoke-RestMethod -Uri $envVarsUrl -Method GET -Headers $headers -ErrorAction Stop
    
    Write-Host "✅ Variáveis encontradas: $($response.Count)" -ForegroundColor Green
    Write-Host ""
    
    # Verificar se DISABLE_RATE_LIMITER já existe
    $varExistente = $response | Where-Object { $_.key -eq "DISABLE_RATE_LIMITER" }
    
    if ($varExistente) {
        Write-Host "⚠️  Variável DISABLE_RATE_LIMITER já existe!" -ForegroundColor Yellow
        Write-Host "   Valor atual: $($varExistente.value)" -ForegroundColor Gray
        Write-Host ""
        
        $resposta = Read-Host "Deseja atualizar para 'true'? (S/N)"
        if ($resposta -ne "S" -and $resposta -ne "s") {
            Write-Host "❌ Operação cancelada." -ForegroundColor Red
            exit 0
        }
        
        # Atualizar variável existente
        $updateUrl = "$envVarsUrl/$($varExistente.id)"
        $body = @{
            value = "true"
        } | ConvertTo-Json
        
        Write-Host "🔄 Atualizando variável..." -ForegroundColor Yellow
        $updateResponse = Invoke-RestMethod -Uri $updateUrl -Method PATCH -Headers $headers -Body $body -ErrorAction Stop
        
        Write-Host "✅ Variável atualizada com sucesso!" -ForegroundColor Green
        Write-Host "   Key: DISABLE_RATE_LIMITER" -ForegroundColor White
        Write-Host "   Value: true" -ForegroundColor White
    } else {
        # Adicionar nova variável
        $body = @{
            key = "DISABLE_RATE_LIMITER"
            value = "true"
        } | ConvertTo-Json
        
        Write-Host "➕ Adicionando nova variável..." -ForegroundColor Yellow
        $addResponse = Invoke-RestMethod -Uri $envVarsUrl -Method POST -Headers $headers -Body $body -ErrorAction Stop
        
        Write-Host "✅ Variável adicionada com sucesso!" -ForegroundColor Green
        Write-Host "   Key: DISABLE_RATE_LIMITER" -ForegroundColor White
        Write-Host "   Value: true" -ForegroundColor White
    }
    
    Write-Host ""
    Write-Host "⚠️  IMPORTANTE: Reinicie o serviço no Render para aplicar a mudança!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Como reiniciar:" -ForegroundColor Cyan
    Write-Host "1. Acesse: https://dashboard.render.com/web/$ServiceId" -ForegroundColor White
    Write-Host "2. Vá em 'Manual Deploy' → 'Deploy latest commit'" -ForegroundColor White
    Write-Host "3. Aguarde o deploy completar" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host "❌ Erro ao adicionar variável!" -ForegroundColor Red
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Yellow
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status Code: $statusCode" -ForegroundColor Yellow
        
        if ($statusCode -eq 401) {
            Write-Host ""
            Write-Host "⚠️  Erro de autenticação!" -ForegroundColor Red
            Write-Host "   Verifique se a API Key está correta." -ForegroundColor Yellow
        } elseif ($statusCode -eq 404) {
            Write-Host ""
            Write-Host "⚠️  Service ID não encontrado!" -ForegroundColor Red
            Write-Host "   Verifique se o Service ID está correto." -ForegroundColor Yellow
        } elseif ($statusCode -eq 403) {
            Write-Host ""
            Write-Host "⚠️  Sem permissão!" -ForegroundColor Red
            Write-Host "   Verifique se a API Key tem permissão para modificar este serviço." -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "Dica: Voce pode adicionar manualmente no painel do Render:" -ForegroundColor Cyan
    $url = "https://dashboard.render.com/web/$ServiceId/environment"
    Write-Host "   $url" -ForegroundColor White
    Write-Host ""
    
    exit 1
}

Write-Host ""

