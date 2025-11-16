const { initDatabase, getDatabase } = require('../database/database');

let ultimoTotalJogos = 0;
let inicioMonitoramento = Date.now();

async function verificarProgresso() {
  await initDatabase();
  const db = getDatabase();
  
  const jogosEncontrados = 889;
  
  db.get('SELECT COUNT(*) as total FROM jogos', (err, row) => {
    if (err) {
      console.error('Erro:', err);
      setTimeout(verificarProgresso, 10000);
      return;
    }
    
    const jogosAtuais = row.total;
    const porcentagem = ((jogosAtuais / jogosEncontrados) * 100).toFixed(1);
    const faltam = jogosEncontrados - jogosAtuais;
    const tempoDecorrido = ((Date.now() - inicioMonitoramento) / 1000).toFixed(0);
    
    // Limpar linha anterior
    process.stdout.write('\r\x1b[K');
    
    // Mostrar progresso
    const mudou = jogosAtuais !== ultimoTotalJogos;
    if (mudou) {
      console.log(`\n📊 Progresso atualizado!`);
      ultimoTotalJogos = jogosAtuais;
    }
    
    // Barra de progresso
    const barraTamanho = 40;
    const preenchido = Math.floor((jogosAtuais / jogosEncontrados) * barraTamanho);
    const vazio = barraTamanho - preenchido;
    const barra = '█'.repeat(preenchido) + '░'.repeat(vazio);
    
    process.stdout.write(
      `\r⏱️  ${tempoDecorrido}s | ` +
      `📈 ${porcentagem}% | ` +
      `✅ ${jogosAtuais}/${jogosEncontrados} jogos | ` +
      `⏳ Faltam: ${faltam} | ` +
      `[${barra}]`
    );
    
    // Verificar se terminou
    if (jogosAtuais >= jogosEncontrados) {
      console.log('\n\n✅ SINCRONIZAÇÃO CONCLUÍDA!');
      process.exit(0);
    }
    
    // Verificar se há sincronização registrada
    db.get(
      'SELECT * FROM sincronizacoes ORDER BY data_hora DESC LIMIT 1',
      (err2, ultimaSync) => {
        if (!err2 && ultimaSync) {
          const syncTime = new Date(ultimaSync.data_hora).getTime();
          const agora = Date.now();
          const diffMinutos = (agora - syncTime) / 60000;
          
          if (diffMinutos < 2 && ultimaSync.status === 'sucesso') {
            console.log('\n\n✅ SINCRONIZAÇÃO REGISTRADA NO BANCO!');
            console.log(`   Jogos adicionados: ${ultimaSync.jogos_adicionados}`);
            console.log(`   Contas adicionadas: ${ultimaSync.contas_adicionadas}`);
            process.exit(0);
          }
        }
        
        // Continuar monitorando
        setTimeout(verificarProgresso, 10000); // A cada 10 segundos
      }
    );
  });
}

console.log('\n🔍 Monitorando progresso a cada 10 segundos...');
console.log('   (Pressione Ctrl+C para parar)\n');

// Verificar imediatamente
verificarProgresso();







