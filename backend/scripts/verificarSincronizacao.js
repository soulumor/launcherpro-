const { getDatabase, initDatabase } = require('../database/database');

async function verificarSincronizacao() {
  console.log('\n📊 Verificando Status da Sincronização\n');
  
  await initDatabase();
  const db = getDatabase();
  
  // Buscar última sincronização
  db.get(
    'SELECT * FROM sincronizacoes ORDER BY data_hora DESC LIMIT 1',
    (err, ultimaSync) => {
      if (err) {
        console.error('❌ Erro ao buscar sincronização:', err);
        return;
      }
      
      if (!ultimaSync) {
        console.log('⚠️  Nenhuma sincronização registrada ainda.');
        console.log('   O sistema ainda não executou nenhuma sincronização automática.');
        console.log('   Aguarde a próxima verificação automática (a cada 60 minutos)');
        console.log('   ou execute uma verificação manual via API.\n');
        return;
      }
      
      console.log('✅ Última Sincronização:');
      console.log(`   Data/Hora: ${new Date(ultimaSync.data_hora).toLocaleString('pt-BR')}`);
      console.log(`   Tipo: ${ultimaSync.tipo === 'automatica' ? '🔄 Automática' : '👤 Manual'}`);
      console.log(`   Status: ${ultimaSync.status === 'sucesso' ? '✅ Sucesso' : '❌ Erro'}`);
      console.log(`   Jogos encontrados no site: ${ultimaSync.jogos_encontrados}`);
      console.log(`   Jogos adicionados: ${ultimaSync.jogos_adicionados}`);
      console.log(`   Contas adicionadas: ${ultimaSync.contas_adicionadas}`);
      
      if (ultimaSync.mensagem) {
        console.log(`   Mensagem: ${ultimaSync.mensagem}`);
      }
      
      // Calcular tempo desde última sincronização
      const agora = new Date();
      const ultimaSyncDate = new Date(ultimaSync.data_hora);
      const diffMs = agora - ultimaSyncDate;
      const diffMinutos = Math.floor(diffMs / 60000);
      const diffHoras = Math.floor(diffMinutos / 60);
      
      if (diffMinutos < 1) {
        console.log(`   ⏱️  Há menos de 1 minuto`);
      } else if (diffMinutos < 60) {
        console.log(`   ⏱️  Há ${diffMinutos} minuto(s)`);
      } else {
        console.log(`   ⏱️  Há ${diffHoras} hora(s) e ${diffMinutos % 60} minuto(s)`);
      }
      
      console.log('\n');
      
      // Buscar estatísticas
      db.all(
        `SELECT 
          COUNT(*) as total_jogos,
          (SELECT COUNT(*) FROM contas) as total_contas,
          (SELECT COUNT(*) FROM sincronizacoes WHERE status = 'sucesso') as sincronizacoes_sucesso,
          (SELECT COUNT(*) FROM sincronizacoes WHERE status = 'erro') as sincronizacoes_erro
         FROM jogos`,
        (err, stats) => {
          if (err) {
            console.error('❌ Erro ao buscar estatísticas:', err);
            return;
          }
          
          const estatisticas = stats[0] || {};
          
          console.log('📈 Estatísticas Gerais:');
          console.log(`   Total de jogos no banco: ${estatisticas.total_jogos || 0}`);
          console.log(`   Total de contas no banco: ${estatisticas.total_contas || 0}`);
          console.log(`   Sincronizações com sucesso: ${estatisticas.sincronizacoes_sucesso || 0}`);
          console.log(`   Sincronizações com erro: ${estatisticas.sincronizacoes_erro || 0}`);
          console.log('\n');
        }
      );
    }
  );
}

if (require.main === module) {
  verificarSincronizacao().catch(err => {
    console.error('Erro:', err);
    process.exit(1);
  });
} else {
  module.exports = verificarSincronizacao;
}







