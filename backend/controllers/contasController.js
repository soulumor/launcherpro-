const { getDatabase } = require('../database/database');
const TestadorLoginSteam = require('../services/testadorLoginSteam');

/**
 * Helpers para garantir que os IDs de jogos usados nos uploads existam
 */
const normalizarNomeJogo = (nome) => {
  return typeof nome === 'string' ? nome.trim().toLowerCase() : null;
};

const buscarJogoPorId = (db, jogoId) => {
  return new Promise((resolve) => {
    db.get('SELECT id, nome FROM jogos WHERE id = ?', [jogoId], (err, row) => {
      if (err) {
        console.error(`Erro ao buscar jogo por ID (${jogoId}):`, err);
        return resolve(null);
      }
      resolve(row || null);
    });
  });
};

const buscarJogoPorNome = (db, nome) => {
  const nomeNormalizado = normalizarNomeJogo(nome);
  if (!nomeNormalizado) return Promise.resolve(null);
  
  return new Promise((resolve) => {
    db.get(
      'SELECT id, nome FROM jogos WHERE LOWER(TRIM(nome)) = ? LIMIT 1',
      [nomeNormalizado],
      (err, row) => {
        if (err) {
          console.error(`Erro ao buscar jogo por nome (${nome}):`, err);
          return resolve(null);
        }
        resolve(row || null);
      }
    );
  });
};

const criarJogoAutomatico = (db, { nome, descricao, preco = 0, capa = null }) => {
  return new Promise((resolve) => {
    db.run(
      'INSERT INTO jogos (nome, descricao, preco, capa) VALUES (?, ?, ?, ?)',
      [nome, descricao, preco, capa],
      function(err) {
        if (err) {
          console.error('Erro ao criar jogo automaticamente durante upload:', err);
          return resolve(null);
        }
        resolve(this.lastID || null);
      }
    );
  });
};

async function garantirJogoParaConta({ db, conta, cacheMap, stats }) {
  const originalIdRaw = conta.jogo_id ?? conta.jogoid ?? conta['jogo id'];
  const originalId = parseInt(originalIdRaw, 10);
  
  if (!originalId || Number.isNaN(originalId)) {
    console.warn('Conta ignorada por jogo_id inválido:', originalIdRaw);
    return null;
  }
  
  if (cacheMap.has(originalId)) {
    return cacheMap.get(originalId);
  }
  
  const jogoExistente = await buscarJogoPorId(db, originalId);
  if (jogoExistente) {
    cacheMap.set(originalId, originalId);
    return originalId;
  }
  
  // Tentar mapear por nome, se fornecido
  const nomeInformado = conta.jogo_nome || conta.nome || conta.game || conta.jogo;
  if (nomeInformado) {
    const jogoPorNome = await buscarJogoPorNome(db, nomeInformado);
    if (jogoPorNome) {
      cacheMap.set(originalId, jogoPorNome.id);
      stats.reaproveitados.push({
        origemId: originalId,
        destinoId: jogoPorNome.id,
        nome: jogoPorNome.nome
      });
      console.log(`♻️  Reaproveitando jogo existente "${jogoPorNome.nome}" (ID ${jogoPorNome.id}) para o jogo_id original ${originalId}`);
      return jogoPorNome.id;
    }
  }
  
  // Criar placeholder automático
  const nomeParaCriar = nomeInformado?.trim() && nomeInformado.trim().length > 0
    ? nomeInformado.trim()
    : `Jogo importado #${originalId}`;
    
  const descricao = nomeInformado
    ? `Criado automaticamente durante upload de contas (ID original: ${originalId}).`
    : 'Criado automaticamente durante upload de contas (nome não informado).';
    
  const preco = conta.jogo_preco && !Number.isNaN(parseFloat(conta.jogo_preco))
    ? parseFloat(conta.jogo_preco)
    : 0;
    
  const novoJogoId = await criarJogoAutomatico(db, {
    nome: nomeParaCriar,
    descricao,
    preco,
    capa: conta.jogo_capa || null
  });
  
  if (novoJogoId) {
    cacheMap.set(originalId, novoJogoId);
    stats.criados.push({
      origemId: originalId,
      novoId: novoJogoId,
      nome: nomeParaCriar
    });
    console.log(`🆕 Jogo criado automaticamente: ${nomeParaCriar} (novo ID: ${novoJogoId}, ID original: ${originalId})`);
    return novoJogoId;
  }
  
  console.error(`❌ Não foi possível criar um jogo para o jogo_id ${originalId}. Conta será ignorada.`);
  return null;
}

