# Script para verificar quantas contas existem na nuvem
Write-Host ""
Write-Host "=== Verificando Contas na Nuvem ===" -ForegroundColor Cyan
Write-Host ""

$BACKEND_URL = "https://launcherpro.onrender.com"
$EMAIL = "cursorsemanal@gmail.com"
$SENHA = "123456789qQ"

# 1. Fazer login
Write-Host "[1/2] Fazendo login..." -ForegroundColor Yellow
$loginBody = @{
    email = $EMAIL
    senha = $SENHA
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$BACKEND_URL/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.token
    Write-Host "Login realizado com sucesso!" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "ERRO no login: $_" -ForegroundColor Red
    exit 1
}

# 2. Buscar jogos com contagem de contas
Write-Host "[2/2] Buscando estatisticas..." -ForegroundColor Yellow

try {
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    
    # Buscar jogos com contagem de contas
    $jogos = Invoke-RestMethod -Uri "$BACKEND_URL/api/jogos?comContas=true" -Method GET -Headers $headers
    
    $totalContas = 0
    $totalJogos = $jogos.Count
    
    Write-Host ""
    Write-Host "=== ESTATISTICAS DA NUVEM ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "Total de jogos: $totalJogos" -ForegroundColor White
    Write-Host ""
    
    # Mostrar top 10 jogos com mais contas
    $jogosOrdenados = $jogos | Sort-Object -Property totalContas -Descending | Select-Object -First 10
    
    Write-Host "Top 10 jogos com mais contas:" -ForegroundColor Cyan
    foreach ($jogo in $jogosOrdenados) {
        $totalContas += $jogo.totalContas
        Write-Host "  $($jogo.nome): $($jogo.totalContas) conta(s)" -ForegroundColor White
    }
    
    # Calcular total geral
    foreach ($jogo in $jogos) {
        if ($jogo.totalContas) {
            $totalContas += $jogo.totalContas
        }
    }
    
    Write-Host ""
    Write-Host "=== TOTAL GERAL ===" -ForegroundColor Green
    Write-Host "Total de contas na nuvem: $totalContas" -ForegroundColor Yellow
    Write-Host ""
    
} catch {
    Write-Host "ERRO ao buscar estatisticas: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Resposta: $responseBody" -ForegroundColor Red
    }
    exit 1
}









