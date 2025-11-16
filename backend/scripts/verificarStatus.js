const { initDatabase, getDatabase } = require('../database/database');

async function verificarStatus() {
  await initDatabase();
  const db = getDatabase();
  
  // Contar jogos
  db.get('SELECT COUNT(*) as total FROM jogos', (err1, jogos) => {
    if (err1) {
      console.error('Erro ao contar jogos:', err1);
      return;
    }
    
    // Contar contas
    db.get('SELECT COUNT(*) as total FROM contas', (err2, contas) => {
      if (err2) {
        console.error('Erro ao contar contas:', err2);
        return;
      }
      
      // Buscar últimas sincronizações
      db.all('SELECT * FROM sincronizacoes ORDER BY data_hora DESC LIMIT 5', (err3, syncs) => {
        if (err3) {
          console.error('Erro ao buscar sincronizações:', err3);
          return;
        }
        
        console.log('\n📊 STATUS ATUAL DO BANCO:');
        console.log('   🎮 Jogos:', jogos.total);
        console.log('   🔐 Contas:', contas.total);
        
        if (syncs.length > 0) {
          console.log('\n📝 Últimas sincronizações:');
          syncs.forEach((s, i) => {
            const data = new Date(s.data_hora).toLocaleString('pt-BR');
            console.log(`\n   ${i+1}. ${data}`);
            console.log(`      Tipo: ${s.tipo}`);
            console.log(`      Status: ${s.status === 'sucesso' ? '✅ Sucesso' : '❌ Erro'}`);
            console.log(`      Jogos: ${s.jogos_encontrados} encontrados, ${s.jogos_adicionados} adicionados`);
            console.log(`      Contas: ${s.contas_adicionadas} adicionadas`);
            if (s.mensagem) {
              console.log(`      Mensagem: ${s.mensagem}`);
            }
          });
        } else {
          console.log('\n⚠️  Nenhuma sincronização registrada ainda.');
        }
        
        console.log('\n');
        process.exit(0);
      });
    });
  });
}

verificarStatus().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});







