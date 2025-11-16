Write-Host "🚀 Iniciando servidores do LauncherPro..." -ForegroundColor Cyan
Write-Host ""

# Parar processos Node existentes
Write-Host "🛑 Parando processos Node existentes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Iniciar Backend
Write-Host "📡 Iniciando Backend (porta 3001)..." -ForegroundColor Green
$backendProcess = Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory "backend" -WindowStyle Normal -PassThru
Start-Sleep -Seconds 3

# Verificar se o backend iniciou
if ($backendProcess -and !$backendProcess.HasExited) {
    Write-Host "✅ Backend iniciado com sucesso!" -ForegroundColor Green
} else {
    Write-Host "❌ Erro ao iniciar o backend!" -ForegroundColor Red
    exit 1
}

# Iniciar Frontend
Write-Host "🌐 Iniciando Frontend (porta 3000)..." -ForegroundColor Green
$frontendProcess = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WorkingDirectory "frontend" -WindowStyle Normal -PassThru
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "✅ Servidores iniciados!" -ForegroundColor Green
Write-Host ""
Write-Host "📡 Backend: http://localhost:3001" -ForegroundColor Cyan
Write-Host "🌐 Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pressione Ctrl+C para parar os servidores" -ForegroundColor Yellow

# Manter script rodando
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} catch {
    Write-Host ""
    Write-Host "🛑 Parando servidores..." -ForegroundColor Yellow
    Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
    Stop-Process -Id $frontendProcess.Id -Force -ErrorAction SilentlyContinue
    Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "✅ Servidores parados!" -ForegroundColor Green
}







