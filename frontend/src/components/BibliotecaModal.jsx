import { useState, useEffect } from 'react'
import api from '../services/api'
import { Dialog, DialogContent } from './ui/dialog'
import { X, ChevronDown, ChevronUp } from 'lucide-react'

function BibliotecaModal({ isOpen, onClose }) {
  const [jogos, setJogos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [jogoExpandido, setJogoExpandido] = useState(null)
  const [contasCarregando, setContasCarregando] = useState({})
  const [contasPorJogo, setContasPorJogo] = useState({})

  useEffect(() => {
    if (isOpen) {
      buscarBiblioteca()
      setJogoExpandido(null)
      setContasPorJogo({})
    }
  }, [isOpen])

  const buscarBiblioteca = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.get('/api/biblioteca')
      
      // Agrupar por jogo_id para evitar duplicatas (fallback)
      const jogosAgrupados = {}
      response.data.forEach(jogo => {
        if (!jogosAgrupados[jogo.jogo_id]) {
          jogosAgrupados[jogo.jogo_id] = jogo
        } else {
          // Se já existe, somar as contas
          jogosAgrupados[jogo.jogo_id].total_contas = 
            (jogosAgrupados[jogo.jogo_id].total_contas || 0) + (jogo.total_contas || 0)
        }
      })
      
      const jogosUnicos = Object.values(jogosAgrupados)
      console.log('📚 Jogos agrupados:', jogosUnicos.length, 'jogos únicos')
      setJogos(jogosUnicos)
    } catch (err) {
      console.error('Erro ao buscar biblioteca:', err)
      setError('Erro ao carregar biblioteca')
    } finally {
      setLoading(false)
    }
  }

  const carregarContasJogo = async (jogoId) => {
    console.log('🔍 Carregando contas do jogo:', jogoId)
    
    // Se já está expandido, apenas colapsar
    if (jogoExpandido === jogoId) {
      setJogoExpandido(null)
      return
    }

    // Se já carregou antes, apenas expandir
    if (contasPorJogo[jogoId]) {
      console.log('📚 Contas já carregadas, apenas expandindo')
      setJogoExpandido(jogoId)
      return
    }

    try {
      console.log('📡 Buscando contas do jogo:', jogoId)
      setContasCarregando(prev => ({ ...prev, [jogoId]: true }))
      const response = await api.get(`/api/biblioteca/jogo/${jogoId}/contas`)
      console.log('✅ Contas recebidas:', response.data)
      setContasPorJogo(prev => ({ ...prev, [jogoId]: response.data }))
      setJogoExpandido(jogoId)
    } catch (err) {
      console.error('❌ Erro ao buscar contas do jogo:', err)
      console.error('   Resposta:', err.response?.data)
      setContasPorJogo(prev => ({ ...prev, [jogoId]: [] }))
      alert('Erro ao carregar contas: ' + (err.response?.data?.error || err.message))
    } finally {
      setContasCarregando(prev => ({ ...prev, [jogoId]: false }))
    }
  }

  const removerDaBiblioteca = async (jogoId) => {
    if (!confirm('Tem certeza que deseja remover este jogo da biblioteca?')) {
      return
    }

    try {
      await api.delete(`/api/biblioteca/jogo/${jogoId}`)
      buscarBiblioteca() // Recarregar lista
      setJogoExpandido(null)
      setContasPorJogo(prev => {
        const novo = { ...prev }
        delete novo[jogoId]
        return novo
      })
    } catch (err) {
      console.error('Erro ao remover da biblioteca:', err)
      alert('Erro ao remover jogo da biblioteca')
    }
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-6xl w-[95vw] max-h-[90vh] overflow-hidden bg-gray-950 border-2 border-cyan-500/50 shadow-[0_0_50px_rgba(6,182,212,0.3)] p-0 flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        {/* Botão X */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-50 rounded-full p-2 bg-gray-900 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300 transition-all duration-300 hover:shadow-[0_0_20px_rgba(6,182,212,0.5)]"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b-2 border-cyan-500/50 p-6">
          <h2 className="text-3xl font-bold text-[rgb(0,181,215)] [text-shadow:0_0_20px_rgba(6,182,212,0.8)]">
            Biblioteca
          </h2>
          <p className="text-gray-400 text-sm mt-2">
            {jogos.length === 0 
              ? 'Nenhum jogo na biblioteca' 
              : `${jogos.length} ${jogos.length === 1 ? 'jogo' : 'jogos'} na biblioteca`
            }
          </p>
        </div>

        {/* Conteúdo */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0">
          {loading && (
            <div className="flex justify-center items-center py-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
                <p className="text-[rgb(0,181,215)] font-bold text-lg">Carregando biblioteca...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-900/20 border-2 border-red-700 rounded-lg p-6 text-center">
              <p className="text-red-400 font-bold">{error}</p>
            </div>
          )}

          {!loading && !error && jogos.length === 0 && (
            <div className="text-center py-20">
              <p className="text-gray-400 text-xl font-bold">Biblioteca vazia</p>
              <p className="text-gray-500 text-sm mt-2">
                Jogos serão adicionados automaticamente quando uma conta for verificada como válida
              </p>
            </div>
          )}

          {!loading && !error && jogos.length > 0 && (
            <div className="space-y-4">
              {jogos.map((jogo) => {
                const isExpandido = jogoExpandido === jogo.jogo_id
                const contas = contasPorJogo[jogo.jogo_id] || []
                const carregando = contasCarregando[jogo.jogo_id]

                return (
                  <div
                    key={jogo.jogo_id}
                    className="bg-gray-900 border-2 border-gray-800 rounded-lg overflow-hidden hover:border-cyan-500 transition-all duration-300 shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)]"
                  >
                    {/* Cabeçalho do jogo */}
                    <div 
                      className="p-4 cursor-pointer flex items-center justify-between"
                      onClick={() => carregarContasJogo(jogo.jogo_id)}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        {/* Imagem do jogo */}
                        {jogo.capa && (
                          <div className="w-24 h-16 overflow-hidden rounded flex-shrink-0">
                            <img
                              src={jogo.capa}
                              alt={jogo.nome}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-bold text-[rgb(0,181,215)] mb-1">
                            {jogo.nome}
                          </h3>
                          <div className="flex items-center gap-3 text-sm text-gray-400">
                            <span>{jogo.total_contas} {jogo.total_contas === 1 ? 'conta válida' : 'contas válidas'}</span>
                            {jogo.data_adicao && (
                              <span>• Adicionado em {new Date(jogo.data_adicao).toLocaleDateString('pt-BR')}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {carregando ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-cyan-500"></div>
                        ) : (
                          isExpandido ? (
                            <ChevronUp className="w-5 h-5 text-cyan-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-cyan-400" />
                          )
                        )}
                      </div>
                    </div>

                    {/* Contas válidas (expandido) */}
                    {isExpandido && (
                      <div className="border-t border-gray-800 bg-gray-950/50 p-4">
                        {carregando ? (
                          <div className="text-center py-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-500 mx-auto mb-2"></div>
                            <p className="text-gray-400 text-sm">Carregando contas...</p>
                          </div>
                        ) : contas.length === 0 ? (
                          <p className="text-gray-500 text-center py-4">Nenhuma conta válida encontrada</p>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-gray-400 text-sm font-semibold mb-3">
                              Contas Válidas ({contas.length}):
                            </p>
                            {contas.map((conta) => (
                              <div
                                key={conta.id}
                                className="bg-gray-800 border border-gray-700 rounded-lg p-4"
                              >
                                <div className="mb-3">
                                  <p className="text-gray-400 text-xs mb-1">Usuário:</p>
                                  <p className="text-cyan-400 font-semibold text-lg">{conta.usuario}</p>
                                </div>
                                <div className="mb-3">
                                  <p className="text-gray-400 text-xs mb-1">Senha:</p>
                                  <p className="text-cyan-400 font-semibold text-lg">{conta.senha || '***'}</p>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded border border-green-500/50">
                                    ✓ {conta.status || 'Válida'}
                                  </span>
                                  {conta.data_adicao && (
                                    <span className="text-gray-500 text-xs">
                                      {new Date(conta.data_adicao).toLocaleDateString('pt-BR')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Botão remover */}
                    <div className="border-t border-gray-800 p-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removerDaBiblioteca(jogo.jogo_id)
                        }}
                        className="w-full px-4 py-2 bg-red-900/30 border-2 border-red-700 text-red-400 rounded hover:bg-red-900/50 transition-all duration-300 font-bold"
                      >
                        Remover da Biblioteca
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default BibliotecaModal
