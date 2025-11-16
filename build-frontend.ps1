# Script para fazer build do frontend com URL do backend
param(
    [Parameter(Mandatory=$false)]
    [string]$BackendUrl = ""
)

Write-Host "=== Build do Frontend ===" -ForegroundColor Cyan
Write-Host ""

# Verificar se URL foi fornecida
if ([string]::IsNullOrEmpty($BackendUrl)) {
    Write-Host "ERRO: URL do backend nao fornecida!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Uso:" -ForegroundColor Yellow
    Write-Host "  .\build-frontend.ps1 -BackendUrl https://seu-backend.onrender.com" -ForegroundColor White
    Write-Host ""
    Write-Host "Ou edite o arquivo frontend\.env.production manualmente" -ForegroundColor Yellow
    exit 1
}

Write-Host "Configurando URL do backend: $BackendUrl" -ForegroundColor Yellow

# Criar arquivo .env.production
$envContent = "VITE_API_URL=$BackendUrl"
$envPath = "frontend\.env.production"

Set-Content -Path $envPath -Value $envContent -Encoding UTF8
Write-Host "    OK: Arquivo .env.production criado" -ForegroundColor Green

# Verificar se node_modules existe
Write-Host "Verificando dependencias..." -ForegroundColor Yellow
if (-not (Test-Path "frontend\node_modules")) {
    Write-Host "    Instalando dependencias..." -ForegroundColor Yellow
    cd frontend
    npm install
    cd ..
}

# Fazer build
Write-Host "Fazendo build de producao..." -ForegroundColor Yellow
cd frontend
npm run build
cd ..

if (Test-Path "frontend\dist\index.html") {
    Write-Host ""
    Write-Host "=== Build concluido com sucesso! ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "Pasta de distribuicao: frontend\dist" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Para testar localmente:" -ForegroundColor Yellow
    Write-Host "  cd frontend" -ForegroundColor White
    Write-Host "  npm run preview" -ForegroundColor White
    Write-Host ""
    Write-Host "Ou abra diretamente: frontend\dist\index.html no navegador" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "ERRO: Build falhou!" -ForegroundColor Red
    Write-Host "Verifique os erros acima" -ForegroundColor Yellow
}

