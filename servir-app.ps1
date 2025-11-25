# Script para servir o app frontend localmente
Write-Host "=== Servindo LauncherPro Localmente ===" -ForegroundColor Cyan
Write-Host ""

# Verificar se a pasta dist existe
if (-not (Test-Path "frontend\dist\index.html")) {
    Write-Host "ERRO: Pasta dist nao encontrada!" -ForegroundColor Red
    Write-Host "Execute primeiro: .\build-frontend.ps1 -BackendUrl https://launcherpro.onrender.com" -ForegroundColor Yellow
    exit 1
}

Write-Host "Iniciando servidor local..." -ForegroundColor Yellow
Write-Host ""
Write-Host "O app abrira automaticamente no navegador em:" -ForegroundColor Cyan
Write-Host "  http://localhost:4173" -ForegroundColor White
Write-Host ""
Write-Host "Para parar o servidor, pressione Ctrl+C" -ForegroundColor Yellow
Write-Host ""

cd frontend
npm run preview