/**
 * Controller para gerenciar operações relacionadas a contas
 */

/**
 * Lista todas as contas de um jogo específico
 * GET /api/contas/:jogoId
 * Busca contas de TODOS os IDs do mesmo jogo (agrupado por nome normalizado)
 */
exports.listarContasPorJogo = (req, res) => {
  const db = getDatabase();
  const { jogoId } = req.params;
  
  // Primeiro, buscar o nome do jogo pelo ID
  db.get(
    'SELECT nome FROM jogos WHERE id = ?',
    [jogoId],
    (err, jogo) => {
      if (err) {
        console.error('Erro ao buscar jogo:', err);
        return res.status(500).json({ error: 'Erro ao buscar jogo' });
      }
      
      if (!jogo) {
        return res.status(404).json({ error: 'Jogo não encontrado' });
      }
      
      // Buscar contas de TODOS os IDs do mesmo jogo (mesmo nome normalizado)
      // Isso resolve o problema de jogos duplicados com contas em IDs diferentes
      const nomeNormalizado = jogo.nome.toLowerCase().trim();
      
      db.all(
        `SELECT DISTINCT c.* 
         FROM contas c
         INNER JOIN jogos j ON c.jogo_id = j.id
         WHERE LOWER(TRIM(j.nome)) = ?
         ORDER BY c.id DESC`,
        [nomeNormalizado],
        (err, rows) => {
          if (err) {
            console.error('Erro ao buscar contas:', err);
            return res.status(500).json({ error: 'Erro ao buscar contas' });
          }
          
          // Garantir que rows é um array válido
          // Se recebeu o objeto Result do PostgreSQL, extrair rows
          let rowsArray = rows;
          if (!Array.isArray(rows)) {
            if (rows && Array.isArray(rows.rows)) {
              // Recebeu objeto Result do PostgreSQL - extrair rows
              rowsArray = rows.rows;
            } else {
              console.error('Erro: rows não é um array:', typeof rows, rows);
              return res.status(500).json({ error: 'Erro ao processar dados das contas' });
            }
          }
          
          // Debug: log das contas retornadas
          console.log(`📊 Retornando ${rowsArray.length} conta(s) para jogo ${jogoId} (nome: "${jogo.nome}")`);
          console.log(`   Buscando por nome normalizado: "${nomeNormalizado}"`);
          const statusCount = {};
          rowsArray.forEach(conta => {
            statusCount[conta.status] = (statusCount[conta.status] || 0) + 1;
          });
          console.log('📋 Status das contas:', statusCount);
          
          res.json(rowsArray);
        }
      );
    }
  );
};

/**
 * Adiciona uma nova conta
 * POST /api/contas
 * Body: { jogo_id, usuario, senha, status }
 */
exports.adicionarConta = (req, res) => {
  const db = getDatabase();
  const { jogo_id, usuario, senha, status } = req.body;
  
  // Validação básica
  if (!jogo_id || !usuario || !senha) {
    return res.status(400).json({ error: 'jogo_id, usuario e senha são obrigatórios' });
  }
  
  db.run(
    'INSERT INTO contas (jogo_id, usuario, senha, status) VALUES (?, ?, ?, ?)',
    [jogo_id, usuario, senha, status || 'disponivel'],
    function(err) {
      if (err) {
        console.error('Erro ao adicionar conta:', err);
        return res.status(500).json({ error: 'Erro ao adicionar conta' });
      }
      
      // Retornar a conta recém-criada
      db.get('SELECT * FROM contas WHERE id = ?', [this.lastID], (err, row) => {
        if (err) {
          return res.status(500).json({ error: 'Conta criada mas erro ao buscar dados' });
        }
        res.status(201).json(row);
      });
    }
  );
};

