# Script para criar admin de forma interativa
Write-Host "=== Criar Administrador ===" -ForegroundColor Cyan
Write-Host ""

# Solicitar dados
$nome = Read-Host "Digite o nome do admin"
$email = Read-Host "Digite o email do admin"
$senha = Read-Host "Digite a senha do admin" -AsSecureString
$senhaTexto = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($senha)
)

Write-Host ""
Write-Host "Criando admin..." -ForegroundColor Yellow

cd backend
node scripts/criarAdmin.js "$nome" "$email" "$senhaTexto"
cd ..

Write-Host ""
Write-Host "=== Concluido! ===" -ForegroundColor Green

