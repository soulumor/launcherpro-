# 🔐 Solução: Erro "Email ou senha incorretos"

## ✅ Diagnóstico

O teste mostrou que:
- ✅ Usuário existe no banco Supabase
- ✅ Senha está correta
- ✅ Hash da senha está válido

## ❌ Problema

O erro acontece porque o **Render ainda não tem a `DATABASE_URL` configurada**.

Quando a `DATABASE_URL` não existe, o código usa **SQLite local** (que está vazio), não o **Supabase** (onde está o usuário).

## 🔧 Solução

### Passo 1: Adicionar DATABASE_URL no Render

1. Acesse: https://dashboard.render.com
2. Vá no seu **Web Service** (backend)
3. Clique em **Environment**
4. Adicione nova variável:
   - **Key**: `DATABASE_URL`
   - **Value**: 
     ```
     postgresql://postgres.nwrqrzitakviziromsep:12032008qQ@aws-1-us-west-1.pooler.supabase.com:6543/postgres
     ```
5. Clique em **Save Changes**

### Passo 2: Aguardar Redeploy

O Render fará redeploy automaticamente. Aguarde 2-3 minutos.

### Passo 3: Verificar Logs

Nos logs do Render, você deve ver:
```
🔍 DATABASE_URL detectada, usando PostgreSQL (Supabase)
✅ Conectado ao banco de dados PostgreSQL (Supabase)
```

### Passo 4: Testar Login

Após o deploy, tente fazer login novamente:
- **Email**: `ailtonbergnovo@gmail.com`
- **Senha**: `amelanegomes`

## ✅ Credenciais Confirmadas

- **Email**: `ailtonbergnovo@gmail.com`
- **Senha**: `amelanegomes`
- **Tipo**: `admin`
- **Status**: `Ativo`

## 🐛 Se Ainda Não Funcionar

1. **Verifique espaços**: Não coloque espaços antes/depois do email ou senha
2. **Verifique maiúsculas**: Email é case-insensitive, mas verifique
3. **Verifique logs do Render**: Veja se há erros de conexão
4. **Teste localmente**: Execute `node scripts/testarLogin.js` para confirmar

## 📝 Resumo

O problema é que o Render está usando SQLite (vazio) ao invés de Supabase (onde está o usuário). Após adicionar a `DATABASE_URL`, tudo deve funcionar!

