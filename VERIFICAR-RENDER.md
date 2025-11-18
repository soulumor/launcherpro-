# 🔍 Como Verificar DATABASE_URL no Render

## ⚠️ Problema: Ainda usando SQLite

Se os logs mostram `✅ Conectado ao banco de dados SQLite`, a `DATABASE_URL` não está configurada corretamente.

## ✅ Passo a Passo para Corrigir

### 1. Verificar no Render Dashboard

1. Acesse: **https://dashboard.render.com**
2. Clique no seu **Web Service** (backend)
3. Clique em **Environment** (no menu lateral)
4. Procure por `DATABASE_URL` na lista

### 2. Se NÃO existir, adicionar:

1. Clique em **Add Environment Variable**
2. Preencha:
   - **Key**: `DATABASE_URL` (exatamente assim, maiúsculas)
   - **Value**: 
     ```
     postgresql://postgres.nwrqrzitakviziromsep:12032008qQ@aws-1-us-west-1.pooler.supabase.com:6543/postgres
     ```
3. **IMPORTANTE**: 
   - ✅ Sem espaços antes/depois
   - ✅ Sem aspas
   - ✅ Copie exatamente como está acima
4. Clique em **Save Changes**

### 3. Se JÁ existir, verificar:

1. Clique em **Edit** (ícone de lápis)
2. Verifique se o valor está correto:
   ```
   postgresql://postgres.nwrqrzitakviziromsep:12032008qQ@aws-1-us-west-1.pooler.supabase.com:6543/postgres
   ```
3. Se estiver errado, corrija e clique em **Save Changes**

### 4. Forçar Redeploy

Após salvar:

1. Vá em **Manual Deploy** (no topo)
2. Selecione **Clear build cache & deploy**
3. Clique em **Deploy latest commit**
4. Aguarde 2-5 minutos

### 5. Verificar Logs

Após o deploy, você deve ver nos logs:

```
🔍 Verificando configuração do banco de dados...
   DATABASE_URL existe: true
   DATABASE_URL: postgresql://postgres.nwrqrzitakviziromsep:****@aws-1-us-west-1.pooler.supabase.com:6543/postgres...
✅ DATABASE_URL detectada, usando PostgreSQL (Supabase)
🔗 Tentando conectar: postgresql://postgres.nwrqrzitakviziromsep:****@...
✅ Conectado ao banco de dados PostgreSQL (Supabase)
```

## ❌ Se Ainda Aparecer SQLite

Verifique:

1. **Nome da variável**: Deve ser exatamente `DATABASE_URL` (case-sensitive)
2. **Espaços**: Não pode ter espaços antes/depois do valor
3. **Aspas**: Não coloque aspas no valor
4. **Redeploy**: Fez redeploy após salvar?
5. **Cache**: Fez "Clear build cache & deploy"?

## 🧪 Teste Rápido

Para testar se a variável está sendo lida:

1. No Render Dashboard → **Shell** (ou **Logs**)
2. Execute: `echo $DATABASE_URL`
3. Deve mostrar a URL completa (sem senha visível)

## 📝 Checklist

- [ ] Variável `DATABASE_URL` existe no Render?
- [ ] Valor está correto (sem espaços, sem aspas)?
- [ ] Fez "Save Changes"?
- [ ] Fez redeploy com "Clear build cache"?
- [ ] Logs mostram "PostgreSQL (Supabase)"?

## ✅ Resultado Esperado

Após corrigir, os logs devem mostrar:
- ✅ `DATABASE_URL detectada`
- ✅ `PostgreSQL (Supabase)`
- ✅ `Conectado ao banco de dados PostgreSQL`

**NÃO** deve aparecer:
- ❌ `SQLite`
- ❌ `DATABASE_URL não encontrada`

