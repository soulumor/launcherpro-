# 🚀 Guia de Deploy - LauncherPro

Este guia vai te ajudar a fazer o upload e deploy da aplicação LauncherPro.

## 📋 Pré-requisitos

Antes de começar, você precisa:

1. **Conta em um serviço de hospedagem** (exemplos):
   - **Backend**: Render, Railway, Heroku, DigitalOcean, AWS, etc.
   - **Frontend**: Vercel, Netlify, GitHub Pages, ou servidor próprio

2. **Ferramentas instaladas**:
   - Git (para versionamento)
   - Node.js e npm (já instalados)

3. **Informações necessárias**:
   - URL onde o backend será hospedado
   - URL onde o frontend será hospedado

---

## 🎯 ESTRATÉGIA DE DEPLOY

### Opção 1: Deploy Completo (Recomendado)
- Backend hospedado em um serviço (Render, Railway, etc.)
- Frontend hospedado em outro serviço (Vercel, Netlify, etc.)

### Opção 2: Deploy Híbrido
- Backend hospedado em um serviço
- Frontend distribuído localmente (pasta `dist`)

---

## 📦 PASSO 1: Preparar o Projeto

### 1.1 Verificar arquivos importantes

Certifique-se de que estes arquivos existem:
- ✅ `backend/server.js`
- ✅ `backend/package.json`
- ✅ `frontend/package.json`
- ✅ `backend/database/database.js`
- ✅ `.gitignore`

### 1.2 Limpar arquivos desnecessários

Execute no terminal:

```powershell
# Remover node_modules e arquivos temporários (opcional, para reduzir tamanho)
# Não execute se não tiver certeza - você precisará reinstalar depois
```

---

## 🔧 PASSO 2: Configurar Variáveis de Ambiente

### 2.1 Backend - Criar arquivo `.env`

Crie um arquivo `.env` na pasta `backend/`:

```env
# OBRIGATÓRIO: Gere uma chave secreta segura
JWT_SECRET=SUA_CHAVE_SECRETA_AQUI_64_CARACTERES_OU_MAIS

# OPCIONAL: Porta do servidor (padrão: 3001)
PORT=3001

# OPCIONAL: URL do frontend para CORS (em produção, defina a URL real)
CORS_ORIGIN=https://seu-frontend.com

# OPCIONAL: Ambiente
NODE_ENV=production
```

**⚠️ IMPORTANTE**: Para gerar um `JWT_SECRET` seguro, execute:

```powershell
cd backend
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copie o resultado e cole no `.env` como `JWT_SECRET`.

### 2.2 Frontend - Criar arquivo `.env`

Crie um arquivo `.env` na pasta `frontend/`:

```env
# URL do backend hospedado (substitua pela URL real do seu backend)
VITE_API_URL=https://seu-backend.onrender.com
```

**⚠️ IMPORTANTE**: 
- Em desenvolvimento local, deixe vazio ou use `http://localhost:3001`
- Em produção, use a URL completa do backend (ex: `https://launcherpro-backend.onrender.com`)

---

## 🗄️ PASSO 3: Preparar Banco de Dados

### 3.1 Backup do banco atual

O banco de dados SQLite está em `backend/database/launcherpro.db`.

**IMPORTANTE**: Faça backup antes do deploy:

```powershell
# Copiar o banco de dados
Copy-Item backend\database\launcherpro.db backend\database\launcherpro.db.backup
```

### 3.2 Incluir banco no deploy

Alguns serviços criam o banco automaticamente. Outros precisam que você faça upload.

**Opções**:
1. **Incluir o banco no repositório** (não recomendado para produção, mas funciona)
2. **Criar script de inicialização** que cria o banco se não existir (já existe em `database.js`)
3. **Fazer upload manual após o deploy**

---

## 🌐 PASSO 4: Deploy do Backend

### Opção A: Render.com (Recomendado - Grátis)

1. **Criar conta em** https://render.com

2. **Criar novo Web Service**:
   - Conecte seu repositório Git (GitHub/GitLab)
   - Ou faça upload manual

3. **Configurações**:
   - **Name**: `launcherpro-backend`
   - **Environment**: `Node`
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`
   - **Root Directory**: `backend` (ou deixe vazio se a raiz for o backend)

4. **Variáveis de Ambiente** (Environment Variables):
   ```
   JWT_SECRET=sua-chave-secreta-aqui
   PORT=3001
   NODE_ENV=production
   CORS_ORIGIN=https://seu-frontend.com
   ```

5. **Deploy**: Clique em "Create Web Service"

6. **Aguardar**: O deploy pode levar 5-10 minutos

7. **URL do Backend**: Anote a URL gerada (ex: `https://launcherpro-backend.onrender.com`)

### Opção B: Railway.app

1. **Criar conta em** https://railway.app

2. **New Project** → **Deploy from GitHub repo**

3. **Configurações**:
   - **Root Directory**: `backend`
   - **Start Command**: `npm start`

4. **Variáveis de Ambiente**: Adicione as mesmas do Render

5. **Deploy**: Automático após push

### Opção C: Heroku

