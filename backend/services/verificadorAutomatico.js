const PokopowScraper = require('./pokopowScraper');
const { getDatabase } = require('../database/database');
const { buscarCapaJogo } = require('./capaService');

/**
 * Serviço de verificação automática
 * Verifica periodicamente se há novos jogos ou contas no site
 */

class VerificadorAutomatico {
  constructor(intervaloMinutos = 60) {
    this.intervaloMinutos = intervaloMinutos;
    this.intervaloMs = intervaloMinutos * 60 * 1000;
    this.estaRodando = false;
    this.intervalId = null;
    this.ultimaVerificacao = null;
    this.proximaVerificacao = null;
  }

  /**
   * Inicia a verificação automática periódica
   */
  iniciar() {
    if (this.estaRodando) {
      console.log('⚠️  Verificador automático já está rodando');
      return;
    }

    console.log(`\n🔄 Iniciando verificação automática (a cada ${this.intervaloMinutos} minutos)...\n`);
    
    this.estaRodando = true;
    
    // Calcular próxima verificação
    this.proximaVerificacao = new Date(Date.now() + this.intervaloMs);
    
    // Executar imediatamente na primeira vez
    this.verificarNovosJogosEContas();
    
    // Depois executar periodicamente
    this.intervalId = setInterval(() => {
      this.verificarNovosJogosEContas();
      // Atualizar próxima verificação após cada execução
      this.proximaVerificacao = new Date(Date.now() + this.intervaloMs);
    }, this.intervaloMs);
  }

