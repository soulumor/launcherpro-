const { initDatabase, getDatabase } = require('../database/database');

/**
 * Script para remover completamente jogos que terminam com "CDKeys"
 */
async function removerJogosCDKeys() {
  console.log('🗑️  Iniciando remoção de jogos com CDKeys...\n');
  
  try {
    // Inicializar banco
    await initDatabase();
    const db = getDatabase();
    
    // Buscar jogos que terminam com CDKeys
    const jogosCDKeys = await new Promise((resolve, reject) => {
      db.all(`
        SELECT id, nome FROM jogos 
        WHERE nome LIKE '%CDKeys' 
           OR nome LIKE '%CDKeys%'
           OR nome LIKE '%cdkeys'
           OR nome LIKE '%cdkeys%'
        ORDER BY nome
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    console.log(`📦 Encontrados ${jogosCDKeys.length} jogos com CDKeys\n`);
    
    if (jogosCDKeys.length === 0) {
      console.log('✅ Nenhum jogo com CDKeys encontrado!');
      return;
    }
    
    // Mostrar jogos que serão removidos
    console.log('🎯 Jogos que serão removidos:');
    jogosCDKeys.forEach((jogo, index) => {
      console.log(`${index + 1}. [ID: ${jogo.id}] ${jogo.nome}`);
    });
    
    console.log('\n⚠️  Iniciando remoção...\n');
    
    let jogosRemovidos = 0;
    let contasRemovidas = 0;
    
    for (const jogo of jogosCDKeys) {
      console.log(`🗑️  Removendo: ${jogo.nome}`);
      
      // 1. Primeiro, remover todas as contas associadas
      const contasCount = await new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM contas WHERE jogo_id = ?', [jogo.id], (err, row) => {
          if (err) reject(err);
          else resolve(row.count || 0);
        });
      });
      
      if (contasCount > 0) {
        await new Promise((resolve, reject) => {
          db.run('DELETE FROM contas WHERE jogo_id = ?', [jogo.id], (err) => {
            if (err) {
              console.error(`   ❌ Erro ao remover contas do jogo ${jogo.id}:`, err);
              reject(err);
            } else {
              console.log(`   🔐 ${contasCount} conta(s) removida(s)`);
              contasRemovidas += contasCount;
              resolve();
            }
          });
        });
      }
      
      // 2. Depois, remover o jogo
      await new Promise((resolve, reject) => {
        db.run('DELETE FROM jogos WHERE id = ?', [jogo.id], (err) => {
          if (err) {
            console.error(`   ❌ Erro ao remover jogo ${jogo.id}:`, err);
            reject(err);
          } else {
            console.log(`   ✅ Jogo removido com sucesso`);
            jogosRemovidos++;
            resolve();
          }
        });
      });
    }
    
    console.log(`\n🎯 Remoção concluída!`);
    console.log(`📊 Estatísticas:`);
    console.log(`   • Jogos removidos: ${jogosRemovidos}`);
    console.log(`   • Contas removidas: ${contasRemovidas}`);
    console.log(`   • Total de itens removidos: ${jogosRemovidos + contasRemovidas}`);
    
  } catch (error) {
    console.error('❌ Erro durante a remoção:', error);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  removerJogosCDKeys().then(() => {
    console.log('\n🎯 Script finalizado!');
    process.exit(0);
  }).catch(err => {
    console.error('💥 Erro fatal:', err);
    process.exit(1);
  });
}

module.exports = { removerJogosCDKeys };



