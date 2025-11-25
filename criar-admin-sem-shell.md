# 🔧 Criar Admin SEM Shell do Render (Versão Gratuita)

## ❌ Problema

O Render.com **versão gratuita** não permite usar o Shell, então não podemos executar comandos diretamente no servidor.

## ✅ Soluções Alternativas

### Solução 1: Via API de Registro (Mais Fácil) ⭐

A rota `/api/auth/register` é **pública** e pode criar usuários. Vamos tentar criar um admin:

#### Opção A: Script PowerShell

Execute:
```powershell
.\criar-admin-render.ps1
```

Este script tenta criar o admin via API.

#### Opção B: Manual via PowerShell

```powershell
$url = "https://launcherpro.onrender.com/api/auth/register"
$body = @{
    nome = "Admin"
    email = "cursorsemanal@gmail.com"
    senha = "12345"
    tipo = "admin"
    dias_mensalidade = 30
} | ConvertTo-Json

Invoke-WebRequest -Uri $url -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
```

**Se funcionar:** ✅ Admin criado!
**Se não funcionar:** A rota pode não permitir criar admin diretamente (só clientes)

---

### Solução 2: Criar Localmente e Sincronizar

Se você tem acesso ao banco local, pode criar o admin localmente e depois sincronizar:

1. **Criar admin localmente:**
   ```powershell
   .\criar-admin.ps1
   ```
   Use as mesmas credenciais que quer na nuvem.

2. **Sincronizar para a nuvem:**
   ```powershell
   .\sincronizar-usuarios-nuvem.ps1
   ```

---

### Solução 3: Modificar Código e Fazer Deploy

Se as soluções acima não funcionarem, você pode adicionar uma rota temporária para criar admin:

1. **Adicionar rota temporária no backend:**

   Edite `backend/server.js` e adicione ANTES das rotas protegidas:

   ```javascript
   // ROTA TEMPORÁRIA PARA CRIAR PRIMEIRO ADMIN (REMOVER DEPOIS!)
   app.post('/api/criar-admin-inicial', async (req, res) => {
     const { nome, email, senha } = req.body;
     
     if (!nome || !email || !senha) {
       return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
     }
     
     const db = getDatabase();
     const bcrypt = require('bcryptjs');
     
     // Verificar se já existe admin
     db.get('SELECT id FROM usuarios WHERE tipo = ?', ['admin'], async (err, adminExistente) => {
       if (err) {
         return res.status(500).json({ error: 'Erro ao verificar admin' });
       }
       
       if (adminExistente) {
         return res.status(400).json({ error: 'Já existe um admin. Use a rota /api/auth/register' });
       }
       
       // Criar admin
       const senhaHash = await bcrypt.hash(senha, 10);
       const dataVencimento = new Date();
       dataVencimento.setDate(dataVencimento.getDate() + 30);
       
       db.run(
         'INSERT INTO usuarios (nome, email, senha, tipo, dias_mensalidade, data_vencimento, ativo) VALUES (?, ?, ?, ?, ?, ?, ?)',
         [nome, email, senhaHash, 'admin', 30, dataVencimento.toISOString(), 1],
         function(err) {
           if (err) {
             return res.status(500).json({ error: 'Erro ao criar admin' });
           }
           
           res.json({
             sucesso: true,
             mensagem: 'Admin criado com sucesso!',
             email: email
           });
         }
       );
     });
   });
   ```

2. **Fazer commit e push:**
   ```powershell
   git add backend/server.js
   git commit -m "Adicionar rota temporária para criar admin inicial"
   git push
   ```

3. **Aguardar deploy no Render** (2-3 minutos)

4. **Criar admin via API:**
   ```powershell
   $url = "https://launcherpro.onrender.com/api/criar-admin-inicial"
   $body = @{
       nome = "Admin"
       email = "cursorsemanal@gmail.com"
       senha = "12345"
   } | ConvertTo-Json

   Invoke-WebRequest -Uri $url -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
   ```

5. **REMOVER a rota temporária** (por segurança):
   - Remova o código adicionado
   - Faça commit e push novamente

---

### Solução 4: Usar Banco de Dados SQLite Online

Se você conseguir fazer download do banco de dados do Render:

1. **Baixar o banco** (se o Render permitir via dashboard)
2. **Abrir com SQLite Browser** (https://sqlitebrowser.org/)
3. **Inserir admin manualmente:**

   ```sql
   INSERT INTO usuarios (nome, email, senha, tipo, dias_mensalidade, data_vencimento, ativo)
   VALUES (
     'Admin',
     'cursorsemanal@gmail.com',
     '$2a$10$[HASH_BCRYPT_AQUI]',  -- Precisa gerar hash bcrypt
     'admin',
     30,
     datetime('now', '+30 days'),
     1
   );
   ```

   **Problema:** Precisa gerar o hash bcrypt da senha. Use este script Node.js:

   ```javascript
   const bcrypt = require('bcryptjs');
   bcrypt.hash('12345', 10).then(hash => console.log(hash));
   ```

4. **Fazer upload do banco de volta** (se o Render permitir)

---

### Solução 5: Usar Serviço Alternativo com Shell Grátis

Se nada funcionar, considere migrar para um serviço que oferece shell grátis:

- **Railway.app** - Oferece shell grátis
- **Fly.io** - Oferece shell grátis
- **Heroku** (pago agora, mas tem trial)

---

## 🎯 Recomendação

**Tente nesta ordem:**

1. ✅ **Solução 1** - Via API de registro (mais rápido)
2. ✅ **Solução 2** - Criar local e sincronizar (se tiver banco local)
3. ✅ **Solução 3** - Adicionar rota temporária (mais seguro)

---

## 📋 Scripts Disponíveis

### `criar-admin-render.ps1`
Tenta criar admin via API `/api/auth/register`

### `criar-admin-render.js`
Versão Node.js do mesmo script

### `sincronizar-usuarios-nuvem.ps1`
Sincroniza usuários do banco local para a nuvem

---

## ⚠️ Importante

Depois de criar o admin:
1. ✅ Teste fazer login
2. ✅ Remova qualquer rota temporária adicionada
3. ✅ Anote as credenciais em local seguro
4. ✅ Altere a senha padrão após primeiro login

---

## 🆘 Se Nada Funcionar

Como último recurso, você pode:
1. Criar um **cliente** primeiro (via API de registro)
2. Depois, editar manualmente no banco para mudar o tipo para `admin`
3. Ou usar um serviço que oferece shell grátis

---

**Boa sorte! 🚀**











