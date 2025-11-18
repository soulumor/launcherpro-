const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// Log de variáveis de ambiente (debug)
console.log('🔍 Variáveis de ambiente disponíveis:');
console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Configurada' : '❌ Não configurada'}`);
if (process.env.DATABASE_URL) {
  const masked = process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@');
  console.log(`   Valor: ${masked.substring(0, 80)}...`);
}
console.log('');

const { initDatabase } = require('./database/database');
const jogosRoutes = require('./routes/jogos');
const contasRoutes = require('./routes/contas');
const verificacaoRoutes = require('./routes/verificacao');
const buscaRoutes = require('./routes/busca');
const bibliotecaRoutes = require('./routes/biblioteca');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const { authenticateToken } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// Tratamento de erros não capturados para evitar que o app feche
process.on('uncaughtException', (error) => {
  console.error('❌ Erro não capturado:', error);
  console.error('Stack:', error.stack);
  // Não fechar o app, apenas logar o erro
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rejeitada não tratada:', reason);
  console.error('Promise:', promise);
  // Não fechar o app, apenas logar o erro
});

// Security Headers com Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Desabilitado para permitir requisições CORS
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Middlewares
// Configurar CORS para permitir localhost sempre e URL específica em produção
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requisições sem origin (ex: Postman, mobile apps)
    if (!origin) return callback(null, true);
    
    // Sempre permitir localhost (desenvolvimento e testes)
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }
    
    // Se CORS_ORIGIN estiver definido, usar ele
    if (process.env.CORS_ORIGIN) {
      const allowedOrigins = process.env.CORS_ORIGIN.split(',').map(o => o.trim());
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
    }
    
    // Permitir tudo se CORS_ORIGIN não estiver definido (compatibilidade)
    if (!process.env.CORS_ORIGIN) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // Parse do corpo das requisições JSON com limite de tamanho

// Middleware para obter IP real (importante para rate limiting)
app.set('trust proxy', 1);

// Timeout para requisições (30 segundos)
app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    res.status(408).json({ error: 'Requisição expirada. Tente novamente.' });
  });
  next();
});

// Rotas públicas (autenticação)
app.use('/api/auth', authRoutes);

// Rotas protegidas (requerem autenticação)
app.use('/api/jogos', authenticateToken, jogosRoutes);
app.use('/api/contas', authenticateToken, contasRoutes);
app.use('/api/verificacao', authenticateToken, verificacaoRoutes);
app.use('/api/busca', authenticateToken, buscaRoutes);
app.use('/api/biblioteca', authenticateToken, bibliotecaRoutes);

// Rotas administrativas (requerem autenticação e privilégios de admin)
app.use('/api/admin', adminRoutes);

// Rota de teste
app.get('/', (req, res) => {
  res.json({ message: 'LauncherPro API está rodando!' });
});

// Middleware de tratamento de erros (deve ser o último)
app.use((err, req, res, next) => {
  console.error('❌ Erro na requisição:', err);
  console.error('Stack:', err.stack);
  res.status(err.status || 500).json({
    error: 'Erro interno do servidor',
    message: err.message || 'Ocorreu um erro inesperado'
  });
});

// Middleware para rotas não encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Inicializar banco de dados e iniciar servidor
initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`📡 API disponível em http://localhost:${PORT}`);
      console.log(`💡 Sincronização automática desabilitada para melhor performance`);
      console.log(`💡 Use o botão "🔄 Sincronizar" em cada jogo para atualizar contas manualmente`);
      
      // ❌ SINCRONIZAÇÃO AUTOMÁTICA DESABILITADA
      // A sincronização automática completa foi desabilitada para evitar:
      // - Lentidão no site pokopow.com
      // - Muitas requisições simultâneas
      // - Bloqueios por rate limiting
      // 
      // Use o botão "🔄 Sincronizar" em cada jogo para atualizar contas manualmente
      // ou execute scripts de sincronização quando necessário.
      //
      // Para reativar, descomente o código abaixo:
      // setTimeout(() => {
      //   try {
      //     const { atualizarJogosEContasOtimizado } = require('./services/atualizarJogosAutomatico');
      //     atualizarJogosEContasOtimizado().catch(err => {
      //       console.error('⚠️ Erro na atualização automática (continuando):', err.message);
      //     });
      //   } catch (err) {
      //     console.error('⚠️ Erro ao carregar serviço de atualização (continuando):', err.message);
      //   }
      // }, 5000);
      
      // Verificação periódica leve (opcional - desabilitada por padrão)
      // Esta verificação é menos agressiva e verifica apenas novos jogos/contas
      // Descomente para ativar (executa após 5 minutos, depois a cada 60 minutos):
      // setTimeout(() => {
      //   try {
      //     const { iniciarVerificacaoAutomatica } = require('./services/verificadorAutomatico');
      //     iniciarVerificacaoAutomatica(60); // Verificar a cada 60 minutos
      //     console.log('✅ Verificação periódica ativada (a cada 60 minutos)');
      //   } catch (err) {
      //     console.error('⚠️ Erro ao carregar serviço de verificação (continuando):', err.message);
      //   }
      // }, 300000); // Iniciar após 5 minutos
    });
  })
  .catch((err) => {
    console.error('❌ Erro ao inicializar o banco de dados:', err);
    console.error('Stack:', err.stack);
    console.error('\n⚠️ Tentando iniciar servidor mesmo assim...');
    
    // Tentar iniciar o servidor mesmo com erro no banco
    // O servidor pode funcionar parcialmente
    try {
      app.listen(PORT, () => {
        console.log(`⚠️ Servidor iniciado na porta ${PORT} (modo limitado - banco de dados com problemas)`);
        console.log(`📡 API disponível em http://localhost:${PORT}`);
        console.log('💡 Verifique os logs acima para mais detalhes sobre o erro do banco de dados.');
      });
    } catch (listenErr) {
      console.error('❌ Erro crítico ao iniciar servidor:', listenErr);
      console.error('Encerrando aplicação...');
      process.exit(1);
    }
  });

