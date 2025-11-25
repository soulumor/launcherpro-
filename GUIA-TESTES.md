# 🧪 Guia Completo de Testes - LauncherPro

## 📋 Índice

1. [Teste Rápido (Backend na Nuvem)](#teste-rápido-backend-na-nuvem)
2. [Teste Completo Local](#teste-completo-local)
3. [Testes de Funcionalidades](#testes-de-funcionalidades)
4. [Verificação de Conexão](#verificação-de-conexão)
5. [Troubleshooting](#troubleshooting)

---

## 🚀 Teste Rápido (Backend na Nuvem)

### Pré-requisitos
- ✅ Backend já está online: `https://launcherpro.onrender.com`
- ✅ Frontend já está buildado (`frontend/dist/` existe)

### Passo 1: Verificar Backend Online

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

### Passo 2: Iniciar Frontend

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

### Passo 3: Acessar o App

Abra no navegador:
```
http://localhost:4173
```

---

### Passo 4: Fazer Login

**Credenciais do Admin:**
- **Email**: `cursorsemanal@gmail.com`
- **Senha**: `12345` (ou a senha configurada)

**OU criar novo admin:**
```powershell
node criar-admin-render.js
```

---

## 🖥️ Teste Completo Local

### Pré-requisitos
- Node.js instalado
- NPM instalado
- Dependências instaladas

### Passo 1: Instalar Dependências (se necessário)

**Backend:**
```powershell
cd backend
npm install
```

**Frontend:**
```powershell
cd frontend
npm install
```

---

### Passo 2: Iniciar Backend Local

**Opção A: Script Automático**
```powershell
.\iniciar-servidor.ps1
```

**Opção B: Manual**
```powershell
cd backend
node server.js
```

**Deve aparecer:**
```
🚀 Servidor rodando na porta 3001
📡 API disponível em http://localhost:3001
```

---

### Passo 3: Iniciar Frontend Local

**Em outra janela do PowerShell:**

**Opção A: Script Automático**
```powershell
.\iniciar-servidores.ps1
```

**Opção B: Manual**
```powershell
cd frontend
npm run dev
```

**Deve aparecer:**
```
➜  Local:   http://localhost:3000/
```

---

### Passo 4: Criar Admin Local

```powershell
.\criar-admin.ps1
```

Ou execute:
```powershell
cd backend
node scripts/criarAdmin.js "Admin" "admin@teste.com" "senha123"
```

---

### Passo 5: Testar

1. Acesse: `http://localhost:3000`
2. Faça login com as credenciais criadas
3. Teste as funcionalidades

---

## ✅ Testes de Funcionalidades

### Teste 1: Autenticação

**Objetivo:** Verificar se login/logout funcionam

**Passos:**
1. Acesse a tela de login
2. Digite email e senha incorretos → Deve mostrar erro
3. Digite credenciais corretas → Deve fazer login
4. Clique em logout → Deve voltar para tela de login

**Resultado esperado:**
- ✅ Login funciona
- ✅ Logout funciona
- ✅ Erros são exibidos corretamente

---

### Teste 2: Visualização de Jogos

**Objetivo:** Verificar se os jogos aparecem corretamente

**Passos:**
1. Após login, verifique se há jogos na tela
2. Se não houver jogos, adicione um manualmente:
   - Vá no painel admin
   - Ou use a API diretamente

**Resultado esperado:**
- ✅ Grid de jogos aparece
- ✅ Cards mostram nome, capa e preço
- ✅ Contador de jogos está correto

---

### Teste 3: Busca de Jogos

**Objetivo:** Verificar se a busca funciona

**Passos:**
1. Digite um termo na barra de busca
2. Verifique se os resultados aparecem
3. Clique em um resultado → Deve fazer scroll até o jogo

**Resultado esperado:**
- ✅ Busca retorna resultados
- ✅ Scroll automático funciona
- ✅ Destaque visual no jogo encontrado

---

### Teste 4: Modal de Jogo

**Objetivo:** Verificar detalhes do jogo

**Passos:**
1. Clique em um card de jogo
2. Verifique se o modal abre
3. Verifique se mostra:
   - Nome do jogo
   - Descrição
   - Preço
   - Lista de contas disponíveis

**Resultado esperado:**
- ✅ Modal abre corretamente
- ✅ Informações estão corretas
- ✅ Contas são listadas

---

### Teste 5: Sincronização de Jogo

**Objetivo:** Verificar se a sincronização busca novas contas

**Passos:**
1. Abra o modal de um jogo
2. Clique no botão "🔄 Sincronizar"
3. Aguarde o processo (pode demorar alguns minutos)
4. Verifique o resultado no modal

**Resultado esperado:**
- ✅ Sincronização inicia
- ✅ Mostra progresso
- ✅ Exibe resultado (contas adicionadas)
- ✅ Atualiza lista de contas

---

### Teste 6: Painel Administrativo

**Objetivo:** Verificar funcionalidades do admin

**Passos:**
1. Faça login como admin
2. Clique no botão "Admin" no header
3. Verifique se abre o painel admin

**Funcionalidades para testar:**

#### 6.1: Listar Usuários
- ✅ Lista de usuários aparece
- ✅ Mostra nome, email, tipo, status

#### 6.2: Criar Cliente
1. Clique em "Novo Cliente"
2. Preencha:
   - Nome: `Cliente Teste`
   - Email: `teste@teste.com`
   - Senha: `Teste123`
   - Dias: `30`
3. Clique em "Salvar"
4. Verifique se aparece na lista

**Resultado esperado:**
- ✅ Cliente criado com sucesso
- ✅ Aparece na lista
- ✅ Tipo é "cliente"

#### 6.3: Editar Cliente
1. Clique no ícone de editar de um cliente
2. Altere o nome ou adicione dias
3. Salve
4. Verifique se a alteração foi salva

**Resultado esperado:**
- ✅ Edição funciona
- ✅ Alterações são salvas
- ✅ Atualiza na lista

#### 6.4: Ativar/Desativar Cliente
1. Clique no ícone de ativar/desativar
2. Verifique se o status muda
3. Tente fazer login com esse cliente → Deve ser bloqueado se desativado

**Resultado esperado:**
- ✅ Status muda corretamente
- ✅ Cliente desativado não consegue fazer login

#### 6.5: Adicionar Dias
1. Clique no ícone de adicionar dias
2. Digite quantidade de dias
3. Salve
4. Verifique se a data de vencimento foi atualizada

**Resultado esperado:**
- ✅ Dias são adicionados
- ✅ Data de vencimento atualiza

---

### Teste 7: Biblioteca Pessoal

**Objetivo:** Verificar se usuários podem adicionar jogos à biblioteca

**Passos:**
1. Faça login como cliente (não admin)
2. Clique em um jogo
3. Adicione uma conta à biblioteca
4. Clique no ícone de biblioteca no header
5. Verifique se o jogo aparece

**Resultado esperado:**
- ✅ Jogo é adicionado à biblioteca
- ✅ Aparece no modal de biblioteca
- ✅ Pode remover da biblioteca

---

### Teste 8: Verificação de Contas

**Objetivo:** Verificar se o sistema testa contas Steam

**Passos:**
1. No modal de jogo, veja a lista de contas
2. Clique em "Testar" em uma conta
3. Aguarde o resultado

**Resultado esperado:**
- ✅ Teste é executado
- ✅ Status da conta é atualizado
- ✅ Mostra se a conta está funcionando ou não

---

## 🔍 Verificação de Conexão

### Verificar se Frontend Conecta na Nuvem

1. Abra o app em `http://localhost:4173`
2. Pressione **F12** (DevTools)
3. Vá na aba **Network** (Rede)
4. Faça login ou qualquer ação
5. Procure por requisições para:
   ```
   https://launcherpro.onrender.com/api/...
   ```

**Resultado esperado:**
- ✅ Requisições aparecem para `launcherpro.onrender.com`
- ✅ Status 200 (sucesso) ou 401 (não autorizado)
- ✅ Respostas JSON são recebidas

---

### Verificar Backend Local

Execute no PowerShell:
```powershell
.\testar-app.ps1
```

**Deve mostrar:**
- ✅ Backend respondendo em `http://localhost:3001`
- ✅ Frontend respondendo em `http://localhost:3000`

---

## 🧪 Testes Avançados via API

### Teste 1: Verificar Quantos Jogos Tem

```powershell
# Fazer login e obter token
$loginBody = @{
    email = "cursorsemanal@gmail.com"
    senha = "12345"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "https://launcherpro.onrender.com/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $loginResponse.token

# Buscar jogos
$headers = @{
    Authorization = "Bearer $token"
}
$jogos = Invoke-RestMethod -Uri "https://launcherpro.onrender.com/api/jogos" -Headers $headers

Write-Host "Total de jogos: $($jogos.Count)"
```

---

### Teste 2: Verificar Usuários

```powershell
$usuarios = Invoke-RestMethod -Uri "https://launcherpro.onrender.com/api/admin/usuarios" -Headers $headers
Write-Host "Total de usuarios: $($usuarios.Count)"
$usuarios | ForEach-Object { Write-Host "- $($_.nome) ($($_.email)) - Tipo: $($_.tipo)" }
```

---

### Teste 3: Criar Jogo via API

```powershell
$jogoBody = @{
    nome = "Jogo Teste"
    descricao = "Descrição do jogo teste"
    preco = 29.90
} | ConvertTo-Json

$jogo = Invoke-RestMethod -Uri "https://launcherpro.onrender.com/api/jogos" -Method POST -Body $jogoBody -ContentType "application/json" -Headers $headers
Write-Host "Jogo criado: $($jogo.nome) - ID: $($jogo.id)"
```

---

## 🐛 Troubleshooting

### ❌ "Erro ao conectar ao servidor"

**Solução:**
1. Verifique se o backend está online:
   ```
   https://launcherpro.onrender.com/
   ```
2. Verifique o arquivo `frontend/.env.production`:
   ```
   VITE_API_URL=https://launcherpro.onrender.com
   ```
3. Faça rebuild do frontend:
   ```powershell
   .\build-frontend.ps1 -BackendUrl https://launcherpro.onrender.com
   ```

---

### ❌ "401 Não autorizado"

**Solução:**
- Faça login novamente
- Verifique se as credenciais estão corretas
- Limpe o cache do navegador (Ctrl+Shift+Delete)
- Verifique se o token JWT não expirou (válido por 7 dias)

---

### ❌ "Jogos não aparecem"

**Solução:**
- O banco pode estar vazio
- Adicione jogos manualmente via painel admin
- Ou execute sincronização completa:
  ```powershell
  cd backend
  node scripts/sincronizacaoGeral.js
  ```

---

### ❌ "Frontend não inicia"

**Solução:**
1. Verifique se a pasta `frontend/dist` existe
2. Se não existir, faça build:
   ```powershell
   cd frontend
   npm run build
   ```
3. Depois execute preview:
   ```powershell
   npm run preview
   ```

---

### ❌ "Backend não inicia"

**Solução:**
1. Verifique se a porta 3001 está livre:
   ```powershell
   netstat -ano | findstr :3001
   ```
2. Verifique se o banco de dados existe:
   ```
   backend/database/launcherpro.db
   ```
3. Verifique os logs do servidor para erros

---

### ❌ "Sincronização demora muito"

**Solução:**
- É normal! O scraper precisa:
  - Fazer requisições ao pokopow.com
  - Aguardar delays para evitar bloqueios
  - Processar HTML
- Uma sincronização pode levar 1-5 minutos por jogo
- Use sincronização individual (por jogo) em vez de geral

---

## ✅ Checklist de Testes

Marque conforme testar:

### Autenticação
- [ ] Login funciona
- [ ] Logout funciona
- [ ] Erros de login são exibidos
- [ ] Token JWT é salvo corretamente

### Interface
- [ ] Jogos aparecem no grid
- [ ] Busca funciona
- [ ] Modal de jogo abre
- [ ] Contas são listadas

### Funcionalidades
- [ ] Sincronização funciona
- [ ] Biblioteca funciona
- [ ] Painel admin abre
- [ ] Criar cliente funciona
- [ ] Editar cliente funciona

### Persistência
- [ ] Dados são salvos
- [ ] Logout e login mantém dados
- [ ] Alterações persistem

---

## 📊 Resumo Rápido

**Para testar rapidamente:**

1. ✅ Backend online: `https://launcherpro.onrender.com/`
2. ✅ Execute: `.\ABRIR-APP.ps1`
3. ✅ Acesse: `http://localhost:4173`
4. ✅ Faça login e teste!

**Para testar localmente:**

1. ✅ Backend: `.\iniciar-servidor.ps1`
2. ✅ Frontend: `cd frontend && npm run dev`
3. ✅ Acesse: `http://localhost:3000`
4. ✅ Crie admin: `.\criar-admin.ps1`

---

## 🎯 Próximos Passos

Após testar tudo:
1. ✅ Verifique se todas as funcionalidades estão funcionando
2. ✅ Teste com diferentes tipos de usuário (admin e cliente)
3. ✅ Verifique se os dados persistem
4. ✅ Teste em diferentes navegadores
5. ✅ Verifique performance e velocidade

---

**Boa sorte com os testes! 🚀**











