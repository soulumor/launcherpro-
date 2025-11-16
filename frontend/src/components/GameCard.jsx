import { useState, useEffect } from 'react'
import { Button } from './ui/button';

/**
 * Componente de card para exibir um jogo
 * Design atualizado do Figma
 */
function GameCard({ jogo, onClick, contasValidas = 0, totalContas = 0 }) {
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  // Resetar estado quando o jogo mudar
  useEffect(() => {
    setImageError(false)
    setImageLoaded(false)
  }, [jogo?.id, jogo?.capa])

  const handleImageError = (e) => {
    if (!imageError) {
      setImageError(true)
      e.target.style.display = 'none'
    }
  }

  const handleImageLoad = () => {
    setImageLoaded(true)
  }

  return (
    <div
      id={`game-card-${jogo.id}`}
      data-game-id={jogo.id}
      className="group relative rounded-lg overflow-hidden bg-gray-900 border-2 border-gray-800 hover:border-cyan-500 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:scale-105"
      onClick={onClick}
    >
      {/* Image container - ajusta ao tamanho da capa */}
      <div className="relative w-full overflow-hidden bg-gray-800">
        {jogo.capa && !imageError ? (
          <>
            <img
              src={jogo.capa}
              alt={jogo.nome}
              className="w-full h-auto block transition-all duration-300 group-hover:brightness-125"
              onError={handleImageError}
              onLoad={handleImageLoad}
              loading="lazy"
            />
            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            
            {/* Neon glow overlay */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-cyan-500/20 via-transparent to-purple-500/20 pointer-events-none" />
          </>
        ) : (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
            <span className="text-gray-600 text-4xl">🎮</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-2 space-y-1.5">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-white group-hover:text-cyan-400 transition-colors">
          {jogo.nome}
        </h3>

        <div className="flex items-center gap-2 text-xs">
          <span className={`px-2 py-1 rounded ${
            contasValidas > 0 
              ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
              : 'bg-red-500/20 text-red-400 border border-red-500/50'
          }`}>
            {contasValidas}/{totalContas} válidas
          </span>
        </div>

        <Button
          variant="outline"
          className="w-full border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-400 transition-all duration-300 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)]"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          Ver detalhes
        </Button>
      </div>
    </div>
  );
}

export default GameCard;
