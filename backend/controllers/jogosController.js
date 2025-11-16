const { getDatabase } = require('../database/database');
const { buscarCapaJogo } = require('../services/capaService');
const PokopowScraper = require('../services/pokopowScraper');

/**
 * Controller para gerenciar operações relacionadas a jogos
 */

/**
 * Lista todos os jogos
 * GET /api/jogos
 */
exports.listarJogos = (req, res) => {
  const db = getDatabase();
  
  db.all('SELECT * FROM jogos ORDER BY id DESC', (err, rows) => {
    if (err) {
      console.error('Erro ao buscar jogos:', err);
      return res.status(500).json({ error: 'Erro ao buscar jogos' });
    }
    
    res.json(rows);
  });
};

/**
 * Busca detalhes de um jogo específico
 * GET /api/jogos/:id
 */
exports.buscarJogo = (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  
  db.get('SELECT * FROM jogos WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error('Erro ao buscar jogo:', err);
      return res.status(500).json({ error: 'Erro ao buscar jogo' });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Jogo não encontrado' });
    }
    
    res.json(row);
  });
};

/**
 * Busca jogos no banco de dados por termo
 * GET /api/jogos/buscar?q=termo
 */
exports.buscarJogosNoBanco = (req, res) => {
  const db = getDatabase();
  const { q } = req.query;
  
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Termo de busca deve ter pelo menos 2 caracteres' });
  }

  const termo = q.trim().toLowerCase();
  
  console.log(`🔍 Buscando jogos no banco de dados para: "${termo}"`);
  
  db.all(
    `SELECT id, nome, descricao, preco, capa 
     FROM jogos 
     WHERE LOWER(nome) LIKE ? 
     ORDER BY nome ASC
     LIMIT 50`,
    [`%${termo}%`],
    (err, rows) => {
      if (err) {
        console.error('Erro ao buscar jogos no banco:', err);
        return res.status(500).json({ error: 'Erro ao buscar jogos no banco de dados' });
      }
      
      console.log(`✅ Encontrados ${rows.length} jogos no banco de dados`);
      
      res.json({
        termo: q.trim(),
        total: rows.length,
        origem: 'banco',
        resultados: rows.map(jogo => ({
          id: jogo.id,
          nome: jogo.nome,
          descricao: jogo.descricao,
          preco: jogo.preco,
          capa: jogo.capa,
          url: `https://pokopow.com/${jogo.nome.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`
        }))
      });
    }
  );
};

/**
 * Adiciona um novo jogo
 * POST /api/jogos
 * Body: { nome, descricao, preco, capa } (capa é opcional - será buscada automaticamente se não fornecida)
 */
exports.adicionarJogo = async (req, res) => {
  const db = getDatabase();
  const { nome, descricao, preco, capa } = req.body;
  
  // Validação básica
  if (!nome || !preco) {
    return res.status(400).json({ error: 'Nome e preço são obrigatórios' });
  }
  
  try {
    // Se não foi fornecida uma capa, buscar automaticamente
    let capaFinal = capa;
    
    if (!capaFinal || capaFinal.trim() === '') {
      console.log(`🔍 Buscando capa automaticamente para: ${nome}`);
      capaFinal = await buscarCapaJogo(nome);
      
      if (capaFinal) {
        console.log(`✅ Capa encontrada e aplicada para: ${nome}`);
      } else {
        console.log(`⚠️ Não foi possível encontrar capa para: ${nome}`);
      }
    }
    
    // Inserir o jogo no banco de dados
    db.run(
      'INSERT INTO jogos (nome, descricao, preco, capa) VALUES (?, ?, ?, ?)',
      [nome, descricao || null, preco, capaFinal || null],
      function(err) {
        if (err) {
          console.error('Erro ao adicionar jogo:', err);
          return res.status(500).json({ error: 'Erro ao adicionar jogo' });
        }
        
        // Retornar o jogo recém-criado
        db.get('SELECT * FROM jogos WHERE id = ?', [this.lastID], (err, row) => {
          if (err) {
            return res.status(500).json({ error: 'Jogo criado mas erro ao buscar dados' });
          }
          res.status(201).json(row);
        });
      }
    );
  } catch (error) {
    console.error('Erro ao processar adição de jogo:', error);
    // Mesmo com erro na busca de capa, continuar com a inserção
    db.run(
      'INSERT INTO jogos (nome, descricao, preco, capa) VALUES (?, ?, ?, ?)',
      [nome, descricao || null, preco, capa || null],
      function(err) {
        if (err) {
          console.error('Erro ao adicionar jogo:', err);
          return res.status(500).json({ error: 'Erro ao adicionar jogo' });
        }
        
        db.get('SELECT * FROM jogos WHERE id = ?', [this.lastID], (err, row) => {
          if (err) {
            return res.status(500).json({ error: 'Jogo criado mas erro ao buscar dados' });
          }
          res.status(201).json(row);
        });
      }
    );
  }
};

/**
 * Sincroniza um jogo específico com o site (busca e adiciona contas novas)
 * POST /api/jogos/sincronizar/:jogoId
 */
