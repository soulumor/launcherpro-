# Script para listar todos os usuarios e admins do backend
Write-Host ""
Write-Host "=== LISTAR USUARIOS DO BACKEND ===" -ForegroundColor Cyan
Write-Host ""

$BACKEND_URL = "https://launcherpro.onrender.com"
$EMAIL = "cursorsemanal@gmail.com"
$SENHA = "123456789qQ"

# Fazer login
Write-Host "Fazendo login..." -ForegroundColor Yellow
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
        $headers = @{
            Authorization = "Bearer $token"
        }
        
        Write-Host "[OK] Login realizado!" -ForegroundColor Green
        Write-Host ""
    } else {
        Write-Host "[ERRO] Falha no login!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "[ERRO] Nao foi possivel fazer login!" -ForegroundColor Red
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "SOLUCAO: Execute primeiro .\criar-admin-api.ps1" -ForegroundColor Yellow
    exit 1
}

# Buscar usuarios
Write-Host "Buscando usuarios..." -ForegroundColor Yellow
try {
    $usuariosResponse = Invoke-WebRequest -Uri "$BACKEND_URL/api/admin/usuarios" `
        -Headers $headers `
        -UseBasicParsing `
        -TimeoutSec 10
    
    if ($usuariosResponse.StatusCode -eq 200) {
        $usuarios = $usuariosResponse.Content | ConvertFrom-Json
        
        $totalUsuarios = $usuarios.Count
        $admins = $usuarios | Where-Object { $_.tipo -eq 'admin' }
        $clientes = $usuarios | Where-Object { $_.tipo -eq 'cliente' }
        $semTipo = $usuarios | Where-Object { -not $_.tipo -or $_.tipo -eq '' -or ($_.tipo -ne 'admin' -and $_.tipo -ne 'cliente') }
        $totalAdmins = $admins.Count
        $totalClientes = $clientes.Count
        $totalSemTipo = $semTipo.Count
        
        Write-Host ""
        Write-Host "=== RESUMO ===" -ForegroundColor Cyan
        Write-Host "Total de Usuarios: $totalUsuarios" -ForegroundColor White
        Write-Host "Admins: $totalAdmins" -ForegroundColor Magenta
        Write-Host "Clientes: $totalClientes" -ForegroundColor Cyan
        if ($totalSemTipo -gt 0) {
            Write-Host "Sem Tipo Definido: $totalSemTipo" -ForegroundColor Yellow
        }
        Write-Host ""
        
        # Listar TODOS os usuarios primeiro (para debug)
        Write-Host "=== TODOS OS USUARIOS ($totalUsuarios) ===" -ForegroundColor Cyan
        $usuarios | ForEach-Object {
            $tipo = if ($_.tipo) { $_.tipo } else { "[SEM TIPO]" }
            $ativo = if ($_.ativo -eq 1) { "[ATIVO]" } else { "[INATIVO]" }
            $cor = if ($_.ativo -eq 1) { "Green" } else { "Red" }
            
            Write-Host "  ID: $($_.id) | Tipo: $tipo | $ativo" -ForegroundColor $cor
            Write-Host "  Nome: $($_.nome)" -ForegroundColor White
            Write-Host "  Email: $($_.email)" -ForegroundColor White
            
            if ($_.data_vencimento) {
                $vencimento = [DateTime]::Parse($_.data_vencimento)
                $hoje = Get-Date
                $diasRestantes = ($vencimento - $hoje).Days
                
                if ($diasRestantes -gt 7) {
                    Write-Host "  Vencimento: $($vencimento.ToString('dd/MM/yyyy')) ($diasRestantes dias restantes)" -ForegroundColor Green
                } elseif ($diasRestantes -gt 0) {
                    Write-Host "  Vencimento: $($vencimento.ToString('dd/MM/yyyy')) ($diasRestantes dias restantes)" -ForegroundColor Yellow
                } else {
                    Write-Host "  Vencimento: $($vencimento.ToString('dd/MM/yyyy')) (VENCIDO)" -ForegroundColor Red
                }
            } else {
                if ($_.tipo -eq 'admin') {
                    Write-Host "  Vencimento: ILIMITADO (Admin)" -ForegroundColor Green
                } else {
                    Write-Host "  Vencimento: NAO DEFINIDO" -ForegroundColor Yellow
                }
            }
            
            if ($_.data_criacao) {
                $criacao = [DateTime]::Parse($_.data_criacao)
                Write-Host "  Criado em: $($criacao.ToString('dd/MM/yyyy HH:mm'))" -ForegroundColor Gray
            }
            
            Write-Host ""
        }
        
        # Listar Admins
        if ($totalAdmins -gt 0) {
            Write-Host "=== ADMINS ($totalAdmins) ===" -ForegroundColor Magenta
            $admins | ForEach-Object {
                $ativo = if ($_.ativo -eq 1) { "[ATIVO]" } else { "[INATIVO]" }
                $cor = if ($_.ativo -eq 1) { "Green" } else { "Red" }
                
                Write-Host "  ID: $($_.id) | $ativo" -ForegroundColor $cor
                Write-Host "  Nome: $($_.nome)" -ForegroundColor White
                Write-Host "  Email: $($_.email)" -ForegroundColor White
                
                if ($_.data_vencimento) {
                    $vencimento = [DateTime]::Parse($_.data_vencimento)
                    $hoje = Get-Date
                    $diasRestantes = ($vencimento - $hoje).Days
                    
                    if ($diasRestantes -gt 7) {
                        Write-Host "  Vencimento: $($vencimento.ToString('dd/MM/yyyy')) ($diasRestantes dias restantes)" -ForegroundColor Green
                    } elseif ($diasRestantes -gt 0) {
                        Write-Host "  Vencimento: $($vencimento.ToString('dd/MM/yyyy')) ($diasRestantes dias restantes)" -ForegroundColor Yellow
                    } else {
                        Write-Host "  Vencimento: $($vencimento.ToString('dd/MM/yyyy')) (VENCIDO)" -ForegroundColor Red
                    }
                } else {
                    Write-Host "  Vencimento: ILIMITADO (Admin)" -ForegroundColor Green
                }
                
                if ($_.data_criacao) {
                    $criacao = [DateTime]::Parse($_.data_criacao)
                    Write-Host "  Criado em: $($criacao.ToString('dd/MM/yyyy HH:mm'))" -ForegroundColor Gray
                }
                
                Write-Host ""
            }
        } else {
            Write-Host "=== ADMINS ===" -ForegroundColor Magenta
            Write-Host "  Nenhum admin encontrado" -ForegroundColor Yellow
            Write-Host ""
        }
        
        # Listar Clientes
        if ($totalClientes -gt 0) {
            Write-Host "=== CLIENTES ($totalClientes) ===" -ForegroundColor Cyan
            $clientes | ForEach-Object {
                $ativo = if ($_.ativo -eq 1) { "[ATIVO]" } else { "[INATIVO]" }
                $cor = if ($_.ativo -eq 1) { "Green" } else { "Red" }
                
                Write-Host "  ID: $($_.id) | $ativo" -ForegroundColor $cor
                Write-Host "  Nome: $($_.nome)" -ForegroundColor White
                Write-Host "  Email: $($_.email)" -ForegroundColor White
                
                if ($_.data_vencimento) {
                    $vencimento = [DateTime]::Parse($_.data_vencimento)
                    $hoje = Get-Date
                    $diasRestantes = ($vencimento - $hoje).Days
                    
                    if ($diasRestantes -gt 7) {
                        Write-Host "  Vencimento: $($vencimento.ToString('dd/MM/yyyy')) ($diasRestantes dias restantes)" -ForegroundColor Green
                    } elseif ($diasRestantes -gt 0) {
                        Write-Host "  Vencimento: $($vencimento.ToString('dd/MM/yyyy')) ($diasRestantes dias restantes)" -ForegroundColor Yellow
                    } else {
                        Write-Host "  Vencimento: $($vencimento.ToString('dd/MM/yyyy')) (VENCIDO)" -ForegroundColor Red
                    }
                }
                
                if ($_.data_criacao) {
                    $criacao = [DateTime]::Parse($_.data_criacao)
                    Write-Host "  Criado em: $($criacao.ToString('dd/MM/yyyy HH:mm'))" -ForegroundColor Gray
                }
                
                Write-Host ""
            }
        } else {
            Write-Host "=== CLIENTES ===" -ForegroundColor Cyan
            Write-Host "  Nenhum cliente encontrado" -ForegroundColor Yellow
            Write-Host ""
        }
        
        # Listar usuarios sem tipo
        if ($totalSemTipo -gt 0) {
            Write-Host "=== USUARIOS SEM TIPO DEFINIDO ($totalSemTipo) ===" -ForegroundColor Yellow
            $semTipo | ForEach-Object {
                $ativo = if ($_.ativo -eq 1) { "[ATIVO]" } else { "[INATIVO]" }
                $cor = if ($_.ativo -eq 1) { "Green" } else { "Red" }
                
                Write-Host "  ID: $($_.id) | $ativo" -ForegroundColor $cor
                Write-Host "  Nome: $($_.nome)" -ForegroundColor White
                Write-Host "  Email: $($_.email)" -ForegroundColor White
                Write-Host "  Tipo Atual: $($_.tipo)" -ForegroundColor Yellow
                Write-Host "  [AVISO] Este usuario nao tem tipo definido!" -ForegroundColor Red
                Write-Host ""
            }
        }
        
        # Estatisticas adicionais
        Write-Host "=== ESTATISTICAS ===" -ForegroundColor Cyan
        $usuariosAtivos = ($usuarios | Where-Object { $_.ativo -eq 1 }).Count
        $usuariosInativos = ($usuarios | Where-Object { $_.ativo -eq 0 }).Count
        
        $clientesVencidos = ($clientes | Where-Object {
            if ($_.data_vencimento) {
                $vencimento = [DateTime]::Parse($_.data_vencimento)
                $hoje = Get-Date
                ($vencimento - $hoje).Days -lt 0
            } else {
                $false
            }
        }).Count
        
        $clientesProximoVencimento = ($clientes | Where-Object {
            if ($_.data_vencimento) {
                $vencimento = [DateTime]::Parse($_.data_vencimento)
                $hoje = Get-Date
                $dias = ($vencimento - $hoje).Days
                $dias -ge 0 -and $dias -le 7
            } else {
                $false
            }
        }).Count
        
        Write-Host "Usuarios Ativos: $usuariosAtivos" -ForegroundColor Green
        Write-Host "Usuarios Inativos: $usuariosInativos" -ForegroundColor $(if ($usuariosInativos -gt 0) { "Red" } else { "Gray" })
        Write-Host "Clientes Vencidos: $clientesVencidos" -ForegroundColor $(if ($clientesVencidos -gt 0) { "Red" } else { "Gray" })
        Write-Host "Clientes Proximo Vencimento (<=7 dias): $clientesProximoVencimento" -ForegroundColor $(if ($clientesProximoVencimento -gt 0) { "Yellow" } else { "Gray" })
        
    } else {
        Write-Host "[ERRO] Falha ao buscar usuarios!" -ForegroundColor Red
        Write-Host "Status: $($usuariosResponse.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[ERRO] Nao foi possivel buscar usuarios!" -ForegroundColor Red
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Yellow
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status: $statusCode" -ForegroundColor Yellow
    }
}

Write-Host ""

