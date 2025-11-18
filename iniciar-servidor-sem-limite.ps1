# Script para iniciar servidor backend sem rate limiter
# Útil para testes e desenvolvimento

Write-Host ""
Write-Host "=== Iniciando Servidor SEM Rate Limiter ===" -ForegroundColor Cyan
Write-Host ""

# Definir variável de ambiente para desabilitar rate limiter
$env:DISABLE_RATE_LIMITER = "true"

Write-Host "✅ Rate Limiter DESABILITADO" -ForegroundColor Yellow
Write-Host "   Variável DISABLE_RATE_LIMITER = true" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  ATENÇÃO: Rate limiter está desabilitado!" -ForegroundColor Red
Write-Host "   Use apenas para desenvolvimento/testes." -ForegroundColor Yellow
Write-Host ""

# Verificar se está na pasta correta
if (-not (Test-Path "backend\server.js")) {
    Write-Host "❌ Erro: backend\server.js não encontrado!" -ForegroundColor Red
    Write-Host "   Execute este script na pasta raiz do projeto." -ForegroundColor Yellow
    exit 1
}

# Verificar se node_modules existe
if (-not (Test-Path "backend\node_modules")) {
    Write-Host "⚠️  node_modules não encontrado. Instalando dependências..." -ForegroundColor Yellow
    cd backend
    npm install
    cd ..
}

Write-Host "Iniciando servidor..." -ForegroundColor Green
Write-Host ""

# Iniciar servidor
cd backend
node server.js

