# 🔐 Configurações de Deploy - LauncherPro

## ✅ JWT_SECRET Gerado

**IMPORTANTE**: Guarde esta chave com segurança! Ela será usada no Render.com

```
JWT_SECRET=88842af29e7a187c6d141713a8d582899ce0ff5b71785317fb050dfb4cf0269e
```

## 📋 Variáveis de Ambiente para o Render.com

Quando criar o Web Service no Render, adicione estas variáveis:

| Key | Value | Descrição |
|-----|-------|-----------|
| `JWT_SECRET` | `88842af29e7a187c6d141713a8d582899ce0ff5b71785317fb050dfb4cf0269e` | Chave secreta JWT (obrigatório) |
| `PORT` | `3001` | Porta do servidor |
| `NODE_ENV` | `production` | Ambiente Node.js |
| `CORS_ORIGIN` | `*` | CORS permitido |
| `DISABLE_RATE_LIMITER` | `true` | (Opcional) Desabilita rate limiter para testes |

**Nota:** `DISABLE_RATE_LIMITER` é opcional. Use apenas para desenvolvimento/testes. Em produção, mantenha desabilitado (não defina a variável) para manter segurança.

## 🔧 Configurações do Render.com

**Name**: `launcherpro-backend` (ou outro nome de sua escolha)

**Environment**: `Node`

**Region**: Escolha a mais próxima do Brasil (ex: `Frankfurt`)

**Branch**: `main`

**Root Directory**: `backend` ⚠️ **MUITO IMPORTANTE**

**Build Command**: `npm install` (ou deixe vazio - Render detecta automaticamente)

**Start Command**: `npm start`

## 📝 Próximos Passos

1. Criar conta no Render.com
2. Conectar repositório GitHub
3. Configurar variáveis acima
4. Fazer deploy
5. Anotar a URL gerada (ex: https://launcherpro-backend.onrender.com)
6. Usar essa URL para configurar o frontend

