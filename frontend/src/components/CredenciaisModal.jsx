import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog'
import { X } from 'lucide-react'

/**
 * Modal para exibir credenciais encontradas de um jogo
 * Refatorado para usar Dialog do Radix UI - só fecha pelo botão X
 */
function CredenciaisModal({ jogo, onClose, conta }) {
  const [credenciais, setCredenciais] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [loadingMessage, setLoadingMessage] = useState('Carregando credenciais...')
  const [retryCount, setRetryCount] = useState(0)
  const [copiedText, setCopiedText] = useState('')
  const [testando, setTestando] = useState(false)
  const [resultadosTeste, setResultadosTeste] = useState([])
  const [progressoTeste, setProgressoTeste] = useState({ atual: 0, total: 0 })

  useEffect(() => {
    const buscarCredenciais = async () => {
      if (!jogo) return

      try {
        setLoading(true)
        setError(null)
        
        // Se uma conta específica foi fornecida, usar apenas ela
        if (conta) {
          const usuario = conta.usuario || conta.user || ''
          const senha = conta.senha || conta.pass || ''
          
          if (usuario && senha) {
            setCredenciais([{
              user: usuario,
              pass: senha
            }])
            setLoading(false)
            return
          }
        }
        
        // Se o jogo tem ID (vem do banco), buscar contas do banco
        if (jogo.id) {
          // Primeiro buscar do banco (caso já existam)
          try {
            const response = await api.get(`/api/contas/${jogo.id}`)
            const contas = response.data || []
            
            if (contas.length > 0) {
              // Se já tem contas no banco, mostrar
              setCredenciais(contas.map(conta => ({
                user: conta.usuario,
                pass: conta.senha
              })))
              setLoading(false)
              return
            }
          } catch (err) {
            console.error('Erro ao buscar contas do banco:', err)
          }
          
          // Se não tem contas no banco, solicitar busca imediata via scraper local
          if (jogo.nome) {
            setLoadingMessage('Buscando contas no site (isso pode levar alguns minutos)...')
            
            try {
              // Chamar endpoint que solicita busca imediata via scraper local
              const response = await api.get(`/api/busca/credenciais?url=${encodeURIComponent(jogo.url || '')}&jogoId=${jogo.id}&jogoNome=${encodeURIComponent(jogo.nome)}`, {
                timeout: 120000 // 2 minutos para dar tempo do scraper buscar
              })
              
              const credenciaisEncontradas = response.data?.credenciais || []
              
              if (credenciaisEncontradas.length > 0) {
                setCredenciais(credenciaisEncontradas)
              } else {
                setError('Nenhuma conta encontrada no momento. O scraper local está buscando automaticamente em segundo plano. Tente novamente em alguns minutos.')
              }
            } catch (err) {
              console.error('Erro ao buscar via scraper local:', err)
              // Se falhar, ainda tentar buscar do banco novamente
              try {
                const response = await api.get(`/api/contas/${jogo.id}`)
                const contas = response.data || []
                setCredenciais(contas.map(conta => ({
                  user: conta.usuario,
                  pass: conta.senha
                })))
              } catch (err2) {
                setError('Não foi possível buscar contas. Verifique se o scraper local está rodando em scripts-local/')
              }
            }
          } else {
            // Se não tem nome, apenas buscar do banco
            const response = await api.get(`/api/contas/${jogo.id}`)
            const contas = response.data || []
            setCredenciais(contas.map(conta => ({
              user: conta.usuario,
              pass: conta.senha
            })))
          }
        } 
        // Se não tem ID mas tem URL, buscar do site
        else if (jogo.url) {
          setLoadingMessage('Buscando credenciais online...')
          const response = await api.get(`/api/busca/credenciais?url=${encodeURIComponent(jogo.url)}`, {
            timeout: 120000
          })
          
          const credenciaisDoSite = response.data.credenciais || []
          
          if (credenciaisDoSite.length === 0) {
            setError('Não foi possível extrair as credenciais automaticamente. Isso pode acontecer se:\n\n• O servidor está temporariamente indisponível\n• As credenciais estão em um formato não reconhecido\n• O jogo não possui credenciais disponíveis\n\nTente novamente mais tarde.')
          } else {
            setCredenciais(credenciaisDoSite)
          }
        } else {
          setError('Jogo sem informações suficientes para buscar credenciais')
        }
      } catch (err) {
        console.error('Erro ao buscar credenciais:', err)
        
        if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
          setError('Timeout: O servidor está demorando muito para responder. Foram feitas múltiplas tentativas, mas não foi possível conectar.')
        } else {
          setError('Erro ao buscar credenciais. Verifique sua conexão com a internet.')
        }
      } finally {
        setLoading(false)
      }
    }

    buscarCredenciais()
  }, [jogo, conta, retryCount])

  const tentarNovamente = () => {
    setLoading(true)
    setError(null)
    setLoadingMessage('Tentando novamente...')
    setRetryCount(prev => prev + 1)
  }

  const copiarTexto = useCallback((texto, tipo = 'texto') => {
    try {
      let textoStr = ''
      if (texto === null || texto === undefined) {
        alert(`Erro: ${tipo} está vazio ou inválido!`)
        return false
      }
      
      textoStr = String(texto).trim()
      
      if (textoStr.includes('pokopow.com') || textoStr.includes('http') || textoStr.includes('www.')) {
        alert(`Erro: Parece que está tentando copiar uma URL ao invés de ${tipo}!`)
        return false
      }
      
      if (textoStr === '' || textoStr === 'undefined' || textoStr === 'null') {
        alert(`Erro: ${tipo} está vazio!`)
        return false
      }

      // Método 1: Clipboard API
      const copiarComClipboardAPI = async () => {
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(textoStr)
            return true
          }
        } catch (err) {
          console.log('Clipboard API falhou:', err)
        }
        return false
      }

      // Método 2: Fallback
      const copiarComTextarea = () => {
        try {
          const textArea = document.createElement('textarea')
          textArea.value = textoStr
          textArea.style.position = 'fixed'
          textArea.style.top = '0'
          textArea.style.left = '0'
          textArea.style.width = '2em'
          textArea.style.height = '2em'
          textArea.style.padding = '0'
          textArea.style.border = 'none'
          textArea.style.outline = 'none'
          textArea.style.boxShadow = 'none'
          textArea.style.background = 'transparent'
          textArea.style.opacity = '0'
          textArea.setAttribute('readonly', '')
          
          document.body.appendChild(textArea)
          textArea.focus()
          textArea.select()
          textArea.setSelectionRange(0, 99999)
          
          const successful = document.execCommand('copy')
          document.body.removeChild(textArea)
          
          return successful
        } catch (err) {
          console.error('Erro no fallback:', err)
          return false
        }
      }

      const tentarCopiar = async () => {
        try {
          const sucessoAPI = await copiarComClipboardAPI()
          
          if (sucessoAPI) {
            setCopiedText(textoStr)
            setTimeout(() => setCopiedText(''), 2000)
            return true
          }

          const sucessoFallback = copiarComTextarea()
          
          if (sucessoFallback) {
            setCopiedText(textoStr)
            setTimeout(() => setCopiedText(''), 2000)
            return true
          } else {
            alert(`Não foi possível copiar automaticamente.\n\n${tipo}: ${textoStr}\n\nSelecione e copie manualmente (Ctrl+C).`)
            return false
          }
        } catch (err) {
          console.error('Erro ao tentar copiar:', err)
          alert(`Erro ao copiar ${tipo}. Tente novamente.`)
          return false
        }
      }

      tentarCopiar()
      return true
    } catch (err) {
      console.error('Erro geral em copiarTexto:', err)
      alert(`Erro ao copiar ${tipo}. Tente novamente.`)
      return false
    }
  }, [])

  const criarHandlerCopiar = useCallback((texto, tipo) => {
    return (e) => {
      if (e) {
        e.preventDefault()
        e.stopPropagation()
      }
      
      if (!texto || String(texto).trim() === '') {
        alert(`${tipo} está vazio!`)
        return false
      }
      
      copiarTexto(texto, tipo)
      return false
    }
  }, [copiarTexto])

  // Função para testar uma conta individual
  const testarContaIndividual = async (usuario, senha) => {
    try {
      const response = await api.post('/api/contas/testar', {
        usuario,
        senha
      })
      return response.data
    } catch (error) {
      console.error('Erro ao testar conta:', error)
      throw error
    }
  }

  // Função para testar todas as credenciais encontradas
  const testarTodasCredenciais = async () => {
    if (credenciais.length === 0) return

    try {
      setTestando(true)
      setResultadosTeste([])
      setProgressoTeste({ atual: 0, total: credenciais.length })
      const resultados = []
      
      for (let i = 0; i < credenciais.length; i++) {
        const cred = credenciais[i]
        const usuario = cred.user || cred.usuario || ''
        const senha = cred.pass || cred.senha || ''
        
        if (usuario && senha) {
          try {
            setProgressoTeste({ atual: i + 1, total: credenciais.length })
            const resultado = await testarContaIndividual(usuario, senha)
            resultados.push(resultado)
          } catch (error) {
            resultados.push({
              usuario,
              sucesso: false,
              status: 'erro',
              motivo: error.response?.data?.error || 'Erro ao testar conta',
              duracao: 0
            })
          }
          
          // Delay de 5 segundos entre cada teste para evitar bloqueios
          if (i < credenciais.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 5000))
          }
        }
      }
      
      setResultadosTeste(resultados)
    } catch (error) {
      console.error('Erro ao testar credenciais:', error)
      alert('Erro ao testar credenciais: ' + (error.response?.data?.error || error.message))
    } finally {
      setTestando(false)
      setProgressoTeste({ atual: 0, total: 0 })
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

  return (
    <Dialog 
      open={true} 
      onOpenChange={(open) => {
        // Só permite fechar se explicitamente chamado pelo botão X
        // Não fecha por ESC ou clique fora
        if (!open) {
          // Não fazer nada - modal não fecha automaticamente
          return
        }
      }}
    >
      <DialogContent
        className="max-w-6xl w-[95vw] max-h-[90vh] overflow-hidden bg-gray-950 border-2 border-cyan-500/50 shadow-[0_0_50px_rgba(6,182,212,0.3)] p-0 flex flex-col"
        onInteractOutside={(e) => {
          // Bloquear fechamento ao clicar fora
          e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          // Bloquear ESC
          e.preventDefault()
        }}
        onPointerDownOutside={(e) => {
          // Bloquear fechamento ao clicar fora
          e.preventDefault()
        }}
      >
        <DialogTitle className="sr-only">Credenciais do Jogo</DialogTitle>
        <DialogDescription className="sr-only">Credenciais de acesso para {jogo?.nome || 'o jogo'}</DialogDescription>
        {/* Botão X customizado - única forma de fechar */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onClose()
          }}
          className="absolute right-4 top-4 z-50 rounded-full p-2 bg-gray-900 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300 transition-all duration-300 hover:shadow-[0_0_20px_rgba(6,182,212,0.5)]"
          title="Fechar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b-2 border-cyan-500/50 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-[rgb(0,181,215)] [text-shadow:0_0_20px_rgba(6,182,212,0.8)] mb-2">
              {jogo?.nome || 'Jogo'}
            </h2>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="p-6 bg-gray-950 overflow-y-auto flex-1 min-h-0">
          {loading && (
            <div className="flex justify-center items-center py-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
                <p className="text-[rgb(0,181,215)] font-bold text-lg">{loadingMessage}</p>
                {!jogo?.id && (
                  <p className="text-gray-400 text-sm mt-2">
                    ⏱️ Isso pode demorar até 2 minutos (múltiplas tentativas)
                  </p>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-900/20 border-2 border-red-700 rounded-lg p-6 text-center shadow-[0_0_15px_rgba(239,68,68,0.3)]">
              <p className="text-red-400 font-bold whitespace-pre-line">{error}</p>
              {!jogo?.id && (
                <button
                  type="button"
                  onClick={tentarNovamente}
                  className="mt-4 px-6 py-3 bg-black/80 hover:bg-black border-2 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)] hover:shadow-[0_0_25px_rgba(6,182,212,0.8)] text-[rgb(0,181,215)] hover:text-cyan-400 font-bold rounded-lg transition-all duration-300 hover:scale-105"
                >
                  🔄 Tentar Novamente
                </button>
              )}
            </div>
          )}

          {/* Toast de notificação */}
          {copiedText && (
            <div className="fixed top-4 right-4 bg-cyan-500 text-black px-6 py-3 rounded-lg font-bold shadow-[0_0_20px_rgba(6,182,212,0.8)] z-[110] animate-bounce">
              ✅ Copiado para a área de transferência!
            </div>
          )}

          {!loading && !error && credenciais.length === 0 && (
            <div className="text-center py-20">
              <p className="text-gray-400 text-xl font-bold">Nenhuma credencial encontrada</p>
              <p className="text-gray-500 text-sm mt-2">
                Este jogo pode não ter credenciais disponíveis no momento
              </p>
            </div>
          )}

          {!loading && !error && credenciais.length > 0 && (
            <div>
              {/* Botão para testar credenciais */}
              <div className="mb-6 flex flex-col items-end gap-3">
                <button
                  type="button"
                  onClick={testarTodasCredenciais}
                  disabled={testando || loading}
                  className="px-6 py-3 bg-black/80 hover:bg-black border-2 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)] hover:shadow-[0_0_25px_rgba(6,182,212,0.8)] text-[rgb(0,181,215)] hover:text-cyan-400 font-bold rounded-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {testando ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400"></div>
                      <span>Testando...</span>
                    </div>
                  ) : (
                    `🧪 Testar ${credenciais.length} Conta(s)`
                  )}
                </button>
                <div className="bg-gray-800/50 border-2 border-cyan-500/50 rounded-lg p-3 shadow-[0_0_15px_rgba(6,182,212,0.3)] max-w-md">
                  <p className="text-cyan-400 font-bold text-sm mb-1">
                    ⚠️ Importante
                  </p>
                  <p className="text-gray-300 text-xs mb-1">
                    Este teste realiza login REAL nas contas Steam. Use com moderação para evitar bloqueios. Contas com Steam Guard não serão testadas.
                  </p>
                  <p className="text-cyan-400 text-xs font-semibold">
                    Intervalo: 5 segundos entre cada teste para evitar bloqueios.
                  </p>
                </div>
              </div>

              {/* Progresso do teste */}
              {testando && progressoTeste.total > 0 && (
                <div className="mb-6 bg-gray-800/50 border-2 border-cyan-500/50 rounded-lg p-4">
                  <div className="flex justify-between text-sm text-cyan-400 mb-2">
                    <span className="font-semibold">Testando contas...</span>
                    <span className="font-bold">{progressoTeste.atual}/{progressoTeste.total}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2 border border-cyan-500/30">
                    <div 
                      className="bg-gradient-to-r from-cyan-500 to-cyan-400 h-2 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                      style={{ width: `${(progressoTeste.atual / progressoTeste.total) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-gray-400 text-xs mt-2">
                    ⏱️ Intervalo de 5 segundos entre cada teste para evitar bloqueios
                  </p>
                </div>
              )}

              {/* Seção de resultados dos testes */}
              {resultadosTeste.length > 0 && (
                <div className="mb-6 bg-gray-800/50 border-2 border-cyan-500/50 rounded-lg p-4 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                  <h3 className="text-cyan-400 font-bold mb-4 text-lg">📊 Resultados dos Testes:</h3>
                  
                  {/* Estatísticas */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                    <div className="bg-gray-800/50 border-2 border-cyan-500/50 rounded-lg p-2 text-center shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                      <div className="text-cyan-400 font-bold text-lg">
                        {resultadosTeste.filter(r => r.sucesso).length}
                      </div>
                      <div className="text-cyan-300 text-xs font-semibold">Válidas</div>
                    </div>
                    <div className="bg-gray-800/50 border-2 border-red-500/50 rounded-lg p-2 text-center shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                      <div className="text-red-400 font-bold text-lg">
                        {resultadosTeste.filter(r => r.status === 'credenciais_invalidas').length}
                      </div>
                      <div className="text-red-300 text-xs font-semibold">Inválidas</div>
                    </div>
                    <div className="bg-gray-800/50 border-2 border-yellow-500/50 rounded-lg p-2 text-center shadow-[0_0_10px_rgba(234,179,8,0.2)]">
                      <div className="text-yellow-400 font-bold text-lg">
                        {resultadosTeste.filter(r => r.status === 'steam_guard').length}
                      </div>
                      <div className="text-yellow-300 text-xs font-semibold">Steam Guard</div>
                    </div>
                    <div className="bg-gray-800/50 border-2 border-gray-500/50 rounded-lg p-2 text-center shadow-[0_0_10px_rgba(107,114,128,0.2)]">
                      <div className="text-gray-400 font-bold text-lg">
                        {resultadosTeste.filter(r => !r.sucesso && r.status !== 'credenciais_invalidas' && r.status !== 'steam_guard').length}
                      </div>
                      <div className="text-gray-300 text-xs font-semibold">Outros</div>
                    </div>
                  </div>

                  {/* Lista de resultados */}
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {resultadosTeste.map((resultado, index) => (
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

              <div className="grid gap-6">
                {credenciais.map((cred, index) => {
                  const usuario = cred.user || cred.usuario || ''
                  const senha = cred.pass || cred.senha || ''
                  
                  return (
                    <div
                      key={index}
                      className="bg-gray-900 border-2 border-gray-800 rounded-lg p-6 hover:border-cyan-500 transition-all duration-300 shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)]"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Usuário */}
                        <div className="min-w-0">
                          <label className="text-[rgb(0,181,215)] text-sm mb-1 block font-bold">Usuário</label>
                          <input
                            type="text"
                            value={usuario}
                            readOnly
                            className="w-full bg-black border-2 border-gray-700 rounded px-4 py-3 text-white text-base focus:border-cyan-500 focus:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all overflow-hidden text-ellipsis"
                          />
                        </div>

                        {/* Senha */}
                        <div className="min-w-0">
                          <label className="text-cyan-400 text-sm mb-1 block font-bold">Senha</label>
                          <input
                            type="text"
                            value={senha}
                            readOnly
                            className="w-full bg-black border-2 border-gray-700 rounded px-4 py-3 text-white text-base focus:border-cyan-500 focus:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all overflow-hidden text-ellipsis"
                          />
                        </div>
                      </div>
                      
                      {/* Botões de ação rápida */}
                      <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-700">
                        <button
                          type="button"
                          data-copy-button="true"
                          onClick={criarHandlerCopiar(usuario, 'Usuário')}
                          className="flex-1 min-w-[140px] px-5 py-3 bg-black/80 hover:bg-black border-2 border-cyan-500 text-[rgb(0,181,215)] hover:text-cyan-400 rounded text-base font-bold transition-all duration-300 hover:scale-105 shadow-[0_0_15px_rgba(6,182,212,0.5)] hover:shadow-[0_0_25px_rgba(6,182,212,0.8)] cursor-pointer"
                          title="Copiar apenas usuário"
                        >
                          👤 Copiar Usuário
                        </button>
                        <button
                          type="button"
                          data-copy-button="true"
                          onClick={criarHandlerCopiar(senha, 'Senha')}
                          className="flex-1 min-w-[140px] px-5 py-3 bg-black/80 hover:bg-black border-2 border-cyan-500 text-[rgb(0,181,215)] hover:text-cyan-400 rounded text-base font-bold transition-all duration-300 hover:scale-105 shadow-[0_0_15px_rgba(6,182,212,0.5)] hover:shadow-[0_0_25px_rgba(6,182,212,0.8)] cursor-pointer"
                          title="Copiar apenas senha"
                        >
                          🔑 Copiar Senha
                        </button>
                        <button
                          type="button"
                          data-copy-button="true"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            if (!usuario || !senha || usuario.trim() === '' || senha.trim() === '') {
                              alert('Usuário ou senha estão vazios!')
                              return false
                            }
                            copiarTexto(`Usuário: ${usuario}\nSenha: ${senha}`, 'Credenciais completas')
                            return false
                          }}
                          className="flex-1 min-w-[140px] px-5 py-3 bg-black/80 hover:bg-black border-2 border-cyan-500 text-[rgb(0,181,215)] hover:text-cyan-400 rounded text-base font-bold transition-all duration-300 hover:scale-105 shadow-[0_0_15px_rgba(6,182,212,0.5)] hover:shadow-[0_0_25px_rgba(6,182,212,0.8)] cursor-pointer"
                          title="Copiar usuário e senha juntos"
                        >
                          📋 Copiar Ambos
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CredenciaisModal
