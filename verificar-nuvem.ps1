# Script para verificar status da nuvem (jogos, contas, usuarios)
Write-Host ""
Write-Host "=== VERIFICAR STATUS DA NUVEM ===" -ForegroundColor Cyan
Write-Host ""

$BACKEND_URL = "https://launcherpro.onrender.com"
$EMAIL = "cursorsemanal@gmail.com"
$SENHA = "123456789qQ"

# Fazer login para obter token
Write-Host "[1/4] Fazendo login..." -ForegroundColor Yellow
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
        $token = $loginData.token
        
        Write-Host "   [OK] Login realizado com sucesso!" -ForegroundColor Green
        Write-Host ""
    } else {
        Write-Host "   [ERRO] Falha no login!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   [ERRO] Nao foi possivel fazer login!" -ForegroundColor Red
    Write-Host "   Erro: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   SOLUCAO: Execute primeiro .\criar-admin-api.ps1" -ForegroundColor Yellow
    exit 1
}

# Headers com token
$headers = @{
    Authorization = "Bearer $token"
}

# Verificar jogos
Write-Host "[2/4] Verificando jogos..." -ForegroundColor Yellow
try {
    $jogosResponse = Invoke-WebRequest -Uri "$BACKEND_URL/api/jogos?comContas=true" `
        -Headers $headers `
        -UseBasicParsing `
        -TimeoutSec 10
    
    if ($jogosResponse.StatusCode -eq 200) {
        $jogos = $jogosResponse.Content | ConvertFrom-Json
        $totalJogos = $jogos.Count
        $totalContas = ($jogos | Measure-Object -Property totalContas -Sum).Sum
        $contasValidas = ($jogos | Measure-Object -Property contasValidas -Sum).Sum
        
        Write-Host "   [OK] Jogos encontrados: $totalJogos" -ForegroundColor Green
        Write-Host "   [OK] Total de contas: $totalContas" -ForegroundColor Green
        Write-Host "   [OK] Contas validas: $contasValidas" -ForegroundColor Green
        Write-Host ""
    }
} catch {
    Write-Host "   [ERRO] Nao foi possivel buscar jogos!" -ForegroundColor Red
    Write-Host "   Erro: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Verificar usuarios
Write-Host "[3/4] Verificando usuarios..." -ForegroundColor Yellow
try {
    $usuariosResponse = Invoke-WebRequest -Uri "$BACKEND_URL/api/admin/usuarios" `
        -Headers $headers `
        -UseBasicParsing `
        -TimeoutSec 10
    
    if ($usuariosResponse.StatusCode -eq 200) {
        $usuarios = $usuariosResponse.Content | ConvertFrom-Json
        $totalUsuarios = $usuarios.Count
        $admins = ($usuarios | Where-Object { $_.tipo -eq 'admin' }).Count
        $clientes = ($usuarios | Where-Object { $_.tipo -eq 'cliente' }).Count
        
        Write-Host "   [OK] Total de usuarios: $totalUsuarios" -ForegroundColor Green
        Write-Host "   [OK] Admins: $admins" -ForegroundColor Green
        Write-Host "   [OK] Clientes: $clientes" -ForegroundColor Green
        Write-Host ""
    }
} catch {
    Write-Host "   [ERRO] Nao foi possivel buscar usuarios!" -ForegroundColor Red
    Write-Host "   Erro: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Verificar sincronizacoes (se houver rota)
Write-Host "[4/4] Verificando historico de sincronizacoes..." -ForegroundColor Yellow
try {
    # Tentar buscar sincronizacoes (pode nao existir esta rota)
    $syncResponse = Invoke-WebRequest -Uri "$BACKEND_URL/api/admin/sincronizacoes" `
        -Headers $headers `
        -UseBasicParsing `
        -TimeoutSec 5 `
        -ErrorAction SilentlyContinue
    
    if ($syncResponse.StatusCode -eq 200) {
        $sincronizacoes = $syncResponse.Content | ConvertFrom-Json
        $ultimaSync = $sincronizacoes | Sort-Object -Property data_hora -Descending | Select-Object -First 1
        
        Write-Host "   [OK] Total de sincronizacoes: $($sincronizacoes.Count)" -ForegroundColor Green
        if ($ultimaSync) {
            Write-Host "   [OK] Ultima sincronizacao: $($ultimaSync.data_hora)" -ForegroundColor Green
            Write-Host "   [OK] Status: $($ultimaSync.status)" -ForegroundColor Green
            Write-Host "   [OK] Contas adicionadas: $($ultimaSync.contas_adicionadas)" -ForegroundColor Green
        }
    }
} catch {
    Write-Host "   [INFO] Rota de sincronizacoes nao disponivel ou sem historico" -ForegroundColor Gray
}

# Resumo
Write-Host ""
Write-Host "=== RESUMO ===" -ForegroundColor Cyan
Write-Host "Backend: $BACKEND_URL" -ForegroundColor White
Write-Host "Jogos: $totalJogos" -ForegroundColor White
Write-Host "Contas: $totalContas (Validas: $contasValidas)" -ForegroundColor White
Write-Host "Usuarios: $totalUsuarios (Admins: $admins, Clientes: $clientes)" -ForegroundColor White
Write-Host ""

# Verificar se precisa sincronizar
if ($totalJogos -eq 0) {
    Write-Host "[AVISO] Nenhum jogo encontrado na nuvem!" -ForegroundColor Yellow
    Write-Host "Execute sincronizacao para adicionar jogos." -ForegroundColor White
} elseif ($totalContas -eq 0) {
    Write-Host "[AVISO] Nenhuma conta encontrada!" -ForegroundColor Yellow
    Write-Host "Execute sincronizacao nos jogos para adicionar contas." -ForegroundColor White
} else {
    Write-Host "[OK] Nuvem parece estar sincronizada!" -ForegroundColor Green
}

Write-Host ""


