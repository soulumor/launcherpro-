# Script para testar senhas comuns e descobrir qual funciona
Write-Host ""
Write-Host "=== TESTAR SENHAS DOS USUARIOS ===" -ForegroundColor Cyan
Write-Host ""

$BACKEND_URL = "https://launcherpro.onrender.com"

# Lista de usuários e senhas possíveis
$usuarios = @(
    @{
        email = "cursorsemanal@gmail.com"
        senhas = @("Senha123", "123456789qQ", "12345", "admin123")
    },
    @{
        email = "admin@launcherpro.com"
        senhas = @("admin123", "TempSenha123", "Senha123", "12345")
    },
    @{
        email = "berg3@gmail.com"
        senhas = @("Senha123", "123456789qQ", "admin123", "12345")
    },
    @{
        email = "12345@gmail.com"
        senhas = @("TempSenha123", "12345", "Senha123", "123456789qQ")
    }
)

Write-Host "Testando senhas para cada usuario..." -ForegroundColor Yellow
Write-Host "Backend: $BACKEND_URL" -ForegroundColor Gray
Write-Host ""

$resultados = @()

foreach ($usuario in $usuarios) {
    Write-Host "--- Testando: $($usuario.email) ---" -ForegroundColor Cyan
    
    $senhaEncontrada = $null
    
    foreach ($senha in $usuario.senhas) {
        try {
            $body = @{
                email = $usuario.email
                senha = $senha
            } | ConvertTo-Json
            
            $response = Invoke-WebRequest -Uri "$BACKEND_URL/api/auth/login" `
                -Method POST `
                -Body $body `
                -ContentType "application/json" `
                -UseBasicParsing `
                -TimeoutSec 15 `
                -ErrorAction Stop
            
            if ($response.StatusCode -eq 200) {
                $data = $response.Content | ConvertFrom-Json
                if ($data.token) {
                    Write-Host "   ✅ SENHA ENCONTRADA: $senha" -ForegroundColor Green
                    $senhaEncontrada = $senha
                    break
                }
            }
        } catch {
            # Ignorar erros - continuar testando
        }
    }
    
    if ($senhaEncontrada) {
        $resultados += [PSCustomObject]@{
            Email = $usuario.email
            Senha = $senhaEncontrada
            Status = "✅ FUNCIONA"
        }
    } else {
        $resultados += [PSCustomObject]@{
            Email = $usuario.email
            Senha = "NÃO ENCONTRADA"
            Status = "❌ NENHUMA SENHA FUNCIONOU"
        }
    }
    
    Write-Host ""
    
    # Aguardar um pouco para evitar rate limiter
    Start-Sleep -Milliseconds 500
}

Write-Host "=== RESULTADOS ===" -ForegroundColor Cyan
Write-Host ""
$resultados | Format-Table -AutoSize

Write-Host ""
Write-Host "=== RESUMO DAS SENHAS QUE FUNCIONAM ===" -ForegroundColor Green
Write-Host ""
foreach ($resultado in $resultados) {
    if ($resultado.Status -eq "✅ FUNCIONA") {
        Write-Host "Email: $($resultado.Email)" -ForegroundColor White
        Write-Host "Senha: $($resultado.Senha)" -ForegroundColor Yellow
        Write-Host ""
    }
}

Write-Host ""

