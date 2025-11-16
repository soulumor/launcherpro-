const { initDatabase } = require('../database/database');
const { atualizarJogosEContasOtimizado } = require('../services/atualizarJogosAutomatico');

/**
 * Script para executar uma sincronização GERAL completa
 * Busca TODOS os jogos de TODAS as páginas de uma vez
 */

async function sincronizacaoGeral() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 SINCRONIZAÇÃO GERAL COMPLETA');
  console.log('='.repeat(60));
  console.log('📡 Buscando TODOS os jogos de TODAS as páginas...\n');
  
  try {
    // Inicializar banco de dados
    await initDatabase();
    console.log('✅ Banco de dados inicializado\n');
    
    // Executar sincronização completa
    const inicio = Date.now();
    await atualizarJogosEContasOtimizado();
    const tempoDecorrido = ((Date.now() - inicio) / 1000).toFixed(2);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ SINCRONIZAÇÃO GERAL CONCLUÍDA!');
    console.log(`⏱️  Tempo total: ${tempoDecorrido} segundos`);
    console.log('='.repeat(60) + '\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERRO durante sincronização geral:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Executar
sincronizacaoGeral();







