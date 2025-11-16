# 🚀 Início Rápido - LauncherPro Deploy

## ✅ O que já está pronto:

1. ✅ JWT_SECRET gerado (veja DEPLOY_CONFIG.md)
2. ✅ Scripts de preparação criados
3. ✅ Dependências verificadas
4. ✅ Scripts de build criados

## 📋 Próximos Passos (SEQUÊNCIA):

### PASSO 1: Criar Repositório no GitHub

1. Acesse: https://github.com
2. Faça login (ou crie conta)
3. Clique em "New repository"
4. Nome: `launcherpro` (ou outro)
5. Público ou Privado
6. **NÃO** marque "Initialize with README"
7. Clique em "Create repository"
8. **Copie a URL do repositório** (ex: `https://github.com/seu-usuario/launcherpro.git`)

### PASSO 2: Inicializar Git e Fazer Push

Execute no PowerShell (substitua a URL pela sua):

```powershell
.\setup-git.ps1 -GitHubUrl https://github.com/SEU-USUARIO/launcherpro.git
git push -u origin main
```

### PASSO 3: Criar Conta no Render.com

1. Acesse: https://render.com
2. Clique em "Get Started for Free"
3. Faça login com GitHub
4. Autorize o Render

### PASSO 4: Deploy no Render

1. No Render, clique em "New +" → "Web Service"
2. Selecione seu repositório `launcherpro`
3. Configure conforme DEPLOY_CONFIG.md
4. **IMPORTANTE**: Root Directory = `backend`
5. Adicione as variáveis de ambiente (veja DEPLOY_CONFIG.md)
6. Clique em "Create Web Service"
7. Aguarde o deploy (3-5 minutos)
8. **Anote a URL gerada** (ex: `https://launcherpro-backend.onrender.com`)

### PASSO 5: Configurar Frontend

Depois que o backend estiver online, execute:

```powershell
.\build-frontend.ps1 -BackendUrl https://seu-backend.onrender.com
```

(Substitua pela URL real do seu backend)

### PASSO 6: Criar Primeiro Admin

Execute:

```powershell
.\criar-admin.ps1
```

Siga as instruções na tela.

### PASSO 7: Testar

1. Abra: `frontend\dist\index.html` no navegador
2. Faça login com as credenciais do admin criado
3. Teste criar um cliente no painel admin

## 📁 Arquivos Criados:

- `DEPLOY_CONFIG.md` - Configurações do Render (JWT_SECRET, variáveis)
- `preparar-deploy.ps1` - Script para verificar pré-requisitos
- `setup-git.ps1` - Script para configurar Git e GitHub
- `build-frontend.ps1` - Script para fazer build do frontend
- `criar-admin.ps1` - Script para criar admin interativo

## ⚠️ DADOS QUE VOCÊ VAI PRECISAR:

1. **URL do repositório GitHub** (você cria no GitHub)
2. **URL do backend Render** (gerada após deploy)
3. **Credenciais do admin** (nome, email, senha)

---

## 🎯 Comece agora:

1. Crie o repositório no GitHub (PASSO 1 acima)
2. Me passe a URL do repositório e eu faço o resto!

