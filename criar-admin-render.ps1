# Script para criar admin no Render via API
Write-Host ""
Write-Host "=== Criando Admin no Render ===" -ForegroundColor Cyan
Write-Host ""

$url = "https://launcherpro.onrender.com/api/auth/register"
$body = @{
    nome = "Admin"
    email = "cursorsemanal@gmail.com"
    senha = "Senha123"
    tipo = "admin"
    dias_mensalidade = 30
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri $url -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
    
    Write-Host "OK: Admin criado com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Credenciais:" -ForegroundColor Cyan
    Write-Host "   Email: cursorsemanal@gmail.com" -ForegroundColor White
    Write-Host "   Senha: Senha123" -ForegroundColor Yellow
    Write-Host ""
    
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $responseBody = $reader.ReadToEnd()
    
    Write-Host "ERRO ao criar admin:" -ForegroundColor Red
    Write-Host "   Status: $statusCode" -ForegroundColor Yellow
    Write-Host "   Mensagem: $responseBody" -ForegroundColor Yellow
    Write-Host ""
    
    if ($statusCode -eq 400 -and $responseBody -like "*já cadastrado*") {
        Write-Host "INFO: O email ja esta cadastrado!" -ForegroundColor Cyan
        Write-Host "   Tentando fazer login para verificar..." -ForegroundColor Yellow
        Write-Host ""
        
        $loginUrl = "https://launcherpro.onrender.com/api/auth/login"
        $loginBody = @{
            email = "cursorsemanal@gmail.com"
            senha = "Senha123"
        } | ConvertTo-Json
        
        try {
            $loginResponse = Invoke-WebRequest -Uri $loginUrl -Method POST -Body $loginBody -ContentType "application/json" -UseBasicParsing
            
            Write-Host "OK: Login realizado com sucesso!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Credenciais corretas:" -ForegroundColor Cyan
            Write-Host "   Email: cursorsemanal@gmail.com" -ForegroundColor White
            Write-Host "   Senha: Senha123" -ForegroundColor Yellow
            Write-Host ""
        } catch {
            Write-Host "ERRO: Login falhou." -ForegroundColor Red
            Write-Host "   A senha pode estar incorreta ou o usuario nao existe." -ForegroundColor Yellow
        }
    }
}
