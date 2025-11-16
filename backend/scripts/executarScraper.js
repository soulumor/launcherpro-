const { initDatabase } = require('../database/database');
const { atualizarJogosEContasOtimizado } = require('../services/atualizarJogosAutomatico');

/**
 * Script para executar o scraper manualmente
 */

console.log('🚀 Iniciando scraper manual...\n');

initDatabase()
  .then(() => {
    console.log('✅ Banco de dados inicializado\n');
    return atualizarJogosEContasOtimizado();
  })
  .then(() => {
    console.log('\n✨ Scraper concluído!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Erro:', err);
    process.exit(1);
  });







