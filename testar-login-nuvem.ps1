# Script para testar login na nuvem
Write-Host "=== Testando Login na Nuvem ===" -ForegroundColor Cyan
Write-Host ""

$BACKEND_URL = "https://launcherpro.onrender.com"

# Lista de credenciais para testar
$credenciais = @(
    @{ email = "admin@launcherpro.com"; senha = "admin" },
    @{ email = "cursorsemanal@gmail.com"; senha = "Senha123" },
    @{ email = "admin@launcherpro.com"; senha = "Senha123" }
)

foreach ($cred in $credenciais) {
    Write-Host "Testando: $($cred.email) / $($cred.senha)" -ForegroundColor Yellow
    
    $loginBody = @{
        email = $cred.email
        senha = $cred.senha
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "$BACKEND_URL/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
        
        Write-Host "SUCESSO!" -ForegroundColor Green
        Write-Host "  Email: $($cred.email)" -ForegroundColor White
        Write-Host "  Senha: $($cred.senha)" -ForegroundColor White
        Write-Host "  Token recebido: $($response.token.Substring(0, 20))..." -ForegroundColor Gray
        Write-Host ""
        Write-Host "Use estas credenciais para fazer login no app!" -ForegroundColor Cyan
        Write-Host ""
        exit 0
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "  Falhou (Status: $statusCode)" -ForegroundColor Red
        Write-Host ""
    }
}

Write-Host "Nenhuma credencial funcionou. Verifique se o admin existe na nuvem." -ForegroundColor Red









