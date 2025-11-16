const { initDatabase } = require('../database/database');
const { buscarCapaJogo } = require('../services/capaService');
const fs = require('fs');
const path = require('path');

/**
 * Script para importar dados do scraper Python diretamente do JSON
 * Muito mais rápido do que fazer scraping novamente!
 */

async function importarDadosJSON() {
  console.log('🚀 Importando dados do scraper Python...\n');
  
  const db = getDatabase();
  
  // Caminho para os arquivos JSON do scraper Python
  const caminhoJogos = 'C:\\Users\\berg\\web-scraper\\pokopow_todos_jogos.json';
  const caminhoCredenciais = 'C:\\Users\\berg\\web-scraper\\pokopow_credenciais_organizadas.json';
  
  try {
    // 1. Carregar jogos
    console.log('1. Carregando jogos do JSON...');
    const dadosJogos = JSON.parse(fs.readFileSync(caminhoJogos, 'utf-8'));
    const jogos = dadosJogos.jogos || [];
    console.log(`   ✅ ${jogos.length} jogos encontrados no JSON\n`);
    
    // 2. Carregar credenciais
    console.log('2. Carregando credenciais do JSON...');
    const dadosCredenciais = JSON.parse(fs.readFileSync(caminhoCredenciais, 'utf-8'));
    const jogosComCredenciais = dadosCredenciais.jogos || [];
    console.log(`   ✅ ${jogosComCredenciais.length} jogos com credenciais encontrados\n`);
    
    // 3. Criar mapa de credenciais por nome do jogo
    const credenciaisPorJogo = {};
    jogosComCredenciais.forEach(jogo => {
      credenciaisPorJogo[jogo.jogo] = jogo.credenciais || [];
    });
    
    // 4. Importar jogos
    console.log('3. Importando jogos no banco de dados...\n');
    let jogosAdicionados = 0;
    let jogosAtualizados = 0;
    let contasAdicionadas = 0;
    
    for (let i = 0; i < jogos.length; i++) {
      const jogo = jogos[i];
      const nomeJogo = jogo.nome;
      
      if ((i + 1) % 10 === 0) {
        console.log(`   Processando ${i + 1}/${jogos.length}...`);
      }
      
      // Verificar se jogo já existe
      await new Promise((resolve) => {
        db.get('SELECT id FROM jogos WHERE nome = ?', [nomeJogo], async (err, row) => {
          if (err) {
            console.error(`   ❌ Erro ao verificar ${nomeJogo}:`, err);
            resolve();
            return;
          }
          
          let jogoId;
          
          if (row) {
            // Jogo existe
            jogoId = row.id;
            jogosAtualizados++;
            
            // Atualizar capa se necessário
            db.get('SELECT capa FROM jogos WHERE id = ?', [jogoId], async (err, jogoRow) => {
              if (!err && jogoRow && (!jogoRow.capa || jogoRow.capa.includes('placeholder'))) {
                const capa = await buscarCapaJogo(nomeJogo);
                if (capa) {
                  db.run('UPDATE jogos SET capa = ? WHERE id = ?', [capa, jogoId]);
                }
              }
            });
          } else {
            // Novo jogo
            jogosAdicionados++;
            
            // Buscar capa
            const capa = await buscarCapaJogo(nomeJogo);
            
            db.run(
              'INSERT INTO jogos (nome, descricao, preco, capa) VALUES (?, ?, ?, ?)',
              [nomeJogo, jogo.titulo_pagina || jogo.h1 || '', 0, capa || null],
              function(insertErr) {
                if (insertErr) {
                  console.error(`   ❌ Erro ao adicionar ${nomeJogo}:`, insertErr);
                  resolve();
                  return;
                }
                
                jogoId = this.lastID;
                
                // Importar credenciais deste jogo
                const credenciais = credenciaisPorJogo[nomeJogo] || [];
                if (credenciais.length > 0) {
                  importarCredenciais(jogoId, credenciais, nomeJogo).then(() => {
                    contasAdicionadas += credenciais.length;
                    resolve();
                  });
                } else {
                  resolve();
                }
              }
            );
            return;
          }
          
          // Se jogo já existia, verificar e adicionar credenciais
          if (row) {
            // Verificar se já tem credenciais
            db.get('SELECT COUNT(*) as count FROM contas WHERE jogo_id = ?', [jogoId], (err, contaRow) => {
              if (!err && contaRow && contaRow.count === 0) {
                const credenciais = credenciaisPorJogo[nomeJogo] || [];
                if (credenciais.length > 0) {
                  importarCredenciais(jogoId, credenciais, nomeJogo).then(() => {
                    contasAdicionadas += credenciais.length;
                    resolve();
                  });
                } else {
                  resolve();
                }
              } else {
                resolve();
              }
            });
          } else {
            resolve();
          }
        });
      });
      
      // Pequeno delay para não sobrecarregar
      if ((i + 1) % 20 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Aguardar todas as operações assíncronas
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log(`\n✅ Importação concluída!`);
    console.log(`   - Jogos adicionados: ${jogosAdicionados}`);
    console.log(`   - Jogos atualizados: ${jogosAtualizados}`);
    console.log(`   - Contas adicionadas: ${contasAdicionadas}`);
    console.log(`   - Total processado: ${jogos.length}\n`);
    
  } catch (error) {
    console.error('❌ Erro durante importação:', error);
    throw error;
  }
}

/**
 * Importa credenciais de um jogo
 */
async function importarCredenciais(jogoId, credenciais, nomeJogo) {
  const db = getDatabase();
  
  return new Promise((resolve) => {
    let importadas = 0;
    let total = credenciais.length;
    
    if (total === 0) {
      resolve();
      return;
    }
    
    credenciais.forEach((cred, index) => {
      if (!cred.user || !cred.pass) {
        if (index === total - 1) resolve();
        return;
      }
      
      // Verificar se conta já existe
      db.get(
        'SELECT id FROM contas WHERE jogo_id = ? AND usuario = ?',
        [jogoId, cred.user],
        (err, row) => {
          if (err) {
            if (index === total - 1) resolve();
            return;
          }
          
          if (!row) {
            // Adicionar conta
            db.run(
              'INSERT INTO contas (jogo_id, usuario, senha, status) VALUES (?, ?, ?, ?)',
              [jogoId, cred.user, cred.pass, 'disponivel'],
              (insertErr) => {
                if (!insertErr) {
                  importadas++;
                }
                if (index === total - 1) {
                  if (importadas > 0) {
                    console.log(`      ✅ ${importadas} conta(s) adicionada(s) para ${nomeJogo}`);
                  }
                  resolve();
                }
              }
            );
          } else {
            if (index === total - 1) resolve();
          }
        }
      );
    });
  });
}

// Executar importação
initDatabase()
  .then(() => {
    const { getDatabase } = require('../database/database');
    global.getDatabase = getDatabase;
    return importarDadosJSON();
  })
  .then(() => {
    console.log('✨ Processo finalizado!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Erro fatal:', err);
    process.exit(1);
  });

