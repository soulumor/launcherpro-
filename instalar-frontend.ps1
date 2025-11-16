Write-Host "🚀 Instalando e iniciando o frontend..." -ForegroundColor Cyan

# Navegar para o diretório frontend
Set-Location frontend

# Verificar se node_modules existe
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Instalando dependências..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erro ao instalar dependências!" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ Dependências instaladas!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Iniciando servidor de desenvolvimento..." -ForegroundColor Cyan
Write-Host "📝 O frontend estará disponível em: http://localhost:3000" -ForegroundColor Yellow
Write-Host ""

# Iniciar servidor
npm run dev
