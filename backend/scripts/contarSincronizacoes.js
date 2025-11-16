const { initDatabase, getDatabase } = require('../database/database');

async function contarSincronizacoes() {
  await initDatabase();
  const db = getDatabase();
  
  // Contar total de sincronizações
  db.get('SELECT COUNT(*) as total FROM sincronizacoes', (err, row) => {
    if (err) {
      console.error('Erro ao contar sincronizações:', err);
      process.exit(1);
    }
    
    const total = row.total;
    console.log(`\n📊 TOTAL DE SINCRONIZAÇÕES NO BANCO: ${total}\n`);
    
    if (total > 0) {
      // Buscar todas as sincronizações
      db.all('SELECT * FROM sincronizacoes ORDER BY data_hora DESC', (err2, syncs) => {
        if (err2) {
          console.error('Erro ao buscar sincronizações:', err2);
          process.exit(1);
        }
        
        console.log('📝 DETALHES DAS SINCRONIZAÇÕES:\n');
        
        // Estatísticas
        const sucesso = syncs.filter(s => s.status === 'sucesso').length;
        const erro = syncs.filter(s => s.status === 'erro').length;
        const automaticas = syncs.filter(s => s.tipo === 'automatica').length;
        const manuais = syncs.filter(s => s.tipo === 'manual').length;
        
        console.log(`   ✅ Sucesso: ${sucesso}`);
        console.log(`   ❌ Erro: ${erro}`);
        console.log(`   🔄 Automáticas: ${automaticas}`);
        console.log(`   👤 Manuais: ${manuais}\n`);
        
        // Listar todas
        syncs.forEach((s, i) => {
          const data = new Date(s.data_hora).toLocaleString('pt-BR');
          console.log(`${i + 1}. ${data}`);
          console.log(`   Tipo: ${s.tipo === 'automatica' ? '🔄 Automática' : '👤 Manual'}`);
          console.log(`   Status: ${s.status === 'sucesso' ? '✅ Sucesso' : '❌ Erro'}`);
          console.log(`   Jogos encontrados: ${s.jogos_encontrados}`);
          console.log(`   Jogos adicionados: ${s.jogos_adicionados}`);
          console.log(`   Contas adicionadas: ${s.contas_adicionadas}`);
          if (s.mensagem) {
            console.log(`   Mensagem: ${s.mensagem}`);
          }
          console.log('');
        });
        
        process.exit(0);
      });
    } else {
      console.log('⚠️  Nenhuma sincronização registrada no banco de dados ainda.\n');
      process.exit(0);
    }
  });
}

contarSincronizacoes().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});