/**
 * Testa uma conta Steam específica
 * POST /api/contas/testar
 * Body: { usuario, senha }
 */
exports.testarConta = async (req, res) => {
  const { usuario, senha } = req.body;
  
  if (!usuario || !senha) {
    return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
  }
  
  try {
    const testador = new TestadorLoginSteam();
    
    // Verificar se SteamCMD está disponível
    const steamCmdDisponivel = await testador.verificarSteamCmd();
    const isLinux = process.platform === 'linux';
    const isWindows = process.platform === 'win32';
    
    if (!steamCmdDisponivel) {
      let mensagem = 'SteamCMD não está disponível no servidor';
      let detalhes = 'O testador de contas requer SteamCMD instalado';
      
      if (isLinux) {
        mensagem = 'SteamCMD não está disponível no servidor (Render/Linux)';
        detalhes = 'O teste de contas Steam não está disponível na nuvem. Para testar contas, execute o backend localmente no Windows com SteamCMD instalado.';
      } else if (isWindows) {
        detalhes = 'Instale o SteamCMD em C:\\steamcmd\\ ou execute o instalador automático na primeira vez.';
      }
      
      return res.status(503).json({ 
        error: mensagem,
        detalhes: detalhes,
        plataforma: process.platform,
        solucao: isLinux ? 'Execute o backend localmente no Windows para testar contas Steam' : 'Instale o SteamCMD no servidor'
      });
    }
    
    console.log(`🔐 Testando conta via API: ${usuario}`);
    
    const resultado = await testador.testarLoginReal(usuario, senha);
    
    res.json({
      usuario: resultado.usuario,
      sucesso: resultado.sucesso,
      status: resultado.status,
      motivo: resultado.motivo,
      duracao: resultado.duracao,
      timestamp: resultado.timestamp
    });
    
  } catch (error) {
    console.error('Erro ao testar conta:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor ao testar conta',
      detalhes: error.message 
    });
  }
};

/**
 * Testa uma conta específica por ID
 * POST /api/contas/testar/:contaId
 */
