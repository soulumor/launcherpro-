const PokopowScraper = require('./pokopowScraper');
const { getDatabase } = require('../database/database');
const { buscarCapaJogo } = require('./capaService');
const { iniciarProgresso, atualizarProgresso, finalizarProgresso } = require('./syncProgress');

/**
 * Serviço para atualizar automaticamente jogos e contas do pokopow.com
 */

async function atualizarJogosEContas() {
  console.log('\n🚀 Iniciando atualização automática de jogos e contas...\n');
  
  const db = getDatabase();
  const scraper = new PokopowScraper();
  
  try {
    // 1. Encontrar todos os jogos
    const jogos = await scraper.encontrarTodosJogos();
    
    if (jogos.length === 0) {
      console.log('⚠️  Nenhum jogo encontrado. Pulando atualização.');
      return;
    }
    
    // 2. Para cada jogo, verificar se já existe no banco ou adicionar
    console.log(`\n📦 Processando ${jogos.length} jogos...\n`);
    
    let jogosAdicionados = 0;
    let jogosAtualizados = 0;
    
    for (let i = 0; i < jogos.length; i++) {
      const jogo = jogos[i];
      
      if ((i + 1) % 10 === 0) {
        console.log(`   Processando ${i + 1}/${jogos.length}...`);
      }
      
      // Verificar se o jogo já existe (por nome ou URL)
      db.get(
        'SELECT id FROM jogos WHERE nome = ? OR capa LIKE ?',
        [jogo.nome, `%${jogo.url}%`],
        async (err, row) => {
          if (err) {
            console.error(`   ❌ Erro ao verificar jogo ${jogo.nome}:`, err);
            return;
          }
          
          let jogoId;
          
          if (row) {
            // Jogo já existe, atualizar
            jogoId = row.id;
            jogosAtualizados++;
            
            // Buscar capa se não tiver
            db.get('SELECT capa FROM jogos WHERE id = ?', [jogoId], async (err, jogoRow) => {
              if (!err && jogoRow && (!jogoRow.capa || jogoRow.capa.includes('placeholder'))) {
                const capa = await buscarCapaJogo(jogo.nome);
                if (capa) {
                  db.run('UPDATE jogos SET capa = ? WHERE id = ?', [capa, jogoId]);
                }
              }
            });
          } else {
            // Novo jogo, adicionar
            jogosAdicionados++;
            
            // Buscar capa automaticamente
            const capa = await buscarCapaJogo(jogo.nome);
            
            db.run(
              'INSERT INTO jogos (nome, descricao, preco, capa) VALUES (?, ?, ?, ?)',
              [jogo.nome, jogo.titulo_pagina || jogo.h1 || '', 0, capa || null],
              function(insertErr) {
                if (insertErr) {
                  console.error(`   ❌ Erro ao adicionar jogo ${jogo.nome}:`, insertErr);
                  return;
                }
                jogoId = this.lastID;
                
                // Extrair credenciais para este jogo
                extrairECadastrarCredenciais(jogo.url, jogoId, jogo.nome);
              }
            );
          }
          
          // Se o jogo já existia, também extrair credenciais
          if (row) {
            extrairECadastrarCredenciais(jogo.url, jogoId, jogo.nome);
          }
        }
      );
      
      // Delay para não sobrecarregar (menos agressivo)
      if ((i + 1) % 5 === 0) {
        await scraper.sleep(2000); // 2 segundos a cada 5 jogos
      }
    }
    
    // Aguardar um pouco para as operações assíncronas
    await scraper.sleep(3000);
    
    console.log(`\n✅ Atualização concluída!`);
    console.log(`   - Jogos adicionados: ${jogosAdicionados}`);
    console.log(`   - Jogos atualizados: ${jogosAtualizados}`);
    console.log(`   - Total processado: ${jogos.length}\n`);
    
  } catch (error) {
    console.error('❌ Erro durante atualização automática:', error);
  }
}

/**
 * Extrai e cadastra credenciais de um jogo
 */
