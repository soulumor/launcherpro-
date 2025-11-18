# 🔒 Persistência de Banco de Dados na Nuvem

## ❌ Problema Atual

O SQLite no Render **pode ser perdido** em novos deploys porque:
- O SQLite é armazenado no sistema de arquivos do container
- Em novos deploys, o container é recriado
- Os dados **não persistem** entre deploys

---

## ✅ Soluções para Persistência

### Opção 1: PostgreSQL no Render (RECOMENDADO) ⭐

**Vantagens:**
- ✅ Banco persistente (não é perdido em deploys)
- ✅ Backup automático (em planos pagos)
- ✅ 90 dias grátis no Render
- ✅ Escalável e robusto

**Desvantagens:**
- ⚠️ Após 90 dias, custa ~$7/mês
- ⚠️ Precisa migrar o código de SQLite para PostgreSQL

**Como fazer:**
1. Criar banco PostgreSQL no Render
2. Instalar `pg` no backend: `npm install pg`
3. Migrar código de SQLite para PostgreSQL
4. Configurar variável de ambiente `DATABASE_URL`

---

### Opção 2: SQLite com Backup Manual

**Vantagens:**
- ✅ Grátis
- ✅ Não precisa mudar código
- ✅ SQLite continua funcionando

**Desvantagens:**
- ⚠️ Requer backup manual antes de cada deploy
- ⚠️ Dados podem ser perdidos se esquecer do backup
- ⚠️ Mais trabalho manual

**Como fazer:**
1. Fazer backup do banco antes de cada deploy
2. Restaurar backup após deploy
3. Usar script automático de backup

---

### Opção 3: Outro Serviço de Banco (Supabase, PlanetScale, etc.)

**Vantagens:**
- ✅ Banco persistente na nuvem
- ✅ Alguns têm tier grátis permanente
- ✅ Melhor que SQLite para produção

**Desvantagens:**
- ⚠️ Precisa migrar código
- ⚠️ Mais configuração

**Serviços recomendados:**
- **Supabase** (PostgreSQL grátis)
- **PlanetScale** (MySQL grátis)
- **Railway** (PostgreSQL grátis)

---

### Opção 4: Volume Persistente (Render Pro/Paid)

**Vantagens:**
- ✅ SQLite continua funcionando
- ✅ Dados persistem em deploys

**Desvantagens:**
- ⚠️ Requer plano pago do Render
- ⚠️ Mais caro que PostgreSQL

---

## 🎯 Recomendação

### Para Curto Prazo (Gratuito):
1. ✅ Usar SQLite com backup manual
2. ✅ Sincronizar usuários via script antes de cada deploy
3. ✅ Fazer backup do banco antes de fazer deploy

### Para Longo Prazo (Produção):
1. ⭐ Migrar para **PostgreSQL no Render**
2. ⭐ Usar os 90 dias grátis
3. ⭐ Depois avaliar se vale pagar ou migrar para outro serviço

---

## 🔧 Solução Imediata: Sincronização de Usuários

Criei um script para sincronizar usuários do banco local para a nuvem:

### Usar o Script:

```powershell
# Sincronizar usuários do banco local para a nuvem
.\sincronizar-usuarios-nuvem.ps1
```

**O que o script faz:**
1. ✅ Lê todos os usuários do banco local
2. ✅ Envia cada usuário para a API da nuvem
3. ✅ Ignora usuários que já existem
4. ✅ Informa sobre usuários que precisam redefinir senha

**Limitação:**
- ⚠️ Senhas criptografadas no banco local não podem ser usadas diretamente
- ⚠️ Usuários precisarão redefinir senha na nuvem (pode fazer via painel admin)

---

## 📋 Checklist de Persistência

### Antes de Cada Deploy:

- [ ] Executar `sincronizar-usuarios-nuvem.ps1`
- [ ] Fazer backup do banco (se usar SQLite)
- [ ] Verificar se todos os usuários estão na nuvem
- [ ] Testar login de usuários após deploy

### Após Cada Deploy:

- [ ] Verificar se banco foi recriado
- [ ] Verificar se usuários ainda existem
- [ ] Se necessário, executar script de sincronização novamente

---

## 🚀 Migração para PostgreSQL (Futuro)

Se decidir migrar para PostgreSQL:

1. Criar banco PostgreSQL no Render
2. Instalar `pg`: `npm install pg`
3. Criar arquivo `backend/database/postgres.js`
4. Migrar queries de SQLite para PostgreSQL
5. Atualizar `database.js` para usar PostgreSQL se `DATABASE_URL` existir

**Exemplo de migração:**
- SQLite: `db.all('SELECT * FROM usuarios')`
- PostgreSQL: `await client.query('SELECT * FROM usuarios')`

---

## 💡 Dica Importante

**Sempre mantenha um backup dos dados importantes:**
- Usuários
- Jogos
- Contas de jogos
- Configurações

Crie backups regulares antes de fazer deploys!







