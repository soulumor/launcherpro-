# ⚡ Deploy Rápido - Passo a Passo Resumido

## 🎯 Deploy em 5 Passos

### 1️⃣ Preparar Variáveis de Ambiente

**Backend** (`backend/.env`):
```env
JWT_SECRET=GERE_UMA_CHAVE_SECRETA_AQUI
PORT=3001
NODE_ENV=production
CORS_ORIGIN=https://seu-frontend.com
```

**Frontend** (`frontend/.env`):
```env
VITE_API_URL=https://seu-backend.onrender.com
```

### 2️⃣ Deploy Backend (Render.com)

1. Acesse https://render.com
2. New → Web Service
3. Conecte repositório Git ou faça upload
4. Configurações:
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`
5. Adicione variáveis de ambiente (JWT_SECRET, PORT, etc.)
6. Deploy → Anote a URL gerada

### 3️⃣ Deploy Frontend (Vercel.com)

1. Acesse https://vercel.com
2. Import Project
3. Conecte repositório ou faça upload da pasta `frontend`
4. Configurações:
   - **Framework**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
5. Adicione variável: `VITE_API_URL` (URL do backend do passo 2)
6. Deploy → Anote a URL gerada

### 4️⃣ Atualizar CORS

No backend (Render), atualize a variável:
```
CORS_ORIGIN=https://seu-frontend.vercel.app
```

### 5️⃣ Criar Primeiro Admin

Execute localmente ou via SSH:
```powershell
cd backend
node scripts/criarAdmin.js "Admin" admin@exemplo.com senha123
```

---

## ✅ Testar

1. Acesse: `https://seu-backend.onrender.com/` → Deve retornar JSON
2. Acesse: `https://seu-frontend.vercel.app` → Deve abrir o app
3. Faça login com as credenciais do admin criado

---

## 🐛 Problemas Comuns

**Backend não inicia?**
- Verifique JWT_SECRET está configurado
- Veja os logs no dashboard do Render

**Frontend não conecta?**
- Confirme VITE_API_URL está correto
- Verifique CORS_ORIGIN no backend

**Erro 500?**
- Verifique se o banco de dados existe
- Crie um admin primeiro

---

📖 **Guia completo**: Veja `DEPLOY.md` para detalhes