1. **Instalar Heroku CLI**

2. **Login**:
   ```powershell
   heroku login
   ```

3. **Criar app**:
   ```powershell
   cd backend
   heroku create launcherpro-backend
   ```

4. **Configurar variáveis**:
   ```powershell
   heroku config:set JWT_SECRET=sua-chave-secreta
   heroku config:set NODE_ENV=production
   heroku config:set CORS_ORIGIN=https://seu-frontend.com
   ```

5. **Deploy**:
   ```powershell
   git push heroku main
   ```

---

## 🎨 PASSO 5: Deploy do Frontend

### Opção A: Vercel (Recomendado - Grátis)

1. **Criar conta em** https://vercel.com

2. **Import Project**:
   - Conecte seu repositório Git
   - Ou faça upload da pasta `frontend`

3. **Configurações**:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

4. **Variáveis de Ambiente**:
   ```
   VITE_API_URL=https://seu-backend.onrender.com
   ```

5. **Deploy**: Clique em "Deploy"

6. **URL do Frontend**: Anote a URL gerada

### Opção B: Netlify

1. **Criar conta em** https://netlify.com

2. **Add new site** → **Import an existing project**

3. **Configurações**:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist`

4. **Variáveis de Ambiente**: Adicione `VITE_API_URL`

5. **Deploy**: Automático

### Opção C: Build Local + Distribuição

Se preferir distribuir o frontend localmente:

1. **Atualizar `.env` do frontend** com a URL do backend

2. **Fazer build**:
   ```powershell
   cd frontend
   npm run build
   ```

3. **Pasta `dist`** será criada com os arquivos estáticos

4. **Distribuir a pasta `dist`** para os clientes

5. **Os clientes podem abrir** `dist/index.html` no navegador

---

## ✅ PASSO 6: Verificar Deploy

### 6.1 Testar Backend

1. **Acesse**: `https://seu-backend.onrender.com/`
2. **Deve retornar**: `{"message":"LauncherPro API está rodando!"}`

3. **Testar login**:
   ```powershell
   # Usando curl ou Postman
   curl -X POST https://seu-backend.onrender.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@launcherpro.com","senha":"admin123"}'
   ```

### 6.2 Testar Frontend

1. **Acesse a URL do frontend**
2. **Tente fazer login**
3. **Verifique se consegue acessar os jogos**

### 6.3 Verificar Logs

- **Render**: Dashboard → Logs
- **Vercel**: Dashboard → Deployments → View Function Logs
- **Railway**: Dashboard → Deployments → View Logs

---

## 🔐 PASSO 7: Configurações de Segurança

### 7.1 Atualizar CORS

Após ter a URL do frontend, atualize a variável `CORS_ORIGIN` no backend:

```env
CORS_ORIGIN=https://seu-frontend.vercel.app
```

### 7.2 Verificar JWT_SECRET

Certifique-se de que `JWT_SECRET` está configurado e é seguro (não use o valor padrão).

### 7.3 Criar Primeiro Admin

Após o deploy, crie o primeiro admin:

```powershell
# Se tiver acesso SSH ao servidor
cd backend
node scripts/criarAdmin.js "Seu Nome" admin@exemplo.com senhaSegura123
```

Ou execute localmente e depois faça upload do banco atualizado.

---

## 🐛 PASSO 8: Resolução de Problemas

### Problema: Backend não inicia

**Solução**:
- Verifique os logs do serviço
- Confirme que `JWT_SECRET` está configurado
- Verifique se a porta está correta
- Confirme que todas as dependências foram instaladas

### Problema: Frontend não conecta ao backend

**Solução**:
- Verifique se `VITE_API_URL` está correto no `.env` do frontend
- Confirme que o backend está rodando
- Verifique CORS no backend
- Teste a URL do backend diretamente no navegador

### Problema: Erro 500 no login

**Solução**:
- Verifique logs do backend
- Confirme que o banco de dados existe
- Verifique se há usuários no banco
- Teste criar um admin primeiro

### Problema: Banco de dados não encontrado

**Solução**:
- O banco será criado automaticamente na primeira execução
- Ou faça upload do arquivo `launcherpro.db` para o servidor
- Verifique permissões de escrita no servidor

---

## 📝 Checklist Final

Antes de considerar o deploy completo, verifique:

- [ ] Backend está rodando e acessível
- [ ] Frontend está rodando e acessível
- [ ] Login funciona no frontend
- [ ] JWT_SECRET está configurado e seguro
- [ ] CORS_ORIGIN está configurado corretamente
- [ ] Primeiro admin foi criado
- [ ] Banco de dados está funcionando
- [ ] Logs não mostram erros críticos
- [ ] Variáveis de ambiente estão configuradas

---

## 🎉 Pronto!

Seu LauncherPro está no ar! 

**Próximos passos**:
1. Criar usuários através do painel admin
2. Configurar mensalidades
3. Distribuir acesso aos clientes

---

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs do serviço de hospedagem
2. Confirme todas as variáveis de ambiente
3. Teste cada endpoint individualmente
4. Verifique a documentação do serviço de hospedagem

