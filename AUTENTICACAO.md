# Sistema de Autenticação e Painel Administrativo

## Como Funciona

O sistema agora possui autenticação completa com login e senha para cada cliente, além de um painel administrativo para gerenciar usuários e mensalidades.

## Configuração Inicial

### 1. Criar Primeiro Usuário Admin

Execute o script para criar o primeiro administrador:

```bash
cd backend
node scripts/criarAdmin.js [nome] [email] [senha]
```

Exemplo:
```bash
node scripts/criarAdmin.js "João Admin" admin@exemplo.com senha123
```

Se não passar argumentos, será criado um admin padrão:
- Email: `admin@launcherpro.com`
- Senha: `admin123`

### 2. Configurar URL do Backend (Frontend)

Se o backend estiver hospedado, configure a URL no frontend:

1. Crie um arquivo `.env` na pasta `frontend`:
```
VITE_API_URL=https://seu-backend.onrender.com
```

2. Se estiver usando localmente, o padrão é `http://localhost:3001`

## Uso do Sistema

### Para Clientes

1. Abra o app no navegador
2. Faça login com email e senha fornecidos pelo administrador
3. Acesse os jogos e contas disponíveis

### Para Administradores

1. Faça login com credenciais de admin
2. Clique no botão "Admin" no header
3. No painel administrativo você pode:
   - **Criar novos clientes**: Clique em "Novo Cliente", preencha os dados e defina os dias de mensalidade
   - **Editar clientes**: Clique no ícone de editar, pode alterar dados, adicionar dias à mensalidade, etc.
   - **Desativar clientes**: Clique no ícone de lixeira para desativar
   - **Ver status**: Veja quantos dias restam para cada cliente (cores: verde >7 dias, amarelo ≤7 dias, vermelho vencido)

## Funcionalidades

### Controle de Mensalidade

- Cada cliente tem uma data de vencimento
- O sistema calcula automaticamente os dias restantes
- Clientes com mensalidade vencida não conseguem fazer login
- No painel admin, você pode:
  - Adicionar dias à mensalidade (campo "Adicionar Dias")
  - Definir uma nova data de vencimento
  - Ver status visual (cores indicam urgência)

### Segurança

- Senhas são criptografadas com bcrypt (nunca armazenadas em texto plano)
- Tokens JWT expiram em 7 dias
- Todas as rotas protegidas requerem autenticação
- Apenas admins podem acessar o painel administrativo

## Estrutura de Dados

### Tabela usuarios

- `id`: ID único
- `nome`: Nome do cliente
- `email`: Email (único, usado para login)
- `senha`: Hash bcrypt da senha
- `tipo`: 'admin' ou 'cliente'
- `dias_mensalidade`: Dias padrão da mensalidade
- `data_vencimento`: Data de vencimento da mensalidade (ISO string)
- `ativo`: 1 = ativo, 0 = inativo
- `data_criacao`: Data de criação

## API Endpoints

### Autenticação (Públicas)
- `POST /api/auth/login` - Fazer login
- `POST /api/auth/register` - Registrar novo usuário (pode ser usado por admin)
- `GET /api/auth/me` - Obter dados do usuário logado (protegida)

### Administração (Requer Admin)
- `GET /api/admin/usuarios` - Listar todos os usuários
- `POST /api/admin/usuarios` - Criar novo cliente
- `GET /api/admin/usuarios/:id` - Detalhes de um cliente
- `PUT /api/admin/usuarios/:id` - Editar cliente
- `DELETE /api/admin/usuarios/:id` - Desativar cliente

### Rotas Protegidas (Requerem Autenticação)
- Todas as rotas de `/api/jogos`, `/api/contas`, `/api/biblioteca`, etc. agora requerem token JWT válido

## Hospedagem

### Backend

O backend precisa ser hospedado para que os clientes possam acessar de qualquer lugar. Opções gratuitas:

1. **Render.com** (Recomendado)
   - Conecte seu repositório GitHub
   - Configure variável de ambiente `JWT_SECRET` (use uma string aleatória segura)
   - Deploy automático

2. **Railway.app**
   - Upload do código
   - Configure variáveis de ambiente
   - $5 créditos grátis/mês

### Frontend

O frontend é instalado localmente no PC de cada cliente. Para distribuir:

1. Faça build do frontend: `npm run build`
2. Distribua a pasta `dist` para os clientes
3. Configure o arquivo `.env` com a URL do backend hospedado antes do build

## Variáveis de Ambiente

### Backend
- `JWT_SECRET`: Chave secreta para assinar tokens JWT (obrigatório em produção)
- `PORT`: Porta do servidor (padrão: 3001)

### Frontend
- `VITE_API_URL`: URL do backend hospedado (padrão: http://localhost:3001)

## Notas Importantes

1. **Primeiro Admin**: Deve ser criado via script, não pode ser criado pelo painel
2. **JWT_SECRET**: Em produção, use uma string aleatória longa e segura
3. **Senhas**: Nunca compartilhe senhas em texto plano, sempre use o sistema de reset do admin
4. **Mensalidade**: O sistema bloqueia automaticamente clientes com mensalidade vencida
5. **CORS**: Configurado para aceitar requisições de qualquer origem (frontend local)

