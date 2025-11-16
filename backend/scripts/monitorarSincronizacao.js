const { initDatabase, getDatabase } = require('../database/database');

/**
 * Script que monitora a sincronização e avisa quando terminar
 */

let ultimoTotalJogos = 0;
let ultimoTotalContas = 0;
let inicioMonitoramento = Date.now();

async function verificarProgresso() {
  await initDatabase();
  const db = getDatabase();
  
  // Contar jogos e contas atuais
  db.get('SELECT COUNT(*) as total FROM jogos', (err1, jogos) => {
    if (err1) {
      console.error('Erro ao contar jogos:', err1);
      return;
    }
    
    db.get('SELECT COUNT(*) as total FROM contas', (err2, contas) => {
      if (err2) {
        console.error('Erro ao contar contas:', err2);
        return;
      }
      
      const totalJogos = jogos.total;
      const totalContas = contas.total;
      
      // Verificar se houve mudança
      if (totalJogos !== ultimoTotalJogos || totalContas !== ultimoTotalContas) {
        const tempoDecorrido = ((Date.now() - inicioMonitoramento) / 1000).toFixed(0);
        console.log(`\n📊 Progresso (${tempoDecorrido}s):`);
        console.log(`   🎮 Jogos: ${totalJogos} (${totalJogos > ultimoTotalJogos ? '+' + (totalJogos - ultimoTotalJogos) : 'sem mudança'})`);
        console.log(`   🔐 Contas: ${totalContas} (${totalContas > ultimoTotalContas ? '+' + (totalContas - ultimoTotalContas) : 'sem mudança'})`);
        
        ultimoTotalJogos = totalJogos;
        ultimoTotalContas = totalContas;
      }
      
      // Verificar se há uma sincronização recente (últimos 2 minutos)
      db.get(
        'SELECT * FROM sincronizacoes ORDER BY data_hora DESC LIMIT 1',
        (err3, ultimaSync) => {
          if (err3) {
            console.error('Erro ao buscar sincronização:', err3);
            setTimeout(verificarProgresso, 10000); // Verificar novamente em 10 segundos
            return;
          }
          
          if (ultimaSync) {
            const syncTime = new Date(ultimaSync.data_hora).getTime();
            const agora = Date.now();
            const diffMinutos = (agora - syncTime) / 60000;
            
            // Se a sincronização foi concluída nos últimos 2 minutos
            if (diffMinutos < 2 && ultimaSync.status === 'sucesso') {
              const tempoTotal = ((Date.now() - inicioMonitoramento) / 60).toFixed(1);
              
              console.log('\n' + '='.repeat(60));
              console.log('✅ SINCRONIZAÇÃO CONCLUÍDA!');
              console.log('='.repeat(60));
              console.log(`⏱️  Tempo total: ${tempoTotal} minutos`);
              console.log(`📦 Jogos encontrados: ${ultimaSync.jogos_encontrados}`);
              console.log(`➕ Jogos adicionados: ${ultimaSync.jogos_adicionados}`);
              console.log(`🔄 Jogos atualizados: ${ultimaSync.jogos_atualizados || 0}`);
              console.log(`🔐 Contas adicionadas: ${ultimaSync.contas_adicionadas}`);
              console.log(`\n📊 Total no banco agora:`);
              console.log(`   🎮 Jogos: ${totalJogos}`);
              console.log(`   🔐 Contas: ${totalContas}`);
              console.log('='.repeat(60) + '\n');
              
              // Beep no Windows
              process.stdout.write('\x07');
              process.stdout.write('\x07');
              process.stdout.write('\x07');
              
              process.exit(0);
            }
          }
          
          // Continuar monitorando
          setTimeout(verificarProgresso, 10000); // Verificar a cada 10 segundos
        }
      );
    });
  });
}

console.log('\n🔍 Monitorando sincronização...');
console.log('   (Verificando a cada 10 segundos)');
console.log('   (Pressione Ctrl+C para parar)\n');

// Verificar imediatamente
verificarProgresso();