  /**
   * Para a verificação automática
   */
  parar() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.estaRodando = false;
    console.log('⏹️  Verificação automática parada');
  }

  /**
   * Verifica se há novos jogos ou contas e atualiza
   * Versão otimizada: verifica apenas a página principal primeiro
   */
  async verificarNovosJogosEContas() {
    const timestamp = new Date().toLocaleString('pt-BR');
    console.log(`\n🔍 [${timestamp}] Verificando novos jogos e contas...`);
    
    const db = getDatabase();
    const scraper = new PokopowScraper();
    
    try {
      // 1. Buscar jogos do banco primeiro
      const jogosBanco = await new Promise((resolve, reject) => {
        db.all('SELECT id, nome FROM jogos', (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });
      
      const jogosBancoNomes = new Set(jogosBanco.map(j => j.nome.toLowerCase()));
      console.log(`   💾 ${jogosBanco.length} jogos no banco de dados`);
      
      // 2. Buscar jogos apenas da página principal (mais rápido)
      console.log('   📡 Verificando página principal por novos jogos...');
      const jogosPrincipal = await scraper.extrairJogosDaPagina('https://pokopow.com');
      
      // Normalizar nomes dos jogos da página principal
      const jogosPrincipalNormalizados = jogosPrincipal.map(j => {
        // Extrair nome melhor da URL se necessário
        let nome = j.nome;
        if (!nome || nome.length < 3) {
          const urlParts = j.url.split('/').filter(p => p);
          nome = urlParts[urlParts.length - 1] || nome;
          nome = nome.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
        return { ...j, nome: nome.trim() };
      });
      
      const novosNaPrincipal = jogosPrincipalNormalizados.filter(j => {
        const nomeNormalizado = j.nome.toLowerCase().trim();
        return nomeNormalizado.length > 2 && !jogosBancoNomes.has(nomeNormalizado);
      });
      
      let jogosSite = jogosPrincipalNormalizados;
      
      // Se houver novos na principal, buscar todos os jogos
      if (novosNaPrincipal.length > 0) {
        console.log(`   ✨ ${novosNaPrincipal.length} novo(s) jogo(s) detectado(s) na página principal!`);
        console.log('   📡 Buscando todos os jogos do site para atualização completa...');
        jogosSite = await scraper.encontrarTodosJogos();
      } else {
        console.log('   ✅ Nenhum jogo novo detectado na página principal');
      }
      
      if (jogosSite.length === 0) {
        console.log('   ⚠️  Nenhum jogo encontrado no site');
        return;
      }
      
      console.log(`   📦 ${jogosSite.length} jogos encontrados no site`);
      
      // 2. Criar mapa de jogos do banco por nome
      const jogosBancoMap = new Map();
      jogosBanco.forEach(jogo => {
        jogosBancoMap.set(jogo.nome.toLowerCase(), jogo);
      });
      
      console.log(`   💾 ${jogosBanco.length} jogos no banco de dados`);
      
      // 4. Identificar novos jogos
      const novosJogos = jogosSite.filter(jogo => {
        const nomeNormalizado = jogo.nome.toLowerCase();
        return !jogosBancoMap.has(nomeNormalizado);
      });
      
      let novosJogosCount = 0;
      
      if (novosJogos.length > 0) {
        console.log(`   ✨ ${novosJogos.length} novo(s) jogo(s) encontrado(s)!`);
        
        // Adicionar novos jogos
        for (const jogo of novosJogos) {
          await this.adicionarNovoJogo(jogo, db, scraper);
          novosJogosCount++;
          await scraper.sleep(500); // Delay entre jogos
        }
      } else {
        console.log('   ✅ Nenhum jogo novo encontrado');
      }
      
      // 5. Verificar contas de jogos existentes (apenas alguns por vez para não sobrecarregar)
      console.log(`\n   🔐 Verificando contas de jogos existentes...`);
      let contasAdicionadas = 0;
      let jogosVerificados = 0;
      const maxJogosParaVerificar = 10; // Limitar para não sobrecarregar
      
      // Verificar apenas alguns jogos aleatórios ou os mais recentes
      const jogosParaVerificar = jogosBanco.slice(0, maxJogosParaVerificar);
      
      for (const jogoBanco of jogosParaVerificar) {
        // Verificar se o jogo tem URL do site
        const jogoSite = jogosSite.find(j => 
          j.nome.toLowerCase() === jogoBanco.nome.toLowerCase()
        );
        
        if (jogoSite && jogoSite.url) {
          // Buscar contas existentes
          const contasExistentes = await new Promise((resolve) => {
            db.all('SELECT usuario FROM contas WHERE jogo_id = ?', 
              [jogoBanco.id], (err, rows) => {
                resolve(err ? [] : (rows || []).map(r => r.usuario.toLowerCase()));
              });
          });
          
          const usuariosExistentes = new Set(contasExistentes);
          
          // Extrair credenciais do site
          const credenciais = await scraper.extrairCredenciais(jogoSite.url);
          
          // Filtrar apenas novas contas
          const novasCredenciais = credenciais.filter(cred => 
            cred.user && cred.pass && !usuariosExistentes.has(cred.user.toLowerCase())
          );
          
          if (novasCredenciais.length > 0) {
            console.log(`      ➕ ${novasCredenciais.length} nova(s) conta(s) para: ${jogoBanco.nome}`);
            
            for (const cred of novasCredenciais) {
              await new Promise((resolve) => {
                db.run(
                  'INSERT INTO contas (jogo_id, usuario, senha, status) VALUES (?, ?, ?, ?)',
                  [jogoBanco.id, cred.user, cred.pass, 'disponivel'],
                  (err) => {
                    if (!err) contasAdicionadas++;
                    resolve();
                  }
                );
              });
            }
          }
          
          jogosVerificados++;
          await scraper.sleep(1000); // Delay entre requisições
        }
      }
      
      if (jogosVerificados > 0) {
        console.log(`   📊 ${jogosVerificados} jogo(s) verificado(s) para novas contas`);
      }
      
      if (contasAdicionadas > 0) {
        console.log(`   ✅ ${contasAdicionadas} nova(s) conta(s) adicionada(s)`);
      } else {
        console.log('   ✅ Nenhuma conta nova encontrada');
      }
      
      // Registrar sincronização no banco
      await this.registrarSincronizacao(db, {
        tipo: 'automatica',
        jogos_encontrados: jogosSite.length,
        jogos_adicionados: novosJogosCount,
        jogos_atualizados: 0,
        contas_adicionadas: contasAdicionadas,
        status: 'sucesso'
      });
      
      // Atualizar timestamp da última verificação
      this.ultimaVerificacao = new Date();
      
      console.log(`\n✅ [${timestamp}] Verificação concluída!\n`);
      
    } catch (error) {
      console.error(`❌ Erro na verificação automática:`, error);
      
      // Registrar erro na sincronização
      try {
        await this.registrarSincronizacao(db, {
          tipo: 'automatica',
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
  async registrarSincronizacao(db, dados) {
    return new Promise((resolve, reject) => {
      const timestamp = new Date().toISOString();
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
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  /**
   * Adiciona um novo jogo ao banco
   */
  async adicionarNovoJogo(jogo, db, scraper) {
    return new Promise((resolve) => {
      console.log(`   ➕ Adicionando novo jogo: ${jogo.nome}`);
      
      // Buscar capa
      buscarCapaJogo(jogo.nome).then(capa => {
        db.run(
          'INSERT INTO jogos (nome, descricao, preco, capa) VALUES (?, ?, ?, ?)',
          [jogo.nome, jogo.titulo_pagina || jogo.h1 || '', 0, capa || null],
          async function(err) {
            if (err) {
              console.error(`      ❌ Erro ao adicionar ${jogo.nome}:`, err);
              resolve();
              return;
            }
            
            const jogoId = this.lastID;
            console.log(`      ✅ Jogo adicionado (ID: ${jogoId})`);
            
            // Extrair credenciais
            if (jogo.url) {
              const credenciais = await scraper.extrairCredenciais(jogo.url);
              
              if (credenciais.length > 0) {
                console.log(`      🔐 ${credenciais.length} conta(s) encontrada(s)`);
                
                for (const cred of credenciais) {
                  if (cred.user && cred.pass) {
                    await new Promise((resolveCred) => {
                      db.run(
                        'INSERT INTO contas (jogo_id, usuario, senha, status) VALUES (?, ?, ?, ?)',
                        [jogoId, cred.user, cred.pass, 'disponivel'],
                        resolveCred
                      );
                    });
                  }
                }
              }
            }
            
            resolve();
          }
        );
      });
    });
  }
}

// Criar instância global
let verificadorGlobal = null;

/**
 * Inicia a verificação automática
 * @param {number} intervaloMinutos - Intervalo em minutos (padrão: 60)
 */
function iniciarVerificacaoAutomatica(intervaloMinutos = 60) {
  if (!verificadorGlobal) {
    verificadorGlobal = new VerificadorAutomatico(intervaloMinutos);
  }
  verificadorGlobal.iniciar();
}

/**
 * Para a verificação automática
 */
function pararVerificacaoAutomatica() {
  if (verificadorGlobal) {
    verificadorGlobal.parar();
  }
}

/**
 * Obtém informações sobre o timer da verificação
 */
function obterInfoTimer() {
  if (!verificadorGlobal || !verificadorGlobal.estaRodando) {
    return {
      ativo: false,
      proximaVerificacao: null,
      tempoRestante: null,
      tempoRestanteFormatado: 'N/A'
    };
  }
  
  const agora = new Date();
  const proxima = verificadorGlobal.proximaVerificacao;
  
  if (!proxima) {
    return {
      ativo: true,
      proximaVerificacao: null,
      tempoRestante: null,
      tempoRestanteFormatado: 'Calculando...'
    };
  }
  
  const diffMs = proxima - agora;
  const diffMinutos = Math.floor(diffMs / 60000);
  const diffSegundos = Math.floor((diffMs % 60000) / 1000);
  const diffHoras = Math.floor(diffMinutos / 60);
  
  let tempoFormatado = '';
  if (diffMs <= 0) {
    tempoFormatado = 'Em execução agora';
  } else if (diffHoras > 0) {
    tempoFormatado = `${diffHoras}h ${diffMinutos % 60}min`;
  } else if (diffMinutos > 0) {
    tempoFormatado = `${diffMinutos}min ${diffSegundos}s`;
  } else {
    tempoFormatado = `${diffSegundos}s`;
  }
  
  return {
    ativo: true,
    proximaVerificacao: proxima.toISOString(),
    tempoRestante: diffMs,
    tempoRestanteFormatado: tempoFormatado,
    ultimaVerificacao: verificadorGlobal.ultimaVerificacao ? verificadorGlobal.ultimaVerificacao.toISOString() : null,
    intervaloMinutos: verificadorGlobal.intervaloMinutos
  };
}

module.exports = {
  VerificadorAutomatico,
  iniciarVerificacaoAutomatica,
  pararVerificacaoAutomatica,
  obterInfoTimer
};

