const { initDatabase, getDatabase } = require('../database/database');
const PokopowScraper = require('../services/pokopowScraper');
const { buscarCapaJogo } = require('../services/capaService');

/**
 * Sincronização DETALHADA - Mostra cada processo passo a passo
 */

async function sincronizacaoDetalhada() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 SINCRONIZAÇÃO DETALHADA - PROCESSO POR PROCESSO');
  console.log('='.repeat(60) + '\n');
  
  await initDatabase();
  const db = getDatabase();
  const scraper = new PokopowScraper();
  
  try {
    // PASSO 1: Buscar jogos do site
    console.log('📡 PASSO 1: Buscando jogos do site pokopow.com...');
    console.log('   ⏳ Isso pode levar alguns minutos...\n');
    
    const jogos = await scraper.encontrarTodosJogos();
    
    if (jogos.length === 0) {
      console.log('⚠️  Nenhum jogo encontrado.');
      return;
    }
    
    console.log(`✅ PASSO 1 CONCLUÍDO: ${jogos.length} jogos encontrados\n`);
    
    // PASSO 2: Verificar jogos no banco
    console.log('📊 PASSO 2: Verificando jogos já no banco...');
    
    const jogosBanco = await new Promise((resolve, reject) => {
      db.all('SELECT nome FROM jogos', (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    const nomesBanco = new Set(jogosBanco.map(j => j.nome.toLowerCase().trim()));
    console.log(`✅ PASSO 2 CONCLUÍDO: ${jogosBanco.length} jogos já no banco\n`);
    
    // PASSO 3: Filtrar jogos novos
    console.log('🔍 PASSO 3: Identificando jogos novos...');
    
    const jogosNovos = jogos.filter(jogo => {
      const nomeNormalizado = jogo.nome.trim().toLowerCase();
      return !nomesBanco.has(nomeNormalizado);
    });
    
    console.log(`✅ PASSO 3 CONCLUÍDO: ${jogosNovos.length} jogos novos para adicionar\n`);
    
    if (jogosNovos.length === 0) {
      console.log('✅ Todos os jogos já estão no banco!');
      return;
    }
    
    // PASSO 4: Processar cada jogo (um por um, mostrando tudo)
    console.log('📦 PASSO 4: Processando jogos (um por um)...\n');
    console.log('='.repeat(60) + '\n');
    
    let jogosAdicionados = 0;
    let contasAdicionadas = 0;
    
    for (let i = 0; i < jogosNovos.length; i++) {
      const jogo = jogosNovos[i];
      const progresso = ((i + 1) / jogosNovos.length * 100).toFixed(1);
      
      console.log(`\n🎮 JOGO ${i + 1}/${jogosNovos.length} (${progresso}%)`);
      console.log(`   Nome: ${jogo.nome}`);
      console.log(`   URL: ${jogo.url}`);
      
      try {
        // 4.1: Buscar capa
        console.log(`   📸 Buscando capa...`);
        const capa = await buscarCapaJogo(jogo.nome);
        if (capa) {
          console.log(`   ✅ Capa encontrada: ${capa.substring(0, 60)}...`);
        } else {
          console.log(`   ⚠️  Capa não encontrada`);
        }
        
        // 4.2: Adicionar jogo ao banco
        console.log(`   💾 Adicionando jogo ao banco...`);
        
        await new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO jogos (nome, descricao, preco, capa) VALUES (?, ?, ?, ?)',
            [jogo.nome, jogo.titulo_pagina || jogo.h1 || '', 0, capa || null],
            async function(insertErr) {
              if (insertErr) {
                console.log(`   ❌ ERRO ao adicionar: ${insertErr.message}`);
                resolve();
                return;
              }
              
              const jogoId = this.lastID;
              jogosAdicionados++;
              console.log(`   ✅ Jogo adicionado com sucesso! (ID: ${jogoId})`);
              
              // 4.3: Extrair credenciais
              if (jogo.url) {
                console.log(`   🔐 Extraindo credenciais da página...`);
                
                try {
                  const credenciais = await scraper.extrairCredenciais(jogo.url);
                  
                  if (credenciais.length > 0) {
                    console.log(`   ✅ ${credenciais.length} conta(s) encontrada(s)`);
                    
                    for (let c = 0; c < credenciais.length; c++) {
                      const cred = credenciais[c];
                      if (cred.user && cred.pass) {
                        console.log(`      📝 Adicionando conta ${c + 1}: ${cred.user}`);
                        
                        await new Promise((resolveCred) => {
                          db.run(
                            'INSERT INTO contas (jogo_id, usuario, senha, status) VALUES (?, ?, ?, ?)',
                            [jogoId, cred.user, cred.pass, 'disponivel'],
                            (err) => {
                              if (!err) {
                                contasAdicionadas++;
                                console.log(`      ✅ Conta adicionada!`);
                              } else {
                                console.log(`      ❌ Erro: ${err.message}`);
                              }
                              resolveCred();
                            }
                          );
                        });
                      }
                    }
                  } else {
                    console.log(`   ⚠️  Nenhuma credencial encontrada`);
                  }
                } catch (credErr) {
                  console.log(`   ❌ Erro ao extrair credenciais: ${credErr.message}`);
                }
              }
              
              resolve();
            }
          );
        });
        
        console.log(`   ✅ JOGO ${i + 1} PROCESSADO COM SUCESSO!`);
        
      } catch (error) {
        console.log(`   ❌ ERRO ao processar jogo: ${error.message}`);
      }
      
      // Delay entre jogos
      if (i < jogosNovos.length - 1) {
        console.log(`   ⏳ Aguardando 1 segundo antes do próximo jogo...`);
        await scraper.sleep(1000);
      }
      
      // Mostrar resumo a cada 10 jogos
      if ((i + 1) % 10 === 0) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📊 RESUMO PARCIAL (${i + 1}/${jogosNovos.length} processados):`);
        console.log(`   ➕ Jogos adicionados: ${jogosAdicionados}`);
        console.log(`   🔐 Contas adicionadas: ${contasAdicionadas}`);
        console.log(`   📈 Progresso: ${progresso}%`);
        console.log(`${'='.repeat(60)}\n`);
      }
    }
    
    // RESUMO FINAL
    console.log('\n' + '='.repeat(60));
    console.log('✅ SINCRONIZAÇÃO DETALHADA CONCLUÍDA!');
    console.log('='.repeat(60));
    console.log(`   📦 Total de jogos processados: ${jogosNovos.length}`);
    console.log(`   ➕ Jogos adicionados: ${jogosAdicionados}`);
    console.log(`   🔐 Contas adicionadas: ${contasAdicionadas}`);
    console.log(`   📊 Taxa de sucesso: ${((jogosAdicionados / jogosNovos.length) * 100).toFixed(1)}%`);
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('\n❌ ERRO GERAL:', error);
    console.error(error.stack);
  }
  
  process.exit(0);
}

sincronizacaoDetalhada();