exports.testarContaPorId = async (req, res) => {
  const { contaId } = req.params;
  const db = getDatabase();
  
  try {
    // Buscar conta no banco
    db.get(
      'SELECT * FROM contas WHERE id = ?',
      [contaId],
      async (err, conta) => {
        if (err) {
          return res.status(500).json({ error: 'Erro ao buscar conta' });
        }
        
        if (!conta) {
          return res.status(404).json({ error: 'Conta não encontrada' });
        }
        
        const testador = new TestadorLoginSteam();
        
        // Verificar se SteamCMD está disponível
        const steamCmdDisponivel = await testador.verificarSteamCmd();
        const isLinux = process.platform === 'linux';
        const isWindows = process.platform === 'win32';
        
        if (!steamCmdDisponivel) {
          let mensagem = 'SteamCMD não está disponível no servidor';
          let detalhes = 'O testador de contas requer SteamCMD instalado';
          
          if (isLinux) {
            mensagem = 'SteamCMD não está disponível no servidor (Render/Linux)';
            detalhes = 'O teste de contas Steam não está disponível na nuvem. Para testar contas, execute o backend localmente no Windows com SteamCMD instalado.';
          } else if (isWindows) {
            detalhes = 'Instale o SteamCMD em C:\\steamcmd\\ ou execute o instalador automático na primeira vez.';
          }
          
          return res.status(503).json({ 
            error: mensagem,
            detalhes: detalhes,
            plataforma: process.platform,
            solucao: isLinux ? 'Execute o backend localmente no Windows para testar contas Steam' : 'Instale o SteamCMD no servidor'
          });
        }
        
        console.log(`🔐 Retestando conta ID ${contaId}: ${conta.usuario}`);
        
        const resultado = await testador.testarLoginReal(conta.usuario, conta.senha);
        resultado.conta_id = conta.id;
        resultado.jogo_id = conta.jogo_id;
        
        // Se a conta for válida, adicionar o jogo à biblioteca do app automaticamente
        // Verificar múltiplos status válidos
        const statusValidos = ['valido', 'disponivel', 'funcionando', 'valid'];
        const statusLower = resultado.status?.toLowerCase() || '';
        const contaValida = resultado.sucesso && statusValidos.includes(statusLower);
        
        console.log(`\n🔍 VERIFICANDO ADIÇÃO À BIBLIOTECA (conta individual)`);
        console.log(`   sucesso=${resultado.sucesso}, status="${resultado.status}", contaValida=${contaValida}`);
        
        if (contaValida) {
          try {
            // Adicionar jogo à biblioteca do app
            await new Promise((resolve) => {
              // Primeiro, verificar se a tabela biblioteca existe
              db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='biblioteca'", (tableErr, table) => {
                if (tableErr) {
                  console.error('❌ Erro ao verificar tabela biblioteca:', tableErr);
                  resultado.biblioteca_adicionada = false;
                  resultado.biblioteca_mensagem = 'Erro ao verificar tabela biblioteca';
                  resolve();
                  return;
                }
                
                if (!table) {
                  console.error('❌ Tabela biblioteca não existe! Criando...');
                  db.run(`
                    CREATE TABLE IF NOT EXISTS biblioteca (
                      id INTEGER PRIMARY KEY AUTOINCREMENT,
                      jogo_id INTEGER NOT NULL,
                      conta_id INTEGER,
                      data_adicao TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                      FOREIGN KEY (jogo_id) REFERENCES jogos(id),
                      FOREIGN KEY (conta_id) REFERENCES contas(id),
                      UNIQUE(jogo_id, conta_id)
                    )
                  `, (createErr) => {
                    if (createErr) {
                      console.error('❌ Erro ao criar tabela biblioteca:', createErr);
                      resultado.biblioteca_adicionada = false;
                      resultado.biblioteca_mensagem = 'Erro ao criar tabela biblioteca';
                      resolve();
                      return;
                    }
                    console.log('✅ Tabela biblioteca criada!');
                    verificarEAdicionar();
                  });
                } else {
                  verificarEAdicionar();
                }
                
                function verificarEAdicionar() {
                  // Verificar se já está na biblioteca
                  db.get('SELECT id FROM biblioteca WHERE jogo_id = ? AND conta_id = ?', 
                    [conta.jogo_id, conta.id], 
                    (err, existing) => {
                      if (err) {
                        console.error(`❌ Erro ao verificar biblioteca (conta_id: ${conta.id}):`, err);
                        resultado.biblioteca_adicionada = false;
                        resultado.biblioteca_mensagem = `Erro ao verificar biblioteca: ${err.message}`;
                        resolve();
                        return;
                      }
                      
                      if (existing) {
                        console.log(`📚 Conta já está na biblioteca (conta_id: ${conta.id})`);
                        resultado.biblioteca_adicionada = true;
                        resultado.biblioteca_mensagem = 'Conta já estava na biblioteca';
                        resolve();
                        return;
                      }
                      
                      // Verificar se o jogo já está na biblioteca (com outra conta)
                      db.get('SELECT id FROM biblioteca WHERE jogo_id = ? LIMIT 1', 
                        [conta.jogo_id], 
                        (jogoErr, jogoExistente) => {
                          if (jogoErr) {
                            console.error('Erro ao verificar se jogo já está na biblioteca:', jogoErr);
                          }
                          
                          // Adicionar à biblioteca (mesmo que o jogo já esteja, adiciona a conta)
                          console.log(`📚 Tentando adicionar jogo_id=${conta.jogo_id}, conta_id=${conta.id} à biblioteca`);
                          db.run('INSERT INTO biblioteca (jogo_id, conta_id) VALUES (?, ?)', 
                            [conta.jogo_id, conta.id], 
                            function(insertErr) {
                              if (insertErr) {
                                console.error(`❌ Erro ao adicionar à biblioteca (conta_id: ${conta.id}):`, insertErr);
                                console.error('   Detalhes do erro:', insertErr.message);
                                console.error('   Código do erro:', insertErr.code);
                                resultado.biblioteca_adicionada = false;
                                resultado.biblioteca_mensagem = `Erro ao adicionar à biblioteca: ${insertErr.message}`;
                              } else {
                                console.log(`✅ Conta adicionada à biblioteca (jogo_id: ${conta.jogo_id}, conta_id: ${conta.id}, biblioteca_id: ${this.lastID})`);
                                resultado.biblioteca_adicionada = true;
                                resultado.biblioteca_mensagem = 'Conta adicionada à biblioteca com sucesso';
                              }
                              resolve();
                            }
                          );
                        }
                      );
                    }
                  );
                }
              });
            });
          } catch (err) {
            console.error(`❌ Erro ao tentar adicionar jogo à biblioteca (conta_id: ${conta.id}):`, err);
            console.error('   Stack:', err.stack);
            resultado.biblioteca_adicionada = false;
            resultado.biblioteca_mensagem = `Erro ao processar adição à biblioteca: ${err.message}`;
          }
        } else {
          console.log(`⚠️ Conta não é válida, não será adicionada à biblioteca`);
        }
        
        res.json({
          conta_id: resultado.conta_id,
          jogo_id: resultado.jogo_id,
          usuario: resultado.usuario,
          sucesso: resultado.sucesso,
          status: resultado.status,
          motivo: resultado.motivo,
          duracao: resultado.duracao,
          timestamp: resultado.timestamp,
          biblioteca_adicionada: resultado.biblioteca_adicionada || false,
          biblioteca_mensagem: resultado.biblioteca_mensagem || null
        });
      }
    );
    
  } catch (error) {
    console.error('Erro ao testar conta por ID:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      detalhes: error.message 
    });
  }
};

