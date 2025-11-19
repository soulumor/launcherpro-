const bcrypt = require('bcryptjs');
const { getDatabase } = require('../database/database');
const { syncUsuarioToCloud, syncDeleteUsuarioToCloud } = require('../services/syncService');

/**
 * Lista todos os usuários
 * GET /api/admin/usuarios
 */
exports.listarUsuarios = (req, res) => {
  const db = getDatabase();

  db.all('SELECT id, nome, email, tipo, dias_mensalidade, data_vencimento, ativo, data_criacao, ultimo_login FROM usuarios ORDER BY data_criacao DESC', 
    (err, usuarios) => {
      if (err) {
        console.error('Erro ao listar usuários:', err);
        return res.status(500).json({ error: 'Erro ao listar usuários' });
      }

      // Garantir que usuarios é um array válido
      if (!Array.isArray(usuarios)) {
        console.error('Erro: usuarios não é um array:', typeof usuarios, usuarios);
        return res.status(500).json({ error: 'Erro ao processar lista de usuários' });
      }

      // Calcular dias restantes para cada usuário (admins têm acesso ilimitado)
      const usuariosComDias = usuarios.map(usuario => {
        let diasRestantes = null;
        if (usuario.tipo === 'admin') {
          diasRestantes = null; // null indica ilimitado para admin
        } else if (usuario.data_vencimento) {
          const hoje = new Date();
          const vencimento = new Date(usuario.data_vencimento);
          const diffTime = vencimento - hoje;
          diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diasRestantes < 0) diasRestantes = 0;
        }
        return {
          ...usuario,
          diasRestantes
        };
      });

      res.json(usuariosComDias);
    }
  );
};

/**
 * Cria um novo usuário
 * POST /api/admin/usuarios
 */
