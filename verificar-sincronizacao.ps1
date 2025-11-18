# Script para verificar se a sincronizacao foi feita
Write-Host ""
Write-Host "=== VERIFICAR SINCRONIZACAO ===" -ForegroundColor Cyan
Write-Host ""

$BACKEND_URL = "https://launcherpro.onrender.com"
$EMAIL = "cursorsemanal@gmail.com"
$SENHA = "123456789qQ"

# Fazer login
Write-Host "Fazendo login..." -ForegroundColor Yellow
try {
    $loginBody = @{
        email = $EMAIL
        senha = $SENHA
    } | ConvertTo-Json
    
    $loginResponse = Invoke-WebRequest -Uri "$BACKEND_URL/api/auth/login" `
        -Method POST `
        -Body $loginBody `
        -ContentType "application/json" `
        -UseBasicParsing `
        -TimeoutSec 10
    
    $loginData = $loginResponse.Content | ConvertFrom-Json
    $token = $loginData.token
    $headers = @{
        Authorization = "Bearer $token"
    }
    
    Write-Host "[OK] Login realizado!" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "[ERRO] Falha no login!" -ForegroundColor Red
    Write-Host "Execute: .\criar-admin-api.ps1" -ForegroundColor Yellow
    exit 1
}

# Buscar jogos com contas
Write-Host "Buscando informacoes..." -ForegroundColor Yellow
try {
    $jogosResponse = Invoke-WebRequest -Uri "$BACKEND_URL/api/jogos?comContas=true" `
        -Headers $headers `
        -UseBasicParsing `
        -TimeoutSec 10
    
    $jogos = $jogosResponse.Content | ConvertFrom-Json
    
    $totalJogos = $jogos.Count
    $totalContas = ($jogos | Measure-Object -Property totalContas -Sum).Sum
    $contasValidas = ($jogos | Measure-Object -Property contasValidas -Sum).Sum
    $jogosComContas = ($jogos | Where-Object { $_.totalContas -gt 0 }).Count
    $jogosSemContas = ($jogos | Where-Object { $_.totalContas -eq 0 }).Count
    
    Write-Host ""
    Write-Host "=== RESULTADO ===" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Total de Jogos: $totalJogos" -ForegroundColor White
    Write-Host "Jogos COM contas: $jogosComContas" -ForegroundColor Green
    Write-Host "Jogos SEM contas: $jogosSemContas" -ForegroundColor $(if ($jogosSemContas -gt 0) { "Yellow" } else { "Green" })
    Write-Host ""
    Write-Host "Total de Contas: $totalContas" -ForegroundColor White
    Write-Host "Contas Validas: $contasValidas" -ForegroundColor Green
    Write-Host ""
    
    # Analise
    if ($totalJogos -eq 0) {
        Write-Host "[AVISO] NENHUMA SINCRONIZACAO FOI FEITA!" -ForegroundColor Red
        Write-Host "Nenhum jogo encontrado na nuvem." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "SOLUCAO:" -ForegroundColor Cyan
        Write-Host "1. Execute sincronizacao geral" -ForegroundColor White
        Write-Host "2. Ou sincronize jogos individualmente pelo app" -ForegroundColor White
    } elseif ($totalContas -eq 0) {
        Write-Host "[AVISO] SINCRONIZACAO PARCIAL!" -ForegroundColor Yellow
        Write-Host "Jogos foram adicionados mas nenhuma conta foi sincronizada." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "SOLUCAO:" -ForegroundColor Cyan
        Write-Host "Use o botao 'Sincronizar' em cada jogo no app para buscar contas." -ForegroundColor White
    } elseif ($jogosSemContas -gt 0) {
        Write-Host "[INFO] SINCRONIZACAO PARCIAL!" -ForegroundColor Yellow
        Write-Host "$jogosSemContas jogo(s) ainda nao tem contas sincronizadas." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "SOLUCAO:" -ForegroundColor Cyan
        Write-Host "Sincronize os jogos sem contas individualmente pelo app." -ForegroundColor White
    } else {
        Write-Host "[OK] SINCRONIZACAO COMPLETA!" -ForegroundColor Green
        Write-Host "Todos os jogos tem contas sincronizadas." -ForegroundColor Green
    }
    
    # Mostrar top 10 jogos com mais contas
    if ($totalJogos -gt 0) {
        Write-Host ""
        Write-Host "=== TOP 10 JOGOS COM MAIS CONTAS ===" -ForegroundColor Cyan
        $topJogos = $jogos | Sort-Object -Property totalContas -Descending | Select-Object -First 10
        $topJogos | ForEach-Object {
            $status = if ($_.contasValidas -gt 0) { "[OK]" } else { "[SEM CONTAS VALIDAS]" }
            Write-Host "$status $($_.nome) - $($_.totalContas) contas ($($_.contasValidas) validas)" -ForegroundColor $(if ($_.contasValidas -gt 0) { "Green" } else { "Yellow" })
        }
    }
    
} catch {
    Write-Host "[ERRO] Nao foi possivel verificar sincronizacao!" -ForegroundColor Red
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
