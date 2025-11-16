const { initDatabase, getDatabase } = require('../database/database');
const PokopowScraper = require('../services/pokopowScraper');

/**
 * Script para limpar títulos genéricos dos jogos existentes no banco
 */
async function limparTitulosJogos() {
  console.log('🧹 Iniciando limpeza de títulos dos jogos...\n');
  
  try {
    // Inicializar banco
    await initDatabase();
    const db = getDatabase();
    const scraper = new PokopowScraper();
    
    // Buscar todos os jogos
    const jogos = await new Promise((resolve, reject) => {
      db.all('SELECT id, nome FROM jogos ORDER BY nome', (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    console.log(`📦 Encontrados ${jogos.length} jogos no banco de dados\n`);
    
    let jogosAtualizados = 0;
    
    for (const jogo of jogos) {
      const nomeOriginal = jogo.nome;
      const nomeLimpo = scraper.limparTituloJogo(nomeOriginal);
      
      // Se o nome mudou, atualizar no banco
      if (nomeLimpo !== nomeOriginal) {
        console.log(`🔄 Atualizando: "${nomeOriginal}" → "${nomeLimpo}"`);
        
        await new Promise((resolve, reject) => {
          db.run(
            'UPDATE jogos SET nome = ? WHERE id = ?',
            [nomeLimpo, jogo.id],
            (err) => {
              if (err) {
                console.error(`❌ Erro ao atualizar jogo ID ${jogo.id}:`, err);
                reject(err);
              } else {
                jogosAtualizados++;
                resolve();
              }
            }
          );
        });
      }
    }
    
    console.log(`\n✅ Limpeza concluída!`);
    console.log(`📊 Estatísticas:`);
    console.log(`   • Total de jogos: ${jogos.length}`);
    console.log(`   • Jogos atualizados: ${jogosAtualizados}`);
    console.log(`   • Jogos sem alteração: ${jogos.length - jogosAtualizados}`);
    
  } catch (error) {
    console.error('❌ Erro durante a limpeza:', error);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  limparTitulosJogos().then(() => {
    console.log('\n🎯 Script finalizado!');
    process.exit(0);
  }).catch(err => {
    console.error('💥 Erro fatal:', err);
    process.exit(1);
  });
}

module.exports = { limparTitulosJogos };



