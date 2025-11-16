import { useState } from 'react'
import { useAuth } from './contexts/AuthContext'
import GameGrid from './components/GameGrid'
import GameModal from './components/GameModal'
import SyncTimer from './components/SyncTimer'
import SearchBar from './components/SearchBar'
import { Header } from './components/Header'
import VisualEditor from './components/VisualEditor'
import BibliotecaModal from './components/BibliotecaModal'
import Login from './components/Login'
import AdminScreen from './components/AdminScreen'
import { useVisualConfig } from './hooks/useVisualConfig'

function App() {
  const { user, loading, isAdmin } = useAuth()
  const [selectedGame, setSelectedGame] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [jogosCount, setJogosCount] = useState(0)
  const [editorOpen, setEditorOpen] = useState(false)
  const [bibliotecaOpen, setBibliotecaOpen] = useState(false)
  const { config } = useVisualConfig()

  const handleGameClick = (game) => {
    setSelectedGame(game)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedGame(null)
  }

  const handleJogosCountChange = (count) => {
    setJogosCount(count)
  }

  const handleLibraryClick = () => {
    setBibliotecaOpen(true)
  }

  // Função para localizar um jogo específico no grid
  const scrollToGame = (jogoId, nomeJogo) => {
    // Fazer scroll até o título do grid primeiro
    const tituloJogos = document.querySelector('main h2') || 
                       document.querySelector('h2[class*="text-[rgb(0,181,215)]"]')
    if (tituloJogos) {
      tituloJogos.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    
    // Tentar encontrar o card do jogo
    let tentativas = 0
    const maxTentativas = 15
    
    const encontrarCard = () => {
      tentativas++
      const card = document.getElementById(`game-card-${jogoId}`) || 
                   document.querySelector(`[data-game-id="${jogoId}"]`)
      
      if (card) {
        // Encontrou! Fazer scroll e destacar
        setTimeout(() => {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' })
          
          // Destacar o card
          setTimeout(() => {
            card.style.transition = 'all 0.3s ease'
            card.style.border = '3px solid rgb(6, 182, 212)'
            card.style.boxShadow = '0 0 30px rgba(6, 182, 212, 0.8)'
            card.style.transform = 'scale(1.05)'
            
            setTimeout(() => {
              card.style.border = ''
              card.style.boxShadow = ''
              card.style.transform = ''
            }, 2000)
          }, 400)
        }, 500)
      } else if (tentativas < maxTentativas) {
        setTimeout(encontrarCard, 200)
      }
    }
    
    setTimeout(encontrarCard, 800)
  }

  // Mostrar loading enquanto verifica autenticação
  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-cyan-400 text-xl">Carregando...</div>
      </div>
    )
  }

  // Se não estiver autenticado, mostrar tela de login
  if (!user) {
    return <Login />
  }

  // Se for admin, mostrar tela de administração
  if (isAdmin) {
    return <AdminScreen />
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Scan line effect */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-scan-line" />
        </div>
      </div>

      <Header 
        onLibraryClick={handleLibraryClick}
      />
      
      <main className="flex-1 container mx-auto px-4 py-4 relative z-10">
        <SearchBar onScrollToGame={scrollToGame} />

        <SyncTimer />

        <div className="mb-6 mt-6 group">
          <h2 className="flex items-center gap-3 text-[rgb(0,181,215)] group-hover:text-cyan-400 transition-colors font-bold">
            {config.tituloJogos || 'Jogos Disponíveis'}
            <span className="flex items-center justify-center min-w-[32px] h-8 px-2 rounded-full bg-cyan-500/30 border-2 border-cyan-400 text-cyan-300 font-bold text-[14px] shadow-[0_0_15px_rgba(6,182,212,0.6)] hover:shadow-[0_0_25px_rgba(6,182,212,0.9)] transition-all duration-300">
              {jogosCount}
            </span>
          </h2>
        </div>

        <GameGrid 
          onGameClick={handleGameClick} 
          onJogosCountChange={handleJogosCountChange}
          gridConfig={config.gridColunas}
        />
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 border-t-2 border-purple-500/50 mt-12 relative z-10">
        <div className="container mx-auto px-4 py-6 text-center">
          <p className="text-gray-400 font-semibold">
            <span className="text-purple-400">LúmorAccounts</span> © 2024 - Todos os direitos reservados
          </p>
        </div>
      </footer>

      {/* Modal de detalhes do jogo */}
      {isModalOpen && selectedGame && (
        <GameModal
          game={selectedGame}
          onClose={handleCloseModal}
          abasConfig={config.abas}
        />
      )}

      {/* Editor Visual */}
      <VisualEditor 
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
      />

      {/* Modal de Biblioteca */}
      <BibliotecaModal
        isOpen={bibliotecaOpen}
        onClose={() => setBibliotecaOpen(false)}
      />
    </div>
  )
}

export default App