/**
 * Testa todas as contas de um jogo
 * POST /api/contas/testar-jogo/:jogoId
 * Body: { limite? }
 */
exports.testarContasJogo = async (req, res) => {
  const { jogoId } = req.params;
  const { limite = 5 } = req.body;
  const db = getDatabase();
  
  try {
    const testador = new TestadorLoginSteam();
    
    // Verificar se SteamCMD está disponível
    const steamCmdDisponivel = await testador.verificarSteamCmd();
    const isLinux = process.platform === 'linux';
    const isWindows = process.platform === 'win32';
    
    if (!steamCmdDisponivel) {
      let mensagem = 'SteamCMD não está disponível no servidor';
      let detalhes = 'O testador de contas requer SteamCMD instalado';
      
      if (isLinux) {
        mensagem = 'SteamCMD não está disponível no servidor (Render/Linux)';
        detalhes = 'O teste de contas Steam não está disponível na nuvem. Para testar contas, execute o backend localmente no Windows com SteamCMD instalado.';
      } else if (isWindows) {
        detalhes = 'Instale o SteamCMD em C:\\steamcmd\\ ou execute o instalador automático na primeira vez.';
      }
      
      return res.status(503).json({ 
        error: mensagem,
        detalhes: detalhes,
        plataforma: process.platform,
        solucao: isLinux ? 'Execute o backend localmente no Windows para testar contas Steam' : 'Instale o SteamCMD no servidor'
      });
    }
    
    console.log(`🎮 Testando contas do jogo ${jogoId} via API`);
    
    const resultados = await testador.testarContasDoJogo(parseInt(jogoId), limite);
    
    // Adicionar contas válidas à biblioteca automaticamente
    const statusValidos = ['valido', 'disponivel', 'funcionando', 'valid'];
    let contasAdicionadas = 0;
    let contasJaNaBiblioteca = 0;
    
    console.log(`\n📚 PROCESSANDO ADIÇÃO À BIBLIOTECA...`);
    console.log(`   Total de resultados: ${resultados.length}`);
    
    for (const resultado of resultados) {
      const statusLower = (resultado.status || '').toLowerCase().trim();
      const isValido = resultado.sucesso === true && statusValidos.includes(statusLower);
      
      console.log(`   Conta ID ${resultado.conta_id}:`);
      console.log(`      - sucesso: ${resultado.sucesso} (tipo: ${typeof resultado.sucesso})`);
      console.log(`      - status: "${resultado.status}" (lowercase: "${statusLower}")`);
      console.log(`      - statusValidos: [${statusValidos.join(', ')}]`);
      console.log(`      - isValido: ${isValido}`);
      console.log(`      - jogo_id: ${resultado.jogo_id}`);
      
      if (isValido) {
        console.log(`   ✅ Conta ${resultado.conta_id} é VÁLIDA - processando adição à biblioteca...`);
        try {
          await new Promise((resolve) => {
            // Primeiro, verificar se a tabela biblioteca existe
            db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='biblioteca'", (tableErr, table) => {
              if (tableErr) {
                console.error('❌ Erro ao verificar tabela biblioteca:', tableErr);
                resolve();
                return;
              }
              
              if (!table) {
                console.error('❌ Tabela biblioteca não existe! Criando...');
                db.run(`
                  CREATE TABLE IF NOT EXISTS biblioteca (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    jogo_id INTEGER NOT NULL,
                    conta_id INTEGER,
                    data_adicao TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (jogo_id) REFERENCES jogos(id),
                    FOREIGN KEY (conta_id) REFERENCES contas(id),
                    UNIQUE(jogo_id, conta_id)
                  )
                `, (createErr) => {
                  if (createErr) {
                    console.error('❌ Erro ao criar tabela biblioteca:', createErr);
                    resolve();
                    return;
                  }
                  console.log('✅ Tabela biblioteca criada!');
                  // Continuar com a inserção
                  verificarEAdicionar();
                });
              } else {
                verificarEAdicionar();
              }
              
              function verificarEAdicionar() {
                // Verificar se já está na biblioteca
                db.get('SELECT id FROM biblioteca WHERE jogo_id = ? AND conta_id = ?', 
                  [resultado.jogo_id, resultado.conta_id], 
                  (err, existing) => {
                    if (err) {
                      console.error(`❌ Erro ao verificar biblioteca (conta_id: ${resultado.conta_id}):`, err);
                      resolve();
                      return;
                    }
                    
                    if (existing) {
                      console.log(`📚 Conta já está na biblioteca (conta_id: ${resultado.conta_id})`);
                      contasJaNaBiblioteca++;
                      resolve();
                      return;
                    }
                    
                    // Verificar se o jogo já está na biblioteca (com outra conta)
                    db.get('SELECT id FROM biblioteca WHERE jogo_id = ? LIMIT 1', 
                      [resultado.jogo_id], 
                      (jogoErr, jogoExistente) => {
                        if (jogoErr) {
                          console.error('Erro ao verificar se jogo já está na biblioteca:', jogoErr);
                        }
                        
                        // Adicionar à biblioteca (mesmo que o jogo já esteja, adiciona a conta)
                        console.log(`📚 Adicionando jogo_id=${resultado.jogo_id}, conta_id=${resultado.conta_id} à biblioteca`);
                        db.run('INSERT INTO biblioteca (jogo_id, conta_id) VALUES (?, ?)', 
                          [resultado.jogo_id, resultado.conta_id], 
                          function(insertErr) {
                            if (insertErr) {
                              console.error(`❌ Erro ao adicionar à biblioteca (conta_id: ${resultado.conta_id}):`, insertErr);
                              console.error('   Detalhes do erro:', insertErr.message);
                              console.error('   Código do erro:', insertErr.code);
                            } else {
                              console.log(`✅ Conta adicionada à biblioteca (jogo_id: ${resultado.jogo_id}, conta_id: ${resultado.conta_id}, biblioteca_id: ${this.lastID})`);
                              contasAdicionadas++;
                            }
                            resolve();
                          }
                        );
                      }
                    );
                  }
                );
              }
            });
          });
        } catch (err) {
          console.error(`❌ Erro ao tentar adicionar jogo à biblioteca (conta_id: ${resultado.conta_id}):`, err);
          console.error('   Stack:', err.stack);
        }
      }
    }
    
    const contasValidasNaoProcessadas = resultados.filter(r => {
      const statusLower = (r.status || '').toLowerCase().trim();
      return r.sucesso === true && statusValidos.includes(statusLower);
    }).length - contasAdicionadas - contasJaNaBiblioteca;
    
    console.log(`\n📊 RESUMO DA ADIÇÃO À BIBLIOTECA:`);
    console.log(`   ✅ Contas adicionadas: ${contasAdicionadas}`);
    console.log(`   📚 Contas já na biblioteca: ${contasJaNaBiblioteca}`);
    console.log(`   ⚠️  Contas válidas não processadas: ${contasValidasNaoProcessadas}`);
    
    if (contasAdicionadas === 0 && contasJaNaBiblioteca === 0) {
      const totalValidas = resultados.filter(r => {
        const statusLower = (r.status || '').toLowerCase().trim();
        return r.sucesso === true && statusValidos.includes(statusLower);
      }).length;
      
      if (totalValidas > 0) {
        console.log(`\n⚠️  ATENÇÃO: ${totalValidas} conta(s) válida(s) encontrada(s), mas nenhuma foi adicionada à biblioteca!`);
        console.log(`   Verifique os logs acima para ver o motivo.`);
      }
    }
    
    // Estatísticas
    const stats = {
      total: resultados.length,
      validas: resultados.filter(r => r.sucesso).length,
      invalidas: resultados.filter(r => r.status === 'credenciais_invalidas').length,
      steamGuard: resultados.filter(r => r.status === 'steam_guard').length,
      erros: resultados.filter(r => !r.sucesso && r.status !== 'credenciais_invalidas' && r.status !== 'steam_guard').length
    };
    
    res.json({
      jogoId: parseInt(jogoId),
      limite,
      estatisticas: stats,
      resultados: resultados,
      biblioteca: {
        adicionadas: contasAdicionadas,
        ja_estavam: contasJaNaBiblioteca
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Erro ao testar contas do jogo:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      detalhes: error.message 
    });
  }
};

