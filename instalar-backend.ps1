# Script PowerShell para instalar e iniciar o backend
Write-Host "🚀 Instalando dependências do backend..." -ForegroundColor Cyan

# Navegar para o diretório do backend
Set-Location -Path ".\backend"

# Verificar se existe package.json
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Erro: package.json não encontrado!" -ForegroundColor Red
    Write-Host "Certifique-se de que você está na raiz do projeto LauncherPro" -ForegroundColor Yellow
    Set-Location -Path ".."
    exit 1
}

# Instalar dependências
Write-Host "📦 Executando npm install..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Dependências instaladas com sucesso!" -ForegroundColor Green
    Write-Host "🚀 Iniciando o servidor backend..." -ForegroundColor Cyan
    npm start
} else {
    Write-Host "❌ Erro ao instalar dependências!" -ForegroundColor Red
    Set-Location -Path ".."
    exit 1
}

