# Script para testar a sincronização híbrida
Write-Host ""
Write-Host "=== Teste de Sincronização Híbrida ===" -ForegroundColor Cyan
Write-Host ""

# Verificar se serviço local está rodando
Write-Host "1️⃣ Verificando serviço local (Puppeteer)..." -ForegroundColor Yellow
$localServiceRunning = Test-NetConnection -ComputerName localhost -Port 3002 -InformationLevel Quiet -WarningAction SilentlyContinue

if (-not $localServiceRunning) {
    Write-Host "   ⚠️ Serviço local NÃO está rodando" -ForegroundColor Yellow
    Write-Host "   💡 Para máxima eficiência, inicie o serviço local:" -ForegroundColor Cyan
    Write-Host "      cd scripts-local" -ForegroundColor White
    Write-Host "      .\start-background.ps1" -ForegroundColor White
    Write-Host ""
    Write-Host "   ⚠️ Continuando sem serviço local (usará apenas frontend e proxy público)" -ForegroundColor Yellow
} else {
    Write-Host "   ✅ Serviço local está rodando!" -ForegroundColor Green
}
Write-Host ""

# Verificar se frontend está rodando
Write-Host "2️⃣ Verificando frontend..." -ForegroundColor Yellow
$frontendRunning = Test-NetConnection -ComputerName localhost -Port 4173 -InformationLevel Quiet -WarningAction SilentlyContinue

if (-not $frontendRunning) {
    Write-Host "   ⚠️ Frontend não está rodando. Iniciando..." -ForegroundColor Yellow
    Write-Host ""
    
    $frontendPath = Join-Path $PSScriptRoot "frontend"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; Write-Host '=== Servidor LauncherPro ===' -ForegroundColor Cyan; Write-Host ''; npm run preview"
    
    Write-Host "   ⏳ Aguardando frontend iniciar (5 segundos)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
} else {
    Write-Host "   ✅ Frontend está rodando!" -ForegroundColor Green
}
Write-Host ""

# Abrir navegador
Write-Host "3️⃣ Abrindo navegador..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
Start-Process "http://localhost:4173"
Write-Host "   ✅ Navegador aberto!" -ForegroundColor Green
Write-Host ""

# Instruções
Write-Host "=== Como Testar ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Faça login no app:" -ForegroundColor White
Write-Host "   Email: cursorsemanal@gmail.com" -ForegroundColor Gray
Write-Host "   Senha: 123456789qQ" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Clique em um jogo para abrir o modal" -ForegroundColor White
Write-Host ""
Write-Host "3. Clique no botão 'Sincronizar'" -ForegroundColor White
Write-Host ""
Write-Host "4. Abra o Console do navegador (F12 → Console)" -ForegroundColor White
Write-Host ""
Write-Host "5. Veja os logs mostrando as estratégias tentadas:" -ForegroundColor White
Write-Host "   🌐 Estratégia 1: Frontend direto" -ForegroundColor Gray
Write-Host "   🖥️ Estratégia 2: Serviço local (se rodando)" -ForegroundColor Gray
Write-Host "   🌐 Estratégia 3: Proxy público" -ForegroundColor Gray
Write-Host "   🔄 Estratégia 4: Backend na nuvem" -ForegroundColor Gray
Write-Host ""
Write-Host "6. Veja qual estratégia funcionou!" -ForegroundColor White
Write-Host ""
Write-Host "=== Logs Esperados ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Sucesso:" -ForegroundColor Green
Write-Host "   ✅ [SYNC] Serviço local encontrou X conta(s)!" -ForegroundColor Gray
Write-Host "   ✅ [SYNC] Total: X conta(s) encontrada(s), enviando para backend na nuvem..." -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️ Fallbacks:" -ForegroundColor Yellow
Write-Host "   🚫 [FRONTEND] CORS bloqueado..." -ForegroundColor Gray
Write-Host "   ⚠️ [LOCAL] Serviço local não está rodando..." -ForegroundColor Gray
Write-Host "   🌐 [PROXY] Tentando proxy público..." -ForegroundColor Gray
Write-Host ""
Write-Host "=== Dica ===" -ForegroundColor Cyan
Write-Host "Para melhor resultado, inicie o serviço local:" -ForegroundColor White
Write-Host "  cd scripts-local" -ForegroundColor Gray
Write-Host "  .\start-background.ps1" -ForegroundColor Gray
Write-Host ""