exports.sincronizarJogo = async (req, res) => {
  const { jogoId } = req.params;
  const db = getDatabase();
  const scraper = new PokopowScraper();
  
  try {
    // Buscar jogo no banco
    db.get('SELECT * FROM jogos WHERE id = ?', [jogoId], async (err, jogo) => {
      if (err) {
        console.error('Erro ao buscar jogo:', err);
        return res.status(500).json({ error: 'Erro ao buscar jogo' });
      }
      
      if (!jogo) {
        return res.status(404).json({ error: 'Jogo não encontrado' });
      }
      
      console.log(`🔄 Sincronizando jogo: ${jogo.nome} (ID: ${jogoId})`);
      
      // Buscar o jogo no site - OTIMIZADO: tenta URL direta primeiro
      let jogoNoSite = null;
      try {
        // Estratégia 1: Tentar URL direta primeiro (muito mais rápido)
        const urlPossivel = `https://pokopow.com/${jogo.nome.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
        console.log(`   🔍 Tentando URL direta: ${urlPossivel}`);
        
        try {
          const $ = await scraper.fetchPage(urlPossivel);
          if ($ && $.html().length > 1000) { // Verificar se a página tem conteúdo
            console.log(`   ✅ Jogo encontrado pela URL direta!`);
            jogoNoSite = {
              nome: jogo.nome,
              url: urlPossivel
            };
          }
        } catch (e) {
          console.log(`   ⚠️ URL direta não funcionou, tentando busca...`);
        }
        
        // Estratégia 2: Se URL direta não funcionou, buscar por termo (mais rápido que buscar todos)
        if (!jogoNoSite) {
          console.log(`   🔍 Buscando jogo por termo: "${jogo.nome}"`);
          try {
            const jogosEncontrados = await scraper.buscarJogosPorTermo(jogo.nome);
            
            if (jogosEncontrados && jogosEncontrados.length > 0) {
              // Procurar o jogo mais similar
              const nomeBanco = jogo.nome.toLowerCase().trim();
              jogoNoSite = jogosEncontrados.find(j => {
                const nomeSite = j.nome.toLowerCase().trim();
                return nomeSite === nomeBanco || 
                       nomeSite.includes(nomeBanco.substring(0, Math.min(15, nomeBanco.length))) ||
                       nomeBanco.includes(nomeSite.substring(0, Math.min(15, nomeSite.length)));
              });
              
              // Se não encontrou exato, usar o primeiro resultado
              if (!jogoNoSite && jogosEncontrados.length > 0) {
                jogoNoSite = jogosEncontrados[0];
                console.log(`   ⚠️ Jogo exato não encontrado, usando: ${jogoNoSite.nome}`);
              }
            }
          } catch (error) {
            console.error('   ❌ Erro ao buscar por termo:', error.message);
          }
        }
        
        // Estratégia 3: Último recurso - buscar todos os jogos (lento, mas garante encontrar)
        if (!jogoNoSite) {
          console.log(`   🔍 Buscando em todos os jogos (pode demorar)...`);
          try {
            const todosJogos = await scraper.encontrarTodosJogos();
            const nomeBanco = jogo.nome.toLowerCase().trim();
            jogoNoSite = todosJogos.find(j => {
              const nomeSite = j.nome.toLowerCase().trim();
              return nomeSite === nomeBanco || 
                     nomeSite.includes(nomeBanco.substring(0, Math.min(15, nomeBanco.length))) ||
                     nomeBanco.includes(nomeSite.substring(0, Math.min(15, nomeSite.length)));
            });
          } catch (error) {
            console.error('   ❌ Erro ao buscar todos os jogos:', error.message);
          }
        }
      } catch (error) {
        console.error('Erro ao buscar jogo no site:', error);
        return res.status(500).json({ 
          error: 'Erro ao buscar jogo no site',
          detalhes: error.message 
        });
      }
      
      if (!jogoNoSite || !jogoNoSite.url) {
        return res.status(404).json({ 
          error: 'Jogo não encontrado no site pokopow.com',
          mensagem: `Não foi possível encontrar "${jogo.nome}" no site.`
        });
      }
      
      console.log(`✅ Jogo encontrado no site: ${jogoNoSite.url}`);
      
      // Extrair credenciais do site
      let contasAdicionadas = 0;
      let contasJaExistentes = 0;
      
      try {
        const credenciais = await scraper.extrairCredenciais(jogoNoSite.url);
        
        if (credenciais.length === 0) {
          return res.json({
            sucesso: true,
            jogoId: parseInt(jogoId),
            jogoNome: jogo.nome,
            contasAdicionadas: 0,
            contasJaExistentes: 0,
            mensagem: 'Nenhuma conta encontrada no site para este jogo.',
            timestamp: new Date().toISOString()
          });
        }
        
        console.log(`🔐 Encontradas ${credenciais.length} credencial(is) no site`);
        
        // Buscar contas existentes
        const contasExistentes = await new Promise((resolve, reject) => {
          db.all('SELECT usuario FROM contas WHERE jogo_id = ?', [jogoId], (err, rows) => {
            if (err) reject(err);
            else resolve((rows || []).map(r => r.usuario.toLowerCase()));
          });
        });
        
        const usuariosExistentes = new Set(contasExistentes);
        
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
              [jogoId, cred.user, cred.pass, 'disponivel'],
              (insertErr) => {
                if (!insertErr) {
                  contasAdicionadas++;
                  console.log(`   ✅ Conta adicionada: ${cred.user}`);
                }
                resolve();
              }
            );
          });
        }
        
        console.log(`✅ Sincronização concluída: ${contasAdicionadas} nova(s) conta(s) adicionada(s)`);
        
        res.json({
          sucesso: true,
          jogoId: parseInt(jogoId),
          jogoNome: jogo.nome,
          contasAdicionadas,
          contasJaExistentes,
          totalCredenciaisSite: credenciais.length,
          mensagem: contasAdicionadas > 0 
            ? `${contasAdicionadas} nova(s) conta(s) adicionada(s) com sucesso!`
            : 'Nenhuma conta nova encontrada. Todas as contas já estão no banco.',
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error('Erro ao extrair credenciais:', error);
        return res.status(500).json({ 
          error: 'Erro ao extrair credenciais do site',
          detalhes: error.message 
        });
      }
    });
    
  } catch (error) {
    console.error('Erro ao sincronizar jogo:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      detalhes: error.message 
    });
  }
};

