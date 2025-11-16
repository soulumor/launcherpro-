const { initDatabase, getDatabase } = require('../database/database');
const PokopowScraper = require('../services/pokopowScraper');

/**
 * Script completo: Limpa contas inválidas E atualiza com contas corretas
 * Versão otimizada com processamento paralelo
 */
async function limparEAtualizarContas() {
  console.log('\n🧹⚡ LIMPEZA E ATUALIZAÇÃO DE CONTAS - MODO RÁPIDO\n');
  console.log('═'.repeat(70));
  
  await initDatabase();
  const db = getDatabase();
  const scraper = new PokopowScraper();
  
  // ============================================
  // ETAPA 1: LIMPEZA DE CONTAS INVÁLIDAS
  // ============================================
  console.log('\n📋 ETAPA 1: Limpando contas inválidas...\n');
  
  const contasRemovidas = await new Promise((resolve, reject) => {
    db.all('SELECT * FROM contas', async (err, contas) => {
      if (err) {
        reject(err);
        return;
      }
      
      console.log(`📊 Total de contas no banco: ${contas.length}\n`);
      
      if (contas.length === 0) {
        console.log('✅ Nenhuma conta para verificar.\n');
        resolve(0);
        return;
      }
      
      const valoresInvalidos = ['pass', 'password', 'senha', 'user', 'login', 'username', 'usuario'];
      let contasRemovidas = 0;
      const promessas = [];
      
      for (const conta of contas) {
        const usuarioLower = (conta.usuario || '').trim().toLowerCase();
        const senhaLower = (conta.senha || '').trim().toLowerCase();
        
        // Validar usuário
        const usuarioInvalido = !conta.usuario || 
                                conta.usuario.trim().length < 3 ||
                                valoresInvalidos.includes(usuarioLower) ||
                                usuarioLower === 'user' ||
                                usuarioLower === 'login' ||
                                usuarioLower.startsWith('pass') ||
                                (usuarioLower.includes('user') && usuarioLower.length < 10);
        
        // Validar senha - mais rigoroso
        const senhaInvalida = !conta.senha || 
                            conta.senha.trim().length < 3 ||
                            valoresInvalidos.includes(senhaLower) ||
                            senhaLower === 'pass' ||
                            senhaLower === 'password' ||
                            senhaLower === 'senha' ||
                            senhaLower.startsWith('pass') ||
                            senhaLower.endsWith('pass') ||
                            (/\bpass\b/i.test(conta.senha.trim()) && conta.senha.trim().length <= 10) ||
                            senhaLower.includes('user') ||
                            senhaLower.includes('login');
        
        if (usuarioInvalido || senhaInvalida) {
          console.log(`❌ Removendo: "${conta.usuario}" / "${conta.senha}"`);
          
          const promessa = new Promise((resolveDelete) => {
            db.run('DELETE FROM contas WHERE id = ?', [conta.id], (deleteErr) => {
              if (deleteErr) {
                console.error(`   ❌ Erro ao remover conta ${conta.id}:`, deleteErr);
              } else {
                contasRemovidas++;
              }
              resolveDelete();
            });
          });
          
          promessas.push(promessa);
        }
      }
      
      Promise.all(promessas).then(() => {
        console.log(`\n✅ Limpeza concluída!`);
        console.log(`   Contas removidas: ${contasRemovidas}`);
        console.log(`   Contas válidas restantes: ${contas.length - contasRemovidas}\n`);
        resolve(contasRemovidas);
      });
    });
  });
  
  // ============================================
  // ETAPA 2: IDENTIFICAR JOGOS QUE PRECISAM ATUALIZAÇÃO
  // ============================================
  console.log('\n📋 ETAPA 2: Identificando jogos que precisam de atualização...\n');
  
  const jogosParaAtualizar = await new Promise((resolve, reject) => {
    // Buscar jogos que tiveram contas removidas OU que não têm contas válidas
    db.all(`
      SELECT DISTINCT j.id, j.nome, COUNT(c.id) as total_contas
      FROM jogos j
      LEFT JOIN contas c ON j.id = c.jogo_id
      GROUP BY j.id, j.nome
      HAVING total_contas = 0 OR total_contas < 3
      ORDER BY j.nome
    `, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
  
  if (jogosParaAtualizar.length === 0) {
    console.log('✅ Todos os jogos já têm contas válidas!\n');
    process.exit(0);
  }
  
  console.log(`📋 ${jogosParaAtualizar.length} jogos precisam de atualização\n`);
  
  // ============================================
  // ETAPA 3: BUSCAR JOGOS DO SITE
  // ============================================
  console.log('📡 Buscando lista de jogos do site pokopow.com...\n');
  let todosJogosSite = [];
  try {
    todosJogosSite = await scraper.encontrarTodosJogos();
    console.log(`✅ ${todosJogosSite.length} jogos encontrados no site\n`);
  } catch (error) {
    console.error('❌ Erro ao buscar jogos:', error.message);
    process.exit(1);
  }
  
  // Criar mapa para busca rápida
  const mapaJogosSite = new Map();
  todosJogosSite.forEach(jogo => {
    const nomeLower = jogo.nome.toLowerCase();
    mapaJogosSite.set(nomeLower, jogo);
    const nomeSemEspacos = nomeLower.replace(/\s+/g, '');
    if (nomeSemEspacos !== nomeLower) {
      mapaJogosSite.set(nomeSemEspacos, jogo);
    }
  });
  
  // ============================================
  // ETAPA 4: ATUALIZAR CONTAS EM PARALELO
  // ============================================
  console.log('🚀 ETAPA 3: Atualizando contas em paralelo...\n');
  console.log('═'.repeat(70));
  
  const tamanhoLote = 5;
  const maxConcorrencia = 3;
  const delayEntreLotes = 1000;
  const delayEntreRequisicoes = 800;
  
  let totalContasAdicionadas = 0;
  let jogosAtualizados = 0;
  let jogosProcessados = 0;
  
  for (let i = 0; i < jogosParaAtualizar.length; i += tamanhoLote) {
    const lote = jogosParaAtualizar.slice(i, i + tamanhoLote);
    const numeroLote = Math.floor(i / tamanhoLote) + 1;
    const totalLotes = Math.ceil(jogosParaAtualizar.length / tamanhoLote);
    
    console.log(`\n📦 LOTE ${numeroLote}/${totalLotes} - Processando ${lote.length} jogos...\n`);
    
    for (let j = 0; j < lote.length; j += maxConcorrencia) {
      const grupo = lote.slice(j, j + maxConcorrencia);
      
      const promessas = grupo.map(async (jogoBanco) => {
        jogosProcessados++;
        
        const nomeLower = jogoBanco.nome.toLowerCase();
        const jogoNoSite = mapaJogosSite.get(nomeLower) || 
                          mapaJogosSite.get(nomeLower.replace(/\s+/g, '')) ||
                          todosJogosSite.find(j => {
                            const nomeSite = j.nome.toLowerCase();
                            return nomeSite === nomeLower ||
                                   nomeSite.includes(nomeLower.substring(0, Math.min(15, nomeLower.length))) ||
                                   nomeLower.includes(nomeSite.substring(0, Math.min(15, nomeSite.length)));
                          });
        
        if (!jogoNoSite) {
          return { jogo: jogoBanco.nome, status: 'nao_encontrado', contas: 0 };
        }
        
        try {
          const contasExistentes = await new Promise((resolve) => {
            db.all('SELECT usuario FROM contas WHERE jogo_id = ?', [jogoBanco.id], (err, rows) => {
              resolve(err ? [] : (rows || []).map(r => r.usuario.toLowerCase()));
            });
          });
          
          const usuariosExistentes = new Set(contasExistentes);
          const credenciais = await scraper.extrairCredenciais(jogoNoSite.url);
          
          if (credenciais.length === 0) {
            return { jogo: jogoBanco.nome, status: 'sem_credenciais', contas: 0 };
          }
          
          let contasAdicionadas = 0;
          const promessasInsercao = [];
          
          for (const cred of credenciais) {
            if (!cred.user || !cred.pass) continue;
            
            const usuarioLower = cred.user.toLowerCase();
            const senhaLower = cred.pass.toLowerCase();
            
            const senhaInvalida = senhaLower === 'pass' || 
                                 senhaLower === 'password' || 
                                 senhaLower === 'senha' ||
                                 senhaLower.startsWith('pass') ||
                                 senhaLower.endsWith('pass') ||
                                 (/\bpass\b/i.test(cred.pass.trim()) && cred.pass.trim().length <= 10);
            
            if (senhaInvalida) continue;
            
            if (usuariosExistentes.has(usuarioLower)) {
              continue;
            }
            
            const promessa = new Promise((resolve) => {
              db.run(
                'INSERT INTO contas (jogo_id, usuario, senha, status) VALUES (?, ?, ?, ?)',
                [jogoBanco.id, cred.user, cred.pass, 'disponivel'],
                (insertErr) => {
                  if (!insertErr) {
                    contasAdicionadas++;
                  }
                  resolve();
                }
              );
            });
            
            promessasInsercao.push(promessa);
          }
          
          await Promise.all(promessasInsercao);
          
          if (contasAdicionadas > 0) {
            totalContasAdicionadas += contasAdicionadas;
            jogosAtualizados++;
            return { 
              jogo: jogoBanco.nome, 
              status: 'atualizado', 
              contas: contasAdicionadas 
            };
          }
          
          return { jogo: jogoBanco.nome, status: 'sem_novas', contas: 0 };
          
        } catch (error) {
          if (!error.message.includes('timeout')) {
            console.error(`   ⚠️  ${jogoBanco.nome}: ${error.message}`);
          }
          return { jogo: jogoBanco.nome, status: 'erro', contas: 0 };
        }
      });
      
      const resultados = await Promise.all(promessas);
      
      resultados.forEach(r => {
        if (r.status === 'atualizado') {
          console.log(`✅ ${r.jogo} - ${r.contas} conta(s) adicionada(s)`);
        } else if (r.status === 'nao_encontrado') {
          console.log(`⚠️  ${r.jogo} - não encontrado no site`);
        } else if (r.status === 'sem_credenciais') {
          console.log(`ℹ️  ${r.jogo} - sem credenciais no site`);
        }
      });
      
      if (j < lote.length - maxConcorrencia) {
        await scraper.sleep(delayEntreRequisicoes);
      }
    }
    
    if (i + tamanhoLote < jogosParaAtualizar.length) {
      await scraper.sleep(delayEntreLotes);
    }
    
    const progresso = ((i + tamanhoLote) / jogosParaAtualizar.length * 100).toFixed(1);
    console.log(`\n📊 Progresso: ${Math.min(i + tamanhoLote, jogosParaAtualizar.length)}/${jogosParaAtualizar.length} (${progresso}%)\n`);
  }
  
  // ============================================
  // RESUMO FINAL
  // ============================================
  console.log('\n' + '═'.repeat(70));
  console.log('\n✅ PROCESSO COMPLETO FINALIZADO!\n');
  console.log('📊 RESUMO FINAL:');
  console.log(`   🗑️  Contas inválidas removidas: ${contasRemovidas}`);
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
      console.log(`   Total de contas válidas: ${stats[0].total_contas}\n`);
    }
    process.exit(0);
  });
}

limparEAtualizarContas().catch(err => {
  console.error('❌ Erro:', err);
  process.exit(1);
});






