import { useState, useEffect, useRef } from 'react'
import api from '../services/api'
import { Search } from 'lucide-react'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Checkbox } from './ui/checkbox'
import CredenciaisModal from './CredenciaisModal'
import GameCard from './GameCard'

/**
 * Componente de barra de busca com autocomplete
 * Design atualizado do Figma
 */
function SearchBar({ onScrollToGame }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sugestoes, setSugestoes] = useState([])
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false)
  const [loading, setLoading] = useState(false)
  const [jogoSelecionado, setJogoSelecionado] = useState(null)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [buscarApenasBanco, setBuscarApenasBanco] = useState(true)
  const searchTimeoutRef = useRef(null)
  const containerRef = useRef(null)

  // Buscar sugestões quando o usuário digita
  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      setSugestoes([])
      setMostrarSugestoes(false)
      return
    }

    // Debounce: aguardar 500ms após o usuário parar de digitar
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setLoading(true)
        setSugestoes([])
        
        console.log('🔍 Buscando:', searchTerm.trim(), buscarApenasBanco ? '(apenas banco)' : '(banco + online)')
        
        const endpoint = buscarApenasBanco 
          ? `/api/jogos/buscar?q=${encodeURIComponent(searchTerm.trim())}`
          : `/api/busca?q=${encodeURIComponent(searchTerm.trim())}&site=true`
        
        const response = await api.get(endpoint)
        
        console.log('📥 Resposta completa:', response.data)
        const resultados = response.data?.resultados || []
        console.log('✅ Resultados encontrados:', resultados.length, resultados)
        
        setSugestoes(resultados)
        setMostrarSugestoes(true)
      } catch (error) {
        console.error('❌ Erro ao buscar sugestões:', error)
        setSugestoes([])
        setMostrarSugestoes(true)
      } finally {
        setLoading(false)
      }
    }, 500)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchTerm, buscarApenasBanco])

  const handleSugestaoClick = (jogo) => {
    setJogoSelecionado(jogo)
    setMostrarModal(true)
  }

  const handleLocalizarNoGrid = (e, jogo) => {
    e.stopPropagation()
    e.preventDefault()
    
    // Se o jogo tem ID (vem do banco), localizar no grid
    if (jogo.id && onScrollToGame) {
      // Limpar a busca primeiro
      setSearchTerm('')
      setSugestoes([])
      setMostrarSugestoes(false)
      
      // Aguardar um pouco e localizar o jogo
      setTimeout(() => {
        onScrollToGame(jogo.id, jogo.nome)
      }, 300)
    } else {
      alert('Este jogo não está no grid principal. Apenas jogos do banco de dados podem ser localizados.')
    }
  }

  const handleSearch = () => {
    // Search is already handled by useEffect
    console.log('Searching:', searchTerm, 'Mode:', buscarApenasBanco ? 'local' : 'online')
  }

  return (
    <>
      <div className="mb-8 space-y-4">
        <div className="flex gap-4 flex-col sm:flex-row">
          <div className="flex-1 relative group">
            <Input
              type="text"
              placeholder="Buscar jogos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full bg-gray-900 border-cyan-500/30 focus:border-cyan-500 text-white placeholder:text-gray-500 pr-12 transition-all duration-300 focus:shadow-[0_0_20px_rgba(6,182,212,0.3)]"
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400 group-focus-within:animate-pulse" />
          </div>
          <Button
            onClick={handleSearch}
            className="bg-cyan-600 hover:bg-cyan-500 border border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] transition-all duration-300 hover:scale-105 active:scale-95 group"
          >
            <Search className="w-4 h-4 mr-2" />
            <span className="text-black font-bold">
              Buscar
            </span>
          </Button>
        </div>

        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer group">
            <Checkbox
              checked={buscarApenasBanco}
              onCheckedChange={(checked) => setBuscarApenasBanco(checked)}
              className="border-cyan-500/50 data-[state=checked]:bg-cyan-600 data-[state=checked]:border-cyan-400"
            />
            <span className="text-[rgb(0,181,215)] group-hover:text-cyan-400 transition-colors font-bold">
              Apenas local
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer group">
            <Checkbox
              checked={!buscarApenasBanco}
              onCheckedChange={(checked) => setBuscarApenasBanco(!checked)}
              className="border-purple-500/50 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-400"
            />
            <span className="text-[rgb(0,181,215)] group-hover:text-cyan-400 transition-colors font-bold">
              Local + Online
            </span>
          </label>
        </div>
      </div>

      {/* Mini Grid de Resultados */}
      {searchTerm.trim().length >= 2 && (
        <>
          {loading && (
            <div className="mt-6 flex justify-center items-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-2"></div>
                <p className="text-gray-400 text-sm">Buscando jogos...</p>
              </div>
            </div>
          )}

          {!loading && sugestoes.length > 0 && (
            <div className="mt-6 w-full">
              <h3 className="text-lg font-semibold text-white mb-4">
                Resultados da busca ({sugestoes.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {sugestoes.map((jogo, index) => (
                  <div
                    key={index}
                    onClick={() => handleSugestaoClick(jogo)}
                    className="bg-gray-900 border-2 border-gray-800 rounded-lg overflow-hidden transition-all duration-300 cursor-pointer transform hover:scale-105 hover:border-cyan-500 shadow-lg hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] group"
                  >
                    <div className="relative h-32 overflow-hidden bg-gray-800">
                      {jogo.capa ? (
                        <img 
                          src={jogo.capa} 
                          alt={jogo.nome}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300 cursor-pointer"
                          onError={(e) => {
                            e.target.style.display = 'none'
                            const placeholder = e.target.parentElement.querySelector('.image-placeholder')
                            if (placeholder) placeholder.style.display = 'flex'
                          }}
                          onClick={(e) => e.stopPropagation()}
                          loading="lazy"
                        />
                      ) : null}
                      <div 
                        className="image-placeholder w-full h-full flex items-center justify-center cursor-pointer" 
                        style={{ display: jogo.capa ? 'none' : 'flex' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-gray-600 text-4xl">🎮</span>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>

                    <div className="p-3 bg-gray-900">
                      <h4 className="text-sm font-bold text-white mb-2 line-clamp-2 text-center min-h-[2.5rem] group-hover:text-cyan-400 transition-colors">
                        {jogo.nome || 'Jogo sem nome'}
                      </h4>
                      <div className="flex flex-col gap-2 mt-2">
                        {jogo.id && (
                          <button
                            onClick={(e) => handleLocalizarNoGrid(e, jogo)}
                            className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 border border-cyan-400 text-white text-xs rounded font-bold transition-all duration-300 hover:scale-105 shadow-[0_0_10px_rgba(6,182,212,0.3)] hover:shadow-[0_0_15px_rgba(6,182,212,0.5)]"
                            title="Localizar este jogo no grid principal"
                          >
                            📍 Localizar no grid
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSugestaoClick(jogo)
                          }}
                          className="px-2 py-1 bg-gray-800 hover:bg-gray-700 border border-cyan-500/50 text-cyan-400 text-xs rounded font-bold transition-all duration-300 hover:scale-105"
                        >
                          Ver credenciais
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && sugestoes.length === 0 && (
            <div className="mt-6 bg-gray-900 border-2 border-gray-800 rounded-lg shadow-xl p-6 text-center">
              <p className="text-gray-400">Nenhum jogo encontrado</p>
              <p className="text-gray-500 text-sm mt-2">Tente buscar com outros termos</p>
            </div>
          )}
        </>
      )}

      {/* Modal de credenciais */}
      {mostrarModal && jogoSelecionado && (
        <CredenciaisModal
          jogo={jogoSelecionado}
          onClose={() => {
            setMostrarModal(false)
            setJogoSelecionado(null)
          }}
        />
      )}
    </>
  )
}

export default SearchBar
