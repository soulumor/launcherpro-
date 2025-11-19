import { useState, useEffect } from 'react'
import api from '../services/api'

function SyncTimer() {
  const [timerInfo, setTimerInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null)

  const fetchTimerInfo = async () => {
    try {
      const response = await api.get('/api/verificacao/status')
      setTimerInfo(response.data)
      setLoading(false)
      
      // Verificar se houve atualização
      if (response.data.ultimaSincronizacao) {
        const sync = response.data.ultimaSincronizacao
        const syncKey = `${sync.data_hora}-${sync.jogos_adicionados}-${sync.contas_adicionadas}`
        
        if (ultimaAtualizacao !== syncKey) {
          setUltimaAtualizacao(syncKey)
        }
      }
    } catch (error) {
      console.error('Erro ao buscar timer:', error)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTimerInfo()
    
    // Atualizar a cada 5 segundos para timer mais preciso
    const interval = setInterval(fetchTimerInfo, 5000)
    
    return () => clearInterval(interval)
  }, [ultimaAtualizacao])

  if (loading) {
    return (
      <div className="bg-steam-light rounded-lg p-4 border border-gray-700">
        <p className="text-gray-400">Carregando timer...</p>
      </div>
    )
  }

  if (!timerInfo) {
    return null
  }

  const { timer, ultimaSincronizacao } = timerInfo
  const temAtualizacoes = ultimaSincronizacao && 
    (ultimaSincronizacao.jogos_adicionados > 0 || ultimaSincronizacao.contas_adicionadas > 0)

  return (
    <div className="bg-gamer-gray rounded-lg p-4 border-2 border-gamer-light-gray shadow-lg gamer-glow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-lg font-black text-neon-cyan gamer-text">
              Status do Sistema
            </h3>
            {temAtualizacoes && (
              <span className="text-xs bg-neon-green/30 border-2 border-neon-green text-neon-green px-3 py-1.5 rounded-full animate-pulse font-bold shadow-[0_0_15px_rgba(34,197,94,0.5)]">
                ✨ {ultimaSincronizacao.contas_adicionadas > 0 
                  ? `${ultimaSincronizacao.contas_adicionadas} nova(s) conta(s)!` 
                  : 'Atualizado!'}
              </span>
            )}
          </div>
          
          {ultimaSincronizacao ? (
            <div className="space-y-3">
              <div className="p-3 bg-gray-800/50 rounded border border-gray-700">
                <div className="text-sm text-gray-300 mb-2">
                  <span className="text-gray-400">📅 Última sincronização:</span>{' '}
                  <span className="text-neon-cyan font-bold">
                    {new Date(ultimaSincronizacao.data_hora).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                
                <div className="flex gap-4 text-sm">
                  {ultimaSincronizacao.jogos_adicionados > 0 && (
                    <div className="text-gray-300">
                      <span className="text-gray-400">🎮 Jogos adicionados:</span>{' '}
                      <span className="text-neon-green font-bold">
                        +{ultimaSincronizacao.jogos_adicionados}
                      </span>
                    </div>
                  )}
                  <div className="text-gray-300">
                    <span className="text-gray-400">🔐 Contas adicionadas:</span>{' '}
                    <span className={`font-bold ${
                      ultimaSincronizacao.contas_adicionadas > 0 
                        ? 'text-neon-green' 
                        : 'text-gray-500'
                    }`}>
                      {ultimaSincronizacao.contas_adicionadas > 0 
                        ? `+${ultimaSincronizacao.contas_adicionadas}` 
                        : '0'}
                    </span>
                  </div>
                </div>
                
                {ultimaSincronizacao.status && (
                  <div className="mt-2 text-xs">
                    <span className={`px-2 py-1 rounded ${
                      ultimaSincronizacao.status === 'sucesso' 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                        : 'bg-red-500/20 text-red-400 border border-red-500/50'
                    }`}>
                      {ultimaSincronizacao.status === 'sucesso' ? '✅ Sucesso' : '❌ Erro'}
                    </span>
                    {ultimaSincronizacao.tipo && (
                      <span className="ml-2 text-gray-500">
                        ({ultimaSincronizacao.tipo === 'automatica' ? 'Automática' : 'Manual'})
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-3 p-3 bg-gray-800/50 rounded border border-gray-700">
              <p className="text-xs text-gray-400 mb-2">
                ⏳ Nenhuma sincronização registrada ainda.
              </p>
              <p className="text-xs text-gray-500">
                Use o painel admin para fazer upload de contas manualmente.
              </p>
            </div>
          )}
        </div>
        
        <div className="ml-4 flex flex-col items-center gap-3">
          {timer && timer.ativo && (
            <div className="relative w-16 h-16">
              <div className="w-16 h-16 rounded-full border-4 border-gray-700"></div>
              <div 
                className="absolute top-0 left-0 w-16 h-16 rounded-full border-4 border-neon-cyan border-t-transparent animate-spin"
                style={{
                  animation: 'spin 1s linear infinite'
                }}
              ></div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SyncTimer