exports.criarUsuario = async (req, res) => {
  const { nome, email, senha, tipo = 'cliente', dias_mensalidade = 30 } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
  }

  const db = getDatabase();

  // Verificar se email já existe
  db.get('SELECT id FROM usuarios WHERE email = ?', [email], async (err, existingUser) => {
    if (err) {
      console.error('Erro ao verificar email:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    if (existingUser) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    // Criptografar senha
    const senhaHash = await bcrypt.hash(senha, 10);

    // Calcular data de vencimento
    const dataVencimento = new Date();
    dataVencimento.setDate(dataVencimento.getDate() + dias_mensalidade);

    // Inserir usuário
    db.run(
      'INSERT INTO usuarios (nome, email, senha, tipo, dias_mensalidade, data_vencimento, ultimo_token) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [nome, email, senhaHash, tipo, dias_mensalidade, dataVencimento.toISOString(), null],
      async function(err) {
        if (err) {
          console.error('Erro ao criar usuário:', err);
          return res.status(500).json({ error: 'Erro ao criar usuário' });
        }

        const usuarioCriado = {
          id: this.lastID,
          nome,
          email,
          tipo,
          dias_mensalidade,
          data_vencimento: dataVencimento.toISOString()
        };

        // Enviar resposta imediatamente
        res.status(201).json({
          ...usuarioCriado,
          diasRestantes: dias_mensalidade
        });

        // Sincronizar com a nuvem em background (fire-and-forget)
        setImmediate(async () => {
          try {
            await syncUsuarioToCloud(usuarioCriado, 'create');
          } catch (syncErr) {
            // Erro de sincronização não deve afetar a resposta já enviada
            console.error('Erro ao sincronizar usuário criado:', syncErr);
          }
        });
      }
    );
  });
};

/**
 * Edita um usuário
 * PUT /api/admin/usuarios/:id
 */
exports.editarUsuario = (req, res) => {
  const { id } = req.params;
  const { nome, email, tipo, dias_mensalidade, adicionar_dias, data_vencimento, ativo } = req.body;

  const db = getDatabase();

  // Buscar usuário atual
  db.get('SELECT * FROM usuarios WHERE id = ?', [id], (err, usuario) => {
    if (err) {
      console.error('Erro ao buscar usuário:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Preparar dados para atualização
    const novosDados = {
      nome: nome !== undefined ? nome : usuario.nome,
      email: email !== undefined ? email : usuario.email,
      tipo: tipo !== undefined ? tipo : usuario.tipo,
      dias_mensalidade: dias_mensalidade !== undefined ? dias_mensalidade : usuario.dias_mensalidade,
      ativo: ativo !== undefined ? ativo : usuario.ativo
    };

    // Calcular nova data de vencimento
    let novaDataVencimento = usuario.data_vencimento;

    if (data_vencimento) {
      // Se forneceu data específica, usar ela
      novaDataVencimento = new Date(data_vencimento).toISOString();
    } else if (adicionar_dias) {
      // Se forneceu dias para adicionar
      const dataAtual = usuario.data_vencimento ? new Date(usuario.data_vencimento) : new Date();
      dataAtual.setDate(dataAtual.getDate() + parseInt(adicionar_dias));
      novaDataVencimento = dataAtual.toISOString();
    } else if (dias_mensalidade !== undefined && !usuario.data_vencimento) {
      // Se definiu dias_mensalidade mas não tinha vencimento, criar a partir de hoje
      const dataAtual = new Date();
      dataAtual.setDate(dataAtual.getDate() + dias_mensalidade);
      novaDataVencimento = dataAtual.toISOString();
    }

    // Verificar se email já existe (se mudou)
    if (email && email !== usuario.email) {
      db.get('SELECT id FROM usuarios WHERE email = ? AND id != ?', [email, id], (err, existingUser) => {
        if (err) {
          console.error('Erro ao verificar email:', err);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }

        if (existingUser) {
          return res.status(400).json({ error: 'Email já cadastrado' });
        }

        atualizarUsuario();
      });
    } else {
      atualizarUsuario();
    }

    function atualizarUsuario() {
      db.run(
        'UPDATE usuarios SET nome = ?, email = ?, tipo = ?, dias_mensalidade = ?, data_vencimento = ?, ativo = ? WHERE id = ?',
        [novosDados.nome, novosDados.email, novosDados.tipo, novosDados.dias_mensalidade, novaDataVencimento, novosDados.ativo, id],
        function(err) {
          if (err) {
            console.error('Erro ao atualizar usuário:', err);
            return res.status(500).json({ error: 'Erro ao atualizar usuário' });
          }

          // Buscar usuário atualizado
          db.get('SELECT id, nome, email, tipo, dias_mensalidade, data_vencimento, ativo, data_criacao FROM usuarios WHERE id = ?', 
            [id], 
            (err, usuarioAtualizado) => {
              if (err || !usuarioAtualizado) {
                return res.status(500).json({ error: 'Erro ao buscar usuário atualizado' });
              }

              // Calcular dias restantes (admins têm acesso ilimitado)
              let diasRestantes = null;
              if (usuarioAtualizado.tipo === 'admin') {
                diasRestantes = null; // null indica ilimitado para admin
              } else if (usuarioAtualizado.data_vencimento) {
                const hoje = new Date();
                const vencimento = new Date(usuarioAtualizado.data_vencimento);
                const diffTime = vencimento - hoje;
                diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diasRestantes < 0) diasRestantes = 0;
              }

              // Enviar resposta imediatamente
              res.json({
                ...usuarioAtualizado,
                diasRestantes
              });

              // Sincronizar com a nuvem em background (fire-and-forget)
              setImmediate(async () => {
                try {
                  await syncUsuarioToCloud(usuarioAtualizado, 'update');
                } catch (syncErr) {
                  // Erro de sincronização não deve afetar a resposta já enviada
                  console.error('Erro ao sincronizar usuário atualizado:', syncErr);
                }
              });
            }
          );
        }
      );
    }
  });
};

/**
 * Deleta um usuário permanentemente
 * DELETE /api/admin/usuarios/:id
 */
exports.desativarUsuario = (req, res) => {
  const { id } = req.params;

  const db = getDatabase();

  // Buscar email do usuário antes de deletar (para sincronização)
  db.get('SELECT email FROM usuarios WHERE id = ?', [id], (err, usuario) => {
    if (err) {
      console.error('Erro ao buscar usuário:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }

    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const emailUsuario = usuario.email;

    // Deletar usuário permanentemente do banco de dados
    db.run('DELETE FROM usuarios WHERE id = ?', [id], function(err) {
      if (err) {
        console.error('Erro ao deletar usuário:', err);
        return res.status(500).json({ error: 'Erro ao deletar usuário' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Enviar resposta imediatamente
      res.json({ message: 'Usuário deletado permanentemente com sucesso' });

      // Sincronizar com a nuvem em background (fire-and-forget)
      setImmediate(async () => {
        try {
          await syncDeleteUsuarioToCloud(emailUsuario);
        } catch (syncErr) {
          // Erro de sincronização não deve afetar a resposta já enviada
          console.error('Erro ao sincronizar deleção de usuário:', syncErr);
        }
      });
    });
  });
};

/**
 * Retorna detalhes de um usuário
 * GET /api/admin/usuarios/:id
 */
exports.detalhesUsuario = (req, res) => {
  const { id } = req.params;

  const db = getDatabase();

  db.get('SELECT id, nome, email, tipo, dias_mensalidade, data_vencimento, ativo, data_criacao, ultimo_login FROM usuarios WHERE id = ?', 
    [id], 
    (err, usuario) => {
      if (err) {
        console.error('Erro ao buscar usuário:', err);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }

      if (!usuario) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Calcular dias restantes (admins têm acesso ilimitado)
      let diasRestantes = null;
      if (usuario.tipo === 'admin') {
        diasRestantes = null; // null indica ilimitado para admin
      } else if (usuario.data_vencimento) {
        const hoje = new Date();
        const vencimento = new Date(usuario.data_vencimento);
        const diffTime = vencimento - hoje;
        diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diasRestantes < 0) diasRestantes = 0;
      }

      res.json({
        ...usuario,
        diasRestantes
      });
    }
  );
};

