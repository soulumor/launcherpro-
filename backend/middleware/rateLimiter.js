/**
 * Rate Limiter para proteger contra brute force attacks
 */

// Armazenar tentativas de login por IP
const loginAttempts = new Map();

// Limpar tentativas antigas a cada 15 minutos
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of loginAttempts.entries()) {
    if (now - data.lastAttempt > 15 * 60 * 1000) {
      loginAttempts.delete(ip);
    }
  }
}, 15 * 60 * 1000);

/**
 * Middleware para limitar tentativas de login
 * Bloqueia após 5 tentativas falhadas em 15 minutos
 */
function loginRateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  
  // Obter ou criar registro de tentativas para este IP
  let attempts = loginAttempts.get(ip);
  
  if (!attempts) {
    attempts = { count: 0, lastAttempt: now, blockedUntil: null };
    loginAttempts.set(ip, attempts);
  }
  
  // Verificar se está bloqueado
  if (attempts.blockedUntil && now < attempts.blockedUntil) {
    const minutesLeft = Math.ceil((attempts.blockedUntil - now) / 60000);
    return res.status(429).json({ 
      error: 'Muitas tentativas de login. Tente novamente em ' + minutesLeft + ' minuto(s).' 
    });
  }
  
  // Resetar contador se passou muito tempo desde a última tentativa
  if (now - attempts.lastAttempt > 15 * 60 * 1000) {
    attempts.count = 0;
    attempts.blockedUntil = null;
  }
  
  // Verificar limite (5 tentativas)
  if (attempts.count >= 5) {
    // Bloquear por 15 minutos
    attempts.blockedUntil = now + (15 * 60 * 1000);
    return res.status(429).json({ 
      error: 'Muitas tentativas de login falhadas. Acesso bloqueado por 15 minutos.' 
    });
  }
  
  // Adicionar função para registrar tentativa falhada
  req.recordFailedLogin = () => {
    attempts.count++;
    attempts.lastAttempt = now;
    loginAttempts.set(ip, attempts);
  };
  
  // Adicionar função para limpar tentativas (login bem-sucedido)
  req.clearLoginAttempts = () => {
    loginAttempts.delete(ip);
  };
  
  next();
}

module.exports = { loginRateLimiter };

