const jwt = require('jsonwebtoken');
const { getDatabase } = require('../database/database');

// JWT_SECRET deve ser definido via variável de ambiente
// Em produção, NUNCA use o valor padrão!
let JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET === 'seu-secret-key-mude-em-producao') {
  console.error('⚠️ AVISO DE SEGURANÇA: JWT_SECRET não está configurado ou está usando valor padrão!');
  console.error('⚠️ Configure a variável de ambiente JWT_SECRET com uma string aleatória segura.');
  console.error('⚠️ Exemplo: JWT_SECRET=$(node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))")');
  
  // Em produção, não permitir iniciar sem JWT_SECRET seguro
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ ERRO: Não é possível iniciar em produção sem JWT_SECRET configurado!');
    process.exit(1);
  }
  
  // Em desenvolvimento, usar um valor temporário (mas avisar)
  console.warn('⚠️ Usando JWT_SECRET temporário para desenvolvimento. NÃO USE EM PRODUÇÃO!');
  JWT_SECRET = 'dev-secret-key-temporario-' + require('crypto').randomBytes(16).toString('hex');
}

/**
 * Middleware para verificar token JWT
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso não fornecido' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido ou expirado' });
    }

    // Verificar se o usuário ainda existe no banco (não foi deletado)
    const db = getDatabase();
    db.get('SELECT * FROM usuarios WHERE id = ?', [user.id], (err, usuario) => {
      if (err || !usuario) {
        return res.status(403).json({ error: 'Usuário não encontrado ou conta foi deletada' });
      }

      // Verificar se está ativo (apenas para clientes, admins sempre podem acessar)
      if (usuario.tipo !== 'admin' && usuario.ativo !== 1) {
        return res.status(403).json({ error: 'Conta desativada' });
      }

      // Verificar se o token é o mais recente (apenas um login por vez)
      if (usuario.ultimo_token && usuario.ultimo_token !== token) {
        return res.status(403).json({ error: 'Sessão expirada. Outro login foi realizado com esta conta.' });
      }

      // Verificar se a mensalidade está válida (apenas para clientes, não para admins)
      if (usuario.tipo !== 'admin' && usuario.data_vencimento) {
        const hoje = new Date();
        const vencimento = new Date(usuario.data_vencimento);
        
        if (vencimento < hoje) {
          return res.status(403).json({ 
            error: 'Mensalidade vencida',
            diasRestantes: 0
          });
        }
      }

      req.user = {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        tipo: usuario.tipo
      };
      next();
    });
  });
}

/**
 * Middleware para verificar se o usuário é administrador
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  if (req.user.tipo !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
  }

  next();
}

module.exports = {
  authenticateToken,
  requireAdmin,
  JWT_SECRET
};

