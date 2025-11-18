# Script para criar admin via API (sem precisar de Shell)
Write-Host ""
Write-Host "=== Criar Admin via API ===" -ForegroundColor Cyan
Write-Host ""

$BACKEND_URL = "https://launcherpro.onrender.com"
$NOME = "Admin"
$EMAIL = "cursorsemanal@gmail.com"
$SENHA = "123456789qQ"

Write-Host "Backend: $BACKEND_URL" -ForegroundColor White
Write-Host "Email: $EMAIL" -ForegroundColor White
Write-Host ""

# Primeiro, verificar se admin ja existe
Write-Host "[1/3] Verificando se admin ja existe..." -ForegroundColor Yellow
try {
    $loginBody = @{
        email = $EMAIL
        senha = $SENHA
    } | ConvertTo-Json
    
    $loginResponse = Invoke-WebRequest -Uri "$BACKEND_URL/api/auth/login" `
        -Method POST `
        -Body $loginBody `
        -ContentType "application/json" `
        -UseBasicParsing `
        -TimeoutSec 10
    
    if ($loginResponse.StatusCode -eq 200) {
        $loginData = $loginResponse.Content | ConvertFrom-Json
        if ($loginData.token) {
            Write-Host "   [OK] Admin ja existe e senha esta correta!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Credenciais:" -ForegroundColor Cyan
            Write-Host "   Email: $EMAIL" -ForegroundColor White
            Write-Host "   Senha: $SENHA" -ForegroundColor White
            Write-Host ""
            exit 0
        }
    }
} catch {
    Write-Host "   [INFO] Admin nao existe ou senha incorreta, criando novo..." -ForegroundColor Yellow
}

# Tentar criar admin via API
Write-Host ""
Write-Host "[2/3] Tentando criar admin via API..." -ForegroundColor Yellow

$registerBody = @{
    nome = $NOME
    email = $EMAIL
    senha = $SENHA
    tipo = "admin"
    dias_mensalidade = 30
} | ConvertTo-Json

try {
    $registerResponse = Invoke-WebRequest -Uri "$BACKEND_URL/api/auth/register" `
        -Method POST `
        -Body $registerBody `
        -ContentType "application/json" `
        -UseBasicParsing `
        -TimeoutSec 10
    
    if ($registerResponse.StatusCode -eq 201) {
        $registerData = $registerResponse.Content | ConvertFrom-Json
        Write-Host "   [OK] Admin criado com sucesso!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Credenciais:" -ForegroundColor Cyan
        Write-Host "   Email: $EMAIL" -ForegroundColor White
        Write-Host "   Senha: $SENHA" -ForegroundColor White
        Write-Host "   Tipo: $($registerData.tipo)" -ForegroundColor White
        Write-Host ""
        
        # Testar login
        Write-Host "[3/3] Testando login..." -ForegroundColor Yellow
        try {
            $testLoginBody = @{
                email = $EMAIL
                senha = $SENHA
            } | ConvertTo-Json
            
            $testResponse = Invoke-WebRequest -Uri "$BACKEND_URL/api/auth/login" `
                -Method POST `
                -Body $testLoginBody `
                -ContentType "application/json" `
                -UseBasicParsing `
                -TimeoutSec 10
            
            if ($testResponse.StatusCode -eq 200) {
                $testData = $testResponse.Content | ConvertFrom-Json
                Write-Host "   [OK] Login funcionando!" -ForegroundColor Green
                Write-Host ""
                Write-Host "=== SUCESSO ===" -ForegroundColor Green
                Write-Host "Voce pode fazer login no app com:" -ForegroundColor Cyan
                Write-Host "   Email: $EMAIL" -ForegroundColor White
                Write-Host "   Senha: $SENHA" -ForegroundColor White
            }
        } catch {
            Write-Host "   [AVISO] Admin criado mas login falhou. Tente fazer login manualmente." -ForegroundColor Yellow
        }
    }
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $errorMessage = $_.Exception.Message
    
    Write-Host "   [ERRO] Falha ao criar admin!" -ForegroundColor Red
    Write-Host "   Status: $statusCode" -ForegroundColor Yellow
    
    # Tentar ler resposta de erro
    try {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $responseBody = $reader.ReadToEnd()
        $errorData = $responseBody | ConvertFrom-Json
        
        Write-Host "   Erro: $($errorData.error)" -ForegroundColor Yellow
        
        if ($errorData.error -like "*ja cadastrado*") {
            Write-Host ""
            Write-Host "   [INFO] Email ja esta cadastrado!" -ForegroundColor Yellow
            Write-Host "   Tente fazer login ou use outro email." -ForegroundColor White
        } elseif ($errorData.error -like "*senha*") {
            Write-Host ""
            Write-Host "   [INFO] Senha nao atende aos requisitos!" -ForegroundColor Yellow
            Write-Host "   A senha deve ter pelo menos 6 caracteres." -ForegroundColor White
        }
    } catch {
        Write-Host "   Erro: $errorMessage" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "=== SOLUCOES ALTERNATIVAS ===" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Criar localmente e sincronizar:" -ForegroundColor Yellow
    Write-Host "   .\criar-admin.ps1" -ForegroundColor White
    Write-Host "   .\sincronizar-usuarios-nuvem.ps1" -ForegroundColor White
    Write-Host ""
    Write-Host "2. Verificar se ja existe outro admin:" -ForegroundColor Yellow
    Write-Host "   Execute: .\diagnosticar-login.ps1" -ForegroundColor White
    Write-Host ""
    Write-Host "3. Usar outro email:" -ForegroundColor Yellow
    Write-Host "   Edite este script e altere a variavel EMAIL" -ForegroundColor White
    
    exit 1
}

Write-Host ""


