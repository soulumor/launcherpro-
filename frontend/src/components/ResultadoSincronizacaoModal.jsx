import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog'
import { X, CheckCircle2, XCircle, Gamepad2, Users, RefreshCw } from 'lucide-react'

/**
 * Modal para exibir resultados detalhados da sincronização
 */
function ResultadoSincronizacaoModal({ resultado, onClose }) {
  if (!resultado) return null

  const sucesso = resultado.status === 'concluido' || resultado.status === 'sucesso'
  const temResultados = (resultado.jogosAdicionados > 0 || resultado.contasAdicionadas > 0 || resultado.jogosAtualizados > 0)

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-950 border-2 border-cyan-500/50 shadow-[0_0_50px_rgba(6,182,212,0.3)] p-0"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Resultado da Sincronização</DialogTitle>
        <DialogDescription className="sr-only">Detalhes do resultado da sincronização de jogos e contas</DialogDescription>
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b-2 border-cyan-500/50 p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            {sucesso ? (
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            ) : (
              <XCircle className="w-8 h-8 text-red-400" />
            )}
            <div>
              <h2 className="text-2xl font-bold text-cyan-400">
                Resultado da Sincronização
              </h2>
              <p className="text-sm text-gray-400">
                {resultado.finalizado 
                  ? new Date(resultado.finalizado).toLocaleString('pt-BR')
                  : 'Concluída agora'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 bg-gray-800 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300 transition-all duration-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 space-y-6">
          {/* Status geral */}
          <div className={`p-4 rounded-lg border-2 ${
            sucesso 
              ? 'bg-green-900/20 border-green-600 text-green-300' 
              : 'bg-red-900/20 border-red-600 text-red-300'
          }`}>
            <div className="flex items-center gap-2">
              {sucesso ? (
                <>
                  <CheckCircle2 className="w-6 h-6" />
                  <p className="font-bold text-lg">Sincronização concluída com sucesso!</p>
                </>
              ) : (
                <>
                  <XCircle className="w-6 h-6" />
                  <p className="font-bold text-lg">Erro na sincronização</p>
                </>
              )}
            </div>
            {resultado.mensagem && (
              <p className="mt-2 text-sm">{resultado.mensagem}</p>
            )}
          </div>

          {/* Estatísticas */}
          {sucesso && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Jogos encontrados */}
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Gamepad2 className="w-5 h-5 text-cyan-400" />
                  <h3 className="font-bold text-white">Jogos Encontrados</h3>
                </div>
                <p className="text-3xl font-black text-cyan-400">
                  {resultado.totalJogos || 0}
                </p>
                <p className="text-xs text-gray-400 mt-1">Total processado</p>
              </div>

              {/* Novos jogos */}
              {resultado.jogosAdicionados > 0 && (
                <div className="bg-green-900/20 border border-green-600/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Gamepad2 className="w-5 h-5 text-green-400" />
                    <h3 className="font-bold text-white">Novos Jogos</h3>
                  </div>
                  <p className="text-3xl font-black text-green-400">
                    +{resultado.jogosAdicionados}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Adicionados ao banco</p>
                </div>
              )}

              {/* Contas adicionadas */}
              {resultado.contasAdicionadas > 0 && (
                <div className="bg-purple-900/20 border border-purple-600/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-5 h-5 text-purple-400" />
                    <h3 className="font-bold text-white">Novas Contas</h3>
                  </div>
                  <p className="text-3xl font-black text-purple-400">
                    +{resultado.contasAdicionadas}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Credenciais adicionadas</p>
                </div>
              )}

              {/* Jogos atualizados */}
              {resultado.jogosAtualizados > 0 && (
                <div className="bg-blue-900/20 border border-blue-600/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <RefreshCw className="w-5 h-5 text-blue-400" />
                    <h3 className="font-bold text-white">Jogos Atualizados</h3>
                  </div>
                  <p className="text-3xl font-black text-blue-400">
                    {resultado.jogosAtualizados}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Informações atualizadas</p>
                </div>
              )}
            </div>
          )}

          {/* Lista de jogos adicionados */}
          {sucesso && resultado.jogosAdicionadosLista && resultado.jogosAdicionadosLista.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-cyan-400" />
                Jogos Adicionados ({resultado.jogosAdicionadosLista.length})
              </h3>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {resultado.jogosAdicionadosLista.map((jogo, index) => (
                  <div
                    key={index}
                    className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-300 hover:border-cyan-500/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-400 font-bold">#{index + 1}</span>
                      <span>{jogo.nome}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mensagem quando não há resultados */}
          {sucesso && !temResultados && (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 text-center">
              <p className="text-gray-400 text-lg">
                ✅ Sincronização concluída, mas nenhum novo item foi encontrado.
              </p>
              <p className="text-gray-500 text-sm mt-2">
                Todos os jogos e contas já estão atualizados!
              </p>
            </div>
          )}

          {/* Informações de tempo */}
          {resultado.iniciado && resultado.finalizado && (
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <h3 className="font-bold text-white mb-2">Tempo de Execução</h3>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <div>
                  <span className="text-gray-500">Iniciado:</span>{' '}
                  <span className="text-white">
                    {new Date(resultado.iniciado).toLocaleTimeString('pt-BR')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Finalizado:</span>{' '}
                  <span className="text-white">
                    {new Date(resultado.finalizado).toLocaleTimeString('pt-BR')}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ResultadoSincronizacaoModal


