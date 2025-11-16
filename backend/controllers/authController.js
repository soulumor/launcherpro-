const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDatabase } = require('../database/database');
const { JWT_SECRET } = require('../middleware/auth');
const { 
  validatePasswordStrength, 
  validateAndSanitizeEmail, 
  validateAndSanitizeName,
  validatePositiveInteger 
} = require('../utils/validators');
const { logLoginAttempt, logUserCreation } = require('../utils/auditLogger');

/**
 * Faz login do usuário
 * POST /api/auth/login
 */
exports.login = (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    logLoginAttempt(req, false, email, 'MISSING_CREDENTIALS');
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  // Validar e sanitizar email
  const emailValidation = validateAndSanitizeEmail(email);
  if (!emailValidation.valid) {
    if (req.recordFailedLogin) req.recordFailedLogin();
    logLoginAttempt(req, false, email, emailValidation.error);
    return res.status(400).json({ error: emailValidation.error });
  }

  const sanitizedEmail = emailValidation.sanitized;
  const db = getDatabase();

  db.get('SELECT * FROM usuarios WHERE email = ?', [sanitizedEmail], async (err, usuario) => {
    if (err) {
      console.error('Erro ao buscar usuário:', err);
      if (req.recordFailedLogin) req.recordFailedLogin();
      logLoginAttempt(req, false, sanitizedEmail, 'DATABASE_ERROR');
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    if (!usuario) {
      // Registrar tentativa falhada
      if (req.recordFailedLogin) req.recordFailedLogin();
      logLoginAttempt(req, false, sanitizedEmail, 'USER_NOT_FOUND');
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }

    if (usuario.ativo !== 1) {
      if (req.recordFailedLogin) req.recordFailedLogin();
      logLoginAttempt(req, false, sanitizedEmail, 'ACCOUNT_DISABLED');
      return res.status(403).json({ error: 'Conta desativada. Entre em contato com o administrador.' });
    }

    // Verificar senha
    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      // Registrar tentativa falhada
      if (req.recordFailedLogin) req.recordFailedLogin();
      logLoginAttempt(req, false, sanitizedEmail, 'INVALID_PASSWORD');
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }

    // Login bem-sucedido - limpar tentativas
    if (req.clearLoginAttempts) req.clearLoginAttempts();
    logLoginAttempt(req, true, sanitizedEmail, 'SUCCESS');

    // Verificar mensalidade (apenas para clientes, admins têm acesso ilimitado)
    let diasRestantes = null;
    if (usuario.tipo !== 'admin' && usuario.data_vencimento) {
      const hoje = new Date();
      const vencimento = new Date(usuario.data_vencimento);
      const diffTime = vencimento - hoje;
      diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diasRestantes < 0) {
        return res.status(403).json({ 
          error: 'Mensalidade vencida',
          diasRestantes: 0
        });
      }
    } else if (usuario.tipo === 'admin') {
      // Admin tem acesso ilimitado
      diasRestantes = null; // null indica ilimitado
    }

    // Gerar token JWT
    const token = jwt.sign(
      { 
        id: usuario.id, 
        email: usuario.email,
        tipo: usuario.tipo 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Salvar o token e registrar último login no banco
    const agora = new Date().toISOString();
    db.run('UPDATE usuarios SET ultimo_token = ?, ultimo_login = ? WHERE id = ?', 
      [token, agora, usuario.id], 
      (err) => {
        if (err) {
          console.error('Erro ao salvar token e último login:', err);
          // Continuar mesmo com erro
        }
      }
    );

    res.json({
      token,
      user: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        tipo: usuario.tipo,
        diasRestantes,
        dataVencimento: usuario.data_vencimento
      }
    });
  });
};

/**
 * Registra um novo usuário (apenas admin pode usar)
 * POST /api/auth/register
 */
exports.register = async (req, res) => {
  const { nome, email, senha, tipo = 'cliente', dias_mensalidade = 30 } = req.body;

  // Validar e sanitizar nome
  const nameValidation = validateAndSanitizeName(nome);
  if (!nameValidation.valid) {
    return res.status(400).json({ error: nameValidation.error });
  }

  // Validar e sanitizar email
  const emailValidation = validateAndSanitizeEmail(email);
  if (!emailValidation.valid) {
    return res.status(400).json({ error: emailValidation.error });
  }

  // Validar força da senha
  const passwordValidation = validatePasswordStrength(senha);
  if (!passwordValidation.valid) {
    return res.status(400).json({ error: passwordValidation.error });
  }

  // Validar dias_mensalidade
  const diasValidation = validatePositiveInteger(dias_mensalidade, 'Dias de mensalidade');
  if (!diasValidation.valid) {
    return res.status(400).json({ error: diasValidation.error });
  }

  // Validar tipo
  if (tipo !== 'admin' && tipo !== 'cliente') {
    return res.status(400).json({ error: 'Tipo deve ser "admin" ou "cliente"' });
  }

  const db = getDatabase();
  const sanitizedEmail = emailValidation.sanitized;
  const sanitizedName = nameValidation.sanitized;
  const validDias = diasValidation.value;

  // Verificar se email já existe
  db.get('SELECT id FROM usuarios WHERE email = ?', [sanitizedEmail], async (err, existingUser) => {
    if (err) {
      console.error('Erro ao verificar email:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    if (existingUser) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    // Criptografar senha
    const senhaHash = await bcrypt.hash(senha, 10);

    // Calcular data de vencimento
    const dataVencimento = new Date();
    dataVencimento.setDate(dataVencimento.getDate() + validDias);

    // Inserir usuário
    db.run(
      'INSERT INTO usuarios (nome, email, senha, tipo, dias_mensalidade, data_vencimento, ultimo_token) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [sanitizedName, sanitizedEmail, senhaHash, tipo, validDias, dataVencimento.toISOString(), null],
      function(err) {
        if (err) {
          console.error('Erro ao criar usuário:', err);
          return res.status(500).json({ error: 'Erro ao criar usuário' });
        }

        // Log de auditoria
        const adminEmail = req.user?.email || 'system';
        logUserCreation(req, adminEmail, sanitizedEmail);

        res.status(201).json({
          id: this.lastID,
          nome: sanitizedName,
          email: sanitizedEmail,
          tipo,
          dias_mensalidade: validDias,
          data_vencimento: dataVencimento.toISOString()
        });
      }
    );
  });
};

/**
 * Retorna dados do usuário logado
 * GET /api/auth/me
 */
exports.getCurrentUser = (req, res) => {
  const db = getDatabase();

  db.get('SELECT id, nome, email, tipo, dias_mensalidade, data_vencimento, ativo, data_criacao FROM usuarios WHERE id = ?', 
    [req.user.id], 
    (err, usuario) => {
      if (err || !usuario) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Calcular dias restantes (admins têm acesso ilimitado)
      let diasRestantes = null;
      if (usuario.tipo === 'admin') {
        diasRestantes = null; // null indica ilimitado para admin
      } else if (usuario.data_vencimento) {
        const hoje = new Date();
        const vencimento = new Date(usuario.data_vencimento);
        const diffTime = vencimento - hoje;
        diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diasRestantes < 0) diasRestantes = 0;
      }

      res.json({
        ...usuario,
        diasRestantes
      });
    }
  );
};

