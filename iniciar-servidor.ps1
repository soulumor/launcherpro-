# Script para iniciar o servidor backend
Write-Host ""
Write-Host "=== REINICIANDO SERVIDOR BACKEND ===" -ForegroundColor Cyan
Write-Host ""

# Parar processos Node.js do projeto
Write-Host "Parando processos antigos..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | 
    Where-Object { $_.Path -like "*LauncherPro*" } | 
    Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Navegar para o diretório backend
$backendPath = Join-Path $PSScriptRoot "backend"
Set-Location $backendPath

Write-Host "Iniciando servidor backend..." -ForegroundColor Yellow
Write-Host "Porta: 3001" -ForegroundColor White
Write-Host ""

# Iniciar servidor em nova janela
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; Write-Host '=== SERVIDOR BACKEND ===' -ForegroundColor Cyan; Write-Host 'Porta: 3001' -ForegroundColor White; Write-Host ''; node server.js" -WindowStyle Normal

Start-Sleep -Seconds 2

Write-Host "Servidor backend iniciado em nova janela!" -ForegroundColor Green
Write-Host ""
Write-Host "API disponivel em: http://localhost:3001" -ForegroundColor Cyan
Write-Host ""
Write-Host "Verifique a janela do servidor para logs" -ForegroundColor Yellow
Write-Host ""

