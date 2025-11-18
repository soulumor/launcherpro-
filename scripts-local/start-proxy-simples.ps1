# Script PowerShell para iniciar proxy simples em nova janela

Write-Host "Iniciando proxy simples..." -ForegroundColor Cyan
Write-Host ""

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$nodePath = Get-Command node -ErrorAction SilentlyContinue

if (-not $nodePath) {
    Write-Host "ERRO: Node.js nao encontrado!" -ForegroundColor Red
    Write-Host "   Instale Node.js primeiro: https://nodejs.org" -ForegroundColor Yellow
    exit 1
}

Write-Host "Diretorio: $scriptPath" -ForegroundColor White
Write-Host ""

# Verificar se arquivo existe
if (-not (Test-Path "$scriptPath\proxy-simples.js")) {
    Write-Host "ERRO: Arquivo proxy-simples.js nao encontrado!" -ForegroundColor Red
    exit 1
}

# Parar processos existentes na porta 3003
Write-Host "Parando processos na porta 3003..." -ForegroundColor Yellow
$processos = Get-NetTCPConnection -LocalPort 3003 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($processos) {
    $processos | ForEach-Object {
        Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
    }
    Write-Host "Processos encerrados" -ForegroundColor Green
    Start-Sleep -Seconds 1
} else {
    Write-Host "   Nenhum processo encontrado" -ForegroundColor Gray
}
Write-Host ""

# Iniciar proxy em nova janela
Write-Host "Iniciando proxy simples..." -ForegroundColor Green
Write-Host "   (A janela sera aberta)" -ForegroundColor Gray
Write-Host ""

$command = "cd '$scriptPath'; Write-Host '=== PROXY SIMPLES (CORS) ===' -ForegroundColor Cyan; Write-Host ''; Write-Host 'Porta: 3003' -ForegroundColor Yellow; Write-Host 'Endpoint: http://localhost:3003/buscar' -ForegroundColor Yellow; Write-Host 'Status: http://localhost:3003/status' -ForegroundColor Yellow; Write-Host ''; Write-Host 'Pressione Ctrl+C para parar' -ForegroundColor Gray; Write-Host ''; node proxy-simples.js"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $command

Write-Host "Proxy simples iniciado!" -ForegroundColor Green
Write-Host ""
Write-Host "O proxy esta rodando na porta 3003" -ForegroundColor Yellow
Write-Host "Para ver os logs, procure pela janela do PowerShell" -ForegroundColor Yellow
Write-Host ""
