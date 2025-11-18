const express = require('express');
const router = express.Router();
const { iniciarVerificacaoAutomatica, pararVerificacaoAutomatica, obterInfoTimer } = require('../services/verificadorAutomatico');
const { atualizarJogosEContasOtimizado } = require('../services/atualizarJogosAutomatico');
const { adicionarJogosFaltantes } = require('../services/adicionarJogosFaltantesService');
const { obterProgresso } = require('../services/syncProgress');
const { getDatabase } = require('../database/database');

/**
 * Rotas para verificação e atualização
 */

// GET /api/verificacao/status - Verifica status do verificador e última sincronização
router.get('/status', (req, res) => {
  try {
    const db = getDatabase();
    
    if (!db) {
      return res.status(500).json({ error: 'Banco de dados não disponível' });
    }
    
    // Buscar última sincronização
    db.get(
      'SELECT * FROM sincronizacoes ORDER BY data_hora DESC LIMIT 1',
      [],
      (err, ultimaSync) => {
        if (err) {
          console.error('Erro ao buscar última sincronização:', err);
          if (!res.headersSent) {
            return res.status(500).json({ error: 'Erro ao buscar status' });
          }
          return;
        }
        
        // Buscar estatísticas gerais
        db.all(
          `SELECT 
            COUNT(*) as total_jogos,
            (SELECT COUNT(*) FROM contas) as total_contas,
            (SELECT COUNT(*) FROM sincronizacoes WHERE status = 'sucesso') as sincronizacoes_sucesso,
            (SELECT COUNT(*) FROM sincronizacoes WHERE status = 'erro') as sincronizacoes_erro
           FROM jogos`,
          [],
          (err, stats) => {
            if (err) {
              console.error('Erro ao buscar estatísticas:', err);
              if (!res.headersSent) {
                return res.status(500).json({ error: 'Erro ao buscar estatísticas' });
              }
              return;
            }
            
            if (res.headersSent) {
              return;
            }
            
            const estatisticas = stats && stats[0] ? stats[0] : {};
            
            // Obter informações do timer
            const timerInfo = obterInfoTimer();
            
            res.json({
              message: 'Verificador automático está ativo',
              intervalo: '60 minutos',
              proximaVerificacao: 'Em execução periódica',
              timer: timerInfo,
              ultimaSincronizacao: ultimaSync ? {
                data_hora: ultimaSync.data_hora,
                tipo: ultimaSync.tipo,
                jogos_encontrados: ultimaSync.jogos_encontrados,
                jogos_adicionados: ultimaSync.jogos_adicionados,
                contas_adicionadas: ultimaSync.contas_adicionadas,
                status: ultimaSync.status,
                mensagem: ultimaSync.mensagem
              } : null,
              estatisticas: {
                total_jogos: estatisticas.total_jogos || 0,
                total_contas: estatisticas.total_contas || 0,
                sincronizacoes_sucesso: estatisticas.sincronizacoes_sucesso || 0,
                sincronizacoes_erro: estatisticas.sincronizacoes_erro || 0
              }
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Erro na rota /status:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
});

// POST /api/verificacao/verificar - Força verificação manual imediata
// Body opcional: { modo: 'rapido' | 'completo' } (padrão: 'rapido')
router.post('/verificar', async (req, res) => {
  try {
    const modo = req.body.modo || 'rapido'; // Padrão: modo rápido
    const modoCompleto = modo === 'completo';
    
    console.log(`\n🔄 Sincronização manual solicitada pelo usuário (modo: ${modo})\n`);
    
    res.json({ 
      message: `Verificação manual iniciada (modo: ${modo})`,
      status: 'processando',
      modo: modo,
      timestamp: new Date().toISOString()
    });
    
    // Executar verificação em background usando o serviço otimizado
    adicionarJogosFaltantes(modoCompleto)
      .then((resultado) => {
        console.log('\n✅ Verificação manual concluída com sucesso!');
        console.log(`   Modo: ${resultado.modo}`);
        console.log(`   Jogos adicionados: ${resultado.jogosAdicionados}`);
        console.log(`   Contas adicionadas: ${resultado.contasAdicionadas}\n`);
        
        // Registrar sincronização no banco
        const db = getDatabase();
        const timestamp = new Date().toISOString();
        db.run(
          `INSERT INTO sincronizacoes 
           (data_hora, tipo, jogos_encontrados, jogos_adicionados, jogos_atualizados, contas_adicionadas, status, mensagem) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            timestamp,
            'manual',
            resultado.jogosEncontrados || 0,
            resultado.jogosAdicionados || 0,
            0,
            resultado.contasAdicionadas || 0,
            resultado.sucesso ? 'sucesso' : 'erro',
            resultado.mensagem || null
          ],
          (err) => {
            if (err) {
              console.error('Erro ao registrar sincronização:', err);
            }
          }
        );
      })
      .catch(err => {
        console.error('\n❌ Erro na verificação manual:', err);
        
        // Registrar erro no banco
        const db = getDatabase();
        const timestamp = new Date().toISOString();
        db.run(
          `INSERT INTO sincronizacoes 
           (data_hora, tipo, jogos_encontrados, jogos_adicionados, jogos_atualizados, contas_adicionadas, status, mensagem) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            timestamp,
            'manual',
            0,
            0,
            0,
            0,
            'erro',
            err.message || 'Erro desconhecido'
          ]
        );
      });
    
  } catch (error) {
    console.error('Erro ao iniciar verificação:', error);
    res.status(500).json({ error: 'Erro ao iniciar verificação' });
  }
});

// GET /api/verificacao/progresso - Retorna progresso da sincronização em tempo real
router.get('/progresso', (req, res) => {
  const progresso = obterProgresso();
  
  if (!progresso) {
    return res.json({
      ativo: false,
      mensagem: 'Nenhuma sincronização em andamento'
    });
  }
  
  // Calcular progresso percentual
  // Se status é 'concluido', sempre retornar 100%
  let percentual;
  if (progresso.status === 'concluido') {
    percentual = 100;
  } else {
    percentual = progresso.totalJogos > 0 
      ? ((progresso.jogosProcessados / progresso.totalJogos) * 100).toFixed(1)
      : 0;
  }
  
  // Calcular jogos restantes (se concluido, sempre 0)
  const jogosRestantes = progresso.status === 'concluido' 
    ? 0 
    : Math.max(0, progresso.totalJogos - progresso.jogosProcessados);
  
  res.json({
    ativo: progresso.status === 'processando',
    progresso: {
      totalJogos: progresso.totalJogos,
      jogosProcessados: progresso.status === 'concluido' ? progresso.totalJogos : progresso.jogosProcessados,
      jogosRestantes: jogosRestantes,
      jogosAdicionados: progresso.jogosAdicionados,
      jogosAtualizados: progresso.jogosAtualizados,
      contasAdicionadas: progresso.contasAdicionadas,
      loteAtual: progresso.loteAtual,
      totalLotes: progresso.totalLotes,
      percentual: parseFloat(percentual),
      status: progresso.status,
      mensagem: progresso.mensagem,
      jogosAdicionadosLista: progresso.jogosAdicionadosLista.slice(-10), // Últimos 10 jogos adicionados
      iniciado: progresso.iniciado,
      finalizado: progresso.finalizado
    }
  });
});

// GET /api/verificacao/historico - Retorna histórico de sincronizações
router.get('/historico', (req, res) => {
  const db = getDatabase();
  const limite = parseInt(req.query.limite) || 10;
  
  db.all(
    'SELECT * FROM sincronizacoes ORDER BY data_hora DESC LIMIT ?',
    [limite],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao buscar histórico' });
      }
      
      res.json({
        total: rows.length,
        sincronizacoes: rows
      });
    }
  );
});

module.exports = router;

