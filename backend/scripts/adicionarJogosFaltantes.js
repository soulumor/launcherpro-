const { initDatabase, getDatabase } = require('../database/database');
const PokopowScraper = require('../services/pokopowScraper');
const { buscarCapaJogo } = require('../services/capaService');

/**
 * Script para adicionar APENAS os jogos que faltam no banco de dados
 * Identifica jogos existentes e adiciona apenas os novos
 * 
 * Modos de operação:
 * - Modo Rápido (padrão): Verifica apenas a página principal primeiro, só busca todos os jogos se detectar mudanças
 * - Modo Completo: Busca todos os jogos do site (use --completo ou --full)
 * 
 * Uso:
 *   node adicionarJogosFaltantes.js          # Modo rápido (padrão)
 *   node adicionarJogosFaltantes.js --completo  # Modo completo
 *   node adicionarJogosFaltantes.js --full      # Modo completo
 */

/**
 * Normaliza o nome do jogo para comparação
 * Remove espaços extras, converte para lowercase, remove caracteres especiais
 */
function normalizarNome(nome) {
  if (!nome) return '';
  return nome
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ') // Múltiplos espaços viram um só
    .replace(/[^\w\s]/g, '') // Remove caracteres especiais
    .trim();
}

/**
 * Verifica argumentos da linha de comando
 */
function verificarModo() {
  const args = process.argv.slice(2);
  const modoCompleto = args.includes('--completo') || args.includes('--full') || args.includes('-c');
  return modoCompleto ? 'completo' : 'rapido';
}

