/**
 * Script para gerar JWT_SECRET seguro
 * Execute: node generate-secret.js
 */

const crypto = require('crypto');

// Gerar chave secreta de 64 caracteres
const secret = crypto.randomBytes(32).toString('hex');

console.log('\n🔐 JWT_SECRET gerado com sucesso!\n');
console.log('Adicione esta linha ao seu arquivo .env:\n');
console.log(`JWT_SECRET=${secret}\n`);
console.log('⚠️  IMPORTANTE: Guarde esta chave em local seguro!\n');
console.log('⚠️  NÃO compartilhe esta chave publicamente!\n');

