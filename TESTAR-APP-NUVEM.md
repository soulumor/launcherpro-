# 🧪 Como Testar o App com Servidor da Nuvem

## ✅ Configuração Atual:

- **Backend na Nuvem**: `https://launcherpro.onrender.com`
- **Frontend Local**: `http://localhost:4173`
- **Status**: ✅ Conectado e funcionando

---

## 🚀 Passo a Passo para Testar:

### 1. Verificar se o Backend está Online

Abra no navegador:
```
https://launcherpro.onrender.com/
```

**Deve retornar:**
```json
{"message":"LauncherPro API está rodando!"}
```

✅ Se apareceu isso = Backend online!

---

### 2. Iniciar o Frontend Local

**Opção A: Script Automático (Recomendado)**
```powershell
.\ABRIR-APP.ps1
```

**Opção B: Manual**
```powershell
cd frontend
npm run preview
```

Aguarde a mensagem:
```
➜  Local:   http://localhost:4173/
```

---

### 3. Abrir o App no Navegador

Acesse:
```
http://localhost:4173
```

---

### 4. Fazer Login

Use as credenciais do admin:
- **Email**: `cursorsemanal@gmail.com`
- **Senha**: `Senha123`

---

### 5. Testar Funcionalidades

#### ✅ Teste 1: Ver Jogos
- Após login, você deve ver os jogos
- Se o banco da nuvem tiver jogos, eles aparecerão

#### ✅ Teste 2: Painel Admin
- Clique no botão **"Admin"** no topo
- Deve abrir o painel administrativo
- Você verá a lista de usuários

#### ✅ Teste 3: Criar Cliente
- No painel admin, clique em **"Novo Cliente"**
- Preencha:
  - Nome: `Cliente Teste`
  - Email: `teste@teste.com`
  - Senha: `Teste123`
  - Dias: `30`
- Clique em **"Salvar"**
- ✅ Cliente deve aparecer na lista

#### ✅ Teste 4: Verificar Persistência
- Faça logout
- Faça login novamente
- Vá no painel admin
- ✅ O cliente criado deve ainda estar lá (salvo na nuvem!)

#### ✅ Teste 5: Editar Cliente
- No painel admin, clique no ícone de **editar** do cliente
- Altere o nome ou adicione dias
- Salve
- ✅ Modificação deve ser salva na nuvem

---

## 🔍 Verificar Conexão com a Nuvem

### Abrir DevTools (F12)

1. No navegador, pressione **F12**
2. Vá na aba **Network** (Rede)
3. Faça login ou qualquer ação
4. Você verá requisições para:
   ```
   https://launcherpro.onrender.com/api/...
   ```

✅ Se aparecer requisições para `launcherpro.onrender.com` = Conectado à nuvem!

---

## 🧪 Testes Avançados

### Teste 1: Verificar Quantos Jogos Tem na Nuvem

Execute no PowerShell:
```powershell
$token = (Invoke-WebRequest -Uri "https://launcherpro.onrender.com/api/auth/login" -Method POST -Body (@{email='cursorsemanal@gmail.com';senha='Senha123'} | ConvertTo-Json) -ContentType "application/json" -UseBasicParsing | ConvertFrom-Json).token
$headers = @{Authorization="Bearer $token"}
$jogos = Invoke-WebRequest -Uri "https://launcherpro.onrender.com/api/jogos" -Headers $headers -UseBasicParsing | ConvertFrom-Json
Write-Host "Total de jogos na nuvem: $($jogos.Count)"
```

### Teste 2: Verificar Usuários na Nuvem

```powershell
$usuarios = Invoke-WebRequest -Uri "https://launcherpro.onrender.com/api/admin/usuarios" -Headers $headers -UseBasicParsing | ConvertFrom-Json
Write-Host "Total de usuarios na nuvem: $($usuarios.Count)"
$usuarios | ForEach-Object { Write-Host "- $($_.nome) ($($_.email))" }
```

---

## ✅ Checklist de Testes

Marque conforme testar:

- [ ] Backend responde em `https://launcherpro.onrender.com/`
- [ ] Frontend abre em `http://localhost:4173`
- [ ] Login funciona com credenciais do admin
- [ ] Jogos aparecem na tela inicial
- [ ] Painel admin abre corretamente
- [ ] Criar cliente funciona
- [ ] Cliente criado aparece na lista
- [ ] Logout e login novamente mantém dados
- [ ] Editar cliente funciona
- [ ] Modificações são salvas

---

## 🐛 Problemas Comuns

### ❌ "Erro ao conectar ao servidor"

**Solução:**
1. Verifique se o backend está online: `https://launcherpro.onrender.com/`
2. Verifique o arquivo `frontend/.env.production`:
   ```
   VITE_API_URL=https://launcherpro.onrender.com
   ```
3. Faça rebuild do frontend:
   ```powershell
   .\build-frontend.ps1 -BackendUrl https://launcherpro.onrender.com
   ```

### ❌ "401 Não autorizado"

**Solução:**
- Faça login novamente
- Verifique se as credenciais estão corretas
- Limpe o cache do navegador (Ctrl+Shift+Delete)

### ❌ "Jogos não aparecem"

**Solução:**
- O banco da nuvem pode estar vazio
- Os 1.362 jogos serão importados na próxima inicialização do banco
- Ou faça sincronização manual

---

## 📊 Resumo

**Para testar o app com servidor da nuvem:**

1. ✅ Backend já está online: `https://launcherpro.onrender.com`
2. ✅ Frontend já está configurado para conectar na nuvem
3. ✅ Execute: `.\ABRIR-APP.ps1`
4. ✅ Acesse: `http://localhost:4173`
5. ✅ Faça login e teste!

**Tudo está pronto para testar!** 🚀

