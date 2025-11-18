# Script PowerShell para sincronizar usuários do banco local para a nuvem
# 
# Este script:
# 1. Lê todos os usuários do banco local (SQLite)
# 2. Envia cada usuário para a API da nuvem via /api/auth/register
# 3. Ignora usuários que já existem na nuvem

Write-Host ""
Write-Host "=== SINCRONIZAR USUARIOS DO BANCO LOCAL PARA A NUVEM ===" -ForegroundColor Cyan
Write-Host ""

# Configuração
$cloudApiUrl = "https://launcherpro.onrender.com"
$backendPath = Join-Path $PSScriptRoot "backend"

# Verificar se o banco local existe
$dbPath = Join-Path $backendPath "database\launcherpro.db"
if (-not (Test-Path $dbPath)) {
    Write-Host "ERRO: Banco de dados local nao encontrado em:" -ForegroundColor Red
    Write-Host "  $dbPath" -ForegroundColor Yellow
    exit 1
}

# Executar script Node.js
Write-Host "Executando script de sincronizacao..." -ForegroundColor Yellow
Write-Host ""

cd $backendPath
$env:CLOUD_API_URL = $cloudApiUrl
node scripts/sincronizarUsuarios.js

Write-Host ""
Write-Host "=== CONCLUIDO ===" -ForegroundColor Green
Write-Host ""






