const { getDatabase } = require('../database/database');

/**
 * Controller para gerenciar a biblioteca de jogos do usuário
 */

/**
 * Lista todos os jogos na biblioteca (agrupados por jogo)
 * GET /api/biblioteca
 */
exports.listarBiblioteca = (req, res) => {
  const db = getDatabase();
  
  // Buscar jogos únicos na biblioteca com contagem de contas válidas
  const query = `
    SELECT 
      j.id as jogo_id,
      j.nome,
      j.descricao,
      j.preco,
      j.capa,
      COUNT(DISTINCT b.conta_id) as total_contas,
      MIN(b.data_adicao) as data_adicao
    FROM biblioteca b
    INNER JOIN jogos j ON b.jogo_id = j.id
    WHERE b.conta_id IS NOT NULL
    GROUP BY j.id, j.nome, j.descricao, j.preco, j.capa
    ORDER BY data_adicao DESC
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Erro ao buscar biblioteca:', err);
      return res.status(500).json({ error: 'Erro ao buscar biblioteca' });
    }
    
    // Garantir que rows é um array
    if (!Array.isArray(rows)) {
      console.error('Erro: rows não é um array:', typeof rows, rows);
      return res.status(500).json({ error: 'Erro ao processar dados da biblioteca' });
    }
    
    console.log(`📚 Biblioteca: ${rows.length} jogo(s) único(s) encontrado(s)`);
    rows.forEach(jogo => {
      console.log(`   - ${jogo.nome} (ID: ${jogo.jogo_id}): ${jogo.total_contas} conta(s)`);
    });
    
    res.json(rows);
  });
};

/**
 * Lista contas válidas de um jogo na biblioteca
 * GET /api/biblioteca/jogo/:jogoId/contas
 */
exports.listarContasJogoBiblioteca = (req, res) => {
  const db = getDatabase();
  const { jogoId } = req.params;
  
  console.log(`📚 Buscando contas válidas do jogo ${jogoId} na biblioteca`);
  
  const query = `
    SELECT 
      c.id,
      c.usuario,
      c.senha,
      c.status,
      b.data_adicao
    FROM biblioteca b
    INNER JOIN contas c ON b.conta_id = c.id
    WHERE b.jogo_id = ? 
      AND (LOWER(c.status) = 'valido' OR LOWER(c.status) = 'disponivel' OR LOWER(c.status) = 'funcionando' OR LOWER(c.status) = 'valid')
    ORDER BY b.data_adicao DESC
  `;
  
  db.all(query, [jogoId], (err, rows) => {
    if (err) {
      console.error('❌ Erro ao buscar contas do jogo na biblioteca:', err);
      return res.status(500).json({ error: 'Erro ao buscar contas' });
    }
    
    // Garantir que rows é um array
    if (!Array.isArray(rows)) {
      console.error('Erro: rows não é um array:', typeof rows, rows);
      return res.status(500).json({ error: 'Erro ao processar dados das contas' });
    }
    
    console.log(`✅ Encontradas ${rows.length} conta(s) válida(s) para o jogo ${jogoId}`);
    res.json(rows);
  });
};

/**
 * Adiciona um jogo à biblioteca
 * POST /api/biblioteca
 * Body: { jogo_id, conta_id? }
 */
exports.adicionarJogoBiblioteca = (req, res) => {
  const db = getDatabase();
  const { jogo_id, conta_id } = req.body;
  
  if (!jogo_id) {
    return res.status(400).json({ error: 'jogo_id é obrigatório' });
  }
  
  // Verificar se o jogo existe
  db.get('SELECT id FROM jogos WHERE id = ?', [jogo_id], (err, jogo) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao verificar jogo' });
    }
    
    if (!jogo) {
      return res.status(404).json({ error: 'Jogo não encontrado' });
    }
    
    // Verificar se já está na biblioteca
    const checkQuery = conta_id 
      ? 'SELECT id FROM biblioteca WHERE jogo_id = ? AND conta_id = ?'
      : 'SELECT id FROM biblioteca WHERE jogo_id = ? AND conta_id IS NULL';
    
    const checkParams = conta_id ? [jogo_id, conta_id] : [jogo_id];
    
    db.get(checkQuery, checkParams, (err, existing) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao verificar biblioteca' });
      }
      
      if (existing) {
        return res.status(409).json({ error: 'Jogo já está na biblioteca' });
      }
      
      // Adicionar à biblioteca
      const insertQuery = conta_id
        ? 'INSERT INTO biblioteca (jogo_id, conta_id) VALUES (?, ?)'
        : 'INSERT INTO biblioteca (jogo_id) VALUES (?)';
      
      const insertParams = conta_id ? [jogo_id, conta_id] : [jogo_id];
      
      db.run(insertQuery, insertParams, function(insertErr) {
        if (insertErr) {
          console.error('Erro ao adicionar à biblioteca:', insertErr);
          return res.status(500).json({ error: 'Erro ao adicionar à biblioteca' });
        }
        
        // Retornar o item adicionado
        const selectQuery = `
          SELECT 
            b.id,
            b.jogo_id,
            b.conta_id,
            b.data_adicao,
            j.nome,
            j.descricao,
            j.preco,
            j.capa,
            c.usuario,
            c.status as conta_status
          FROM biblioteca b
          INNER JOIN jogos j ON b.jogo_id = j.id
          LEFT JOIN contas c ON b.conta_id = c.id
          WHERE b.id = ?
        `;
        
        db.get(selectQuery, [this.lastID], (selectErr, row) => {
          if (selectErr) {
            return res.status(201).json({ 
              id: this.lastID,
              jogo_id,
              conta_id,
              sucesso: true 
            });
          }
          
          res.status(201).json(row);
        });
      });
    });
  });
};

/**
 * Remove um jogo da biblioteca (remove todas as entradas do jogo)
 * DELETE /api/biblioteca/jogo/:jogoId
 */
exports.removerJogoBiblioteca = (req, res) => {
  const db = getDatabase();
  const { jogoId } = req.params;
  
  db.run('DELETE FROM biblioteca WHERE jogo_id = ?', [jogoId], function(err) {
    if (err) {
      console.error('Erro ao remover da biblioteca:', err);
      return res.status(500).json({ error: 'Erro ao remover da biblioteca' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Jogo não encontrado na biblioteca' });
    }
    
    res.json({ sucesso: true, mensagem: 'Jogo removido da biblioteca', removidos: this.changes });
  });
};

/**
 * Verifica se um jogo está na biblioteca
 * GET /api/biblioteca/verificar/:jogoId
 */
exports.verificarJogoBiblioteca = (req, res) => {
  const db = getDatabase();
  const { jogoId } = req.params;
  
  db.get('SELECT id FROM biblioteca WHERE jogo_id = ?', [jogoId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao verificar biblioteca' });
    }
    
    res.json({ na_biblioteca: !!row });
  });
};

