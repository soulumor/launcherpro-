const { initDatabase, getDatabase } = require('../database/database');
const PokopowScraper = require('../services/pokopowScraper');
const { buscarCapaJogo } = require('../services/capaService');

/**
 * Sincronização FORÇADA - Adiciona TODOS os jogos que não estão no banco
 * Ignora verificações de duplicatas mais restritivas
 */

async function sincronizacaoForcada() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 SINCRONIZAÇÃO FORÇADA');
  console.log('='.repeat(60));
  console.log('📡 Buscando TODOS os jogos e adicionando os que faltam...\n');
  
  await initDatabase();
  const db = getDatabase();
  const scraper = new PokopowScraper();
  
  try {
    // 1. Buscar todos os jogos do site
    console.log('🔍 Buscando jogos do site...');
    const jogos = await scraper.encontrarTodosJogos();
    
    if (jogos.length === 0) {
      console.log('⚠️  Nenhum jogo encontrado.');
      return;
    }
    
    console.log(`✅ ${jogos.length} jogos encontrados no site\n`);
    
    // 2. Buscar jogos que já estão no banco (apenas nomes)
    console.log('📊 Verificando jogos no banco...');
    const jogosBanco = await new Promise((resolve, reject) => {
      db.all('SELECT nome FROM jogos', (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    const nomesBanco = new Set(jogosBanco.map(j => j.nome.toLowerCase().trim()));
    console.log(`✅ ${jogosBanco.length} jogos já no banco\n`);
    
    // 3. Filtrar jogos que NÃO estão no banco
    const jogosNovos = jogos.filter(jogo => {
      const nomeNormalizado = jogo.nome.trim().toLowerCase();
      return !nomesBanco.has(nomeNormalizado);
    });
    
    console.log(`✨ ${jogosNovos.length} jogos novos para adicionar!\n`);
    
    if (jogosNovos.length === 0) {
      console.log('✅ Todos os jogos já estão no banco!');
      return;
    }
    
    // 4. Processar em lotes de 10
    const tamanhoLote = 10;
    const totalLotes = Math.ceil(jogosNovos.length / tamanhoLote);
    let jogosAdicionados = 0;
    let contasAdicionadas = 0;
    
    for (let lote = 0; lote < totalLotes; lote++) {
      const inicioLote = lote * tamanhoLote;
      const fimLote = Math.min(inicioLote + tamanhoLote, jogosNovos.length);
      const jogosLote = jogosNovos.slice(inicioLote, fimLote);
      
      console.log(`\n📦 LOTE ${lote + 1}/${totalLotes} - Processando jogos ${inicioLote + 1} a ${fimLote}...`);
      
      for (let i = 0; i < jogosLote.length; i++) {
        const jogo = jogosLote[i];
        const indiceGlobal = inicioLote + i + 1;
        
        console.log(`   [${indiceGlobal}/${jogosNovos.length}] Adicionando: ${jogo.nome.substring(0, 50)}...`);
        
        try {
          // Buscar capa
          const capa = await buscarCapaJogo(jogo.nome);
          
          // Adicionar jogo
          await new Promise((resolve, reject) => {
            db.run(
              'INSERT INTO jogos (nome, descricao, preco, capa) VALUES (?, ?, ?, ?)',
              [jogo.nome, jogo.titulo_pagina || jogo.h1 || '', 0, capa || null],
              async function(insertErr) {
                if (insertErr) {
                  console.error(`      ❌ Erro: ${insertErr.message}`);
                  resolve();
                  return;
                }
                
                const jogoId = this.lastID;
                jogosAdicionados++;
                console.log(`      ✅ Jogo adicionado (ID: ${jogoId})`);
                
                // Extrair credenciais
                if (jogo.url) {
                  try {
                    const credenciais = await scraper.extrairCredenciais(jogo.url);
                    
                    if (credenciais.length > 0) {
                      console.log(`      🔐 ${credenciais.length} conta(s) encontrada(s)`);
                      
                      for (const cred of credenciais) {
                        if (cred.user && cred.pass) {
                          await new Promise((resolveCred) => {
                            db.run(
                              'INSERT INTO contas (jogo_id, usuario, senha, status) VALUES (?, ?, ?, ?)',
                              [jogoId, cred.user, cred.pass, 'disponivel'],
                              (err) => {
                                if (!err) contasAdicionadas++;
                                resolveCred();
                              }
                            );
                          });
                        }
                      }
                    }
                  } catch (credErr) {
                    console.log(`      ⚠️  Erro ao extrair credenciais: ${credErr.message}`);
                  }
                }
                
                resolve();
              }
            );
          });
          
          // Delay entre jogos
          await scraper.sleep(500);
          
        } catch (error) {
          console.error(`      ❌ Erro ao processar: ${error.message}`);
        }
      }
      
      // Resumo do lote
      const progresso = ((fimLote / jogosNovos.length) * 100).toFixed(1);
      console.log(`\n   ✅ Lote ${lote + 1} concluído!`);
      console.log(`   📊 Progresso: ${progresso}%`);
      console.log(`   ➕ Jogos adicionados: ${jogosAdicionados}`);
      console.log(`   🔐 Contas adicionadas: ${contasAdicionadas}`);
      
      // Delay entre lotes
      if (lote < totalLotes - 1) {
        console.log(`   ⏳ Aguardando 2 segundos...\n`);
        await scraper.sleep(2000);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ SINCRONIZAÇÃO FORÇADA CONCLUÍDA!');
    console.log('='.repeat(60));
    console.log(`   ➕ Jogos adicionados: ${jogosAdicionados}`);
    console.log(`   🔐 Contas adicionadas: ${contasAdicionadas}`);
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('\n❌ ERRO:', error);
    console.error(error.stack);
  }
  
  process.exit(0);
}

sincronizacaoForcada();







