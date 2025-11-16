const PokopowScraper = require('./pokopowScraper');
const { getDatabase } = require('../database/database');
const { buscarCapaJogo } = require('./capaService');
const { iniciarProgresso, atualizarProgresso, finalizarProgresso } = require('./syncProgress');

/**
 * Normaliza o nome do jogo para comparação
 */
function normalizarNome(nome) {
  if (!nome) return '';
  return nome
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim();
}

/**
 * Serviço para adicionar apenas jogos faltantes
 * Pode ser usado tanto pelo script quanto pela API
 * 
 * @param {boolean} modoCompleto - Se true, busca todos os jogos. Se false, verifica página principal primeiro
 * @returns {Promise<Object>} Resultado da sincronização
 */
async function adicionarJogosFaltantes(modoCompleto = false) {
  const db = getDatabase();
  const scraper = new PokopowScraper();
  
  let jogosAdicionados = 0;
  let contasAdicionadas = 0;
  let erros = 0;
  
  try {
    // 1. Buscar jogos que já estão no banco
    const jogosBanco = await new Promise((resolve, reject) => {
      db.all('SELECT id, nome FROM jogos', (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    // Criar Set com nomes normalizados dos jogos do banco
    const nomesBancoNormalizados = new Set();
    jogosBanco.forEach(jogo => {
      const nomeNormalizado = normalizarNome(jogo.nome);
      nomesBancoNormalizados.add(nomeNormalizado);
    });
    
    // 2. Buscar jogos do site (modo rápido ou completo)
    let jogosSite = [];
    
    if (modoCompleto) {
      // Modo completo: busca todos os jogos
      jogosSite = await scraper.encontrarTodosJogos();
    } else {
      // Modo rápido: verifica apenas a página principal primeiro
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
      
      // Verificar se há novos jogos na página principal
      const novosNaPrincipal = jogosPrincipalNormalizados.filter(jogo => {
        const nomeNormalizado = normalizarNome(jogo.nome);
        return nomeNormalizado.length > 2 && !nomesBancoNormalizados.has(nomeNormalizado);
      });
      
      if (novosNaPrincipal.length > 0) {
        // Se houver novos, buscar todos os jogos
        jogosSite = await scraper.encontrarTodosJogos();
      } else {
        // Nenhum jogo novo, retornar resultado vazio
        return {
          sucesso: true,
          modo: 'rapido',
          jogosNoBanco: jogosBanco.length,
          jogosEncontrados: 0,
          jogosFaltantes: 0,
          jogosAdicionados: 0,
          contasAdicionadas: 0,
          mensagem: 'Nenhum jogo novo detectado na página principal. Todos os jogos já estão sincronizados.'
        };
      }
    }
    
    if (jogosSite.length === 0) {
      return {
        sucesso: true,
        modo: modoCompleto ? 'completo' : 'rapido',
        jogosNoBanco: jogosBanco.length,
        jogosEncontrados: 0,
        jogosFaltantes: 0,
        jogosAdicionados: 0,
        contasAdicionadas: 0,
        mensagem: 'Nenhum jogo encontrado no site.'
      };
    }
    
    // 3. Filtrar apenas os jogos que NÃO estão no banco
    const jogosFaltantes = jogosSite.filter(jogo => {
      const nomeNormalizado = normalizarNome(jogo.nome);
      return !nomesBancoNormalizados.has(nomeNormalizado);
    });
    
    if (jogosFaltantes.length === 0) {
      return {
        sucesso: true,
        modo: modoCompleto ? 'completo' : 'rapido',
        jogosNoBanco: jogosBanco.length,
        jogosEncontrados: jogosSite.length,
        jogosFaltantes: 0,
        jogosAdicionados: 0,
        contasAdicionadas: 0,
        mensagem: 'Todos os jogos já estão no banco de dados!'
      };
    }
    
    // Iniciar progresso
    iniciarProgresso(jogosFaltantes.length);
    
    // 4. Processar jogos faltantes em lotes
    const tamanhoLote = 5;
    const totalLotes = Math.ceil(jogosFaltantes.length / tamanhoLote);
    
    for (let lote = 0; lote < totalLotes; lote++) {
      const inicioLote = lote * tamanhoLote;
      const fimLote = Math.min(inicioLote + tamanhoLote, jogosFaltantes.length);
      const jogosLote = jogosFaltantes.slice(inicioLote, fimLote);
      
      for (let i = 0; i < jogosLote.length; i++) {
        const jogo = jogosLote[i];
        const indiceGlobal = inicioLote + i + 1;
        
        try {
          // Buscar capa do jogo
          let capa = null;
          try {
            capa = await buscarCapaJogo(jogo.nome);
          } catch (capaErr) {
            // Ignorar erro de capa
          }
          
          // Adicionar jogo ao banco
          await new Promise((resolve) => {
            db.run(
              'INSERT INTO jogos (nome, descricao, preco, capa) VALUES (?, ?, ?, ?)',
              [jogo.nome, jogo.titulo_pagina || jogo.h1 || '', 0, capa || null],
              async function(insertErr) {
                if (insertErr) {
                  if (insertErr.message && insertErr.message.includes('UNIQUE')) {
                    // Duplicata, ignorar
                    resolve();
                    return;
                  }
                  erros++;
                  resolve();
                  return;
                }
                
                const jogoId = this.lastID;
                jogosAdicionados++;
                
                // Atualizar progresso
                atualizarProgresso(jogo, { novo: true, atualizado: false, contas: 0 });
                
                // Extrair credenciais do jogo
                if (jogo.url) {
                  try {
                    const credenciais = await scraper.extrairCredenciais(jogo.url);
                    
                    if (credenciais.length > 0) {
                      for (const cred of credenciais) {
                        if (cred.user && cred.pass) {
                          // Verificar se a conta já existe
                          await new Promise((resolveCred) => {
                            db.get(
                              'SELECT id FROM contas WHERE jogo_id = ? AND usuario = ?',
                              [jogoId, cred.user],
                              (err, row) => {
                                if (err || row) {
                                  resolveCred();
                                  return;
                                }
                                
                                // Conta não existe, adicionar
                                db.run(
                                  'INSERT INTO contas (jogo_id, usuario, senha, status) VALUES (?, ?, ?, ?)',
                                  [jogoId, cred.user, cred.pass, 'disponivel'],
                                  (insertCredErr) => {
                                    if (!insertCredErr) {
                                      contasAdicionadas++;
                                    }
                                    resolveCred();
                                  }
                                );
                              }
                            );
                          });
                        }
                      }
                    }
                  } catch (credErr) {
                    // Ignorar erro de credenciais
                  }
                }
                
                resolve();
              }
            );
          });
          
          // Delay entre jogos
          if (i < jogosLote.length - 1) {
            await scraper.sleep(2000);
          }
          
        } catch (error) {
          erros++;
        }
      }
      
      // Delay entre lotes
      if (lote < totalLotes - 1) {
        await scraper.sleep(3000);
      }
    }
    
    // Finalizar progresso
    finalizarProgresso('concluido', null);
    
    return {
      sucesso: true,
      modo: modoCompleto ? 'completo' : 'rapido',
      jogosNoBanco: jogosBanco.length,
      jogosEncontrados: jogosSite.length,
      jogosFaltantes: jogosFaltantes.length,
      jogosAdicionados: jogosAdicionados,
      contasAdicionadas: contasAdicionadas,
      erros: erros
    };
    
  } catch (error) {
    finalizarProgresso('erro', error.message);
    throw error;
  }
}

module.exports = {
  adicionarJogosFaltantes
};






