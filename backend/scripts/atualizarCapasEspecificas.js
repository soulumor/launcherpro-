const { initDatabase, getDatabase } = require('../database/database');
const { buscarCapaJogo } = require('../services/capaService');

/**
 * Script para atualizar capas de jogos específicos
 */

async function atualizarCapasEspecificas() {
  const db = getDatabase();
  
  const jogosParaAtualizar = [
    'Peak',
    'Battlefield 6'
  ];
  
  console.log('🔍 Atualizando capas de jogos específicos...\n');
  
  for (const nomeJogo of jogosParaAtualizar) {
    console.log(`Buscando capa para: ${nomeJogo}...`);
    
    // Buscar capa com múltiplas tentativas
    let capa = null;
    
    // Tentar com o nome original
    capa = await buscarCapaJogo(nomeJogo);
    
    // Se não encontrou, tentar variações
    if (!capa || capa.includes('unsplash') || capa.includes('placeholder')) {
      if (nomeJogo === 'Peak') {
        // Tentar buscar "PEAK" (maiúsculas)
        capa = await buscarCapaJogo('PEAK');
      }
      
      if (nomeJogo === 'Battlefield 6') {
        // Tentar buscar "Battlefield 2042" que é o jogo mais recente
        capa = await buscarCapaJogo('Battlefield 2042');
        if (!capa || capa.includes('unsplash')) {
          capa = await buscarCapaJogo('Battlefield');
        }
      }
    }
    
    // Atualizar no banco
    if (capa && !capa.includes('unsplash') && !capa.includes('placeholder')) {
      db.run(
        'UPDATE jogos SET capa = ? WHERE nome = ?',
        [capa, nomeJogo],
        function(err) {
          if (err) {
            console.error(`   ❌ Erro ao atualizar ${nomeJogo}:`, err);
          } else {
            console.log(`   ✅ Capa atualizada para: ${nomeJogo}`);
            console.log(`      URL: ${capa}`);
          }
        }
      );
    } else {
      console.log(`   ⚠️  Não foi possível encontrar capa oficial para: ${nomeJogo}`);
    }
    
    // Delay entre requisições
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Aguardar atualizações
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('\n✅ Atualização concluída!\n');
}

// Executar
initDatabase()
  .then(() => {
    return atualizarCapasEspecificas();
  })
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Erro:', err);
    process.exit(1);
  });







