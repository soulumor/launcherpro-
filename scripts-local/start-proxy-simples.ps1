# Script PowerShell para iniciar proxy simples em segundo plano

Write-Host "🚀 Iniciando proxy simples..." -ForegroundColor Cyan
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

# Verificar se arquivo existe
if (-not (Test-Path "$scriptPath\proxy-simples.js")) {
    Write-Host "❌ Arquivo proxy-simples.js não encontrado!" -ForegroundColor Red
    exit 1
}

# Iniciar proxy em nova janela
Write-Host "▶️  Iniciando proxy simples..." -ForegroundColor Green
Write-Host "   (A janela será aberta)" -ForegroundColor Gray
Write-Host ""

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$scriptPath'; Write-Host '=== Proxy Simples (CORS) ===' -ForegroundColor Cyan; Write-Host ''; node proxy-simples.js"

Write-Host "✅ Proxy simples iniciado!" -ForegroundColor Green
Write-Host ""
Write-Host "💡 O proxy está rodando na porta 3003" -ForegroundColor Yellow
Write-Host "💡 Para ver os logs, procure pela janela do PowerShell" -ForegroundColor Yellow
Write-Host ""

