# 🌐 Como Abrir o App Corretamente

## ❌ Problema: Abrir index.html diretamente não funciona

Quando você clica duas vezes no `index.html` ou abre pelo navegador diretamente, o app pode não funcionar porque:
- O navegador bloqueia módulos ES6 via `file://`
- Recursos não carregam corretamente
- APIs podem não funcionar

## ✅ Solução: Usar um Servidor HTTP

### Opção 1: Servidor Preview do Vite (Recomendado)

Execute no PowerShell na pasta do projeto:

```powershell
cd frontend
npm run preview
```

Depois acesse: **http://localhost:4173**

### Opção 2: Script Automático

Execute:

```powershell
.\servir-app.ps1
```

Isso iniciará o servidor automaticamente e você poderá acessar em **http://localhost:4173**

---

## 🎯 Passos para Testar o App:

1. **Execute o servidor preview:**
   ```powershell
   cd frontend
   npm run preview
   ```

2. **Aguarde a mensagem:**
   ```
   ➜  Local:   http://localhost:4173/
   ➜  Network: use --host to expose
   ```

3. **Abra no navegador:**
   - Abra o navegador (Chrome, Firefox, Edge)
   - Digite: `http://localhost:4173`
   - Ou clique no link que aparece no terminal

4. **Faça login:**
   - Email: `admin@launcherpro.com`
   - Senha: `admin123`

---

## 📦 Para Distribuir para Clientes

Os clientes também precisam usar um servidor HTTP simples. Opções:

### Opção A: Cliente usa Python (se tiver instalado)

Na pasta `dist`:
```bash
python -m http.server 8000
```
Depois acessa: `http://localhost:8000`

### Opção B: Cliente usa Node.js (se tiver instalado)

Na pasta `dist`:
```bash
npx http-server -p 8000
```
Depois acessa: `http://localhost:8000`

### Opção C: Cliente usa PowerShell (Windows)

Na pasta `dist`:
```powershell
# Instalar servidor simples (uma vez só)
npm install -g http-server

# Servir o app
http-server -p 8000
```
Depois acessa: `http://localhost:8000`

---

## ⚠️ Importante

**Nunca abra o `index.html` diretamente clicando duas vezes!**

Sempre use um servidor HTTP:
- ✅ `npm run preview` (desenvolvimento/teste)
- ✅ `http-server` (distribuição)
- ✅ `python -m http.server` (alternativa simples)

---

## 🔧 Criar Servidor Simples para Clientes

Se quiser criar um `.exe` que abre o servidor automaticamente para clientes, posso ajudar a criar um script mais amigável.







