# 📋 Comandos para Executar o LauncherPro

## ⚠️ Importante
Você precisa estar na pasta `LauncherPro` para executar os comandos!

## 🚀 Opção 1: Usando Scripts PowerShell (Windows)

### Backend:
```powershell
# Na pasta LauncherPro
.\instalar-backend.ps1
```

### Frontend (em outro terminal):
```powershell
# Na pasta LauncherPro
.\instalar-frontend.ps1
```

## 🚀 Opção 2: Comandos Manuais

### 1️⃣ Backend (Terminal 1):

```powershell
# Navegar para a pasta do backend
cd LauncherPro\backend

# Instalar dependências
npm install

# Iniciar o servidor
npm start
```

### 2️⃣ Frontend (Terminal 2 - NOVO TERMINAL):

```powershell
# Navegar para a pasta do frontend
cd LauncherPro\frontend

# Instalar dependências
npm install

# Iniciar o servidor de desenvolvimento
npm run dev
```

## 📝 Passo a Passo Detalhado

### Passo 1: Abrir o PowerShell
- Pressione `Win + R`
- Digite `powershell` e pressione Enter
- OU clique com botão direito na pasta e selecione "Abrir no Terminal"

### Passo 2: Navegar até o projeto
```powershell
# Se você está em C:\Users\berg, navegue até onde criou o LauncherPro
# Exemplo: se criou em Documents
cd Documents\LauncherPro

# OU se criou em outro lugar, navegue até lá
cd C:\caminho\para\LauncherPro
```

### Passo 3: Verificar se está no lugar certo
```powershell
# Deve mostrar: backend, frontend, README.md, etc
dir
```

### Passo 4: Instalar Backend
```powershell
cd backend
npm install
npm start
```

### Passo 5: Instalar Frontend (NOVO TERMINAL)
```powershell
# Abra um NOVO terminal/PowerShell
cd C:\caminho\para\LauncherPro\frontend
npm install
npm run dev
```

## 🔍 Verificar se está Funcionando

- Backend: `http://localhost:3001` → Deve mostrar: `{"message":"LauncherPro API está rodando!"}`
- Frontend: `http://localhost:3000` → Deve abrir a interface do LauncherPro

## ❌ Resolução de Problemas

### Erro: "Could not read package.json"
**Solução:** Você não está na pasta correta! Use `cd` para navegar até `LauncherPro\backend` ou `LauncherPro\frontend`

### Erro: "npm não é reconhecido"
**Solução:** Instale o Node.js de https://nodejs.org

### Erro: Porta já em uso
**Solução:** Feche outros processos usando as portas 3000 ou 3001