async function extrairECadastrarCredenciais(jogoUrl, jogoId, jogoNome) {
  const scraper = new PokopowScraper();
  const db = getDatabase();
  let contasAdicionadas = 0;
  
  try {
    const credenciais = await scraper.extrairCredenciais(jogoUrl);
    
    if (credenciais.length > 0) {
      console.log(`   🔐 Encontradas ${credenciais.length} credencial(is) para ${jogoNome}`);
      
      // Processar cada credencial
      for (const cred of credenciais) {
        if (!cred.user || !cred.pass) continue;
        
        // Verificar se a conta já existe
        await new Promise((resolve) => {
          db.get(
            'SELECT id FROM contas WHERE jogo_id = ? AND usuario = ?',
            [jogoId, cred.user],
            (err, row) => {
              if (err) {
                console.error(`      ❌ Erro ao verificar conta:`, err);
                resolve();
                return;
              }
              
              if (!row) {
                // Adicionar nova conta
                db.run(
                  'INSERT INTO contas (jogo_id, usuario, senha, status) VALUES (?, ?, ?, ?)',
                  [jogoId, cred.user, cred.pass, 'disponivel'],
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
              } else {
                resolve();
              }
            }
          );
        });
      }
    }
    
    return contasAdicionadas;
  } catch (error) {
    console.error(`   ❌ Erro ao extrair credenciais de ${jogoNome}:`, error.message);
    return 0;
  }
}

/**
 * Versão otimizada: atualiza apenas jogos novos ou sem credenciais
 */
async function atualizarJogosEContasOtimizado() {
  console.log('\n🚀 Iniciando atualização otimizada...\n');
  
  const db = getDatabase();
  const scraper = new PokopowScraper();
  
  let jogosAdicionados = 0;
  let jogosAtualizados = 0;
  let contasAdicionadas = 0;
  const timestamp = new Date().toISOString();
  
  try {
    // 1. Buscar todos os jogos do site
    const jogos = await scraper.encontrarTodosJogos();
    
    if (jogos.length === 0) {
      console.log('⚠️  Nenhum jogo encontrado.');
      // Registrar sincronização mesmo sem jogos
      await registrarSincronizacao(db, {
        tipo: 'manual',
        jogos_encontrados: 0,
        jogos_adicionados: 0,
        jogos_atualizados: 0,
        contas_adicionadas: 0,
        status: 'sucesso',
        mensagem: 'Nenhum jogo encontrado no site'
      });
      finalizarProgresso('concluido', 'Nenhum jogo encontrado no site');
      return;
    }
    
    // Iniciar progresso em tempo real
    iniciarProgresso(jogos.length);
    
    console.log(`\n📦 Processando ${jogos.length} jogos em lotes de 10 (2 em paralelo - modo menos agressivo)...\n`);
    
    // 2. Processar jogos em lotes menores e com menos concorrência (menos agressivo)
    const tamanhoLote = 10; // Lotes menores para ser menos agressivo
    const maxConcorrencia = 2; // Processar apenas 2 jogos simultaneamente (menos agressivo)
    const totalLotes = Math.ceil(jogos.length / tamanhoLote);
    
    for (let lote = 0; lote < totalLotes; lote++) {
      const inicioLote = lote * tamanhoLote;
      const fimLote = Math.min(inicioLote + tamanhoLote, jogos.length);
      const jogosLote = jogos.slice(inicioLote, fimLote);
      
      console.log(`\n📦 LOTE ${lote + 1}/${totalLotes} - Processando jogos ${inicioLote + 1} a ${fimLote} em paralelo...`);
      
      // Processar jogos em paralelo (com limite de concorrência)
      const resultadosLote = [];
      
      for (let i = 0; i < jogosLote.length; i += maxConcorrencia) {
        const grupoAtual = jogosLote.slice(i, i + maxConcorrencia);
        
        // Processar grupo em paralelo
        const promessas = grupoAtual.map(jogo => {
          const indiceGlobal = inicioLote + i + grupoAtual.indexOf(jogo) + 1;
          return processarJogo(jogo, db, scraper)
            .then(resultado => {
              atualizarProgresso(jogo, resultado);
              return { jogo, resultado, indiceGlobal };
            })
            .catch(err => {
              console.error(`   ❌ Erro ao processar ${jogo.nome}:`, err.message);
              return { jogo, resultado: { novo: false, atualizado: false, contas: 0 }, indiceGlobal: inicioLote + i + grupoAtual.indexOf(jogo) + 1 };
            });
        });
        
        const resultadosGrupo = await Promise.all(promessas);
        resultadosLote.push(...resultadosGrupo);
        
        // Mostrar progresso do grupo
        const processadosAteAgora = i + grupoAtual.length;
        const progressoLote = ((processadosAteAgora / jogosLote.length) * 100).toFixed(0);
        const progressoTotal = (((inicioLote + processadosAteAgora) / jogos.length) * 100).toFixed(1);
        console.log(`   [${inicioLote + processadosAteAgora}/${jogos.length}] Lote: ${progressoLote}% | Total: ${progressoTotal}%`);
      }
      
      // Consolidar resultados do lote
      for (const { resultado } of resultadosLote) {
        if (resultado.novo) jogosAdicionados++;
        if (resultado.atualizado) jogosAtualizados++;
        if (resultado.contas) contasAdicionadas += resultado.contas;
      }
      
      // Mostrar resumo do lote
      console.log(`\n   ✅ Lote ${lote + 1} concluído!`);
      console.log(`   📊 Progresso total: ${((fimLote / jogos.length) * 100).toFixed(1)}%`);
      console.log(`   ➕ Jogos adicionados até agora: ${jogosAdicionados}`);
      console.log(`   🔄 Jogos atualizados até agora: ${jogosAtualizados}`);
      console.log(`   🔐 Contas adicionadas até agora: ${contasAdicionadas}`);
      
      // Delay entre lotes (menos agressivo)
      if (lote < totalLotes - 1) {
        await scraper.sleep(3000); // 3 segundos entre lotes para ser menos agressivo
      }
    }
    
    // Registrar sincronização
    await registrarSincronizacao(db, {
      tipo: 'manual',
      jogos_encontrados: jogos.length,
      jogos_adicionados: jogosAdicionados,
      jogos_atualizados: jogosAtualizados,
      contas_adicionadas: contasAdicionadas,
      status: 'sucesso'
    });
    
    // Finalizar progresso
    finalizarProgresso('concluido', null);
    
    console.log(`\n✅ Atualização concluída!`);
    console.log(`   - Jogos encontrados: ${jogos.length}`);
    console.log(`   - Jogos adicionados: ${jogosAdicionados}`);
    console.log(`   - Jogos atualizados: ${jogosAtualizados}`);
    console.log(`   - Contas adicionadas: ${contasAdicionadas}\n`);
    
  } catch (error) {
    console.error('❌ Erro durante atualização:', error);
    
    // Finalizar progresso com erro
    finalizarProgresso('erro', error.message);
    
    // Registrar erro na sincronização
    try {
      await registrarSincronizacao(db, {
        tipo: 'manual',
        jogos_encontrados: 0,
        jogos_adicionados: 0,
        jogos_atualizados: 0,
        contas_adicionadas: 0,
        status: 'erro',
        mensagem: error.message
      });
    } catch (regError) {
      console.error('Erro ao registrar sincronização:', regError);
    }
  }
}

/**
 * Registra uma sincronização no banco de dados
 */
async function registrarSincronizacao(db, dados) {
  return new Promise((resolve, reject) => {
    const timestamp = new Date().toISOString();
    console.log(`\n📝 Registrando sincronização no banco:`, {
      tipo: dados.tipo,
      jogos_encontrados: dados.jogos_encontrados,
      jogos_adicionados: dados.jogos_adicionados,
      contas_adicionadas: dados.contas_adicionadas,
      status: dados.status
    });
    
    db.run(
      `INSERT INTO sincronizacoes 
       (data_hora, tipo, jogos_encontrados, jogos_adicionados, jogos_atualizados, contas_adicionadas, status, mensagem) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        timestamp,
        dados.tipo || 'manual',
        dados.jogos_encontrados || 0,
        dados.jogos_adicionados || 0,
        dados.jogos_atualizados || 0,
        dados.contas_adicionadas || 0,
        dados.status || 'sucesso',
        dados.mensagem || null
      ],
      function(err) {
        if (err) {
          console.error('❌ Erro ao registrar sincronização:', err);
          reject(err);
        } else {
          console.log(`✅ Sincronização registrada com ID: ${this.lastID}`);
          resolve();
        }
      }
    );
  });
}

/**
 * Processa um único jogo
 * Melhorado: verifica duplicatas por nome E URL para evitar adicionar o mesmo jogo duas vezes
 */
async function processarJogo(jogo, db, scraper) {
  return new Promise((resolve) => {
    let resultado = { novo: false, atualizado: false, contas: 0 };
    
    // Normalizar nome para comparação (remover espaços extras, lowercase)
    const nomeNormalizado = jogo.nome.trim().toLowerCase();
    
    // Extrair slug da URL para comparação
    const urlSlug = jogo.url
      .replace('https://pokopow.com/', '')
      .replace('http://pokopow.com/', '')
      .replace(/\/$/, '')
      .toLowerCase();
    
    // Verificar se jogo existe (por nome normalizado)
    // Usa comparação case-insensitive e ignora espaços extras
    db.get(
      `SELECT id, capa FROM jogos 
       WHERE LOWER(TRIM(nome)) = ?`,
      [nomeNormalizado],
      async (err, row) => {
        if (err) {
          console.error(`   ❌ Erro ao verificar ${jogo.nome}:`, err);
          resolve(resultado);
          return;
        }
        
        let jogoId;
        
        if (row) {
          // Jogo já existe
          jogoId = row.id;
          resultado.atualizado = true;
          
          // Verificar se tem credenciais
          db.get('SELECT COUNT(*) as count FROM contas WHERE jogo_id = ?', [jogoId], async (err, contaRow) => {
            if (!err && contaRow && contaRow.count === 0) {
              // Não tem credenciais, extrair
              console.log(`   🔐 Extraindo credenciais para: ${jogo.nome}`);
              resultado.contas = await extrairECadastrarCredenciais(jogo.url, jogoId, jogo.nome) || 0;
            }
            
            // Atualizar capa se necessário
            if (!row.capa || row.capa.includes('placeholder')) {
              const capa = await buscarCapaJogo(jogo.nome);
              if (capa) {
                db.run('UPDATE jogos SET capa = ? WHERE id = ?', [capa, jogoId]);
              }
            }
            
            resolve(resultado);
          });
        } else {
          // Realmente é um novo jogo
          console.log(`   ➕ Adicionando novo jogo: ${jogo.nome}`);
          resultado.novo = true;
          
          const capa = await buscarCapaJogo(jogo.nome);
          
          db.run(
            'INSERT INTO jogos (nome, descricao, preco, capa) VALUES (?, ?, ?, ?)',
            [jogo.nome, jogo.titulo_pagina || jogo.h1 || '', 0, capa || null],
            async function(insertErr) {
              if (insertErr) {
                // Se erro de duplicata (UNIQUE constraint), significa que já existe
                if (insertErr.message && insertErr.message.includes('UNIQUE')) {
                  console.log(`   ⚠️  Jogo ${jogo.nome} já existe (duplicata detectada)`);
                  resultado.novo = false;
                  resultado.atualizado = true;
                  resolve(resultado);
                  return;
                }
                
                console.error(`   ❌ Erro ao adicionar ${jogo.nome}:`, insertErr);
                resolve(resultado);
                return;
              }
              
              jogoId = this.lastID;
              
              // Extrair credenciais
              console.log(`   🔐 Extraindo credenciais para: ${jogo.nome}`);
              resultado.contas = await extrairECadastrarCredenciais(jogo.url, jogoId, jogo.nome) || 0;
              
              resolve(resultado);
            }
          );
        }
      }
    );
  });
}

module.exports = {
  atualizarJogosEContas,
  atualizarJogosEContasOtimizado
};

