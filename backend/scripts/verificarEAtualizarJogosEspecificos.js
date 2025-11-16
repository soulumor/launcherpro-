const { initDatabase, getDatabase } = require('../database/database');
const PokopowScraper = require('../services/pokopowScraper');

async function verificarEAtualizarJogosEspecificos() {
  console.log('\n🔍 Verificando jogos específicos no site pokopow.com...\n');
  
  await initDatabase();
  const db = getDatabase();
  const scraper = new PokopowScraper();
  
  // Jogos a verificar
  const jogosParaVerificar = [
    { nome: 'Grand Theft Auto V', variacoes: ['gta v', 'gta 5', 'grand theft auto v', 'grand theft auto 5'] },
    { nome: 'The Witcher 3: Wild Hunt', variacoes: ['the witcher 3', 'witcher 3', 'the witcher 3 wild hunt'] },
    { nome: 'Red Dead Redemption 2', variacoes: ['red dead redemption 2', 'red dead redemption ii', 'rdr2'] },
    { nome: 'Cyberpunk 2077', variacoes: ['cyberpunk 2077', 'cyberpunk'] }
  ];
  
  console.log('📡 Buscando TODOS os jogos no site (isso pode levar alguns minutos)...\n');
  
  // Buscar todos os jogos uma vez
  let todosJogosSite = [];
  try {
    todosJogosSite = await scraper.encontrarTodosJogos();
    console.log(`✅ ${todosJogosSite.length} jogos encontrados no site\n`);
  } catch (error) {
    console.error('❌ Erro ao buscar jogos:', error.message);
    process.exit(1);
  }
  
  // Verificar cada jogo
  for (const jogoInfo of jogosParaVerificar) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📋 Verificando: ${jogoInfo.nome}`);
    console.log('─'.repeat(60));
    
    // Buscar jogo no banco
    db.get('SELECT id, nome FROM jogos WHERE nome = ?', [jogoInfo.nome], async (err, jogoBanco) => {
      if (err) {
        console.error(`   ❌ Erro ao buscar jogo no banco:`, err);
        return;
      }
      
      if (!jogoBanco) {
        console.log(`   ⚠️  Jogo não encontrado no banco de dados`);
        return;
      }
      
      console.log(`   ✅ Jogo encontrado no banco (ID: ${jogoBanco.id})`);
      
      // Verificar contas existentes no banco
      db.all('SELECT usuario FROM contas WHERE jogo_id = ?', [jogoBanco.id], async (err, contasBanco) => {
        const usuariosExistentes = new Set((contasBanco || []).map(c => c.usuario.toLowerCase()));
        console.log(`   📊 Contas no banco: ${usuariosExistentes.size}`);
        
        // Buscar jogo no site usando variações do nome
        let jogoNoSite = null;
        for (const variacao of jogoInfo.variacoes) {
          jogoNoSite = todosJogosSite.find(j => {
            const nomeSite = j.nome.toLowerCase();
            const nomeJogo = jogoInfo.nome.toLowerCase();
            // Verificar correspondência exata, parcial ou por palavras-chave
            return nomeSite === nomeJogo ||
                   nomeSite.includes(variacao) || 
                   variacao.includes(nomeSite.substring(0, Math.min(15, nomeSite.length))) ||
                   nomeSite.includes('gta') && variacao.includes('gta') ||
                   nomeSite.includes('witcher') && variacao.includes('witcher') ||
                   nomeSite.includes('red dead') && variacao.includes('red dead') ||
                   nomeSite.includes('cyberpunk') && variacao.includes('cyberpunk');
          });
          if (jogoNoSite) break;
        }
        
        if (jogoNoSite) {
          console.log(`   ✅ Jogo encontrado no site!`);
          console.log(`   📍 URL: ${jogoNoSite.url}`);
          
          // Extrair credenciais
          try {
            console.log(`   🔐 Extraindo credenciais do site (incluindo botões LOGIN)...`);
            const credenciais = await scraper.extrairCredenciais(jogoNoSite.url);
            
            if (credenciais.length > 0) {
              console.log(`   ✅ ${credenciais.length} credencial(is) encontrada(s) no site!`);
              
              let contasAdicionadas = 0;
              let contasJaExistentes = 0;
              
              // Adicionar novas contas
              for (const cred of credenciais) {
                if (!cred.user || !cred.pass) continue;
                
                const usuarioLower = cred.user.toLowerCase();
                
                if (usuariosExistentes.has(usuarioLower)) {
                  contasJaExistentes++;
                  continue;
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
                        console.log(`      ✅ Conta adicionada: ${cred.user}`);
                        contasAdicionadas++;
                      }
                      resolve();
                    }
                  );
                });
              }
              
              console.log(`\n   📊 RESUMO:`);
              console.log(`      ➕ Contas adicionadas: ${contasAdicionadas}`);
              console.log(`      ⏭️  Contas já existentes: ${contasJaExistentes}`);
              console.log(`      📦 Total de contas agora: ${usuariosExistentes.size + contasAdicionadas}`);
              
            } else {
              console.log(`   ⚠️  Nenhuma credencial encontrada no site para este jogo`);
            }
          } catch (error) {
            console.error(`   ❌ Erro ao extrair credenciais:`, error.message);
          }
        } else {
          console.log(`   ❌ Jogo NÃO encontrado no site pokopow.com`);
          console.log(`   ℹ️  Este jogo pode não estar disponível no site ou ter nome diferente`);
        }
        
        await scraper.sleep(2000); // Delay entre jogos
      });
    });
    
    await scraper.sleep(1000);
  }
  
  // Aguardar um pouco para as operações assíncronas completarem
  setTimeout(() => {
    console.log('\n' + '═'.repeat(60));
    console.log('\n✅ Verificação e atualização concluídas!\n');
    
    // Mostrar resumo final
    db.all(`
      SELECT j.nome, COUNT(c.id) as total_contas 
      FROM jogos j 
      LEFT JOIN contas c ON j.id = c.jogo_id 
      WHERE j.nome IN ('Grand Theft Auto V', 'The Witcher 3: Wild Hunt', 'Red Dead Redemption 2', 'Cyberpunk 2077')
      GROUP BY j.id, j.nome
    `, (err, rows) => {
      if (!err && rows) {
        console.log('📊 RESUMO FINAL - Contas por jogo:');
        rows.forEach(r => {
          console.log(`   ${r.nome}: ${r.total_contas} conta(s)`);
        });
      }
      console.log('\n');
      process.exit(0);
    });
  }, 15000);
}

verificarEAtualizarJogosEspecificos().catch(err => {
  console.error('❌ Erro:', err);
  process.exit(1);
});

