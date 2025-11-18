import { useState, useEffect } from 'react'
import api from '../services/api'
import { buscarCredenciaisFrontend, buscarCredenciaisViaProxySimples, buscarCredenciaisViaServicoLocal, buscarCredenciaisViaProxyPublico } from '../services/pokopowScraper'
import { X, RefreshCw, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog'
import { Button } from './ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Progress } from './ui/progress'
import TestadorContas from './TestadorContas'
import AccountCard from './AccountCard'
import CredenciaisModal from './CredenciaisModal'
import ResultadoSincronizacaoModal from './ResultadoSincronizacaoModal'

/**
 * Modal que exibe detalhes do jogo e contas disponíveis
 * Design atualizado do Figma
 */
function GameModal({ game, onClose, abasConfig }) {
  const [contas, setContas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [recarregarContas, setRecarregarContas] = useState(0)
  const [testandoConta, setTestandoConta] = useState(null)
  const [resultadoTeste, setResultadoTeste] = useState(null)
  const [sincronizando, setSincronizando] = useState(false)
  const [resultadoSincronizacao, setResultadoSincronizacao] = useState(null)
  const [credentialsModal, setCredentialsModal] = useState(null)
  const [mostrarResultadoModal, setMostrarResultadoModal] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  useEffect(() => {
    const fetchContas = async () => {
      try {
        setLoading(true)
        const response = await api.get(`/api/contas/${game.id}`)
        setContas(response.data)
        setError(null)
      } catch (err) {
        console.error('Erro ao buscar contas:', err)
        setError('Erro ao carregar contas disponíveis')
      } finally {
        setLoading(false)
      }
    }

    if (game) {
      // Resetar estado da imagem quando o jogo mudar
      setImageError(false)
      setImageLoaded(false)
      fetchContas()
    }
  }, [game, recarregarContas])

  const handleContasAtualizadas = () => {
    setRecarregarContas(prev => prev + 1)
  }

  const sincronizarJogo = async () => {
    if (!game?.id) return
    
    try {
      setSincronizando(true)
      setResultadoSincronizacao(null)
      
      // 🆕 CADEIA DE FALLBACKS: Tentar múltiplas estratégias
      let contasEncontradas = null
      // Construir URL se não existir
      const gameUrl = game.url || `https://pokopow.com/${game.nome.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`
      
      console.log('🔄 [SYNC] Iniciando sincronização para:', game.nome);
      console.log('🔄 [SYNC] URL do jogo:', gameUrl);
      
      if (gameUrl && gameUrl.includes('pokopow.com')) {
        // Estratégia 1: Proxy simples local (rápido, sem Puppeteer) ⭐ NOVO
        try {
          console.log('⚡ [SYNC] Estratégia 1: Tentando proxy simples local (rápido)...')
          contasEncontradas = await buscarCredenciaisViaProxySimples(gameUrl)
          if (contasEncontradas && contasEncontradas.length > 0) {
            console.log(`✅ [SYNC] Proxy simples encontrou ${contasEncontradas.length} conta(s)!`)
          }
        } catch (error) {
          console.log('⚠️ [SYNC] Proxy simples não disponível ou falhou')
        }
        
        // Estratégia 2: Serviço local (Puppeteer no PC do usuário)
        if (!contasEncontradas || contasEncontradas.length === 0) {
          try {
            console.log('🖥️ [SYNC] Estratégia 2: Tentando serviço local (Puppeteer)...')
            contasEncontradas = await buscarCredenciaisViaServicoLocal(gameUrl, game.id, game.nome)
            if (contasEncontradas && contasEncontradas.length > 0) {
              console.log(`✅ [SYNC] Serviço local encontrou ${contasEncontradas.length} conta(s)!`)
            }
          } catch (error) {
            console.log('⚠️ [SYNC] Serviço local não disponível ou falhou')
          }
        }
        
        // Estratégia 3: Frontend direto (pode falhar por CORS)
        if (!contasEncontradas || contasEncontradas.length === 0) {
          try {
            console.log('🌐 [SYNC] Estratégia 3: Tentando frontend direto...')
            contasEncontradas = await buscarCredenciaisFrontend(gameUrl)
            if (contasEncontradas && contasEncontradas.length > 0) {
              console.log(`✅ [SYNC] Frontend direto encontrou ${contasEncontradas.length} conta(s)!`)
            }
          } catch (error) {
            console.log('⚠️ [SYNC] Frontend direto falhou (CORS provavelmente)')
          }
        }
        
        // Estratégia 4: Proxy público (bypass CORS)
        if (!contasEncontradas || contasEncontradas.length === 0) {
          try {
            console.log('🌐 [SYNC] Estratégia 4: Tentando proxy público...')
            contasEncontradas = await buscarCredenciaisViaProxyPublico(gameUrl)
            if (contasEncontradas && contasEncontradas.length > 0) {
              console.log(`✅ [SYNC] Proxy público encontrou ${contasEncontradas.length} conta(s)!`)
            }
          } catch (error) {
            console.log('⚠️ [SYNC] Proxy público falhou')
          }
        }
        
        // Se encontrou credenciais em qualquer estratégia, enviar para backend salvar
        if (contasEncontradas && contasEncontradas.length > 0) {
          console.log(`✅ [SYNC] Total: ${contasEncontradas.length} conta(s) encontrada(s), enviando para backend na nuvem salvar...`)
          const response = await api.post(`/api/jogos/sincronizar/${game.id}`, {
            credenciais: contasEncontradas,
            usarCredenciaisFornecidas: true,
            jogoNome: game.nome // 🆕 Enviar nome do jogo para criar automaticamente se não existir
          }, {
            timeout: 30000
          })
          
          const resultadoFormatado = {
            status: response.data.sucesso ? 'concluido' : 'erro',
            mensagem: response.data.mensagem || response.data.error || `${contasEncontradas.length} conta(s) encontrada(s) e salva(s) com sucesso!`,
            jogosAdicionados: 0,
            contasAdicionadas: response.data.contasAdicionadas || contasEncontradas.length,
            jogosAtualizados: 0,
            totalJogos: 1,
            jogosAdicionadosLista: [],
            iniciado: new Date().toISOString(),
            finalizado: response.data.timestamp || new Date().toISOString()
          }
          
          setResultadoSincronizacao(resultadoFormatado)
          setMostrarResultadoModal(true)
          handleContasAtualizadas()
          return // Sucesso, sair
        }
      }
      
      // 🔄 FALLBACK: Usar backend (código original)
      console.log('🔄 [SYNC] Usando backend para sincronizar...')
      const response = await api.post(`/api/jogos/sincronizar/${game.id}`, {}, {
        timeout: 300000
      })
      
      // Converter resposta para formato do modal
      const resultadoFormatado = {
        status: response.data.sucesso ? 'concluido' : 'erro',
        mensagem: response.data.mensagem || response.data.error,
        jogosAdicionados: 0, // Sincronização individual não adiciona jogos
        contasAdicionadas: response.data.contasAdicionadas || 0,
        jogosAtualizados: 0,
        totalJogos: 1, // Apenas 1 jogo foi processado
        jogosAdicionadosLista: [],
        iniciado: new Date().toISOString(),
        finalizado: response.data.timestamp || new Date().toISOString()
      }
      
      setResultadoSincronizacao(resultadoFormatado)
      setMostrarResultadoModal(true)
      handleContasAtualizadas()
      
    } catch (error) {
      console.error('Erro ao sincronizar jogo:', error)
      
      // 🆕 Melhorar mensagem de erro 403
      let mensagemErro = error.response?.data?.error || 'Erro ao sincronizar jogo'
      let detalhesErro = error.response?.data?.detalhes || error.message
      
      if (error.response?.status === 403 || mensagemErro.includes('403') || detalhesErro.includes('403')) {
        mensagemErro = 'Site bloqueando requisições (403)'
        detalhesErro = 'O site pokopow.com está bloqueando o servidor. O frontend tentou primeiro, mas CORS bloqueou. O backend também foi bloqueado. Tente novamente mais tarde ou adicione contas manualmente.'
      } else if (error.response?.status === 404) {
        // Verificar se é erro do backend (jogo não existe no banco) ou do site
        if (mensagemErro.includes('Jogo não encontrado') || mensagemErro.includes('não encontrado')) {
          mensagemErro = 'Jogo não encontrado no banco de dados'
          detalhesErro = `O jogo "${game.nome}" (ID: ${game.id}) não existe no banco de dados do backend na nuvem. Isso pode acontecer se o jogo foi adicionado apenas localmente. Tente recarregar a página ou adicione contas manualmente.`
        } else {
          mensagemErro = 'Jogo não encontrado no site'
          detalhesErro = `O jogo "${game.nome}" não foi encontrado no site pokopow.com. Isso pode acontecer se o jogo não existe no site ou se o nome está diferente. Você pode adicionar contas manualmente.`
        }
      }
      
      const resultadoErro = {
        status: 'erro',
        mensagem: mensagemErro,
        detalhes: detalhesErro,
        jogosAdicionados: 0,
        contasAdicionadas: 0,
        jogosAtualizados: 0,
        totalJogos: 1,
        jogosAdicionadosLista: [],
        iniciado: new Date().toISOString(),
        finalizado: new Date().toISOString()
      }
      setResultadoSincronizacao(resultadoErro)
      setMostrarResultadoModal(true)
    } finally {
      setSincronizando(false)
    }
  }

  const retestarConta = async (contaId) => {
    try {
      setTestandoConta(contaId)
      setResultadoTeste(null)
      
      const response = await api.post(`/api/contas/testar/${contaId}`)
      
      setResultadoTeste(response.data)
      
      if (response.data.conta_id) {
        await api.post('/api/contas/atualizar-status', {
          resultados: [{
            conta_id: response.data.conta_id,
            sucesso: response.data.sucesso,
            status: response.data.status
          }]
        })
        
        handleContasAtualizadas()
      }
      
    } catch (error) {
      console.error('Erro ao retestar conta:', error)
      setResultadoTeste({
        sucesso: false,
        motivo: error.response?.data?.error || 'Erro ao testar conta'
      })
    } finally {
      setTestandoConta(null)
    }
  }

  const handleTestAllAccounts = async () => {
    // Esta função será chamada pelo TestadorContas
    if (!game?.id) return
    
    try {
      const response = await api.post(`/api/contas/testar-jogo/${game.id}`, {
        limite: contas.length
      })
      
      await api.post('/api/contas/atualizar-status', {
        resultados: response.data.resultados
      })
      
      handleContasAtualizadas()
    } catch (error) {
      console.error('Erro ao testar todas as contas:', error)
    }
  }

  const validAccounts = contas.filter(conta => {
    const status = conta.status?.toLowerCase() || ''
    return status === 'disponivel' || status === 'funcionando' || status === 'valid'
  })

  const invalidAccounts = contas.filter(conta => {
    const status = conta.status?.toLowerCase() || ''
    return status === 'invalido' || 
           status === 'credenciais_invalidas' ||
           status === 'steam_guard' || 
           status === 'bloqueado' || 
           status === 'erro' ||
           status === 'erro_desconhecido'
  })

  // Usar configuração de abas se fornecida
  const abas = abasConfig || [
    { id: 'valid', label: 'Válidas', cor: 'green-cyan', ativa: true },
    { id: 'invalid', label: 'Inválidas/Steam Guard', cor: 'red-orange', ativa: true }
  ]

  // Filtrar apenas abas ativas
  const abasAtivas = abas.filter(aba => aba.ativa)

  // Função para obter classes de cor da aba
  const getAbaColorClasses = (cor) => {
    const colors = {
      'green-cyan': 'data-[state=active]:from-green-600 data-[state=active]:to-cyan-600 data-[state=active]:shadow-[0_0_15px_rgba(6,182,212,0.4)]',
      'red-orange': 'data-[state=active]:from-red-600 data-[state=active]:to-orange-600 data-[state=active]:shadow-[0_0_15px_rgba(239,68,68,0.4)]',
      'blue-purple': 'data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:shadow-[0_0_15px_rgba(139,92,246,0.4)]',
      'purple-pink': 'data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:shadow-[0_0_15px_rgba(236,72,153,0.4)]'
    }
    return colors[cor] || colors['green-cyan']
  }

  // Função para obter contas baseado no ID da aba
  const getContasPorAba = (abaId) => {
    if (abaId === 'valid') return validAccounts
    if (abaId === 'invalid') return invalidAccounts
    // Para abas customizadas, você pode adicionar lógica aqui
    return []
  }

  if (!game) return null

  return (
    <>
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="w-[90vw] max-w-[800px] h-[85vh] overflow-y-auto bg-gray-950 border-2 border-cyan-500/50 shadow-[0_0_50px_rgba(6,182,212,0.3)] p-0">
          <DialogTitle className="sr-only">{game.nome}</DialogTitle>
          <DialogDescription className="sr-only">Detalhes e contas do jogo {game.nome}</DialogDescription>
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-50 rounded-full p-2 bg-gray-900 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300 transition-all duration-300 hover:shadow-[0_0_20px_rgba(6,182,212,0.5)]"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header with game cover */}
          <div className="relative">
            <div className="h-48 overflow-hidden bg-gray-800">
              {game.capa && !imageError ? (
                <>
                  <img
                    src={game.capa}
                    alt={game.nome}
                    className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                    onError={() => setImageError(true)}
                    onLoad={() => setImageLoaded(true)}
                    loading="lazy"
                  />
                  {!imageLoaded && (
                    <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                      <span className="text-gray-600 text-4xl">🎮</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                  <span className="text-gray-600 text-4xl">🎮</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/80 to-transparent" />
            </div>
            
            <div className="absolute bottom-6 left-6 right-6">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-cyan-400 [text-shadow:0_0_20px_rgba(6,182,212,0.8)] text-2xl font-bold">
                  {game.nome}
                </h2>
                <Button
                  onClick={sincronizarJogo}
                  disabled={sincronizando}
                  className="px-3 py-1.5 text-sm bg-black/80 hover:bg-black border-2 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)] hover:shadow-[0_0_25px_rgba(6,182,212,0.8)] transition-all duration-300 group"
                >
                  {sincronizando ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      <span className="text-[rgb(0,181,215)] group-hover:text-cyan-400 transition-colors font-bold">
                        Sincronizando...
                      </span>
                    </>
                  ) : (
                    <span className="text-[rgb(0,181,215)] group-hover:text-cyan-400 transition-colors font-bold">
                      Sincronizar
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Resultado da Sincronização */}
          {resultadoSincronizacao && (
            <div className={`mx-6 mt-4 p-3 rounded-lg border ${
              resultadoSincronizacao.sucesso
                ? 'bg-green-900/30 border-green-600 text-green-300'
                : 'bg-red-900/30 border-red-600 text-red-300'
            }`}>
              <div className="flex items-start gap-2">
                <span className="text-lg">{resultadoSincronizacao.sucesso ? '✅' : '❌'}</span>
                <div className="flex-1">
                  <p className="font-medium">{resultadoSincronizacao.mensagem || resultadoSincronizacao.error}</p>
                  {resultadoSincronizacao.contasAdicionadas !== undefined && (
                    <p className="text-sm mt-1">
                      ➕ {resultadoSincronizacao.contasAdicionadas} nova(s) conta(s) adicionada(s)
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Testador de Contas */}
            <TestadorContas 
              jogo={game}
              contas={contas}
              onContasAtualizadas={handleContasAtualizadas}
            />

            {/* Tabs */}
            <Tabs defaultValue={abasAtivas[0]?.id || 'valid'} className="w-full">
              <TabsList className={`grid w-full bg-gray-900 border border-gray-800 ${abasAtivas.length === 1 ? 'grid-cols-1' : abasAtivas.length === 2 ? 'grid-cols-2' : abasAtivas.length === 3 ? 'grid-cols-3' : abasAtivas.length === 4 ? 'grid-cols-4' : 'grid-cols-2'}`}>
                {abasAtivas.map((aba) => {
                  const contasAba = getContasPorAba(aba.id)
                  return (
                    <TabsTrigger
                      key={aba.id}
                      value={aba.id}
                      className={`data-[state=active]:bg-gradient-to-r data-[state=active]:text-white ${getAbaColorClasses(aba.cor)}`}
                    >
                      {aba.label} ({contasAba.length})
                    </TabsTrigger>
                  )
                })}
              </TabsList>

              {abasAtivas.map((aba) => {
                const contasAba = getContasPorAba(aba.id)
                return (
                  <TabsContent key={aba.id} value={aba.id} className="space-y-3 mt-4">
                    {loading ? (
                      <div className="text-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-cyan-400" />
                        <p className="text-gray-400">Carregando contas...</p>
                      </div>
                    ) : contasAba.length === 0 ? (
                      <div className="text-center py-12 text-gray-400">
                        Nenhuma conta encontrada nesta aba
                      </div>
                    ) : (
                      contasAba.map((conta) => {
                        // Determinar status baseado no ID da aba
                        let status = 'unknown'
                        if (aba.id === 'valid') {
                          status = conta.status === 'funcionando' ? 'valid' : 
                                   conta.status === 'disponivel' ? 'valid' : 
                                   conta.status?.toLowerCase() || 'unknown'
                        } else if (aba.id === 'invalid') {
                          status = conta.status?.toLowerCase() === 'steam_guard' ? 'steam-guard' :
                                   conta.status?.toLowerCase() === 'invalido' ? 'invalid' :
                                   conta.status?.toLowerCase() || 'unknown'
                        }
                        
                        return (
                          <AccountCard
                            key={conta.id}
                            account={{
                              id: conta.id,
                              username: conta.usuario,
                              password: conta.senha,
                              status: status,
                              lastTested: conta.ultimo_teste || conta.lastTested
                            }}
                            onViewCredentials={() => setCredentialsModal({ game, account: conta })}
                            onRetest={() => retestarConta(conta.id)}
                          />
                        )
                      })
                    )}
                  </TabsContent>
                )
              })}
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Credenciais */}
      {credentialsModal && (
        <CredenciaisModal
          jogo={credentialsModal.game}
          onClose={() => setCredentialsModal(null)}
          conta={{
            usuario: credentialsModal.account.usuario || credentialsModal.account.username,
            senha: credentialsModal.account.senha || credentialsModal.account.password
          }}
        />
      )}

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
    </>
  )
}

export default GameModal
