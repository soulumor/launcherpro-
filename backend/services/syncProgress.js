/**
 * Serviço para gerenciar progresso de sincronização em tempo real
 */

let syncProgress = null;

/**
 * Inicia um novo progresso de sincronização
 */
function iniciarProgresso(totalJogos) {
  syncProgress = {
    iniciado: new Date().toISOString(),
    totalJogos: totalJogos,
    jogosProcessados: 0,
    jogosAdicionados: 0,
    jogosAtualizados: 0,
    contasAdicionadas: 0,
    loteAtual: 0,
    totalLotes: Math.ceil(totalJogos / 20), // Aumentado de 10 para 20 jogos por lote
    jogosAdicionadosLista: [], // Lista de jogos adicionados
    status: 'processando', // 'processando', 'concluido', 'erro'
    mensagem: null
  };
  
  return syncProgress;
}

/**
 * Atualiza o progresso após processar um jogo
 */
function atualizarProgresso(jogo, resultado) {
  if (!syncProgress) return;
  
  syncProgress.jogosProcessados++;
  
  if (resultado.novo) {
    syncProgress.jogosAdicionados++;
    syncProgress.jogosAdicionadosLista.push({
      nome: jogo.nome,
      timestamp: new Date().toISOString()
    });
  }
  
  if (resultado.atualizado) {
    syncProgress.jogosAtualizados++;
  }
  
  if (resultado.contas) {
    syncProgress.contasAdicionadas += resultado.contas;
  }
  
  // Atualizar lote atual (20 jogos por lote)
  syncProgress.loteAtual = Math.ceil(syncProgress.jogosProcessados / 20);
}

/**
 * Finaliza o progresso
 */
function finalizarProgresso(status = 'concluido', mensagem = null) {
  if (!syncProgress) return;
  
  syncProgress.status = status;
  syncProgress.mensagem = mensagem;
  syncProgress.finalizado = new Date().toISOString();
  
  // Manter progresso por 5 minutos após finalizar para consultas
  setTimeout(() => {
    syncProgress = null;
  }, 5 * 60 * 1000);
}

/**
 * Obtém o progresso atual
 */
function obterProgresso() {
  return syncProgress;
}

/**
 * Limpa o progresso
 */
function limparProgresso() {
  syncProgress = null;
}

module.exports = {
  iniciarProgresso,
  atualizarProgresso,
  finalizarProgresso,
  obterProgresso,
  limparProgresso
};

