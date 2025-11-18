# Script PowerShell para iniciar scraper local em segundo plano

Write-Host "🚀 Iniciando scraper local em segundo plano..." -ForegroundColor Cyan
Write-Host ""

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$nodePath = Get-Command node -ErrorAction SilentlyContinue

if (-not $nodePath) {
    Write-Host "❌ Node.js não encontrado!" -ForegroundColor Red
    Write-Host "   Instale Node.js primeiro: https://nodejs.org" -ForegroundColor Yellow
    exit 1
}

Write-Host "📁 Diretório: $scriptPath" -ForegroundColor White
Write-Host ""

# Verificar se dependências estão instaladas
if (-not (Test-Path "$scriptPath\node_modules")) {
    Write-Host "📦 Instalando dependências..." -ForegroundColor Yellow
    Set-Location $scriptPath
    npm install
    Write-Host ""
}

# Iniciar script em janela minimizada
Write-Host "▶️  Iniciando scraper..." -ForegroundColor Green
Write-Host "   (A janela será minimizada)" -ForegroundColor Gray
Write-Host ""

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$scriptPath'; node buscar-contas-background.js" -WindowStyle Normal

Write-Host "✅ Scraper iniciado em segundo plano!" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Dica: Para ver os logs, procure pela janela minimizada do PowerShell" -ForegroundColor Yellow
Write-Host "   Ou execute diretamente: cd scripts-local; node buscar-contas-background.js" -ForegroundColor Yellow
Write-Host ""

