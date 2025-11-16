const { getDatabase } = require('../database/database');
const { buscarCapaJogo } = require('../services/capaService');

/**
 * Script para atualizar capas de todos os jogos existentes
 * Busca capas automaticamente para jogos que não têm ou têm capas placeholder
 */

async function atualizarCapasJogos() {
  const db = getDatabase();
  
  return new Promise((resolve, reject) => {
    // Buscar todos os jogos
    db.all('SELECT id, nome, capa FROM jogos', async (err, jogos) => {
      if (err) {
        console.error('❌ Erro ao buscar jogos:', err);
        reject(err);
        return;
      }
      
      if (!jogos || jogos.length === 0) {
        console.log('ℹ️ Nenhum jogo encontrado no banco de dados');
        resolve();
        return;
      }
      
      console.log(`\n🔍 Encontrados ${jogos.length} jogos. Atualizando capas...\n`);
      
      // Atualizar cada jogo
      let atualizados = 0;
      let erros = 0;
      
      for (const jogo of jogos) {
        try {
          // Verificar se precisa atualizar (sem capa, capa placeholder, ou capa do Unsplash Source que não funciona)
          const precisaAtualizar = !jogo.capa || 
                                   jogo.capa.includes('unsplash.com/photo-') || 
                                   jogo.capa.includes('source.unsplash.com') ||
                                   jogo.capa.includes('placeholder');
          
          // Forçar atualização para todos os jogos (remover esta linha se quiser atualizar apenas os que precisam)
          // const precisaAtualizar = true;
          
          if (precisaAtualizar) {
            console.log(`🔍 Buscando capa para: ${jogo.nome}...`);
            
            const novaCapa = await buscarCapaJogo(jogo.nome);
            
            if (novaCapa) {
              // Atualizar no banco de dados
              db.run(
                'UPDATE jogos SET capa = ? WHERE id = ?',
                [novaCapa, jogo.id],
                (err) => {
                  if (err) {
                    console.error(`❌ Erro ao atualizar capa de ${jogo.nome}:`, err);
                    erros++;
                  } else {
                    console.log(`✅ Capa atualizada para: ${jogo.nome}`);
                    atualizados++;
                  }
                }
              );
              
              // Aguardar um pouco para não sobrecarregar a API
              await new Promise(resolve => setTimeout(resolve, 500));
            } else {
              console.log(`⚠️ Não foi possível encontrar capa para: ${jogo.nome}`);
              erros++;
            }
          } else {
            console.log(`⏭️  ${jogo.nome} já tem uma capa, pulando...`);
          }
        } catch (error) {
          console.error(`❌ Erro ao processar ${jogo.nome}:`, error.message);
          erros++;
        }
      }
      
      // Aguardar todas as atualizações terminarem
      setTimeout(() => {
        console.log(`\n✅ Atualização concluída!`);
        console.log(`   - Jogos atualizados: ${atualizados}`);
        console.log(`   - Erros: ${erros}`);
        console.log(`   - Total processado: ${jogos.length}\n`);
        resolve();
      }, 2000);
    });
  });
}

// Se executado diretamente, rodar a atualização
if (require.main === module) {
  const { initDatabase } = require('../database/database');
  
  initDatabase()
    .then(() => {
      console.log('🚀 Iniciando atualização de capas...\n');
      return atualizarCapasJogos();
    })
    .then(() => {
      console.log('✨ Processo finalizado!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Erro fatal:', err);
      process.exit(1);
    });
}

module.exports = { atualizarCapasJogos };

