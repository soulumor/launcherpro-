Write-Host "=== Preparacao do LauncherPro para Deploy ===" -ForegroundColor Cyan
Write-Host ""

# Verificar se Git está instalado
Write-Host "[1/5] Verificando Git..." -ForegroundColor Yellow
try {
    $gitVersion = git --version
    Write-Host "    OK: Git instalado - $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "    ERRO: Git nao encontrado! Instale o Git primeiro." -ForegroundColor Red
    exit 1
}

# Verificar Node.js
Write-Host "[2/5] Verificando Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "    OK: Node.js instalado - $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "    ERRO: Node.js nao encontrado! Instale o Node.js primeiro." -ForegroundColor Red
    exit 1
}

# Verificar se backend tem dependências
Write-Host "[3/5] Verificando dependencias do backend..." -ForegroundColor Yellow
if (Test-Path "backend\node_modules") {
    Write-Host "    OK: Dependencias do backend instaladas" -ForegroundColor Green
} else {
    Write-Host "    Instalando dependencias do backend..." -ForegroundColor Yellow
    cd backend
    npm install
    cd ..
    Write-Host "    OK: Dependencias instaladas" -ForegroundColor Green
}

# Verificar se frontend tem dependências
Write-Host "[4/5] Verificando dependencias do frontend..." -ForegroundColor Yellow
if (Test-Path "frontend\node_modules") {
    Write-Host "    OK: Dependencias do frontend instaladas" -ForegroundColor Green
} else {
    Write-Host "    Instalando dependencias do frontend..." -ForegroundColor Yellow
    cd frontend
    npm install
    cd ..
    Write-Host "    OK: Dependencias instaladas" -ForegroundColor Green
}

# Verificar se banco de dados existe
Write-Host "[5/5] Verificando banco de dados..." -ForegroundColor Yellow
if (Test-Path "backend\database\launcherpro.db") {
    Write-Host "    OK: Banco de dados encontrado" -ForegroundColor Green
} else {
    Write-Host "    AVISO: Banco de dados nao encontrado. Será criado automaticamente." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Preparacao concluida! ===" -ForegroundColor Green
Write-Host ""
Write-Host "PROXIMOS PASSOS:" -ForegroundColor Cyan
Write-Host "1. Inicializar Git (se ainda nao fez)" -ForegroundColor White
Write-Host "2. Criar repositorio no GitHub" -ForegroundColor White
Write-Host "3. Fazer push do codigo" -ForegroundColor White
Write-Host "4. Criar conta no Render.com" -ForegroundColor White
Write-Host "5. Configurar deploy (veja DEPLOY_CONFIG.md)" -ForegroundColor White
Write-Host ""