async function adicionarJogosFaltantes() {
  const modo = verificarModo();
  const modoCompleto = modo === 'completo';
  
  console.log('\n' + '='.repeat(70));
  console.log('🚀 ADICIONAR APENAS JOGOS FALTANTES');
  console.log('='.repeat(70));
  
  if (modoCompleto) {
    console.log('⚙️  MODO: COMPLETO (busca todos os jogos do site)');
    console.log('📡 Identificando jogos existentes e buscando novos do site...\n');
  } else {
    console.log('⚙️  MODO: RÁPIDO (verifica página principal primeiro)');
    console.log('💡 Use --completo para forçar busca completa de todos os jogos\n');
    console.log('📡 Verificando página principal por novos jogos...\n');
  }
  
  await initDatabase();
  const db = getDatabase();
  const scraper = new PokopowScraper();
  
  let jogosAdicionados = 0;
  let contasAdicionadas = 0;
  let erros = 0;
  
  try {
    // 1. Buscar jogos que já estão no banco
    console.log('📊 Passo 1: Verificando jogos já existentes no banco...');
    const jogosBanco = await new Promise((resolve, reject) => {
      db.all('SELECT id, nome FROM jogos', (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    // Criar Set com nomes normalizados dos jogos do banco
    const nomesBancoNormalizados = new Set();
    const nomesBancoOriginais = new Map(); // Para debug
    
    jogosBanco.forEach(jogo => {
      const nomeNormalizado = normalizarNome(jogo.nome);
      nomesBancoNormalizados.add(nomeNormalizado);
      nomesBancoOriginais.set(nomeNormalizado, jogo.nome);
    });
    
    console.log(`✅ ${jogosBanco.length} jogos já estão no banco de dados\n`);
    
    // 2. Buscar jogos do site (modo rápido ou completo)
    let jogosSite = [];
    let tempoInicioBusca = Date.now();
    
    if (modoCompleto) {
      // Modo completo: busca todos os jogos
      console.log('📡 Passo 2: Buscando TODOS os jogos do site pokopow.com...');
      console.log('⚠️  Isso pode demorar alguns minutos...\n');
      
      jogosSite = await scraper.encontrarTodosJogos();
      
      if (jogosSite.length === 0) {
        console.log('⚠️  Nenhum jogo encontrado no site.');
        process.exit(0);
        return;
      }
      
      const tempoBusca = ((Date.now() - tempoInicioBusca) / 1000).toFixed(1);
      console.log(`✅ ${jogosSite.length} jogos encontrados no site (${tempoBusca}s)\n`);
    } else {
      // Modo rápido: verifica apenas a página principal primeiro
      console.log('📡 Passo 2: Verificando página principal (modo rápido)...');
      console.log('⚡ Isso é muito mais rápido (~10-30 segundos)\n');
      
      const jogosPrincipal = await scraper.extrairJogosDaPagina('https://pokopow.com');
      
      // Normalizar nomes dos jogos da página principal
      const jogosPrincipalNormalizados = jogosPrincipal.map(j => {
        let nome = j.nome;
        if (!nome || nome.length < 3) {
          const urlParts = j.url.split('/').filter(p => p);
          nome = urlParts[urlParts.length - 1] || nome;
          nome = nome.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
        return { ...j, nome: nome.trim() };
      });
      
      const tempoBusca = ((Date.now() - tempoInicioBusca) / 1000).toFixed(1);
      console.log(`✅ ${jogosPrincipalNormalizados.length} jogos encontrados na página principal (${tempoBusca}s)\n`);
      
      // Verificar se há novos jogos na página principal
      const novosNaPrincipal = jogosPrincipalNormalizados.filter(jogo => {
        const nomeNormalizado = normalizarNome(jogo.nome);
        return nomeNormalizado.length > 2 && !nomesBancoNormalizados.has(nomeNormalizado);
      });
      
      if (novosNaPrincipal.length > 0) {
        console.log(`✨ ${novosNaPrincipal.length} novo(s) jogo(s) detectado(s) na página principal!`);
        console.log('📡 Buscando TODOS os jogos do site para atualização completa...');
        console.log('⚠️  Isso pode demorar alguns minutos...\n');
        
        tempoInicioBusca = Date.now();
        jogosSite = await scraper.encontrarTodosJogos();
        
        const tempoBuscaCompleta = ((Date.now() - tempoInicioBusca) / 1000).toFixed(1);
        console.log(`✅ ${jogosSite.length} jogos encontrados no site (${tempoBuscaCompleta}s)\n`);
      } else {
        console.log('✅ Nenhum jogo novo detectado na página principal!');
        console.log('💡 Todos os jogos já estão sincronizados.');
        console.log('💡 Se quiser forçar busca completa, use: node adicionarJogosFaltantes.js --completo\n');
        console.log('='.repeat(70) + '\n');
        process.exit(0);
        return;
      }
    }
    
    if (jogosSite.length === 0) {
      console.log('⚠️  Nenhum jogo encontrado no site.');
      process.exit(0);
      return;
    }
    
    // 3. Filtrar apenas os jogos que NÃO estão no banco
    console.log('🔍 Passo 3: Comparando e identificando jogos faltantes...\n');
    
    const jogosFaltantes = jogosSite.filter(jogo => {
      const nomeNormalizado = normalizarNome(jogo.nome);
      const existe = nomesBancoNormalizados.has(nomeNormalizado);
      
      if (!existe) {
        return true; // Jogo não existe, adicionar à lista
      }
      return false; // Jogo já existe, ignorar
    });
    
    console.log('📊 RESUMO DA COMPARAÇÃO:');
    console.log(`   💾 Jogos no banco: ${jogosBanco.length}`);
    console.log(`   🌐 Jogos no site: ${jogosSite.length}`);
    console.log(`   ✨ Jogos faltantes: ${jogosFaltantes.length}`);
    console.log(`   ✅ Jogos já existentes: ${jogosSite.length - jogosFaltantes.length}\n`);
    
    if (jogosFaltantes.length === 0) {
      console.log('🎉 Todos os jogos já estão no banco de dados!');
      console.log('='.repeat(70) + '\n');
      process.exit(0);
      return;
    }
    
    // Mostrar primeiros 10 jogos que serão adicionados
    console.log('📋 Primeiros jogos que serão adicionados:');
    jogosFaltantes.slice(0, 10).forEach((jogo, index) => {
      console.log(`   ${index + 1}. ${jogo.nome}`);
    });
    
    if (jogosFaltantes.length > 10) {
      console.log(`   ... e mais ${jogosFaltantes.length - 10} jogos\n`);
    } else {
      console.log('');
    }
    
    // 4. Processar jogos faltantes em lotes
    console.log('🚀 Passo 4: Adicionando jogos faltantes...\n');
    
    const tamanhoLote = 5; // Lotes menores para ser menos agressivo
    const totalLotes = Math.ceil(jogosFaltantes.length / tamanhoLote);
    
    for (let lote = 0; lote < totalLotes; lote++) {
      const inicioLote = lote * tamanhoLote;
      const fimLote = Math.min(inicioLote + tamanhoLote, jogosFaltantes.length);
      const jogosLote = jogosFaltantes.slice(inicioLote, fimLote);
      
      console.log(`\n📦 LOTE ${lote + 1}/${totalLotes} - Processando jogos ${inicioLote + 1} a ${fimLote}...`);
      console.log(`   Progresso total: ${((fimLote / jogosFaltantes.length) * 100).toFixed(1)}%\n`);
      
      for (let i = 0; i < jogosLote.length; i++) {
        const jogo = jogosLote[i];
        const indiceGlobal = inicioLote + i + 1;
        
        console.log(`   [${indiceGlobal}/${jogosFaltantes.length}] ➕ Adicionando: ${jogo.nome}`);
        
        try {
          // Buscar capa do jogo
          let capa = null;
          try {
            capa = await buscarCapaJogo(jogo.nome);
            if (capa) {
              console.log(`      🖼️  Capa encontrada`);
            }
          } catch (capaErr) {
            console.log(`      ⚠️  Capa não encontrada (continuando...)`);
          }
          
          // Adicionar jogo ao banco
          await new Promise((resolve, reject) => {
            db.run(
              'INSERT INTO jogos (nome, descricao, preco, capa) VALUES (?, ?, ?, ?)',
              [jogo.nome, jogo.titulo_pagina || jogo.h1 || '', 0, capa || null],
              async function(insertErr) {
                if (insertErr) {
                  // Verificar se é erro de duplicata
                  if (insertErr.message && insertErr.message.includes('UNIQUE')) {
                    console.log(`      ⚠️  Jogo já existe (duplicata detectada no INSERT)`);
                    resolve();
                    return;
                  }
                  
                  console.error(`      ❌ Erro ao adicionar: ${insertErr.message}`);
                  erros++;
                  resolve();
                  return;
                }
                
                const jogoId = this.lastID;
                jogosAdicionados++;
                console.log(`      ✅ Jogo adicionado (ID: ${jogoId})`);
                
                // Extrair credenciais do jogo
                if (jogo.url) {
                  try {
                    const credenciais = await scraper.extrairCredenciais(jogo.url);
                    
                    if (credenciais.length > 0) {
                      console.log(`      🔐 ${credenciais.length} conta(s) encontrada(s)`);
                      
                      let contasAdicionadasJogo = 0;
                      
                      for (const cred of credenciais) {
                        if (cred.user && cred.pass) {
                          // Verificar se a conta já existe
                          await new Promise((resolveCred) => {
                            db.get(
                              'SELECT id FROM contas WHERE jogo_id = ? AND usuario = ?',
                              [jogoId, cred.user],
                              (err, row) => {
                                if (err) {
                                  resolveCred();
                                  return;
                                }
                                
                                if (!row) {
                                  // Conta não existe, adicionar
                                  db.run(
                                    'INSERT INTO contas (jogo_id, usuario, senha, status) VALUES (?, ?, ?, ?)',
                                    [jogoId, cred.user, cred.pass, 'disponivel'],
                                    (insertCredErr) => {
                                      if (!insertCredErr) {
                                        contasAdicionadas++;
                                        contasAdicionadasJogo++;
                                      }
                                      resolveCred();
                                    }
                                  );
                                } else {
                                  resolveCred();
                                }
                              }
                            );
                          });
                        }
                      }
                      
                      if (contasAdicionadasJogo > 0) {
                        console.log(`      ✅ ${contasAdicionadasJogo} conta(s) adicionada(s)`);
                      }
                    } else {
                      console.log(`      ℹ️  Nenhuma credencial encontrada para este jogo`);
                    }
                  } catch (credErr) {
                    console.log(`      ⚠️  Erro ao extrair credenciais: ${credErr.message}`);
                  }
                }
                
                resolve();
              }
            );
          });
          
          // Delay entre jogos (2 segundos - menos agressivo)
          if (i < jogosLote.length - 1) {
            await scraper.sleep(2000);
          }
          
        } catch (error) {
          console.error(`      ❌ Erro ao processar jogo: ${error.message}`);
          erros++;
        }
      }
      
      // Resumo do lote
      const progresso = ((fimLote / jogosFaltantes.length) * 100).toFixed(1);
      console.log(`\n   ✅ Lote ${lote + 1} concluído!`);
      console.log(`   📊 Progresso: ${progresso}%`);
      console.log(`   ➕ Jogos adicionados até agora: ${jogosAdicionados}`);
      console.log(`   🔐 Contas adicionadas até agora: ${contasAdicionadas}`);
      
      // Delay entre lotes (3 segundos - menos agressivo)
      if (lote < totalLotes - 1) {
        console.log(`   ⏳ Aguardando 3 segundos antes do próximo lote...\n`);
        await scraper.sleep(3000);
      }
    }
    
    // 5. Resumo final
    console.log('\n' + '='.repeat(70));
    console.log('✅ PROCESSO CONCLUÍDO!');
    console.log('='.repeat(70));
    console.log('📊 ESTATÍSTICAS FINAIS:');
    console.log(`   💾 Jogos no banco (antes): ${jogosBanco.length}`);
    console.log(`   🌐 Jogos encontrados no site: ${jogosSite.length}`);
    console.log(`   ✨ Jogos faltantes identificados: ${jogosFaltantes.length}`);
    console.log(`   ➕ Jogos adicionados: ${jogosAdicionados}`);
    console.log(`   🔐 Contas adicionadas: ${contasAdicionadas}`);
    if (erros > 0) {
      console.log(`   ⚠️  Erros encontrados: ${erros}`);
    }
    console.log('='.repeat(70) + '\n');
    
  } catch (error) {
    console.error('\n❌ ERRO FATAL:', error);
    console.error(error.stack);
    process.exit(1);
  }
  
  process.exit(0);
}

// Executar
adicionarJogosFaltantes().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});

