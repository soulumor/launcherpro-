# 🚫 Como Desabilitar Rate Limiter Temporariamente

## 📋 O que é o Rate Limiter?

O rate limiter protege contra ataques de força bruta bloqueando tentativas de login após 5 tentativas falhadas em 15 minutos.

## ⚙️ Como Desabilitar

### Para Servidor Local

1. **Definir variável de ambiente antes de iniciar:**
   ```powershell
   $env:DISABLE_RATE_LIMITER = "true"
   cd backend
   node server.js
   ```

2. **Ou criar um script:**
   ```powershell
   # iniciar-sem-rate-limiter.ps1
   $env:DISABLE_RATE_LIMITER = "true"
   cd backend
   node server.js
   ```

### Para Servidor na Nuvem (Render.com)

#### Opção A: Via Script Automático (Recomendado) 🚀

1. **Obter API Key do Render:**
   - Acesse: https://dashboard.render.com
   - Vá em **Account Settings** → **API Keys**
   - Clique em **"New API Key"**
   - Copie a chave gerada

2. **Obter Service ID:**
   - Acesse seu serviço no Render
   - A URL será: `https://dashboard.render.com/web/seu-service-id`
   - Copie o `seu-service-id` da URL

3. **Executar script:**
   ```powershell
   # Definir variáveis (opcional)
   $env:RENDER_API_KEY = "sua-api-key"
   $env:RENDER_SERVICE_ID = "seu-service-id"
   
   # Executar script
   .\adicionar-var-render.ps1
   ```
   
   OU passar como parâmetros:
   ```powershell
   .\adicionar-var-render.ps1 -ApiKey "sua-api-key" -ServiceId "seu-service-id"
   ```

4. **Reinicie o serviço no Render** (o script avisará)

#### Opção B: Manualmente no Painel 🖱️

1. **Acesse o painel do Render.com:**
   - Vá para: https://dashboard.render.com
   - Faça login na sua conta

2. **Selecione seu serviço:**
   - Clique no serviço `launcherpro-backend` (ou o nome que você deu)

3. **Vá em "Environment":**
   - No menu lateral, clique em **"Environment"**

4. **Adicione a variável:**
   - Clique em **"Add Environment Variable"**
   - **Key:** `DISABLE_RATE_LIMITER`
   - **Value:** `true`
   - Clique em **"Save Changes"**

5. **Reinicie o serviço:**
   - Vá em **"Manual Deploy"** → **"Deploy latest commit"**
   - OU clique em **"Manual Deploy"** → **"Clear build cache & deploy"**
   - Aguarde o deploy completar

## ✅ Verificar se está Desabilitado

Após reiniciar, o rate limiter estará desabilitado. Você pode testar fazendo múltiplas tentativas de login sem ser bloqueado.

## 🔒 Para Reativar o Rate Limiter

### Servidor Local:
```powershell
Remove-Item Env:\DISABLE_RATE_LIMITER
# Reiniciar servidor
```

### Render.com:

#### Via Script:
```powershell
.\remover-var-render.ps1 -ApiKey "sua-api-key" -ServiceId "seu-service-id"
```

#### Manualmente:
1. Acesse o painel do Render
2. Vá em **"Environment"**
3. Encontre `DISABLE_RATE_LIMITER`
4. Clique em **"Delete"** ou altere o valor para `false`
5. Salve e reinicie o serviço

## ⚠️ Importante

- **Desabilite apenas para desenvolvimento/testes**
- **Reative em produção** para manter segurança
- O rate limiter protege contra ataques de força bruta
- Sem ele, o servidor fica vulnerável a tentativas ilimitadas de login

## 📝 Variáveis de Ambiente no Render

### Variáveis Atuais no Render:

| Key | Value | Descrição |
|-----|-------|-----------|
| `JWT_SECRET` | `88842af29e7a187c6d141713a8d582899ce0ff5b71785317fb050dfb4cf0269e` | Chave secreta JWT |
| `PORT` | `3001` | Porta do servidor |
| `NODE_ENV` | `production` | Ambiente Node.js |
| `CORS_ORIGIN` | `*` | CORS permitido |
| `DISABLE_RATE_LIMITER` | `true` | **NOVO** - Desabilita rate limiter |

## 🎯 Quando Usar

**Desabilitar quando:**
- ✅ Testando diferentes senhas
- ✅ Desenvolvendo localmente
- ✅ Debugando problemas de autenticação
- ✅ Fazendo testes de integração

**Manter Ativado quando:**
- ✅ Em produção
- ✅ Servidor público
- ✅ Múltiplos usuários
- ✅ Ambiente de segurança crítica

