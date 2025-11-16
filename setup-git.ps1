# Script para configurar Git e fazer primeiro push
param(
    [Parameter(Mandatory=$true)]
    [string]$GitHubUrl
)

Write-Host "=== Configurando Git ===" -ForegroundColor Cyan
Write-Host ""

# Verificar se já é um repositório Git
if (Test-Path ".git") {
    Write-Host "AVISO: Git ja inicializado neste diretorio" -ForegroundColor Yellow
    $continuar = Read-Host "Deseja continuar mesmo assim? (S/N)"
    if ($continuar -ne "S" -and $continuar -ne "s") {
        exit 0
    }
} else {
    Write-Host "[1/4] Inicializando Git..." -ForegroundColor Yellow
    git init
    Write-Host "    OK: Git inicializado" -ForegroundColor Green
}

# Verificar arquivos não commitados
Write-Host "[2/4] Verificando arquivos..." -ForegroundColor Yellow
git status --short | Measure-Object -Line | ForEach-Object {
    $linhas = $_.Lines
    if ($linhas -gt 0) {
        Write-Host "    Encontrados $linhas arquivos para adicionar" -ForegroundColor Green
    } else {
        Write-Host "    Nenhum arquivo novo encontrado" -ForegroundColor Yellow
    }
}

# Adicionar arquivos
Write-Host "[3/4] Adicionando arquivos ao Git..." -ForegroundColor Yellow
git add .
Write-Host "    OK: Arquivos adicionados" -ForegroundColor Green

# Commit
Write-Host "[4/4] Fazendo commit inicial..." -ForegroundColor Yellow
git commit -m "Setup inicial do LauncherPro"
Write-Host "    OK: Commit realizado" -ForegroundColor Green

# Renomear branch para main
Write-Host "Renomeando branch para main..." -ForegroundColor Yellow
git branch -M main
Write-Host "    OK: Branch renomeada" -ForegroundColor Green

# Adicionar remote
Write-Host "Configurando remote GitHub..." -ForegroundColor Yellow
git remote remove origin -ErrorAction SilentlyContinue
git remote add origin $GitHubUrl
Write-Host "    OK: Remote configurado" -ForegroundColor Green

Write-Host ""
Write-Host "=== Pronto! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Para fazer push, execute:" -ForegroundColor Cyan
Write-Host "git push -u origin main" -ForegroundColor White
Write-Host ""

