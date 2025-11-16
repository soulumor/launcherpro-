const { initDatabase, getDatabase } = require('../database/database');

async function monitorar() {
  await initDatabase();
  const db = getDatabase();
  
  const jogosEncontrados = 889;
  
  console.log('\n🔍 Monitorando progresso... (Pressione Ctrl+C para parar)\n');
  
  setInterval(() => {
    db.get('SELECT COUNT(*) as total FROM jogos', (err, row) => {
      if (err) {
        console.error('Erro:', err);
        return;
      }
      
      const jogosAtuais = row.total;
      const porcentagem = ((jogosAtuais / jogosEncontrados) * 100).toFixed(1);
      const faltam = jogosEncontrados - jogosAtuais;
      
      // Limpar linha e mostrar progresso
      process.stdout.write('\r\x1b[K');
      process.stdout.write(
        `📊 Progresso: ${porcentagem}% | ` +
        `✅ ${jogosAtuais}/${jogosEncontrados} jogos | ` +
        `⏳ Faltam: ${faltam}`
      );
    });
  }, 5000); // Atualiza a cada 5 segundos
}

monitorar().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});







