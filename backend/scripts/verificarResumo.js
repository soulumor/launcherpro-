const { initDatabase, getDatabase } = require('../database/database');

async function verificarResumo() {
  await initDatabase();
  const db = getDatabase();
  
  // Jogos de teste
  db.all(`
    SELECT j.nome, COUNT(c.id) as total_contas 
    FROM jogos j 
    LEFT JOIN contas c ON j.id = c.jogo_id 
    WHERE j.nome IN ('Grand Theft Auto V', 'The Witcher 3: Wild Hunt', 'Red Dead Redemption 2', 'Cyberpunk 2077')
    GROUP BY j.id, j.nome
  `, (err, rows) => {
    if (err) {
      console.error('Erro:', err);
      process.exit(1);
    }
    
    console.log('\n📊 JOGOS DE TESTE - Contas no banco:\n');
    rows.forEach(r => {
      console.log(`   ${r.nome}: ${r.total_contas} conta(s)`);
    });
    
    // Resumo geral
    db.all(`
      SELECT COUNT(DISTINCT j.id) as total_jogos, COUNT(c.id) as total_contas 
      FROM jogos j 
      LEFT JOIN contas c ON j.id = c.jogo_id
    `, (err, stats) => {
      if (err) {
        process.exit(0);
      }
      
      const s = stats[0];
      console.log('\n📊 RESUMO GERAL DO SISTEMA:\n');
      console.log(`   Total de jogos: ${s.total_jogos}`);
      console.log(`   Total de contas: ${s.total_contas}`);
      console.log('\n✅ Sistema atualizado e funcionando!\n');
      process.exit(0);
    });
  });
}

verificarResumo();







