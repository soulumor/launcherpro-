# Script para contar quantos logins foram feitos na nuvem
Write-Host ""
Write-Host "=== CONTAR LOGINS NA NUVEM ===" -ForegroundColor Cyan
Write-Host ""

$BACKEND_URL = "https://launcherpro.onrender.com"
$EMAIL = "cursorsemanal@gmail.com"
$SENHA = "123456789qQ"

Write-Host "📡 Backend: $BACKEND_URL" -ForegroundColor White
Write-Host ""

# Fazer login
Write-Host "[1/2] Fazendo login como admin..." -ForegroundColor Yellow
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
        -TimeoutSec 15
    
    if ($loginResponse.StatusCode -eq 200) {
        $loginData = $loginResponse.Content | ConvertFrom-Json
        $token = $loginData.token
        
        if ($token) {
            Write-Host "   ✅ Login realizado com sucesso!" -ForegroundColor Green
            Write-Host ""
        } else {
            Write-Host "   ❌ Erro: Token não recebido" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "   ❌ Erro ao fazer login (Status: $($loginResponse.StatusCode))" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   ❌ Erro ao fazer login:" -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Resposta: $responseBody" -ForegroundColor Red
    }
    exit 1
}

# Buscar lista de usuários
Write-Host "[2/2] Buscando lista de usuários na nuvem..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    $usuariosResponse = Invoke-WebRequest -Uri "$BACKEND_URL/api/admin/usuarios" `
        -Method GET `
        -Headers $headers `
        -UseBasicParsing `
        -TimeoutSec 15
    
    if ($usuariosResponse.StatusCode -eq 200) {
        $usuarios = $usuariosResponse.Content | ConvertFrom-Json
        
        Write-Host "   ✅ Usuários encontrados: $($usuarios.Count)" -ForegroundColor Green
        Write-Host ""
        
        # Contar logins
        $totalUsuarios = $usuarios.Count
        $usuariosComLogin = 0
        $usuariosSemLogin = 0
        $loginsRecentes = 0
        $hoje = Get-Date
        
        Write-Host "📊 ESTATÍSTICAS DE LOGIN:" -ForegroundColor Cyan
        Write-Host ""
        
        foreach ($usuario in $usuarios) {
            if ($usuario.ultimo_login) {
                $usuariosComLogin++
                $dataLogin = [DateTime]::Parse($usuario.ultimo_login)
                $diasAtras = ($hoje - $dataLogin).Days
                
                if ($diasAtras -le 7) {
                    $loginsRecentes++
                }
            } else {
                $usuariosSemLogin++
            }
        }
        
        Write-Host "   Total de usuários: $totalUsuarios" -ForegroundColor White
        Write-Host "   ✅ Usuários que já fizeram login: $usuariosComLogin" -ForegroundColor Green
        Write-Host "   ❌ Usuários que nunca fizeram login: $usuariosSemLogin" -ForegroundColor Yellow
        Write-Host "   📅 Logins nos últimos 7 dias: $loginsRecentes" -ForegroundColor Cyan
        Write-Host ""
        
        # Mostrar detalhes de cada usuário
        Write-Host "📋 DETALHES POR USUÁRIO:" -ForegroundColor Cyan
        Write-Host ""
        
        foreach ($usuario in $usuarios) {
            $tipo = if ($usuario.tipo -eq "admin") { "👑 Admin" } else { "👤 Cliente" }
            $status = if ($usuario.ativo -eq 1) { "✅ Ativo" } else { "❌ Inativo" }
            
            Write-Host "   $tipo - $($usuario.nome) ($($usuario.email))" -ForegroundColor White
            Write-Host "      Status: $status" -ForegroundColor $(if ($usuario.ativo -eq 1) { "Green" } else { "Red" })
            
            if ($usuario.ultimo_login) {
                $dataLogin = [DateTime]::Parse($usuario.ultimo_login)
                $diasAtras = ($hoje - $dataLogin).Days
                $dataFormatada = $dataLogin.ToString("dd/MM/yyyy HH:mm:ss")
                
                if ($diasAtras -eq 0) {
                    Write-Host "      Último login: $dataFormatada (Hoje)" -ForegroundColor Green
                } elseif ($diasAtras -eq 1) {
                    Write-Host "      Último login: $dataFormatada (Ontem)" -ForegroundColor Green
                } elseif ($diasAtras -le 7) {
                    Write-Host "      Último login: $dataFormatada (Há $diasAtras dias)" -ForegroundColor Cyan
                } elseif ($diasAtras -le 30) {
                    Write-Host "      Último login: $dataFormatada (Há $diasAtras dias)" -ForegroundColor Yellow
                } else {
                    Write-Host "      Último login: $dataFormatada (Há $diasAtras dias)" -ForegroundColor Red
                }
            } else {
                Write-Host "      Último login: Nunca fez login" -ForegroundColor Gray
            }
            Write-Host ""
        }
        
        Write-Host "✅ Consulta concluída!" -ForegroundColor Green
        Write-Host ""
        
    } else {
        Write-Host "   ❌ Erro ao buscar usuários (Status: $($usuariosResponse.StatusCode))" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   ❌ Erro ao buscar usuários:" -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Resposta: $responseBody" -ForegroundColor Red
    }
    exit 1
}


