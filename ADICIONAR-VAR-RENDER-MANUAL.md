# Como Adicionar DISABLE_RATE_LIMITER no Render.com

## Suas Credenciais

- **Service ID**: `srv-d4d4sc8gjchc73dp0kh0`
- **URL do Serviço**: https://dashboard.render.com/web/srv-d4d4sc8gjchc73dp0kh0

## Passo a Passo Rápido

### 1. Acesse o Painel do Render
- Vá para: https://dashboard.render.com/web/srv-d4d4sc8gjchc73dp0kh0
- Faça login se necessário

### 2. Vá em "Environment"
- No menu lateral esquerdo, clique em **"Environment"**

### 3. Adicione a Variável
- Clique em **"+ Add Environment Variable"**
- **Key:** `DISABLE_RATE_LIMITER`
- **Value:** `true`
- Clique em **"Save Changes"**

### 4. Escolha a Opção de Deploy
- Selecione **"Save, rebuild, and deploy"** (recomendado)
- OU **"Save and deploy"** (mais rápido)
- Aguarde o deploy completar (2-5 minutos)

## Pronto!

Após o deploy, o rate limiter estará desabilitado e você poderá testar senhas sem bloqueio.

## Para Remover Depois

1. Acesse: https://dashboard.render.com/web/srv-d4d4sc8gjchc73dp0kh0/environment
2. Encontre `DISABLE_RATE_LIMITER`
3. Clique em **"Delete"**
4. Salve e reinicie o serviço

