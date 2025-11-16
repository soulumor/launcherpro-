# 🎮 LauncherPro

Sistema completo de launcher de jogos com frontend React e backend Node.js.

## 📦 Estrutura do Projeto

```
LauncherPro/
 ├── frontend/     → React + Vite + TailwindCSS
 └── backend/      → Node.js + Express + SQLite
```

## 🚀 Como Executar

### Backend

1. Entre na pasta do backend:
```bash
cd backend
```

2. Instale as dependências:
```bash
npm install
```

3. Inicie o servidor:
```bash
npm start
```

O backend estará rodando em `http://localhost:3001`

### Frontend

1. Entre na pasta do frontend:
```bash
cd frontend
```

2. Instale as dependências:
```bash
npm install
```

3. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

O frontend estará rodando em `http://localhost:3000`

## 📡 Endpoints da API

### Jogos
- `GET /api/jogos` - Lista todos os jogos
- `GET /api/jogos/:id` - Detalhes de um jogo específico
- `POST /api/jogos` - Adiciona um novo jogo

### Contas
- `GET /api/contas/:jogoId` - Lista contas disponíveis de um jogo
- `POST /api/contas` - Adiciona uma nova conta

## 🗄️ Banco de Dados

O banco SQLite é criado automaticamente na primeira execução em `backend/database/launcherpro.db`.

### Tabelas

- **jogos**: id, nome, descricao, preco, capa
- **contas**: id, jogo_id, usuario, senha, status

## 🎨 Tecnologias Utilizadas

### Frontend
- React 18
- Vite
- TailwindCSS
- Axios

### Backend
- Node.js
- Express
- SQLite3
- CORS

## 📝 Notas

- O projeto vem com dados de exemplo pré-configurados
- O banco de dados é criado automaticamente na primeira execução
- O frontend está configurado com proxy para o backend (via Vite)

## 🔮 Próximos Passos (Futuro)

- Sistema de autenticação
- Scraper para buscar jogos automaticamente
- Sistema de pagamento
- Histórico de aluguéis
- Dashboard administrativo

