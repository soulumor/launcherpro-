# 🚀 Guia de Instalação - LauncherPro

## Instruções Rápidas

### 1️⃣ Backend

```bash
# Navegue até a pasta do backend
cd backend

# Instale as dependências
npm install

# Inicie o servidor (porta 3001)
npm start
```

✅ O backend estará rodando em: `http://localhost:3001`

### 2️⃣ Frontend

Abra um **novo terminal** e execute:

```bash
# Navegue até a pasta do frontend
cd frontend

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento (porta 3000)
npm run dev
```

✅ O frontend estará rodando em: `http://localhost:3000`

## 📝 Notas Importantes

1. **Execute o backend ANTES do frontend** para garantir que a API esteja disponível
2. O banco de dados SQLite será criado automaticamente na primeira execução em `backend/database/launcherpro.db`
3. Dados de exemplo (jogos e contas) são inseridos automaticamente na primeira execução
4. O frontend está configurado com proxy para o backend, então as chamadas para `/api/*` serão redirecionadas para `http://localhost:3001`

## 🧪 Testando a API

Você pode testar os endpoints diretamente:

```bash
# Listar jogos
curl http://localhost:3001/api/jogos

# Buscar um jogo específico
curl http://localhost:3001/api/jogos/1

# Listar contas de um jogo
curl http://localhost:3001/api/contas/1
```

## 🎯 Pronto!

Agora você pode:
- Visualizar os jogos na interface
- Clicar em qualquer jogo para ver detalhes
- Ver as contas disponíveis para cada jogo

