/**
 * Script para testar se DATABASE_URL está sendo detectada
 */

console.log('');
console.log('=== TESTE DE DETECÇÃO DATABASE_URL ===');
console.log('');

console.log('🔍 Variáveis de ambiente:');
console.log(`   DATABASE_URL existe: ${!!process.env.DATABASE_URL}`);
if (process.env.DATABASE_URL) {
  const masked = process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@');
  console.log(`   DATABASE_URL: ${masked.substring(0, 80)}...`);
  console.log(`   Tamanho: ${process.env.DATABASE_URL.length} caracteres`);
} else {
  console.log('   ❌ DATABASE_URL não encontrada!');
}
console.log('');

// Testar carregamento do módulo
console.log('🔍 Carregando módulo database...');
try {
  const { initDatabase } = require('../database/database');
  console.log('✅ Módulo carregado');
  console.log('');
  
  initDatabase()
    .then(() => {
      console.log('');
      console.log('=== RESULTADO ===');
      console.log('✅ Banco inicializado com sucesso!');
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Erro:', err.message);
      process.exit(1);
    });
} catch (err) {
  console.error('❌ Erro ao carregar módulo:', err.message);
  process.exit(1);
}








