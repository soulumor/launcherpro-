# 🔧 Solução: Login Incorreto

## 🔍 Diagnóstico Rápido

Execute este script para diagnosticar o problema:

```powershell
.\diagnosticar-login.ps1
```

Este script vai:
- ✅ Verificar se o backend está online
- ✅ Testar credenciais comuns
- ✅ Mostrar qual backend está configurado (local ou nuvem)
- ✅ Indicar se precisa criar um admin

---

## ❌ Problema: "Email ou senha incorretos"

### Possíveis Causas:

1. **Admin não foi criado ainda**
2. **Credenciais erradas**
3. **Backend não está rodando** (se for local)
4. **Banco de dados vazio ou corrompido**

---

## ✅ Soluções

### Solução 1: Verificar Qual Backend Você Está Usando

**Verifique o arquivo:** `frontend/.env.production`

**Se contém:**
```
VITE_API_URL=https://launcherpro.onrender.com
```
→ Você está usando **BACKEND NA NUVEM**

**Se não existe ou contém:**
```
VITE_API_URL=http://localhost:3001
```
→ Você está usando **BACKEND LOCAL**

---

### Solução 2: Criar Admin (Backend Local)

Se você está usando backend local:

1. **Certifique-se que o backend está rodando:**
   ```powershell
   .\iniciar-servidor.ps1
   ```

2. **Criar admin:**
   ```powershell
   .\criar-admin.ps1
   ```

3. **Siga as instruções na tela:**
   - Digite o nome do admin
   - Digite o email
   - Digite a senha

4. **Use as credenciais criadas para fazer login**

---

### Solução 3: Criar Admin (Backend na Nuvem)

Se você está usando backend na nuvem (`https://launcherpro.onrender.com`):

#### Opção A: Via Render Shell (Recomendado)

1. Acesse: https://dashboard.render.com
2. Clique no seu serviço "launcherpro"
3. Clique em **"Shell"** (no menu lateral)
4. Execute:
   ```bash
   node scripts/criarAdmin.js "Admin" "cursorsemanal@gmail.com" "12345"
   ```
5. Aguarde a confirmação
6. Use as credenciais para fazer login

#### Opção B: Via Script Local (se tiver acesso)

1. Certifique-se que o backend na nuvem está online
2. Execute:
   ```powershell
   node criar-admin-render.js
   ```
   (Nota: Este script tenta criar via API, mas pode não funcionar se a rota de registro requer autenticação)

---

### Solução 4: Verificar Credenciais Existentes

Se você já criou um admin antes, tente estas credenciais comuns:

**Backend Local:**
- Email: `admin@launcherpro.com`
- Senha: `admin123`

**Backend na Nuvem:**
- Email: `cursorsemanal@gmail.com`
- Senha: `12345` ou `Senha123`

---

### Solução 5: Resetar Senha de Admin Existente

Se o admin existe mas você esqueceu a senha:

#### Para Backend Local:

1. Pare o servidor (Ctrl+C)
2. Execute:
   ```powershell
   cd backend
   node scripts/criarAdmin.js "Admin" "seu-email@exemplo.com" "nova-senha"
   ```
   (Se o email já existe, o script não vai criar, mas você pode editar o banco diretamente)

3. Ou edite o banco SQLite diretamente:
   ```powershell
   # Instalar ferramenta SQLite (se não tiver)
   # Baixe: https://sqlitebrowser.org/
   
   # Abra: backend/database/launcherpro.db
   # Vá na tabela "usuarios"
   # Encontre o admin
   # Gere um novo hash de senha (use bcrypt)
   ```

#### Para Backend na Nuvem:

1. Acesse Render Shell
2. Execute script para resetar senha (se tiver)
3. Ou crie um novo admin com email diferente

---

## 🧪 Testar Login Manualmente

### Via PowerShell (Backend Local):

```powershell
$body = @{
    email = "admin@launcherpro.com"
    senha = "admin123"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:3001/api/auth/login" `
    -Method POST `
    -Body $body `
    -ContentType "application/json" `
    -UseBasicParsing

$response.Content
```

### Via PowerShell (Backend Nuvem):

```powershell
$body = @{
    email = "cursorsemanal@gmail.com"
    senha = "12345"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "https://launcherpro.onrender.com/api/auth/login" `
    -Method POST `
    -Body $body `
    -ContentType "application/json" `
    -UseBasicParsing

$response.Content
```

**Se retornar um token** = Login funciona! ✅
**Se retornar erro 401** = Credenciais incorretas ❌

---

## 📋 Checklist de Verificação

Marque conforme verificar:

### Backend
- [ ] Backend está rodando (local ou nuvem)
- [ ] Backend responde em `/` (rota raiz)
- [ ] Banco de dados existe e está acessível

### Admin
- [ ] Admin foi criado no banco
- [ ] Email do admin está correto
- [ ] Senha do admin está correta
- [ ] Admin está ativo (`ativo = 1`)

### Frontend
- [ ] Frontend está configurado com URL correta do backend
- [ ] Frontend está rodando
- [ ] Não há erros no console (F12)

### Credenciais
- [ ] Email está correto (sem espaços, formato válido)
- [ ] Senha está correta (case-sensitive)
- [ ] Não está usando credenciais de outro ambiente

---

## 🔍 Verificar Logs

### Backend Local:

Os logs aparecem no terminal onde o servidor está rodando. Procure por:
- `Erro ao buscar usuário`
- `Email ou senha incorretos`
- `Conta desativada`

### Backend Nuvem:

1. Acesse: https://dashboard.render.com
2. Vá no serviço "launcherpro"
3. Clique em **"Logs"**
4. Procure por erros de autenticação

---

## 🚨 Problemas Comuns

### "Erro ao conectar ao servidor"

**Causa:** Backend não está rodando ou URL incorreta

**Solução:**
- Se local: Inicie com `.\iniciar-servidor.ps1`
- Se nuvem: Verifique se está online em `https://launcherpro.onrender.com/`

---

### "401 Não autorizado" (mesmo com credenciais corretas)

**Causa:** Token expirado ou cache do navegador

**Solução:**
1. Limpe o cache do navegador (Ctrl+Shift+Delete)
2. Feche e abra o navegador novamente
3. Tente fazer login novamente

---

### "Conta desativada"

**Causa:** Admin foi desativado no banco

**Solução:**
1. Acesse o banco de dados
2. Vá na tabela `usuarios`
3. Encontre o admin
4. Altere `ativo` para `1`

---

## ✅ Resumo Rápido

**Para resolver login incorreto:**

1. ✅ Execute: `.\diagnosticar-login.ps1`
2. ✅ Siga as instruções do diagnóstico
3. ✅ Crie admin se necessário
4. ✅ Use as credenciais corretas
5. ✅ Verifique se backend está online

---

## 📞 Próximos Passos

Após resolver:

1. ✅ Faça login com sucesso
2. ✅ Teste criar um cliente no painel admin
3. ✅ Verifique se os dados persistem
4. ✅ Anote as credenciais em local seguro

---

**Boa sorte! 🚀**


