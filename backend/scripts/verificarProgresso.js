const { initDatabase, getDatabase } = require('../database/database');

async function verificarProgresso() {
  await initDatabase();
  const db = getDatabase();
  
  // Total de jogos encontrados no site
  const jogosEncontrados = 889;
  
  // Contar jogos atuais no banco
  db.get('SELECT COUNT(*) as total FROM jogos', (err, row) => {
    if (err) {
      console.error('Erro:', err);
      process.exit(1);
    }
    
    const jogosAtuais = row.total;
    const porcentagem = ((jogosAtuais / jogosEncontrados) * 100).toFixed(1);
    const faltam = jogosEncontrados - jogosAtuais;
    
    console.log('\n📊 PROGRESSO DA SINCRONIZAÇÃO:');
    console.log('   🎮 Jogos encontrados no site: ' + jogosEncontrados);
    console.log('   ✅ Jogos já no banco: ' + jogosAtuais);
    console.log('   📈 Progresso: ' + porcentagem + '%');
    console.log('   ⏳ Faltam processar: ' + faltam + ' jogos');
    
    // Barra de progresso visual
    const barraTamanho = 40;
    const preenchido = Math.floor((jogosAtuais / jogosEncontrados) * barraTamanho);
    const vazio = barraTamanho - preenchido;
    const barra = '█'.repeat(preenchido) + '░'.repeat(vazio);
    
    console.log('\n   [' + barra + '] ' + porcentagem + '%\n');
    
    process.exit(0);
  });
}

verificarProgresso().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});







