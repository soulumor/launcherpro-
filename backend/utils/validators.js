/**
 * Utilitários de validação e sanitização
 */

/**
 * Valida força da senha
 * Requisitos: mínimo 8 caracteres, pelo menos 1 maiúscula, 1 minúscula e 1 número
 */
function validatePasswordStrength(senha) {
  if (!senha || typeof senha !== 'string') {
    return { valid: false, error: 'Senha é obrigatória' };
  }

  if (senha.length < 8) {
    return { valid: false, error: 'Senha deve ter no mínimo 8 caracteres' };
  }

  if (!/[A-Z]/.test(senha)) {
    return { valid: false, error: 'Senha deve conter pelo menos uma letra maiúscula' };
  }

  if (!/[a-z]/.test(senha)) {
    return { valid: false, error: 'Senha deve conter pelo menos uma letra minúscula' };
  }

  if (!/[0-9]/.test(senha)) {
    return { valid: false, error: 'Senha deve conter pelo menos um número' };
  }

  if (senha.length > 128) {
    return { valid: false, error: 'Senha não pode ter mais de 128 caracteres' };
  }

  return { valid: true };
}

/**
 * Valida formato de email
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Valida e sanitiza nome
 */
function validateAndSanitizeName(nome) {
  if (!nome || typeof nome !== 'string') {
    return { valid: false, error: 'Nome é obrigatório', sanitized: null };
  }

  const trimmed = nome.trim();
  
  if (trimmed.length < 2) {
    return { valid: false, error: 'Nome deve ter no mínimo 2 caracteres', sanitized: null };
  }

  if (trimmed.length > 100) {
    return { valid: false, error: 'Nome não pode ter mais de 100 caracteres', sanitized: null };
  }

  // Remover caracteres perigosos mas manter acentos e espaços
  const sanitized = trimmed.replace(/[<>\"'%;()&+]/g, '');

  return { valid: true, sanitized };
}

/**
 * Valida e sanitiza email
 */
function validateAndSanitizeEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email é obrigatório', sanitized: null };
  }

  const trimmed = email.trim().toLowerCase();
  
  if (trimmed.length > 255) {
    return { valid: false, error: 'Email não pode ter mais de 255 caracteres', sanitized: null };
  }

  if (!isValidEmail(trimmed)) {
    return { valid: false, error: 'Formato de email inválido', sanitized: null };
  }

  return { valid: true, sanitized: trimmed };
}

/**
 * Valida número inteiro positivo
 */
function validatePositiveInteger(value, fieldName = 'Valor') {
  if (value === undefined || value === null) {
    return { valid: false, error: `${fieldName} é obrigatório` };
  }

  const num = parseInt(value, 10);
  
  if (isNaN(num)) {
    return { valid: false, error: `${fieldName} deve ser um número válido` };
  }

  if (num < 0) {
    return { valid: false, error: `${fieldName} deve ser um número positivo` };
  }

  if (num > 10000) {
    return { valid: false, error: `${fieldName} não pode ser maior que 10000` };
  }

  return { valid: true, value: num };
}

/**
 * Sanitiza string removendo caracteres perigosos
 */
function sanitizeString(str) {
  if (!str || typeof str !== 'string') {
    return '';
  }
  return str.trim().replace(/[<>\"'%;()&+]/g, '');
}

module.exports = {
  validatePasswordStrength,
  isValidEmail,
  validateAndSanitizeName,
  validateAndSanitizeEmail,
  validatePositiveInteger,
  sanitizeString
};