/**
 * Atualiza status das contas baseado em resultados de teste
 * POST /api/contas/atualizar-status
 * Body: { resultados: Array }
 */
exports.atualizarStatusContas = async (req, res) => {
  const { resultados } = req.body;
  
  if (!Array.isArray(resultados)) {
    return res.status(400).json({ error: 'Resultados deve ser um array' });
  }
  
  try {
    const testador = new TestadorLoginSteam();
    const contasAtualizadas = await testador.atualizarStatusContas(resultados);
    
    res.json({
      sucesso: true,
      contasAtualizadas,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Erro ao atualizar status das contas:', error);
    res.status(500).json({ 
      error: 'Erro ao atualizar status das contas',
      detalhes: error.message 
    });
  }
};

/**
 * Processa upload de arquivo com contas e distribui para todos os clientes
 * POST /api/contas/upload
 * Body: FormData com arquivo (JSON, CSV ou TXT)
 */
exports.uploadContas = async (req, res) => {
  const db = getDatabase();
  
  if (!req.file) {
    return res.status(400).json({ error: 'Arquivo não fornecido' });
  }
  
  try {
    const arquivo = req.file.buffer.toString('utf8');
    const extensao = req.file.originalname.split('.').pop().toLowerCase();
    
    let contas = [];
    
    // Processar JSON
    if (extensao === 'json') {
      const dados = JSON.parse(arquivo);
      contas = Array.isArray(dados) ? dados : dados.contas || [];
    }
    // Processar CSV
    else if (extensao === 'csv') {
      const linhas = arquivo.split('\n').filter(l => l.trim());
      if (linhas.length === 0) {
        return res.status(400).json({ error: 'Arquivo CSV vazio' });
      }
      
      const headers = linhas[0].split(',').map(h => h.trim().toLowerCase());
      
      for (let i = 1; i < linhas.length; i++) {
        const valores = linhas[i].split(',').map(v => v.trim());
        const conta = {};
        headers.forEach((header, idx) => {
          conta[header] = valores[idx];
        });
        
        // Mapear campos comuns
        const jogoId = conta.jogo_id || conta.jogoid || conta['jogo id'];
        const usuario = conta.usuario || conta.user || conta.username;
        const senha = conta.senha || conta.pass || conta.password;
        
        if (jogoId && usuario && senha) {
          contas.push({ jogo_id: parseInt(jogoId), usuario, senha });
        }
      }
    }
    // Processar TXT (formato: jogo_id|usuario|senha)
    else if (extensao === 'txt') {
      const linhas = arquivo.split('\n').filter(l => l.trim());
      linhas.forEach(linha => {
        const partes = linha.split('|').map(p => p.trim());
        if (partes.length >= 3) {
          contas.push({
            jogo_id: parseInt(partes[0]),
            usuario: partes[1],
            senha: partes[2]
          });
        }
      });
    } else {
      return res.status(400).json({ error: 'Formato de arquivo não suportado. Use JSON, CSV ou TXT' });
    }
    
    if (contas.length === 0) {
      return res.status(400).json({ error: 'Nenhuma conta válida encontrada no arquivo' });
    }
    
    let adicionadas = 0;
    let duplicadas = 0;
    let erros = 0;
    
    // Estatísticas para criação/mapeamento de jogos
    const jogoIdCache = new Map();
    const jogosStats = {
      criados: [],
      reaproveitados: []
    };
    
    // Adicionar cada conta
    for (const conta of contas) {
      try {
        if ((!conta.jogo_id && !conta.jogoid && !conta['jogo id']) || !conta.usuario || !conta.senha) {
          erros++;
          continue;
        }
        
        const jogoValidoId = await garantirJogoParaConta({
          db,
          conta,
          cacheMap: jogoIdCache,
          stats: jogosStats
        });
        
        if (!jogoValidoId) {
          erros++;
          continue;
        }
        
        const jogoIdNormalizado = jogoValidoId;
        const usuarioNormalizado = conta.usuario;
        
        // Verificar se já existe
        const existe = await new Promise((resolve) => {
          db.get(
            'SELECT id FROM contas WHERE jogo_id = ? AND LOWER(usuario) = LOWER(?)',
            [jogoIdNormalizado, usuarioNormalizado],
            (err, row) => resolve(!!row)
          );
        });
        
        if (existe) {
          duplicadas++;
          continue;
        }
        
        // Adicionar conta (distribui para todos os clientes automaticamente)
        await new Promise((resolve) => {
          db.run(
            'INSERT INTO contas (jogo_id, usuario, senha, status) VALUES (?, ?, ?, ?)',
            [jogoIdNormalizado, usuarioNormalizado, conta.senha, conta.status || 'disponivel'],
            (err) => {
              if (err) {
                console.error('Erro ao adicionar conta:', err);
                erros++;
              } else {
                adicionadas++;
              }
              resolve();
            }
          );
        });
      } catch (error) {
        console.error('Erro ao processar conta:', error);
        erros++;
      }
    }
    
    console.log(`✅ Upload concluído: ${adicionadas} adicionadas, ${duplicadas} duplicadas, ${erros} erros`);
    if (jogosStats.criados.length > 0) {
      console.log(`   🆕 Jogos criados automaticamente: ${jogosStats.criados.length}`);
    }
    if (jogosStats.reaproveitados.length > 0) {
      console.log(`   ♻️  Jogos mapeados por nome: ${jogosStats.reaproveitados.length}`);
    }
    
    res.json({
      sucesso: true,
      total: contas.length,
      adicionadas,
      duplicadas,
      erros,
      jogosCriados: jogosStats.criados.length,
      jogosReaproveitados: jogosStats.reaproveitados.length,
      detalhesJogosCriados: jogosStats.criados.slice(0, 10),
      detalhesJogosReaproveitados: jogosStats.reaproveitados.slice(0, 10),
      mensagem: `${adicionadas} conta(s) adicionada(s) e distribuída(s) para todos os clientes! ${duplicadas > 0 ? `(${duplicadas} duplicada(s) ignorada(s))` : ''} ${erros > 0 ? `(${erros} erro(s))` : ''}${
        jogosStats.criados.length > 0 ? ` (${jogosStats.criados.length} jogo(s) criado(s) automaticamente)` : ''
      }`
    });
  } catch (error) {
    console.error('Erro ao processar arquivo:', error);
    res.status(500).json({ 
      error: 'Erro ao processar arquivo',
      detalhes: error.message 
    });
  }
};

