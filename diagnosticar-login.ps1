# Script para diagnosticar problemas de login
Write-Host ""
Write-Host "=== DIAGNOSTICO DE LOGIN ===" -ForegroundColor Cyan
Write-Host ""

# Verificar se está usando backend local ou nuvem
Write-Host "[1/4] Verificando configuracao do frontend..." -ForegroundColor Yellow
$envFile = "frontend\.env.production"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile
    Write-Host "   Arquivo .env.production encontrado:" -ForegroundColor Green
    $envContent | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
    
    $isCloud = $envContent | Select-String "launcherpro.onrender.com"
    if ($isCloud) {
        Write-Host "   [OK] Configurado para usar BACKEND NA NUVEM" -ForegroundColor Green
        $backendUrl = "https://launcherpro.onrender.com"
    } else {
        Write-Host "   [OK] Configurado para usar BACKEND LOCAL" -ForegroundColor Green
        $backendUrl = "http://localhost:3001"
    }
} else {
    Write-Host "   [AVISO] Arquivo .env.production nao encontrado" -ForegroundColor Yellow
    Write-Host "   Usando padrao: BACKEND LOCAL (http://localhost:3001)" -ForegroundColor Yellow
    $backendUrl = "http://localhost:3001"
}

Write-Host ""
Write-Host "[2/4] Testando conexao com backend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$backendUrl/" -UseBasicParsing -TimeoutSec 5
    Write-Host "   [OK] Backend esta respondendo!" -ForegroundColor Green
    Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Gray
} catch {
    Write-Host "   [ERRO] Backend NAO esta respondendo!" -ForegroundColor Red
    Write-Host "   Erro: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "   SOLUCAO:" -ForegroundColor Yellow
    if ($backendUrl -like "*onrender.com*") {
        Write-Host "   - Verifique se o backend na nuvem esta online" -ForegroundColor White
        Write-Host "   - Acesse: https://launcherpro.onrender.com/" -ForegroundColor White
    } else {
        Write-Host "   - Inicie o backend local: .\iniciar-servidor.ps1" -ForegroundColor White
    }
    exit 1
}

Write-Host ""
Write-Host "[3/4] Verificando se existe admin no banco..." -ForegroundColor Yellow

# Tentar credenciais comuns
$credenciais = @(
    @{email="cursorsemanal@gmail.com"; senha="12345"},
    @{email="cursorsemanal@gmail.com"; senha="Senha123"},
    @{email="admin@launcherpro.com"; senha="admin123"},
    @{email="admin@launcherpro.com"; senha="12345"}
)

$adminEncontrado = $false
foreach ($cred in $credenciais) {
    try {
        $body = @{
            email = $cred.email
            senha = $cred.senha
        } | ConvertTo-Json
        
        $response = Invoke-WebRequest -Uri "$backendUrl/api/auth/login" `
            -Method POST `
            -Body $body `
            -ContentType "application/json" `
            -UseBasicParsing `
            -TimeoutSec 5
        
        if ($response.StatusCode -eq 200) {
            $data = $response.Content | ConvertFrom-Json
            if ($data.token) {
                Write-Host "   [OK] ADMIN ENCONTRADO!" -ForegroundColor Green
                Write-Host "   Email: $($cred.email)" -ForegroundColor White
                Write-Host "   Senha: $($cred.senha)" -ForegroundColor White
                Write-Host "   Tipo: $($data.user.tipo)" -ForegroundColor White
                $adminEncontrado = $true
                $credEncontrada = $cred
                break
            }
        }
    } catch {
        # Ignorar erros de login (credenciais incorretas)
    }
}

if (-not $adminEncontrado) {
    Write-Host "   [ERRO] NENHUM ADMIN ENCONTRADO!" -ForegroundColor Red
    Write-Host ""
    Write-Host "   SOLUCAO: Criar um admin" -ForegroundColor Yellow
    Write-Host ""
    
    if ($backendUrl -like "*onrender.com*") {
        Write-Host "   Para BACKEND NA NUVEM:" -ForegroundColor Cyan
        Write-Host "   [RECOMENDADO] Criar via API (sem precisar de Shell):" -ForegroundColor Yellow
        Write-Host "   .\criar-admin-api.ps1" -ForegroundColor Green
        Write-Host ""
        Write-Host "   OU criar localmente e sincronizar:" -ForegroundColor Cyan
        Write-Host "   .\criar-admin.ps1" -ForegroundColor White
        Write-Host "   .\sincronizar-usuarios-nuvem.ps1" -ForegroundColor White
        Write-Host ""
        Write-Host "   [NOTA] Render versao gratuita nao permite usar Shell" -ForegroundColor Gray
    } else {
        Write-Host "   Para BACKEND LOCAL:" -ForegroundColor Cyan
        Write-Host "   Execute: .\criar-admin.ps1" -ForegroundColor Green
        Write-Host ""
        Write-Host "   OU diretamente:" -ForegroundColor Cyan
        Write-Host "   cd backend" -ForegroundColor White
        Write-Host "   node scripts/criarAdmin.js 'Admin' 'admin@teste.com' 'senha123'" -ForegroundColor Green
    }
} else {
    Write-Host ""
    Write-Host "[4/4] Testando login completo..." -ForegroundColor Yellow
    Write-Host "   [OK] Use estas credenciais para fazer login:" -ForegroundColor Green
    Write-Host "   Email: $($credEncontrada.email)" -ForegroundColor White
    Write-Host "   Senha: $($credEncontrada.senha)" -ForegroundColor White
}

Write-Host ""
Write-Host "=== RESUMO ===" -ForegroundColor Cyan
Write-Host "Backend: $backendUrl" -ForegroundColor White
if ($adminEncontrado) {
    Write-Host "Status: [OK] Pronto para usar!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Acesse o app e faca login com:" -ForegroundColor Yellow
    Write-Host "Email: $($credEncontrada.email)" -ForegroundColor White
    Write-Host "Senha: $($credEncontrada.senha)" -ForegroundColor White
} else {
    Write-Host "Status: [ERRO] Precisa criar admin primeiro!" -ForegroundColor Red
}

Write-Host ""

