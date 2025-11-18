# Script para listar usuarios lendo o banco de dados diretamente
# Não precisa fazer login na API (evita rate limiter)

Write-Host ""
Write-Host "=== LISTAR USUARIOS DO BANCO DE DADOS ===" -ForegroundColor Cyan
Write-Host ""

# Verificar se Node.js está instalado
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js encontrado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js não encontrado!" -ForegroundColor Red
    Write-Host "   Instale Node.js em: https://nodejs.org" -ForegroundColor Yellow
    exit 1
}

# Verificar se o script existe
$scriptPath = "backend\scripts\listarUsuariosDireto.js"
if (-not (Test-Path $scriptPath)) {
    Write-Host "❌ Script não encontrado: $scriptPath" -ForegroundColor Red
    exit 1
}

# Verificar se o banco existe
$dbPath = "backend\database\launcherpro.db"
if (-not (Test-Path $dbPath)) {
    Write-Host "❌ Banco de dados não encontrado: $dbPath" -ForegroundColor Red
    Write-Host "   Execute o backend primeiro para criar o banco." -ForegroundColor Yellow
    exit 1
}

Write-Host "📁 Banco de dados: $dbPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "Executando script..." -ForegroundColor Yellow
Write-Host ""

# Executar script Node.js
cd backend
node scripts/listarUsuariosDireto.js
cd ..

Write-Host ""

