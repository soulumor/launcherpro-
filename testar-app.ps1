Write-Host "=== Testando LauncherPro ===" -ForegroundColor Cyan
Write-Host ""

# Testar Backend
Write-Host "[1/2] Testando Backend (http://localhost:3001)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001" -UseBasicParsing -TimeoutSec 5
    Write-Host "    OK: Backend esta respondendo!" -ForegroundColor Green
    Write-Host "    Resposta: $($response.Content)" -ForegroundColor Gray
} catch {
    Write-Host "    ERRO: Nao foi possivel conectar ao backend" -ForegroundColor Red
    Write-Host "    Detalhes: $($_.Exception.Message)" -ForegroundColor Gray
}

Write-Host ""

# Testar Frontend
Write-Host "[2/2] Testando Frontend (http://localhost:3000)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 5
    Write-Host "    OK: Frontend esta respondendo!" -ForegroundColor Green
    Write-Host "    Status: $($response.StatusCode)" -ForegroundColor Gray
} catch {
    Write-Host "    ERRO: Nao foi possivel conectar ao frontend" -ForegroundColor Red
    Write-Host "    Detalhes: $($_.Exception.Message)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== URLs para testar manualmente ===" -ForegroundColor Cyan
Write-Host "    Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "    Backend API: http://localhost:3001" -ForegroundColor White
Write-Host "    API Rota raiz: http://localhost:3001/" -ForegroundColor White
Write-Host ""
Write-Host "NOTA: O backend requer autenticacao para acessar as rotas protegidas." -ForegroundColor Yellow
Write-Host "     Acesse o frontend para fazer login e testar as funcionalidades." -ForegroundColor Yellow

