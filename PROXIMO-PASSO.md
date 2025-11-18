# ✅ Código no GitHub - Próximo Passo

## ✅ O que já está feito:

1. ✅ Código enviado para GitHub: https://github.com/soulumor/launcherpro-
2. ✅ JWT_SECRET gerado e salvo em `DEPLOY_CONFIG.md`
3. ✅ Scripts de deploy criados

## 📋 PRÓXIMO PASSO: Deploy no Render.com

### PASSO 1: Criar Conta no Render

1. Acesse: **https://render.com**
2. Clique em **"Get Started for Free"**
3. Faça login com **GitHub** (mesmo usuário do seu repositório)
4. Autorize o Render a acessar seus repositórios

### PASSO 2: Criar Web Service

1. No dashboard do Render, clique em **"New +"** (canto superior direito)
2. Selecione **"Web Service"**
3. Selecione seu repositório: **`launcherpro-`**
4. Clique em **"Connect"**

### PASSO 3: Configurar o Serviço

Preencha os campos assim:

| Campo | Valor |
|-------|-------|
| **Name** | `launcherpro-backend` |
| **Environment** | `Node` |
| **Region** | Escolha o mais próximo (ex: `Frankfurt` ou `Oregon`) |
| **Branch** | `main` |
| **Root Directory** | `backend` ⚠️ **MUITO IMPORTANTE!** |
| **Runtime** | `Node` |
| **Build Command** | `npm install` (ou deixe vazio - Render faz automaticamente) |
| **Start Command** | `npm start` |

### PASSO 4: Configurar Variáveis de Ambiente

Antes de clicar em "Create Web Service", vá em **"Advanced"** → **"Add Environment Variable"**

Adicione estas 4 variáveis (uma por uma):

| Key | Value |
|-----|-------|
| `JWT_SECRET` | `88842af29e7a187c6d141713a8d582899ce0ff5b71785317fb050dfb4cf0269e` |
| `PORT` | `3001` |
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | `*` |

**⚠️ IMPORTANTE**: Cole exatamente os valores acima (o JWT_SECRET está em `DEPLOY_CONFIG.md`)

### PASSO 5: Criar e Aguardar Deploy

1. Clique em **"Create Web Service"**
2. Aguarde o build (3-5 minutos)
3. Acompanhe os logs na tela
4. Quando terminar, você verá a URL do backend (ex: `https://launcherpro-backend.onrender.com`)
5. **ANOTE ESSA URL!** Você vai precisar dela para configurar o frontend

### PASSO 6: Testar o Backend

Abra a URL gerada no navegador (ex: `https://launcherpro-backend.onrender.com/`)

Deve retornar:
```json
{"message":"LauncherPro API está rodando!"}
```

## 🎯 Depois do Deploy:

Quando o backend estiver online e você tiver a URL, me avise e eu:
- ✅ Configuro o frontend com a URL do backend
- ✅ Faço o build do frontend
- ✅ Crio o primeiro admin

---

## 📝 Resumo:

**Agora você precisa:**
1. Criar conta no Render.com
2. Conectar o repositório GitHub
3. Configurar o Web Service (Root Directory = `backend`)
4. Adicionar as 4 variáveis de ambiente
5. Fazer deploy
6. **Me passar a URL gerada**

**Depois disso, eu faço o resto! 🚀**

