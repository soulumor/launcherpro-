import { useState } from 'react'
import api from '../services/api'

function TestadorContas({ jogo, contas, onContasAtualizadas }) {
  const [testando, setTestando] = useState(false)
  const [resultados, setResultados] = useState([])
  const [progresso, setProgresso] = useState({ atual: 0, total: 0 })
  const [steamCmdDisponivel, setSteamCmdDisponivel] = useState(null)
  const [instalandoSteamCmd, setInstalandoSteamCmd] = useState(false)

  // Testar uma conta específica
  const testarContaIndividual = async (conta) => {
    try {
      setTestando(true)
      
      const response = await api.post('/api/contas/testar', {
        usuario: conta.usuario,
        senha: conta.senha
      })
      
      return response.data
    } catch (error) {
      console.error('Erro ao testar conta:', error)
      
      if (error.response?.status === 503) {
        setSteamCmdDisponivel(false)
        throw new Error('SteamCMD não está disponível no servidor')
      }
      
      throw error
    } finally {
      setTestando(false)
    }
  }

  // Testar todas as contas do jogo
  const testarTodasContas = async () => {
    if (!jogo?.id) return
    
    try {
      setTestando(true)
      setProgresso({ atual: 0, total: contas.length })
      
      const response = await api.post(`/api/contas/testar-jogo/${jogo.id}`, {
        limite: contas.length
      })
      
      setResultados(response.data.resultados)
      setSteamCmdDisponivel(true)
      
      // Atualizar status automaticamente no banco
      await atualizarStatusContas(response.data.resultados)
      
      // Notificar componente pai para recarregar contas
      if (onContasAtualizadas) {
        onContasAtualizadas()
      }
      
    } catch (error) {
      console.error('Erro ao testar contas:', error)
      
      if (error.response?.status === 503) {
        setSteamCmdDisponivel(false)
        // Se a mensagem mencionar instalação, mostrar mensagem especial
        if (error.response?.data?.detalhes?.includes('instalar')) {
          setInstalandoSteamCmd(true)
          alert('🔧 SteamCMD não encontrado. O sistema está instalando automaticamente...\n\nIsso pode levar alguns minutos na primeira vez. Tente novamente em instantes.')
        } else {
          alert('SteamCMD não está disponível no servidor. O sistema tentará instalar automaticamente na próxima tentativa.')
        }
      } else {
        alert('Erro ao testar contas: ' + (error.response?.data?.error || error.message))
      }
    } finally {
      setTestando(false)
      setProgresso({ atual: 0, total: 0 })
    }
  }

  // Atualizar status das contas no banco
  const atualizarStatusContas = async (resultadosParaAtualizar) => {
    try {
      const response = await api.post('/api/contas/atualizar-status', {
        resultados: resultadosParaAtualizar
      })
      
      console.log(`✅ ${response.data.contasAtualizadas} contas atualizadas`)
      
      // Notificar componente pai para recarregar contas
      if (onContasAtualizadas) {
        onContasAtualizadas()
      }
      
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      alert('Erro ao atualizar status das contas')
    }
  }

  // Obter emoji do status
  const getStatusEmoji = (resultado) => {
    if (resultado.sucesso) return '✅'
    if (resultado.status === 'credenciais_invalidas') return '❌'
    if (resultado.status === 'steam_guard') return '🔐'
    if (resultado.status === 'conta_bloqueada') return '🚫'
    return '⚠️'
  }

  // Obter cor do status
  const getStatusColor = (resultado) => {
    if (resultado.sucesso) return 'text-green-400'
    if (resultado.status === 'credenciais_invalidas') return 'text-red-400'
    if (resultado.status === 'steam_guard') return 'text-yellow-400'
    if (resultado.status === 'conta_bloqueada') return 'text-red-600'
    return 'text-gray-400'
  }

  if (instalandoSteamCmd) {
    return (
      <div className="bg-gray-800/50 border-2 border-cyan-500/50 rounded-lg p-4 mb-4 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
        <h4 className="text-cyan-400 [text-shadow:0_0_20px_rgba(6,182,212,0.8)] font-bold mb-2">🔧 Instalando SteamCMD Automaticamente</h4>
        <p className="text-gray-300 text-sm mb-2">
          O sistema está baixando e instalando o SteamCMD automaticamente...
        </p>
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400"></div>
          <span className="text-cyan-300 text-xs">Isso pode levar alguns minutos na primeira vez</span>
        </div>
        <p className="text-gray-300 text-xs mt-3">
          ⏳ Aguarde a instalação completar e tente novamente em instantes.
        </p>
      </div>
    )
  }

  if (steamCmdDisponivel === false) {
    return (
      <div className="bg-gray-800/50 border-2 border-cyan-500/50 rounded-lg p-4 mb-4 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
        <h4 className="text-cyan-400 [text-shadow:0_0_20px_rgba(6,182,212,0.8)] font-bold mb-2">🔧 Instalação Automática do SteamCMD</h4>
        <p className="text-gray-300 text-sm">
          O SteamCMD será instalado automaticamente na primeira vez que você usar o testador.
          Não é necessário baixar ou instalar nada manualmente!
        </p>
        <div className="mt-3 p-2 bg-gray-900/50 border border-cyan-500/30 rounded text-cyan-300 text-xs">
          <strong className="text-cyan-400">✨ Instalação automática:</strong><br />
          • O sistema baixa o SteamCMD do servidor oficial<br />
          • Extrai e configura automaticamente<br />
          • Tudo acontece na pasta do projeto (steamcmd/)
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-cyan-400 [text-shadow:0_0_20px_rgba(6,182,212,0.8)] font-bold">
          Testador de Contas
        </h4>
        
        <button
          onClick={testarTodasContas}
          disabled={testando || contas.length === 0}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all group ${
            testando || contas.length === 0
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-black/80 hover:bg-black border-2 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)] hover:shadow-[0_0_25px_rgba(6,182,212,0.8)] hover:scale-105'
          }`}
        >
          {testando ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400"></div>
              <span className="text-cyan-400 font-bold">Testando...</span>
            </div>
          ) : (
            <span className="text-[rgb(0,181,215)] group-hover:text-cyan-400 transition-colors font-bold">Testar Todas as Contas</span>
          )}
        </button>
      </div>

      {/* Progresso */}
      {testando && progresso.total > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-cyan-400 mb-1">
            <span className="font-semibold">Testando contas...</span>
            <span className="font-bold">{progresso.atual}/{progresso.total}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 border border-cyan-500/30">
            <div 
              className="bg-gradient-to-r from-cyan-500 to-cyan-400 h-2 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
              style={{ width: `${(progresso.atual / progresso.total) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Resultados */}
      {resultados.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-cyan-400 [text-shadow:0_0_15px_rgba(6,182,212,0.5)] font-bold mb-2">📊 Resultados dos Testes:</h5>
          
          {/* Estatísticas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            <div className="bg-gray-800/50 border-2 border-cyan-500/50 rounded-lg p-2 text-center shadow-[0_0_10px_rgba(6,182,212,0.2)]">
              <div className="text-cyan-400 font-bold text-lg">
                {resultados.filter(r => r.sucesso).length}
              </div>
              <div className="text-cyan-300 text-xs font-semibold">Válidas</div>
            </div>
            <div className="bg-gray-800/50 border-2 border-red-500/50 rounded-lg p-2 text-center shadow-[0_0_10px_rgba(239,68,68,0.2)]">
              <div className="text-red-400 font-bold text-lg">
                {resultados.filter(r => r.status === 'credenciais_invalidas').length}
              </div>
              <div className="text-red-300 text-xs font-semibold">Inválidas</div>
            </div>
            <div className="bg-gray-800/50 border-2 border-yellow-500/50 rounded-lg p-2 text-center shadow-[0_0_10px_rgba(234,179,8,0.2)]">
              <div className="text-yellow-400 font-bold text-lg">
                {resultados.filter(r => r.status === 'steam_guard').length}
              </div>
              <div className="text-yellow-300 text-xs font-semibold">Steam Guard</div>
            </div>
            <div className="bg-gray-800/50 border-2 border-gray-500/50 rounded-lg p-2 text-center shadow-[0_0_10px_rgba(107,114,128,0.2)]">
              <div className="text-gray-400 font-bold text-lg">
                {resultados.filter(r => !r.sucesso && r.status !== 'credenciais_invalidas' && r.status !== 'steam_guard').length}
              </div>
              <div className="text-gray-300 text-xs font-semibold">Outros</div>
            </div>
          </div>

          {/* Lista de resultados */}
          <div className="max-h-60 overflow-y-auto space-y-2">
            {resultados.map((resultado, index) => (
              <div 
                key={index}
                className="flex items-center justify-between bg-gray-800/50 border border-cyan-500/30 rounded-lg p-2 text-sm shadow-[0_0_5px_rgba(6,182,212,0.2)]"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getStatusEmoji(resultado)}</span>
                  <span className="text-cyan-300 font-bold">{resultado.usuario}</span>
                </div>
                <div className="text-right">
                  <div className={`font-semibold ${getStatusColor(resultado)}`}>
                    {resultado.motivo}
                  </div>
                  <div className="text-gray-400 text-xs">
                    {resultado.duracao}ms
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Aviso */}
      <div className="mt-4 p-3 bg-gray-800/50 border-2 border-cyan-500/50 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.3)]">
        <p className="text-cyan-400 font-bold text-sm mb-2">
          ⚠️ Importante
        </p>
        <p className="text-gray-300 text-xs mb-2">
          Este teste realiza login REAL nas contas Steam. Use com moderação para evitar bloqueios. Contas com Steam Guard não serão testadas.
        </p>
        <p className="text-cyan-400 text-xs font-semibold mb-1">
          Intervalo: 5 segundos entre cada teste para evitar bloqueios.
        </p>
        <p className="text-cyan-400 text-xs font-semibold">
          Aviso: Todas as contas serão testadas novamente, independente do status anterior.
        </p>
      </div>
    </div>
  )
}

export default TestadorContas
