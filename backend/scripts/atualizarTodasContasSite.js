const { initDatabase, getDatabase } = require('../database/database');
const PokopowScraper = require('../services/pokopowScraper');

async function atualizarTodasContasSite() {
  console.log('\n🚀 ATUALIZANDO TODAS AS CONTAS DO SITE COM SCRAPER MELHORADO\n');
  console.log('📡 Buscando todos os jogos do site pokopow.com...\n');
  
  await initDatabase();
  const db = getDatabase();
  const scraper = new PokopowScraper();
  
  let todosJogosSite = [];
  try {
    todosJogosSite = await scraper.encontrarTodosJogos();
    console.log(`✅ ${todosJogosSite.length} jogos encontrados no site\n`);
  } catch (error) {
    console.error('❌ Erro ao buscar jogos:', error.message);
    process.exit(1);
  }
  
  // Buscar todos os jogos do banco
  db.all('SELECT id, nome FROM jogos', async (err, jogosBanco) => {
    if (err) {
      console.error('❌ Erro ao buscar jogos do banco:', err);
      process.exit(1);
    }
    
    console.log(`📦 ${jogosBanco.length} jogos no banco de dados\n`);
    console.log('🔍 Verificando e atualizando contas de TODOS os jogos...\n');
    console.log('═'.repeat(70));
    
    let totalContasAdicionadas = 0;
    let jogosAtualizados = 0;
    let jogosProcessados = 0;
    
    for (let i = 0; i < jogosBanco.length; i++) {
      const jogoBanco = jogosBanco[i];
      jogosProcessados++;
      
      // Tentar encontrar correspondência no site
      const jogoNoSite = todosJogosSite.find(j => {
        const nomeBanco = jogoBanco.nome.toLowerCase();
        const nomeSite = j.nome.toLowerCase();
        
        // Verificar correspondência exata ou parcial
        return nomeSite === nomeBanco ||
               nomeSite.includes(nomeBanco.substring(0, Math.min(15, nomeBanco.length))) ||
               nomeBanco.includes(nomeSite.substring(0, Math.min(15, nomeSite.length)));
      });
      
      if (jogoNoSite) {
        // Mostrar progresso a cada 10 jogos
        if (jogosProcessados % 10 === 0) {
          console.log(`\n📊 Progresso: ${jogosProcessados}/${jogosBanco.length} jogos processados...\n`);
        }
        
        // Verificar contas existentes
        const contasExistentes = await new Promise((resolve) => {
          db.all('SELECT usuario FROM contas WHERE jogo_id = ?', [jogoBanco.id], (err, rows) => {
            resolve(err ? [] : (rows || []).map(r => r.usuario.toLowerCase()));
          });
        });
        
        const usuariosExistentes = new Set(contasExistentes);
        
        // Extrair credenciais do site (com scraper melhorado)
        try {
          const credenciais = await scraper.extrairCredenciais(jogoNoSite.url);
          
          if (credenciais.length > 0) {
            let contasAdicionadas = 0;
            
            for (const cred of credenciais) {
              if (!cred.user || !cred.pass) continue;
              
              const usuarioLower = cred.user.toLowerCase();
              
              if (usuariosExistentes.has(usuarioLower)) {
                continue; // Já existe
              }
              
              // Adicionar nova conta
              await new Promise((resolve) => {
                db.run(
                  'INSERT INTO contas (jogo_id, usuario, senha, status) VALUES (?, ?, ?, ?)',
                  [jogoBanco.id, cred.user, cred.pass, 'disponivel'],
                  (insertErr) => {
                    if (insertErr) {
                      console.error(`      ❌ Erro ao adicionar conta para ${jogoBanco.nome}:`, insertErr.message);
                    } else {
                      contasAdicionadas++;
                      totalContasAdicionadas++;
                    }
                    resolve();
                  }
                );
              });
            }
            
            if (contasAdicionadas > 0) {
              console.log(`✅ ${jogoBanco.nome}`);
              console.log(`   ➕ ${contasAdicionadas} nova(s) conta(s) | Total: ${usuariosExistentes.size + contasAdicionadas}`);
              jogosAtualizados++;
            }
          }
        } catch (error) {
          // Silenciar erros de timeout, apenas continuar
          if (!error.message.includes('timeout')) {
            console.error(`   ⚠️  ${jogoBanco.nome}: ${error.message}`);
          }
        }
        
        await scraper.sleep(1500); // Delay entre requisições
      }
    }
    
    console.log('\n' + '═'.repeat(70));
    console.log('\n✅ ATUALIZAÇÃO COMPLETA!\n');
    console.log('📊 RESUMO FINAL:');
    console.log(`   📦 Jogos processados: ${jogosProcessados}`);
    console.log(`   ✅ Jogos atualizados: ${jogosAtualizados}`);
    console.log(`   ➕ Total de contas adicionadas: ${totalContasAdicionadas}\n`);
    
    // Estatísticas finais
    db.all(`
      SELECT COUNT(DISTINCT j.id) as total_jogos, COUNT(c.id) as total_contas 
      FROM jogos j 
      LEFT JOIN contas c ON j.id = c.jogo_id
    `, (err, stats) => {
      if (!err && stats && stats[0]) {
        console.log('📈 ESTATÍSTICAS GERAIS:');
        console.log(`   Total de jogos: ${stats[0].total_jogos}`);
        console.log(`   Total de contas: ${stats[0].total_contas}\n`);
      }
      process.exit(0);
    });
  });
}

atualizarTodasContasSite().catch(err => {
  console.error('❌ Erro:', err);
  process.exit(1);
});







