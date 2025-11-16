# 📁 Estrutura do Projeto LauncherPro

## Estrutura de Arquivos

```
LauncherPro/
│
├── backend/                          # API Backend (Node.js + Express + SQLite)
│   ├── database/
│   │   └── database.js              # Configuração e inicialização do SQLite
│   ├── controllers/
│   │   ├── jogosController.js       # Lógica de negócio para jogos
│   │   └── contasController.js      # Lógica de negócio para contas
│   ├── routes/
│   │   ├── jogos.js                 # Rotas REST para jogos
│   │   └── contas.js                # Rotas REST para contas
│   ├── server.js                    # Servidor Express principal
│   ├── package.json                 # Dependências do backend
│   └── .gitignore
│
├── frontend/                         # Interface React + TailwindCSS
│   ├── src/
│   │   ├── components/
│   │   │   ├── GameCard.jsx         # Card individual de jogo
│   │   │   ├── GameGrid.jsx         # Grade de jogos (lista)
│   │   │   └── GameModal.jsx        # Modal com detalhes do jogo
│   │   ├── App.jsx                  # Componente principal
│   │   ├── main.jsx                 # Ponto de entrada React
│   │   └── index.css                # Estilos globais TailwindCSS
│   ├── index.html                   # HTML base
│   ├── vite.config.js               # Configuração do Vite
│   ├── tailwind.config.js           # Configuração do TailwindCSS
│   ├── postcss.config.js            # Configuração do PostCSS
│   ├── package.json                 # Dependências do frontend
│   └── .gitignore
│
├── README.md                         # Documentação principal
├── INSTALACAO.md                     # Guia de instalação rápido
├── ESTRUTURA.md                      # Este arquivo
└── .gitignore                        # Ignorados do Git

```

## 🗄️ Banco de Dados

### Tabela: jogos
| Campo      | Tipo      | Descrição                  |
|------------|-----------|----------------------------|
| id         | INTEGER   | Chave primária (auto)      |
| nome       | TEXT      | Nome do jogo               |
| descricao  | TEXT      | Descrição do jogo          |
| preco      | REAL      | Preço em reais             |
| capa       | TEXT      | URL da imagem da capa      |

### Tabela: contas
| Campo      | Tipo      | Descrição                  |
|------------|-----------|----------------------------|
| id         | INTEGER   | Chave primária (auto)      |
| jogo_id    | INTEGER   | FK para jogos              |
| usuario    | TEXT      | Nome de usuário da conta   |
| senha      | TEXT      | Senha da conta             |
| status     | TEXT      | Status (disponivel/...)    |

## 🔌 Endpoints da API

### Jogos
- `GET /api/jogos` - Lista todos os jogos
- `GET /api/jogos/:id` - Detalhes de um jogo específico
- `POST /api/jogos` - Adiciona um novo jogo

### Contas
- `GET /api/contas/:jogoId` - Lista contas disponíveis de um jogo
- `POST /api/contas` - Adiciona uma nova conta

## 🎨 Componentes React

### GameCard
- Exibe imagem, nome e preço do jogo
- Efeitos hover estilo Steam
- Clicável para abrir modal

### GameGrid
- Renderiza grade de cards
- Busca jogos da API `/api/jogos`
- Estados de loading e error

### GameModal
- Modal com detalhes completos do jogo
- Lista contas disponíveis
- Busca contas da API `/api/contas/:jogoId`
- Animação de fade

## 🎯 Características

✅ Backend modular (routes, controllers, database)
✅ Frontend componentizado
✅ Estilo visual inspirado na Steam
✅ Banco de dados SQLite auto-criado
✅ Dados de exemplo pré-carregados
✅ CORS configurado
✅ Proxy configurado no Vite
✅ Comentários explicativos no código
✅ Pronto para expansão futura (scraper, autenticação)

