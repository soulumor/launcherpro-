# Script para testar upload de contas
Write-Host "=== TESTE DE UPLOAD DE CONTAS ===" -ForegroundColor Cyan
Write-Host ""

$BACKEND_URL = "https://launcherpro.onrender.com"
$EMAIL = "admin@launcherpro.com"
$SENHA = "admin"

# 1. Fazer login
Write-Host "1. Fazendo login..." -ForegroundColor Yellow
$loginBody = @{
    email = $EMAIL
    senha = $SENHA
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$BACKEND_URL/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.token
    Write-Host "Login realizado com sucesso!" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "Erro no login: $_" -ForegroundColor Red
    exit 1
}

# 2. Criar arquivo de teste
Write-Host "2. Criando arquivo de teste..." -ForegroundColor Yellow
$testFile = @'
[
  {
    "jogo_id": 1,
    "usuario": "teste_upload_1",
    "senha": "senha123"
  },
  {
    "jogo_id": 1,
    "usuario": "teste_upload_2",
    "senha": "senha456"
  }
]
'@

$testFilePath = "teste-upload-temp.json"
$testFile | Out-File -FilePath $testFilePath -Encoding UTF8
Write-Host "Arquivo criado: $testFilePath" -ForegroundColor Green
Write-Host ""

# 3. Fazer upload
Write-Host "3. Fazendo upload do arquivo..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    
    $formData = @{
        arquivo = Get-Item $testFilePath
    }
    
    $uploadResponse = Invoke-RestMethod -Uri "$BACKEND_URL/api/contas/upload" -Method POST -Headers $headers -Form $formData
    
    Write-Host "Upload realizado com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Resultado:" -ForegroundColor Cyan
    Write-Host "  Total processado: $($uploadResponse.total)" -ForegroundColor White
    Write-Host "  Adicionadas: $($uploadResponse.adicionadas)" -ForegroundColor Green
    Write-Host "  Duplicadas: $($uploadResponse.duplicadas)" -ForegroundColor Yellow
    Write-Host "  Erros: $($uploadResponse.erros)" -ForegroundColor $(if ($uploadResponse.erros -gt 0) { "Red" } else { "Green" })
    Write-Host ""
    Write-Host "Mensagem: $($uploadResponse.mensagem)" -ForegroundColor Cyan
    
} catch {
    Write-Host "Erro no upload: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Resposta do servidor: $responseBody" -ForegroundColor Red
    }
} finally {
    # Limpar arquivo temporario
    if (Test-Path $testFilePath) {
        Remove-Item $testFilePath -Force
        Write-Host ""
        Write-Host "Arquivo temporario removido" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "=== TESTE CONCLUIDO ===" -ForegroundColor Cyan
