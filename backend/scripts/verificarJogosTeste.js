const { initDatabase, getDatabase } = require('../database/database');
const PokopowScraper = require('../services/pokopowScraper');

async function verificarJogosTeste() {
  console.log('\n🔍 Verificando jogos de teste no site pokopow.com...\n');
  
  await initDatabase();
  const db = getDatabase();
  const scraper = new PokopowScraper();
  
  // Buscar os 4 primeiros jogos (jogos de teste)
  db.all('SELECT id, nome FROM jogos ORDER BY id LIMIT 4', async (err, jogos) => {
    if (err) {
      console.error('❌ Erro ao buscar jogos:', err);
      process.exit(1);
    }
    
    if (!jogos || jogos.length === 0) {
      console.log('⚠️  Nenhum jogo encontrado no banco');
      process.exit(0);
    }
    
    console.log(`📦 Encontrados ${jogos.length} jogos de teste:\n`);
    
    // Buscar todos os jogos do site
    console.log('🔍 Buscando jogos no site pokopow.com...\n');
    let jogosSite = [];
    
    try {
      jogosSite = await scraper.encontrarTodosJogos();
      console.log(`✅ ${jogosSite.length} jogos encontrados no site\n`);
    } catch (error) {
      console.error('❌ Erro ao buscar jogos do site:', error.message);
      process.exit(1);
    }
    
    // Verificar cada jogo de teste
    for (const jogo of jogos) {
      console.log(`\n📋 Verificando: ${jogo.nome}`);
      console.log('─'.repeat(50));
      
      // Verificar se existe no site (busca por nome similar)
      const jogoNoSite = jogosSite.find(j => {
        const nomeJogo = jogo.nome.toLowerCase();
        const nomeSite = j.nome.toLowerCase();
        
        // Verificar correspondência exata ou parcial
        return nomeSite === nomeJogo || 
               nomeSite.includes(nomeJogo.substring(0, 10)) ||
               nomeJogo.includes(nomeSite.substring(0, 10));
      });
      
      if (jogoNoSite) {
        console.log(`✅ Jogo encontrado no site!`);
        console.log(`   URL: ${jogoNoSite.url}`);
        
        // Verificar contas no banco
        db.all('SELECT COUNT(*) as total FROM contas WHERE jogo_id = ?', [jogo.id], async (err, rows) => {
          const totalContasBanco = rows[0]?.total || 0;
          console.log(`   📊 Contas no banco: ${totalContasBanco}`);
          
          // Extrair credenciais do site
          try {
            console.log(`   🔐 Buscando credenciais no site...`);
            const credenciais = await scraper.extrairCredenciais(jogoNoSite.url);
            
            if (credenciais.length > 0) {
              console.log(`   ✅ ${credenciais.length} credencial(is) encontrada(s) no site:`);
              credenciais.forEach((cred, index) => {
                console.log(`      ${index + 1}. USER: ${cred.user || 'N/A'} | PASS: ${cred.pass ? '***' : 'N/A'}`);
              });
              
              // Comparar com contas do banco
              if (credenciais.length > totalContasBanco) {
                console.log(`   ⚠️  Há ${credenciais.length - totalContasBanco} conta(s) no site que não estão no banco!`);
              } else if (totalContasBanco > credenciais.length) {
                console.log(`   ℹ️  Há ${totalContasBanco - credenciais.length} conta(s) no banco que não estão no site (contas de teste)`);
              } else {
                console.log(`   ✅ Número de contas coincide`);
              }
            } else {
              console.log(`   ⚠️  Nenhuma credencial encontrada no site para este jogo`);
            }
          } catch (error) {
            console.error(`   ❌ Erro ao extrair credenciais:`, error.message);
          }
        });
      } else {
        console.log(`❌ Jogo NÃO encontrado no site pokopow.com`);
        console.log(`   Este jogo foi criado apenas para teste e não existe no site.`);
        
        // Verificar contas no banco
        db.all('SELECT COUNT(*) as total FROM contas WHERE jogo_id = ?', [jogo.id], (err, rows) => {
          const totalContasBanco = rows[0]?.total || 0;
          console.log(`   📊 Contas no banco (de teste): ${totalContasBanco}`);
          if (totalContasBanco > 0) {
            console.log(`   ℹ️  Essas são contas de teste criadas automaticamente.`);
          }
        });
      }
      
      await scraper.sleep(1000); // Delay entre verificações
    }
    
    console.log('\n' + '═'.repeat(50));
    console.log('\n✅ Verificação concluída!\n');
    
    // Resumo
    console.log('📊 RESUMO:');
    console.log('   Os jogos de teste (The Witcher 3, Cyberpunk 2077, GTA V, RDR2)');
    console.log('   foram criados apenas para demonstração do sistema.');
    console.log('   Eles podem ou não existir no site pokopow.com.');
    console.log('   As contas associadas a eles são de teste.\n');
    
    process.exit(0);
  });
}

verificarJogosTeste().catch(err => {
  console.error('❌ Erro:', err);
  process.exit(1);
});







