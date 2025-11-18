# Script para abrir o app corretamente
Write-Host ""
Write-Host "=== Abrindo LauncherPro ===" -ForegroundColor Cyan
Write-Host ""

# Verificar se servidor esta rodando
Write-Host "Verificando servidor..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4173" -UseBasicParsing -TimeoutSec 2
    Write-Host "OK: Servidor ja esta rodando!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Abrindo navegador..." -ForegroundColor Yellow
    Start-Process "http://localhost:4173"
    Write-Host ""
    Write-Host "Se o navegador nao abrir, acesse manualmente:" -ForegroundColor Cyan
    Write-Host "http://localhost:4173" -ForegroundColor White
} catch {
    Write-Host "Servidor nao esta rodando. Iniciando..." -ForegroundColor Yellow
    Write-Host ""
    
    # Obter caminho absoluto do frontend
    $frontendPath = Join-Path $PSScriptRoot "frontend"
    
    # Iniciar servidor em nova janela
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; Write-Host '=== Servidor LauncherPro ===' -ForegroundColor Cyan; Write-Host ''; Write-Host 'Aguarde alguns segundos...' -ForegroundColor Yellow; Write-Host ''; npm run preview"
    
    Write-Host "Aguardando servidor iniciar (5 segundos)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    
    Write-Host ""
    Write-Host "Abrindo navegador..." -ForegroundColor Yellow
    Start-Sleep -Seconds 2
    Start-Process "http://localhost:4173"
    
    Write-Host ""
    Write-Host "Se o navegador nao abrir automaticamente, acesse:" -ForegroundColor Cyan
    Write-Host "http://localhost:4173" -ForegroundColor White
    Write-Host ""
    Write-Host "IMPORTANTE: Mantenha a janela do PowerShell aberta!" -ForegroundColor Yellow
    Write-Host "Para parar o servidor, feche a janela ou pressione Ctrl+C" -ForegroundColor Yellow
}

Write-Host ""






