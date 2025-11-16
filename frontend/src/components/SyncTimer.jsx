import { useState, useEffect, useRef } from 'react'
import api from '../services/api'
import ResultadoSincronizacaoModal from './ResultadoSincronizacaoModal'

function SyncTimer() {
  const [timerInfo, setTimerInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sincronizando, setSincronizando] = useState(false)
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null)
  const [tempoDecorrido, setTempoDecorrido] = useState(0) // em segundos
  const [tempoEstimado, setTempoEstimado] = useState(180) // 3 minutos estimados
  const [progresso, setProgresso] = useState(null)
  const [jogosAdicionados, setJogosAdicionados] = useState([])
  const [mostrarResultadoModal, setMostrarResultadoModal] = useState(false)
  const [resultadoSincronizacao, setResultadoSincronizacao] = useState(null)
  const jogosProcessadosRef = useRef(new Set()) // Para rastrear jogos já notificados
  const intervaloProgressoRef = useRef(null)
  const progressoAnteriorRef = useRef(null) // Para detectar quando termina

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
          
          // Mostrar notificação se houver novos itens
          if (sync.jogos_adicionados > 0 || sync.contas_adicionadas > 0) {
            // Notificação será mostrada no componente
          }
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

  // Timer para contar tempo decorrido durante sincronização
  useEffect(() => {
    let interval = null
    if (sincronizando) {
      setTempoDecorrido(0)
      interval = setInterval(() => {
        setTempoDecorrido(prev => prev + 1)
      }, 1000)
    } else {
      if (interval) clearInterval(interval)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [sincronizando])

  const formatarTempo = (segundos) => {
    const mins = Math.floor(segundos / 60)
    const secs = segundos % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const calcularProgresso = () => {
    // Se status é concluido, sempre mostrar 100%
    if (progresso && progresso.status === 'concluido') {
      return 100
    }
    if (!sincronizando) return 0
    // Usar progresso real se disponível, senão usar estimativa baseada em tempo
    if (progresso && progresso.percentual) {
      // Durante processamento, mostrar o percentual real (sem limite artificial)
      return Math.min(progresso.percentual, 99.9) // Limitar a 99.9% durante processamento para não mostrar 100% antes de concluir
    }
    const progressoEstimado = (tempoDecorrido / tempoEstimado) * 100
    return Math.min(progressoEstimado, 99.9)
  }

  // Buscar progresso em tempo real
  const buscarProgresso = async () => {
    try {
      const response = await api.get('/api/verificacao/progresso')
      
      if (response.data.ativo && response.data.progresso) {
        // Sincronização em andamento
        setProgresso(response.data.progresso)
        setSincronizando(true)
        
        // Verificar novos jogos adicionados
        if (response.data.progresso.jogosAdicionadosLista) {
          const novosJogos = response.data.progresso.jogosAdicionadosLista.filter(
            jogo => !jogosProcessadosRef.current.has(jogo.nome)
          )
          
          if (novosJogos.length > 0) {
            novosJogos.forEach(jogo => {
              jogosProcessadosRef.current.add(jogo.nome)
              setJogosAdicionados(prev => [...prev, jogo].slice(-10)) // Manter apenas os últimos 10
              
              // Mostrar notificação para cada jogo adicionado
              console.log(`✅ Jogo adicionado: ${jogo.nome}`)
            })
          }
        }
      } else if (response.data.progresso) {
        // Sincronização terminou, mas ainda há progresso para mostrar
        // Garantir que o percentual seja 100% se status for concluido
        const progressoFinal = {
          ...response.data.progresso,
          percentual: response.data.progresso.status === 'concluido' ? 100 : response.data.progresso.percentual
        }
        
        // Detectar se acabou de terminar (status mudou de processando para concluido)
        const acabouDeTerminar = progressoAnteriorRef.current?.status === 'processando' && 
                                  progressoFinal.status === 'concluido'
        
        setProgresso(progressoFinal)
        progressoAnteriorRef.current = progressoFinal
        
        if (progressoFinal.status === 'concluido' || progressoFinal.status === 'erro') {
          setSincronizando(false)
          if (intervaloProgressoRef.current) {
            clearInterval(intervaloProgressoRef.current)
            intervaloProgressoRef.current = null
          }
          
          // Se acabou de terminar, mostrar modal de resultados
          if (acabouDeTerminar) {
            setResultadoSincronizacao(progressoFinal)
            setMostrarResultadoModal(true)
          }
        }
        
        // Buscar status final
        fetchTimerInfo()
        
        // Se concluído, manter progresso visível por mais tempo (30 segundos)
        // Senão, limpar após 10 segundos
        const tempoLimpeza = progressoFinal.status === 'concluido' ? 30000 : 10000
        setTimeout(() => {
          jogosProcessadosRef.current.clear()
          setJogosAdicionados([])
          // Só limpar progresso se não for concluído ou se já passou o tempo
          if (progressoFinal.status !== 'concluido') {
            setProgresso(null)
          }
        }, tempoLimpeza)
      } else {
        // Nenhuma sincronização em andamento
        if (sincronizando) {
          setSincronizando(false)
          if (intervaloProgressoRef.current) {
            clearInterval(intervaloProgressoRef.current)
            intervaloProgressoRef.current = null
          }
          
          // Se havia progresso anterior e acabou de terminar, mostrar modal
          if (progressoAnteriorRef.current && progressoAnteriorRef.current.status === 'processando') {
            // Buscar última sincronização para obter dados completos
            fetchTimerInfo().then(() => {
              // Aguardar um pouco para garantir que os dados estão atualizados
              setTimeout(() => {
                if (progressoAnteriorRef.current) {
                  setResultadoSincronizacao(progressoAnteriorRef.current)
                  setMostrarResultadoModal(true)
                }
              }, 1000)
            })
          }
          
          // Buscar status final
          fetchTimerInfo()
          
          // Limpar rastreamento após 5 segundos
          setTimeout(() => {
            jogosProcessadosRef.current.clear()
            setJogosAdicionados([])
            setProgresso(null)
          }, 5000)
        }
      }
    } catch (error) {
      console.error('Erro ao buscar progresso:', error)
    }
  }

  const handleSincronizarManual = async (modoCompleto = false) => {
    setSincronizando(true)
    setTempoDecorrido(0)
    setTempoEstimado(modoCompleto ? 180 : 30) // 3 minutos para completo, 30s para rápido
    setJogosAdicionados([])
    jogosProcessadosRef.current.clear()
    
    try {
      const response = await api.post('/api/verificacao/verificar', {
        modo: modoCompleto ? 'completo' : 'rapido'
      })
      console.log('Sincronização iniciada:', response.data)
      
      // Iniciar polling de progresso em tempo real
      if (intervaloProgressoRef.current) {
        clearInterval(intervaloProgressoRef.current)
      }
      
      // Buscar progresso imediatamente e depois a cada 2 segundos
      buscarProgresso()
      intervaloProgressoRef.current = setInterval(buscarProgresso, 2000)
      
    } catch (error) {
      console.error('Erro ao sincronizar:', error)
      setSincronizando(false)
      setTempoDecorrido(0)
      if (intervaloProgressoRef.current) {
        clearInterval(intervaloProgressoRef.current)
        intervaloProgressoRef.current = null
      }
      alert('❌ Erro ao iniciar sincronização. Verifique se o servidor está rodando.')
    }
  }

  // Limpar intervalos ao desmontar
  useEffect(() => {
    return () => {
      if (intervaloProgressoRef.current) {
        clearInterval(intervaloProgressoRef.current)
      }
    }
  }, [])

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
              Sincronização Automática
            </h3>
            {sincronizando && (
              <div className="flex items-center gap-2">
                <span className="text-xs bg-neon-cyan/20 border border-neon-cyan text-neon-cyan px-2 py-1 rounded animate-pulse font-bold">
                  Sincronizando...
                </span>
                <div className="flex items-center gap-1 text-neon-cyan">
                  <span className="text-lg font-mono font-black gamer-text">
                    ⏱️ {formatarTempo(tempoDecorrido)}
                  </span>
                </div>
              </div>
            )}
            {temAtualizacoes && !sincronizando && (
              <span className="text-xs bg-neon-green/20 border border-neon-green text-neon-green px-2 py-1 rounded animate-pulse font-bold">
                ✨ Atualizado!
              </span>
            )}
          </div>
          
          {/* Progresso em tempo real durante sincronização */}
          {progresso && (sincronizando || progresso.status === 'concluido') && (
            <div className="mt-3 p-4 bg-gamer-dark rounded border-2 border-neon-cyan/50 gamer-glow">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-black text-neon-cyan gamer-text">
                  {progresso.status === 'concluido' ? '✅ Sincronização Concluída' : '📊 Sincronizando em Tempo Real'}
                </h4>
                {progresso.status !== 'concluido' && (
                  <span className="text-xs text-gray-400">
                    Lote {progresso.loteAtual}/{progresso.totalLotes}
                  </span>
                )}
              </div>
              
              {/* Barra de progresso */}
              <div className="w-full bg-gamer-black rounded-full h-3 mb-3 border border-neon-cyan/30">
                <div
                  className={`h-3 rounded-full transition-all duration-500 gamer-glow ${
                    progresso.status === 'concluido' 
                      ? 'bg-gradient-to-r from-green-500 to-green-400' 
                      : 'bg-gradient-to-r from-neon-cyan to-neon-green'
                  }`}
                  style={{ width: `${calcularProgresso()}%` }}
                ></div>
              </div>
              
              {progresso.status === 'concluido' && (
                <div className="mb-3 p-3 bg-green-900/20 border border-green-700/50 rounded text-center">
                  <div className="text-green-400 text-lg font-bold mb-1">
                    ✅ Sincronização Concluída com Sucesso!
                  </div>
                  <div className="text-xs text-gray-400">
                    100% concluído
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-4 gap-2 text-xs mb-3">
                <div className="text-center">
                  <div className="text-gray-400">Processados</div>
                  <div className="text-white font-bold">{progresso.jogosProcessados}/{progresso.totalJogos}</div>
                </div>
                <div className="text-center">
                  <div className="text-gray-400">Restantes</div>
                  <div className="text-yellow-400 font-bold">⏳ {progresso.jogosRestantes || 0}</div>
                </div>
                <div className="text-center">
                  <div className="text-gray-400">Adicionados</div>
                  <div className="text-green-400 font-bold">➕ {progresso.jogosAdicionados}</div>
                </div>
                <div className="text-center">
                  <div className="text-gray-400">Contas</div>
                  <div className="text-blue-400 font-bold">🔐 {progresso.contasAdicionadas}</div>
                </div>
              </div>
              
              {/* Informação destacada de jogos restantes */}
              {progresso.status !== 'concluido' && progresso.jogosRestantes !== undefined && progresso.jogosRestantes > 0 && (
                <div className="mt-2 p-2 bg-yellow-900/20 border border-yellow-700/50 rounded text-center">
                  <div className="text-yellow-400 text-sm font-semibold">
                    ⏳ Faltam {progresso.jogosRestantes} {progresso.jogosRestantes === 1 ? 'jogo' : 'jogos'} para processar
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {progresso.percentual.toFixed(1)}% concluído
                  </div>
                </div>
              )}
              
              {/* Lista de jogos adicionados recentemente */}
              {jogosAdicionados.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <div className="text-xs text-gray-400 mb-2">Jogos adicionados recentemente:</div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {jogosAdicionados.slice().reverse().map((jogo, index) => (
                      <div
                        key={`${jogo.nome}-${jogo.timestamp}-${index}`}
                        className="text-xs text-green-400 bg-green-900/20 px-2 py-1 rounded animate-fade-in"
                      >
                        ✅ {jogo.nome}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {timer && timer.ativo ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-300">Próxima verificação em:</span>
                <span className="text-neon-cyan font-black text-lg gamer-text">
                  {timer.tempoRestanteFormatado}
                </span>
              </div>
              
              {ultimaSincronizacao && !sincronizando && (
                <div className="mt-3 p-3 bg-gray-800 rounded border border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-gray-400">
                      Última sincronização: <span className="text-white font-medium">{new Date(ultimaSincronizacao.data_hora).toLocaleString('pt-BR')}</span>
                    </p>
                    <span className={`text-xs px-2 py-1 rounded ${
                      ultimaSincronizacao.status === 'sucesso' 
                        ? 'bg-green-600 text-white' 
                        : 'bg-red-600 text-white'
                    }`}>
                      {ultimaSincronizacao.status === 'sucesso' ? '✅ Sucesso' : '❌ Erro'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs">
                    {ultimaSincronizacao.jogos_encontrados > 0 && (
                      <span className="text-gray-300 bg-gray-700 px-2 py-1 rounded">
                        📦 {ultimaSincronizacao.jogos_encontrados} jogos encontrados
                      </span>
                    )}
                    {ultimaSincronizacao.jogos_adicionados > 0 && (
                      <span className="text-green-400 font-semibold bg-green-900/30 px-2 py-1 rounded">
                        ➕ {ultimaSincronizacao.jogos_adicionados} novos jogos
                      </span>
                    )}
                    {ultimaSincronizacao.contas_adicionadas > 0 && (
                      <span className="text-blue-400 font-semibold bg-blue-900/30 px-2 py-1 rounded">
                        🔐 +{ultimaSincronizacao.contas_adicionadas} contas
                      </span>
                    )}
                    {ultimaSincronizacao.jogos_adicionados === 0 && ultimaSincronizacao.contas_adicionadas === 0 && ultimaSincronizacao.status === 'sucesso' && (
                      <span className="text-gray-400">
                        ℹ️ Nenhuma atualização encontrada
                      </span>
                    )}
                    {ultimaSincronizacao.mensagem && (
                      <span className="text-yellow-400 text-xs">
                        ⚠️ {ultimaSincronizacao.mensagem}
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              {!ultimaSincronizacao && !sincronizando && (
                <div className="mt-3 p-3 bg-gray-800 rounded border border-gray-700">
                  <p className="text-xs text-gray-400">
                    ⏳ Nenhuma sincronização registrada ainda. Clique em "Sincronizar Agora" para começar.
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>
        
        <div className="ml-4 flex flex-col items-center gap-3">
          {sincronizando ? (
            <div className="w-32 space-y-2">
              {/* Relógio circular com progresso */}
              <div className="relative w-32 h-32 mx-auto">
                <svg className="transform -rotate-90 w-32 h-32">
                  {/* Círculo de fundo */}
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-gray-700"
                  />
                  {/* Círculo de progresso */}
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 56}`}
                    strokeDashoffset={`${2 * Math.PI * 56 * (1 - calcularProgresso() / 100)}`}
                    className="text-neon-cyan transition-all duration-1000"
                    strokeLinecap="round"
                  />
                </svg>
                {/* Tempo no centro */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl font-mono font-black text-neon-cyan gamer-text">
                      {formatarTempo(tempoDecorrido)}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {progresso ? `${progresso.jogosProcessados}/${progresso.totalJogos}` : `${Math.round(calcularProgresso())}%`}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Barra de progresso linear */}
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-neon-cyan to-neon-green h-2 rounded-full transition-all duration-1000 gamer-glow"
                  style={{ width: `${calcularProgresso()}%` }}
                ></div>
              </div>
              
              <p className="text-xs text-center text-gray-400">
                Tempo estimado: ~{Math.ceil(tempoEstimado / 60)} min
              </p>
            </div>
          ) : (
            timer && timer.ativo && (
              <div className="relative w-16 h-16">
                <div className="w-16 h-16 rounded-full border-4 border-gray-700"></div>
                <div 
                  className="absolute top-0 left-0 w-16 h-16 rounded-full border-4 border-neon-cyan border-t-transparent animate-spin"
                  style={{
                    animation: 'spin 1s linear infinite'
                  }}
                ></div>
              </div>
            )
          )}
          
          <div className="flex gap-2">
            <button
              onClick={() => handleSincronizarManual(false)}
              disabled={sincronizando}
              className={`px-4 py-2 rounded font-medium transition-all group ${
                sincronizando
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-gamer-gray border-2 border-neon-cyan hover:bg-neon-cyan hover:text-gamer-black hover:shadow-lg transform hover:scale-105 gamer-glow'
              }`}
              title="Sincronização rápida: verifica apenas a página principal primeiro (~30 segundos)"
            >
              {sincronizando ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span>
                  <span className="text-[rgb(0,181,215)] transition-colors font-bold">
                    Sincronizando...
                  </span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span className="text-[rgb(0,181,215)] group-hover:text-cyan-400 transition-colors font-bold">
                    Sincronizar Agora (Rápido)
                  </span>
                </span>
              )}
            </button>
            
            {!sincronizando && (
              <button
                onClick={() => handleSincronizarManual(true)}
                disabled={sincronizando}
                className="px-3 py-2 rounded font-medium transition-all bg-gray-700 hover:bg-gray-600 text-sm group"
                title="Sincronização completa: busca todos os jogos do site (pode demorar mais)"
              >
                <span className="text-[rgb(0,181,215)] group-hover:text-cyan-400 transition-colors font-bold">
                  🔄 Completo
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Resultados da Sincronização */}
      {mostrarResultadoModal && resultadoSincronizacao && (
        <ResultadoSincronizacaoModal
          resultado={resultadoSincronizacao}
          onClose={() => {
            setMostrarResultadoModal(false)
            setResultadoSincronizacao(null)
          }}
        />
      )}
    </div>
  )
}

export default SyncTimer

