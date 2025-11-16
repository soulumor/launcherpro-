const { initDatabase, getDatabase } = require('../database/database');
const PokopowScraper = require('../services/pokopowScraper');

async function atualizarContasJogosEspecificos() {
  console.log('\n🔍 Atualizando contas de jogos específicos (incluindo botões LOGIN)...\n');
  
  await initDatabase();
  const db = getDatabase();
  const scraper = new PokopowScraper();
  
  // Buscar jogos que podem ter contas no site
  // Primeiro, buscar todos os jogos do site
  console.log('📡 Buscando jogos no site pokopow.com...\n');
  
  let todosJogosSite = [];
  try {
    todosJogosSite = await scraper.encontrarTodosJogos();
    console.log(`✅ ${todosJogosSite.length} jogos encontrados no site\n`);
  } catch (error) {
    console.error('❌ Erro ao buscar jogos:', error.message);
    process.exit(1);
  }
  
  // Buscar jogos no banco que podem corresponder
  db.all('SELECT id, nome FROM jogos', async (err, jogosBanco) => {
    if (err) {
      console.error('❌ Erro ao buscar jogos do banco:', err);
      process.exit(1);
    }
    
    console.log(`📦 ${jogosBanco.length} jogos no banco de dados\n`);
    console.log('🔍 Verificando e atualizando contas...\n');
    
    let totalContasAdicionadas = 0;
    let jogosAtualizados = 0;
    
    for (const jogoBanco of jogosBanco) {
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
        console.log(`\n📋 ${jogoBanco.nome}`);
        console.log(`   📍 URL: ${jogoNoSite.url}`);
        
        // Verificar contas existentes
        const contasExistentes = await new Promise((resolve) => {
          db.all('SELECT usuario FROM contas WHERE jogo_id = ?', [jogoBanco.id], (err, rows) => {
            resolve(err ? [] : (rows || []).map(r => r.usuario.toLowerCase()));
          });
        });
        
        const usuariosExistentes = new Set(contasExistentes);
        console.log(`   📊 Contas existentes: ${usuariosExistentes.size}`);
        
        // Extrair credenciais do site (incluindo botões LOGIN)
        try {
          const credenciais = await scraper.extrairCredenciais(jogoNoSite.url);
          
          if (credenciais.length > 0) {
            console.log(`   ✅ ${credenciais.length} credencial(is) encontrada(s) no site`);
            
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
                      console.error(`      ❌ Erro ao adicionar conta:`, insertErr);
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
              console.log(`   ➕ ${contasAdicionadas} nova(s) conta(s) adicionada(s)`);
              jogosAtualizados++;
            } else {
              console.log(`   ℹ️  Todas as contas já existem no banco`);
            }
          } else {
            console.log(`   ⚠️  Nenhuma credencial encontrada`);
          }
        } catch (error) {
          console.error(`   ❌ Erro ao extrair credenciais:`, error.message);
        }
        
        await scraper.sleep(2000); // Delay entre requisições
      }
    }
    
    console.log('\n' + '═'.repeat(60));
    console.log('\n✅ Atualização concluída!');
    console.log(`   📊 Jogos atualizados: ${jogosAtualizados}`);
    console.log(`   ➕ Total de contas adicionadas: ${totalContasAdicionadas}\n`);
    
    process.exit(0);
  });
}

atualizarContasJogosEspecificos().catch(err => {
  console.error('❌ Erro:', err);
  process.exit(1);
});







