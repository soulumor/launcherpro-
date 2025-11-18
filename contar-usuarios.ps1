# Script rapido para contar usuarios e admins
Write-Host ""
Write-Host "=== CONTAR USUARIOS ===" -ForegroundColor Cyan
Write-Host ""

$BACKEND_URL = "https://launcherpro.onrender.com"
$EMAIL = "cursorsemanal@gmail.com"
$SENHA = "123456789qQ"

# Fazer login
try {
    $loginBody = @{email = $EMAIL; senha = $SENHA} | ConvertTo-Json
    $loginResponse = Invoke-WebRequest -Uri "$BACKEND_URL/api/auth/login" `
        -Method POST -Body $loginBody -ContentType "application/json" `
        -UseBasicParsing -TimeoutSec 10
    
    $token = ($loginResponse.Content | ConvertFrom-Json).token
    $headers = @{Authorization = "Bearer $token"}
    
    # Buscar usuarios
    $usuariosResponse = Invoke-WebRequest -Uri "$BACKEND_URL/api/admin/usuarios" `
        -Headers $headers -UseBasicParsing -TimeoutSec 10
    
    $usuarios = $usuariosResponse.Content | ConvertFrom-Json
    $totalUsuarios = $usuarios.Count
    $totalAdmins = ($usuarios | Where-Object { $_.tipo -eq 'admin' }).Count
    $totalClientes = ($usuarios | Where-Object { $_.tipo -eq 'cliente' }).Count
    $usuariosAtivos = ($usuarios | Where-Object { $_.ativo -eq 1 }).Count
    
    Write-Host "Total de Usuarios: $totalUsuarios" -ForegroundColor White
    Write-Host "Admins: $totalAdmins" -ForegroundColor Magenta
    Write-Host "Clientes: $totalClientes" -ForegroundColor Cyan
    Write-Host "Usuarios Ativos: $usuariosAtivos" -ForegroundColor Green
    Write-Host ""
    
} catch {
    Write-Host "[ERRO] $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Execute: .\criar-admin-api.ps1" -ForegroundColor Yellow
}

Write-Host ""


