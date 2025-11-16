/**
 * Logger de auditoria para eventos de segurança
 */

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '../logs');
const AUDIT_LOG_FILE = path.join(LOG_DIR, 'audit.log');

// Garantir que o diretório de logs existe
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Formata timestamp
 */
function getTimestamp() {
  return new Date().toISOString();
}

/**
 * Obtém IP do cliente
 */
function getClientIP(req) {
  return req.ip || 
         req.connection.remoteAddress || 
         req.headers['x-forwarded-for']?.split(',')[0] || 
         'unknown';
}

/**
 * Registra tentativa de login
 */
function logLoginAttempt(req, success, email, reason = null) {
  const ip = getClientIP(req);
  const timestamp = getTimestamp();
  const userAgent = req.headers['user-agent'] || 'unknown';
  
  const logEntry = {
    timestamp,
    event: 'LOGIN_ATTEMPT',
    success,
    email: email ? email.substring(0, 50) : 'unknown', // Limitar tamanho
    ip,
    userAgent: userAgent.substring(0, 200), // Limitar tamanho
    reason: reason || (success ? 'SUCCESS' : 'FAILED')
  };

  const logLine = JSON.stringify(logEntry) + '\n';
  
  try {
    fs.appendFileSync(AUDIT_LOG_FILE, logLine, 'utf8');
  } catch (err) {
    console.error('Erro ao escrever log de auditoria:', err);
  }

  // Também logar no console em desenvolvimento
  if (process.env.NODE_ENV !== 'production') {
    console.log(`🔐 ${success ? '✅' : '❌'} Login ${success ? 'bem-sucedido' : 'falhado'}: ${email} (IP: ${ip})`);
  }
}

/**
 * Registra criação de usuário
 */
function logUserCreation(req, adminEmail, newUserEmail) {
  const ip = getClientIP(req);
  const timestamp = getTimestamp();
  
  const logEntry = {
    timestamp,
    event: 'USER_CREATED',
    adminEmail: adminEmail?.substring(0, 50),
    newUserEmail: newUserEmail?.substring(0, 50),
    ip
  };

  const logLine = JSON.stringify(logEntry) + '\n';
  
  try {
    fs.appendFileSync(AUDIT_LOG_FILE, logLine, 'utf8');
  } catch (err) {
    console.error('Erro ao escrever log de auditoria:', err);
  }
}

/**
 * Registra deleção/desativação de usuário
 */
function logUserDeletion(req, adminEmail, deletedUserEmail) {
  const ip = getClientIP(req);
  const timestamp = getTimestamp();
  
  const logEntry = {
    timestamp,
    event: 'USER_DELETED',
    adminEmail: adminEmail?.substring(0, 50),
    deletedUserEmail: deletedUserEmail?.substring(0, 50),
    ip
  };

  const logLine = JSON.stringify(logEntry) + '\n';
  
  try {
    fs.appendFileSync(AUDIT_LOG_FILE, logLine, 'utf8');
  } catch (err) {
    console.error('Erro ao escrever log de auditoria:', err);
  }
}

module.exports = {
  logLoginAttempt,
  logUserCreation,
  logUserDeletion,
  getClientIP
};

